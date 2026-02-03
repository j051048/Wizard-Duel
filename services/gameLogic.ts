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
    playerArmor: 0, // [P0] 初始护甲
    opponentHP: GAME_CONFIG.maxHP,
    opponentArmor: 0, // [P0] 初始护甲
    
    playerMana: GAME_CONFIG.startingMana,
    playerMaxMana: GAME_CONFIG.startingMana, // 起始法力上限也是1
    opponentMana: GAME_CONFIG.startingMana,
    opponentMaxMana: GAME_CONFIG.startingMana,
    
    playerHand,
    playerDeck,
    opponentHandSize: GAME_CONFIG.handSize,
    
    playerEffects: [],
    opponentEffects: [],
    
    playerLastSpell: null,
    opponentLastSpell: null,
    playerCostMod: 0, // [Mechanism] 费用修正
    opponentCostMod: 0,
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
  effects: StatusEffect[],
  costMod: number = 0 // [Mechanism] 增加费用修正参数
): { canAfford: boolean; reason?: string } => {
  const spell = getSpellById(spellId);
  const finalCost = spell.id === 'skip' ? 0 : Math.max(0, spell.manaCost + costMod); // 费用修正 (跳过牌不受影响)
  
  // 检查法力是否足够
  if (mana < finalCost) {
    return { canAfford: false, reason: `法力不足 (需要 ${finalCost}, 当前 ${mana})` };
  }
  
  // 检查是否被冻结（跳过攻击并非无法出牌，但也可能设计为无法出攻击牌）
  // 暂时 Freeze 效果由外部逻辑处理（跳过出牌阶段），这里只检查费用
  
  return { canAfford: true };
};

/**
 * 获取玩家当前可用的手牌
 */
export const getPlayableCards = (
  hand: SpellType[], 
  mana: number, 
  effects: StatusEffect[],
  costMod: number = 0 // [Mechanism] Pass costMod
): SpellType[] => {
  return hand.filter(spellId => canAffordSpell(spellId, mana, effects, costMod).canAfford);
};

// ============ AI 逻辑 ============

/**
 * AI 选择法术 - 暴雪级智能 (Patch 2.0)
 */
