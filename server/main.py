from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import uuid
import uvicorn

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        # {room_id: [websocket1, websocket2]}
        self.rooms: Dict[str, List[WebSocket]] = {}
        print("=" * 60)
        print("🎮 [SERVER] ConnectionManager initialized")
        print("=" * 60)

    async def connect(self, websocket: WebSocket, room_id: str):
        print(f"\n📥 [CONNECT] New connection request for room: {room_id}")
        await websocket.accept()
        print(f"✅ [CONNECT] WebSocket accepted for room: {room_id}")
        
        if room_id not in self.rooms:
            self.rooms[room_id] = []
            print(f"🆕 [CONNECT] Created new room: {room_id}")
        
        if len(self.rooms[room_id]) >= 2:
            print(f"🚫 [CONNECT] Room {room_id} is full, rejecting connection")
            await websocket.send_text(json.dumps({"type": "ERROR", "message": "Room full"}))
            await websocket.close()
            return False
            
        self.rooms[room_id].append(websocket)
        player_count = len(self.rooms[room_id])
        print(f"👤 [CONNECT] Player joined room {room_id}, total players: {player_count}")
        return True

    def disconnect(self, websocket: WebSocket, room_id: str):
        print(f"\n📤 [DISCONNECT] Player leaving room: {room_id}")
        if room_id in self.rooms:
            if websocket in self.rooms[room_id]:
                self.rooms[room_id].remove(websocket)
                print(f"👋 [DISCONNECT] Player removed from room {room_id}, remaining: {len(self.rooms[room_id])}")
            if not self.rooms[room_id]:
                del self.rooms[room_id]
                print(f"🗑️ [DISCONNECT] Room {room_id} deleted (empty)")

    async def broadcast(self, message: str, room_id: str, exclude: WebSocket = None):
        print(f"\n📡 [BROADCAST] Sending to room {room_id}: {message[:100]}...")
        if room_id in self.rooms:
            for connection in self.rooms[room_id]:
                if connection != exclude:
                    await connection.send_text(message)
            print(f"✅ [BROADCAST] Message sent to {len(self.rooms[room_id]) - (1 if exclude else 0)} players")

manager = ConnectionManager()

@app.get("/")
async def get():
    print("\n🌐 [HTTP] GET / request received")
    return {"status": "Wizard-Duel PvP Server Running"}

@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    print(f"\n{'='*60}")
    print(f"🔌 [WS_ENDPOINT] Connection initiated")
    print(f"   Room ID: {room_id}")
    print(f"   Player ID: {player_id}")
    print(f"{'='*60}")
    
    success = await manager.connect(websocket, room_id)
    if not success:
        print(f"❌ [WS_ENDPOINT] Connection rejected for player {player_id}")
        return

    # 🔥 关键：立即发送握手确认消息
    await websocket.send_text(json.dumps({
        "type": "CONNECTED", 
        "msg": "Zeabur Backend Ready",
        "room_id": room_id,
        "player_id": player_id
    }))
    print(f"✅ [WS_ENDPOINT] Sent CONNECTED confirmation to player {player_id}")

    try:
        # 通知其他玩家有人加入
        join_msg = json.dumps({"type": "PLAYER_JOINED", "player_id": player_id})
        await manager.broadcast(join_msg, room_id, exclude=websocket)
        print(f"📢 [WS_ENDPOINT] Notified room about new player")

        while True:
            data = await websocket.receive_text()
            print(f"📨 [WS_ENDPOINT] Received from {player_id}: {data[:100]}...")
            # 直接转发操作给房间内另一人
            await manager.broadcast(data, room_id, exclude=websocket)
            
    except WebSocketDisconnect:
        print(f"⚠️ [WS_ENDPOINT] Player {player_id} disconnected normally")
        manager.disconnect(websocket, room_id)
        await manager.broadcast(
            json.dumps({"type": "PLAYER_LEFT", "player_id": player_id}), 
            room_id
        )
    except Exception as e:
        print(f"🚨 [WS_ENDPOINT] Unexpected error for {player_id}: {type(e).__name__}: {e}")
        manager.disconnect(websocket, room_id)
        await manager.broadcast(
            json.dumps({"type": "PLAYER_LEFT", "player_id": player_id, "reason": "error"}), 
            room_id
        )

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 [SERVER] Starting Wizard-Duel PvP Server")
    print("📡 [SERVER] Listening on 0.0.0.0:8080")
    print("=" * 60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8080)
