import { Action } from '../types/game';

class PVPService {
    private socket: WebSocket | null = null;
    private serverUrl: string = "wss://xwizard.zeabur.app";
    private retryCount: number = 0;

    connect(roomId: string, playerId: string, onMessage: (data: any) => void) {
        if (this.socket) {
            this.socket.onclose = null; // 清除之前的监听，防止干扰
            this.socket.close();
        }

        // 终极兼容方案：如果 wss:// 1006 报错，则在第二次尝试时强制切换到 8080 端口且可能尝试非加密
        let url = `${this.serverUrl}/ws/${roomId}/${playerId}`;
        
        if (this.retryCount === 1) {
            url = `wss://xwizard.zeabur.app:8080/ws/${roomId}/${playerId}`;
            console.log("⚠️ [PVP_DIAGNOSTIC] 尝试 8080 强制端口...");
        } else if (this.retryCount > 1) {
            url = `ws://xwizard.zeabur.app:8080/ws/${roomId}/${playerId}`;
            console.log("⚠️ [PVP_DIAGNOSTIC] 尝试非加密 ws:// 协议强制突破...");
        }

        console.log("🚀 [PVP_DIAGNOSTIC] 连接中:", url);
        
        try {
            this.socket = new WebSocket(url);
            this.bindEvents(onMessage, roomId, playerId);
        } catch (e) {
            console.error("🚫 初始化失败:", e);
        }
    }

    private bindEvents(onMessage: (data: any) => void, roomId: string, playerId: string) {
        if (!this.socket) return;

        this.socket.onopen = () => {
            this.retryCount = 0;
            console.log("✅ [PVP_DIAGNOSTIC] 成功握手!");
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (err) {}
        };

        this.socket.onclose = (event) => {
            console.warn(`❌ [PVP_DIAGNOSTIC] 失败码: ${event.code}`);
            if (this.retryCount < 3) {
                this.retryCount++;
                setTimeout(() => this.connect(roomId, playerId, onMessage), 2000);
            }
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