export const getAISpell = (
  state: DuelState, 
  playerSpellId?: SpellType
): SpellType => {
  // [Logic] 考虑费用修正
  const availableSpells = SPELLS.filter(spell => 
    canAffordSpell(spell.id, state.opponentMana, state.opponentEffects, state.opponentCostMod).canAfford
  );
  
  // 如果被完全封锁（无牌可出），返回 null 或基础牌（虽然规则上这会导致跳过回合，这里假设总有低费牌或休息）
  // 实际上如果 mana < 1 且 costMod 高，可能真没牌出。
  if (availableSpells.length === 0) {
    // 紧急机制：如果没有牌可出，AI "休息" (不返回 null 避免类型错误，返回 'rock' 作为空过，或者需要处理 skip)
    // 暂时假设总能出牌，或者返回 'rock' (最低费)
    return SPELLS[0].id; 
  }
  
  // [Strategy] 斩杀优先
  const killSpell = availableSpells.find(s => s.damage >= state.playerHP + state.playerArmor);
  if (killSpell) return killSpell.id;

  // [Strategy] 连击 (Thunder)
  if (state.opponentLastSpell === 'thunder') {
    const thunder = availableSpells.find(s => s.id === 'thunder');
    if (thunder) return 'thunder';
  }

  // [Strategy] 费用利用率最大化 (Mana Efficient)
  // 简单逻辑：尽量打光法力
  const bestSpell = availableSpells.sort((a, b) => b.manaCost - a.manaCost)[0];
  
  // 保持一点随机性防读牌
  if (Math.random() < 0.8) return bestSpell.id;
  
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
 * 处理回合开始时的效果
 */
export const processStartOfTurnEffects = (state: DuelState): {
  playerDamage: number;
  opponentDamage: number;
  expiredEffects: string[];
} => {
  let playerDamage = 0;
  let opponentDamage = 0;
  const expiredEffects: string[] = [];
  
  // Burn: DoT 伤害 (穿透护甲? 通常 DoT 穿透护甲或先扣甲)
  // 暴雪规则：DoT 先扣甲。
  // 但这里简单返回 damage，由主循环处理扣血。
  
  state.playerEffects.forEach(effect => {
    if (effect.type === 'burn' && effect.value) {
      playerDamage += effect.value;
      expiredEffects.push(`🔥 灼烧伤害: -${effect.value}`);
    }
  });
  
  state.opponentEffects.forEach(effect => {
    if (effect.type === 'burn' && effect.value) {
      opponentDamage += effect.value;
      expiredEffects.push(`🔥 对手灼烧: -${effect.value}`);
    }
  });
  
  return { playerDamage, opponentDamage, expiredEffects };
};

/**
 * 伤害结算辅助函数：护甲抵扣
 */
const applyDamage = (hp: number, armor: number, damage: number): {  newHP: number, newArmor: number, damageDealt: number  } => {
  let remainingDamage = damage;
  let newArmor = armor;
  
  if (newArmor > 0) {
    const absorb = Math.min(newArmor, remainingDamage);
    newArmor -= absorb;
    remainingDamage -= absorb;
  }
  
  const newHP = Math.max(0, hp - remainingDamage);
  return { newHP, newArmor, damageDealt: damage }; // Return total raw damage done for UI, or effective? Keeping simplified.
};

/**
 * 核心战斗结算逻辑 (Patch 2.0)
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
  
  // 基础数值
  let playerDamage = 0;
  let playerArmorGain = 0;
  let opponentDamage = 0;
  let opponentArmorGain = 0;

  // 1. 机制预处理 (Charge & Fortify & Armor)
  
  // Player Mechanics
  if (playerSpell.id === 'thunder' && state.playerLastSpell === 'thunder') {
    playerDamage = playerSpell.damage * 2;
    triggeredEffects.push('⚡ 闪电连击！伤害翻倍');
  } else {
    playerDamage = playerSpell.damage;
  }
  if (playerSpell.armorGain) {
    playerArmorGain = playerSpell.armorGain;
    triggeredEffects.push(`🛡️ 获得 ${playerArmorGain} 护甲`);
  }

  // Opponent Mechanics
  if (opponentSpell.id === 'thunder' && state.opponentLastSpell === 'thunder') {
    opponentDamage = opponentSpell.damage * 2;
  } else {
    opponentDamage = opponentSpell.damage;
  }
  if (opponentSpell.armorGain) {
    opponentArmorGain = opponentSpell.armorGain;
  }
  
  // 2. 胜负判定与效果应用
  
  // 初始化下回合的费用修正 (默认重置为0，除非触发Tangle)
  // 注意：这个返回值并不是直接覆盖 State 的 CostMod，而是作为"新效果"的一部分
  // 我们需要在返回的 RoundResult 里包含这些状态变化，或者这函数直接改 State (不推荐，纯函数更好)
  // 这里返回 StatusEffect，主循环负责 apply。但 CostMod 是字段。
  // 我们将把 CostMod 的变化放到 triggeredEffects 里说明，实际数值变化需在 Loop 中处理。
  // 实际上 DuelState 应该在外部更新。这里只计算 Result。
  
  // 修正：我们需要返回 "state updates" 而不只是 effects。
  // 鉴于 types.ts 中 RoundResult 没有 costMod 字段，我们需要扩展它，或者沿用 effects 数组来传递特殊指令。
  // 简单起见：我们将 Tangle 实现为 StatusEffect，在 getPlayableCards 里解析它。
  // 之前的逻辑：effects.find(e => e.type === 'tangle')
  
  if (outcome === 'WIN') {
    // Player hits Opponent
    // Apply Mechanics
    if (playerSpell.mechanic === 'burn') {
      newOpponentEffects.push({ type: 'burn', duration: 1, value: 2 });
      triggeredEffects.push('🔥 深度灼烧！');
    }
    if (playerSpell.mechanic === 'tangle') {
      newOpponentEffects.push({ type: 'tangle', duration: 1, value: 2 }); // value 2 = cost increase
      triggeredEffects.push('🌿 缠绕！对手下张法术费用 +2');
    }
    if (playerSpell.mechanic === 'freeze') {
      newOpponentEffects.push({ type: 'frozen', duration: 1 });
      triggeredEffects.push('❄️ 冻结！对手下回合跳过攻击');
    }
    
    // Deal Damage to Opponent
    // (Opponent damage is 0 because they lost clash, UNLESS specific mechanic? Usually clash winner deals damage)
    // In Wizard Duel original logic: Winner deals spell damage. Loser deals nothing.
    // Patch 2.0: Stick to "Winner takes all" for simplicity, except Fortify.
    
    opponentDamage = 0; // Opponent spell fizzles
    opponentArmorGain = 0; // Loser gets nothing? No, Fortify says "Gain armor".
    if (opponentSpell.mechanic === 'fortify') {
        opponentArmorGain = opponentSpell.armorGain || 0; // Fortify always gains armor even on loss
    }
    
  } else if (outcome === 'LOSS') {
    // Opponent hits Player
    playerDamage = 0; // Player spell fizzles
    if (playerSpell.mechanic === 'fortify') {
        playerArmorGain = playerSpell.armorGain || 0;
    }

    if (opponentSpell.mechanic === 'burn') {
      newPlayerEffects.push({ type: 'burn', duration: 1, value: 2 });
      triggeredEffects.push('🔥 你被灼烧了！');
    }
    if (opponentSpell.mechanic === 'tangle') {
      newPlayerEffects.push({ type: 'tangle', duration: 1, value: 2 });
      triggeredEffects.push('🌿 你被缠绕！费用 +2');
    }
    if (opponentSpell.mechanic === 'freeze') {
      newPlayerEffects.push({ type: 'frozen', duration: 1 });
      triggeredEffects.push('❄️ 你被冻结！跳过攻击');
    }

  } else {
    // DRAW: Both hit? Or Both fizzle? Or Clash?
    // Patch 2.0: Draw = Clash, both take small damage or no damage?
    // Let's say Draw = Both spells cancel out, NO damage.
    // BUT mechanics might trigger (Freeze triggers on Draw).
    playerDamage = 0;
    opponentDamage = 0;
    
    // Fortify still works
    if (playerSpell.mechanic === 'fortify') playerArmorGain = playerSpell.armorGain || 0;
    if (opponentSpell.mechanic === 'fortify') opponentArmorGain = opponentSpell.armorGain || 0;
    
    if (playerSpell.mechanic === 'freeze') {
        newOpponentEffects.push({ type: 'frozen', duration: 1 });
        triggeredEffects.push('❄️ 寒冰护体！冻结对手');
    }
    if (opponentSpell.mechanic === 'freeze') {
        newPlayerEffects.push({ type: 'frozen', duration: 1 });
        triggeredEffects.push('❄️ 对手寒冰护体！你被冻结');
    }
  }

  return {
    outcome,
    playerSpell: playerSpellId,
    opponentSpell: opponentSpellId,
    // 旧字段兼容
    baseDamage: Math.max(playerDamage, opponentDamage), 
    bonusDamage: 0,
    reducedDamage: 0,
    finalDamage: Math.max(playerDamage, opponentDamage),
    
    // 新字段 (Patch 2.0)
    playerDamageTaken: opponentDamage, // 对手造成的伤害 = 玩家受到的伤害
    opponentDamageTaken: playerDamage, // 玩家造成的伤害 = 对手受到的伤害
    playerArmorGain,
    opponentArmorGain,
    
    triggeredEffects,
    newPlayerEffects,
    newOpponentEffects,
  };
};

/**
 * 更新对战状态
 */
/**
 * 更新对战状态 (Patch 2.0)
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
  
  // 1. 扣除法力 (考虑 CostMod)
  const playerCost = Math.max(0, playerSpell.manaCost + (state.playerCostMod || 0));
  const opponentCost = Math.max(0, opponentSpell.manaCost + (state.opponentCostMod || 0));
  
  newState.playerMana = Math.max(0, state.playerMana - playerCost);
  newState.opponentMana = Math.max(0, state.opponentMana - opponentCost);
  
  // 2. 应用护甲增益 (Fortify)
  newState.playerArmor = (state.playerArmor || 0) + (result.playerArmorGain || 0);
  newState.opponentArmor = (state.opponentArmor || 0) + (result.opponentArmorGain || 0);
  
  // 3. 应用伤害 (护甲抵扣逻辑)
  if (result.playerDamageTaken > 0) {
    const damage = result.playerDamageTaken;
    const armor = newState.playerArmor;
    const absorb = Math.min(armor, damage);
    newState.playerArmor -= absorb;
    newState.playerHP = Math.max(0, newState.playerHP - (damage - absorb));
  }
  
  if (result.opponentDamageTaken > 0) {
    const damage = result.opponentDamageTaken;
    const armor = newState.opponentArmor;
    const absorb = Math.min(armor, damage);
    newState.opponentArmor -= absorb;
    newState.opponentHP = Math.max(0, newState.opponentHP - (damage - absorb));
  }
  
  // 4. 更新状态效果
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
  
  // 5. 更新费用修正 (基于新效果)
  // 如果刚才中了缠绕，下回合费用+2。
  // 我们在 prepareNextTurn 里根据 Effects 计算 CostMod，这里只需清理。
  // 但为了即时反馈，这里暂时不设，由 prepareNextTurn 处理下一回合状态。
  
  // 更新连击追踪
  newState.playerLastSpell = playerSpellId;
  newState.opponentLastSpell = opponentSpellId;
  
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
 * 准备下一回合（恢复法力、成长、抽牌）(Patch 2.0)
 */
export const prepareNextTurn = (state: DuelState): DuelState => {
  const newState = { ...state };
  
  // 1. 法力成长
  newState.playerMaxMana = Math.min(GAME_CONFIG.maxMana, state.playerMaxMana + 1);
  newState.opponentMaxMana = Math.min(GAME_CONFIG.maxMana, state.opponentMaxMana + 1);
  
  // 2. 恢复法力
  newState.playerMana = newState.playerMaxMana;
  newState.opponentMana = newState.opponentMaxMana;
  
  // 3. 抽牌
  if (newState.playerHand.length < GAME_CONFIG.handSize && newState.playerDeck.length > 0) {
    const cardsToDraw = Math.min(
      GAME_CONFIG.cardsDrawnPerTurn,
      GAME_CONFIG.handSize - newState.playerHand.length,
      newState.playerDeck.length
    );
    
    // 简单抽牌
    const drawnCards = newState.playerDeck.splice(0, cardsToDraw);
    newState.playerHand.push(...drawnCards);
  }
  
  // 4. 计算费用修正 (根据当前 StatusEffects)
  const playerTangle = newState.playerEffects.find(e => e.type === 'tangle');
  const opponentTangle = newState.opponentEffects.find(e => e.type === 'tangle');
  
  newState.playerCostMod = playerTangle ? (playerTangle.value || 0) : 0;
  newState.opponentCostMod = opponentTangle ? (opponentTangle.value || 0) : 0;
  
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
