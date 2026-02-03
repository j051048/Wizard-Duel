/**
 * HapticService - 触觉反馈服务
 * 提供跨设备的震动反馈支持
 */

export const HapticService = {
  // 检查是否支持震动
  isSupported: () => {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  },

  // 轻微震动 (用于UI交互，如按钮点击)
  light: () => {
    if (HapticService.isSupported()) {
      navigator.vibrate(10);
    }
  },

  // 中等震动 (用于普通技能释放、回合切换)
  medium: () => {
    if (HapticService.isSupported()) {
      navigator.vibrate(20);
    }
  },

  // 强力震动 (用于受到伤害、暴击)
  heavy: () => {
    if (HapticService.isSupported()) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  // 连击/胜利震动模式
  success: () => {
    if (HapticService.isSupported()) {
      navigator.vibrate([10, 30, 10, 30]);
    }
  },

  // 失败/错误震动模式
  failure: () => {
    if (HapticService.isSupported()) {
      navigator.vibrate([30, 50, 30, 50, 50]);
    }
  },
  
  // 冲击震动 (用于终结一击)
  impact: () => {
    if (HapticService.isSupported()) {
      navigator.vibrate([50, 20, 100]);
    }
  }
};
