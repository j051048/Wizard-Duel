import { Action } from '../types/game';

class PVPService {
    private socket: WebSocket | null = null;
    private serverUrl: string = "wss://xwizard.zeabur.app";

    connect(roomId: string, playerId: string, onMessage: (data: any) => void) {
        if (this.socket) {
            this.socket.close();
        }

        // 尝试两种可能的路径：Zeabur 默认可能会根据文件夹名映射，也可能就是根路由
        // 增加日志上报到控制台，方便老板截图
        const url = `wss://xwizard.zeabur.app/ws/${roomId}/${playerId}`;
        console.log("🚀 [PVP_DIAGNOSTIC] 开始建立 WebSocket 连接:", url);
        
        try {
            this.socket = new WebSocket(url);

            this.socket.onopen = (e) => {
                console.log("✅ [PVP_DIAGNOSTIC] 连接成功打开 (onopen)", e);
            };

            this.socket.onmessage = (event) => {
                console.log("📩 [PVP_DIAGNOSTIC] 收到原始消息:", event.data);
                try {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                } catch (err) {
                    console.error("❌ [PVP_DIAGNOSTIC] 解析 JSON 失败:", err);
                }
            };

            this.socket.onclose = (event) => {
                console.warn(`❌ [PVP_DIAGNOSTIC] 连接关闭! Code: ${event.code}, Reason: ${event.reason || '无理由'}`);
                // 如果是 1006 或 1015，通常是跨域、证书或路径错误
            };

            this.socket.onerror = (error) => {
                console.error("🔥 [PVP_DIAGNOSTIC] WebSocket 发生错误:", error);
            };
        } catch (setupError) {
            console.error("🚫 [PVP_DIAGNOSTIC] WebSocket 初始化异常:", setupError);
        }
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
