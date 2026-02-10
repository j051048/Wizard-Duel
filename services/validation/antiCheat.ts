/**
 * Anti-Cheat & Server Validation System
 * 
 * [P0 Fix #6] 防作弊机制 - 所有关键结算的独立校验层
 * 
 * 设计原则：
 * 1. 所有 HP 变化必须经过 validateHPChange 校验
 * 2. 出牌合法性由 validateCardPlay 独立计算（不信任客户端状态）
 * 3. 状态哈希在每次回合结束时生成，用于检测篡改
 * 4. RNG 种子校验确保客户端没有替换随机数生成器
 * 
 * 在 Supabase Edge Function 部署前，此模块在客户端独立运行作为双重校验。
 */

import { DuelState, SpellType } from '../../types';
import { getGameRNG } from '../../utils/seededRandom';
import { GAME_CONFIG } from '../../config/gameConfig';
import { SPELLS } from '../../data/spells';

const IS_DEV = import.meta.env.DEV || import.meta.env.VITE_FORCE_MOCK === 'true';

/** 校验违规的严重程度 */
export type ViolationSeverity = 'warning' | 'error' | 'critical';

export interface ValidationViolation {
  type: string;
  severity: ViolationSeverity;
  message: string;
  expected?: any;
  actual?: any;
}

/** 校验报告 */
export interface ValidationReport {
  valid: boolean;
  violations: ValidationViolation[];
  stateHash: string;
  timestamp: number;
}

/**
 * 计算游戏状态哈希
 * 包含所有关键字段，用于检测客户端状态篡改
 */
