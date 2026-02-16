from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Tuple, Optional
import json
import uuid
import asyncio
import uvicorn

app = FastAPI()

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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

        # 预创建空房间（等待双方以对战 WebSocket 加入）
        self.rooms[room_id] = {}

        print(f"⚔️ [MATCH_FOUND] 配对成功! 房间: {room_id} | {p1_id} vs {p2_id}")

        # 构建消息
        p1_match_data = {
            "type": "MATCH_FOUND",
            "room_id": room_id,
            "status": "ready",
            "opponent": {"id": p2_id, "name": p2_id[:12]},
            "your_role": "player1",
        }
        p2_match_data = {
            "type": "MATCH_FOUND",
            "room_id": room_id,
            "status": "ready",
            "opponent": {"id": p1_id, "name": p1_id[:12]},
            "your_role": "player2",
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
        player_count = len(self.rooms[room_id])
        print(f"👤 [ROOM_CONNECT] 玩家 {player_id} 进入房间 {room_id} | 当前人数: {player_count}")

    def disconnect_from_room(self, websocket: WebSocket, room_id: str):
        """从对战房间断开连接"""
        if room_id in self.rooms:
            to_remove = None
            for pid, ws in self.rooms[room_id].items():
                if ws == websocket:
                    to_remove = pid
                    break
            if to_remove:
                del self.rooms[room_id][to_remove]
                print(f"👋 [ROOM_DISCONNECT] 玩家 {to_remove} 离开房间 {room_id}")

            if not self.rooms[room_id]:
                del self.rooms[room_id]
                print(f"🗑️ [ROOM_DELETED] 房间 {room_id} 已清理")

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
    """对战房间 WebSocket 端点 — 转发双方操作"""
    await manager.connect_to_room(websocket, room_id, player_id)

    try:
        while True:
            data = await websocket.receive_text()
            print(f"📩 [ROOM {room_id}] 收到 {player_id} 的消息: {data[:200]}")
            # 转发给对手
            await manager.broadcast_in_room(data, room_id, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect_from_room(websocket, room_id)
        await manager.broadcast_in_room(
            json.dumps({"type": "PLAYER_LEFT", "player_id": player_id}),
            room_id
        )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
