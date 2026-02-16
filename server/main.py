from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List, Tuple
import json
import uuid
import uvicorn

app = FastAPI()


class ConnectionManager:
    def __init__(self):
        # 匹配队列：等待匹配的玩家 [(websocket, player_id), ...]
        self.matchmaking_queue: List[Tuple[WebSocket, str]] = []
        # 对战房间：{room_id: {player_id: websocket, ...}}
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}

        print("=" * 60)
        print("🎮 [SERVER] ConnectionManager initialized")
        print("=" * 60)

    async def join_matchmaking(self, websocket: WebSocket, player_id: str):
        """玩家加入匹配队列"""
        await websocket.accept()

        # 先发送连接确认
        await websocket.send_text(json.dumps({
            "type": "CONNECTED",
            "msg": "Zeabur Backend Ready - Matchmaking",
            "player_id": player_id
        }))

        self.matchmaking_queue.append((websocket, player_id))
        queue_size = len(self.matchmaking_queue)
        print(f"🔍 [MATCHMAKING] 玩家 {player_id} 加入匹配队列 | 队列人数: {queue_size}")

        # 队列满 2 人，配对成功
        if queue_size >= 2:
            p1_ws, p1_id = self.matchmaking_queue.pop(0)
            p2_ws, p2_id = self.matchmaking_queue.pop(0)

            # 生成唯一房间 ID
            room_id = f"game_{uuid.uuid4().hex[:8]}"

            # 创建房间
            self.rooms[room_id] = {
                p1_id: p1_ws,
                p2_id: p2_ws,
            }

            print(f"⚔️ [MATCH_FOUND] 配对成功! 房间: {room_id} | {p1_id} vs {p2_id}")

            # 分别通知双方，携带对手信息和房间 ID
            try:
                await p1_ws.send_text(json.dumps({
                    "type": "MATCH_FOUND",
                    "room_id": room_id,
                    "status": "ready",
                    "opponent": {
                        "id": p2_id,
                        "name": p2_id[:8],  # 简单截取作用户名
                    },
                    "your_role": "player1",
                }))
            except Exception as e:
                print(f"🚫 [ERROR] 通知 P1 失败: {e}")

            try:
                await p2_ws.send_text(json.dumps({
                    "type": "MATCH_FOUND",
                    "room_id": room_id,
                    "status": "ready",
                    "opponent": {
                        "id": p1_id,
                        "name": p1_id[:8],
                    },
                    "your_role": "player2",
                }))
            except Exception as e:
                print(f"🚫 [ERROR] 通知 P2 失败: {e}")

            # 返回房间 ID 让调用方知道后续监听哪个房间
            return room_id, (p1_ws, p1_id), (p2_ws, p2_id)

        return None, None, None

    def remove_from_matchmaking(self, websocket: WebSocket):
        """从匹配队列中移除断开连接的玩家"""
        self.matchmaking_queue = [
            (ws, pid) for ws, pid in self.matchmaking_queue if ws != websocket
        ]

    async def connect_to_room(self, websocket: WebSocket, room_id: str, player_id: str):
        """玩家连接到对战房间"""
        await websocket.accept()

        if room_id not in self.rooms:
            self.rooms[room_id] = {}

        self.rooms[room_id][player_id] = websocket
        player_count = len(self.rooms[room_id])
        print(f"👤 [ROOM_CONNECT] 玩家 {player_id} 进入房间 {room_id} | 当前人数: {player_count}")

        # 通知房间内其他玩家
        await self.broadcast_in_room(
            json.dumps({"type": "PLAYER_JOINED", "player_id": player_id}),
            room_id,
            exclude=websocket
        )

    def disconnect_from_room(self, websocket: WebSocket, room_id: str):
        """从对战房间断开连接"""
        if room_id in self.rooms:
            # 找到并移除该 websocket
            to_remove = None
            for pid, ws in self.rooms[room_id].items():
                if ws == websocket:
                    to_remove = pid
                    break
            if to_remove:
                del self.rooms[room_id][to_remove]
                print(f"👋 [ROOM_DISCONNECT] 玩家 {to_remove} 离开房间 {room_id}")

            # 房间空了就删除
            if not self.rooms[room_id]:
                del self.rooms[room_id]
                print(f"🗑️ [ROOM_DELETED] 房间 {room_id} 已清理")

    async def broadcast_in_room(self, message: str, room_id: str, exclude: WebSocket = None):
        """向房间内所有玩家广播消息（可排除发送者）"""
        if room_id in self.rooms:
            dead_players = []
            for pid, ws in self.rooms[room_id].items():
                if ws != exclude:
                    try:
                        await ws.send_text(message)
                    except Exception:
                        dead_players.append(pid)
            # 清理断开的连接
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
    """匹配队列 WebSocket 端点"""
    room_id, p1, p2 = await manager.join_matchmaking(websocket, player_id)

    if room_id and p1 and p2:
        # 配对成功：此连接已经发送了 MATCH_FOUND，使命完成
        # 双方需要用新的 room_id 重新连接到对战房间
        print(f"✅ [MATCHMAKING] 配对完成，双方应使用 /ws/{room_id}/{{player_id}} 进入对战")
        return

    # 还在等待匹配，保持连接直到匹配成功或断开
    try:
        while True:
            # 等待客户端消息（心跳或取消匹配）
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "CANCEL_MATCHMAKING":
                print(f"❌ [MATCHMAKING] 玩家 {player_id} 取消匹配")
                manager.remove_from_matchmaking(websocket)
                break
    except WebSocketDisconnect:
        print(f"👋 [MATCHMAKING] 玩家 {player_id} 断开匹配连接")
        manager.remove_from_matchmaking(websocket)


@app.websocket("/ws/{room_id}/{player_id}")
async def room_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    """对战房间 WebSocket 端点"""
    await manager.connect_to_room(websocket, room_id, player_id)

    try:
        while True:
            data = await websocket.receive_text()
            print(f"📩 [ROOM {room_id}] 收到 {player_id} 的消息: {data[:200]}")
            # 将操作转发给房间内的对手
            await manager.broadcast_in_room(data, room_id, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect_from_room(websocket, room_id)
        await manager.broadcast_in_room(
            json.dumps({"type": "PLAYER_LEFT", "player_id": player_id}),
            room_id
        )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
