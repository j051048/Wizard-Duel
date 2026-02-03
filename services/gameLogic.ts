/**
 * Wizard Duel - 游戏逻辑引擎
 * 
 * 核心战斗系统：支持法力消耗、状态效果、连击机制的完整对战逻辑
 */

import { 
  SpellType, 
  Spell, 
  StatusEffect, 
  DuelState, 
  RoundResult,
  Mechanic 
} from '../types.ts';
import { 
  SPELLS, 
  GAME_CONFIG, 
  createDeck,
  CRIT_CHANCE, 
  WIN_MULTIPLIER, 
  CRIT_MULTIPLIER 
} from '../constants.ts';

// ============ 卡牌查询 ============

export const getSpellById = (id: SpellType): Spell => {
  return SPELLS.find(s => s.id === id) || SPELLS[0];
};

// ============ 初始化对战状态 ============

export const createInitialDuelState = (): DuelState => {
  const playerDeck = createDeck();
  const opponentDeck = createDeck();
  
  // 初始手牌: 从牌组抽取
  const playerHand = playerDeck.splice(0, GAME_CONFIG.handSize);
  
  return {
    playerHP: GAME_CONFIG.maxHP,
    opponentHP: GAME_CONFIG.maxHP,
    
    playerMana: GAME_CONFIG.startingMana,
    playerMaxMana: GAME_CONFIG.maxMana,
    opponentMana: GAME_CONFIG.startingMana,
    opponentMaxMana: GAME_CONFIG.maxMana,
    
    playerHand,
    playerDeck,
    opponentHandSize: GAME_CONFIG.handSize,
    
    playerEffects: [],
    opponentEffects: [],
    
    playerLastSpell: null,
    opponentLastSpell: null,
    playerConsecutiveThunder: 0,
    opponentConsecutiveThunder: 0,
    
    roundNumber: 1,
  };
};

// ============ 法力检查 ============

/**
 * 检查玩家是否能支付某个法术的费用
 */
export const canAffordSpell = (
  spellId: SpellType, 
  mana: number, 
  effects: StatusEffect[]
): { canAfford: boolean; reason?: string } => {
  const spell = getSpellById(spellId);
  
  // 检查法力是否足够
  if (mana < spell.manaCost) {
    return { canAfford: false, reason: `法力不足 (需要 ${spell.manaCost}, 当前 ${mana})` };
  }
  
  // 检查是否被缠绕效果限制
  const tangleEffect = effects.find(e => e.type === 'tangle');
  if (tangleEffect && spell.manaCost > 2) {
    return { canAfford: false, reason: '被缠绕！无法使用高费法术' };
  }
  
  return { canAfford: true };
};

/**
 * 获取玩家当前可用的手牌
 */
export const getPlayableCards = (
  hand: SpellType[], 
  mana: number, 
  effects: StatusEffect[]
): SpellType[] => {
  return hand.filter(spellId => canAffordSpell(spellId, mana, effects).canAfford);
};

// ============ AI 逻辑 ============

/**
 * AI 选择法术 - 带策略性
 */
export const getAISpell = (
  state: DuelState, 
  playerSpellId?: SpellType
): SpellType => {
  const availableSpells = SPELLS.filter(spell => 
    canAffordSpell(spell.id, state.opponentMana, state.opponentEffects).canAfford
  );
  
  if (availableSpells.length === 0) {
    // 如果没有可用法术，返回最低费的
    return 'thunder';
  }
  
  // 如果知道玩家的选择，50%几率选择克制卡
  if (playerSpellId && Math.random() < 0.5) {
    const playerSpell = getSpellById(playerSpellId);
    const counter = availableSpells.find(s => s.beats === playerSpell.id);
    if (counter) return counter.id;
  }
  
  // 策略权重：
  // - 低血量时倾向防御(rock)
  // - 高法力时倾向使用高费法术
  // - 随机选择
  
  if (state.opponentHP <= 2 && availableSpells.find(s => s.id === 'rock')) {
    if (Math.random() < 0.4) return 'rock';
  }
  
  if (state.opponentMana >= 3 && availableSpells.find(s => s.id === 'fire')) {
    if (Math.random() < 0.3) return 'fire';
  }
  
  // 连击逻辑：如果上回合用了 Thunder，有更高概率再用
  if (state.opponentLastSpell === 'thunder' && availableSpells.find(s => s.id === 'thunder')) {
    if (Math.random() < 0.6) return 'thunder';
  }
  
  const randomIndex = Math.floor(Math.random() * availableSpells.length);
  return availableSpells[randomIndex].id;
};

// ============ 胜负判定 ============

