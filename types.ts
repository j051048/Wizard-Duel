/**
 * Wizard Duel - Type Definitions
 *
 * 全新设计：支持法力系统、手牌管理、状态效果的卡牌对战游戏
 */

// ============ 基础类型 ============

export type SpellType = "fire" | "vine" | "ice" | "thunder" | "rock";

export type Rarity = "common" | "uncommon" | "rare" | "mythic";

/**
 * 卡牌机制/关键词类型
 * - burn: 烧灼 - 获胜后下回合对手额外受伤
 * - tangle: 缠绕 - 获胜后限制对手高费法术
 * - freeze: 冻结 - 平局时冻结对手选择
 * - charge: 蓄力 - 连续使用伤害翻倍
 * - fortify: 坚韧 - 减少受到的伤害
 */
export type Mechanic = "burn" | "tangle" | "freeze" | "charge" | "fortify";

// ============ 卡牌定义 ============

export interface Spell {
  id: SpellType;
  name: string;
  emoji: string;
  icon?: string;
  artSrc?: string;  // 卡牌插画路径

  // 视觉样式
  color: string; // Text color class, e.g., 'text-red-500'
  borderColor: string; // Border color class, e.g., 'border-red-500'
  shadowColor: string; // Shadow color hex, e.g., 'rgba(239,68,68,0.5)'

  // 核心数值
  manaCost: number; // 法力消耗 (1-3)
  damage: number; // 造成伤害
  beats: SpellType; // 克制关系

  // 卡牌属性
  rarity: Rarity;
  mechanic: Mechanic;

  // 描述文本
  description: string;
  shortDesc: string; // 用于UI简短展示
}

// ============ 游戏状态 ============

export type GameState = "LOBBY" | "DUEL" | "RESULT";

export type DuelPhase =
  | "PLAYER_TURN" // 玩家选择阶段
  | "OPPONENT_THINKING" // 对手思考中
  | "REVEAL" // 揭牌阶段
  | "DAMAGE_PHASE" // 伤害结算阶段
  | "EFFECTS_PHASE" // 效果结算阶段
  | "ROUND_RESET"; // 回合重置

// ============ 状态效果 ============

export interface StatusEffect {
  type: "burn" | "tangle" | "frozen";
  duration: number; // 剩余回合数
  value?: number; // 效果数值（如burn伤害）
}

// ============ 玩家状态 ============

export interface DuelState {
  // 生命值
  playerHP: number;
  opponentHP: number;

  // 法力水晶
  playerMana: number;
  playerMaxMana: number;
  opponentMana: number;
  opponentMaxMana: number;

  // 手牌系统
  playerHand: SpellType[];
  playerDeck: SpellType[];
  opponentHandSize: number;

  // 状态效果
  playerEffects: StatusEffect[];
  opponentEffects: StatusEffect[];

  // 连击追踪 (for Charge mechanic)
  playerLastSpell: SpellType | null;
  opponentLastSpell: SpellType | null;
  playerConsecutiveThunder: number;
  opponentConsecutiveThunder: number;

  // 当前回合信息
  roundNumber: number;
}

// ============ 回合结果 ============

export interface RoundResult {
  outcome: "WIN" | "LOSS" | "DRAW";
  playerSpell: SpellType;
  opponentSpell: SpellType;

  // 伤害明细
  baseDamage: number;
  bonusDamage: number;
  reducedDamage: number;
  finalDamage: number;

  // 触发的效果
  triggeredEffects: string[];

  // 新增的状态效果
  newPlayerEffects: StatusEffect[];
  newOpponentEffects: StatusEffect[];
}

// ============ 玩家数据 ============

export interface PlayerStats {
  address: string;
  wins: number;
  losses: number;
  draws: number;
  totalEarnings: number;
}

export interface BattleRecord {
  id: string;
  playerSpell: SpellType;
  opponentSpell: SpellType;
  result: "WIN" | "LOSS" | "DRAW";
  amount: number;
  timestamp: number;
  isCrit?: boolean;
  roundsPlayed?: number;
}

export interface UserProfile {
  address: string;
  balance: number;
}

// ============ 游戏配置 ============

export interface GameConfig {
  maxHP: number;
  startingMana: number;
  maxMana: number;
  manaPerTurn: number;
  handSize: number;
  deckSize: number;
  cardsDrawnPerTurn: number;
}
