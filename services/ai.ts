/**
 * Wizard Duel - AI 决策引擎 v2
 *
 * [Phase C] 统一决策引擎 + 4级难度 + 前瞻搜索
 */

import { DuelState, SpellType, GameCommand } from '../types';
import { getSpellById, canAffordSpell, executeSpell, checkGameOver } from './gameLogic';
import { cloneDuelState } from './stateUtils';
import { getElementType, doesElementBeat } from './combat/elementSystem';
import { getGameRNG } from '../utils/seededRandom';
import type { Minion } from '../types';

// ============ [Phase C-1] 难度配置 ============

export interface AIDifficultyConfig {
  /** 前瞻深度: 0=贪心, 1=看一步, 2=看两步 */
  searchDepth: number;
  /** 随机性 0-1, 越高越随机 */
  randomness: number;
  /** 是否理解组合技 */
  comboAware: boolean;
  /** 是否计算斩杀 */
  lethalCheck: boolean;
  /** 是否克制选牌 */
  elementCounter: boolean;
  /** 是否评估随从威胁 */
  minionThreatEval: boolean;
  /** 随从召唤偏好 0-1 */
  summonPreference: number;
  /** [Phase G-1] AI 性格偏好 */
  personality?: AIPersonality;
}

// ============ [Phase G-1] AI 性格系统 ============

export interface AIPersonality {
  /** 攻击性 0-1: 越高越倾向攻击 */
  aggression: number;
  /** 冒险程度 0-1: 越高越倾向高费大牌 */
  riskTolerance: number;
  /** 随从偏好 0-1: 越高越倾向召唤随从 */
  minionPreference: number;
  /** 组合偏好 0-1: 越高越倾向组合技 */
  comboFocus: number;
}

export const AI_DIFFICULTY_PRESETS: Record<string, AIDifficultyConfig> = {
  beginner: {
    searchDepth: 0,
    randomness: 0.5,
    comboAware: false,
    lethalCheck: false,
    elementCounter: false,
    minionThreatEval: false,
    summonPreference: 0.3,
    personality: { aggression: 0.3, riskTolerance: 0.3, minionPreference: 0.3, comboFocus: 0.1 },
  },
  normal: {
    searchDepth: 0,
    randomness: 0.2,
    comboAware: true,
    lethalCheck: true,
    elementCounter: true,
    minionThreatEval: true,
    summonPreference: 0.5,
    personality: { aggression: 0.5, riskTolerance: 0.5, minionPreference: 0.5, comboFocus: 0.4 },
  },
  expert: {
    searchDepth: 1,
    randomness: 0.05,
    comboAware: true,
    lethalCheck: true,
    elementCounter: true,
    minionThreatEval: true,
    summonPreference: 0.7,
    personality: { aggression: 0.7, riskTolerance: 0.6, minionPreference: 0.6, comboFocus: 0.7 },
  },
  master: {
    searchDepth: 2,
    randomness: 0,
    comboAware: true,
    lethalCheck: true,
    elementCounter: true,
    minionThreatEval: true,
    summonPreference: 0.9,
    personality: { aggression: 0.8, riskTolerance: 0.8, minionPreference: 0.7, comboFocus: 0.9 },
  },
};

// [Phase G-2] Boss 专属 AI 配置
export const BOSS_AI_CONFIGS: Record<string, AIDifficultyConfig> = {
  fire_lord: {
    ...AI_DIFFICULTY_PRESETS.expert,
    personality: { aggression: 1.0, riskTolerance: 0.9, minionPreference: 0.3, comboFocus: 0.8 },
  },
  frost_witch: {
    ...AI_DIFFICULTY_PRESETS.expert,
    personality: { aggression: 0.3, riskTolerance: 0.4, minionPreference: 0.6, comboFocus: 0.9 },
  },
  rock_guardian: {
    ...AI_DIFFICULTY_PRESETS.expert,
    personality: { aggression: 0.5, riskTolerance: 0.3, minionPreference: 0.8, comboFocus: 0.5 },
  },
};

// ============ [Phase C-2] 状态评估 ============

/**
 * 评估当前状态对 caster 的有利程度
 * 分数越高对 caster 越有利
 */
