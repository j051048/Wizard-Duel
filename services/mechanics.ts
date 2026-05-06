/**
 * Wizard Duel - 卡牌机制定义
 *
 * 将所有卡牌机制的效果逻辑抽离为独立模块，便于维护和扩展。
 */

import { DuelState, Spell, GameAction } from '../types';
import type { MinionTemplate } from '../types/card';
import { MINION_DATA } from '../data/spells';

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
 * [P1 Fix #9] 移除硬限制，由卡牌数据控制
 * - 冻结使目标跳过行动机会
 * - effectDuration 由卡牌数据定义（默认1回合）
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
  
  // [P1 Fix #9] 使用卡牌定义的 effectDuration，不再硬编码限制
  const dur = spell.effectDuration || 1;
  
  return [{ 
    type: 'ADD_EFFECT', 
    target, 
    value: { type: 'frozen', duration: dur },
    description: `❄️ ${target === 'player' ? '你' : '对手'}被冻结了！${dur > 1 ? `(${dur}回合)` : '(跳过下一次行动)'}`
  }];
};

/**
 * 治疗机制
 * [P2 Fix #21] 添加治疗溢出提示
 */
const heal: MechanicHandler = (state, caster, spell) => {
  const amount = spell.value || 3;
  const currentHP = caster === 'player' ? state.playerHP : state.opponentHP;
  const maxHP = 30; // GAME_CONFIG.maxHP
  const actualHeal = Math.min(amount, maxHP - currentHP);
  const isOverheal = currentHP >= maxHP;
  
  const actions: GameAction[] = [];
  
  if (isOverheal) {
    // [P2 Fix #21] 溢出提示
    actions.push({ 
      type: 'MESSAGE', 
      target: 'system', 
      description: `❤️ ${caster === 'player' ? '你的' : '对手的'}生命值已满，无法恢复！`
    });
  } else {
    actions.push({ 
      type: 'HP_CHANGE', 
      target: caster, 
      value: actualHeal, 
      description: `💙 ${caster === 'player' ? '你' : '对手'}恢复了 ${actualHeal} 点生命值${actualHeal < amount ? ` (溢出 ${amount - actualHeal})` : ''}`
    });
  }
  
  return actions;
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

/**
 * [P1 Fix #13] 幸运币机制
 * 0费使用，获得1点临时法力水晶（本回合）
 */
const luckCoin: MechanicHandler = (state, caster, spell) => {
  return [{
    type: 'MANA_CHANGE',
    target: caster,
    value: 1,
    description: `🪙 ${caster === 'player' ? '你' : '对手'}使用了幸运币，获得1点法力水晶！`
  }];
};

// [A-3] 突袭：召唤的随从可立即攻击
const charge: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  if (!spell.summonId) return [];
  const template = MINION_DATA[spell.summonId];
  if (!template) return [];
  return [{
    type: 'SUMMON_MINION',
    target: caster,
    value: { ...template, keywords: [...(template.keywords || []), 'rush'], buffs: [] },
    description: `⚡ ${caster === 'player' ? '你' : '对手'}召唤了突袭随从 ${template.name}！`
  }];
};

// [A-3] 圣盾：召唤的随从带有圣盾
const divineShield: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  if (!spell.summonId) return [];
  const template = MINION_DATA[spell.summonId];
  if (!template) return [];
  return [{
    type: 'SUMMON_MINION',
    target: caster,
    value: { ...template, keywords: [...(template.keywords || []), 'divine_shield'], hasShield: true, buffs: [] },
    description: `🛡️ ${caster === 'player' ? '你' : '对手'}召唤了圣盾随从 ${template.name}！`
  }];
};

// [A-3] 亡语：召唤的随从带有亡语效果
const deathrattle: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  if (!spell.summonId) return [];
  const template = MINION_DATA[spell.summonId];
  if (!template) return [];
  const drEffect = spell.deathrattleEffect || template.onDeath;
  return [{
    type: 'SUMMON_MINION',
    target: caster,
    value: { ...template, onDeath: drEffect, buffs: [] },
    description: `💀 ${caster === 'player' ? '你' : '对手'}召唤了亡语随从 ${template.name}！`
  }];
};

// [A-3] 光环：召唤的随从带有光环效果
const aura: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  if (!spell.summonId) return [];
  const template = MINION_DATA[spell.summonId];
  if (!template) return [];
  return [{
    type: 'SUMMON_MINION',
    target: caster,
    value: { ...template, aura: template.aura, buffs: [] },
    description: `✨ ${caster === 'player' ? '你' : '对手'}召唤了光环随从 ${template.name}！`
  }];
};

// [A-3] 中毒：对目标施加持续伤害
const poison: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  const val = spell.value || 2;
  const dur = spell.effectDuration || 3;
  return [{
    type: 'ADD_EFFECT',
    target,
    value: { type: 'poisoned', duration: dur, value: val },
    description: `☠️ ${target === 'player' ? '你' : '对手'}中毒了 (每回合-${val}HP, ${dur}回合)`
  }];
};

