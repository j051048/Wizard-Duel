/**
 * Wizard Duel - 状态工具函数
 * 
 * 提供 DuelState 的深拷贝和操作工具
 */

import { DuelState } from '../types';

/**
 * 深拷贝 DuelState
 * 避免状态突变，确保不可变性
 */
export const cloneDuelState = (state: DuelState): DuelState => {
  return {
    ...state,
    playerEffects: state.playerEffects.map(e => ({ ...e })),
    opponentEffects: state.opponentEffects.map(e => ({ ...e })),
    playerHand: [...state.playerHand],
    opponentHand: [...state.opponentHand],
    playerDeck: [...state.playerDeck],
    opponentDeck: [...state.opponentDeck],
    playerMinions: state.playerMinions.map(m => ({ ...m })),
    opponentMinions: state.opponentMinions.map(m => ({ ...m })),
    playerTriggers: state.playerTriggers ? [...state.playerTriggers] : [],
    opponentTriggers: state.opponentTriggers ? [...state.opponentTriggers] : [],
    // [P0 Fix #2] 保留 RNG 状态引用（不可变值对象，无需深拷贝）
    rngState: state.rngState ? { ...state.rngState } : undefined,
    triggerOrderCounter: state.triggerOrderCounter ?? 0,
  };
};

/**
 * 合并状态更新
 * 只更新指定的字段，保持其他字段不变
 */
export const updateDuelState = (
  state: DuelState, 
  updates: Partial<DuelState>
): DuelState => {
  return {
    ...cloneDuelState(state),
    ...updates
  };
};
