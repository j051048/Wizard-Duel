// PVP 服务：管理 WebSocket 连接与通信

class PVPService {
    private socket: WebSocket | null = null;
    // 强制使用 wss:// 标准 URL，Zeabur 会自动处理 443 -> 8080 的转发
    private serverUrl: string = "wss://xwizard.zeabur.app";

    connect(roomId: string, playerId: string, onMessage: (data: any) => void) {
        // [P2] 防御性检查：如果旧连接正在建立中，先关闭
        if (this.socket) {
            if (this.socket.readyState === WebSocket.CONNECTING) {
                console.warn('[PVP] Aborting in-progress connection before reconnecting');
            }
            this.socket.onclose = null;
            this.socket.onerror = null;
            this.socket.onmessage = null;
            this.socket.onopen = null;
            try { this.socket.close(); } catch {}
            this.socket = null;
        }

        // 强制使用标准 wss:// URL，不带端口，让 Zeabur 网关处理转发
        const url = `wss://xwizard.zeabur.app/ws/${roomId}/${playerId}`;
        
        console.log("🚀 [PVP] Connecting to:", url);
        console.log("📍 [PVP] Room:", roomId, "Player:", playerId);
        
        try {
            this.socket = new WebSocket(url);
            this.bindEvents(onMessage);
        } catch (e) {
            console.error("🚫 [PVP] WebSocket initialization failed:", e);
        }
    }

    private bindEvents(onMessage: (data: any) => void) {
        if (!this.socket) return;

        this.socket.onopen = () => {
            console.log("✅ [PVP] WebSocket connection opened");
        };

        this.socket.onmessage = (event) => {
            console.log("📨 [PVP] Received message:", event.data);
            try {
                const data = JSON.parse(event.data);
                // 检查握手确认
                if (data.type === "CONNECTED") {
                    console.log("🎉 [PVP] Server confirmed connection:", data.msg);
                }
                onMessage(data);
            } catch (err) {
                console.error("❌ [PVP] Failed to parse message:", err);
            }
        };

        this.socket.onclose = (event) => {
            console.warn(`❌ [PVP] WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
        };

        this.socket.onerror = (error) => {
            console.error("🚨 [PVP] WebSocket error:", error);
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
