from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Tuple, Optional
import json
import random
import uuid
import asyncio
import time
import uvicorn

app = FastAPI()

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


ROOM_TTL_SECONDS = 300  # 5 minutes to reconnect before room is cleaned up

# [P1-6] Server-side validation constants
ALLOWED_ACTION_TYPES = {"PLAY_CARD", "END_TURN"}
MAX_ACTIONS_PER_MINUTE = 30


class RateLimiter:
    """Per-player rate limiter using sliding window."""

    def __init__(self, max_per_minute: int = MAX_ACTIONS_PER_MINUTE):
        self.max_per_minute = max_per_minute
        self._windows: Dict[str, List[float]] = {}

    def is_allowed(self, player_id: str) -> bool:
        now = time.time()
        window = self._windows.setdefault(player_id, [])
        # Remove timestamps older than 60 seconds
        window[:] = [t for t in window if now - t < 60]
        if len(window) >= self.max_per_minute:
            return False
        window.append(now)
        return True

    def cleanup(self):
        """Remove stale entries (call periodically)."""
        now = time.time()
        stale = [pid for pid, window in self._windows.items()
                 if all(now - t > 60 for t in window)]
        for pid in stale:
            del self._windows[pid]


rate_limiter = RateLimiter()


def validate_action_message(msg: dict, player_id: str, room_id: str) -> Optional[str]:
    """
    Validate an ACTION message. Returns an error string if invalid, None if valid.
    """
    msg_type = msg.get("type")

    # Only ACTION messages carry gameplay commands
    if msg_type != "ACTION":
        return None  # Non-ACTION messages (RECONNECT, STATE_SYNC, etc.) are trusted

    action = msg.get("action")
    if not action or not isinstance(action, dict):
        return "Missing or invalid 'action' field"

    action_type = action.get("type")
    if not action_type:
        return "Missing 'action.type'"

    if action_type not in ALLOWED_ACTION_TYPES:
        return f"Disallowed action type: {action_type}"

    # playerId in the message must match the socket's authenticated player
    msg_player_id = action.get("playerId") or msg.get("playerId")
    if msg_player_id and msg_player_id != player_id:
        return f"playerId mismatch: socket={player_id}, message={msg_player_id}"

    # PLAY_CARD must include a spellId
    if action_type == "PLAY_CARD" and not action.get("spellId"):
        return "PLAY_CARD missing spellId"

    return None


