/**
 * Wizard Duel - 游戏逻辑引擎
 * 
 * 核心战斗系统：支持法力消耗、状态效果、Draft机制、回合制多卡连击逻辑
 */

import { 
  DuelState, SpellType, Spell, GameMode, StatusEffect, AIProfile, GameCommand, GameAction
} from '../types.ts';
import { 
  SPELLS, GAME_CONFIG, createDeck, getCardsForMode,
  CRIT_CHANCE, WIN_MULTIPLIER, CRIT_MULTIPLIER, shuffleArray, getMechanicName
} from '../constants.ts';
import { GameSequenceExecutor } from './sequence';

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


// ============ 卡牌逻辑配置 (New 3.0 Data-Driven) ============

const MECHANIC_DEFINITIONS: Record<string, (state: DuelState, caster: 'player' | 'opponent', spell: Spell, isCountered: boolean, isCrit: boolean) => GameAction[]> = {
  burn: (state, caster, spell, countered) => {
    if (countered) return [];
    const target = caster === 'player' ? 'opponent' : 'player';
    const val = spell.cardSet === 'classic' ? 1 : 2;
    return [{ 
      type: 'ADD_EFFECT', 
      target, 
      value: { type: 'burn', duration: 2, value: val },
      description: `🔥 ${target === 'player' ? '你' : '对手'}被灼烧了 (每回合-${val}HP)`
    }];
  },
  tangle: (state, caster, spell, countered) => {
    if (countered) return [];
    const target = caster === 'player' ? 'opponent' : 'player';
    return [{ 
      type: 'ADD_EFFECT', 
      target, 
      value: { type: 'tangle', duration: 1, value: 2 },
      description: `🌿 ${target === 'player' ? '你' : '对手'}被缠绕了 (下张牌费用+2)`
    }];
  },
  freeze: (state, caster, spell, countered) => {
    if (countered) return [];
    const target = caster === 'player' ? 'opponent' : 'player';
    const targetEffects = target === 'player' ? state.playerEffects : state.opponentEffects;
    if (targetEffects.some(e => e.type === 'thawed')) return [{ type: 'MESSAGE', target: 'system', description: '🛡️ 免疫冻结！' }];
    
    return [{ 
      type: 'ADD_EFFECT', 
      target, 
      value: { type: 'frozen', duration: 1 },
      description: `❄️ ${target === 'player' ? '你' : '对手'}被冻结了`
    }];
  },
  heal: (state, caster) => {
    return [{ 
      type: 'HP_CHANGE', 
      target: caster, 
      value: 5, 
      description: `💙 ${caster === 'player' ? '你' : '对手'}恢复了 5 点生命值`
    }];
  },
  aoe: (state, caster, spell, countered) => {
    if (countered) return [];
    const target = caster === 'player' ? 'opponent' : 'player';
    return [{ 
      type: 'HP_CHANGE', 
      target, 
      value: -2, 
      description: `💥 AOE爆炸！额外造成 2 点穿透伤害`
    }];
  },
  draw: (state, caster) => {
    return [
        { type: 'DRAW_CARD', target: caster, value: 2, description: `📚 ${caster === 'player' ? '你' : '对手'}抽了2张牌` }
    ];
  },
  silence: (state, caster, spell, countered) => {
    if (countered) return [{ type: 'MESSAGE', target: 'system', description: '🤫 沉默失效' }];
    const target = caster === 'player' ? 'opponent' : 'player';
    return [{ 
        type: 'REMOVE_EFFECT', 
        target, 
        subType: 'all', 
        description: `🤫 沉默${target === 'player' ? '你' : '对手'}，移除所有效果` 
    }];
  }
};

// ============ 单卡执行逻辑 (完全重构) ============

