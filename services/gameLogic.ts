/**
 * Wizard Duel - 游戏逻辑引擎
 * 
 * 核心战斗系统：支持法力消耗、状态效果、Draft机制、回合制多卡连击逻辑
 */

import { 
  DuelState, SpellType, Spell, GameMode, StatusEffect, AIProfile
} from '../types';
import { 
  SPELLS, GAME_CONFIG, createDeck, getCardsForMode,
  CRIT_CHANCE, WIN_MULTIPLIER, CRIT_MULTIPLIER, shuffleArray
} from '../constants';

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
    
    playerHand,
    playerDeck: remainingDeck,
    opponentHandSize: 5,
    opponentDeck: shuffledOpponentDeck,
    
    playerEffects: [],
    opponentEffects: [],
    
    playerLastSpell: null,
    opponentLastSpell: null,
    playerCostMod: 0,
    opponentCostMod: 0,
    playerConsecutiveThunder: 0,
    opponentConsecutiveThunder: 0,
    
    roundNumber: 0, 
    playerFatigue: 0,
    opponentFatigue: 0,
    heroSkillsUsed: false
  };
};

// ============ 回合准备 ============

// ============ 法力检查 ============

export const canAffordSpell = (
  spellId: SpellType, 
  mana: number, 
  effects: StatusEffect[],
  costMod: number = 0
): { canAfford: boolean; reason?: string } => {
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

// ============ 单卡执行逻辑 (Patch 2.0 Turn-Based) ============

export const executeSpell = (
  state: DuelState,
  caster: 'player' | 'opponent',
  spellId: SpellType
): { newState: DuelState, logs: string[] } => {
  const spell = getSpellById(spellId);
  const logs: string[] = [];
  const newState = { ...state };
  
  // 1. 确定攻守方
  const isPlayer = caster === 'player';

  // 1.1 英雄技能检查 (每回合只能使用一次)
  const isHeroSkill = spellId.startsWith('hero_');
  if (isHeroSkill) {
    if (isPlayer ? newState.heroSkillsUsed : true) { // 暂时假设AI不使用英雄技能
      logs.push(isPlayer ? `本回合已使用过英雄技能` : `对手尝试使用英雄技能但失败了`);
      return { newState, logs };
    }
    // 标记已使用英雄技能
    if (isPlayer) {
      newState.heroSkillsUsed = true;
    }
  }
  const myCostMod = isPlayer ? newState.playerCostMod : newState.opponentCostMod;
  
  const targetArmor = isPlayer ? newState.opponentArmor : newState.playerArmor;
  const targetLastSpell = isPlayer ? newState.opponentLastSpell : newState.playerLastSpell;

  // 1. 特殊校验：跳过牌不做消耗检查
  if (spell.id === 'skip') {
    logs.push(isPlayer ? `你跳过了出牌` : `对手跳过了出牌`);
    // Skip 也要清除连击计数，避免逻辑死循环
    if (isPlayer) {
      newState.playerConsecutiveThunder = 0;
      newState.playerLastSpell = 'skip';
    } else {
      newState.opponentConsecutiveThunder = 0;
      newState.opponentLastSpell = 'skip';
    }
    return { newState, logs };
  }

  // 2. 法力检查 (Double Check for safety)
  const affordable = canAffordSpell(spellId, isPlayer ? newState.playerMana : newState.opponentMana, [], isPlayer ? newState.playerCostMod : newState.opponentCostMod);
  if (!affordable.canAfford) {
    logs.push(isPlayer ? `❌ 你的能量不足！` : `对手试图非法施放${spell.name}`);
    return { newState, logs };
  }
  
  const cost = Math.max(0, spell.manaCost + myCostMod);
  if (isPlayer) newState.playerMana = Math.max(0, newState.playerMana - cost);
  else newState.opponentMana = Math.max(0, newState.opponentMana - cost);

  // 3. 计算伤害与效果
  let damage = spell.damage;
  let armorGain = spell.armorGain || 0;
  
  // [New] 3.0 环境压制检查 (Counter Logic)
  // 如果对手上一张牌克制当前牌，则当前牌伤害被抵消
  let isCountered = false;
  if (targetLastSpell) {
    const lastSpellObj = getSpellById(targetLastSpell);
    if (lastSpellObj.beats === spell.id) {
      isCountered = true;
      damage = 0; // 伤害完全被抵消
      logs.push(isPlayer 
        ? `🚫 你的 [${spell.name}] 被残留的 [${lastSpellObj.name}] 抵消了！(0伤害)` 
        : `🚫 对手的 [${spell.name}] 被你的 [${lastSpellObj.name}] 完全阻挡！`);
    }
  }

  // 3.1 元素克制检查 (Exploit Weakness) - 只有未被抵消时才生效
  if (!isCountered && targetLastSpell) {
    if (spell.beats === targetLastSpell) {
      damage = Math.floor(damage * 1.5);
      logs.push(isPlayer ? `🌊 属性克制！你的${spell.name}造成暴击！` : `🔥 对手识破了你的法术！造成暴击！`);
    }
  }

  // 3.2 机制处理 (Thunder, Charge) - 被抵消时不触发连击增伤
  const myLastSpell = isPlayer ? newState.playerLastSpell : newState.opponentLastSpell;
  if (!isCountered && spell.id === 'thunder' && myLastSpell === 'thunder') {
    damage = Math.floor(damage * 1.5);
    logs.push(`⚡ 闪电连击！伤害增加50%！`);
  }

  // 3.3 状态效果 (Mechanics)
  const newEffects: StatusEffect[] = [];
  
  // 攻击性特效：如果被抵消则无法施加
  if (!isCountered) {
    if (spell.mechanic === 'burn') {
      // 限制：最多叠加3层燃烧
      const currentBurnCount = (isPlayer ? newState.opponentEffects : newState.playerEffects).filter(e => e.type === 'burn').length;
      if (currentBurnCount < 3) {
        newEffects.push({ type: 'burn', duration: 2, value: 2 });
        logs.push(isPlayer ? `🔥 对手被灼烧了` : `🔥 你被灼烧了`);
      } else {
        logs.push(`🔥 灼烧层数已满`);
      }
    }
    if (spell.mechanic === 'tangle') {
      newEffects.push({ type: 'tangle', duration: 1, value: 2 });
      logs.push(isPlayer ? `🌿 缠绕对手` : `🌿 你被缠绕`);
    }
    if (spell.mechanic === 'freeze') {
      // 检查是否有冷冻免疫 (thawed)
      const hasImmunity = (isPlayer ? newState.opponentEffects : newState.playerEffects).some(e => e.type === 'thawed');
      if (!hasImmunity) {
        newEffects.push({ type: 'frozen', duration: 1 });
        logs.push(isPlayer ? `❄️ 冻结对手` : `❄️ 你被冻结`);
      } else {
        logs.push(`🛡️ 免疫冻结！`);
      }
    }
    if (spell.mechanic === 'aoe') {
        // AOE: 基础伤害(已在damage中) + 额外伤害
        // 如果被抵消，这里也不触发
        const baseDamage = damage;
        const extraDamage = 2; // 额外伤害也应该被视为攻击的一部分
        if (isPlayer) {
          newState.opponentHP = Math.max(0, newState.opponentHP - extraDamage);
          logs.push(`💥 AOE爆炸！造成 ${extraDamage} 点溅射伤害`);
        } else {
          newState.playerHP = Math.max(0, newState.playerHP - extraDamage);
          logs.push(`💥 受到AOE爆炸！${extraDamage} 点溅射伤害`);
        }
    }
  }

  // 辅助/自身特效：即使被抵消通常也能生效 (或者也可以选择部分失效，这里暂且保留)
  if (spell.mechanic === 'heal') {
    if (isPlayer) {
      newState.playerHP = Math.min(GAME_CONFIG.maxHP, newState.playerHP + 5);
      logs.push(`💙 恢复5点生命值`);
    } else {
      newState.opponentHP = Math.min(GAME_CONFIG.maxHP, newState.opponentHP + 5);
      logs.push(`💙 对手恢复5点生命值`);
    }
  }
  
  if (spell.mechanic === 'draw') {
    // 抽牌逻辑已在回合开始处理，这里可以添加额外抽牌
    logs.push(`📚 抽2张牌`);
    // 实现抽2张牌的逻辑
    // Note: 原始代码这里只是 push log，没有实际 draw 逻辑。我们需要补充吗？
    // 原始代码: logs.push(`📚 抽2张牌`); End. 
    // 看起来原始代码就没有实现 draw effect。为了不引入意外变动，保持原样，或者...
    // 既然用户只关心抵消，我们不要动这个 unrelated bug unless requested.
  }
  
  if (spell.mechanic === 'silence') {
    // 沉默是针对对手的，如果被抵消了，沉默也应该失败？
    // 逻辑上：Silence 是解除魔法。如果被 Counter，就是解除失败。
    if (!isCountered) {
        if (isPlayer) {
          newState.opponentEffects = [];
          logs.push(`🤫 沉默对手，移除所有状态效果`);
        } else {
          newState.playerEffects = [];
          logs.push(`🤫 被沉默，移除所有状态效果`);
        }
    } else {
         logs.push(`🤫 沉默法术失效了！`);
    }
  }
  // Fortify
  if (spell.mechanic === 'fortify') {
     // Already handled via armorGain
  }

  // 4. 应用伤害 (护甲逻辑)
  if (damage > 0) {
    const absorb = Math.min(targetArmor, damage);
    const finalDamage = damage - absorb;
    
    if (isPlayer) {
      newState.opponentArmor -= absorb;
      newState.opponentHP = Math.max(0, newState.opponentHP - finalDamage);
      logs.push(`造成 ${damage} 点伤害` + (absorb > 0 ? ` (${absorb}被格挡)` : ''));
    } else {
      newState.playerArmor -= absorb;
      newState.playerHP = Math.max(0, newState.playerHP - finalDamage);
      logs.push(`受到 ${damage} 点伤害` + (absorb > 0 ? ` (${absorb}被格挡)` : ''));
    }
  }

  // 5. 应用护甲
  if (armorGain > 0) {
    if (isPlayer) {
      newState.playerArmor += armorGain;
      logs.push(`获得 ${armorGain} 护甲`);
    } else {
      newState.opponentArmor += armorGain;
      logs.push(`对手获得 ${armorGain} 护甲`);
    }
  }

  // 6. 应用状态效果给对手
  if (isPlayer) {
    newState.opponentEffects = [...newState.opponentEffects, ...newEffects];
  } else {
    newState.playerEffects = [...newState.playerEffects, ...newEffects];
  }

  // 7. 更新元数据
  if (isPlayer) {
    newState.playerLastSpell = spellId;
    const idx = newState.playerHand.indexOf(spellId);
    if (idx > -1) {
      // Create new array to trigger React update
      const newHand = [...newState.playerHand];
      newHand.splice(idx, 1);
      newState.playerHand = newHand;
    }
  } else {
    newState.opponentLastSpell = spellId;
    newState.opponentHandSize = Math.max(0, newState.opponentHandSize - 1);
  }

  return { newState, logs };
};

// ============ AI 逻辑 (Patch 2.0) ============

const pickBestSpellForAI = (state: DuelState): SpellType | null => {
   const validSpells = SPELLS.filter(s => s.id !== 'skip');
   // AI 根据当前 mana 筛选能买得起的
   const affordable = validSpells.filter(s => 
     canAffordSpell(s.id, state.opponentMana, state.opponentEffects, state.opponentCostMod).canAfford
   );
   
   if (affordable.length === 0) return null;
   
   // 优先斩杀
   const kill = affordable.find(s => s.damage >= state.playerHP + state.playerArmor);
   if (kill) return kill.id;
   
   // 优先连击
   if (state.opponentLastSpell === 'thunder') {
     const t = affordable.find(s => s.id === 'thunder');
     if (t) return t.id;
   }
   
   // 随机
   return affordable[Math.floor(Math.random() * affordable.length)].id;
};

export const executeAITurn = (state: DuelState): { newState: DuelState, logs: string[] } => {
  let currentState = { ...state };
  const logs: string[] = [];
  
  // 模拟 AI 思考和出牌
  // 限制：最多出手牌数量的牌
  let cardsPlayed = 0;
  const maxCards = currentState.opponentHandSize;
  
  // 简单模拟 Draft：回合开始时 AI 应该也获得了手牌 (+1 HandSize)
  // 我们在 prepareNextTurn 里处理了 opponentHandSize + 1
  
  while (cardsPlayed < maxCards && currentState.opponentMana > 0) {
      const spellId = pickBestSpellForAI(currentState);
      if (!spellId) break; // 买不起任何牌
      
      const result = executeSpell(currentState, 'opponent', spellId);
      currentState = result.newState;
      logs.push(...result.logs);
      cardsPlayed++;
      
      if (currentState.playerHP <= 0) break;
  }
  
  return { newState: currentState, logs };
};

// 兼容旧接口
export const getAISpell = (state: DuelState): SpellType => {
    return pickBestSpellForAI(state) || 'rock';
};

// ============ 回合准备 (Patch 2.0) ============

export const prepareNextTurn = (state: DuelState): DuelState => {
  const newState = { ...state };
  const logs: string[] = [];

  // 1. 法力成长与恢复
  newState.playerMaxMana = Math.min(GAME_CONFIG.maxMana, state.playerMaxMana + 1);
  newState.opponentMaxMana = Math.min(GAME_CONFIG.maxMana, state.opponentMaxMana + 1);
  newState.playerMana = newState.playerMaxMana;
  newState.opponentMana = newState.opponentMaxMana;
  
  // 2. 状态效果结算 (DoT, Duration--)
  let burnDmg = 0;
  const newPlayerEffects: StatusEffect[] = [];
  state.playerEffects.forEach(e => {
    if (e.type === 'burn') burnDmg += (e.value || 0);
    const nextDur = e.duration - 1;
    if (nextDur > 0) newPlayerEffects.push({ ...e, duration: nextDur });
    else if (e.type === 'frozen') {
      newPlayerEffects.push({ type: 'thawed', duration: 1 });
    }
  });
  newState.playerEffects = newPlayerEffects;
  if (burnDmg > 0) newState.playerHP = Math.max(0, newState.playerHP - burnDmg);

  let oppBurnDmg = 0;
  const newOpponentEffects: StatusEffect[] = [];
  state.opponentEffects.forEach(e => {
    if (e.type === 'burn') oppBurnDmg += (e.value || 0);
    const nextDur = e.duration - 1;
    if (nextDur > 0) newOpponentEffects.push({ ...e, duration: nextDur });
    else if (e.type === 'frozen') {
      newOpponentEffects.push({ type: 'thawed', duration: 1 });
    }
  });
  newState.opponentEffects = newOpponentEffects;
  if (oppBurnDmg > 0) newState.opponentHP = Math.max(0, newState.opponentHP - oppBurnDmg);

  // 3. 计算费用修正 (Tangle)
  const playerTangle = newState.playerEffects.find(e => e.type === 'tangle');
  newState.playerCostMod = playerTangle ? (playerTangle.value || 0) : 0;
  
  const oppTangle = newState.opponentEffects.find(e => e.type === 'tangle');
  newState.opponentCostMod = oppTangle ? (oppTangle.value || 0) : 0;

  // 4. 回合数++
  newState.roundNumber += 1;

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

export const determineWinner = (p: SpellType, o: SpellType) => 'DRAW'; // Deprecated stub

// ============ AI对手逻辑 ============

// 已在 types.ts 中定义，此处删除重复定义以避免冲突


export const AI_PROFILES: AIProfile[] = [
  {
    name: '新手法师',
    difficulty: 'easy',
    description: '基础AI，随机选择卡牌',
    avatar: '/avatars/ai-easy.webp',
    strategy: 'balanced'
  },
  {
    name: '战斗法师',
    difficulty: 'medium',
    description: '偏好高伤害卡牌',
    avatar: '/avatars/ai-medium.webp',
    strategy: 'aggressive'
  },
  {
    name: '防御法师',
    difficulty: 'hard',
    description: '优先使用控制和治疗',
    avatar: '/avatars/ai-hard.webp',
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
    opponentHandSize: aiHand.length, // AI手牌数量

    playerEffects: [],
    opponentEffects: [],

    playerLastSpell: null,
    opponentLastSpell: null,
    playerCostMod: 0,
    opponentCostMod: 0,
    playerConsecutiveThunder: 0,
    opponentConsecutiveThunder: 0,

    roundNumber: 0,
    isTavernMode: true,
    aiProfile,
    opponentDeck: shuffledAIDeck,

    playerFatigue: 0,
    opponentFatigue: 0,
    heroSkillsUsed: false
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
