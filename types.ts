/**
 * Wizard Duel - Type Definitions
 *
 * 全新设计：支持法力系统、手牌管理、状态效果的卡牌对战游戏
 */

// ============ AI对手 ============

export interface AIProfile {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  avatar: string;
  strategy: 'aggressive' | 'defensive' | 'balanced';
}

export type SpellType = "fire" | "vine" | "ice" | "thunder" | "rock" | "fire2" | "vine2" | "ice2" | "thunder2" | "rock2" | "fire3" | "vine3" | "ice3" | "thunder3" | "rock3" | "fire4" | "vine4" | "ice4" | "thunder4" | "rock4" | "fire5" | "vine5" | "ice5" | "thunder5" | "rock5" | "healing" | "aoe" | "draw" | "silence" | "hero_fire" | "hero_vine" | "hero_ice" | "hero_thunder" | "hero_rock" | "skip";

export type Rarity = "common" | "uncommon" | "rare" | "mythic";

export interface Minion {
  id: string;
  instanceId: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  exhausted: boolean;
  type: string;
}

/**
 * 卡牌机制/关键词类型
 * - burn: 烧灼 - 获胜后下回合对手额外受伤
 * - tangle: 缠绕 - 获胜后限制对手高费法术
 * - freeze: 冻结 - 平局时冻结对手选择
 * - charge: 蓄力 - 连续使用伤害翻倍
 * - fortify: 坚韧 - 减少受到的伤害
 */
export type Mechanic = "burn" | "tangle" | "freeze" | "charge" | "fortify" | "heal" | "aoe" | "draw" | "silence" | "skip";

/**
 * 卡牌版本/扩展包
 * - core: 核心卡牌 (永远可用)
 * - classic: 经典扩展 (标准模式可用)
 * - tournament: 竞技场扩展 (当前标准)
 * - legacy: 遗产扩展 (狂野模式可用)
 */
export type CardSet = "core" | "classic" | "tournament" | "legacy";

/**
 * 游戏模式
 * - standard: 标准模式 (只包含当前和经典卡牌)
 * - wild: 狂野模式 (包含所有卡牌)
 */
export type GameMode = "standard" | "wild";

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
  armorGain?: number; // 获得护甲
  beats: SpellType; // 克制关系

  // 卡牌属性
  rarity: Rarity;
  mechanic: Mechanic;
  cardSet?: CardSet; // 新增：卡牌所属扩展包

  // 描述文本
  description: string;
  shortDesc: string; 
  summonId?: string; 
}

// ============ 游戏状态 ============

export type GameState = "LOBBY" | "MODE_SELECT" | "DECK_BUILDER" | "DUEL" | "RESULT" | "TAVERN" | "MATCHMAKING" | "DUNGEON_MAP";

export type DuelPhase =
  | "DRAFT_PHASE" // 选牌阶段
  | "PLAYER_TURN" // 玩家出牌阶段
  | "OPPONENT_TURN" // 对手出牌阶段
  | "ROUND_RESET"; // 回合结束/重置

// ============ 状态效果 ============

export interface StatusEffect {
  type: "burn" | "tangle" | "frozen" | "thawed";
  duration: number; // 剩余回合数
  value?: number; // 效果数值（如burn伤害）
}

// ============ 触发器系统 (New 5.0) ============
export type TriggerTiming = 'ON_CAST' | 'ON_DAMAGE' | 'ON_TURN_START' | 'ON_TURN_END';

export interface GameTrigger {
  id: string;
  timing: TriggerTiming;
  condition?: (state: DuelState, context?: any) => boolean;
  action: (state: DuelState, context?: any) => GameAction[];
  isOnce?: boolean; // 是否是一次性触发（如奥秘）
}

// ============ 玩家状态 ============

export interface DuelState {
  // 生命值
  playerHP: number;
  playerArmor: number; // 新增：护甲
  opponentHP: number;
  opponentArmor: number; // 新增：护甲

  // 法力水晶
  playerMana: number;
  playerMaxMana: number;
  opponentMana: number;
  opponentMaxMana: number;

  // 手牌系统
  playerHand: SpellType[];
  playerDeck: SpellType[];
  opponentHand: SpellType[]; // 新增：实际手牌
  opponentHandSize: number;
  opponentDeck: SpellType[];

  // 状态效果
  playerEffects: StatusEffect[];
  opponentEffects: StatusEffect[];
  playerMinions: Minion[]; 
  opponentMinions: Minion[]; 

  // 连击追踪
  playerLastSpell: SpellType | null;
  opponentLastSpell: SpellType | null;
  playerCostMod: number; // 新增：费用修正
  opponentCostMod: number; // 新增：费用修正
  playerConsecutiveThunder: number;
  opponentConsecutiveThunder: number;

  // 疲劳系统
  playerFatigue: number;
  opponentFatigue: number;

  // 当前回合信息
  roundNumber: number;

  // 酒馆模式
  isTavernMode?: boolean;
  aiProfile?: AIProfile;

