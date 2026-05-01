// PVP 服务：管理 WebSocket 连接与通信
// 分为两个独立连接：匹配队列 和 对战房间
// [P0-4] 支持断线重连（指数退避，最多 3 次）

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

class PVPService {
    // 匹配连接（临时，匹配成功后断开）
    private matchSocket: WebSocket | null = null;
    // 对战连接（整场对战期间保持）
    private gameSocket: WebSocket | null = null;
    private serverUrl: string = import.meta.env.VITE_PVP_SERVER_URL || "wss://xwizard.zeabur.app";

    // [P0-4] Reconnection state
    private roomId: string | null = null;
    private playerId: string | null = null;
    private role: string | null = null;
    private seed: number | null = null;
    private lastOnMessage: ((data: any) => void) | null = null;
    private connectionState: ConnectionState = 'disconnected';
    private reconnectAttempt: number = 0;
    private maxReconnectAttempts: number = 3;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private intentionalDisconnect: boolean = false;

    // External callbacks
    onDisconnect: (() => void) | null = null;
    onReconnect: (() => void) | null = null;

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

        // Store state for reconnection
        this.roomId = roomId;
        this.playerId = playerId;
        this.lastOnMessage = onMessage;
        this.intentionalDisconnect = false;
        this.reconnectAttempt = 0;

        const url = `${this.serverUrl}/ws/${roomId}/${playerId}`;
        console.log("🚀 [PVP] 连接对战房间:", url);
        console.log("📍 [PVP] 房间:", roomId, "玩家:", playerId);

        this.connectionState = 'connecting';
        try {
            this.gameSocket = new WebSocket(url);
            this.bindGameSocketEvents(this.gameSocket, onMessage);
        } catch (e) {
            console.error("🚫 [PVP] 对战连接失败:", e);
            this.connectionState = 'disconnected';
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
     * 断开对战连接（有意断开，不触发重连）
     */
    disconnect() {
        this.intentionalDisconnect = true;
        this.clearReconnectTimer();
        this.cleanupSocket('game');
        this.connectionState = 'disconnected';
    }

    /**
     * Get current connection state
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Get stored room metadata (for reconnection context)
     */
    getRoomInfo(): { roomId: string | null; playerId: string | null; role: string | null; seed: number | null } {
        return {
            roomId: this.roomId,
            playerId: this.playerId,
            role: this.role,
            seed: this.seed,
        };
    }

    // ============ [P0-4] Reconnection ============

    private scheduleReconnect() {
        if (this.intentionalDisconnect || !this.roomId || !this.playerId || !this.lastOnMessage) {
            return;
        }

        if (this.reconnectAttempt >= this.maxReconnectAttempts) {
            console.error("🚫 [PVP] 重连失败，已达到最大重试次数");
            this.connectionState = 'disconnected';
            this.onDisconnect?.();
            return;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, this.reconnectAttempt) * 1000;
        this.reconnectAttempt++;
        this.connectionState = 'reconnecting';

        console.log(`🔄 [PVP] 将在 ${delay}ms 后尝试第 ${this.reconnectAttempt} 次重连...`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.attemptReconnect();
        }, delay);
    }

    private attemptReconnect() {
        if (!this.roomId || !this.playerId || !this.lastOnMessage) return;

        const url = `${this.serverUrl}/ws/${this.roomId}/${this.playerId}`;
        console.log(`🔄 [PVP] 正在重连: ${url} (尝试 ${this.reconnectAttempt}/${this.maxReconnectAttempts})`);

        this.connectionState = 'connecting';
        try {
            this.gameSocket = new WebSocket(url);
            this.bindGameSocketEvents(this.gameSocket, this.lastOnMessage);
        } catch (e) {
            console.error("🚫 [PVP] 重连失败:", e);
            this.scheduleReconnect();
        }
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // ============ 内部工具 ============

    /**
     * Game socket event binding with reconnection logic
     */
    private bindGameSocketEvents(socket: WebSocket, onMessage: (data: any) => void) {
        socket.onopen = () => {
            console.log("✅ [PVP:GAME] WebSocket 已连接");
            this.connectionState = 'connected';
            this.reconnectAttempt = 0;

            // If reconnecting, send explicit RECONNECT message
            if (this.roomId && this.playerId) {
                socket.send(JSON.stringify({
                    type: "RECONNECT",
                    room_id: this.roomId,
                    player_id: this.playerId,
                }));
            }
        };

        socket.onmessage = (event) => {
            console.log("📨 [PVP:GAME] 收到消息:", event.data);
            try {
                const data = JSON.parse(event.data);

                if (data.type === "CONNECTED") {
                    console.log("🎉 [PVP:GAME] 服务端确认连接:", data.msg);
                }

                // Store role and seed from RECONNECTED
                if (data.type === "RECONNECTED") {
                    this.role = data.role;
                    this.seed = data.seed;
                    console.log(`🔄 [PVP] 重连成功! Role: ${data.role}, Seed: ${data.seed}`);
                    this.onReconnect?.();
                }

                onMessage(data);
            } catch (err) {
                console.error("❌ [PVP:GAME] 消息解析失败:", err);
            }
        };

        socket.onclose = (event) => {
            console.warn(`❌ [PVP:GAME] WebSocket 已关闭. Code: ${event.code}, Reason: ${event.reason}`);
            this.gameSocket = null;

            if (!this.intentionalDisconnect) {
                this.scheduleReconnect();
            }
        };

        socket.onerror = (error) => {
            console.error("🚨 [PVP:GAME] WebSocket 错误:", error);
        };
    }

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
