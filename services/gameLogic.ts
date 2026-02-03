/**
 * Wizard Duel - 游戏逻辑引擎
 * 
 * 核心战斗系统：支持法力消耗、状态效果、Draft机制、回合制多卡连击逻辑
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

// ============ Draft Logic (Patch 2.0) ============

export const generateDraftOptions = (count: number = 3): SpellType[] => {
  const options: SpellType[] = [];
  const pool = SPELLS.filter(s => s.id !== 'skip');
  // 简单随机，允许重复
  for (let i = 0; i < count; i++) {
    const random = pool[Math.floor(Math.random() * pool.length)];
    options.push(random.id);
  }
  return options;
};

// ============ 初始化对战状态 ============

export const createInitialDuelState = (): DuelState => {
  // 初始手牌: 随机3张
  const playerHand = generateDraftOptions(3);
  
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
    playerDeck: [], // 不使用Deck
    opponentHandSize: 3,
    draftOptions: [], // 初始为空

    playerEffects: [],
    opponentEffects: [],
    
    playerLastSpell: null,
    opponentLastSpell: null,
    playerCostMod: 0,
    opponentCostMod: 0,
    playerConsecutiveThunder: 0,
    opponentConsecutiveThunder: 0,
    
    roundNumber: 0, // 0表示未开始
  };
};

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
  // const myMana = isPlayer ? newState.playerMana : newState.opponentMana; // Already checked outside? No, update here.
  const myCostMod = isPlayer ? newState.playerCostMod : newState.opponentCostMod;
  
  const targetArmor = isPlayer ? newState.opponentArmor : newState.playerArmor;
  const targetLastSpell = isPlayer ? newState.opponentLastSpell : newState.playerLastSpell;

  // 2. 扣除费用 (Skip不扣费)
  if (spellId !== 'skip') {
    const cost = Math.max(0, spell.manaCost + myCostMod);
    if (isPlayer) newState.playerMana = Math.max(0, newState.playerMana - cost);
    else newState.opponentMana = Math.max(0, newState.opponentMana - cost);
  } else {
    // Skip 牌逻辑：不做任何事，或者回蓝？通过“Pass”按钮实现回蓝/Hoard。
    // 如果用户打出 'skip' 卡（如果有的话），只是空过。
    logs.push(isPlayer ? `你跳过了出牌` : `对手跳过了出牌`);
    return { newState, logs };
  }

  // 3. 计算伤害与效果
  let damage = spell.damage;
  let armorGain = spell.armorGain || 0;
  
  // 3.1 元素克制检查 (Exploit Weakness)
  if (targetLastSpell) {
    if (spell.beats === targetLastSpell) {
      damage = Math.floor(damage * 1.5);
      logs.push(isPlayer ? `🌊 属性克制！你的${spell.name}造成暴击！` : `🔥 对手识破了你的法术！造成暴击！`);
    }
  }

  // 3.2 机制处理 (Thunder, Charge)
  const myLastSpell = isPlayer ? newState.playerLastSpell : newState.opponentLastSpell;
  if (spell.id === 'thunder' && myLastSpell === 'thunder') {
    damage *= 2;
    logs.push(`⚡ 闪电连击！伤害翻倍！`);
  }

  // 3.3 状态效果 (Mechanics)
  const newEffects: StatusEffect[] = [];
  if (spell.mechanic === 'burn') {
    newEffects.push({ type: 'burn', duration: 2, value: 2 });
    logs.push(isPlayer ? `🔥 对手被灼烧了` : `🔥 你被灼烧了`);
  }
  if (spell.mechanic === 'tangle') {
    newEffects.push({ type: 'tangle', duration: 1, value: 2 });
    logs.push(isPlayer ? `🌿 缠绕对手` : `🌿 你被缠绕`);
  }
  if (spell.mechanic === 'freeze') {
    newEffects.push({ type: 'frozen', duration: 1 });
    logs.push(isPlayer ? `❄️ 冻结对手` : `❄️ 你被冻结`);
  }
  // Fortify
  if (spell.mechanic === 'fortify') {
     // Already handled via armorGain, maybe add extra buffer?
     // armorGain is predefined in constants usually.
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
  
  // 1. 法力成长与恢复
  newState.playerMaxMana = Math.min(GAME_CONFIG.maxMana, state.playerMaxMana + 1);
  newState.opponentMaxMana = Math.min(GAME_CONFIG.maxMana, state.opponentMaxMana + 1);
  newState.playerMana = newState.playerMaxMana;
  newState.opponentMana = newState.opponentMaxMana;
  
  // 2. 状态效果结算 (DoT, Duration--)
  let burnDmg = 0;
  newState.playerEffects = newState.playerEffects.filter(e => {
    if (e.type === 'burn') burnDmg += (e.value || 0);
    e.duration -= 1;
    return e.duration > 0; 
  });
  if (burnDmg > 0) newState.playerHP = Math.max(0, newState.playerHP - burnDmg);

  let oppBurnDmg = 0;
  newState.opponentEffects = newState.opponentEffects.filter(e => {
    if (e.type === 'burn') oppBurnDmg += (e.value || 0);
    e.duration -= 1;
    return e.duration > 0;
  });
  if (oppBurnDmg > 0) newState.opponentHP = Math.max(0, newState.opponentHP - oppBurnDmg);

  // 3. 计算费用修正 (Tangle)
  const playerTangle = newState.playerEffects.find(e => e.type === 'tangle');
  newState.playerCostMod = playerTangle ? (playerTangle.value || 0) : 0;
  
  const oppTangle = newState.opponentEffects.find(e => e.type === 'tangle');
  newState.opponentCostMod = oppTangle ? (oppTangle.value || 0) : 0;

  // 4. 对手补牌 (模拟 Draft 1张)
  newState.opponentHandSize = Math.min(10, newState.opponentHandSize + 1);

  // 5. 回合数++
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
  return generateDraftOptions(1)[0];
};

export const determineWinner = (p: SpellType, o: SpellType) => 'DRAW'; // Deprecated stub
