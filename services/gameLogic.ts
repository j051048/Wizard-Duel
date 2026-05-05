/**
 * Wizard Duel - 游戏逻辑引擎
 * 
 * 核心战斗系统：支持法力消耗、状态效果、Draft机制、回合制多卡连击逻辑
 * 
 * [Phase 2] 模块化重构：
 * - 机制定义 -> services/mechanics.ts
 * - AI 逻辑 -> services/ai.ts
 * - 状态工具 -> services/stateUtils.ts
 * 
 * [Phase 3] 战斗系统模块化：
 * - 元素相克 -> services/combat/elementSystem.ts
 * - 伤害计算 -> services/combat/damageCalculation.ts
 * - 连击系统 -> services/combat/comboSystem.ts
 * - 回合管理 -> services/combat/turnManager.ts
 */

import {
  DuelState, SpellType, Spell, GameMode, StatusEffect, AIProfile, GameCommand, GameAction, GameTrigger, TriggerTiming
} from '../types.ts';
import type { SpellTarget } from '../types/card';
import { 
  SPELLS, GAME_CONFIG, createDeck, getCardsForMode,
  CRIT_CHANCE, WIN_MULTIPLIER, CRIT_MULTIPLIER, shuffleArray, getMechanicName,
  MINION_DATA
} from '../constants.ts';
import { GameSequenceExecutor } from './sequence';
import { getMechanicHandler, MECHANIC_DEFINITIONS } from './mechanics';
import { cloneDuelState } from './stateUtils';
import { SeededRNG, resetGameRNG, getGameRNG } from '../utils/seededRandom';
import { AI_DECK_TEMPLATES } from '../data/aiDecks';

// [Phase 2] 重新导出 AI 模块，保持向后兼容
export { executeAITurn, pickBestSpellForAI } from './ai';

// [Phase 3] 重新导出战斗模块，保持向后兼容
export {
  getSpellById,
  evaluateElementInteraction,
  calculateSpellDamage,
  calculateSpellCost,
  calculateComboBonus,
  updateComboState,
  checkGameOver,
  recalculateCostMod
} from './combat';

// [P0 Fix #1] 导入元素系统函数，替代 require()
import { getElementType, doesElementBeat } from './combat/elementSystem';


// ============ 抽牌逻辑 ============

export const drawCard = (deck: SpellType[], hand: SpellType[], fatigue: number = 0): { 
  newDeck: SpellType[], 
  newHand: SpellType[], 
  drawnCard: SpellType | null,
  fatigueDamage: number,
  newFatigue: number
} => {
  if (deck.length === 0) {
    const nextFatigue = fatigue + 1;
    return { 
      newDeck: deck, 
      newHand: hand, 
      drawnCard: null, 
      fatigueDamage: nextFatigue, 
      newFatigue: nextFatigue 
    };
  }
  const drawnCard = deck[0];
  const newDeck = deck.slice(1);
  const newHand = [...hand, drawnCard].slice(0, 10); // 手牌上限10
  return { 
    newDeck, 
    newHand, 
    drawnCard, 
    fatigueDamage: 0, 
    newFatigue: fatigue 
  };
};

// ============ 初始化对战状态 ============

export const createInitialDuelState = (playerDeck: SpellType[], gameMode: GameMode = 'standard', seed?: number): DuelState => {
  // [P0 Fix #2] 使用确定性 RNG
  const rng = resetGameRNG(seed);
  
  // 初始手牌: 从牌组抽5张（使用确定性洗牌）
  const shuffledDeck = rng.shuffle(playerDeck);
  const playerHand = shuffledDeck.slice(0, 5);
  const remainingDeck = shuffledDeck.slice(5);
  
  // 为对手创建基于游戏模式的牌组
  const availableSpells = getCardsForMode(gameMode);
  const opponentDeck = createDeck(availableSpells.map(s => s.id));
  const shuffledOpponentDeck = rng.shuffle(opponentDeck);
  
  return {
    playerHP: GAME_CONFIG.maxHP,
    playerArmor: 0, 
    opponentHP: GAME_CONFIG.maxHP,
    opponentArmor: 0,
    
    playerMana: GAME_CONFIG.startingMana,
    playerMaxMana: GAME_CONFIG.startingMana,
    opponentMana: GAME_CONFIG.startingMana,
    opponentMaxMana: GAME_CONFIG.startingMana,
    
    playerLastSpell: null,
    opponentLastSpell: null,
    playerCostMod: 0,
    opponentCostMod: 0,
    playerConsecutiveThunder: 0,
    opponentConsecutiveThunder: 0,
    
    roundNumber: 0, 
    playerFatigue: 0,
    opponentFatigue: 0,
    playerHand,
    playerDeck: remainingDeck,
        opponentHand: shuffledOpponentDeck.slice(0, 5),
    opponentHandSize: 5,
    opponentDeck: shuffledOpponentDeck.slice(5),
    
    playerEffects: [],
    opponentEffects: [],
    playerMinions: [],
    opponentMinions: [],

    heroSkillsUsed: false,
    opponentHeroSkillUsed: false,
    playerTriggers: [],
    opponentTriggers: [],
    isTutorial: false,
    
    // [P0 Fix #2] 保存 RNG 状态用于断线重连
    rngState: rng.serialize(),
    // [P0 Fix #1] 触发器入场计数器
    triggerOrderCounter: 0,
  };
};

