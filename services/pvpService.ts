import { Action } from '../types/game';

class PVPService {
    private socket: WebSocket | null = null;
    private serverUrl: string = "wss://xwizard.zeabur.app"; // Zeabur 自动处理 80/443 到 8080

    connect(roomId: string, playerId: string, onMessage: (data: any) => void) {
        if (this.socket) {
            this.socket.close();
        }

        const url = `${this.serverUrl}/ws/${roomId}/${playerId}`;
        console.log("Attempting PVP Connection to:", url);
        
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log("✅ PVP Server Connected successfully!");
        };

        this.socket.onmessage = (event) => {
            console.log("📩 PVP Message Received:", event.data);
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (e) {
                console.error("❌ Failed to parse PVP message:", e);
            }
        };

        this.socket.onclose = (event) => {
            console.warn(`❌ PVP Server Disconnected. Code: ${event.code}, Reason: ${event.reason}`);
            // 尝试重连逻辑? 暂时先打 log
        };

        this.socket.onerror = (error) => {
            console.error("🔥 PVP Socket Error Detail:", error);
        };
    }

    sendAction(action: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(action));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

export const pvpService = new PVPService();