class ConnectionManager:
    def __init__(self):
        # 匹配队列：等待匹配的玩家 [(websocket, player_id), ...]
        self.matchmaking_queue: List[Tuple[WebSocket, str]] = []
        # 匹配成功但尚未断开的匹配连接 {player_id: asyncio.Event}
        self.match_events: Dict[str, asyncio.Event] = {}
        # 匹配结果缓存 {player_id: match_data}
        self.match_results: Dict[str, dict] = {}
        # 对战房间：{room_id: {player_id: websocket, ...}}
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}
        # 房间元数据（用于断线重连）：{room_id: {seed, players, roles, created_at, last_activity}}
        self.room_metadata: Dict[str, dict] = {}

        print("=" * 60)
        print("🎮 [SERVER] Wizard-Duel PvP Server 已启动")
        print("=" * 60)

    async def try_match(self):
        """尝试配对队列中的两个玩家"""
        if len(self.matchmaking_queue) < 2:
            return None

        p1_ws, p1_id = self.matchmaking_queue.pop(0)
        p2_ws, p2_id = self.matchmaking_queue.pop(0)

        # 生成唯一房间 ID
        room_id = f"game_{uuid.uuid4().hex[:8]}"
        
        # 生成随机种子，用于前端同步 RNG
        seed = random.randint(1, 1000000)

        # 预创建空房间（等待双方以对战 WebSocket 加入）
        self.rooms[room_id] = {}

        # 存储房间元数据（用于断线重连）
        now = time.time()
        self.room_metadata[room_id] = {
            "seed": seed,
            "players": {p1_id: "player1", p2_id: "player2"},
            "roles": {"player1": p1_id, "player2": p2_id},
            "created_at": now,
            "last_activity": now,
        }

        print(f"⚔️ [MATCH_FOUND] 配对成功! 房间: {room_id} | {p1_id} vs {p2_id} | Seed: {seed}")

        # 构建消息
        p1_match_data = {
            "type": "MATCH_FOUND",
            "room_id": room_id,
            "status": "ready",
            "opponent": {"id": p2_id, "name": p2_id[:12]},
            "your_role": "player1",
            "seed": seed
        }
        p2_match_data = {
            "type": "MATCH_FOUND",
            "room_id": room_id,
            "status": "ready",
            "opponent": {"id": p1_id, "name": p1_id[:12]},
            "your_role": "player2",
            "seed": seed
        }

        # 缓存结果 + 唤醒等待中的 handler
        self.match_results[p1_id] = p1_match_data
        self.match_results[p2_id] = p2_match_data

        if p1_id in self.match_events:
            self.match_events[p1_id].set()
        if p2_id in self.match_events:
            self.match_events[p2_id].set()

        return room_id

    def remove_from_matchmaking(self, websocket: WebSocket, player_id: str):
        """从匹配队列中移除断开连接的玩家"""
        self.matchmaking_queue = [
            (ws, pid) for ws, pid in self.matchmaking_queue if ws != websocket
        ]
        self.match_events.pop(player_id, None)
        self.match_results.pop(player_id, None)

    async def connect_to_room(self, websocket: WebSocket, room_id: str, player_id: str):
        """玩家连接到对战房间"""
        await websocket.accept()

        if room_id not in self.rooms:
            self.rooms[room_id] = {}

        self.rooms[room_id][player_id] = websocket

        # Update last activity
        if room_id in self.room_metadata:
            self.room_metadata[room_id]["last_activity"] = time.time()

        player_count = len(self.rooms[room_id])
        print(f"👤 [ROOM_CONNECT] 玩家 {player_id} 进入房间 {room_id} | 当前人数: {player_count}")

        # Notify other players that this player joined
        await self.broadcast_in_room(
            json.dumps({"type": "PLAYER_JOINED", "player_id": player_id}),
            room_id,
            exclude=websocket,
        )

    def disconnect_from_room(self, websocket: WebSocket, room_id: str):
        """从对战房间断开连接 — 不立即删除房间，保留用于断线重连"""
        if room_id in self.rooms:
            to_remove = None
            for pid, ws in self.rooms[room_id].items():
                if ws == websocket:
                    to_remove = pid
                    break
            if to_remove:
                del self.rooms[room_id][to_remove]
                print(f"👋 [ROOM_DISCONNECT] 玩家 {to_remove} 离开房间 {room_id} (保留房间用于重连)")

            # Update last activity
            if room_id in self.room_metadata:
                self.room_metadata[room_id]["last_activity"] = time.time()

            # Only delete room if empty AND metadata is gone (expired)
            if not self.rooms[room_id] and room_id not in self.room_metadata:
                del self.rooms[room_id]
                print(f"🗑️ [ROOM_DELETED] 房间 {room_id} 已清理")

    def cleanup_expired_rooms(self):
        """清理过期的空房间（超过 TTL 没有重连）"""
        now = time.time()
        expired = [
            rid for rid, meta in self.room_metadata.items()
            if now - meta["last_activity"] > ROOM_TTL_SECONDS
            and rid in self.rooms
            and not self.rooms[rid]
        ]
        for rid in expired:
            del self.room_metadata[rid]
            if rid in self.rooms and not self.rooms[rid]:
                del self.rooms[rid]
            print(f"🗑️ [ROOM_EXPIRED] 房间 {rid} 已过期清理")

    async def broadcast_in_room(self, message: str, room_id: str, exclude: WebSocket = None):
        """向房间内所有玩家广播消息"""
        if room_id in self.rooms:
            dead_players = []
            for pid, ws in self.rooms[room_id].items():
                if ws != exclude:
                    try:
                        await ws.send_text(message)
                    except Exception:
                        dead_players.append(pid)
            for pid in dead_players:
                del self.rooms[room_id][pid]


manager = ConnectionManager()


@app.on_event("startup")
async def start_cleanup_task():
    """Background task: clean up expired rooms every 60 seconds"""
    async def cleanup_loop():
        while True:
            await asyncio.sleep(60)
            manager.cleanup_expired_rooms()
            rate_limiter.cleanup()
    asyncio.create_task(cleanup_loop())


@app.get("/")
async def get():
    return {
        "status": "Wizard-Duel PvP Server Running",
        "matchmaking_queue": len(manager.matchmaking_queue),
        "active_rooms": len(manager.rooms),
    }