/**
 * [PvP P0] 创建 PvP 对战初始状态
 * 
 * 关键：双方使用相同的 seed + 相同的两副牌组，
 * 并以固定顺序洗牌（先 P1 牌组、后 P2 牌组），
 * 确保无论哪一方调用，生成的状态都完全一致。
 * role 参数仅决定哪副牌是"我的"、哪副是"对手的"。
 */
export const createPvpDuelState = (
  p1Deck: SpellType[],
  p2Deck: SpellType[],
  seed: number,
  role: 'player1' | 'player2'
): DuelState => {
  const rng = resetGameRNG(seed);

  // 固定顺序洗牌：先洗 P1、后洗 P2，确保双方 RNG 序列一致
  const shuffledP1Deck = rng.shuffle([...p1Deck]);
  const shuffledP2Deck = rng.shuffle([...p2Deck]);

  const p1Hand = shuffledP1Deck.slice(0, 5);
  const p1Remaining = shuffledP1Deck.slice(5);
  const p2Hand = shuffledP2Deck.slice(0, 5);
  const p2Remaining = shuffledP2Deck.slice(5);

  // 根据角色分配视角
  const isP1 = role === 'player1';

  return {
    playerHP: GAME_CONFIG.maxHP,
    playerArmor: 0,
    opponentHP: GAME_CONFIG.maxHP,
    opponentArmor: 0,

    playerMana: GAME_CONFIG.startingMana,
    playerMaxMana: GAME_CONFIG.startingMana,
    opponentMana: GAME_CONFIG.startingMana,
    opponentMaxMana: GAME_CONFIG.startingMana,

    playerLastSpell: null,
    opponentLastSpell: null,
    playerCostMod: 0,
    opponentCostMod: 0,
    playerConsecutiveThunder: 0,
    opponentConsecutiveThunder: 0,

    roundNumber: 0,
    playerFatigue: 0,
    opponentFatigue: 0,

    playerHand: isP1 ? p1Hand : p2Hand,
    playerDeck: isP1 ? p1Remaining : p2Remaining,
    opponentHand: isP1 ? p2Hand : p1Hand,
    opponentHandSize: 5,
    opponentDeck: isP1 ? p2Remaining : p1Remaining,

    playerEffects: [],
    opponentEffects: [],
    playerMinions: [],
    opponentMinions: [],

    heroSkillsUsed: false,
    opponentHeroSkillUsed: false,
    playerTriggers: [],
    opponentTriggers: [],
    isTutorial: false,

    rngState: rng.serialize(),
    triggerOrderCounter: 0,
  };
};

/**
 * [P1 Fix #13] 给后手玩家发放幸运币
 * 后手方额外获得1张牌 + 1张幸运币
 */
export const applyLuckCoin = (state: DuelState, secondPlayer: 'player' | 'opponent'): DuelState => {
  const newState = { ...state };
  if (secondPlayer === 'player') {
    // 玩家后手：多抽1张 + 获得幸运币
    if (newState.playerDeck.length > 0) {
      const extraCard = newState.playerDeck[0];
      newState.playerDeck = newState.playerDeck.slice(1);
      newState.playerHand = [...newState.playerHand, extraCard];
    }
    newState.playerHand = [...newState.playerHand, 'luck_coin' as SpellType];
  } else {
    // 对手后手
    if (newState.opponentDeck.length > 0) {
      const extraCard = newState.opponentDeck[0];
      newState.opponentDeck = newState.opponentDeck.slice(1);
      newState.opponentHand = [...newState.opponentHand, extraCard];
      newState.opponentHandSize = newState.opponentHand.length;
    }
    newState.opponentHand = [...newState.opponentHand, 'luck_coin' as SpellType];
    newState.opponentHandSize = newState.opponentHand.length;
  }
  return newState;
};

// ============ 辅助逻辑 ============
// recalculateCostMod 已迁移到 services/combat/turnManager.ts

// ============ 法力检查 ============

import { 
  getSpellById, 
  calculateSpellCost 
} from './combat';

export const canAffordSpell = (
  spellId: SpellType, 
  mana: number, 
  effects: StatusEffect[],
  costMod: number = 0
): { canAfford: boolean; reason?: string } => {
  // 1. 冻结检查
  const isFrozen = effects.some(e => e.type === 'frozen');
  if (isFrozen) {
    return { canAfford: false, reason: '❄️ 你被冻结了，无法行动！' };
  }

  const finalCost = calculateSpellCost(spellId, costMod);
  
  if (mana < finalCost) {
    return { canAfford: false, reason: `法力不足 (需要 ${finalCost}, 当前 ${mana})` };
  }
  return { canAfford: true };
};

export const getPlayableCards = (
  hand: SpellType[], 
  mana: number, 
  effects: StatusEffect[],
  costMod: number = 0
): SpellType[] => {
  return hand.filter(spellId => canAffordSpell(spellId, mana, effects, costMod).canAfford);
};

// [Phase 2] MECHANIC_DEFINITIONS 已迁移到 services/mechanics.ts

// ============ 战斗辅助函数 (BattleLogic 解耦) ============

/**
 * 获取施法者状态值的辅助函数集合
 * 解决频繁出现的 `isPlayer ? state.playerXXX : state.opponentXXX` 模式
 */
