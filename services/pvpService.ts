import { Action } from '../types/game';

class PVPService {
    private socket: WebSocket | null = null;
    private serverUrl: string = "wss://xwizard.zeabur.app";

    connect(roomId: string, playerId: string, onMessage: (data: any) => void) {
        if (this.socket) {
            this.socket.close();
        }

        // 尝试自动适配端口：Zeabur 有时需要直接带端口，有时不需要
        // 增加一个自动重试逻辑：先传不带端口的，失败了再试带 8080 的
        const url = `${this.serverUrl}/ws/${roomId}/${playerId}`;
        console.log("🚀 [PVP_DIAGNOSTIC] 发起 WebSocket 连接:", url);
        
        try {
            this.socket = new WebSocket(url);
            
            // 设置一个自毁定时器，如果 3 秒没连上，尝试 8080 强制端口
            const connTimer = setTimeout(() => {
                if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
                    console.warn("⚠️ [PVP_DIAGNOSTIC] 标准 WSS 连接超时，尝试 8080 端口强制连接...");
                    this.socket.close();
                    const portUrl = `wss://xwizard.zeabur.app:8080/ws/${roomId}/${playerId}`;
                    this.socket = new WebSocket(portUrl);
                    this.bindEvents(onMessage);
                }
            }, 3000);

            this.bindEvents(onMessage, connTimer);
        } catch (setupError) {
            console.error("🚫 [PVP_DIAGNOSTIC] WebSocket 初始化异常:", setupError);
        }
    }

    private bindEvents(onMessage: (data: any) => void, timer?: NodeJS.Timeout) {
        if (!this.socket) return;

        this.socket.onopen = (e) => {
            if (timer) clearTimeout(timer);
            console.log("✅ [PVP_DIAGNOSTIC] 连接成功!");
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (err) {}
        };

        this.socket.onclose = (event) => {
            console.warn(`❌ [PVP_DIAGNOSTIC] 连接关闭: ${event.code}`);
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
