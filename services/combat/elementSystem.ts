/**
 * Element System - 元素相克逻辑
 * 
 * 元素克制链: fire > vine > ice > thunder > rock > fire
 * 管理元素属性、克制关系、弱点检查
 */

import { SpellType, Spell } from '../../types';
import { SPELLS } from '../../constants';

// ============ 元素克制判定 ============

/**
 * 检查 attackerId 是否克制 targetId
 */
export const isElementCounter = (attackerId: SpellType, targetId: SpellType): boolean => {
  const attackerSpell = getSpellById(attackerId);
  return attackerSpell.beats === targetId;
};

/**
 * 检查 defenderId 是否被 attackerId 克制
 */
export const isElementWeak = (defenderId: SpellType, attackerId: SpellType): boolean => {
  const defenderSpell = getSpellById(defenderId);
  return defenderSpell.beats === attackerId; // defender克制的法术正好是攻击者，说明攻击者被防御者克制
};

/**
 * 获取法术详情
 */
export const getSpellById = (id: SpellType): Spell => {
  return SPELLS.find(s => s.id === id) || SPELLS[0];
};

/**
 * 判断是否发生克制（暴击）
 * 返回: { countered: 是否被抵消, crit: 是否暴击 }
 */
export const evaluateElementInteraction = (
  attackerSpellId: SpellType,
  targetLastSpellId: SpellType | null
): { countered: boolean; crit: boolean } => {
  if (!targetLastSpellId) {
    return { countered: false, crit: false };
  }

  const attackerSpell = getSpellById(attackerSpellId);
  const targetSpell = getSpellById(targetLastSpellId);

  // 检查是否被目标的上回合法术抵消
  const countered = targetSpell.beats === attackerSpellId;
  
  // 检查是否克制目标的上回合法术（触发暴击）
  const crit = attackerSpell.beats === targetLastSpellId;

  return { countered, crit };
};