export const evaluateStateScore = (state: DuelState, caster: 'player' | 'opponent'): number => {
  const isOpponent = caster === 'opponent';
  const myHP     = isOpponent ? state.opponentHP : state.playerHP;
  const myArmor  = isOpponent ? state.opponentArmor : state.playerArmor;
  const foeHP    = isOpponent ? state.playerHP : state.opponentHP;
  const foeArmor = isOpponent ? state.playerArmor : state.opponentArmor;
  const myHand  = (isOpponent ? state.opponentHand : state.playerHand).length;
  const foeHand = (isOpponent ? state.playerHand : state.opponentHand).length;
  const myMinions  = isOpponent ? state.opponentMinions : state.playerMinions;
  const foeMinions = isOpponent ? state.playerMinions : state.opponentMinions;

  let score = 0;

  // HP/Armor advantage (weighted heavily)
  score += (myHP + myArmor * 0.8) * 2;
  score -= (foeHP + foeArmor * 0.8) * 2;

  // Lethal bonus
  if (foeHP + foeArmor <= 0) score += 1000;
  if (myHP <= 0) score -= 1000;

  // Hand advantage
  score += myHand * 1.5;
  score -= foeHand * 1.5;

  // Minion advantage
  for (const m of myMinions) {
    score += m.atk * 2 + m.hp;
    if (m.keywords?.includes('taunt')) score += 3;
    if (m.hasShield) score += 2;
  }
  for (const m of foeMinions) {
    score -= m.atk * 2 + m.hp;
    if (m.keywords?.includes('taunt')) score -= 3;
    if (m.hasShield) score -= 2;
  }

  return score;
};

// ============ [Phase C-2] 模拟对手回应 ============

/**
 * 模拟对手在给定状态下用 pickBestSpellForAI(normal) 做一次最优回应
 * 仅用于前瞻搜索（Expert/Master），不修改原状态
 */
export const simulateOpponentResponse = (state: DuelState): DuelState => {
  let sim = cloneDuelState(state);
  const maxActions = 5;
  let actions = 0;

  while (actions < maxActions) {
    const spellId = pickBestSpellForAI(sim, new Set(), AI_DIFFICULTY_PRESETS.normal);
    if (!spellId) break;

    const result = executeSpell(sim, 'opponent', spellId);
    const manaChanged = result.newState.opponentMana !== sim.opponentMana;
    const handChanged = result.newState.opponentHandSize !== sim.opponentHandSize;

    if (!manaChanged && !handChanged && result.logs.length === 0) break;

    sim = result.newState;
    actions++;
    if (checkGameOver(sim)) break;
  }

  return sim;
};

// ============ 随从威胁评估 ============

/**
 * 评估随从威胁度
 * [Phase C-1] 使用 keywords 数组替代 type 字符串匹配
 */
export const evaluateMinionThreat = (minion: Minion, _gameState: DuelState): number => {
  let threat = 0;

  // 基础威胁 = 攻击力 * 2 + 生命值
  threat += minion.atk * 2;
  threat += minion.hp;

  // [Phase C-1] 使用 keywords 数组
  const kw = minion.keywords || [];
  if (kw.includes('taunt'))        threat += 15;
  if (kw.includes('poison'))       threat += 20;
  if (kw.includes('divine_shield')) threat += 10;
  if (kw.includes('windfury'))     threat += minion.atk;
  if (kw.includes('lifesteal'))    threat += 8;

  return threat;
};

/**
 * 选择随从攻击目标
 * 优先攻击高威胁度的随从（必须先打嘲讽）
 */
export const selectMinionTarget = (
  _attacker: Minion,
  targets: Minion[],
  gameState: DuelState
): Minion | null => {
  if (targets.length === 0) return null;

  // [Phase C-1] 使用 keywords
  const taunters = targets.filter(t => (t.keywords || []).includes('taunt'));
  const pool = taunters.length > 0 ? taunters : targets;

  return [...pool].sort((a, b) =>
    evaluateMinionThreat(b, gameState) - evaluateMinionThreat(a, gameState)
  )[0];
};

// ============ [Phase C-1] 统一决策引擎 ============

/**
 * AI 选择最佳卡牌
 * [Phase C-1] 接受 AIDifficultyConfig，根据配置启用/禁用决策步骤
 */
