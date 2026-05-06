/**
 * Wizard Duel - 性能监控工具
 *
 * [Phase 2] 增强：Web Vitals 追踪 + FPS 自动降级 + 资源加载监控
 */

// ============ Web Vitals 追踪 ============

export interface WebVitals {
  fcp: number | null;   // First Contentful Paint
  lcp: number | null;   // Largest Contentful Paint
  fid: number | null;   // First Input Delay
  cls: number | null;   // Cumulative Layout Shift
  ttfb: number | null;  // Time to First Byte
}

const vitals: WebVitals = { fcp: null, lcp: null, fid: null, cls: null, ttfb: null };

/** 收集 Web Vitals（自动在页面加载时调用） */
export const initWebVitals = (): void => {
  if (typeof PerformanceObserver === 'undefined') return;

  // FCP
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        vitals.fcp = entries[entries.length - 1].startTime;
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch { /* 不支持 */ }

  // LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        vitals.lcp = entries[entries.length - 1].startTime;
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* 不支持 */ }

  // FID / INP
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0] as PerformanceEventTiming;
      if (entry) {
        vitals.fid = entry.processingStart - entry.startTime;
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch { /* 不支持 */ }

  // CLS
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      vitals.cls = clsValue;
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch { /* 不支持 */ }

  // TTFB
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      vitals.ttfb = (navEntries[0] as PerformanceNavigationTiming).responseStart;
    }
  } catch { /* 不支持 */ }
};

/** 获取当前 Web Vitals 快照 */
export const getWebVitals = (): WebVitals => ({ ...vitals });

// ============ 资源加载监控 ============

export interface ResourceMetric {
  name: string;
  type: string;
  duration: number;
  size: number;
}

/** 获取慢资源列表（>500ms 或 >500KB） */
export const getSlowResources = (thresholdMs = 500, thresholdBytes = 500 * 1024): ResourceMetric[] => {
  if (typeof performance === 'undefined') return [];
  return performance.getEntriesByType('resource')
    .filter(e => e.duration > thresholdMs || (e as any).transferSize > thresholdBytes)
    .map(e => ({
      name: e.name.split('/').pop() || e.name,
      type: (e as any).initiatorType || 'unknown',
      duration: Math.round(e.duration),
      size: (e as any).transferSize || 0,
    }));
};

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

// ============ [Phase 2] 自动画质调节 ============

type QualityLevel = 'low' | 'medium' | 'high';

interface AutoQualityState {
  current: QualityLevel;
  lastCheckFrame: number;
  downgradeCooldown: number;
}

const autoState: AutoQualityState = {
  current: 'high',
  lastCheckFrame: 0,
  downgradeCooldown: 0,
};

/**
 * 基于 FPS 自动选择画质等级
 * 每 120 帧检测一次，FPS < 25 降级，FPS > 50 且稳定则升级
 */
export const getAutoQuality = (): QualityLevel => {
  const monitor = globalFPSMonitor;
  monitor.tick();

  autoState.lastCheckFrame++;
  if (autoState.downgradeCooldown > 0) autoState.downgradeCooldown--;

  // 每 120 帧检测一次
  if (autoState.lastCheckFrame < 120) return autoState.current;
  autoState.lastCheckFrame = 0;

  const fps = monitor.getFPS();

  // 降级：FPS < 25 且无冷却
  if (fps < 25 && autoState.downgradeCooldown === 0) {
    if (autoState.current === 'high') {
      autoState.current = 'medium';
      autoState.downgradeCooldown = 240; // 冷却 240 帧
    } else if (autoState.current === 'medium') {
      autoState.current = 'low';
      autoState.downgradeCooldown = 360;
    }
  }

  // 升级：FPS > 50 且持续稳定
  if (fps > 50 && !monitor.shouldDowngrade(45)) {
    if (autoState.current === 'low') {
      autoState.current = 'medium';
    } else if (autoState.current === 'medium') {
      autoState.current = 'high';
    }
  }

  return autoState.current;
};

/** 获取当前自动画质对应的性能配置 */
export const getAutoPerformanceConfig = (): PerformanceConfig => {
  return getPerformanceConfig(getAutoQuality());
};

/** 初始化 Web Vitals 监控（在 App 启动时调用一次） */
export const initPerformanceMonitoring = (): void => {
  initWebVitals();
};
