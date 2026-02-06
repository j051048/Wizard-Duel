/**
 * Wizard Duel - 游戏逻辑引擎
 * 
 * 核心战斗系统：支持法力消耗、状态效果、Draft机制、回合制多卡连击逻辑
 * 
 * [Phase 2] 模块化重构：
 * - 机制定义 -> services/mechanics.ts
 * - AI 逻辑 -> services/ai.ts
 * - 状态工具 -> services/stateUtils.ts
 */

import { 
  DuelState, SpellType, Spell, GameMode, StatusEffect, AIProfile, GameCommand, GameAction
} from '../types.ts';
import { 
  SPELLS, GAME_CONFIG, createDeck, getCardsForMode,
  CRIT_CHANCE, WIN_MULTIPLIER, CRIT_MULTIPLIER, shuffleArray, getMechanicName,
  MINION_DATA
} from '../constants.ts';
import { GameSequenceExecutor } from './sequence';
import { getMechanicHandler, MECHANIC_DEFINITIONS } from './mechanics';
import { cloneDuelState } from './stateUtils';

// [Phase 2] 重新导出 AI 模块，保持向后兼容
export { executeAITurn, getAISpell, pickBestSpellForAI } from './ai';


// ============ 卡牌查询 ============

export const getSpellById = (id: SpellType): Spell => {
  return SPELLS.find(s => s.id === id) || SPELLS[0];
};

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

export const createInitialDuelState = (playerDeck: SpellType[], gameMode: GameMode = 'standard'): DuelState => {
  // 初始手牌: 从牌组抽5张
  const shuffledDeck = shuffleArray(playerDeck);
  const playerHand = shuffledDeck.slice(0, 5);
  const remainingDeck = shuffledDeck.slice(5);
  
  // 为对手创建基于游戏模式的牌组
  const availableSpells = getCardsForMode(gameMode);
  const opponentDeck = createDeck(availableSpells.map(s => s.id));
  const shuffledOpponentDeck = shuffleArray(opponentDeck);
  
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
    opponentHand: shuffledOpponentDeck.slice(0, 5), // 初始化对手真实手牌
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
    isTutorial: false
  };
};

// ============ 回合准备 ============

// ============ 辅助逻辑 ============

export const recalculateCostMod = (effects: StatusEffect[]): number => {
  const tangle = effects.find(e => e.type === 'tangle');
  return tangle ? (tangle.value || 0) : 0;
};

// ============ 法力检查 ============

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

  const spell = getSpellById(spellId);
  const finalCost = spell.id === 'skip' ? 0 : Math.max(0, spell.manaCost + costMod);
  
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

// ============ 单卡执行逻辑 (完全重构) ============

