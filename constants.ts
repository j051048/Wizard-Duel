import { Spell } from './types.ts';

export const API_BASE_URL = 'https://your-api.com';

export const MAX_HP = 3;

export const SPELLS: Spell[] = [
  { 
    id: 'fire', 
    name: 'Inferno', 
    emoji: '🔥', 
    color: 'text-red-500', 
    borderColor: 'border-red-500',
    shadowColor: 'rgba(239,68,68,0.5)',
    beats: 'vine',
    manaCost: 1,
    damage: 1,
    rarity: 'common'
  },
  { 
    id: 'vine', 
    name: 'Tangling Roots', 
    emoji: '🌿', 
    color: 'text-green-500', 
    borderColor: 'border-green-500',
    shadowColor: 'rgba(34,197,94,0.5)',
    beats: 'ice',
    manaCost: 1,
    damage: 1,
    rarity: 'common'
  },
  { 
    id: 'ice', 
    name: 'Glacial Blast', 
    emoji: '❄️', 
    color: 'text-cyan-400', 
    borderColor: 'border-cyan-400',
    shadowColor: 'rgba(34,211,238,0.5)',
    beats: 'thunder',
    manaCost: 1,
    damage: 1,
    rarity: 'common'
  },
  { 
    id: 'thunder', 
    name: 'Lightning Bolt', 
    emoji: '⚡', 
    color: 'text-yellow-400', 
    borderColor: 'border-yellow-400',
    shadowColor: 'rgba(250,204,21,0.5)',
    beats: 'rock',
    manaCost: 1,
    damage: 1,
    rarity: 'common'
  },
  { 
    id: 'rock', 
    name: 'Granite Shield', 
    emoji: '🪨', 
    color: 'text-stone-400', 
    borderColor: 'border-stone-400',
    shadowColor: 'rgba(168,162,158,0.5)',
    beats: 'fire',
    manaCost: 1,
    damage: 1,
    rarity: 'common'
  },
];

export const BET_OPTIONS = [10, 50, 100];

export const WIN_MULTIPLIER = 0.92; 
export const CRIT_CHANCE = 0.10;
export const CRIT_MULTIPLIER = 2.0;
