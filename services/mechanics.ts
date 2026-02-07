/**
 * Wizard Duel - 卡牌机制定义
 * 
 * 将所有卡牌机制的效果逻辑抽离为独立模块，便于维护和扩展。
 */

import { DuelState, Spell, GameAction } from '../types';

// ============ 机制效果生成器类型 ============
export type MechanicHandler = (
  state: DuelState,
  caster: 'player' | 'opponent',
  spell: Spell,
  isCountered: boolean,
  isCrit: boolean
) => GameAction[];

// ============ 机制定义 ============

const burn: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  const val = spell.value || (spell.cardSet === 'classic' ? 1 : 2);
  const dur = spell.effectDuration || 2;
  return [{ 
    type: 'ADD_EFFECT', 
    target, 
    value: { type: 'burn', duration: dur, value: val },
    description: `🔥 ${target === 'player' ? '你' : '对手'}被灼烧了 (每回合-${val}HP)`
  }];
};

const tangle: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  const val = spell.value || 1;
  const dur = spell.effectDuration || 2;
  return [{ 
    type: 'ADD_EFFECT', 
    target, 
    value: { type: 'tangle', duration: dur, value: val }, // Duration 2 to survive turn switch
    description: `🌿 ${target === 'player' ? '你' : '对手'}被缠绕了 (下张牌费用+${val})`
  }];
};

/**
 * 冻结机制 (Balanced v2.0)
 * 
 * 机制说明：
 * - 冻结使目标跳过下一次行动机会
 * - effectDuration 现在统一为 1（跳过一次行动）
 * - 多个冻结效果不叠加持续时间（刷新机制）
 * - 免疫冻结状态 (thawed) 可以抵挡冻结
 */
const freeze: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  const targetEffects = target === 'player' ? state.playerEffects : state.opponentEffects;
  
  // 检查免疫状态
  if (targetEffects.some(e => e.type === 'thawed')) {
    return [{ type: 'MESSAGE', target: 'system', description: '🛡️ 免疫冻结！' }];
  }
  
  // [P0 Balance] 冻结统一为 1 回合，不再支持多回合冻结
  // 即使卡牌设置了 effectDuration > 1，也强制为 1
  const dur = Math.min(spell.effectDuration || 1, 1);
  
  return [{ 
    type: 'ADD_EFFECT', 
    target, 
    value: { type: 'frozen', duration: dur },
    description: `❄️ ${target === 'player' ? '你' : '对手'}被冻结了！(跳过下一次行动)`
  }];
};

const heal: MechanicHandler = (state, caster, spell) => {
  const amount = spell.value || 3;
  return [{ 
    type: 'HP_CHANGE', 
    target: caster, 
    value: amount, 
    description: `💙 ${caster === 'player' ? '你' : '对手'}恢复了 ${amount} 点生命值`
  }];
};

const aoe: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  return [{ 
    type: 'HP_CHANGE', 
    target, 
    value: -1, // [Balance] 穿透伤害从 2 降为 1
    description: `💥 AOE爆炸！额外造成 1 点穿透伤害`
  }];
};

const draw: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) {
    return [{ type: 'MESSAGE', target: 'system', description: `🤫 ${caster === 'player' ? '你' : '对手'}的抽牌效果被抵消了` }];
  }
  const count = spell.value || (spell.id === 'hero_vine' ? 2 : 2); 
  return [
    { type: 'DRAW_CARD', target: caster, value: count, description: `📚 ${caster === 'player' ? '你' : '对手'}从卡组抽取了 ${count} 张牌` }
  ];
};

const silence: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) {
    return [{ type: 'MESSAGE', target: 'system', description: '🤫 沉默失效' }];
  }
  
  // 现在的逻辑：净化自身负面状态 + 抽 1 张牌作为补偿
  return [
    { 
      type: 'REMOVE_EFFECT', 
      target: caster, 
      subType: 'all', 
      description: `🤫 净化！${caster === 'player' ? '你' : '对手'}移除了所有负面状态` 
    },
    {
      type: 'DRAW_CARD',
      target: caster,
      value: 1,
      description: `📚 净化补偿：抽取 1 张牌`
    }
  ];
};

// ============ 机制注册表 ============

export const MECHANIC_DEFINITIONS: Record<string, MechanicHandler> = {
  burn,
  tangle,
  freeze,
  heal,
  aoe,
  draw,
  silence
};

/**
 * 获取机制处理器
 * @param mechanic 机制名称
 * @returns 机制处理函数，如果不存在则返回 undefined
 */
export const getMechanicHandler = (mechanic: string): MechanicHandler | undefined => {
  return MECHANIC_DEFINITIONS[mechanic];
};