export const executeSpell = (
  state: Readonly<DuelState>,
  caster: 'player' | 'opponent',
  spellId: SpellType
): { newState: DuelState, logs: string[], command: GameCommand } => {
  const spell = getSpellById(spellId);
  const isPlayer = caster === 'player';
  const target = isPlayer ? 'opponent' : 'player';
  
  const actions: GameAction[] = [];
  
  // [P0 Fix] 深拷贝状态，避免直接修改传入的 state（状态不可变性）
  const mutableState: DuelState = cloneDuelState(state);

  
  // 1. 冻结检查 (Move to top)
  const effects = isPlayer ? state.playerEffects : state.opponentEffects;
  if (effects.some(e => e.type === 'frozen')) {
    return { 
        newState: state as DuelState, 
        logs: [`❄️ ${isPlayer ? '你' : '对手'}被冻结，无法行动！`], 
        command: { id: 'frozen', caster, actions: [] } 
    };
  }

  // 2. 英雄技能占用逻辑
  if (spellId.startsWith('hero_')) {
    const alreadyUsed = isPlayer ? mutableState.heroSkillsUsed : mutableState.opponentHeroSkillUsed;
    if (alreadyUsed) return { 
        newState: state as DuelState, 
        logs: [`${isPlayer ? '玩家' : '对手'}本回合已使用过英雄技能`], 
        command: { id: 'fail', caster, actions: [] } 
    };
    // [P0 Fix] 修改的是拷贝后的状态，不影响原始 state
    if (isPlayer) mutableState.heroSkillsUsed = true;
    else mutableState.opponentHeroSkillUsed = true;
  }

  // 3. 费用计算与扣除
  const costMod = isPlayer ? state.playerCostMod : state.opponentCostMod;
  const finalCost = spell.id === 'skip' ? 0 : Math.max(0, spell.manaCost + costMod);
  actions.push({ type: 'MANA_CHANGE', target: caster, value: -finalCost });

  // [Fix] 消耗缠绕效果 (Tangle) - 机制设计为"下一张牌"费用增加，因此生效一次后需移除
  if (spell.id !== 'skip' && costMod > 0) {
      const currentEffects = isPlayer ? mutableState.playerEffects : mutableState.opponentEffects;
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
          if (isPlayer) {
              mutableState.playerEffects = mutableState.playerEffects.filter(e => e.type !== 'tangle');
              mutableState.playerCostMod = 0;
          } else {
              mutableState.opponentEffects = mutableState.opponentEffects.filter(e => e.type !== 'tangle');
              mutableState.opponentCostMod = 0;
          }
      }
  }

  // [P0 Fix] 立即从拷贝的状态中移除手牌，确保后续所有中间状态都包含此更动
  if (spell.id !== 'skip') {
    if (isPlayer) {
      const firstIdx = mutableState.playerHand.indexOf(spellId);
      if (firstIdx !== -1) {
        mutableState.playerHand = mutableState.playerHand.filter((_, i) => i !== firstIdx);
      }
      mutableState.playerLastSpell = spellId;
    } else {
      if (!spellId.startsWith('hero_')) {
        const firstIdx = mutableState.opponentHand.indexOf(spellId);
        if (firstIdx !== -1) {
          mutableState.opponentHand = mutableState.opponentHand.filter((_, i) => i !== firstIdx);
          mutableState.opponentHandSize = mutableState.opponentHand.length;
        }
      }
      mutableState.opponentLastSpell = spellId;
    }
  }

  if (spell.id === 'skip') {
      const skipCmd: GameCommand = { id: 'skip', caster, actions: [{ type: 'MESSAGE', target: 'system', description: isPlayer ? '你跳过了出牌' : '对手跳过了出牌' }] };
      const res = GameSequenceExecutor.executeCommand(mutableState, skipCmd);
      return { newState: res.state, logs: res.logs, command: skipCmd };
  }

  // 3. 克制判定 (Counter/Crit)
  const targetLastId = isPlayer ? mutableState.opponentLastSpell : mutableState.playerLastSpell;
  const targetLast = targetLastId ? getSpellById(targetLastId) : null;
  
  let countered = false;
  let crit = false;
  
  if (targetLast) {
    if (targetLast.beats === spell.id) {
       countered = true;
       actions.push({ type: 'MESSAGE', target: 'system', description: `🚫 [${spell.name}] 被 [${targetLast.name}] 抵消！` });
    } else if (spell.beats === targetLastId) {
       crit = true;
       actions.push({ type: 'MESSAGE', target: 'system', description: `🌊 属性克制！造成暴击！` });
    }
  }

  // 4. 基础伤害与护甲
  let dmg = spell.damage;
  if (crit) dmg = Math.floor(dmg * 1.5);
  if (countered) dmg = 0;

  // 连击 (Charge) - [P0 Fix] 雷电连击只考虑手牌法术，不包括英雄技能
  const myLastId = isPlayer ? mutableState.playerLastSpell : mutableState.opponentLastSpell;
  // [P0 Fix] 修正：hero_thunder 不应该触发法术连击（它是技能，不是法术）
  const isThunderSpell = (id: string | null) => id && id.startsWith('thunder') && !id.startsWith('hero_');
  if (!countered && spell.mechanic === 'charge' && isThunderSpell(spell.id) && isThunderSpell(myLastId)) {
      dmg = Math.floor(dmg * 1.5); // [Balance] 连击伤害恢复为 1.5 (50% Bonus)
      actions.push({ type: 'MESSAGE', target: 'system', description: `⚡ 闪电连击！伤害增加50%！` });
  }

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

  // [New 6.3] 随从召唤逻辑
  if (!countered && spell.summonId && MINION_DATA[spell.summonId]) {
      const minionBase = MINION_DATA[spell.summonId];
      actions.push({
          type: 'SUMMON_MINION',
          target: caster,
          value: { ...minionBase, id: spell.summonId },
          description: `✨ ${isPlayer ? '你' : '对手'}召唤了 ${minionBase.name}！`
      });
  }

  // 7. 执行命令并生成日志
  const cmd: GameCommand = { id: `cast_${spellId}`, sourceSpell: spellId, caster, actions };
  let { state: newState, logs } = GameSequenceExecutor.executeCommand(mutableState, cmd);
  
  return { newState, logs, command: cmd };
};


