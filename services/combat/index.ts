/**
 * Combat System - 战斗系统统一导出
 * 
 * 将各个子模块的功能集中导出，方便外部调用
 */

// 元素系统
export {
  isElementCounter,
  isElementWeak,
  getSpellById,
  evaluateElementInteraction
} from './elementSystem';

// 伤害计算
export {
  calculateSpellDamage,
  applyArmorReduction,
  calculateSpellCost
} from './damageCalculation';

// 连击系统
export {
  isThunderSpell,
  calculateComboBonus,
  updateComboState
} from './comboSystem';

// 回合管理
export {
  prepareNextTurn,
  checkGameOver,
  recalculateCostMod
} from './turnManager';