const getCasterValue = {
  effects: (state: DuelState, isPlayer: boolean): StatusEffect[] => 
    isPlayer ? state.playerEffects : state.opponentEffects,
  
  hand: (state: DuelState, isPlayer: boolean): SpellType[] => 
    isPlayer ? state.playerHand : state.opponentHand,
  
  lastSpell: (state: DuelState, isPlayer: boolean): SpellType | null => 
    isPlayer ? state.playerLastSpell : state.opponentLastSpell,
  
  costMod: (state: DuelState, isPlayer: boolean): number => 
    isPlayer ? state.playerCostMod : state.opponentCostMod,
  
  heroSkillUsed: (state: DuelState, isPlayer: boolean): boolean =>
    isPlayer ? (state.heroSkillsUsed ?? false) : (state.opponentHeroSkillUsed ?? false),
  
  deck: (state: DuelState, isPlayer: boolean): SpellType[] => 
    isPlayer ? state.playerDeck : state.opponentDeck,
};

/**
 * 获取目标状态值的辅助函数集合
 * 目标 = 施法者的对手
 */
const getTargetValue = {
  lastSpell: (state: DuelState, isPlayer: boolean): SpellType | null => 
    isPlayer ? state.opponentLastSpell : state.playerLastSpell,
  
  effects: (state: DuelState, isPlayer: boolean): StatusEffect[] => 
    isPlayer ? state.opponentEffects : state.playerEffects,
};

/**
 * 设置施法者状态值的辅助函数集合
 * 封装状态修改逻辑，确保对手手牌大小同步更新
 */
const setCasterValue = {
  effects: (state: DuelState, isPlayer: boolean, value: StatusEffect[]): void => {
    if (isPlayer) state.playerEffects = value;
    else state.opponentEffects = value;
  },
  
  hand: (state: DuelState, isPlayer: boolean, value: SpellType[]): void => {
    if (isPlayer) state.playerHand = value;
    else { state.opponentHand = value; state.opponentHandSize = value.length; }
  },
  
  lastSpell: (state: DuelState, isPlayer: boolean, value: SpellType | null): void => {
    if (isPlayer) state.playerLastSpell = value;
    else state.opponentLastSpell = value;
  },
  
  costMod: (state: DuelState, isPlayer: boolean, value: number): void => {
    if (isPlayer) state.playerCostMod = value;
    else state.opponentCostMod = value;
  },
  
  heroSkillUsed: (state: DuelState, isPlayer: boolean, value: boolean): void => {
    if (isPlayer) state.heroSkillsUsed = value;
    else state.opponentHeroSkillUsed = value;
  },
};

/**
 * 检查施法者是否被冻结
 */
const isCasterFrozen = (state: DuelState, isPlayer: boolean): boolean => 
  getCasterValue.effects(state, isPlayer).some(e => e.type === 'frozen');

/**
 * 检查施法者是否持有指定卡牌
 */
const casterHasCard = (state: DuelState, isPlayer: boolean, spellId: SpellType): boolean => 
  getCasterValue.hand(state, isPlayer).includes(spellId);

/**
 * 从施法者手牌中移除指定卡牌（首次出现）
 */
const removeCardFromCasterHand = (state: DuelState, isPlayer: boolean, spellId: SpellType): void => {
  const hand = getCasterValue.hand(state, isPlayer);
  const idx = hand.indexOf(spellId);
  if (idx !== -1) {
    setCasterValue.hand(state, isPlayer, hand.filter((_, i) => i !== idx));
  }
};

// ============ 单卡执行逻辑 (完全重构) ============

import { 
  evaluateElementInteraction,
  calculateComboBonus,
  updateComboState
} from './combat';

// [P3-1] 秘密触发器工厂
const createSecretTrigger = (
  spellId: SpellType,
  owner: 'player' | 'opponent',
  orderCounter: number
): GameTrigger | null => {
  const secretConfigs: Record<string, { timing: TriggerTiming; actions: (ctx?: any) => GameAction[] }> = {
    secret_fire: {
      timing: 'ON_OPPONENT_PLAY',
      actions: () => [{ type: 'HP_CHANGE', target: owner === 'player' ? 'opponent' : 'player', value: -3, description: '🔥 火焰陷阱触发！造成 3 点伤害' }],
    },
    secret_ice: {
      timing: 'ON_OPPONENT_PLAY',
      actions: () => [{ type: 'ADD_EFFECT', target: owner === 'player' ? 'opponent' : 'player', value: { type: 'frozen', duration: 1 }, description: '❄️ 冰霜陷阱触发！对手被冻结' }],
    },
    secret_thunder: {
      timing: 'ON_OPPONENT_PLAY',
      actions: (ctx) => {
        // Only trigger if opponent's spell costs >= 4
        if (ctx?.spellCost >= 4) {
          return [
            { type: 'DRAW_CARD', target: owner, description: '⚡ 雷电陷阱触发！抽 2 张牌' },
            { type: 'DRAW_CARD', target: owner },
          ];
        }
        return [];
      },
    },
    secret_vine: {
      timing: 'ON_DAMAGE',
      actions: () => [{ type: 'HP_CHANGE', target: owner, value: 4, description: '🌿 荆棘陷阱触发！恢复 4 点生命值' }],
    },
    secret_rock: {
      timing: 'ON_OPPONENT_PLAY',
      actions: () => [{ type: 'ARMOR_CHANGE', target: owner, value: 5, description: '🪨 岩石陷阱触发！获得 5 点护甲' }],
    },
  };

  const config = secretConfigs[spellId];
  if (!config) return null;

  return {
    id: `secret_${spellId}_${Date.now()}`,
    timing: config.timing,
    createdAt: orderCounter,
    owner,
    isOnce: true,
    condition: spellId === 'secret_thunder'
      ? (_state, ctx) => (ctx?.spellCost ?? 0) >= 4
      : undefined,
    action: (_state, ctx) => config.actions(ctx),
  };
};

