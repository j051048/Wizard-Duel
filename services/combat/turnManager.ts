/**
 * Turn Manager - 回合管理器
 * 
 * [P0 Fix] prepareNextTurn 已废弃，回合流转统一走 RuleArbiter
 * 保留 checkGameOver 和 recalculateCostMod 作为工具函数
 */

import { DuelState, StatusEffect } from '../../types';
import { GAME_CONFIG } from '../../constants';

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
