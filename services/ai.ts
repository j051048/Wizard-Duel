/**
 * Wizard Duel - AI 决策引擎
 * 
 * 包含 AI 选牌策略和回合执行逻辑
 */

import { DuelState, SpellType, GameCommand } from '../types';
import { getSpellById, canAffordSpell, executeSpell, checkGameOver } from './gameLogic';
import { cloneDuelState } from './stateUtils';
// [P1 Fix #10] 使用 ESM import 替代 require
import { getElementType, doesElementBeat } from './combat/elementSystem';
import type { Minion } from '../types';

// ============ [P1 Fix #12] 随从威胁评估 ============

/**
 * 评估随从威胁度
 * 用于 AI 决定攻击优先级
 * 
 * 注意：Minion 类型使用 hp/atk 而非 health/attack
 */
export const evaluateMinionThreat = (minion: Minion, _gameState: DuelState): number => {
  let threat = 0;
  
  // 基础威胁 = 攻击力 * 2 + 生命值
  threat += minion.atk * 2;
  threat += minion.hp;
  
  // 根据随从类型增加威胁度（简化版，无 abilities 字段时使用 type）
  const minionType = minion.type?.toLowerCase() || '';
  if (minionType.includes('taunt')) threat += 15;      // 嘲讽随从优先级最高
  if (minionType.includes('poison')) threat += 20;     // 剧毒随从极度危险
  if (minionType.includes('divine')) threat += 10;     // 圣盾需要额外处理
  if (minionType.includes('wind')) threat += minion.atk; // 风怒翻倍攻击
  if (minionType.includes('lifesteal')) threat += 8;   // 吸血延长对手续航
  
  return threat;
};

/**
 * 选择随从攻击目标
 * 优先攻击高威胁度的随从
 */
export const selectMinionTarget = (
  _attacker: Minion,
  targets: Minion[],
  gameState: DuelState
): Minion | null => {
  if (targets.length === 0) return null;
  
  // 必须攻击嘲讽随从
  const taunters = targets.filter(t => t.type?.toLowerCase().includes('taunt'));
  if (taunters.length > 0) {
    return taunters.sort((a, b) => 
      evaluateMinionThreat(b, gameState) - evaluateMinionThreat(a, gameState)
    )[0];
  }
  
  // 按威胁度排序，攻击最高威胁
  return targets.sort((a, b) => 
    evaluateMinionThreat(b, gameState) - evaluateMinionThreat(a, gameState)
  )[0];
};

// ============ AI 决策策略 ============

/**
 * AI 选择最佳卡牌
 * [P0 Fix] 添加 excludeSpells 参数，防止 AI 重复选择同一张牌导致无限循环
 */
