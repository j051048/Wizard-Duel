/**
 * NotificationService - 离屏通知
 * 
 * [P3 Fix #25] 浏览器通知提醒
 * - 排到对手时通知
 * - 好友上线通知
 * - 支持 Service Worker push（未来扩展）
 */

class NotificationServiceImpl {
  private _permission: NotificationPermission = 'default';

  /** 检查是否支持通知 */
  get isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /** 当前权限状态 */
  get permission(): NotificationPermission {
    return this._permission;
  }

  /** 是否已获得权限 */
  get isGranted(): boolean {
    return this._permission === 'granted';
  }

  /**
   * 请求通知权限
   * 应在用户交互（如点击按钮）时调用
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      this._permission = result;
      return result === 'granted';
    } catch (e) {
      console.warn('[NotificationService] Permission request failed:', e);
      return false;
    }
  }

  /**
   * 初始化：检查当前权限
   */
  init(): void {
    if (this.isSupported) {
      this._permission = Notification.permission;
    }
  }

  /**
   * 发送本地通知
   */
  notify(title: string, options?: NotificationOptions): Notification | null {
    if (!this.isSupported || !this.isGranted) return null;

    // 只在页面不可见时发送通知
    if (document.visibilityState === 'visible') return null;

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        lang: 'zh-CN',
        ...options,
      });

      // 点击通知时聚焦窗口
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 自动关闭
      setTimeout(() => notification.close(), 8000);

      return notification;
    } catch (e) {
      console.debug('[NotificationService] Notify failed:', e);
      return null;
    }
  }

  /** 匹配成功通知 */
  notifyMatchFound(opponentName: string): void {
    this.notify('⚔️ 对手找到了！', {
      body: `${opponentName} 向你发起了挑战`,
      tag: 'match-found',
      requireInteraction: true,
    });
  }

  /** 轮到你的回合通知（长时间未操作） */
  notifyYourTurn(): void {
    this.notify('🎯 轮到你了！', {
      body: '对手已结束回合，请尽快行动',
      tag: 'your-turn',
    });
  }

  /** 好友上线通知 */
  notifyFriendOnline(friendName: string): void {
    this.notify('🟢 好友上线', {
      body: `${friendName} 已上线`,
      tag: `friend-${friendName}`,
    });
  }
}

export const NotificationService = new NotificationServiceImpl();
export default NotificationService;