export const executeSpell = (
  state: Readonly<DuelState>,
  caster: 'player' | 'opponent',
  spellId: SpellType,
  options?: { skipHandCheck?: boolean }
): { newState: DuelState, logs: string[], command: GameCommand } => {
  const spell = getSpellById(spellId);
  const isPlayer = caster === 'player';
  const target = isPlayer ? 'opponent' : 'player';
  
  // [P0 Bug 2 Fix] 冻结检查移至最顶层 — 在任何状态拷贝和逻辑之前
  // 确保英雄技能、普通卡牌、skip 以外的所有行为都无法绕过冻结
  if (isCasterFrozen(state, isPlayer) && spellId !== 'skip') {
    return { 
        newState: state as DuelState, 
        logs: [`❄️ ${isPlayer ? '你' : '对手'}被冻结，无法行动！`], 
        command: { id: 'frozen', caster, actions: [] } 
    };
  }

  const actions: GameAction[] = [];
  
  // [P0 Fix] 深拷贝状态，避免直接修改传入的 state（状态不可变性）
  const mutableState: DuelState = cloneDuelState(state);

  // 2. 英雄技能占用逻辑
  if (spellId.startsWith('hero_')) {
    if (getCasterValue.heroSkillUsed(mutableState, isPlayer)) {
      return { 
          newState: state as DuelState, 
          logs: [`${isPlayer ? '玩家' : '对手'}本回合已使用过英雄技能`], 
          command: { id: 'fail', caster, actions: [] } 
      };
    }
    // [P0 Fix] 修改的是拷贝后的状态，不影响原始 state
    setCasterValue.heroSkillUsed(mutableState, isPlayer, true);
  } else if (spellId !== 'skip') {
    // [P0 Critical Fix] 手牌持有校验 - 防止双重触发导致的超额扣费
    // 只有当卡牌确实在手牌中时才执行扣费和效果
    // PVP 模式下对手手牌信息不可见，通过 skipHandCheck 跳过校验
    if (!options?.skipHandCheck && !casterHasCard(mutableState, isPlayer, spellId)) {
        // 卡牌不在手牌中，可能是重复点击或延迟导致的
        // 默默失败或返回无操作，不扣费
        return {
            newState: state as DuelState,
            logs: [], // 不记录日志，以免刷屏
            command: { id: 'noop', caster, actions: [] }
        };
    }
  }

  // 3. 费用计算与扣除
  const costMod = getCasterValue.costMod(state, isPlayer);
  const finalCost = calculateSpellCost(spellId, costMod);
  actions.push({ type: 'MANA_CHANGE', target: caster, value: -finalCost });

  // [Fix] 消耗缠绕效果 (Tangle) - 机制设计为"下一张牌"费用增加，因此生效一次后需移除
  if (spell.id !== 'skip' && costMod > 0) {
      const currentEffects = getCasterValue.effects(mutableState, isPlayer);
      const tangleEffect = currentEffects.find(e => e.type === 'tangle');
      
      // 如果存在缠绕效果，且持续时间较短（<=2，代表单次生效），则移除它
      if (tangleEffect && tangleEffect.duration <= 2) {
          actions.push({ 
              type: 'REMOVE_EFFECT', 
              target: caster, 
              subType: 'tangle',
              description: '🌿 挣脱缠绕' 
          });
          
          // 同步移除 mutableState 中的状态，确保后续逻辑（如连击判定）状态一致
          setCasterValue.effects(mutableState, isPlayer, currentEffects.filter(e => e.type !== 'tangle'));
          setCasterValue.costMod(mutableState, isPlayer, 0);
      }
  }

  // [P0 Fix] 立即从拷贝的状态中移除手牌，确保后续所有中间状态都包含此更动
  if (spell.id !== 'skip') {
    // 英雄技能不从手牌移除
    if (!spellId.startsWith('hero_')) {
      removeCardFromCasterHand(mutableState, isPlayer, spellId);
    }
    setCasterValue.lastSpell(mutableState, isPlayer, spellId);
  }

  if (spell.id === 'skip') {
      const skipCmd: GameCommand = { id: 'skip', caster, actions: [{ type: 'MESSAGE', target: 'system', description: isPlayer ? '你跳过了出牌' : '对手跳过了出牌' }] };
      const res = GameSequenceExecutor.executeCommand(mutableState, skipCmd);
      return { newState: res.state, logs: res.logs, command: skipCmd };
  }

  // 3. 克制判定 (Counter/Crit) - 使用 combat 模块
  const targetLastId = getTargetValue.lastSpell(mutableState, isPlayer);
  const { countered, crit } = evaluateElementInteraction(spellId, targetLastId);
  
  if (countered) {
    actions.push({ type: 'MESSAGE', target: 'system', description: `🛡️ [${spell.name}] 被克制！伤害减半，效果取消！` });
  } else if (crit) {
    actions.push({ type: 'MESSAGE', target: 'system', description: `🌊 属性克制！造成暴击！` });
  }

  // 4. 基础伤害与连击计算
  let dmg = spell.damage;
  const critMultiplier = crit ? 1.5 : 1.0;

  // 连击 (Charge) - 使用 combat 模块
  const comboResult = calculateComboBonus(mutableState, caster, spellId, countered);
  if (comboResult.comboMessage) {
    actions.push({ type: 'MESSAGE', target: 'system', description: comboResult.comboMessage });
  }
  // 暴击 + 连击叠加
  dmg = Math.floor(spell.damage * critMultiplier * comboResult.multiplier);

  // 被克制：伤害减半（保留基础伤害，效果仍被取消）
  if (countered) {
    dmg = Math.floor(dmg * 0.5);
  }

  // 更新连击状态
  const updatedState = updateComboState(mutableState, caster, spellId, comboResult.newComboCount);
  Object.assign(mutableState, updatedState);

  // 5. 组合 Actions
  if (dmg > 0) {
      actions.push({ type: 'HP_CHANGE', target, value: -dmg, description: `${spell.emoji} ${isPlayer ? '造成' : '受到'} ${dmg} 点伤害` });
  }
  if ((spell.armorGain || 0) > 0) {
      actions.push({ type: 'ARMOR_CHANGE', target: caster, value: spell.armorGain, description: `${isPlayer ? '获得' : '对手获得'} ${spell.armorGain} 护甲` });
  }

  // 6. 机制特效 Actions - [P0 Fix] 使用拷贝后的状态
  const mechanicGenerator = MECHANIC_DEFINITIONS[spell.mechanic];
  if (mechanicGenerator) {
      actions.push(...mechanicGenerator(mutableState, caster, spell, countered, crit));
  }

  // [P3-1] 秘密注册：当 mechanic='secret' 时，注册 GameTrigger
  if (spell.mechanic === 'secret' && !countered) {
    const secretTrigger = createSecretTrigger(spellId, caster, mutableState.triggerOrderCounter + 1);
    if (secretTrigger) {
      const triggerArray = isPlayer ? mutableState.playerTriggers : mutableState.opponentTriggers;
      triggerArray.push(secretTrigger);
      mutableState.triggerOrderCounter++;
    }
  }

  // [New 6.3] 随从召唤逻辑（仅在mechanic不是专门的召唤机制时执行）
  const summonMechanics = ['charge', 'divine_shield', 'deathrattle', 'aura', 'summon'];
  if (!countered && spell.summonId && MINION_DATA[spell.summonId] && !summonMechanics.includes(spell.mechanic)) {
      const minionBase = MINION_DATA[spell.summonId];
      actions.push({
          type: 'SUMMON_MINION',
          target: caster,
          value: { ...minionBase, id: spell.summonId, keywords: minionBase.keywords || [], buffs: [] },
          description: `✨ ${isPlayer ? '你' : '对手'}召唤了 ${minionBase.name}！`
      });
  }

  // 7. 执行命令并生成日志
  const cmd: GameCommand = { id: `cast_${spellId}`, sourceSpell: spellId, caster, actions };
  let { state: newState, logs } = GameSequenceExecutor.executeCommand(mutableState, cmd);
  
  // Attach snapshot for UI/AI optimization
  cmd.snapshot = newState;
  
  return { newState, logs, command: cmd };
};