export const executeSpell = (
  state: DuelState,
  caster: 'player' | 'opponent',
  spellId: SpellType
): { newState: DuelState, logs: string[], command: GameCommand } => {
  const spell = getSpellById(spellId);
  const isPlayer = caster === 'player';
  const target = isPlayer ? 'opponent' : 'player';
  
  const actions: GameAction[] = [];
  
  // 1. 英雄技能占用逻辑
  if (spellId.startsWith('hero_')) {
    if (state.heroSkillsUsed) return { 
        newState: state, 
        logs: ['本回合已使用过英雄技能'], 
        command: { id: 'fail', caster, actions: [] } 
    };
    state.heroSkillsUsed = true; 
  }

  // 2. 费用计算与扣除
  const costMod = isPlayer ? state.playerCostMod : state.opponentCostMod;
  const finalCost = spell.id === 'skip' ? 0 : Math.max(0, spell.manaCost + costMod);
  actions.push({ type: 'MANA_CHANGE', target: caster, value: -finalCost });

  if (spell.id === 'skip') {
      const skipCmd: GameCommand = { id: 'skip', caster, actions: [{ type: 'MESSAGE', target: 'system', description: isPlayer ? '你跳过了出牌' : '对手跳过了出牌' }] };
      const res = GameSequenceExecutor.executeCommand(state, skipCmd);
      return { newState: res.state, logs: res.logs, command: skipCmd };
  }

  // 3. 克制判定 (Counter/Crit)
  const targetLastId = isPlayer ? state.opponentLastSpell : state.playerLastSpell;
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

  // 连击 (Charge)
  const myLastId = isPlayer ? state.playerLastSpell : state.opponentLastSpell;
  const isThunder = (id: string | null) => id && (id.startsWith('thunder') || id === 'hero_thunder');
  if (!countered && spell.mechanic === 'charge' && isThunder(spell.id) && isThunder(myLastId)) {
      dmg = Math.floor(dmg * 1.5);
      actions.push({ type: 'MESSAGE', target: 'system', description: `⚡ 闪电连击！伤害增加50%！` });
  }

  // 5. 组合 Actions
  if (dmg > 0) {
      actions.push({ type: 'HP_CHANGE', target, value: -dmg, description: `${isPlayer ? '造成' : '受到'} ${dmg} 点伤害` });
  }
  if ((spell.armorGain || 0) > 0) {
      actions.push({ type: 'ARMOR_CHANGE', target: caster, value: spell.armorGain, description: `${isPlayer ? '获得' : '对手获得'} ${spell.armorGain} 护甲` });
  }

  // 6. 机制特效 Actions
  const mechanicGenerator = MECHANIC_DEFINITIONS[spell.mechanic];
  if (mechanicGenerator) {
      actions.push(...mechanicGenerator(state, caster, spell, countered, crit));
  }

  // 7. 特殊操作: 手牌移除 & LastSpell 更新
  const cmd: GameCommand = { id: `cast_${spellId}`, sourceSpell: spellId, caster, actions };
  let { state: newState, logs } = GameSequenceExecutor.executeCommand(state, cmd);
  
  if (isPlayer) {
      newState.playerLastSpell = spellId;
      newState.playerHand = newState.playerHand.filter((id, i) => i !== newState.playerHand.indexOf(spellId));
  } else {
      newState.opponentLastSpell = spellId;
      newState.opponentHandSize = Math.max(0, newState.opponentHandSize - 1);
  }

  return { newState, logs, command: cmd };
};


// ============ AI 逻辑 (Patch 2.0) ============

const pickBestSpellForAI = (state: DuelState): SpellType | null => {
   // 再次校验冻结 (Double Check)
   if (state.opponentEffects.some(e => e.type === 'frozen')) return null;

   const validSpells = SPELLS.filter(s => s.id !== 'skip');
   // AI 根据当前 mana 筛选能买得起的
   const affordable = validSpells.filter(s => 
     canAffordSpell(s.id, state.opponentMana, state.opponentEffects, state.opponentCostMod).canAfford
   );
   
   if (affordable.length === 0) return null;
   
   // 1. 优先英雄技能 (如果还没用过)
   if (!state.heroSkillsUsed) {
      // 对手根据难度或随机选择一个英雄技能调用（逻辑上AI目前没有手牌中的技能卡，所以直接模拟ID）
      const heroSkillId: SpellType = 'hero_fire'; 
      if (canAffordSpell(heroSkillId, state.opponentMana, state.opponentEffects, state.opponentCostMod).canAfford) {
        return heroSkillId;
      }
   }

   // 2. 优先斩杀：如果能一击击杀玩家
   const killShot = affordable.find(s => s.damage >= state.playerHP + state.playerArmor);
   if (killShot) return killShot.id;
   
   // 3. 低血量时优先防御或治疗
   if (state.opponentHP <= 10) {
     // 优先治疗
     const healSpell = affordable.find(s => s.mechanic === 'heal');
     if (healSpell) return healSpell.id;
     
     // 其次叠甲
     const armorSpell = affordable.find(s => (s.armorGain || 0) >= 5);
     if (armorSpell) return armorSpell.id;
   }
   
   // 4. 雷电连击优化
   if (state.opponentLastSpell && (state.opponentLastSpell.startsWith('thunder') || state.opponentLastSpell === 'hero_thunder')) {
     const thunderSpells = affordable.filter(s => s.id.startsWith('thunder'));
     if (thunderSpells.length > 0) {
       // 选择伤害最高的雷电
       thunderSpells.sort((a, b) => b.damage - a.damage);
       return thunderSpells[0].id;
     }
   }
   
   // 5. 元素克制：如果知道玩家上次用了什么，尝试克制
   if (state.playerLastSpell) {
     const counterSpell = affordable.find(s => s.beats === state.playerLastSpell);
     if (counterSpell && counterSpell.damage > 0) {
       return counterSpell.id;
     }
   }
   
   // 6. 优先高伤害卡牌（性价比考虑）
   const damageSpells = affordable.filter(s => s.damage > 0);
   if (damageSpells.length > 0) {
     // 按伤害/费用比排序
     damageSpells.sort((a, b) => {
       const ratioA = a.damage / Math.max(1, a.manaCost);
       const ratioB = b.damage / Math.max(1, b.manaCost);
       return ratioB - ratioA;
     });
     // 有一定随机性，不总是选最优
     const topChoices = damageSpells.slice(0, Math.min(3, damageSpells.length));
     return topChoices[Math.floor(Math.random() * topChoices.length)].id;
   }
   
   // 7. 随机选择
   return affordable[Math.floor(Math.random() * affordable.length)].id;
};

