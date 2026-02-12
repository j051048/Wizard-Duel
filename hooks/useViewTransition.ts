/**
 * useViewTransition - iOS 级别的物理阻尼弹性过渡动画
 * 
 * [#任务1 页面物理阻尼弹性过渡]
 * 
 * 特性：
 * - Spring 物理动画：stiffness: 300, damping: 30, mass: 1
 * - 横向滑动位移（x 轴偏移），模拟手势切换
 * - 前进/后退方向感知
 * - 淡入淡出配合位移
 */

import { Transition, Variants } from 'framer-motion';

// iOS 风格 Spring 物理配置
export const SPRING_CONFIG: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 1,
};

// 视图切换方向
export type TransitionDirection = 'forward' | 'backward' | 'none';

// 页面过渡动画变体 - 横向滑动 + 淡入淡出
export const pageTransitionVariants: Variants = {
  // 初始状态（进入前）
  initial: (direction: TransitionDirection) => ({
    x: direction === 'forward' ? 100 : direction === 'backward' ? -100 : 0,
    opacity: 0,
    scale: 0.98,
  }),
  
  // 激活状态（当前显示）
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  
  // 退出状态
  exit: (direction: TransitionDirection) => ({
    x: direction === 'forward' ? -100 : direction === 'backward' ? 100 : 0,
    opacity: 0,
    scale: 0.98,
  }),
};

// 弹性弹跳效果（用于特殊场景，如结果弹窗）
export const springBounceVariants: Variants = {
  initial: {
    scale: 0.8,
    opacity: 0,
    y: 20,
  },
  animate: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: SPRING_CONFIG,
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    y: -20,
    transition: {
      ...SPRING_CONFIG,
      damping: 40, // 退出时更快速
    },
  },
};

// 轻微缩放过渡（用于模态窗口、子页面）
export const scaleFadeVariants: Variants = {
  initial: {
    scale: 0.95,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: SPRING_CONFIG,
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: {
      ...SPRING_CONFIG,
      damping: 40,
    },
  },
};

// 上滑进入（用于底部弹出的界面，如牌组编辑器）
export const slideUpVariants: Variants = {
  initial: {
    y: '100%',
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: SPRING_CONFIG,
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      ...SPRING_CONFIG,
      damping: 40,
    },
  },
};

// 视图层级关系（用于判断前进/后退方向）
const VIEW_HIERARCHY: Record<string, number> = {
  LOGIN: 0,
  LOBBY: 1,
  MODE_SELECT: 2,
  MATCHMAKING: 2,
  MULLIGAN: 3,
  DUEL: 4,
  DECK_BUILDER: 2,
  SHOP: 2,
  COLLECTION: 2,
  TAVERN: 2,
  DUNGEON_MAP: 2,
  PROFILE: 2,
  BATTLE_PASS: 2,
};

/**
 * 计算视图切换方向
 * @param from 源视图
 * @param to 目标视图
 * @returns 过渡方向
 */
export function getTransitionDirection(
  from: string | null,
  to: string
): TransitionDirection {
  if (!from) return 'none';
  
  const fromLevel = VIEW_HIERARCHY[from] ?? 1;
  const toLevel = VIEW_HIERARCHY[to] ?? 1;
  
  if (toLevel > fromLevel) return 'forward';
  if (toLevel < fromLevel) return 'backward';
  return 'none'; // 同级切换无方向性
}

/**
 * 视图过渡配置 Hook
 */
export function useViewTransition() {
  return {
    springConfig: SPRING_CONFIG,
    pageVariants: pageTransitionVariants,
    springBounceVariants,
    scaleFadeVariants,
    slideUpVariants,
    getTransitionDirection,
  };
}
