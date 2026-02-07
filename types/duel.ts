/**
 * 对战状态相关类型定义
 * [Phase B-5] 从 types.ts 拆分
 */

import { SpellType, Minion, GameMode } from './card';
import { AIProfile } from './ai';

export type DuelPhase =
  | "DRAFT_PHASE"
  | "MULLIGAN_PHASE"
  | "PLAYER_TURN"
  | "OPPONENT_TURN"
  | "ROUND_RESET"
  | "TURN_TRANSITION";

export interface StatusEffect {
  type: "burn" | "tangle" | "frozen" | "thawed";
  duration: number;
  value?: number;
}

export type TriggerTiming = 'ON_CAST' | 'ON_DAMAGE' | 'ON_TURN_START' | 'ON_TURN_END';

export interface GameTrigger {
  id: string;
  timing: TriggerTiming;
  condition?: (state: DuelState, context?: any) => boolean;
  action: (state: DuelState, context?: any) => GameAction[];
  isOnce?: boolean;
}

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
  opponentHand: SpellType[];
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
}