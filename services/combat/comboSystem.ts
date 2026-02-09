/**
 * Combo System - 通用连击系统
 * 
 * [P1 Fix #11] 重构为支持多元素连击
 * 
 * 连击机制：
 * - 雷电连击：连续雷电法术 +50% 伤害/层，最多2层
 * - 火焰连击：连续火焰法术 +30% 伤害/层，最多3层
 * - 未来可扩展更多元素
 */

import { DuelState, SpellType } from '../../types';
import { getSpellById, getElementType, ElementType } from './elementSystem';

// ============ 连击配置 ============

export interface ComboConfig {
  element: ElementType;
  maxStack: number;
  bonusPerStack: number;  // 每层加成 (0.5 = +50%)
  name: string;           // 连击名称
  icon: string;           // 连击图标
}

/** 
 * [P1 Fix #11] 通用元素连击配置
 * 可在此扩展更多元素的连击规则
 */
export const COMBO_CONFIGS: ComboConfig[] = [
  { element: 'thunder', maxStack: 2, bonusPerStack: 0.5, name: '闪电连击', icon: '⚡' },
  { element: 'fire', maxStack: 3, bonusPerStack: 0.3, name: '燃烧连击', icon: '🔥' },
  { element: 'ice', maxStack: 2, bonusPerStack: 0.25, name: '冰霜连击', icon: '❄️' },
];

// ============ 连击状态 ============

export interface ComboState {
  element: ElementType;
  count: number;
}

// 获取元素的连击配置
const getComboConfig = (element: ElementType): ComboConfig | undefined => {
  return COMBO_CONFIGS.find(c => c.element === element);
};

/**
 * 检查法术是否可触发连击（排除英雄技能和跳过）
 */
export const canTriggerCombo = (spellId: string | null): boolean => {
  if (!spellId) return false;
  if (spellId === 'skip' || spellId.startsWith('hero_')) return false;
  const element = getElementType(spellId);
  return getComboConfig(element) !== undefined;
};

/**
 * 计算连击加成倍数
 * [P1 Fix #11] 通用版本，支持任意配置的元素连击
 * 
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
  element: ElementType;
} => {
  const _spell = getSpellById(spellId); // 保留以备将来使用
  const isPlayer = caster === 'player';
  const currentElement = getElementType(spellId);
  
  // 检查法术是否可触发连击
  if (!canTriggerCombo(spellId) || countered) {
    return { multiplier: 1.0, newComboCount: 0, comboMessage: null, element: 'neutral' };
  }
  
  const config = getComboConfig(currentElement);
  if (!config) {
    return { multiplier: 1.0, newComboCount: 0, comboMessage: null, element: currentElement };
  }

  const lastSpellId = isPlayer ? state.playerLastSpell : state.opponentLastSpell;
  const lastElement = getElementType(lastSpellId);
  
  // 获取当前连击数（简化：使用雷电连击计数器作为通用计数器）
  // TODO: 未来可为每个元素分别保存连击数
  const currentCombo = isPlayer ? state.playerConsecutiveThunder : state.opponentConsecutiveThunder;

  // 如果上一张牌是相同元素
  if (lastElement === currentElement && canTriggerCombo(lastSpellId)) {
    if (currentCombo < config.maxStack) {
      const newCombo = currentCombo + 1;
      const multiplier = 1 + (newCombo * config.bonusPerStack);
      const bonusPercent = Math.round(newCombo * config.bonusPerStack * 100);
      return {
        multiplier,
        newComboCount: newCombo,
        comboMessage: `${config.icon} ${config.name} x${newCombo}！伤害 +${bonusPercent}%！`,
        element: currentElement
      };
    } else {
      // 已达上限
      const multiplier = 1 + (config.maxStack * config.bonusPerStack);
      return {
        multiplier,
        newComboCount: config.maxStack,
        comboMessage: `${config.icon} ${config.name}已达上限 (x${config.maxStack})！`,
        element: currentElement
      };
    }
  }

  // 不是连续的相同元素法术，重置
  return { multiplier: 1.0, newComboCount: 0, comboMessage: null, element: currentElement };
};

/**
 * 更新连击状态
 * [P1 Fix #11] 支持任意元素的连击状态更新
 */
export const updateComboState = (
  state: DuelState,
  caster: 'player' | 'opponent',
  spellId: SpellType,
  newComboCount: number
): DuelState => {
  const isPlayer = caster === 'player';
  const element = getElementType(spellId);
  const config = getComboConfig(element);
  
  // 如果是可连击的元素
  if (config && canTriggerCombo(spellId)) {
    if (isPlayer) {
      return { ...state, playerConsecutiveThunder: newComboCount };
    } else {
      return { ...state, opponentConsecutiveThunder: newComboCount };
    }
  } else {
    // 非连击元素，重置计数
    if (isPlayer) {
      return { ...state, playerConsecutiveThunder: 0 };
    } else {
      return { ...state, opponentConsecutiveThunder: 0 };
    }
  }
};

// ============ 兼容旧代码 ============

/** @deprecated 使用 canTriggerCombo 替代 */
export const isThunderSpell = (spellId: string | null): boolean => {
  return spellId !== null && spellId.startsWith('thunder') && !spellId.startsWith('hero_');
};
