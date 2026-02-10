/**
 * PowerManager - 低功耗模式管理
 * 
 * [P3 Fix #26] 检测设备电量和发热状态，自动降级
 * 
 * 策略：
 * - 电量 < 20%：自动降低粒子密度，锁定 30fps
 * - 电量 < 10%：禁用所有粒子，最简渲染
 * - 设备过热（通过 FPS 持续低下推断）：逐步降级
 */

import { globalFPSMonitor, PerformanceConfig, HIGH_QUALITY_CONFIG, LOW_QUALITY_CONFIG, MEDIUM_QUALITY_CONFIG } from './performance';

export type PowerState = 'normal' | 'low' | 'critical';

interface BatteryInfo {
  level: number; // 0-1
  charging: boolean;
}

class PowerManagerImpl {
  private _state: PowerState = 'normal';
  private _batteryInfo: BatteryInfo = { level: 1, charging: false };
  private _listeners: Array<(state: PowerState) => void> = [];
  private _checkInterval: ReturnType<typeof setInterval> | null = null;
  private _consecutiveLowFPS = 0;

  get state(): PowerState {
    return this._state;
  }

  get batteryLevel(): number {
    return this._batteryInfo.level;
  }

  get isCharging(): boolean {
    return this._batteryInfo.charging;
  }

  /**
   * 初始化电量监控
   */
  async init(): Promise<void> {
    // 尝试获取 Battery API
    await this._initBatteryAPI();
    
    // 定期检查性能状态
    this._checkInterval = setInterval(() => this._performanceCheck(), 5000);
  }

  /**
   * 停止监控
   */
  destroy(): void {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
    this._listeners = [];
  }

  /**
   * 获取当前推荐的性能配置
   */
  getRecommendedConfig(): PerformanceConfig {
    switch (this._state) {
      case 'critical':
        return {
          ...LOW_QUALITY_CONFIG,
          enableDamageNumbers: true,
          maxParticles: 0,
          targetFPS: 30,
        };
      case 'low':
        return {
          ...MEDIUM_QUALITY_CONFIG,
          maxParticles: 30,
          targetFPS: 30,
        };
      default:
        return HIGH_QUALITY_CONFIG;
    }
  }

  /**
   * 监听功耗状态变化
   */
  onStateChange(listener: (state: PowerState) => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  /**
   * 手动设置功耗状态
   */
  setState(state: PowerState): void {
    if (this._state !== state) {
      this._state = state;
      this._notifyListeners();
    }
  }

  // ============ 内部方法 ============

  private async _initBatteryAPI(): Promise<void> {
    try {
      // Battery API (Chrome, Samsung Internet 等)
      const nav = navigator as any;
      if ('getBattery' in nav) {
        const battery = await nav.getBattery();
        
        this._batteryInfo = {
          level: battery.level,
          charging: battery.charging,
        };

        // 监听电量变化
        battery.addEventListener('levelchange', () => {
          this._batteryInfo.level = battery.level;
          this._evaluateState();
        });

        battery.addEventListener('chargingchange', () => {
          this._batteryInfo.charging = battery.charging;
          this._evaluateState();
        });

        this._evaluateState();
      }
    } catch (e) {
      console.debug('[PowerManager] Battery API not available:', e);
    }
  }

  private _performanceCheck(): void {
    const fps = globalFPSMonitor.getFPS();
    
    // 持续低 FPS 推断设备过热/性能不足
    if (fps < 25) {
      this._consecutiveLowFPS++;
    } else {
      this._consecutiveLowFPS = Math.max(0, this._consecutiveLowFPS - 1);
    }

    // 连续 3 次检测到低 FPS（15秒）→ 降级
    if (this._consecutiveLowFPS >= 3 && this._state === 'normal') {
      console.warn('[PowerManager] Sustained low FPS detected, switching to low-power mode');
      this.setState('low');
    }

    // 连续 6 次（30秒）→ 临界模式
    if (this._consecutiveLowFPS >= 6 && this._state === 'low') {
      console.warn('[PowerManager] Critical performance, switching to minimal mode');
      this.setState('critical');
    }

    // 恢复检测
    if (this._consecutiveLowFPS === 0 && this._state !== 'normal' && this._batteryInfo.level > 0.2) {
      this.setState('normal');
    }
  }

  private _evaluateState(): void {
    const { level, charging } = this._batteryInfo;

    // 充电中不降级
    if (charging) {
      if (this._state !== 'normal') this.setState('normal');
      return;
    }

    if (level <= 0.1) {
      this.setState('critical');
    } else if (level <= 0.2) {
      this.setState('low');
    } else if (this._consecutiveLowFPS < 3) {
      this.setState('normal');
    }
  }

  private _notifyListeners(): void {
    for (const listener of this._listeners) {
      try {
        listener(this._state);
      } catch (e) {
        console.error('[PowerManager] Listener error:', e);
      }
    }
  }
}

export const PowerManager = new PowerManagerImpl();
export default PowerManager;