/**
 * 对战状态相关类型定义
 * [Phase B-5] 从 types.ts 拆分
 */

import { SpellType, Minion, GameMode } from './card';
import { AIProfile } from './ai';
import type { RNGState } from '../utils/seededRandom';

export type DuelPhase =
  | "DRAFT_PHASE"
  | "MULLIGAN_PHASE"
  | "PLAYER_TURN"
  | "OPPONENT_TURN"
  | "WAITING_FOR_OPPONENT" // [PVP] PVP 模式下等待对手操作
  | "ROUND_RESET"
  | "TURN_TRANSITION"
  | "DEATH_CHECK"
  | "TRIGGER_RESOLVE"
  | "MINION_COMBAT";

export interface StatusEffect {
  type: "burn" | "tangle" | "frozen" | "thawed";
  duration: number;
  value?: number;
}

export type TriggerTiming = 'ON_CAST' | 'ON_DAMAGE' | 'ON_TURN_START' | 'ON_TURN_END' | 'ON_BEFORE_PLAY' | 'ON_DEATH';

export interface GameTrigger {
  id: string;
  timing: TriggerTiming;
  /** 入场时间戳，用于 Order of Play 排序 */
  createdAt: number;
  /** 触发器所属方 */
  owner: 'player' | 'opponent';
  condition?: (state: DuelState, context?: any) => boolean;
  action: (state: DuelState, context?: any) => GameAction[];
  isOnce?: boolean;
}

/**
 * 对战状态
 * 
 * [P0 Fix #2] 安全注意事项：
 * - opponentHand 标记为 @internal，仅供内部 AI 逻辑使用
 * - 前端组件应使用 opponentHandSize，不直接访问 opponentHand
 */
export interface DuelState {
  playerHP: number;
  playerArmor: number;
  opponentHP: number;
  opponentArmor: number;
  playerMana: number;
  playerMaxMana: number;
  opponentMana: number;
  opponentMaxMana: number;
  playerHand: SpellType[];
  playerDeck: SpellType[];
  /** 
   * @internal 仅供内部 AI 逻辑使用
   * @deprecated 前端组件请使用 opponentHandSize
   */
  opponentHand: SpellType[];
  /** 对手手牌数量 - 前端组件应使用此字段 */
  opponentHandSize: number;
  opponentDeck: SpellType[];
  playerEffects: StatusEffect[];
  opponentEffects: StatusEffect[];
  playerMinions: Minion[];
  opponentMinions: Minion[];
  playerLastSpell: SpellType | null;
  opponentLastSpell: SpellType | null;
  playerCostMod: number;
  opponentCostMod: number;
  playerConsecutiveThunder: number;
  opponentConsecutiveThunder: number;
  playerFatigue: number;
  opponentFatigue: number;
  roundNumber: number;
  isTavernMode?: boolean;
  aiProfile?: AIProfile;
  heroSkillsUsed?: boolean;
  opponentHeroSkillUsed?: boolean;
  playerTriggers: GameTrigger[];
  opponentTriggers: GameTrigger[];
  isTutorial?: boolean;

  /** [P0 Fix #2] 确定性随机种子状态，用于回放和断线重连 */
  rngState?: RNGState;
  /** [P0 Fix #1] 全局触发器入场计数器 */
  triggerOrderCounter: number;
}

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
  subType?: string;
  description?: string;
}

export interface GameCommand {
  id: string;
  sourceSpell?: SpellType;
  caster: 'player' | 'opponent';
  actions: GameAction[];
  snapshot?: DuelState; // Intermediate state snapshot for UI and AI optimization
}

export interface RoundResult {
  outcome: "WIN" | "LOSS" | "DRAW";
  playerSpell: SpellType;
  opponentSpell: SpellType;
  baseDamage: number;
  bonusDamage: number;
  reducedDamage: number;
  finalDamage: number;
  playerDamageTaken: number;
  opponentDamageTaken: number;
  playerArmorGain: number;
  opponentArmorGain: number;
  triggeredEffects: string[];
  newPlayerEffects: StatusEffect[];
  newOpponentEffects: StatusEffect[];
}

export interface GameConfig {
  maxHP: number;
  startingMana: number;
  maxMana: number;
  handSize: number;
  deckSize: number;
  cardsDrawnPerTurn: number;
  manaPerTurn: number;
  /** [P1 Fix #7] 每回合最多出牌数 */
  maxCardsPerTurn: number;
}