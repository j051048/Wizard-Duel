// hooks/index.ts - Hooks 导出入口

export { usePreloader, type PreloadProgress } from './usePreloader';
export { useGameLoop, type GameLoopActions } from './useGameLoop';
export { useAudioManager, type AudioManagerState, type AudioManagerActions } from './useAudioManager';
export { useIntegration } from './useIntegration';
export { useDragToPlay } from './useDragToPlay';
export { useBattleAnimations } from './useBattleAnimations';
export { useDeckBuilder } from './useDeckBuilder';

// [#5] App.tsx 瘦身 - 新增 Hooks
export { useAppRouting } from './useAppRouting';
export { useGameFeedback } from './useGameFeedback';
export { useGameEndHandler } from './useGameEndHandler';