export const pickBestSpellForAI = (
  state: DuelState,
  excludeSpells: Set<string> = new Set(),
  config: AIDifficultyConfig = AI_DIFFICULTY_PRESETS.normal
): SpellType | null => {
  // 冻结检查
  if (state.opponentEffects.some(e => e.type === 'frozen')) return null;

  const availableInHand = state.opponentHand.filter(s => !excludeSpells.has(s));
  const affordable = availableInHand.filter(s =>
    canAffordSpell(s, state.opponentMana, state.opponentEffects, state.opponentCostMod).canAfford
  );

  if (affordable.length === 0) return null;

  // --- Step 1: Hero skill ---
  if (!state.opponentHeroSkillUsed) {
    const heroSkills: SpellType[] = ['hero_fire', 'hero_vine', 'hero_ice', 'hero_thunder', 'hero_rock'];
    const elementCounts: Record<string, number> = {};
    state.opponentHand.forEach(cardId => {
      const el = cardId.split(/\d/)[0];
      elementCounts[el] = (elementCounts[el] || 0) + 1;
    });

    const sortedHeroSkills = heroSkills
      .filter(h => !excludeSpells.has(h))
      .sort((a, b) => {
        const elA = a.replace('hero_', '');
        const elB = b.replace('hero_', '');
        return (elementCounts[elB] || 0) - (elementCounts[elA] || 0);
      });

    for (const heroSkillId of sortedHeroSkills) {
      if (canAffordSpell(heroSkillId, state.opponentMana, state.opponentEffects, state.opponentCostMod).canAfford) {
        return heroSkillId;
      }
    }
  }

  // --- Step 2: Lethal check ---
  if (config.lethalCheck) {
    const killShot = affordable.find(s => {
      const spell = getSpellById(s);
      return spell.damage >= state.playerHP + state.playerArmor;
    });
    if (killShot) return killShot;
  }

  // --- Step 3: Low HP defense ---
  if (state.opponentHP <= 10) {
    const healSpell = affordable.find(s => getSpellById(s).mechanic === 'heal');
    if (healSpell) return healSpell;

    const armorSpell = affordable.find(s => (getSpellById(s).armorGain || 0) >= 3);
    if (armorSpell) return armorSpell;
  }

  // --- Step 4: Thunder combo ---
  if (config.comboAware &&
      state.opponentLastSpell &&
      state.opponentLastSpell.startsWith('thunder') &&
      !state.opponentLastSpell.startsWith('hero_')) {
    const thunderSpells = affordable.filter(s => s.startsWith('thunder') && !s.startsWith('hero_'));
    if (thunderSpells.length > 0) {
      thunderSpells.sort((a, b) => getSpellById(b).damage - getSpellById(a).damage);
      return thunderSpells[0];
    }
  }

  // --- Step 5: Element counter ---
  if (config.elementCounter && state.playerLastSpell) {
    const targetElement = getElementType(state.playerLastSpell);
    const counterSpell = affordable.find(s => {
      const attackerElement = getElementType(s);
      return doesElementBeat(attackerElement, targetElement) && getSpellById(s).damage > 0;
    });
    if (counterSpell) return counterSpell;
  }

  // --- Step 6: Ranked damage + lookahead (with personality bias) ---
  const personality = config.personality;
  const damageSpells = affordable.filter(s => {
    const spell = getSpellById(s);
    if (spell.damage <= 0) return false;
    // [Phase G-1] Personality filter: minion-preferring AI skips pure damage when summon available
    if (personality && personality.minionPreference > 0.7 && spell.mechanic === 'summon') return true;
    return true;
  });

  // Also consider summon spells if personality favors them
  const summonSpells = affordable.filter(s => {
    const spell = getSpellById(s);
    return spell.mechanic === 'summon' || spell.mechanic === 'charge' || spell.mechanic === 'divine_shield';
  });

  const candidateSpells = [...damageSpells];
  // [Phase G-1] Inject summon spells for minion-focused AI
  if (personality && personality.minionPreference > 0.5 && summonSpells.length > 0) {
    for (const s of summonSpells) {
      if (!candidateSpells.includes(s)) candidateSpells.push(s);
    }
  }

  if (candidateSpells.length > 0) {
    // [Phase G-1] Personality-biased scoring
    candidateSpells.sort((a, b) => {
      const spellA = getSpellById(a);
      const spellB = getSpellById(b);

      let scoreA = spellA.damage / Math.max(1, spellA.manaCost);
      let scoreB = spellB.damage / Math.max(1, spellB.manaCost);

      if (personality) {
        // Aggression: boost high-damage spells
        scoreA += (spellA.damage / 10) * personality.aggression;
        scoreB += (spellB.damage / 10) * personality.aggression;

        // Risk tolerance: boost expensive spells
        scoreA += (spellA.manaCost / 10) * personality.riskTolerance;
        scoreB += (spellB.manaCost / 10) * personality.riskTolerance;

        // Minion preference: boost summon spells
        const isSummonA = ['summon', 'charge', 'divine_shield', 'deathrattle', 'aura'].includes(spellA.mechanic);
        const isSummonB = ['summon', 'charge', 'divine_shield', 'deathrattle', 'aura'].includes(spellB.mechanic);
        if (isSummonA) scoreA += personality.minionPreference * 2;
        if (isSummonB) scoreB += personality.minionPreference * 2;

        // Combo focus: boost thunder spells when combo-aware
        if (config.comboAware) {
          if (a.startsWith('thunder')) scoreA += personality.comboFocus * 1.5;
          if (b.startsWith('thunder')) scoreB += personality.comboFocus * 1.5;
        }
      }

      return scoreB - scoreA;
    });

    // [Phase C-2] Lookahead evaluation for expert/master
    if (config.searchDepth >= 1) {
      let bestSpell: SpellType = candidateSpells[0];
      let bestScore = -Infinity;

      for (const spellId of candidateSpells.slice(0, Math.min(5, candidateSpells.length))) {
        const simResult = executeSpell(cloneDuelState(state), 'opponent', spellId);
        const afterOpponentResponse = simulateOpponentResponse(simResult.newState);
        const score = evaluateStateScore(afterOpponentResponse, 'opponent');

        if (score > bestScore) {
          bestScore = score;
          bestSpell = spellId;
        }
      }
      return bestSpell;
    }

    // Normal/beginner: pick from top N with randomness
    const poolSize = config.randomness > 0.3
      ? Math.min(candidateSpells.length, 5)
      : Math.min(3, candidateSpells.length);
    const topChoices = candidateSpells.slice(0, poolSize);
    return getGameRNG().pick(topChoices);
  }

  // --- Step 7: Fallback random ---
  return getGameRNG().pick(affordable);
};

