/**
 * UI 状态相关类型定义
 * [Phase B-5] 从 types.ts 拆分
 */

import { SpellType } from './card';
import { DuelState, DuelPhase } from './duel';
import { AIStatus } from './ai';

export type GameState = "LOGIN" | "LOBBY" | "MODE_SELECT" | "DECK_BUILDER" | "DUEL" | "RESULT" | "TAVERN" | "MATCHMAKING" | "DUNGEON_MAP" | "MULLIGAN" | "SHOP" | "COLLECTION" | "PROFILE" | "BATTLE_PASS" | "PVP_SYNC" | "RANKED" | "ACHIEVEMENTS";

export type Language = 'zh' | 'en';

export type Rank = "Iron" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Epic" | "Master" | "Mythic" | "Legend";

export interface PlayerStats {
  address: string;
  wins: number;
  losses: number;
  draws: number;
  totalEarnings: number;
}

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
  userRank?: Rank;
  rankScore?: number;
  gamesHistory?: BattleRecord[];
  createdAt?: number;
  lastActive?: number;
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

export interface PlayerData {
  selectedDeck: import('./card').Deck | null;
  decks: import('./card').Deck[];
  stats: PlayerStats;
}

// ============ Game Loop State ============

export type GameActionCommand =
  | { type: 'UPDATE_STATE'; payload: Partial<DuelState>; delay?: number }
  | { type: 'ADD_MESSAGE'; payload: string; delay?: number }
  | { type: 'SET_PHASE'; payload: DuelPhase; delay?: number }
  | { type: 'SET_AI_STATUS'; payload: Partial<AIStatus>; delay?: number }
  | { type: 'PLAY_ANIMATION'; payload: { animation: string; target?: string }; delay?: number }
  | { type: 'WAIT'; payload: null; delay?: number }
  | { type: 'UPDATE_UI'; payload: Partial<Omit<GameLoopState, 'duelState' | 'phase'>>; delay?: number }
  | { type: 'EXECUTE_LOGIC'; payload: () => void; delay?: number }
  | { type: 'SET_TARGETING'; payload: GameLoopState['targetingData']; delay?: number };

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
  actionQueue: GameActionCommand[];
  turnTimeLeft: number;
  turnBanner: 'player' | 'opponent' | null;
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