/**
 * 地牢数据 — 20个遗物 + 15个事件
 * [Phase D-2/D-3]
 */

import { Artifact, DungeonEvent } from '../types/dungeon';

// ============ 遗物 (20个) ============

export const ALL_ARTIFACTS: Artifact[] = [
  // --- COMMON (10个) ---
  { id: 'phoenix_feather',   name: '凤凰之羽',     description: '战斗胜利时有20%几率恢复20HP',                icon: '🪶', rarity: 'COMMON', effectType: 'HEAL_BATTLE_END', value: 20 },
  { id: 'arcane_focus',      name: '奥术聚焦',     description: '每场战斗开始时获得1点额外法力水晶',            icon: '🔮', rarity: 'COMMON', effectType: 'START_MANA',      value: 1 },
  { id: 'dragon_scale',      name: '龙鳞',         description: '最大生命值增加15点',                           icon: '🐲', rarity: 'COMMON', effectType: 'MAX_HP_UP',       value: 15 },
  { id: 'mana_magnet',       name: '法力磁石',     description: '战斗胜利后获得额外10金币',                     icon: '🧲', rarity: 'COMMON', effectType: 'DOUBLE_GOLD',     value: 10 },
  { id: 'iron_shield',       name: '铁盾',         description: '每场战斗开始时获得3点护甲',                    icon: '🛡️', rarity: 'COMMON', effectType: 'START_ARMOR',     value: 3 },
  { id: 'scroll_wisdom',     name: '智慧卷轴',     description: '每场战斗开始时多抽1张牌',                      icon: '📜', rarity: 'COMMON', effectType: 'DRAW_CARD',       value: 1 },
  { id: 'bandage',           name: '止血绷带',     description: '每回合开始时恢复2HP',                          icon: '🩹', rarity: 'COMMON', effectType: 'HEAL_PER_TURN',   value: 2 },
  { id: 'flame_essence',     name: '火焰精华',     description: '火系法术伤害+2',                               icon: '🔥', rarity: 'COMMON', effectType: 'FIRE_BONUS',      value: 2 },
  { id: 'ice_crystal',       name: '冰晶',         description: '冰系法术伤害+2',                               icon: '❄️', rarity: 'COMMON', effectType: 'ICE_BONUS',       value: 2 },
  { id: 'spark_stone',       name: '雷石',         description: '雷系法术伤害+2',                               icon: '⚡', rarity: 'COMMON', effectType: 'THUNDER_BONUS',   value: 2 },

  // --- RARE (6个) ---
  { id: 'dragon_heart',      name: '龙心',         description: '最大生命值增加30点，并立即恢复30HP',            icon: '❤️‍🔥', rarity: 'RARE', effectType: 'MAX_HP_UP', value: 30 },
  { id: 'shadow_cloak',      name: '暗影斗篷',     description: '免疫冻结效果',                                 icon: '🧥', rarity: 'RARE', effectType: 'IMMUNE_FREEZE',    value: 0 },
  { id: 'earth_amulet',      name: '大地护符',     description: '岩石系法术伤害+3，护甲效果+3',                 icon: '🪨', rarity: 'RARE', effectType: 'ROCK_BONUS',       value: 3 },
  { id: 'vine_scepter',      name: '藤蔓权杖',     description: '自然系法术伤害+3，治疗效果+3',                 icon: '🌿', rarity: 'RARE', effectType: 'VINE_BONUS',       value: 3 },
  { id: 'gold_ring',         name: '聚金之戒',     description: '每次击杀敌人获得20金币',                       icon: '💍', rarity: 'RARE', effectType: 'GOLD_PER_KILL',    value: 20 },
  { id: 'spell_tome',        name: '法术之书',     description: '每场战斗开始时获得1张0费随机法术',              icon: '📕', rarity: 'RARE', effectType: 'FREE_SPELL',       value: 1 },

  // --- LEGENDARY (4个) ---
  { id: 'crown_thorns',      name: '荆棘之冠',     description: '所有法术吸血（伤害的20%转化为治疗）',           icon: '👑', rarity: 'LEGENDARY', effectType: 'LIFESTEAL_ALL', value: 20 },
  { id: 'meteor_shard',      name: '陨石碎片',     description: '每场战斗开始时对敌方造成5点伤害',               icon: '☄️', rarity: 'LEGENDARY', effectType: 'AOE_DAMAGE',    value: 5 },
  { id: 'phoenix_egg',       name: '凤凰之卵',     description: '死亡时复活一次（恢复50%最大HP）',               icon: '🥚', rarity: 'LEGENDARY', effectType: 'REBIRTH',       value: 50 },
  { id: 'infinity_gauntlet', name: '无限手套',     description: '所有法术费用-1（最低为0）',                     icon: '🧤', rarity: 'LEGENDARY', effectType: 'DISCOUNT_SPELL', value: 1 },
];

