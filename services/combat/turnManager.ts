/**
 * Turn Manager - 回合管理器
 * 
 * 管理回合流程、阶段转换、状态效果更新
 */

import { DuelState, StatusEffect } from '../../types';
import { GAME_CONFIG } from '../../constants';

// ============ 回合准备 ============

/**
 * 准备下一回合
 * - 回合数+1
 * - 状态效果递减
 * - DoT伤害结算
 * - 法力成长与恢复
 * - 随从状态重置
 */
export const prepareNextTurn = (state: DuelState): DuelState => {
  const newState = { 
    ...state,
    heroSkillsUsed: false,
    opponentHeroSkillUsed: false,
    playerEffects: [...state.playerEffects],
    opponentEffects: [...state.opponentEffects],
    playerHand: [...state.playerHand],
    playerDeck: [...state.playerDeck],
    opponentDeck: [...state.opponentDeck],
  };

  // 1. 回合数自增
  newState.roundNumber += 1;

  // 2. 状态效果结算 (DoT 优先结算)
  let burnDmg = 0;
  const newPlayerEffects: StatusEffect[] = [];
  state.playerEffects.forEach(e => {
    if (e.type === 'burn') burnDmg += (e.value || 0);
    const nextDur = e.duration - 1;
    if (nextDur > 0) newPlayerEffects.push({ ...e, duration: nextDur });
  });
  newState.playerEffects = newPlayerEffects;
  if (burnDmg > 0) newState.playerHP -= burnDmg;

  let oppBurnDmg = 0;
  const newOpponentEffects: StatusEffect[] = [];
  state.opponentEffects.forEach(e => {
    if (e.type === 'burn') oppBurnDmg += (e.value || 0);
    const nextDur = e.duration - 1;
    if (nextDur > 0) newOpponentEffects.push({ ...e, duration: nextDur });
  });
  newState.opponentEffects = newOpponentEffects;
  if (oppBurnDmg > 0) newState.opponentHP -= oppBurnDmg;

  // 3. 检查死亡 - 如果死于DoT，直接返回状态
  if (checkGameOver(newState) !== null) {
    return newState;
  }

  // 4. 法力成长与恢复
  newState.playerMaxMana = Math.min(GAME_CONFIG.maxMana, state.playerMaxMana + 1);
  newState.opponentMaxMana = Math.min(GAME_CONFIG.maxMana, state.opponentMaxMana + 1);
  newState.playerMana = newState.playerMaxMana;
  newState.opponentMana = newState.opponentMaxMana;

  // 5. 计算费用修正 (Tangle)
  const playerTangle = newState.playerEffects.find(e => e.type === 'tangle');
  newState.playerCostMod = playerTangle ? (playerTangle.value || 0) : 0;
  
  const oppTangle = newState.opponentEffects.find(e => e.type === 'tangle');
  newState.opponentCostMod = oppTangle ? (oppTangle.value || 0) : 0;

  // 6. 随从状态重置
  newState.playerMinions = newState.playerMinions.map(m => ({ ...m, exhausted: false }));
  newState.opponentMinions = newState.opponentMinions.map(m => ({ ...m, exhausted: false }));

  return newState;
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
