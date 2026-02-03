export type SpellType = 'fire' | 'vine' | 'ice' | 'thunder' | 'rock';

export interface Spell {
  id: SpellType;
  name: string;
  emoji: string;
  icon?: string; 
  color: string;      // Text color class e.g., 'text-red-500'
  borderColor: string; // Border color class e.g., 'border-red-500'
  shadowColor: string; // Shadow color hex or class equivalent logic
  beats: SpellType;
  manaCost?: number;
  damage?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'mythic';
  abilities?: string[];
}

export type GameState = 'LOBBY' | 'DUEL' | 'RESULT';

export type DuelPhase = 'PLAYER_TURN' | 'OPPONENT_THINKING' | 'REVEAL' | 'DAMAGE_PHASE' | 'ROUND_RESET';

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
  result: 'WIN' | 'LOSS' | 'DRAW';
  amount: number;
  timestamp: number;
  isCrit?: boolean;
}

export interface UserProfile {
  address: string;
  balance: number;
}