/**
 * [P1-1] 目标选择：带目标的法术执行
 * 当 spell.targetMode !== 'auto' 且目标为 minion 时，
 * 将 HP_CHANGE action 替换为 MINION_DAMAGE action
 */
export const executeSpellWithTarget = (
  state: Readonly<DuelState>,
  caster: 'player' | 'opponent',
  spellId: SpellType,
  target: SpellTarget
): { newState: DuelState, logs: string[], command: GameCommand } => {
  const result = executeSpell(state, caster, spellId);
  const isPlayer = caster === 'player';

  // 只有 minion 目标需要替换 HP_CHANGE actions
  if (target.type === 'minion' && target.id) {
    const newActions = result.command.actions.map(action => {
      if (action.type === 'HP_CHANGE' && action.target === (isPlayer ? 'opponent' : 'player') && action.value < 0) {
        return {
          type: 'MINION_DAMAGE' as const,
          target: caster,
          value: { instanceId: target.id, amount: Math.abs(action.value) },
          description: `🎯 指向 ${target.id} 造成 ${Math.abs(action.value)} 点伤害`,
        };
      }
      return action;
    });
    result.command.actions = newActions;

    // Re-execute with modified actions
    const cmd = { ...result.command, actions: newActions };
    const { state: newState, logs } = GameSequenceExecutor.executeCommand(
      cloneDuelState(state),
      cmd
    );
    return { newState, logs, command: cmd };
  }

  return result;
};

/**
 * [P1-1] Check if a spell requires target selection
 */
export const spellNeedsTarget = (spellId: SpellType): boolean => {
  const spell = getSpellById(spellId);
  return spell.targetMode !== undefined && spell.targetMode !== 'auto';
};

// [Phase 2] AI 逻辑已迁移到 services/ai.ts
// 通过顶部的 export { executeAITurn, getAISpell, pickBestSpellForAI } from './ai' 重新导出

// ============ 赔率计算 ============