// [Phase 2] AI 逻辑已迁移到 services/ai.ts
// 通过顶部的 export { executeAITurn, getAISpell, pickBestSpellForAI } from './ai' 重新导出


// ============ 死亡检查 (统一判定) ============

/**
 * 统一死亡检查 - 在所有效果结算后调用
 * 返回游戏结果：'WIN' | 'LOSS' | 'DRAW' | null (游戏继续)
 */
export const checkGameOver = (state: DuelState): 'WIN' | 'LOSS' | 'DRAW' | null => {
  const playerDead = state.playerHP <= 0;
  const opponentDead = state.opponentHP <= 0;
  
  if (playerDead && opponentDead) {
    return 'DRAW'; // 同归于尽 = 平局
  }
  if (playerDead) {
    return 'LOSS';
  }
  if (opponentDead) {
    return 'WIN';
  }
  return null; // 游戏继续
};

// ============ 回合准备 (Patch 2.0) ============

// ============ 回合准备 (Patch 2.0) ============

export const prepareNextTurn = (state: DuelState): DuelState => {
  const newState = { 
    ...state,
    // [P0 Fix] 重置英雄技能使用状态（确保在法力恢复前重置）
    heroSkillsUsed: false,
    opponentHeroSkillUsed: false,
    // 深拷贝数组，避免状态污染
    playerEffects: [...state.playerEffects],
    opponentEffects: [...state.opponentEffects],
    playerHand: [...state.playerHand],
    playerDeck: [...state.playerDeck],
    opponentDeck: [...state.opponentDeck],
  };

  // 1. 回合数自增
  newState.roundNumber += 1;

  // 2. 状态效果结算 (DoT 优先结算)
  // [P0 Fix] 灼烧伤害优先于法力恢复，因为如果死于灼烧就无需后续逻辑
  let burnDmg = 0;
  const newPlayerEffects: StatusEffect[] = [];
  state.playerEffects.forEach(e => {
    if (e.type === 'burn') burnDmg += (e.value || 0);
    const nextDur = e.duration - 1;
    if (nextDur > 0) newPlayerEffects.push({ ...e, duration: nextDur });
    // [P0 Fix] 冻结状态自然递减
  });
  newState.playerEffects = newPlayerEffects;
  // 直接结算灼烧伤害
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

  // [P0 Fix] 立即死亡检查
  // 如果任意一方死亡，直接返回状态，不执行法力恢复
  if (checkGameOver(newState) !== null) {
      return newState;
  }

  // 3. 法力成长与恢复 (如果此时双方都存活)
  newState.playerMaxMana = Math.min(GAME_CONFIG.maxMana, state.playerMaxMana + 1);
  newState.opponentMaxMana = Math.min(GAME_CONFIG.maxMana, state.opponentMaxMana + 1);
  newState.playerMana = newState.playerMaxMana;
  newState.opponentMana = newState.opponentMaxMana;

  // 4. 计算费用修正 (Tangle)
  const playerTangle = newState.playerEffects.find(e => e.type === 'tangle');
  newState.playerCostMod = playerTangle ? (playerTangle.value || 0) : 0;
  
  const oppTangle = newState.opponentEffects.find(e => e.type === 'tangle');
  newState.opponentCostMod = oppTangle ? (oppTangle.value || 0) : 0;

  // 5. 随从状态重置
  newState.playerMinions = newState.playerMinions.map(m => ({ ...m, exhausted: false }));
  newState.opponentMinions = newState.opponentMinions.map(m => ({ ...m, exhausted: false }));

  return newState;
};

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
    isCrit = Math.random() < CRIT_CHANCE;
    let profit = bet * WIN_MULTIPLIER;
    if (isCrit) profit *= CRIT_MULTIPLIER;
    payout = Math.floor(bet + profit);
  } else {
    payout = 0;
  }
  return { payout, isCrit };
};

