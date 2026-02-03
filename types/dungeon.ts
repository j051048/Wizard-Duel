import { SpellType, Deck } from '../types';

export type NodeType = 'BATTLE' | 'ELITE' | 'BOSS' | 'REST' | 'EVENT' | 'SHOP';

export interface DungeonNode {
  id: string;
  type: NodeType;
  depth: number;
  name: string;
  description?: string;
  isCleared: boolean;
  // Specific data
  enemyProfileId?: string;
  eventData?: any;
}

export interface Artifact {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or Lucide icon name
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  effectType: 'BUFF_DAMAGE' | 'HEAL_BATTLE_END' | 'DISCOUNT_SPELL' | 'MAX_HP_UP';
  value: number; // e.g. +1 damage, +5 heal
}

export interface DungeonRunState {
  runId: string;
  seed: string;
  currentDepth: number;
  playerHP: number;
  maxHP: number;
  gold: number;
  
  deck: Deck;
  artifacts: Artifact[];
  
  map: DungeonNode[]; // Simple linear map or branched
  currentNodeIndex: number;
  
  isGameOver: boolean;
  isVictory: boolean;
}

export const INITIAL_PLAYER_HP = 100;