// [A-3] 召唤：通用召唤机制（通过 summonId 从 MINION_DATA 查找）
const summon: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  if (!spell.summonId) return [];
  const template = MINION_DATA[spell.summonId];
  if (!template) return [];
  const isRush = spell.rushSummon || false;
  return [{
    type: 'SUMMON_MINION',
    target: caster,
    value: { ...template, keywords: template.keywords || [], buffs: [], exhausted: !isRush },
    description: `🔮 ${caster === 'player' ? '你' : '对手'}召唤了 ${template.name}！`
  }];
};

// [Expansion 2] 吸血：伤害吸取生命值
const lifesteal: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const healAmount = spell.damage || 2;
  return [{
    type: 'HEAL',
    target: caster,
    value: healAmount,
    description: `🩸 ${caster === 'player' ? '你' : '对手'}吸取了 ${healAmount} 点生命值`
  }];
};

// [Expansion 2] 发现：展示3张随机法术供玩家选择
const discover: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  return [{
    type: 'DISCOVER',
    target: caster,
    value: 3,
    description: `🔍 发现：选择一张卡牌加入手牌`
  }];
};

// [Expansion 2] 变形：将目标随从变为0/1绵羊
const transform: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  return [{
    type: 'TRANSFORM_MINION',
    target,
    value: 'sheep',
    description: `🐑 ${target === 'player' ? '你' : '对手'}的随从变形为绵羊！`
  }];
};

// [Expansion 2] 横扫：随从对相邻随从造成伤害
const cleave: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const target = caster === 'player' ? 'opponent' : 'player';
  return [{
    type: 'CLEAVE',
    target,
    description: `⚔️ 横扫攻击！`
  }];
};

// [Phase 3] 额外回合：设置 extraTurnPlayer 标志
const extraTurn: MechanicHandler = (_state, caster, _spell, countered) => {
  if (countered) return [];
  return [
    { type: 'EXTRA_TURN', target: caster, description: `⏳ ${caster === 'player' ? '你' : '对手'}获得了额外回合！` },
  ];
};

// [Phase 3] 法术复制：复制对手上一个法术并施放
const copySpell: MechanicHandler = (state, caster, _spell, countered) => {
  if (countered) return [];
  const lastSpell = caster === 'player' ? state.opponentLastSpell : state.playerLastSpell;
  if (!lastSpell || lastSpell === 'skip') {
    return [{ type: 'MESSAGE', target: 'system', description: '🪞 镜像失败：对手没有可用的法术记录。' }];
  }
  return [
    { type: 'COPY_SPELL', target: caster, value: lastSpell, description: `🪞 ${caster === 'player' ? '你' : '对手'}复制了「${lastSpell}」！` },
  ];
};

// [Phase 3] 法力加速：永久+1最大法力值
const manaRamp: MechanicHandler = (_state, caster, _spell, countered) => {
  if (countered) return [];
  return [
    { type: 'MANA_RAMP', target: caster, value: 1, description: `🔋 ${caster === 'player' ? '你' : '对手'}永久+1最大法力值！` },
  ];
};

// [P3-1] 秘密机制 handler：打出秘密牌时，将秘密挂载到 caster 的 secrets 数组
const secret: MechanicHandler = (state, caster, spell, countered) => {
  if (countered) return [];
  const isPlayer = caster === 'player';
  const secretId = spell.id;

  // 构建 GameAction，但这里只返回一条 MESSAGE；
  // 实际的秘密注册逻辑在 GameSequenceExecutor 或 gameLogic 层处理
  return [{
    type: 'MESSAGE',
    target: 'system',
    description: `❓ ${isPlayer ? '你' : '对手'}设置了一个秘密！`,
  }];
};

// ============ 机制注册表 ============

export const MECHANIC_DEFINITIONS: Record<string, MechanicHandler> = {
  burn,
  tangle,
  freeze,
  heal,
  aoe,
  draw,
  silence,
  luck_coin: luckCoin, // [P1 Fix #13]
  // [A-3] 新机制
  charge,
  divine_shield: divineShield,
  deathrattle,
  aura,
  poison,
  summon,
  // [Expansion 2] 新机制
  lifesteal,
  discover,
  transform,
  cleave,
  secret,
  // [Phase 3] 新机制
  extra_turn: extraTurn,
  copy_spell: copySpell,
  mana_ramp: manaRamp,
};

/**
 * 获取机制处理器
 * @param mechanic 机制名称
 * @returns 机制处理函数，如果不存在则返回 undefined
 */
export const getMechanicHandler = (mechanic: string): MechanicHandler | undefined => {
  return MECHANIC_DEFINITIONS[mechanic];
};