export const calculateStateHash = (state: DuelState): string => {
  const criticalFields = [
    state.playerHP,
    state.opponentHP,
    state.playerArmor,
    state.opponentArmor,
    state.playerMana,
    state.opponentMana,
    state.playerMaxMana,
    state.opponentMaxMana,
    state.roundNumber,
    state.playerHand.join(','),
    state.playerDeck.length,
    state.opponentHandSize,
    state.opponentDeck.length,
    state.playerFatigue,
    state.opponentFatigue,
    state.playerEffects.map(e => `${e.type}:${e.duration}:${e.value || 0}`).join(';'),
    state.opponentEffects.map(e => `${e.type}:${e.duration}:${e.value || 0}`).join(';'),
    state.playerMinions.length,
    state.opponentMinions.length,
    // [P0 Fix #2] 包含 RNG 状态
    state.rngState?.initialSeed ?? 'none',
    state.rngState?.callCount ?? 0,
  ].join('|');
  
  // FNV-1a 哈希（比简单移位更好的分布）
  let hash = 0x811c9dc5;
  for (let i = 0; i < criticalFields.length; i++) {
    hash ^= criticalFields.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

/**
 * [P0 Fix #6] 独立校验出牌合法性
 * 不信任客户端传入的 canAfford 结果，完全重新计算
 */
export const validateCardPlay = (
  state: DuelState,
  cardId: SpellType,
  caster: 'player' | 'opponent'
): ValidationViolation[] => {
  const violations: ValidationViolation[] = [];
  const isPlayer = caster === 'player';
  
  // 1. 卡牌存在性校验
  const spell = SPELLS.find(s => s.id === cardId);
  if (!spell) {
    violations.push({
      type: 'INVALID_CARD',
      severity: 'critical',
      message: `Card ${cardId} does not exist in SPELLS database`,
    });
    return violations;
  }
  
  // 2. 手牌持有校验
  if (cardId !== 'skip' && !cardId.startsWith('hero_')) {
    const hand = isPlayer ? state.playerHand : state.opponentHand;
    if (!hand.includes(cardId)) {
      violations.push({
        type: 'CARD_NOT_IN_HAND',
        severity: 'critical',
        message: `Card ${cardId} not in ${caster}'s hand`,
        expected: 'card in hand',
        actual: hand,
      });
    }
  }
  
  // 3. 法力值校验（独立计算费用）
  const costMod = isPlayer ? state.playerCostMod : state.opponentCostMod;
  const baseCost = spell.manaCost;
  const finalCost = Math.max(0, baseCost + costMod);
  const currentMana = isPlayer ? state.playerMana : state.opponentMana;
  
  if (currentMana < finalCost && cardId !== 'skip') {
    violations.push({
      type: 'INSUFFICIENT_MANA',
      severity: 'error',
      message: `Not enough mana: need ${finalCost}, have ${currentMana}`,
      expected: finalCost,
      actual: currentMana,
    });
  }
  
  // 4. 冻结校验
  const effects = isPlayer ? state.playerEffects : state.opponentEffects;
  if (effects.some(e => e.type === 'frozen') && cardId !== 'skip') {
    violations.push({
      type: 'FROZEN_VIOLATION',
      severity: 'error',
      message: `${caster} is frozen and cannot play cards`,
    });
  }
  
  // 5. 英雄技能重复使用校验
  if (cardId.startsWith('hero_')) {
    const alreadyUsed = isPlayer ? state.heroSkillsUsed : state.opponentHeroSkillUsed;
    if (alreadyUsed) {
      violations.push({
        type: 'HERO_SKILL_ALREADY_USED',
        severity: 'error',
        message: `${caster} already used hero skill this turn`,
      });
    }
  }
  
  return violations;
};

/**
 * [P0 Fix #6] 校验 HP 变化合理性
 * 伤害不能超过法术最大值 * 暴击系数 * 连击系数的合理范围
 */
export const validateHPChange = (
  state: DuelState,
  target: 'player' | 'opponent',
  delta: number,
  sourceSpell?: SpellType
): ValidationViolation[] => {
  const violations: ValidationViolation[] = [];
  
  // 治疗不能超过满血
  if (delta > 0) {
    const currentHP = target === 'player' ? state.playerHP : state.opponentHP;
    if (currentHP + delta > GAME_CONFIG.maxHP + 5) { // 5 点容差
      violations.push({
        type: 'OVERHEAL',
        severity: 'warning',
        message: `Heal would exceed max HP: ${currentHP} + ${delta} > ${GAME_CONFIG.maxHP}`,
      });
    }
  }
  
  // 单次伤害不能超过合理上限（最强卡 * 1.5 暴击 * 3 连击 = 10 * 1.5 * 3 = 45）
  if (delta < 0) {
    const absDamage = Math.abs(delta);
    const MAX_REASONABLE_DAMAGE = 50; // 合理上限
    if (absDamage > MAX_REASONABLE_DAMAGE) {
      violations.push({
        type: 'EXCESSIVE_DAMAGE',
        severity: 'critical',
        message: `Damage ${absDamage} exceeds reasonable maximum ${MAX_REASONABLE_DAMAGE}`,
        expected: `<= ${MAX_REASONABLE_DAMAGE}`,
        actual: absDamage,
      });
    }
  }
  
  return violations;
};

/**
 * [P0 Fix #6] RNG 完整性校验
 * 验证客户端的 RNG 状态是否与预期一致
 */
export const validateRNGIntegrity = (state: DuelState): ValidationViolation[] => {
  const violations: ValidationViolation[] = [];
  
  if (!state.rngState) {
    violations.push({
      type: 'MISSING_RNG_STATE',
      severity: 'warning',
      message: 'DuelState missing rngState - cannot verify randomness integrity',
    });
    return violations;
  }
  
  const currentRNG = getGameRNG();
  if (currentRNG.initialSeed !== state.rngState.initialSeed) {
    violations.push({
      type: 'RNG_SEED_MISMATCH',
      severity: 'critical',
      message: 'RNG seed mismatch - possible tampering',
      expected: state.rngState.initialSeed,
      actual: currentRNG.initialSeed,
    });
  }
  
  return violations;
};

/**
 * [P0 Fix #6] 完整的回合结束校验报告
 * 在每个回合结束时调用，生成完整的校验报告
 */
export const generateValidationReport = (state: DuelState): ValidationReport => {
  const violations: ValidationViolation[] = [];
  
  // HP 范围校验
  if (state.playerHP < 0 || state.playerHP > GAME_CONFIG.maxHP) {
    violations.push({
      type: 'INVALID_HP',
      severity: 'critical',
      message: `Player HP out of range: ${state.playerHP}`,
      expected: `0-${GAME_CONFIG.maxHP}`,
      actual: state.playerHP,
    });
  }
  if (state.opponentHP < 0 || state.opponentHP > GAME_CONFIG.maxHP) {
    violations.push({
      type: 'INVALID_HP',
      severity: 'critical',
      message: `Opponent HP out of range: ${state.opponentHP}`,
    });
  }
  
  // 法力值范围校验
  if (state.playerMana < 0 || state.playerMana > GAME_CONFIG.maxMana) {
    violations.push({
      type: 'INVALID_MANA',
      severity: 'error',
      message: `Player mana out of range: ${state.playerMana}`,
    });
  }
  
  // 手牌数量校验
  if (state.playerHand.length > 10) {
    violations.push({
      type: 'HAND_OVERFLOW',
      severity: 'error',
      message: `Player hand exceeds maximum: ${state.playerHand.length}/10`,
    });
  }
  
  // 随从数量校验
  if (state.playerMinions.length > 5) {
    violations.push({
      type: 'MINION_OVERFLOW',
      severity: 'error',
      message: `Player minions exceed maximum: ${state.playerMinions.length}/5`,
    });
  }
  
  // 回合数合理性
  if (state.roundNumber > 100) {
    violations.push({
      type: 'EXCESSIVE_ROUNDS',
      severity: 'warning',
      message: `Game lasted ${state.roundNumber} rounds - unusually long`,
    });
  }
  
  // RNG 完整性
  violations.push(...validateRNGIntegrity(state));
  
  // 生成哈希
  const stateHash = calculateStateHash(state);
  
  const hasCritical = violations.some(v => v.severity === 'critical');
  
  // 日志输出（开发模式详细，生产模式只输出 critical）
  if (IS_DEV && violations.length > 0) {
    console.warn('[AntiCheat] Validation report:', violations);
  } else if (hasCritical) {
    console.error('[AntiCheat] CRITICAL violations detected!', violations.filter(v => v.severity === 'critical'));
  }
  
  return {
    valid: !hasCritical,
    violations,
    stateHash,
    timestamp: Date.now(),
  };
};

/**
 * 验证状态哈希
 */
export const verifyStateHash = (
  state: DuelState,
  expectedHash: string
): { valid: boolean; reason?: string } => {
  const actualHash = calculateStateHash(state);
  if (actualHash !== expectedHash) {
    console.warn('[AntiCheat] State hash mismatch - possible tampering', {
      expected: expectedHash,
      actual: actualHash,
    });
    return { valid: false, reason: 'State hash mismatch' };
  }
  return { valid: true };
};

/**
 * 验证操作时间合理性
 * @param lastActionTime - 上次操作时间戳
 * @param currentTime - 当前时间戳
 * @returns 验证结果
 */
export const validateTiming = (
  lastActionTime: number,
  currentTime: number = Date.now()
): { valid: boolean; reason?: string } => {
  const MIN_ACTION_INTERVAL_MS = 100; // 最小操作间隔 100ms (防止脚本快速点击)
  const MAX_TURN_TIME_MS = 300000; // 最大回合时间 5分钟
  
  const elapsed = currentTime - lastActionTime;
  
  if (elapsed < MIN_ACTION_INTERVAL_MS) {
    console.warn(`[AntiCheat] Action too fast: ${elapsed}ms`);
    return { valid: false, reason: 'Action too fast - possible bot' };
  }
  
  if (elapsed > MAX_TURN_TIME_MS) {
    console.warn(`[AntiCheat] Action too slow: ${elapsed}ms`);
    return { valid: false, reason: 'Turn timeout' };
  }
  
  return { valid: true };
};

/**
 * 输入清理 - 防止注入攻击
 * @param input - 用户输入
 * @returns 清理后的输入
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // 移除潜在的危险字符
  return input
    .replace(/[<>]/g, '') // 移除 HTML 标签
    .replace(/['"]/g, '') // 移除引号
    .trim()
    .slice(0, 100); // 限制长度
};

/**
 * 验证玩家操作频率
 * 防止脚本自动化攻击
 */
export class RateLimiter {
  private actionTimestamps: number[] = [];
  private readonly maxActionsPerMinute = 60;
  
  checkRateLimit(): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // 清理1分钟前的记录
    this.actionTimestamps = this.actionTimestamps.filter(t => t > oneMinuteAgo);
    
    if (this.actionTimestamps.length >= this.maxActionsPerMinute) {
      console.warn('[AntiCheat] Rate limit exceeded');
      return { allowed: false, reason: 'Too many actions - rate limit exceeded' };
    }
    
    this.actionTimestamps.push(now);
    return { allowed: true };
  }
}
