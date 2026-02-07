/**
 * Wizard Duel - Type Definitions (Re-export Hub)
 *
 * [Phase B-5] 所有类型已按领域拆分到 types/ 目录
 * 此文件保持向后兼容，所有现有 import { X } from '../types' 仍然有效
 */

// Card types
export type { SpellType, Rarity, Mechanic, CardSet, GameMode, Spell, Minion, Deck } from './types/card';

// Duel types
export type { DuelPhase, StatusEffect, TriggerTiming, GameTrigger, DuelState, ActionType, GameAction, GameCommand, RoundResult, GameConfig } from './types/duel';

// AI types
export type { AIProfile, AIEmoteType, AIStatus } from './types/ai';

// UI types
export type { GameState, Language, Rank, PlayerStats, UserProfile, BattleRecord, PlayerData, GameActionCommand, GameLoopState, GameLoopAction } from './types/ui';