export const determineWinner = (
  playerSpellId: SpellType, 
  opponentSpellId: SpellType
): 'WIN' | 'LOSS' | 'DRAW' => {
  if (playerSpellId === opponentSpellId) return 'DRAW';

  const playerSpell = getSpellById(playerSpellId);
  if (playerSpell.beats === opponentSpellId) {
    return 'WIN';
  }
  return 'LOSS';
};

// ============ 回合结算 ============

/**
 * 处理回合开始时的效果（如灼烧伤害）
 */
export const processStartOfTurnEffects = (state: DuelState): {
  playerDamage: number;
  opponentDamage: number;
  expiredEffects: string[];
} => {
  let playerDamage = 0;
  let opponentDamage = 0;
  const expiredEffects: string[] = [];
  
  // 处理玩家的灼烧效果
  state.playerEffects.forEach(effect => {
    if (effect.type === 'burn' && effect.value) {
      playerDamage += effect.value;
      expiredEffects.push('玩家受到灼烧伤害');
    }
  });
  
  // 处理对手的灼烧效果
  state.opponentEffects.forEach(effect => {
    if (effect.type === 'burn' && effect.value) {
      opponentDamage += effect.value;
      expiredEffects.push('对手受到灼烧伤害');
    }
  });
  
  return { playerDamage, opponentDamage, expiredEffects };
};

/**
 * 核心战斗结算逻辑
 */
export const resolveRound = (
  state: DuelState,
  playerSpellId: SpellType,
  opponentSpellId: SpellType
): RoundResult => {
  const playerSpell = getSpellById(playerSpellId);
  const opponentSpell = getSpellById(opponentSpellId);
  const outcome = determineWinner(playerSpellId, opponentSpellId);
  
  const triggeredEffects: string[] = [];
  const newPlayerEffects: StatusEffect[] = [];
  const newOpponentEffects: StatusEffect[] = [];
  
  let baseDamage = 0;
  let bonusDamage = 0;
  let reducedDamage = 0;
  
  // ===== 计算基础伤害 =====
  if (outcome === 'WIN') {
    baseDamage = playerSpell.damage;
    
    // ===== 处理进攻方机制 =====
    
    // Burn: 获胜后给对手添加灼烧效果
    if (playerSpell.mechanic === 'burn') {
      newOpponentEffects.push({
        type: 'burn',
        duration: 1,
        value: 1
      });
      triggeredEffects.push('🔥 灼烧！对手下回合将受到1点额外伤害');
    }
    
    // Tangle: 获胜后限制对手高费法术
    if (playerSpell.mechanic === 'tangle') {
      newOpponentEffects.push({
        type: 'tangle',
        duration: 1
      });
      triggeredEffects.push('🌿 缠绕！对手下回合无法使用费用>2的法术');
    }
    
    // Charge: 连续使用 Thunder 伤害翻倍
    if (playerSpell.mechanic === 'charge' && state.playerLastSpell === 'thunder') {
      bonusDamage = baseDamage; // 伤害翻倍
      triggeredEffects.push('⚡ 蓄力完成！伤害翻倍');
    }
    
  } else if (outcome === 'LOSS') {
    baseDamage = opponentSpell.damage;
    
    // 对手的 Burn 效果
    if (opponentSpell.mechanic === 'burn') {
      newPlayerEffects.push({
        type: 'burn',
        duration: 1,
        value: 1
      });
      triggeredEffects.push('🔥 你被灼烧了！下回合将受到1点额外伤害');
    }
    
    // 对手的 Tangle 效果
    if (opponentSpell.mechanic === 'tangle') {
      newPlayerEffects.push({
        type: 'tangle',
        duration: 1
      });
      triggeredEffects.push('🌿 你被缠绕了！下回合无法使用费用>2的法术');
    }
    
    // 对手的 Charge 效果
    if (opponentSpell.mechanic === 'charge' && state.opponentLastSpell === 'thunder') {
      bonusDamage = baseDamage;
      triggeredEffects.push('⚡ 对手蓄力完成！伤害翻倍');
    }
    
    // ===== 处理防守方机制 =====
    
    // Fortify: 即使失败也减少1点伤害
    if (playerSpell.mechanic === 'fortify') {
      reducedDamage = Math.min(1, baseDamage + bonusDamage);
      triggeredEffects.push('🪨 坚韧！减少1点受到的伤害');
    }
  }
  
  // ===== Freeze: 平局时触发 =====
  if (outcome === 'DRAW') {
    if (playerSpell.mechanic === 'freeze') {
      newOpponentEffects.push({
        type: 'frozen',
        duration: 1
      });
      triggeredEffects.push('❄️ 冻结！对手下回合选择受限');
    }
    
    if (opponentSpell.mechanic === 'freeze') {
      newPlayerEffects.push({
        type: 'frozen',
        duration: 1
      });
      triggeredEffects.push('❄️ 你被冻结了！下回合选择受限');
    }
  }
  
  const finalDamage = Math.max(0, baseDamage + bonusDamage - reducedDamage);
  
  return {
    outcome,
    playerSpell: playerSpellId,
    opponentSpell: opponentSpellId,
    baseDamage,
    bonusDamage,
    reducedDamage,
    finalDamage,
    triggeredEffects,
    newPlayerEffects,
    newOpponentEffects
  };
};