// ============ 事件 (15个) ============

export const ALL_EVENTS: DungeonEvent[] = [
  {
    id: 'mystic_spring',
    title: '神秘泉',
    description: '你发现了一个散发着柔和光芒的泉水...',
    icon: '⛲',
    choices: [
      { text: '饮用泉水（恢复30HP）',  effect: { type: 'heal', value: 30 } },
      { text: '装瓶带走（获得1件遗物）', effect: { type: 'artifact', value: 1 } },
    ],
  },
  {
    id: 'wandering_merchant',
    title: '流浪商人',
    description: '一位神秘的商人出现在你面前，展示着他的货品...',
    icon: '🧳',
    choices: [
      { text: '购买遗物（50金币）', effect: { type: 'artifact', value: 1 }, risk: '需要50金币' },
      { text: '免费获得20金币',     effect: { type: 'gold', value: 20 } },
    ],
  },
  {
    id: 'cursed_altar',
    title: '诅咒祭坛',
    description: '古老的祭坛散发着诡异的黑暗能量...',
    icon: '⛪',
    choices: [
      { text: '接受诅咒（获得传说遗物，失去10最大HP）', effect: { type: 'artifact', value: 1 }, risk: '永久失去10最大HP' },
      { text: '祈祷净化（恢复15HP）',                   effect: { type: 'heal', value: 15 } },
    ],
  },
  {
    id: 'training_ground',
    title: '训练场',
    description: '你发现了一处古老的训练设施，可以强化你的能力...',
    icon: '🏋️',
    choices: [
      { text: '强化训练（最大HP+10）',  effect: { type: 'maxhp', value: 10 } },
      { text: '冥想修炼（获得30金币）', effect: { type: 'gold', value: 30 } },
    ],
  },
  {
    id: 'treasure_chest',
    title: '宝箱',
    description: '一个布满灰尘的宝箱静静躺在角落...',
    icon: '📦',
    choices: [
      { text: '直接打开（获得40金币）', effect: { type: 'gold', value: 40 } },
      { text: '仔细检查（获得1件遗物）', effect: { type: 'artifact', value: 1 } },
    ],
  },
  {
    id: 'dark_pact',
    title: '黑暗契约',
    description: '一个低沉的声音在你耳边响起，许诺着力量...',
    icon: '😈',
    choices: [
      { text: '签订契约（获得2件遗物，失去20HP）', effect: { type: 'artifact', value: 2 }, risk: '失去20HP' },
      { text: '拒绝（恢复10HP）',                  effect: { type: 'heal', value: 10 } },
    ],
  },
  {
    id: 'ancient_library',
    title: '古代图书馆',
    description: '尘封的书架上摆满了古老的魔法书...',
    icon: '📚',
    choices: [
      { text: '研究魔法（获得1张随机法术牌）', effect: { type: 'card', value: 1 } },
      { text: '搜刮金币（获得25金币）',        effect: { type: 'gold', value: 25 } },
    ],
  },
  {
    id: 'healing_pool',
    title: '治疗之池',
    description: '碧绿的池水散发着生命的气息...',
    icon: '🌊',
    choices: [
      { text: '浸泡其中（完全恢复HP）', effect: { type: 'heal', value: 999 } },
      { text: '装瓶带走（恢复20HP）',    effect: { type: 'heal', value: 20 } },
    ],
  },
  {
    id: 'goblin_camp',
    title: '哥布林营地',
    description: '你遇到了一群哥布林，它们看起来很害怕你...',
    icon: '👺',
    choices: [
      { text: '抢劫营地（获得50金币）',    effect: { type: 'gold', value: 50 } },
      { text: '友好交流（获得1件遗物）',   effect: { type: 'artifact', value: 1 } },
    ],
  },
  {
    id: 'crystal_cave',
    title: '水晶洞穴',
    description: '五彩斑斓的水晶照亮了整个洞穴...',
    icon: '💎',
    choices: [
      { text: '挖掘水晶（获得60金币）',     effect: { type: 'gold', value: 60 } },
      { text: '吸收能量（最大HP+15）',      effect: { type: 'maxhp', value: 15 } },
    ],
  },
  {
    id: 'ghost_knight',
    title: '幽灵骑士',
    description: '一位幽灵骑士的亡魂拦住了你的去路...',
    icon: '👻',
    choices: [
      { text: '接受挑战（失去15HP，获得传说遗物）', effect: { type: 'artifact', value: 1 }, risk: '失去15HP' },
      { text: '绕道而行（无事发生）',                effect: { type: 'gold', value: 0 } },
    ],
  },
  {
    id: 'fairy_ring',
    title: '精灵之环',
    description: '一群小精灵围绕着一个发光的蘑菇圈跳舞...',
    icon: '🧚',
    choices: [
      { text: '加入舞蹈（恢复25HP+获得20金币）', effect: { type: 'heal', value: 25 } },
      { text: '许愿（获得1件遗物）',              effect: { type: 'artifact', value: 1 } },
    ],
  },
  {
    id: 'blacksmith',
    title: '矮人工匠',
    description: '一位矮人工匠正在打铁，他愿意为你打造装备...',
    icon: '⚒️',
    choices: [
      { text: '打造护甲（最大HP+20，获得5护甲）', effect: { type: 'maxhp', value: 20 } },
      { text: '支付工钱（30金币换1件遗物）',        effect: { type: 'artifact', value: 1 }, risk: '需要30金币' },
    ],
  },
  {
    id: 'time_rift',
    title: '时间裂缝',
    description: '一道时间裂缝出现在你面前，里面似乎有宝物...',
    icon: '⏳',
    choices: [
      { text: '探入裂缝（获得2件随机遗物）', effect: { type: 'artifact', value: 2 }, risk: '可能失去10HP' },
      { text: '安全离开（获得30金币）',       effect: { type: 'gold', value: 30 } },
    ],
  },
  {
    id: 'divine_blessing',
    title: '神圣祝福',
    description: '一道圣光照耀在你身上，你感受到了祝福...',
    icon: '✨',
    choices: [
      { text: '接受祝福（恢复全部HP+最大HP+10）', effect: { type: 'heal', value: 999 } },
      { text: '分享祝福（获得1件遗物+30金币）',    effect: { type: 'artifact', value: 1 } },
    ],
  },
];

// ============ 工具函数 ============

import { getGameRNG } from '../utils/seededRandom';

/** 随机抽取 n 个不同遗物（不重复） */
export function pickRandomArtifacts(count: number, exclude: string[] = []): Artifact[] {
  const rng = getGameRNG();
  const pool = ALL_ARTIFACTS.filter(a => !exclude.includes(a.id));
  const result: Artifact[] = [];
  const used = new Set<number>();

  while (result.length < count && result.length < pool.length) {
    const idx = rng.randomInt(0, pool.length);
    if (!used.has(idx)) {
      used.add(idx);
      result.push(pool[idx]);
    }
  }
  return result;
}

/** 随机抽取1个事件 */
export function pickRandomEvent(): DungeonEvent {
  const rng = getGameRNG();
  return ALL_EVENTS[rng.randomInt(0, ALL_EVENTS.length)];
}
