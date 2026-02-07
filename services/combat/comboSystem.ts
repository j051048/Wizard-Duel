/**
 * Combo System - 连击系统
 * 
 * 管理雷电连击、连续出牌加成等机制
 */

import { DuelState, SpellType } from '../../types';
import { getSpellById } from './elementSystem';

// ============ 连击检测 ============

const MAX_THUNDER_COMBO = 2;

/**
 * 检查法术是否为雷电系法术（排除英雄技能）
 */
export const isThunderSpell = (spellId: string | null): boolean => {
  return spellId !== null && spellId.startsWith('thunder') && !spellId.startsWith('hero_');
};

/**
 * 计算连击加成倍数
 * @param state - 游戏状态
 * @param caster - 施法者
 * @param spellId - 当前法术ID
 * @param countered - 是否被抵消
 * @returns { multiplier: 伤害倍数, newComboCount: 新的连击数, comboMessage: 提示信息 }
 */
export const calculateComboBonus = (
  state: DuelState,
  caster: 'player' | 'opponent',
  spellId: SpellType,
  countered: boolean
): { 
  multiplier: number; 
  newComboCount: number; 
  comboMessage: string | null;
} => {
  const spell = getSpellById(spellId);
  const isPlayer = caster === 'player';
  
  // 只有雷电法术才能触发连击
  if (spell.mechanic !== 'charge' || !isThunderSpell(spellId) || countered) {
    return { multiplier: 1.0, newComboCount: 0, comboMessage: null };
  }

  const lastSpellId = isPlayer ? state.playerLastSpell : state.opponentLastSpell;
  const currentCombo = isPlayer ? state.playerConsecutiveThunder : state.opponentConsecutiveThunder;

  // 如果上一张也是雷电法术
  if (isThunderSpell(lastSpellId)) {
    if (currentCombo < MAX_THUNDER_COMBO) {
      const newCombo = currentCombo + 1;
      const multiplier = 1 + (newCombo * 0.5); // 1次=1.5x, 2次=2x
      return {
        multiplier,
        newComboCount: newCombo,
        comboMessage: `⚡ 闪电连击 x${newCombo}！伤害 +${newCombo * 50}%！`
      };
    } else {
      // 已达上限
      return {
        multiplier: 2.0,
        newComboCount: currentCombo,
        comboMessage: `⚡ 闪电连击已达上限 (x${MAX_THUNDER_COMBO})！`
      };
    }
  }

  // 不是连续的雷电法术，重置
  return { multiplier: 1.0, newComboCount: 0, comboMessage: null };
};

/**
 * 更新连击状态
 */
export const updateComboState = (
  state: DuelState,
  caster: 'player' | 'opponent',
  spellId: SpellType,
  newComboCount: number
): DuelState => {
  const isPlayer = caster === 'player';
  
  if (isThunderSpell(spellId)) {
    if (isPlayer) {
      return { ...state, playerConsecutiveThunder: newComboCount };
    } else {
      return { ...state, opponentConsecutiveThunder: newComboCount };
    }
  } else {
    // 非雷电法术，重置连击
    if (isPlayer) {
      return { ...state, playerConsecutiveThunder: 0 };
    } else {
      return { ...state, opponentConsecutiveThunder: 0 };
    }
  }
};
