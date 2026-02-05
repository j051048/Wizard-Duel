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
  const val = spell.cardSet === 'classic' ? 1 : 2;
  return [{ 
    type: 'ADD_EFFECT', 
    target, 
    value: { type: 'burn', duration: 2, value: val },
    description: `🔥 ${target === 'player' ? '你' : '对手'}被灼烧了 (每回合-${val}HP)`
  }];
};

const tangle: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  return [{ 
    type: 'ADD_EFFECT', 
    target, 
    value: { type: 'tangle', duration: 1, value: 2 },
    description: `🌿 ${target === 'player' ? '你' : '对手'}被缠绕了 (下张牌费用+2)`
  }];
};

const freeze: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  const targetEffects = target === 'player' ? state.playerEffects : state.opponentEffects;
  if (targetEffects.some(e => e.type === 'thawed')) {
    return [{ type: 'MESSAGE', target: 'system', description: '🛡️ 免疫冻结！' }];
  }
  
  return [{ 
    type: 'ADD_EFFECT', 
    target, 
    value: { type: 'frozen', duration: 1 },
    description: `❄️ ${target === 'player' ? '你' : '对手'}被冻结了`
  }];
};

const heal: MechanicHandler = (state, caster) => {
  return [{ 
    type: 'HP_CHANGE', 
    target: caster, 
    value: 5, 
    description: `💙 ${caster === 'player' ? '你' : '对手'}恢复了 5 点生命值`
  }];
};

const aoe: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  return [{ 
    type: 'HP_CHANGE', 
    target, 
    value: -2, 
    description: `💥 AOE爆炸！额外造成 2 点穿透伤害`
  }];
};

const draw: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) {
    return [{ type: 'MESSAGE', target: 'system', description: `🤫 ${caster === 'player' ? '你' : '对手'}的抽牌效果被抵消了` }];
  }
  const count = spell.id === 'hero_vine' ? 2 : 2; // 统一为抽2
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