export const pickBestSpellForAI = (
  state: DuelState, 
  excludeSpells: Set<string> = new Set()
): SpellType | null => {
  // 再次校验冻结 (Double Check)
  if (state.opponentEffects.some(e => e.type === 'frozen')) return null;

  // AI 从其真实手牌中选择，排除已打出的牌
  const availableInHand = state.opponentHand.filter(s => !excludeSpells.has(s));
  const affordable = availableInHand.filter(s => 
    canAffordSpell(s, state.opponentMana, state.opponentEffects, state.opponentCostMod).canAfford
  );
  
  // 1. 优先英雄技能 (如果还没用过)
  // [P0 Fix] 动态选择英雄技能，不再硬编码 hero_fire
  if (!state.opponentHeroSkillUsed) {
    // 根据AI牌组元素分布推断最佳英雄技能
    const heroSkills: SpellType[] = ['hero_fire', 'hero_vine', 'hero_ice', 'hero_thunder', 'hero_rock'];
    
    // 统计对手手牌中各元素数量，选择匹配最多的英雄技能
    const elementCounts: Record<string, number> = {};
    state.opponentHand.forEach(cardId => {
      const el = cardId.split(/\d/)[0]; // fire, vine, ice, thunder, rock
      elementCounts[el] = (elementCounts[el] || 0) + 1;
    });
    
    // 按手牌元素匹配度排序英雄技能
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

  // 2. 优先斩杀：如果能一击击杀玩家
  const killShot = affordable.find(s => {
    const spell = getSpellById(s);
    return spell.damage >= state.playerHP + state.playerArmor;
  });
  if (killShot) return killShot;
  
  // 3. 低血量时优先防御或治疗
  if (state.opponentHP <= 10) {
    // 优先治疗
    const healSpell = affordable.find(s => getSpellById(s).mechanic === 'heal');
    if (healSpell) return healSpell;
    
    // 其次叠甲
    const armorSpell = affordable.find(s => (getSpellById(s).armorGain || 0) >= 3);
    if (armorSpell) return armorSpell;
  }
  
  // 4. 雷电连击优化 - [P0 Fix] 只检查雷系法术，不包括英雄技能
  if (state.opponentLastSpell && state.opponentLastSpell.startsWith('thunder') && !state.opponentLastSpell.startsWith('hero_')) {
    const thunderSpells = affordable.filter(s => s.startsWith('thunder') && !s.startsWith('hero_'));
    if (thunderSpells.length > 0) {
      // 选择伤害最高的雷电
      thunderSpells.sort((a, b) => getSpellById(b).damage - getSpellById(a).damage);
      return thunderSpells[0];
    }
  }
  
  // 5. 元素克制：如果知道玩家上次用了什么，尝试克制
  // [P1 Fix #10] 使用顶部导入的元素系统函数
  if (state.playerLastSpell) {
    const targetElement = getElementType(state.playerLastSpell);
    const counterSpell = affordable.find(s => {
      const attackerElement = getElementType(s);
      return doesElementBeat(attackerElement, targetElement) && getSpellById(s).damage > 0;
    });
    if (counterSpell) {
      return counterSpell;
    }
  }
  
  // 6. 优先高伤害卡牌（性价比考虑）
  const damageSpells = affordable.filter(s => getSpellById(s).damage > 0);
  if (damageSpells.length > 0) {
    // 按伤害/费用比排序
    damageSpells.sort((a, b) => {
      const spellA = getSpellById(a);
      const spellB = getSpellById(b);
      const ratioA = spellA.damage / Math.max(1, spellA.manaCost);
      const ratioB = spellB.damage / Math.max(1, spellB.manaCost);
      return ratioB - ratioA;
    });
    // 有一定随机性，不总是选最优
    const topChoices = damageSpells.slice(0, Math.min(3, damageSpells.length));
    return topChoices[Math.floor(Math.random() * topChoices.length)];
  }
  
  // 7. 随机选择
  if (affordable.length > 0) {
    return affordable[Math.floor(Math.random() * affordable.length)];
  }
  
  return null;
};

// ============ AI 回合执行 ============

/**
 * 执行 AI 回合
 * - 自动选牌并执行
 * - 包含防无限循环保护
 */
export const executeAITurn = (state: DuelState): { 
  newState: DuelState, 
  logs: string[], 
  commands: GameCommand[] 
} => {
  // [P0 Fix] 完整深拷贝避免状态污染
  let currentState: DuelState = cloneDuelState(state);
  const logs: string[] = [];
  const commands: GameCommand[] = [];

  // [Fix] 检查冻结状态
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
  
  // 模拟 AI 思考和出牌
  let cardsPlayed = 0;
  const maxCards = currentState.opponentHandSize;
  
  // [P0 Fix] 添加已打出卡牌追踪，防止重复选择同一张牌导致无限循环
  const playedThisTurn = new Set<string>();
  
  // 🔧 添加硬性循环上限，防止无限循环（例如全0费卡场景）
  const MAX_ACTIONS = 20;
  let actionCount = 0;
  
  while (cardsPlayed < maxCards && currentState.opponentMana >= 0 && actionCount < MAX_ACTIONS) {
    actionCount++;
    
    // [P0 Fix] 传入已打出卡牌集合，防止重复选择
    const spellId = pickBestSpellForAI(currentState, playedThisTurn);
    if (!spellId) break; 
    
    // [P0 Fix] 记录已选择的卡牌
    playedThisTurn.add(spellId);
    
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

// ============ 兼容旧接口 ============

/**
 * @deprecated 使用 pickBestSpellForAI 替代
 */
export const getAISpell = (state: DuelState): SpellType => {
  return pickBestSpellForAI(state) || 'rock';
};