/**
 * 更新对战状态
 */
export const applyRoundResult = (
  state: DuelState,
  result: RoundResult,
  playerSpellId: SpellType,
  opponentSpellId: SpellType
): DuelState => {
  const playerSpell = getSpellById(playerSpellId);
  const opponentSpell = getSpellById(opponentSpellId);
  
  // 复制状态
  const newState = { ...state };
  
  // 扣除法力
  newState.playerMana = Math.max(0, state.playerMana - playerSpell.manaCost);
  newState.opponentMana = Math.max(0, state.opponentMana - opponentSpell.manaCost);
  
  // 应用伤害
  if (result.outcome === 'WIN') {
    newState.opponentHP = Math.max(0, state.opponentHP - result.finalDamage);
  } else if (result.outcome === 'LOSS') {
    newState.playerHP = Math.max(0, state.playerHP - result.finalDamage);
  }
  
  // 更新状态效果
  // 先降低现有效果的持续时间，移除过期的
  newState.playerEffects = state.playerEffects
    .map(e => ({ ...e, duration: e.duration - 1 }))
    .filter(e => e.duration > 0);
  
  newState.opponentEffects = state.opponentEffects
    .map(e => ({ ...e, duration: e.duration - 1 }))
    .filter(e => e.duration > 0);
  
  // 添加新效果
  newState.playerEffects = [...newState.playerEffects, ...result.newPlayerEffects];
  newState.opponentEffects = [...newState.opponentEffects, ...result.newOpponentEffects];
  
  // 更新连击追踪
  newState.playerLastSpell = playerSpellId;
  newState.opponentLastSpell = opponentSpellId;
  
  if (playerSpellId === 'thunder') {
    newState.playerConsecutiveThunder = state.playerConsecutiveThunder + 1;
  } else {
    newState.playerConsecutiveThunder = 0;
  }
  
  if (opponentSpellId === 'thunder') {
    newState.opponentConsecutiveThunder = state.opponentConsecutiveThunder + 1;
  } else {
    newState.opponentConsecutiveThunder = 0;
  }
  
  // 从手牌移除已使用的牌
  const cardIndex = newState.playerHand.indexOf(playerSpellId);
  if (cardIndex > -1) {
    newState.playerHand = [...newState.playerHand];
    newState.playerHand.splice(cardIndex, 1);
  }
  
  // 回合数 +1
  newState.roundNumber = state.roundNumber + 1;
  
  return newState;
};

/**
 * 准备下一回合（恢复法力、抽牌）
 */
export const prepareNextTurn = (state: DuelState): DuelState => {
  const newState = { ...state };
  
  // 恢复法力
  newState.playerMana = GAME_CONFIG.startingMana;
  newState.opponentMana = GAME_CONFIG.startingMana;
  
  // 抽牌
  if (newState.playerHand.length < GAME_CONFIG.handSize && newState.playerDeck.length > 0) {
    const cardsToDraw = Math.min(
      GAME_CONFIG.cardsDrawnPerTurn,
      GAME_CONFIG.handSize - newState.playerHand.length,
      newState.playerDeck.length
    );
    
    const drawnCards = newState.playerDeck.splice(0, cardsToDraw);
    newState.playerHand = [...newState.playerHand, ...drawnCards];
  }
  
  // 如果牌组用尽，重新洗一副牌组
  if (newState.playerDeck.length === 0) {
    newState.playerDeck = createDeck();
  }
  
  return newState;
};

// ============ 赔率计算 ============

/**
 * 计算最终赔付
 */
export const calculatePayout = (
  bet: number, 
  result: 'WIN' | 'LOSS' | 'DRAW'
): { payout: number; isCrit: boolean } => {
  let payout = 0;
  let isCrit = false;

  if (result === 'DRAW') {
    payout = Math.floor(bet); // 平局退还赌注
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

// ============ 兼容旧版 API ============

/**
 * @deprecated 使用 getAISpell 替代
 */
export const getRandomSpell = (playerSpellId?: SpellType): SpellType => {
  return getAISpell(createInitialDuelState(), playerSpellId);
};