export const calculatePayout = (
  bet: number, 
  result: 'WIN' | 'LOSS' | 'DRAW'
): { payout: number; isCrit: boolean } => {
  let payout = 0;
  let isCrit = false;

  if (result === 'DRAW') {
    payout = Math.floor(bet); 
  } else if (result === 'WIN') {
    // [P0 Fix #2] 使用确定性 RNG
    const rng = getGameRNG();
    isCrit = rng.chance(CRIT_CHANCE);
    let profit = bet * WIN_MULTIPLIER;
    if (isCrit) profit *= CRIT_MULTIPLIER;
    payout = Math.floor(bet + profit);
  } else {
    payout = 0;
  }
  return { payout, isCrit };
};


export const determineWinner = (p: SpellType, o: SpellType): 'WIN' | 'LOSS' | 'DRAW' => {
  const playerSpell = getSpellById(p);
  const opponentSpell = getSpellById(o);
  
  // [P0 Fix #1] 使用顶部导入的元素系统函数（已移除 require）
  const playerElement = getElementType(p);
  const opponentElement = getElementType(o);
  
  if (doesElementBeat(playerElement, opponentElement)) {
    return 'WIN';
  }
  if (doesElementBeat(opponentElement, playerElement)) {
    return 'LOSS';
  }
  
  // 如果没有克制关系，比较伤害
  if (playerSpell.damage > opponentSpell.damage) {
    return 'WIN';
  }
  if (opponentSpell.damage > playerSpell.damage) {
    return 'LOSS';
  }
  
  // 伤害相等时平局
  return 'DRAW';
};

// ============ AI对手逻辑 ============

// 已在 types.ts 中定义，此处删除重复定义以避免冲突


export const AI_PROFILES: AIProfile[] = [
  {
    name: '新手法师',
    difficulty: 'easy',
    description: '法师学徒，正在通过实践学习基础的元素相克原理。',
    avatar: '/avatars/ai-easy.webp',
    strategy: 'balanced'
  },
  {
    name: '战斗法师',
    difficulty: 'medium',
    description: '经验丰富的战场指挥官，擅长通过高爆发法术迅速压制对手。',
    avatar: '/avatars/ai-medium.webp',
    strategy: 'aggressive'
  },
  {
    name: '大法师梅林',
    difficulty: 'hard',
    description: '掌握了禁忌奥秘的强者，能够看穿你的每一次出牌并进行完美反制。',
    avatar: '/avatars/ai-hard.webp',
    strategy: 'defensive'
  },
  {
    name: '召唤师',
    difficulty: 'medium',
    description: '精通自然之力的召唤师，擅长用随从大军淹没对手。',
    avatar: '/avatars/ai-summoner.webp',
    strategy: 'summoner'
  },
  {
    name: '宗师',
    difficulty: 'expert',
    description: '传说中的棋道宗师，能预判你的每一步棋并做出完美回应。',
    avatar: '/avatars/ai-grandmaster.webp',
    strategy: 'combo'
  },
  {
    name: '治疗师',
    difficulty: 'easy',
    description: '温和的自然治疗师，擅长用藤蔓法术持续恢复生命值，以持久战拖垮对手。',
    avatar: '/avatars/ai-healer.webp',
    strategy: 'healer',
    deckTemplate: AI_DECK_TEMPLATES.healer_vine?.cards
  },
  {
    name: '毒师',
    difficulty: 'medium',
    description: '来自沼泽的毒术大师，精通缠绕与剧毒之术，让对手在缓慢衰竭中倒下。',
    avatar: '/avatars/ai-disruption.webp',
    strategy: 'disruption',
    deckTemplate: AI_DECK_TEMPLATES.disruption_poison?.cards
  },
  {
    name: '时空法师',
    difficulty: 'hard',
    description: '操纵时间与空间的神秘法师，用冰霜和沉默封锁对手行动，直至牌库枯竭。',
    avatar: '/avatars/ai-mill.webp',
    strategy: 'mill',
    deckTemplate: AI_DECK_TEMPLATES.mill_ice?.cards
  },
  {
    name: '元素使',
    difficulty: 'medium',
    description: '精通五元素的全能法师，能根据战场形势灵活切换攻防节奏。',
    avatar: '/avatars/ai-midrange.webp',
    strategy: 'midrange'
  },
  {
    name: '火焰领主',
    difficulty: 'expert',
    description: '烈焰的化身，掌控灼热凤凰与末日之火，一切皆在其炽焰下化为灰烬。',
    avatar: '/avatars/ai-fire-lord.webp',
    strategy: 'aggressive',
    deckTemplate: AI_DECK_TEMPLATES.boss_fire_lord?.cards
  },
  {
    name: '冰霜女巫',
    difficulty: 'expert',
    description: '永恒寒冬的女主人，极致冰霜控制配合圣盾随从，构筑起无法逾越的冰墙。',
    avatar: '/avatars/ai-frost-witch.webp',
    strategy: 'defensive',
    deckTemplate: AI_DECK_TEMPLATES.boss_frost_witch?.cards
  },
  {
    name: '岩石守卫',
    difficulty: 'expert',
    description: '远古岩石巨灵的化身，以极限护甲和嘲讽随从筑起铜墙铁壁，永不陷落。',
    avatar: '/avatars/ai-rock-guardian.webp',
    strategy: 'summoner',
    deckTemplate: AI_DECK_TEMPLATES.boss_rock_guardian?.cards
  },
  {
    name: '暗影刺客',
    difficulty: 'hard',
    description: '隐匿于暗影中的雷电刺客，以雷系和岩石连击瞬间爆发，一击致命。',
    avatar: '/avatars/ai-assassin.webp',
    strategy: 'aggressive',
    deckTemplate: AI_DECK_TEMPLATES.assassin_thunder?.cards
  }
];

