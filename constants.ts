import { Spell, GameConfig, SpellType, Rarity, CardSet, GameMode } from './types.ts';

export const API_BASE_URL = ''; // 默认为空，由 ApiService 处理环境变量或 Mock

// ============ 暴雪级游戏配置 (Patch 2.0) ============

export const GAME_CONFIG: GameConfig = {
  maxHP: 30,             // [P0] 提升至标准卡牌游戏血量 (30点)
  startingMana: 1,       // [P0] 1费起手，经典成长曲线
  maxMana: 10,           // [P0] 10费上限
  handSize: 5,           // [P1] 手牌上限提升至5，增加策略选择
  deckSize: 20,          // [P1] 牌库厚度增加
  cardsDrawnPerTurn: 1,  // [P3] 改为每回合抽1张，控制过牌节奏（如果为了快节奏可保持2）
  manaPerTurn: 0,        // (逻辑控制自然增长)
};

export const MAX_HP = GAME_CONFIG.maxHP;

// ============ 差异化卡牌设计 (The Grand Tournament Set) ============

/**
 * 五元素法术 - 深度策略重构
 * 
 * 🔥 Fire: 高爆发/终结技 (4费 6伤)
 * 🌿 Vine: 节奏/软控制 (2费 3伤)
 * ❄️ Ice: 控场/冻结 (3费 2伤)
 * ⚡ Thunder: 连击/高效 (2费 3伤)
 * 🪨 Rock: 纯防御/叠甲 (1费 0伤 +5甲)
 */