/**
 * @deprecated
 */
export const getRandomSpell = (playerSpellId?: SpellType): SpellType => {
  return SPELLS[Math.floor(Math.random() * 10)].id;
};

export const determineWinner = (p: SpellType, o: SpellType): 'WIN' | 'LOSS' | 'DRAW' => {
  const playerSpell = getSpellById(p);
  const opponentSpell = getSpellById(o);
  
  // 检查克制关系
  if (playerSpell.beats === opponentSpell.id) {
    return 'WIN';
  }
  if (opponentSpell.beats === playerSpell.id) {
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
    avatar: '/avatars/ai-easy.png',
    strategy: 'balanced'
  },
  {
    name: '战斗法师',
    difficulty: 'medium',
    description: '经验丰富的战场指挥官，擅长通过高爆发法术迅速压制对手。',
    avatar: '/avatars/ai-medium.png',
    strategy: 'aggressive'
  },
  {
    name: '大法师梅林',
    difficulty: 'hard',
    description: '掌握了禁忌奥秘的强者，能够看穿你的每一次出牌并进行完美反制。',
    avatar: '/avatars/ai-hard.png',
    strategy: 'defensive'
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
      return availableCards[Math.floor(Math.random() * availableCards.length)];

    case 'defensive':
      // 优先选择治疗或护甲卡牌
      const defensiveCards = availableCards
        .map(id => getSpellById(id))
        .filter(spell => spell.mechanic === 'fortify' || spell.mechanic === 'heal');
      if (defensiveCards.length > 0) return defensiveCards[0].id;

      // 如果没有防御卡，选择其他卡
      return availableCards[Math.floor(Math.random() * availableCards.length)];

    case 'balanced':
    default:
      // 随机选择
      return availableCards[Math.floor(Math.random() * availableCards.length)];
  }
};

export const createTavernDuelState = (playerDeck: SpellType[], aiProfile: AIProfile, gameMode: GameMode = 'standard'): DuelState => {
  // 为AI创建随机牌组（使用相同的基础牌池）
  const aiDeck = generateTavernAIDeck(aiProfile, gameMode);

  // 玩家初始状态
  const shuffledPlayerDeck = shuffleArray(playerDeck);
  const playerHand = shuffledPlayerDeck.slice(0, 5);
  const remainingPlayerDeck = shuffledPlayerDeck.slice(5);
 
  // AI初始状态
  const shuffledAIDeck = shuffleArray(aiDeck);
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
    isTutorial: false
  };
};

const generateTavernAIDeck = (aiProfile: AIProfile, gameMode: GameMode = 'standard'): SpellType[] => {
  // 根据游戏模式获取可用卡牌
  const availableSpells = getCardsForMode(gameMode);
  const baseCards = availableSpells.map(s => s.id);
  const deckSize = 20;

  switch (aiProfile.difficulty) {
    case 'easy':
      // 新手AI：随机选择基础卡牌
      return Array.from({ length: deckSize }, () =>
        baseCards[Math.floor(Math.random() * Math.min(baseCards.length, 10))]
      );

    case 'medium':
      // 中等AI：包含一些强力卡牌
      const mediumCards = baseCards.slice(0, Math.min(baseCards.length, 25));
      return Array.from({ length: deckSize }, () =>
        mediumCards[Math.floor(Math.random() * mediumCards.length)]
      );

    case 'hard':
      // 困难AI：使用最强卡牌
      const hardCards = baseCards.slice(0, 30);
      return Array.from({ length: deckSize }, () =>
        hardCards[Math.floor(Math.random() * hardCards.length)]
      );

    default:
      return Array.from({ length: deckSize }, () =>
        baseCards[Math.floor(Math.random() * baseCards.length)]
      );
  }
};