export const getTavernAIDecision = (
  aiProfile: AIProfile,
  hand: SpellType[],
  mana: number,
  opponentHP: number,
  playerHP: number,
  effects: StatusEffect[]
): SpellType | null => {
  // 过滤可用的卡牌
  const availableCards = hand.filter(cardId => {
    const spell = getSpellById(cardId);
    return canAffordSpell(cardId, mana, effects).canAfford;
  });

  if (availableCards.length === 0) return null;

  switch (aiProfile.strategy) {
    case 'aggressive':
      // 优先选择高伤害卡牌
      const damageCards = availableCards
        .map(id => getSpellById(id))
        .filter(spell => spell.damage > 0)
        .sort((a, b) => b.damage - a.damage);
      if (damageCards.length > 0) return damageCards[0].id;

      // 如果没有伤害卡，选择其他卡
            return getGameRNG().pick(availableCards);

    case 'defensive':
      // 优先选择治疗或护甲卡牌
      const defensiveCards = availableCards
        .map(id => getSpellById(id))
        .filter(spell => spell.mechanic === 'fortify' || spell.mechanic === 'heal');
      if (defensiveCards.length > 0) return defensiveCards[0].id;

      // 如果没有防御卡，选择其他卡
      return getGameRNG().pick(availableCards);

    case 'healer':
      // 优先治疗，其次护甲，最后藤蔓元素
      const healCards = availableCards
        .filter(id => getSpellById(id).mechanic === 'heal');
      if (healCards.length > 0) return healCards[0];
      const fortifyCards = availableCards
        .filter(id => getSpellById(id).mechanic === 'fortify');
      if (fortifyCards.length > 0) return fortifyCards[0];
      const vineCards = availableCards
        .filter(id => getElementType(id) === 'vine');
      if (vineCards.length > 0) return getGameRNG().pick(vineCards);
      return getGameRNG().pick(availableCards);

    case 'disruption':
      // 优先缠绕，其次毒伤，最后沉默
      const tangleCards = availableCards
        .map(id => getSpellById(id))
        .filter(spell => spell.mechanic === 'tangle');
      if (tangleCards.length > 0) return tangleCards[0].id;
      const poisonCards = availableCards
        .map(id => getSpellById(id))
        .filter(spell => spell.mechanic === 'poison');
      if (poisonCards.length > 0) return poisonCards[0].id;
      const silenceCards = availableCards
        .map(id => getSpellById(id))
        .filter(spell => spell.mechanic === 'silence');
      if (silenceCards.length > 0) return silenceCards[0].id;
      return getGameRNG().pick(availableCards);

    case 'mill':
      // 优先沉默，其次冻结，最后抽牌
      const millSilenceCards = availableCards
        .map(id => getSpellById(id))
        .filter(spell => spell.mechanic === 'silence');
      if (millSilenceCards.length > 0) return millSilenceCards[0].id;
      const freezeCards = availableCards
        .map(id => getSpellById(id))
        .filter(spell => spell.mechanic === 'freeze');
      if (freezeCards.length > 0) return freezeCards[0].id;
      const drawCards = availableCards
        .map(id => getSpellById(id))
        .filter(spell => spell.mechanic === 'draw');
      if (drawCards.length > 0) return drawCards[0].id;
      return getGameRNG().pick(availableCards);

    case 'midrange':
      // 均衡打法，优先选择 2-4 费卡牌
      const midrangeCards = availableCards
        .map(id => ({ id, spell: getSpellById(id) }))
        .filter(({ spell }) => spell.manaCost >= 2 && spell.manaCost <= 4);
      if (midrangeCards.length > 0) return getGameRNG().pick(midrangeCards).id;
      return getGameRNG().pick(availableCards);

    case 'balanced':
    default:
      // [P0 Fix #2] 使用确定性 RNG
      return getGameRNG().pick(availableCards);
  }
};

export const createTavernDuelState = (playerDeck: SpellType[], aiProfile: AIProfile, gameMode: GameMode = 'standard', seed?: number): DuelState => {
  // [P0 Fix #2] 使用确定性 RNG
  const rng = resetGameRNG(seed);
  
  // 为AI创建随机牌组（使用相同的基础牌池）
  const aiDeck = generateTavernAIDeck(aiProfile, gameMode, rng);

  // 玩家初始状态（确定性洗牌）
  const shuffledPlayerDeck = rng.shuffle(playerDeck);
  const playerHand = shuffledPlayerDeck.slice(0, 5);
  const remainingPlayerDeck = shuffledPlayerDeck.slice(5);
 
  // AI初始状态（确定性洗牌）
  const shuffledAIDeck = rng.shuffle(aiDeck);
  const aiHand = shuffledAIDeck.slice(0, 5);
  const remainingAIDeck = shuffledAIDeck.slice(5);

  return {
    playerHP: GAME_CONFIG.maxHP,
    playerArmor: 0,
    opponentHP: GAME_CONFIG.maxHP,
    opponentArmor: 0,

    playerMana: GAME_CONFIG.startingMana,
    playerMaxMana: GAME_CONFIG.startingMana,
    opponentMana: GAME_CONFIG.startingMana,
    opponentMaxMana: GAME_CONFIG.startingMana,

    playerHand,
    playerDeck: remainingPlayerDeck,
    opponentHand: aiHand, 
    opponentHandSize: aiHand.length, 

    playerEffects: [],
    opponentEffects: [],
    playerMinions: [],
    opponentMinions: [],

    playerLastSpell: null,
    opponentLastSpell: null,
    playerCostMod: 0,
    opponentCostMod: 0,
    playerConsecutiveThunder: 0,
    opponentConsecutiveThunder: 0,

    roundNumber: 0,
    isTavernMode: true,
    aiProfile,
    opponentDeck: remainingAIDeck,

    playerFatigue: 0,
    opponentFatigue: 0,
    heroSkillsUsed: false,
    opponentHeroSkillUsed: false,
    playerTriggers: [],
    opponentTriggers: [],
    isTutorial: false,
    
    // [P0 Fix #2] 保存 RNG 状态
    rngState: rng.serialize(),
    // [P0 Fix #1] 触发器入场计数器
    triggerOrderCounter: 0,
  };
};

