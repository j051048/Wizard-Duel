/**
 * Element System - 元素相克逻辑
 * 
 * 元素克制链: fire > vine > ice > thunder > rock > fire
 * 管理元素属性、克制关系、弱点检查
 * 
 * [P0 Fix] beats 判定改为基于元素类型，而非具体卡牌ID
 */

import { SpellType, Spell } from '../../types';
import { SPELLS } from '../../constants';

// ============ 元素类型映射 ============

/** 从卡牌ID中提取元素类型 */
export type ElementType = 'fire' | 'vine' | 'ice' | 'thunder' | 'rock' | 'neutral';

/** 元素克制关系表 */
const ELEMENT_BEATS: Record<ElementType, ElementType> = {
  fire: 'vine',
  vine: 'ice',
  ice: 'thunder',
  thunder: 'rock',
  rock: 'fire',
  neutral: 'neutral', // neutral beats nothing
};

/** 从卡牌ID提取元素类型 */
export const getElementType = (spellId: SpellType | string | null): ElementType => {
  if (!spellId) return 'neutral';
  if (spellId.startsWith('fire') || spellId.startsWith('hero_fire')) return 'fire';
  if (spellId.startsWith('vine') || spellId.startsWith('hero_vine')) return 'vine';
  if (spellId.startsWith('ice') || spellId.startsWith('hero_ice')) return 'ice';
  if (spellId.startsWith('thunder') || spellId.startsWith('hero_thunder')) return 'thunder';
  if (spellId.startsWith('rock') || spellId.startsWith('hero_rock')) return 'rock';
  // Utility spells
  if (spellId === 'healing') return 'neutral';
  if (spellId === 'aoe') return 'neutral';
  if (spellId === 'draw') return 'neutral';
  if (spellId === 'silence') return 'neutral';
  if (spellId === 'skip') return 'neutral';
  return 'neutral';
};

/** 判断 element A 是否克制 element B */
export const doesElementBeat = (a: ElementType, b: ElementType): boolean => {
  if (a === 'neutral' || b === 'neutral') return false;
  return ELEMENT_BEATS[a] === b;
};

// ============ 元素克制判定 ============

/**
 * 检查 attackerId 的元素是否克制 targetId 的元素
 * [P0 Fix] 基于元素类型判定，而非具体卡牌ID
 */
export const isElementCounter = (attackerId: SpellType, targetId: SpellType): boolean => {
  const attackerElement = getElementType(attackerId);
  const targetElement = getElementType(targetId);
  return doesElementBeat(attackerElement, targetElement);
};

/**
 * 检查 defenderId 的元素是否被 attackerId 的元素克制
 */
export const isElementWeak = (defenderId: SpellType, attackerId: SpellType): boolean => {
  return isElementCounter(attackerId, defenderId);
};

/**
 * 获取法术详情
 */
export const getSpellById = (id: SpellType): Spell => {
  return SPELLS.find(s => s.id === id) || SPELLS[0];
};

/**
 * 判断是否发生克制（暴击）
 * [P0 Fix] 使用元素类型判定，fire2 克制所有 vine 系而非仅 'vine'
 * 返回: { countered: 是否被抵消, crit: 是否暴击 }
 */
export const evaluateElementInteraction = (
  attackerSpellId: SpellType,
  targetLastSpellId: SpellType | null
): { countered: boolean; crit: boolean } => {
  if (!targetLastSpellId) {
    return { countered: false, crit: false };
  }

  const attackerElement = getElementType(attackerSpellId);
  const targetElement = getElementType(targetLastSpellId);

  // 检查是否被目标的上回合法术元素抵消（目标克制攻击者）
  const countered = doesElementBeat(targetElement, attackerElement);
  
  // 检查是否克制目标的上回合法术元素（触发暴击）
  const crit = doesElementBeat(attackerElement, targetElement);

  return { countered, crit };
};

/**
 * 获取克制某元素的元素类型
 */
export const getCounterElement = (element: ElementType): ElementType => {
  // Find which element beats the given element
  for (const [key, value] of Object.entries(ELEMENT_BEATS)) {
    if (value === element) return key as ElementType;
  }
  return 'neutral';
};

/**
 * 获取某元素克制的目标元素
 */
export const getBeatenElement = (element: ElementType): ElementType => {
  return ELEMENT_BEATS[element] || 'neutral';
};
