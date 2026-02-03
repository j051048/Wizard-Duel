import { Spell, GameConfig, SpellType } from './types.ts';

export const API_BASE_URL = 'https://your-api.com';

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
  { 
    id: 'fire', 
    name: 'Pyroblast',        // 炎爆术
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
    description: '造成6点伤害。如果获胜，下回合对手额外受到2点燃烧伤害。',
    shortDesc: 'Burn: +2 DoT'
  },
  { 
    id: 'vine', 
    name: 'Stranglethorn',    // 荆棘缠绕
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
    description: '造成3点伤害。如果获胜，对手下一张法术费用增加(2)点。',
    shortDesc: 'Tangle: 费用+2'
  },
  { 
    id: 'ice', 
    name: 'Blizzard',         // 暴风雪
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
    description: '造成4点伤害。如果平局或胜利，冻结对手（下回合如果再次对决失败，跳过攻击阶段）。',
    shortDesc: 'Freeze: 冻结'
  },
  { 
    id: 'thunder', 
    name: 'Lightning Bolt',   // 闪电箭
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
    description: '造成4点伤害。如果你上回合使用了闪电箭，伤害翻倍(8)。',
    shortDesc: 'Charge: 连击x2'
  },
  { 
    id: 'rock', 
    name: 'Iron Skin',        // 铁皮术
    emoji: '🪨', 
    artSrc: '/cards/rock-bulwark.webp',
    color: 'text-stone-400', 
    borderColor: 'border-stone-400',
    shadowColor: 'rgba(168,162,158,0.5)',
    beats: 'fire',
    manaCost: 1,              // 低费灵活
    damage: 0,                // 无攻击力
    armorGain: 5,             // 纯防御
    rarity: 'common',
    mechanic: 'fortify',
    description: '造成0点伤害，但获得5点护甲。',
    shortDesc: 'Fortify: +5 甲'
  },
  { 
    id: 'skip', 
    name: 'Pass Turn',        // 跳过回合
    emoji: '🏳️', 
    artSrc: '',               // 无图
    color: 'text-gray-400', 
    borderColor: 'border-gray-400',
    shadowColor: 'rgba(156,163,175,0.5)',
    beats: 'skip',            // 自指占位
    manaCost: 0, 
    damage: 0, 
    rarity: 'common',
    mechanic: 'skip',
    description: '跳过本回合。',
    shortDesc: 'Pass'
  },
];

// ============ 下注选项 ============

export const BET_OPTIONS = [10, 50, 100];

// ============ 胜负倍率 ============

export const WIN_MULTIPLIER = 0.95;   // 胜利赔率
export const CRIT_CHANCE = 0.0;       // [P0] 移除随机暴击
export const CRIT_MULTIPLIER = 1.0;   // 失效

// ============ 辅助函数 ============

/**
 * 创建初始牌组：每种元素各4张，共20张
 */
export const createDeck = (): SpellType[] => {
  const deck: SpellType[] = [];
  const elements: SpellType[] = ['fire', 'vine', 'ice', 'thunder', 'rock'];
  
  for (const element of elements) {
    for (let i = 0; i < 4; i++) { // Increase to 4 copies
      deck.push(element);
    }
  }
  
  // Fisher-Yates 洗牌算法
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
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
  };
  return names[mechanic] || mechanic;
};

/**
 * 根据 ID 获取法术详情
 */
export const getSpellById = (id: SpellType): Spell => {
  const spell = SPELLS.find(s => s.id === id);
  if (!spell) {
    throw new Error(`Unknown spell: ${id}`);
  }
  return spell;
};