export const SPELLS: Spell[] = [
  // 现有卡牌
  { 
    id: 'fire', 
    name: '炎爆术',        // Pyroblast
    emoji: '🔥', 
    artSrc: '/cards/fire-pyroblast.webp',
    color: 'text-red-500', 
    borderColor: 'border-red-500',
    shadowColor: 'rgba(239,68,68,0.5)',
    beats: 'vine',
    manaCost: 4,              // 高费终结技
    damage: 6,                // 极高伤害 (20% HP)
    rarity: 'mythic',
    mechanic: 'burn',
    cardSet: 'core',          // 核心卡牌，永远可用
    description: '造成6点伤害。如果获胜，下回合对手额外受到2点燃烧伤害。',
    shortDesc: '灼烧: +2 持续伤害'
  },
  { 
    id: 'vine', 
    name: '荆棘缠绕',    // Stranglethorn
    emoji: '🌿', 
    artSrc: '/cards/vine-entangling.webp',
    color: 'text-green-500', 
    borderColor: 'border-green-500',
    shadowColor: 'rgba(34,197,94,0.5)',
    beats: 'ice',
    manaCost: 2,              // 标准2费曲线
    damage: 3,                // 标准模型
    rarity: 'rare',
    mechanic: 'tangle',
    cardSet: 'core',          // 核心卡牌，永远可用
    description: '造成3点伤害。如果获胜，对手下一张法术费用增加(2)点。',
    shortDesc: '缠绕: 费用+2'
  },
  { 
    id: 'ice', 
    name: '暴风雪',         // Blizzard
    emoji: '❄️', 
    artSrc: '/cards/ice-frostnova.webp',
    color: 'text-cyan-400', 
    borderColor: 'border-cyan-400',
    shadowColor: 'rgba(34,211,238,0.5)',
    beats: 'thunder',
    manaCost: 3,              // 控场牌
    damage: 4,                // 稍微高一点的伤害
    rarity: 'rare',
    mechanic: 'freeze',
    cardSet: 'core',          // 核心卡牌，永远可用
    description: '造成4点伤害。如果平局或胜利，冻结对手（下回合如果再次对决失败，跳过攻击阶段）。',
    shortDesc: '冻结: 限制行动'
  },
  { 
    id: 'thunder', 
    name: '闪电箭',   // Lightning Bolt
    emoji: '⚡', 
    artSrc: '/cards/thunder-chainlightning.webp',
    color: 'text-yellow-400', 
    borderColor: 'border-yellow-400',
    shadowColor: 'rgba(250,204,21,0.5)',
    beats: 'rock',
    manaCost: 2,              // 高效伤害
    damage: 4,                // 超模一点点
    rarity: 'common',
    mechanic: 'charge',
    cardSet: 'core',          // 核心卡牌，永远可用
    description: '造成4点伤害。如果你上回合使用了闪电箭，伤害增加50%(6点)。',
    shortDesc: '充能: 连击+50%'
  },
  { 
    id: 'rock', 
    name: '铁皮术',        // Iron Skin
    emoji: '🪨', 
    artSrc: '/cards/rock-bulwark.webp',
    color: 'text-stone-400', 
    borderColor: 'border-stone-400',
    shadowColor: 'rgba(168,162,158,0.5)',
    beats: 'fire',
    manaCost: 1,              // 低费灵活
    damage: 0,                // 无攻击力
    armorGain: 3,             // 从 5 降至 3 (平衡性调整)
    rarity: 'common',
    mechanic: 'fortify',
    cardSet: 'core',
    description: '造成0点伤害，但获得3点护甲。',
    shortDesc: '坚韧: +3 护甲'
  },
  // 新增卡牌扩展池
  { 
    id: 'fire2', 
    name: '火球术',         // Fireball
    emoji: '🔥', 
    artSrc: '/cards/fire-fireball.webp',
    color: 'text-red-500', 
    borderColor: 'border-red-500',
    shadowColor: 'rgba(239,68,68,0.5)',
    beats: 'vine',
    manaCost: 3,
    damage: 5,
    rarity: 'common',
    mechanic: 'burn',
    cardSet: 'classic',       // 经典扩展包
    description: '造成5点伤害。如果获胜，下回合对手额外受到1点燃烧伤害。',
    shortDesc: '灼烧: +1 持续伤害'
  },
  { 
    id: 'vine2', 
    name: '纠缠根须', // Entangling Roots
    emoji: '🌿', 
    artSrc: '/cards/vine-roots.webp',
    color: 'text-green-500', 
    borderColor: 'border-green-500',
    shadowColor: 'rgba(34,197,94,0.5)',
    beats: 'ice',
    manaCost: 1,
    damage: 2,
    rarity: 'common',
    mechanic: 'tangle',
    cardSet: 'classic',       // 经典扩展包
    description: '造成2点伤害。如果获胜，对手下一张法术费用增加(1)点。',
    shortDesc: '缠绕: 费用+1'
  },
  { 
    id: 'ice2', 
    name: '霜冻新星',       // Frost Nova
    emoji: '❄️', 
    artSrc: '/cards/ice-nova.webp',
    color: 'text-cyan-400', 
    borderColor: 'border-cyan-400',
    shadowColor: 'rgba(34,211,238,0.5)',
    beats: 'thunder',
    manaCost: 2,
    damage: 3,
    rarity: 'common',
    mechanic: 'freeze',
    description: '造成3点伤害。如果平局或胜利，冻结对手（下回合如果再次对决失败，跳过攻击阶段）。',
    shortDesc: '冻结: 限制行动'
  },
  { 
    id: 'thunder2', 
    name: '连锁闪电',  // Chain Lightning
    emoji: '⚡', 
    artSrc: '/cards/thunder-chain.webp',
    color: 'text-yellow-400', 
    borderColor: 'border-yellow-400',
    shadowColor: 'rgba(250,204,21,0.5)',
    beats: 'rock',
    manaCost: 3,
    damage: 3,
    rarity: 'rare',
    mechanic: 'charge',
    description: '造成3点伤害。如果你上回合使用了雷系法术，伤害翻倍(6)。',
    shortDesc: '充能: 连击伤害x2'
  },
  { 
    id: 'rock2', 
    name: '石墙',       // Stone Wall
    emoji: '🪨', 
    artSrc: '/cards/rock-wall.webp',
    color: 'text-stone-400', 
    borderColor: 'border-stone-400',
    shadowColor: 'rgba(168,162,158,0.5)',
    beats: 'fire',
    manaCost: 2,
    damage: 0,
    armorGain: 7,
    rarity: 'rare',
    mechanic: 'fortify',
    description: '造成0点伤害，但获得7点护甲。',
    shortDesc: '坚韧: +7 护甲'
  },
  // 继续添加更多卡牌至30+
  { 
    id: 'fire3', 
    name: '地狱爆破',    // Inferno Blast
    emoji: '🔥', 
    artSrc: '/cards/fire-inferno.webp',
    color: 'text-red-500', 
    borderColor: 'border-red-500',
    shadowColor: 'rgba(239,68,68,0.5)',
    beats: 'vine',
    manaCost: 5,
    damage: 8,
    rarity: 'mythic',
    mechanic: 'burn',
    description: '造成8点伤害。如果获胜，下回合对手额外受到3点燃烧伤害。',
    shortDesc: '灼烧: +3 持续伤害'
  },
  { 
    id: 'vine3', 
    name: '荆棘鞭笞',       // Thorn Whip
    emoji: '🌿', 
    artSrc: '/cards/vine-whip.webp',
    color: 'text-green-500', 
    borderColor: 'border-green-500',
    shadowColor: 'rgba(34,197,94,0.5)',
    beats: 'ice',
    manaCost: 3,
    damage: 4,
    rarity: 'rare',
    mechanic: 'tangle',
    description: '造成4点伤害。如果获胜，对手下一张法术费用增加(3)点。',
    shortDesc: '缠绕: 费用+3'
  },
  { 
    id: 'ice3', 
    name: '寒冰屏障',        // Ice Block
    emoji: '❄️', 
    artSrc: '/cards/ice-block.webp',
    color: 'text-cyan-400', 
    borderColor: 'border-cyan-400',
    shadowColor: 'rgba(34,211,238,0.5)',
    beats: 'thunder',
    manaCost: 4,
    damage: 2,
    armorGain: 6,
    rarity: 'rare',
    mechanic: 'freeze',
    description: '造成2点伤害，获得6点护甲。如果平局或胜利，冻结对手。',
    shortDesc: '冻结 + 坚韧'
  },
  { 
    id: 'thunder3', 
    name: '雷电风暴',     // Thunderstorm
    emoji: '⚡', 
    artSrc: '/cards/thunder-storm.webp',
    color: 'text-yellow-400', 
    borderColor: 'border-yellow-400',
    shadowColor: 'rgba(250,204,21,0.5)',
    beats: 'rock',
    manaCost: 5,
    damage: 6,
    rarity: 'mythic',
    mechanic: 'charge',
    description: '造成6点伤害。如果你上回合使用了雷系法术，伤害翻倍(12)。',
    shortDesc: '充能: 连击伤害x2'
  },
  { 
    id: 'rock3', 
    name: '大地震击',        // Earthquake
    emoji: '🪨', 
    artSrc: '/cards/rock-quake.webp',
    color: 'text-stone-400', 
    borderColor: 'border-stone-400',
    shadowColor: 'rgba(168,162,158,0.5)',
    beats: 'fire',
    manaCost: 5,
    damage: 5,
    armorGain: 10,
    rarity: 'mythic',
    mechanic: 'fortify',
    description: '造成5点伤害，但获得10点护甲。',
    shortDesc: '坚韧: +10 护甲'
  },
  // 添加更多低费卡
  { 
    id: 'fire4', 
    name: '小火花',            // Spark
    emoji: '🔥', 
    artSrc: '/cards/fire-spark.webp',
    color: 'text-red-500', 
    borderColor: 'border-red-500',
    shadowColor: 'rgba(239,68,68,0.5)',
    beats: 'vine',
    manaCost: 1,
    damage: 2,
    rarity: 'common',
    mechanic: 'burn',
    description: '造成2点伤害。如果获胜，下回合对手额外受到1点燃烧伤害。',
    shortDesc: '灼烧: +1 持续伤害'
  },
  { 
    id: 'vine4', 
    name: '藤蔓鞭打',        // Vine Lash
    emoji: '🌿', 
    artSrc: '/cards/vine-lash.webp',
    color: 'text-green-500', 
    borderColor: 'border-green-500',
    shadowColor: 'rgba(34,197,94,0.5)',
    beats: 'ice',
    manaCost: 1,
    damage: 1,
    rarity: 'common',
    mechanic: 'tangle',
    description: '造成1点伤害。如果获胜，对手下一张法术费用增加(1)点。',
    shortDesc: '缠绕: 费用+1'
  },
  { 
    id: 'ice4', 
    name: '严重冻伤',        // Frostbite
    emoji: '❄️', 
    artSrc: '/cards/ice-bite.webp',
    color: 'text-cyan-400', 
    borderColor: 'border-cyan-400',
    shadowColor: 'rgba(34,211,238,0.5)',
    beats: 'thunder',
    manaCost: 1,
    damage: 2,
    rarity: 'common',
    mechanic: 'freeze',
    description: '造成2点伤害。如果平局或胜利，冻结对手。',
    shortDesc: '冻结: 限制行动'
  },
  { 
    id: 'thunder4', 
    name: '静电冲击',     // Static Shock
    emoji: '⚡', 
    artSrc: '/cards/thunder-shock.webp',
    color: 'text-yellow-400', 
    borderColor: 'border-yellow-400',
    shadowColor: 'rgba(250,204,21,0.5)',
    beats: 'rock',
    manaCost: 1,
    damage: 2,
    rarity: 'common',
    mechanic: 'charge',
    description: '造成2点伤害。如果你上回合使用了雷系法术，伤害翻倍(4)。',
    shortDesc: '充能: 连击伤害x2'
  },
  { 
    id: 'rock4', 
    name: '小石子',           // Pebble
    emoji: '🪨', 
    artSrc: '/cards/rock-pebble.webp',
    color: 'text-stone-400', 
    borderColor: 'border-stone-400',
    shadowColor: 'rgba(168,162,158,0.5)',
    beats: 'fire',
    manaCost: 1,
    damage: 0,
    armorGain: 3,
    rarity: 'common',
    mechanic: 'fortify',
    description: '造成0点伤害，但获得3点护甲。',
    shortDesc: '坚韧: +3 护甲'
  },
  // 再添加一些中费卡
  { 
    id: 'fire5', 
    name: '火焰波',       // Flame Wave
    emoji: '🔥', 
    artSrc: '/cards/fire-wave.webp',
    color: 'text-red-500', 
    borderColor: 'border-red-500',
    shadowColor: 'rgba(239,68,68,0.5)',
    beats: 'vine',
    manaCost: 6,
    damage: 10,
    rarity: 'mythic',
    mechanic: 'burn',
    description: '造成10点伤害。如果获胜，下回合对手额外受到4点燃烧伤害。',
    shortDesc: '灼烧: +4 持续伤害'
  },
  { 
    id: 'vine5', 
    name: '森林之握',  // Forest's Grasp
    emoji: '🌿', 
    artSrc: '/cards/vine-grasp.webp',
    color: 'text-green-500', 
    borderColor: 'border-green-500',
    shadowColor: 'rgba(34,197,94,0.5)',
    beats: 'ice',
    manaCost: 4,
    damage: 5,
    rarity: 'rare',
    mechanic: 'tangle',
    description: '造成5点伤害。如果获胜，对手下一张法术费用增加(4)点。',
    shortDesc: '缠绕: 费用+4'
  },
  { 
    id: 'ice5', 
    name: '绝对零度',    // Absolute Zero
    emoji: '❄️', 
    artSrc: '/cards/ice-zero.webp',
    color: 'text-cyan-400', 
    borderColor: 'border-cyan-400',
    shadowColor: 'rgba(34,211,238,0.5)',
    beats: 'thunder',
    manaCost: 6,
    damage: 8,
    rarity: 'mythic',
    mechanic: 'freeze',
    description: '造成8点伤害。如果平局或胜利，冻结对手两回合。',
    shortDesc: '冻结: 持续2回合'
  },
  { 
    id: 'thunder5', 
    name: '雷神之怒',  // Thunder God's Wrath
    emoji: '⚡', 
    artSrc: '/cards/thunder-storm.webp',
    color: 'text-yellow-400', 
    borderColor: 'border-yellow-400',
    shadowColor: 'rgba(250,204,21,0.5)',
    beats: 'rock',
    manaCost: 5,
    damage: 5,                // 从 7 降至 5 (平衡性调整)
    rarity: 'mythic',
    mechanic: 'charge',
    description: '造成5点伤害。如果你上回合使用了雷系法术或技能，伤害翻倍(10)。',
    shortDesc: '充能: 连击伤害x2'
  },
  { 
    id: 'rock5', 
    name: '崇山峻岭',         // Mountain
    emoji: '🪨', 
    artSrc: '/cards/rock-mountain.webp',
    color: 'text-stone-400', 
    borderColor: 'border-stone-400',
    shadowColor: 'rgba(168,162,158,0.5)',
    beats: 'fire',
    manaCost: 6,
    damage: 6,
    armorGain: 15,
    rarity: 'mythic',
    mechanic: 'fortify',
    description: '造成6点伤害，但获得15点护甲。',
    shortDesc: '坚韧: +15 护甲'
  },
  // 新增机制卡牌
  { 
    id: 'healing', 
    name: '治疗波',     // Healing Wave
    emoji: '💙', 
    artSrc: '/cards/healing-wave.webp',
    color: 'text-blue-500', 
    borderColor: 'border-blue-500',
    shadowColor: 'rgba(59,130,246,0.5)',
    beats: 'fire',            // 🔧 修复：治疗克制火焰（水系）
    manaCost: 2,
    damage: 0,
    armorGain: 0,
    rarity: 'rare',
    mechanic: 'heal',
    cardSet: 'tournament',    // 竞技场扩展包
    description: '恢复5点生命值。',
    shortDesc: '治疗: +5 生命'
  },
  { 
    id: 'aoe', 
    name: '奥术爆炸', // Arcane Explosion
    emoji: '💥', 
    artSrc: '/cards/aoe-explosion.webp',
    color: 'text-purple-500', 
    borderColor: 'border-purple-500',
    shadowColor: 'rgba(147,51,234,0.5)',
    beats: 'vine',            // 🔧 修复：AOE克制藤蔓（范围伤害克制纠缠）
    manaCost: 4,
    damage: 3,
    armorGain: 0,
    rarity: 'rare',
    mechanic: 'aoe',
    cardSet: 'tournament',    // 竞技场扩展包
    description: '造成3点伤害，并对对手造成额外2点伤害（无视护甲）。',
    shortDesc: 'AOE: 3+2 穿透'
  },
  { 
    id: 'draw', 
    name: '奥术智慧', // Arcane Intellect
    emoji: '📚', 
    artSrc: '/cards/draw-intellect.webp',
    color: 'text-indigo-500', 
    borderColor: 'border-indigo-500',
    shadowColor: 'rgba(99,102,241,0.5)',
    beats: 'silence',         // 🔧 修复：智慧克制沉默（知识对抗封印）
    manaCost: 3,
    damage: 0,
    armorGain: 0,
    rarity: 'rare',
    mechanic: 'draw',
    cardSet: 'tournament',    // 竞技场扩展包
    description: '抽2张牌。',
    shortDesc: '抽牌: +2 张'
  },
  { 
    id: 'silence', 
    name: '沉默',          // Silence
    emoji: '🤫', 
    artSrc: '/cards/silence.webp',
    color: 'text-gray-500', 
    borderColor: 'border-gray-500',
    shadowColor: 'rgba(107,114,128,0.5)',
    beats: 'healing',         // 🔧 修复：沉默克制治疗（封印克制恢复）
    manaCost: 1,
    damage: 0,
    armorGain: 0,
    rarity: 'common',
    mechanic: 'silence',
    cardSet: 'tournament',    // 竞技场扩展包
    description: '移除对手所有状态效果。',
    shortDesc: '沉默: 清除状态'
  },
  // ============ 英雄技能系统 ============
  { 
    id: 'hero_fire', 
    name: '火焰精通',     // Fire Mastery
    emoji: '🔥👑', 
    artSrc: '/cards/hero-fire-mastery.webp',
    color: 'text-red-400', 
    borderColor: 'border-red-400',
    shadowColor: 'rgba(248,113,113,0.6)',
        beats: 'vine',            // 🔧 修复：火克藤
    manaCost: 2,              // 🔧 平衡：英雄技能需要2费
    damage: 2,
    armorGain: 0,
    rarity: 'mythic',
    mechanic: 'burn',
    cardSet: 'legacy',        // 遗产扩展包
    description: '造成2点伤害。如果获胜，下回合对手额外受到1点燃烧伤害。（英雄技能：每回合可用1次）',
    shortDesc: '英雄: 灼烧+1'
  },
  { 
    id: 'hero_vine', 
    name: '自然呼唤',   // Nature's Call
    emoji: '🌿🌟', 
    artSrc: '/cards/hero-vine-call.webp',
    color: 'text-green-400', 
    borderColor: 'border-green-400',
    shadowColor: 'rgba(74,222,128,0.6)',
        beats: 'ice',             // 🔧 修复：藤克冰
    manaCost: 2,              // 🔧 平衡：英雄技能需要2费
    damage: 0,
    armorGain: 2,             // 🔧 平衡：3甲降为2甲
    rarity: 'mythic',
    mechanic: 'heal',
    cardSet: 'legacy',        // 遗产扩展包
    description: '获得3点护甲并抽1张牌。（英雄技能：每回合可用1次）',
    shortDesc: '英雄: +3甲 +1抽'
  },
  { 
    id: 'hero_ice', 
    name: '冰霜护盾',     // Frost Shield
    emoji: '❄️🛡️', 
    artSrc: '/cards/hero-ice-shield.webp',
    color: 'text-cyan-400', 
    borderColor: 'border-cyan-400',
    shadowColor: 'rgba(34,211,238,0.6)',
        beats: 'thunder',         // 🔧 修复：冰克雷
    manaCost: 2,              // 🔧 平衡：英雄技能需要2费
    damage: 0,
    armorGain: 2,             // 🔧 平衡：5甲降为2甲
    rarity: 'mythic',
    mechanic: 'freeze',
    cardSet: 'legacy',        // 遗产扩展包
    description: '获得5点护甲。如果下回合对手攻击失败，冻结对手。（英雄技能：每回合可用1次）',
    shortDesc: '英雄: +5甲 冻结'
  },
  { 
    id: 'hero_thunder', 
    name: '风暴涌动',      // Storm Surge
    emoji: '⚡🌩️', 
    artSrc: '/cards/hero-thunder-surge.webp',
    color: 'text-yellow-400', 
    borderColor: 'border-yellow-400',
    shadowColor: 'rgba(250,204,21,0.6)',
        beats: 'rock',            // 🔧 修复：雷克石
    manaCost: 2,              // 🔧 平衡：英雄技能需要2费
    damage: 1,
    armorGain: 0,
    rarity: 'mythic',
    mechanic: 'charge',
    cardSet: 'legacy',        // 遗产扩展包
    description: '造成1点伤害。如果你上回合使用了雷系法术或技能，伤害翻倍。（英雄技能：每回合可用1次）',
    shortDesc: '英雄: 充能连击'
  },
  { 
    id: 'hero_rock', 
    name: '大地之力',       // Earthquake -> Earth Power
    emoji: '🪨💥', 
    artSrc: '/cards/hero-rock-earthquake.webp',
    color: 'text-stone-400', 
    borderColor: 'border-stone-400',
    shadowColor: 'rgba(168,162,158,0.6)',
        beats: 'fire',            // 🔧 修复：石克火
    manaCost: 2,              // 🔧 平衡：英雄技能需要2费
    damage: 0,
    armorGain: 2,             // 🔧 平衡：8甲降为2甲（与炉石战士一致）
    rarity: 'mythic',
    mechanic: 'fortify',
    cardSet: 'legacy',        // 遗产扩展包
    description: '获得8点护甲。（英雄技能：每回合可用1次）',
    shortDesc: '英雄: +8 护甲'
  },
  { 
    id: 'skip', 
    name: '跳过回合',        // Pass Turn
    emoji: '🏳️', 
    artSrc: '',               // 无图
    color: 'text-gray-400', 
    borderColor: 'border-gray-400',
    shadowColor: 'rgba(156,163,175,0.5)',
    beats: 'skip' as SpellType, // 🔧 skip 不参与克制系统
    manaCost: 0, 
    damage: 0, 
    rarity: 'common',
    mechanic: 'skip',
    description: '跳过本回合。',
    shortDesc: '跳过'
  },
];

