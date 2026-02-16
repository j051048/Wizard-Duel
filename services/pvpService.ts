// PVP 服务：管理 WebSocket 连接与通信
// 分为两个独立连接：匹配队列 和 对战房间

class PVPService {
    // 匹配连接（临时，匹配成功后断开）
    private matchSocket: WebSocket | null = null;
    // 对战连接（整场对战期间保持）
    private gameSocket: WebSocket | null = null;
    private serverUrl: string = "wss://xwizard.zeabur.app";

    // ============ 匹配队列 ============

    /**
     * 连接到匹配队列
     * URL: /ws/matchmaking/{playerId}
     */
    connectMatchmaking(playerId: string, onMessage: (data: any) => void) {
        this.cleanupSocket('match');

        const url = `${this.serverUrl}/ws/matchmaking/${playerId}`;
        console.log("🔍 [PVP] 连接匹配队列:", url);

        try {
            this.matchSocket = new WebSocket(url);
            this.bindSocketEvents(this.matchSocket, onMessage, 'MATCH');
        } catch (e) {
            console.error("🚫 [PVP] 匹配连接失败:", e);
        }
    }

    /**
     * 断开匹配连接
     */
    disconnectMatchmaking() {
        this.cleanupSocket('match');
    }

    // ============ 对战房间 ============

    /**
     * 连接到对战房间
     * URL: /ws/{roomId}/{playerId}
     */
    connect(roomId: string, playerId: string, onMessage: (data: any) => void) {
        this.cleanupSocket('game');

        const url = `${this.serverUrl}/ws/${roomId}/${playerId}`;
        console.log("🚀 [PVP] 连接对战房间:", url);
        console.log("📍 [PVP] 房间:", roomId, "玩家:", playerId);

        try {
            this.gameSocket = new WebSocket(url);
            this.bindSocketEvents(this.gameSocket, onMessage, 'GAME');
        } catch (e) {
            console.error("🚫 [PVP] 对战连接失败:", e);
        }
    }

    /**
     * 发送操作到对战房间
     */
    sendAction(action: any) {
        if (this.gameSocket && this.gameSocket.readyState === WebSocket.OPEN) {
            this.gameSocket.send(JSON.stringify(action));
        }
    }

    /**
     * 断开对战连接
     */
    disconnect() {
        this.cleanupSocket('game');
    }

    // ============ 内部工具 ============

    private bindSocketEvents(socket: WebSocket, onMessage: (data: any) => void, tag: string) {
        socket.onopen = () => {
            console.log(`✅ [PVP:${tag}] WebSocket 已连接`);
        };

        socket.onmessage = (event) => {
            console.log(`📨 [PVP:${tag}] 收到消息:`, event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.type === "CONNECTED") {
                    console.log(`🎉 [PVP:${tag}] 服务端确认连接:`, data.msg);
                }
                onMessage(data);
            } catch (err) {
                console.error(`❌ [PVP:${tag}] 消息解析失败:`, err);
            }
        };

        socket.onclose = (event) => {
            console.warn(`❌ [PVP:${tag}] WebSocket 已关闭. Code: ${event.code}, Reason: ${event.reason}`);
        };

        socket.onerror = (error) => {
            console.error(`🚨 [PVP:${tag}] WebSocket 错误:`, error);
        };
    }

    private cleanupSocket(type: 'match' | 'game') {
        const socket = type === 'match' ? this.matchSocket : this.gameSocket;
        if (socket) {
            socket.onclose = null;
            socket.onerror = null;
            socket.onmessage = null;
            socket.onopen = null;
            try { socket.close(); } catch {}
            if (type === 'match') {
                this.matchSocket = null;
            } else {
                this.gameSocket = null;
            }
        }
    }
}

export const pvpService = new PVPService();