const generateTavernAIDeck = (aiProfile: AIProfile, gameMode: GameMode = 'standard', rng?: SeededRNG): SpellType[] => {
  // [Phase C-4] 优先使用固定卡组模板
  if (aiProfile.deckTemplate && aiProfile.deckTemplate.length > 0) {
    return aiProfile.deckTemplate;
  }

  // [Phase C-4] 根据 strategy 查找匹配的模板
  const templateMap: Record<string, string> = {
    balanced: 'balanced_apprentice',
    aggressive: 'aggressive_battle_mage',
    defensive: 'defensive_merlin',
    combo: 'combo_thunder',
    summoner: 'summoner_nature',
    healer: 'healer_vine',
    disruption: 'disruption_poison',
    mill: 'mill_ice',
    midrange: 'balanced_apprentice',
  };
  const templateKey = templateMap[aiProfile.strategy];
  if (templateKey && AI_DECK_TEMPLATES[templateKey]) {
    return AI_DECK_TEMPLATES[templateKey].cards;
  }

  // [P0 Fix #2] 使用传入的 SeededRNG 或全局 RNG
  const _rng = rng || getGameRNG();

  // [P1-23] AI 牌组构建策略优化
  const availableSpells = getCardsForMode(gameMode);
  const baseCards = availableSpells.filter(s => s.id !== 'skip' && !s.id.startsWith('hero_'));
  const deckSize = 20;

  // 构建策略：基于费用曲线 + 元素平衡
  const buildBalancedDeck = (cardPool: typeof baseCards, _aggressiveness: number): SpellType[] => {
    const deck: SpellType[] = [];

    // 费用曲线目标分布：低费多、高费少
    const costCurve: Record<number, number> = {
      0: 2,   // 0费 2张
      1: 4,   // 1费 4张
      2: 4,   // 2费 4张
      3: 3,   // 3费 3张
      4: 3,   // 4费 3张
      5: 2,   // 5费 2张
      6: 1,   // 6费 1张
      7: 1,   // 7+费 1张
    };

    // 根据难度调整
    if (aiProfile.strategy === 'aggressive') {
      costCurve[1] = 5;
      costCurve[2] = 5;
      costCurve[5] = 1;
      costCurve[6] = 0;
    } else if (aiProfile.strategy === 'defensive') {
      costCurve[2] = 5;
      costCurve[3] = 4;
      costCurve[4] = 3;
    }

    // 按费用分组
    const cardsByCost: Record<number, typeof baseCards> = {};
    cardPool.forEach(card => {
      const costKey = Math.min(card.manaCost, 7);
      if (!cardsByCost[costKey]) cardsByCost[costKey] = [];
      cardsByCost[costKey].push(card);
    });

    // 填充牌组
    for (const [costStr, count] of Object.entries(costCurve)) {
      const cost = parseInt(costStr);
      const pool = cardsByCost[cost] || [];
      if (pool.length === 0) continue;

      for (let i = 0; i < count && deck.length < deckSize; i++) {
        const card = _rng.pick(pool);
        // 限制同一张卡牌最多2张（传说1张）
        const currentCount = deck.filter(id => id === card.id).length;
        const maxCopies = card.rarity === 'legendary' ? 1 : 2;
        if (currentCount < maxCopies) {
          deck.push(card.id);
        } else {
          // 选另一张
          const alt = pool.find(c => deck.filter(id => id === c.id).length < (c.rarity === 'legendary' ? 1 : 2));
          if (alt) deck.push(alt.id);
        }
      }
    }

    // 补满到 deckSize
    while (deck.length < deckSize) {
      const card = _rng.pick(cardPool);
      const currentCount = deck.filter(id => id === card.id).length;
      if (currentCount < 2) {
        deck.push(card.id);
      }
    }

    return deck.slice(0, deckSize);
  };

  switch (aiProfile.difficulty) {
    case 'easy':
      // 新手AI：只用基础便宜卡牌
      return buildBalancedDeck(baseCards.filter(c => c.manaCost <= 4 && c.rarity !== 'legendary'), 0.3);

    case 'medium':
      // 中等AI：均衡牌组
      return buildBalancedDeck(baseCards.filter(c => c.rarity !== 'legendary' || _rng.chance(0.3)), 0.5);

    case 'hard':
      // 困难AI：使用最强组合
      return buildBalancedDeck(baseCards, 0.8);

    case 'expert':
      // [Phase C] 专家AI：全卡池
      return buildBalancedDeck(baseCards, 0.9);

    default:
      return buildBalancedDeck(baseCards, 0.5);
  }
};
