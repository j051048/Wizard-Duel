import { Spell, GameConfig, SpellType } from './types.ts';

export const API_BASE_URL = 'https://your-api.com';

// ============ 游戏配置 ============

export const GAME_CONFIG: GameConfig = {
  maxHP: 5,              // 增加HP以支持更长的对局
  startingMana: 3,       // 每回合起始法力
  maxMana: 5,            // 最大法力上限
  manaPerTurn: 3,        // 每回合恢复法力
  handSize: 3,           // 手牌上限
  deckSize: 15,          // 牌组大小 (每种元素3张)
  cardsDrawnPerTurn: 2,  // 每回合抽牌数
};

export const MAX_HP = GAME_CONFIG.maxHP;

// ============ 差异化卡牌设计 ============

/**
 * 五元素法术 - 遵循 TCG 设计原则
 * 
 * 🔥 Fire (Aggro): 高费高伤 + Burn效果
 * 🌿 Vine (Control): 中费 + Tangle效果
 * ❄️ Ice (Tempo): 低费 + Freeze效果  
 * ⚡ Thunder (Combo): 低费 + Charge连击
 * 🪨 Rock (Midrange): 低费防御 + Fortify减伤
 * 
 * 克制循环: Fire > Vine > Ice > Thunder > Rock > Fire
 */
export const SPELLS: Spell[] = [
  { 
    id: 'fire', 
    name: 'Pyroblast',        // 火球术 - 高费高伤的进攻法术
    emoji: '🔥', 
    color: 'text-red-500', 
    borderColor: 'border-red-500',
    shadowColor: 'rgba(239,68,68,0.5)',
    beats: 'vine',
    manaCost: 3,              // 最高费用
    damage: 2,                // 高伤害
    rarity: 'rare',
    mechanic: 'burn',
    description: '造成2点伤害。若获胜，对手下回合开始时额外受到1点灼烧伤害。',
    shortDesc: 'Burn: +1 伤害'
  },
  { 
    id: 'vine', 
    name: 'Entangling Roots', // 缠绕之根 - 控制型法术
    emoji: '🌿', 
    color: 'text-green-500', 
    borderColor: 'border-green-500',
    shadowColor: 'rgba(34,197,94,0.5)',
    beats: 'ice',
    manaCost: 2,              // 中等费用
    damage: 1,                // 标准伤害
    rarity: 'uncommon',
    mechanic: 'tangle',
    description: '造成1点伤害。若获胜，对手下回合无法使用费用超过2的法术。',
    shortDesc: 'Tangle: 限制高费'
  },
  { 
    id: 'ice', 
    name: 'Frost Nova',       // 霜冻新星 - 节奏型法术
    emoji: '❄️', 
    color: 'text-cyan-400', 
    borderColor: 'border-cyan-400',
    shadowColor: 'rgba(34,211,238,0.5)',
    beats: 'thunder',
    manaCost: 2,              // 中等费用
    damage: 1,                // 标准伤害
    rarity: 'uncommon',
    mechanic: 'freeze',
    description: '造成1点伤害。若平局，冻结对手（下回合必须使用相同法术或跳过回合）。',
    shortDesc: 'Freeze: 平局控制'
  },
  { 
    id: 'thunder', 
    name: 'Chain Lightning',  // 连环闪电 - 连击型法术
    emoji: '⚡', 
    color: 'text-yellow-400', 
    borderColor: 'border-yellow-400',
    shadowColor: 'rgba(250,204,21,0.5)',
    beats: 'rock',
    manaCost: 1,              // 低费用
    damage: 1,                // 基础伤害低
    rarity: 'common',
    mechanic: 'charge',
    description: '造成1点伤害。连续使用两次时，第二次伤害翻倍。',
    shortDesc: 'Charge: 连击×2'
  },
  { 
    id: 'rock', 
    name: 'Stone Bulwark',    // 石壁屏障 - 防御型法术  
    emoji: '🪨', 
    color: 'text-stone-400', 
    borderColor: 'border-stone-400',
    shadowColor: 'rgba(168,162,158,0.5)',
    beats: 'fire',
    manaCost: 1,              // 低费用
    damage: 1,                // 标准伤害
    rarity: 'common',
    mechanic: 'fortify',
    description: '造成1点伤害。即使失败，也减少1点受到的伤害。',
    shortDesc: 'Fortify: 减伤1'
  },
];

// ============ 下注选项 ============

export const BET_OPTIONS = [10, 50, 100];

// ============ 胜负倍率 ============

export const WIN_MULTIPLIER = 0.92;   // 胜利赔率
export const CRIT_CHANCE = 0.10;      // 暴击几率
export const CRIT_MULTIPLIER = 2.0;   // 暴击倍率

// ============ 辅助函数 ============

/**
 * 创建初始牌组：每种元素各3张，共15张
 */
export const createDeck = (): SpellType[] => {
  const deck: SpellType[] = [];
  const elements: SpellType[] = ['fire', 'vine', 'ice', 'thunder', 'rock'];
  
  for (const element of elements) {
    for (let i = 0; i < 3; i++) {
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
    charge: '蓄力',
    fortify: '坚韧',
  };
  return names[mechanic] || mechanic;
};
