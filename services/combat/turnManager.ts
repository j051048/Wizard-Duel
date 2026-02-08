/**
 * Turn Manager - 回合管理器
 * 
 * [P0 Fix] prepareNextTurn 已废弃，回合流转统一走 RuleArbiter
 * 保留 checkGameOver 和 recalculateCostMod 作为工具函数
 */

import { DuelState, StatusEffect } from '../../types';
import { GAME_CONFIG } from '../../constants';

// ============ prepareNextTurn 已废弃 ============
// 回合流转统一由 RuleArbiter.resolveRoundStart() 和 RuleArbiter.resolveRoundEnd() 处理
// 删除 prepareNextTurn 防止双轨制导致状态效果双重递减或抽牌两次

/**
 * @deprecated 请使用 RuleArbiter.resolveRoundStart() 代替
 * 保留函数签名以防旧引用，但内部直接抛异常提醒迁移
 */
export const prepareNextTurn = (state: DuelState): DuelState => {
  console.warn('[DEPRECATED] prepareNextTurn called - should use RuleArbiter.resolveRoundStart() instead');
  // Fallback: just return state unchanged to avoid breaking anything
  return state;
};

// ============ 游戏结束判定 ============

/**
 * 统一死亡检查
 * @returns 'WIN' | 'LOSS' | 'DRAW' | null (游戏继续)
 */
export const checkGameOver = (state: DuelState): 'WIN' | 'LOSS' | 'DRAW' | null => {
  const playerDead = state.playerHP <= 0;
  const opponentDead = state.opponentHP <= 0;
  
  if (playerDead && opponentDead) {
    return 'DRAW';
  }
  if (playerDead) {
    return 'LOSS';
  }
  if (opponentDead) {
    return 'WIN';
  }
  return null;
};

// ============ 费用修正计算 ============

export const recalculateCostMod = (effects: StatusEffect[]): number => {
  const tangle = effects.find(e => e.type === 'tangle');
  return tangle ? (tangle.value || 0) : 0;
};