// ============ 下注选项 ============

export const BET_OPTIONS = [10, 50, 100];

// ============ 胜负倍率 ============

export const WIN_MULTIPLIER = 0.95;   // 胜利赔率
export const CRIT_CHANCE = 0.0;       // [P0] 移除随机暴击
export const CRIT_MULTIPLIER = 1.0;   // 失效

// ============ 辅助函数 ============

export const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * 创建初始牌组：每种元素各4张，共20张
 */
export const createDeck = (baseCards?: SpellType[]): SpellType[] => {
  let deck: SpellType[] = [];
  const elements: SpellType[] = baseCards || ['fire', 'vine', 'ice', 'thunder', 'rock'];
  
  if (baseCards) {
    // 如果提供了基础卡池，随机选择填充到20张
    for (let i = 0; i < 20; i++) {
        deck.push(elements[Math.floor(Math.random() * elements.length)]);
    }
  } else {
    // 默认平均分配
    for (const element of elements) {
        for (let i = 0; i < 4; i++) { 
          deck.push(element);
        }
    }
  }
  
  return shuffleArray(deck);
};

/**
 * 获取元素的色彩配置
 */
export const getElementColors = (element: SpellType) => {
  const spell = SPELLS.find(s => s.id === element);
  return {
    text: spell?.color || 'text-white',
    border: spell?.borderColor || 'border-white',
    shadow: spell?.shadowColor || 'rgba(255,255,255,0.5)',
  };
};