export const executeAITurn = (state: DuelState): { newState: DuelState, logs: string[], commands: GameCommand[] } => {
  // 🔧 深拷贝避免状态污染
  let currentState = { 
    ...state,
    playerEffects: [...state.playerEffects],
    opponentEffects: [...state.opponentEffects],
    opponentDeck: [...state.opponentDeck],
    playerHand: [...state.playerHand],
  };
  const logs: string[] = [];
  const commands: GameCommand[] = [];

  // [Fix] 检查冻结状态
  const isFrozen = currentState.opponentEffects.some(e => e.type === 'frozen');
  if (isFrozen) {
     const freezeCmd: GameCommand = { id: 'ai_freeze', caster: 'opponent', actions: [{ type: 'MESSAGE', target: 'system', description: '❄️ 对手被彻底冻结，无法行动！' }] };
     logs.push('❄️ 对手被彻底冻结，无法行动！');
     return { newState: currentState, logs, commands: [freezeCmd] };
  }
  
  // 模拟 AI 思考和出牌
  let cardsPlayed = 0;
  const maxCards = currentState.opponentHandSize;
  
  // 🔧 添加硬性循环上限，防止无限循环（例如全0费卡场景）
  const MAX_ACTIONS = 20;
  let actionCount = 0;
  let lastMana = currentState.opponentMana;
  
  while (cardsPlayed < maxCards && currentState.opponentMana >= 0 && actionCount < MAX_ACTIONS) {
      actionCount++;
      
      const spellId = pickBestSpellForAI(currentState);
      if (!spellId) break; 
      
      const result = executeSpell(currentState, 'opponent', spellId);
      
      // 🔧 检测是否真的执行了（法力或手牌变化）
      const manaChanged = result.newState.opponentMana !== currentState.opponentMana;
      const handChanged = result.newState.opponentHandSize !== currentState.opponentHandSize;
      
      if (!manaChanged && !handChanged && result.logs.length === 0) {
         // 没有任何变化，中断防止死循环
         break;
      }

      currentState = result.newState;
      logs.push(...result.logs);
      commands.push(result.command);
      cardsPlayed++;
      
      // 🔧 使用统一死亡检查
      const gameOver = checkGameOver(currentState);
      if (gameOver) break;
  }
  
  if (actionCount >= MAX_ACTIONS) {
    logs.push('⚠️ AI 行动次数达到上限');
  }
  
  return { newState: currentState, logs, commands };
};

// 兼容旧接口
export const getAISpell = (state: DuelState): SpellType => {
    return pickBestSpellForAI(state) || 'rock';
};

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

export const prepareNextTurn = (state: DuelState): DuelState => {
  const newState = { 
    ...state,
    // 深拷贝数组，避免状态污染
    playerEffects: [...state.playerEffects],
    opponentEffects: [...state.opponentEffects],
    playerHand: [...state.playerHand],
    playerDeck: [...state.playerDeck],
    opponentDeck: [...state.opponentDeck],
  };
  
  // 🔧 重置英雄技能使用状态（每回合可用1次）
  newState.heroSkillsUsed = false;
  
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
