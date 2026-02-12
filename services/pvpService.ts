import { Action } from '../types/game';

class PVPService {
    private socket: WebSocket | null = null;
    private serverUrl: string = "wss://xwizard.zeabur.app"; // Zeabur 自动处理 80/443 到 8080

    connect(roomId: string, playerId: string, onMessage: (data: any) => void) {
        if (this.socket) {
            this.socket.close();
        }

        // 构造连接地址，FastAPI 路由是 /ws/{room_id}/{player_id}
        this.socket = new WebSocket(`${this.serverUrl}/ws/${roomId}/${playerId}`);

        this.socket.onopen = () => {
            console.log("PVP Server Connected");
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };

        this.socket.onclose = () => {
            console.log("PVP Server Disconnected");
        };

        this.socket.onerror = (error) => {
            console.error("PVP Socket Error:", error);
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