// ============ AI 回合执行 ============

/**
 * 执行 AI 回合
 * [Phase C-1] 接受可选的 AIDifficultyConfig
 */
export const executeAITurn = (
  state: DuelState,
  config: AIDifficultyConfig = AI_DIFFICULTY_PRESETS.normal
): {
  newState: DuelState,
  logs: string[],
  commands: GameCommand[]
} => {
  let currentState: DuelState = cloneDuelState(state);
  const logs: string[] = [];
  const commands: GameCommand[] = [];

  // 冻结检查
  const isFrozen = currentState.opponentEffects.some(e => e.type === 'frozen');
  if (isFrozen) {
    const freezeCmd: GameCommand = {
      id: 'ai_freeze',
      caster: 'opponent',
      actions: [{ type: 'MESSAGE', target: 'system', description: '❄️ 对手被彻底冻结，无法行动！' }]
    };
    logs.push('❄️ 对手被彻底冻结，无法行动！');
    return { newState: currentState, logs, commands: [freezeCmd] };
  }

  let cardsPlayed = 0;
  const maxCards = currentState.opponentHandSize;
  const playedThisTurn = new Set<string>();
  const MAX_ACTIONS = 20;
  let actionCount = 0;

  while (cardsPlayed < maxCards && currentState.opponentMana >= 0 && actionCount < MAX_ACTIONS) {
    actionCount++;
    const spellId = pickBestSpellForAI(currentState, playedThisTurn, config);
    if (!spellId) break;

    playedThisTurn.add(spellId);
    const result = executeSpell(currentState, 'opponent', spellId);

    const manaChanged = result.newState.opponentMana !== currentState.opponentMana;
    const handChanged = result.newState.opponentHandSize !== currentState.opponentHandSize;

    if (!manaChanged && !handChanged && result.logs.length === 0) break;

    currentState = result.newState;
    logs.push(...result.logs);
    commands.push(result.command);
    cardsPlayed++;

    const gameOver = checkGameOver(currentState);
    if (gameOver) break;
  }

  if (actionCount >= MAX_ACTIONS) {
    logs.push('⚠️ AI 行动次数达到上限');
  }

  return { newState: currentState, logs, commands };
};