  // 英雄技能系统
  heroSkillsUsed?: boolean; // 本回合是否已使用英雄技能
  opponentHeroSkillUsed?: boolean; // 新增：对手本回合是否已使用英雄技能

  // 触发器实例 (不建议放入持久化状态，但在对局内存中有效)
  playerTriggers: GameTrigger[];
  opponentTriggers: GameTrigger[];

  // 模式标志
  isTutorial?: boolean;
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
  finalDamage: number; // Deprecated or kept for compat

  // Patch 2.0 Extended Result
  playerDamageTaken: number;
  opponentDamageTaken: number;
  playerArmorGain: number;
  opponentArmorGain: number;

  // 触发的效果
  triggeredEffects: string[];

  // 新增的状态效果
  newPlayerEffects: StatusEffect[];
  newOpponentEffects: StatusEffect[];
}

// ============ 牌组系统 ============

export interface Deck {
  id: string;
  name: string;
  cards: SpellType[];
  createdAt: number;
  lastUsed: number;
}

export interface PlayerStats {
  address: string;
  wins: number;
  losses: number;
  draws: number;
  totalEarnings: number;
}

export interface PlayerData {
  selectedDeck: Deck | null;
  decks: Deck[];
  stats: PlayerStats;
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

// ============ 排位系统 ============

export type Rank = "Iron" | "Bronze" | "Silver" | "Gold" | "Diamond" | "Legend";

export interface UserProfile {
  address: string;
  balance: number;
  inventory?: SpellType[];
  stats?: {
    wins: number;
    losses: number;
    totalGames: number;
    winStreak: number;
  };
  // 新增：排位信息
  userRank?: Rank;
  rankScore?: number;
  
  gamesHistory?: BattleRecord[];
  createdAt?: number;
  lastActive?: number;
}

// ============ Game Configuration
export interface GameConfig {
  maxHP: number;
  startingMana: number;
  maxMana: number;
  handSize: number;
  deckSize: number;
  cardsDrawnPerTurn: number;
  manaPerTurn: number;
}

export type Language = 'zh' | 'en';

// ============ 规则引擎：动作与命令 (New 3.0) ============

export type ActionType = 
  | 'MANA_CHANGE' 
  | 'HP_CHANGE' 
  | 'ARMOR_CHANGE' 
  | 'ADD_EFFECT' 
  | 'REMOVE_EFFECT' 
  | 'DRAW_CARD' 
  | 'MESSAGE'
  | 'GAME_OVER'
  | 'SUMMON_MINION'
  | 'MINION_ATTACK'
  | 'ANIMATION_TRIGGER';

export interface GameAction {
  type: ActionType;
  target: 'player' | 'opponent' | 'both' | 'system';
  value?: any;
  subType?: string; // 细分类型，如 burn, freeze
  description?: string;
}

export interface GameCommand {
  id: string;
  sourceSpell?: SpellType;
  caster: 'player' | 'opponent';
  actions: GameAction[];
}

// ============ AI 人格化标记 ============
export type AIEmoteType = 'thinking' | 'thinking_fast' | 'laugh' | 'angry' | 'surprised' | 'taunt';

export interface AIStatus {
  emote: AIEmoteType | null;
  message: string | null;
}

// ============ FSM Reducer 类型 (New 4.0) ============

// [New 6.0] 动作队列指令
export interface GameActionCommand {
  type: 'UPDATE_STATE' | 'ADD_MESSAGE' | 'SET_PHASE' | 'SET_AI_STATUS' | 'PLAY_ANIMATION' | 'WAIT' | 'UPDATE_UI';
  payload: any;
  delay?: number;
}

export interface GameLoopState {
  duelState: DuelState | null;
  phase: DuelPhase;
  playerCard: SpellType | null;
  opponentCard: SpellType | null;
  resultText: string;
  effectMessages: string[];
  isGameOver: boolean;
  gameResult: 'WIN' | 'LOSS' | 'DRAW' | null;
  isProcessing: boolean;
  aiStatus: AIStatus;
  targetingData: {
    isTargeting: boolean;
    sourceIndex?: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
  actionQueue: GameActionCommand[]; // 动作队列
}

export type GameLoopAction =
  | { type: 'START_GAME'; payload: DuelState }
  | { type: 'SET_PHASE'; payload: DuelPhase }
  | { type: 'UPDATE_STATE'; payload: Partial<DuelState> }
  | { type: 'UPDATE_UI'; payload: Partial<Omit<GameLoopState, 'duelState' | 'phase'>> }
  | { type: 'ADD_MESSAGE'; payload: string }
  | { type: 'SET_AI_STATUS'; payload: Partial<AIStatus> }
  | { type: 'SET_TARGETING'; payload: GameLoopState['targetingData'] }
  | { type: 'ENQUEUE_ACTIONS'; payload: GameActionCommand[] }
  | { type: 'DEQUEUE_ACTION' }
  | { type: 'RESET_GAME' };
