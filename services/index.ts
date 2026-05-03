/**
 * Wizard Duel - 服务层索引
 * 
 * 统一导出所有服务模块
 */

// 核心游戏逻辑
export * from './gameLogic';

// AI 决策（同时从 gameLogic 重新导出，此处额外标注）
export { pickBestSpellForAI, executeAITurn } from './ai';

// 卡牌机制
export { getMechanicHandler, MECHANIC_DEFINITIONS } from './mechanics';

// 状态工具
export { cloneDuelState, updateDuelState } from './stateUtils';

// 性能工具
export { 
  getPerformanceConfig, 
  globalFPSMonitor,
  FPSMonitor,
  HIGH_QUALITY_CONFIG,
  MEDIUM_QUALITY_CONFIG,
  LOW_QUALITY_CONFIG
} from './performance';
export type { PerformanceConfig } from './performance';

// 触觉反馈
export { HapticService } from './haptic';

// 动画序列
export { GameSequenceExecutor } from './sequence';

// 地牢模式
export { DungeonService } from './dungeon';