/**
 * 获取机制的中文名称
 */
export const getMechanicName = (mechanic: string): string => {
  const names: Record<string, string> = {
    burn: '灼烧',
    tangle: '缠绕',
    freeze: '冻结',
    charge: '充能',
    fortify: '坚韧',
    skip: '跳过',
    heal: '治疗',
    aoe: 'AOE',
    draw: '抽牌',
    silence: '沉默',
  };
  return names[mechanic] || mechanic;
};

/**
 * 开包系统 - 保底机制
 * 5包保底稀有，10包保底史诗，20包保底传说
 */
export const PACK_CONFIG = {
  cost: 100, // 每个卡包价格
  cardsPerPack: 5,
  pitySystem: {
    rare: { threshold: 5, guaranteed: false },
    mythic: { threshold: 10, guaranteed: false },
    legendary: { threshold: 20, guaranteed: false }
  }
};

/**
 * 开包逻辑
 */
export const openPack = (currentPity: { rare: number, mythic: number, legendary: number }): { cards: Spell[], newPity: typeof currentPity } => {
  const cards: Spell[] = [];
  let newPity = { ...currentPity };
  
  for (let i = 0; i < PACK_CONFIG.cardsPerPack; i++) {
    let rarity: Rarity = 'common';
    const rand = Math.random();
    
    // 保底检查
    if (newPity.legendary >= PACK_CONFIG.pitySystem.legendary.threshold) {
      rarity = 'mythic'; // 传说保底
      newPity.legendary = 0;
    } else if (newPity.mythic >= PACK_CONFIG.pitySystem.mythic.threshold) {
      rarity = 'mythic'; // 史诗保底
      newPity.mythic = 0;
    } else if (newPity.rare >= PACK_CONFIG.pitySystem.rare.threshold) {
      rarity = 'rare'; // 稀有保底
      newPity.rare = 0;
    } else {
      // 正常概率
      if (rand < 0.6) rarity = 'common';
      else if (rand < 0.85) rarity = 'common'; // 调整概率
      else if (rand < 0.95) rarity = 'rare';
      else if (rand < 0.99) rarity = 'mythic';
      else rarity = 'mythic'; // 传说极低概率
    }
    
    // 选择该稀有度的随机卡牌
    const availableCards = SPELLS.filter(s => s.rarity === rarity && s.id !== 'skip');
    const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    cards.push(randomCard);
    
    // 更新保底计数器
    if (rarity === 'common') {
      newPity.rare++;
      newPity.mythic++;
      newPity.legendary++;
    } else if (rarity === 'rare') {
      newPity.rare = 0;
      newPity.mythic++;
      newPity.legendary++;
    } else if (rarity === 'mythic') {
      newPity.rare = 0;
      newPity.mythic = 0;
      newPity.legendary++;
    }
  }
  
  return { cards, newPity };
};

// ============ 卡牌轮换系统 ============

/**
 * 标准模式：只包含当前和经典卡牌
 * 狂野模式：包含所有卡牌
 */
export const STANDARD_SETS: CardSet[] = ['core', 'classic', 'tournament'];
export const WILD_SETS: CardSet[] = ['core', 'classic', 'tournament', 'legacy'];

/**
 * 根据游戏模式过滤卡牌
 */
export function getCardsForMode(gameMode: GameMode): Spell[] {
  const allowedSets = gameMode === 'standard' ? STANDARD_SETS : WILD_SETS;
  return SPELLS.filter(spell => allowedSets.includes(spell.cardSet));
}

/**
 * 检查卡牌是否在指定模式中可用
 */
export function isCardAvailableInMode(cardId: SpellType, gameMode: GameMode): boolean {
  const card = SPELLS.find(s => s.id === cardId);
  if (!card) return false;
  
  const allowedSets = gameMode === 'standard' ? STANDARD_SETS : WILD_SETS;
  return allowedSets.includes(card.cardSet);
}
