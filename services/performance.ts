/**
 * Wizard Duel - 性能监控工具
 * 
 * 提供运行时性能监控和优化建议
 */

// 性能配置
export interface PerformanceConfig {
  enableParticles: boolean;
  enableProjectiles: boolean;
  enableDamageNumbers: boolean;
  maxParticles: number;
  maxProjectiles: number;
  targetFPS: number;
}

// 默认高质量配置
export const HIGH_QUALITY_CONFIG: PerformanceConfig = {
  enableParticles: true,
  enableProjectiles: true,
  enableDamageNumbers: true,
  maxParticles: 100,
  maxProjectiles: 10,
  targetFPS: 60
};

// 低质量配置
export const LOW_QUALITY_CONFIG: PerformanceConfig = {
  enableParticles: false,
  enableProjectiles: false,
  enableDamageNumbers: true, // 保留伤害数字，这是核心反馈
  maxParticles: 0,
  maxProjectiles: 0,
  targetFPS: 30
};

// 中等质量配置
export const MEDIUM_QUALITY_CONFIG: PerformanceConfig = {
  enableParticles: true,
  enableProjectiles: true,
  enableDamageNumbers: true,
  maxParticles: 50,
  maxProjectiles: 5,
  targetFPS: 45
};

/**
 * 根据质量设置获取性能配置
 */
export const getPerformanceConfig = (quality: 'low' | 'medium' | 'high'): PerformanceConfig => {
  switch (quality) {
    case 'low':
      return LOW_QUALITY_CONFIG;
    case 'medium':
      return MEDIUM_QUALITY_CONFIG;
    case 'high':
    default:
      return HIGH_QUALITY_CONFIG;
  }
};

/**
 * FPS 监控器
 * 用于检测性能下降并自动降级
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();
  private readonly sampleSize = 60; // 采样 60 帧
  
  /**
   * 记录一帧
   */
  tick(): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    // 忽略异常帧间隔（>1s），防止切后台或初始加载导致由于计算FPS
    if (delta > 1000) return;

    this.frames.push(delta);
    if (this.frames.length > this.sampleSize) {
      this.frames.shift();
    }
  }
  
  /**
   * 获取当前 FPS
   */
  getFPS(): number {
    if (this.frames.length === 0) return 60;
    const avgDelta = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    return Math.round(1000 / avgDelta);
  }
  
  /**
   * 检查是否需要降级
   * @param threshold 阈值 FPS，低于此值建议降级
   */
  shouldDowngrade(threshold: number = 30): boolean {
    return this.getFPS() < threshold && this.frames.length >= this.sampleSize / 2;
  }
  
  /**
   * 重置监控器
   */
  reset(): void {
    this.frames = [];
    this.lastTime = performance.now();
  }
}

// 全局 FPS 监控器实例
export const globalFPSMonitor = new FPSMonitor();