@app.websocket("/ws/matchmaking/{player_id}")
async def matchmaking_endpoint(websocket: WebSocket, player_id: str):
    """
    匹配队列 WebSocket 端点
    
    流程：
    1. 玩家连接 → 加入队列
    2. 队列满 2 人 → 配对成功 → 发送 MATCH_FOUND → 等待前端断开
    3. 前端收到 MATCH_FOUND 后用 room_id 连接 /ws/{room_id}/{player_id}
    """
    await websocket.accept()

    # 发送连接确认
    await websocket.send_text(json.dumps({
        "type": "CONNECTED",
        "msg": "Zeabur Backend Ready - Matchmaking",
        "player_id": player_id
    }))

    # 加入队列
    manager.matchmaking_queue.append((websocket, player_id))
    event = asyncio.Event()
    manager.match_events[player_id] = event
    queue_size = len(manager.matchmaking_queue)
    print(f"🔍 [MATCHMAKING] 玩家 {player_id} 加入匹配队列 | 队列人数: {queue_size}")

    # 尝试配对
    await manager.try_match()

    try:
        # 等待匹配结果或客户端消息
        while True:
            # 如果已经有匹配结果，发送并结束
            if player_id in manager.match_results:
                match_data = manager.match_results.pop(player_id)
                manager.match_events.pop(player_id, None)
                await websocket.send_text(json.dumps(match_data))
                print(f"📤 [MATCHMAKING] 已发送 MATCH_FOUND 给 {player_id}")
                # 保持连接几秒，确保前端处理完消息再断开
                try:
                    await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
                except asyncio.TimeoutError:
                    pass
                return

            # 没有匹配结果时，等待事件或客户端消息
            receive_task = asyncio.create_task(websocket.receive_text())
            event_task = asyncio.create_task(event.wait())

            done, pending = await asyncio.wait(
                {receive_task, event_task},
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

            if receive_task in done:
                try:
                    data = receive_task.result()
                    msg = json.loads(data)
                    if msg.get("type") == "CANCEL_MATCHMAKING":
                        print(f"❌ [MATCHMAKING] 玩家 {player_id} 取消匹配")
                        manager.remove_from_matchmaking(websocket, player_id)
                        return
                except Exception:
                    break

            if event_task in done:
                # 匹配事件触发，下一轮循环会检测 match_results 并发送
                event.clear()
                continue

    except WebSocketDisconnect:
        print(f"👋 [MATCHMAKING] 玩家 {player_id} 断开匹配连接")
        manager.remove_from_matchmaking(websocket, player_id)
    except Exception as e:
        print(f"🚫 [MATCHMAKING] 异常: {e}")
        manager.remove_from_matchmaking(websocket, player_id)


@app.websocket("/ws/{room_id}/{player_id}")
async def room_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    """对战房间 WebSocket 端点 — 转发双方操作，支持断线重连"""

    # Check if this is a reconnection attempt (room exists in metadata but player socket was removed)
    is_reconnect = (
        room_id in manager.room_metadata
        and player_id in manager.room_metadata[room_id]["players"]
        and room_id in manager.rooms
        and player_id not in manager.rooms.get(room_id, {})
    )

    await manager.connect_to_room(websocket, room_id, player_id)

    # If reconnecting, send RECONNECTED with seed and role
    if is_reconnect and room_id in manager.room_metadata:
        meta = manager.room_metadata[room_id]
        role = meta["players"].get(player_id, "player1")
        await websocket.send_text(json.dumps({
            "type": "RECONNECTED",
            "room_id": room_id,
            "seed": meta["seed"],
            "role": role,
            "player_id": player_id,
        }))
        print(f"🔄 [RECONNECT] 玩家 {player_id} 重连到房间 {room_id} (role={role})")

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type", "")

            # Update last activity on any message
            if room_id in manager.room_metadata:
                manager.room_metadata[room_id]["last_activity"] = time.time()

            # Handle RECONNECT request (explicit reconnect message)
            if msg_type == "RECONNECT":
                if room_id in manager.room_metadata:
                    meta = manager.room_metadata[room_id]
                    role = meta["players"].get(player_id, "player1")
                    await websocket.send_text(json.dumps({
                        "type": "RECONNECTED",
                        "room_id": room_id,
                        "seed": meta["seed"],
                        "role": role,
                        "player_id": player_id,
                    }))
                continue

            # STATE_SYNC and REQUEST_STATE are relayed to specific targets
            if msg_type in ("STATE_SYNC", "REQUEST_STATE"):
                await manager.broadcast_in_room(data, room_id, exclude=websocket)
                continue

            # [P1-6] Rate limiting
            if not rate_limiter.is_allowed(player_id):
                print(f"⚠️ [RATE_LIMIT] 玩家 {player_id} 超过速率限制 ({MAX_ACTIONS_PER_MINUTE}/min)")
                await websocket.send_text(json.dumps({
                    "type": "ERROR",
                    "error": "Rate limit exceeded",
                }))
                continue

            # [P1-6] Validate ACTION message schema and contents
            error = validate_action_message(msg, player_id, room_id)
            if error:
                print(f"🚫 [VALIDATION] 房间 {room_id} 玩家 {player_id}: {error}")
                await websocket.send_text(json.dumps({
                    "type": "ERROR",
                    "error": error,
                }))
                continue

            # Valid action — relay to opponent
            print(f"📩 [ROOM {room_id}] 收到 {player_id} 的消息: {data[:200]}")
            await manager.broadcast_in_room(data, room_id, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect_from_room(websocket, room_id)
        await manager.broadcast_in_room(
            json.dumps({"type": "PLAYER_LEFT", "player_id": player_id}),
            room_id
        )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
