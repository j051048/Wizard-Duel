from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import uuid

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        # {room_id: [websocket1, websocket2]}
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        
        if len(self.rooms[room_id]) >= 2:
            await websocket.send_text(json.dumps({"type": "ERROR", "message": "Room full"}))
            await websocket.close()
            return False
            
        self.rooms[room_id].append(websocket)
        return True

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
                    await connection.send_text(message)

manager = ConnectionManager()

@app.get("/")
async def get():
    return {"status": "Wizard-Duel PvP Server Running"}

@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    success = await manager.connect(websocket, room_id)
    if not success:
        return

    try:
        # 通知其他玩家有人加入
        await manager.broadcast(
            json.dumps({"type": "PLAYER_JOINED", "player_id": player_id}), 
            room_id, 
            exclude=websocket
        )

        while True:
            data = await websocket.receive_text()
            # 直接转发操作给房间内另一人
            await manager.broadcast(data, room_id, exclude=websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        await manager.broadcast(
            json.dumps({"type": "PLAYER_LEFT", "player_id": player_id}), 
            room_id
        )
