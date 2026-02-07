/**
 * Damage Calculation - 伤害计算系统
 * 
 * 包括基础伤害、护甲减免、元素加成、暴击加成等
 */

import { DuelState, SpellType, Spell } from '../../types';
import { getSpellById } from './elementSystem';

// ============ 伤害计算 ============

/**
 * 计算法术最终伤害
 * @param spell - 法术详情
 * @param countered - 是否被抵消
 * @param crit - 是否暴击
 * @param comboMultiplier - 连击加成倍数 (默认1.0)
 * @returns 最终伤害值
 */
export const calculateSpellDamage = (
  spell: Spell,
  countered: boolean,
  crit: boolean,
  comboMultiplier: number = 1.0
): number => {
  if (countered) return 0;
  
  let damage = spell.damage;
  
  // 暴击加成 (1.5倍)
  if (crit) {
    damage = Math.floor(damage * 1.5);
  }
  
  // 连击加成
  if (comboMultiplier > 1.0) {
    damage = Math.floor(damage * comboMultiplier);
  }
  
  return damage;
};

/**
 * 应用护甲减免
 * @param damage - 原始伤害
 * @param armor - 当前护甲值
 * @returns { finalDamage: 实际扣血, armorConsumed: 消耗的护甲 }
 */
export const applyArmorReduction = (
  damage: number,
  armor: number
): { finalDamage: number; armorConsumed: number } => {
  if (armor <= 0) {
    return { finalDamage: damage, armorConsumed: 0 };
  }
  
  const armorConsumed = Math.min(armor, damage);
  const finalDamage = Math.max(0, damage - armor);
  
  return { finalDamage, armorConsumed };
};

/**
 * 计算法术消耗（考虑费用修正）
 * @param spellId - 法术ID
 * @param costMod - 费用修正值 (缠绕等效果)
 * @returns 最终费用
 */
export const calculateSpellCost = (
  spellId: SpellType,
  costMod: number = 0
): number => {
  const spell = getSpellById(spellId);
  if (spell.id === 'skip') return 0;
  return Math.max(0, spell.manaCost + costMod);
};
