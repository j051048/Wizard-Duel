from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import uvicorn

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        # {room_id: [WebSocket, ...]}
        self.rooms: Dict[str, List[WebSocket]] = {}
        print("=" * 60)
        print("🎮 [SERVER] ConnectionManager initialized")
        print("=" * 60)

    async def connect(self, websocket: WebSocket, room_id: str, player_id: str):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        
        self.rooms[room_id].append(websocket)
        player_count = len(self.rooms[room_id])
        
        print(f"👤 [CONNECT] 玩家入场: {player_id} | 房间: {room_id} | 当前人数: {player_count}")

        # 核心逻辑：如果是匹配房间且满2人，立即广播匹配成功信号
        if room_id == 'matchmaking' and player_count >= 2:
            print(f"⚔️ [MATCH_SUCCESS] 房间 {room_id} 两人已集齐，正在触发 MATCH_FOUND...")
            match_msg = json.dumps({
                "type": "MATCH_FOUND",
                "room_id": room_id,
                "status": "ready"
            })
            await self.broadcast(match_msg, room_id)
        else:
            # 否则只发连接确认
            await websocket.send_text(json.dumps({
                "type": "CONNECTED",
                "msg": "Zeabur Backend Ready",
                "room_id": room_id,
                "player_id": player_id
            }))

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.rooms:
            if websocket in self.rooms[room_id]:
                self.rooms[room_id].remove(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast(self, message: str, room_id: str, exclude: WebSocket = None):
        if room_id in self.rooms:
            for connection in self.rooms[room_id]:
                if connection != exclude:
                    try:
                        await connection.send_text(message)
                    except Exception:
                        pass

manager = ConnectionManager()

@app.get("/")
async def get():
    return {"status": "Wizard-Duel PvP Server Running"}

@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    await manager.connect(websocket, room_id, player_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            # 所有的操作（出牌等）直接广播给对方
            await manager.broadcast(data, room_id, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        await manager.broadcast(
            json.dumps({"type": "PLAYER_LEFT", "player_id": player_id}), 
            room_id
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
