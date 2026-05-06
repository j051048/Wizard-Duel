/**
 * Limited-Time Mode Framework
 *
 * Defines special game modes that rotate weekly/event-based.
 * Each mode modifies game rules via rule modifiers.
 *
 * Modes are purely client-side configuration; the server only needs modeId for matchmaking.
 */

export type ModeDifficulty = 'casual' | 'competitive';

export interface ModeRuleModifiers {
  /** Override max HP (default: 30) */
  maxHP?: number;
  /** Override starting mana (default: 0) */
  startingMana?: number;
  /** Override max mana (default: 10) */
  maxMana?: number;
  /** Override hand size (default: 5) */
  handSize?: number;
  /** Override deck min/max (default: 25-30) */
  deckMin?: number;
  deckMax?: number;
  /** Override cards drawn per turn (default: 1) */
  cardsDrawnPerTurn?: number;
  /** Ban specific spell IDs */
  bannedSpells?: string[];
  /** Only allow specific elements (empty = all) */
  allowedElements?: string[];
  /** Enable cross-element synergy bonuses (default: true in standard) */
  crossElementSynergy?: boolean;
  /** Custom damage multiplier for all spells */
  damageMultiplier?: number;
  /** Custom mana cost modifier (additive) */
  manaCostModifier?: number;
  /** Enable special mechanic (mode-specific) */
  specialMechanic?: string;
}

export interface GameModeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: ModeDifficulty;
  /** ISO date string — mode available from */
  startsAt?: string;
  /** ISO date string — mode expires at */
  endsAt?: string;
  /** If true, mode is always available (not time-limited) */
  isPermanent: boolean;
  /** Rule modifiers applied on top of standard rules */
  modifiers: ModeRuleModifiers;
  /** Optional: required player level to unlock */
  requiredLevel?: number;
  /** Optional: featured tag for lobby display */
  featured?: boolean;
}

// ============ Built-in Modes ============

export const GAME_MODES: GameModeDefinition[] = [
  {
    id: 'standard',
    name: '标准对决',
    description: '经典巫师对决规则，25-30张牌组，跨元素联动生效。',
    icon: '⚔️',
    difficulty: 'competitive',
    isPermanent: true,
    modifiers: {
      crossElementSynergy: true,
    },
  },
  {
    id: 'turbo',
    name: '极速对决',
    description: '每回合抽2张牌，起始3点法力，快节奏战斗！',
    icon: '⚡',
    difficulty: 'casual',
    isPermanent: true,
    modifiers: {
      startingMana: 3,
      cardsDrawnPerTurn: 2,
      deckMin: 15,
      deckMax: 25,
    },
  },
  {
    id: 'element_forge',
    name: '元素熔炉',
    description: '只能使用单一元素牌组！纯火流、纯冰流，考验元素理解。',
    icon: '🔥',
    difficulty: 'competitive',
    isPermanent: true,
    modifiers: {
      deckMin: 15,
      deckMax: 25,
      specialMechanic: '选择牌组时锁定第一个加入的元素',
    },
  },
  {
    id: 'glass_cannon',
    name: '玻璃大炮',
    description: 'HP仅15点，所有伤害x1.5！一击定胜负的刺激对决。',
    icon: '💥',
    difficulty: 'casual',
    isPermanent: true,
    modifiers: {
      maxHP: 15,
      damageMultiplier: 1.5,
      deckMin: 15,
      deckMax: 25,
    },
  },
  {
    id: 'mana_surge',
    name: '法力涌动',
    description: '起始5点法力，但每回合仅恢复1点。前期爆发，后期乏力。',
    icon: '💎',
    difficulty: 'competitive',
    isPermanent: true,
    modifiers: {
      startingMana: 5,
      deckMin: 20,
      deckMax: 30,
      specialMechanic: '法力恢复量固定为1（不受回合数影响）',
    },
  },
];

// ============ Mode Lookup Utilities ============

const modeMap = new Map(GAME_MODES.map(m => [m.id, m]));

/**
 * Get a mode definition by ID. Falls back to standard.
 */
export const getModeById = (modeId: string): GameModeDefinition => {
  return modeMap.get(modeId) || GAME_MODES[0];
};

/**
 * Get all currently available modes (permanent + date-valid limited modes).
 */
export const getAvailableModes = (): GameModeDefinition[] => {
  const now = new Date();
  return GAME_MODES.filter(mode => {
    if (mode.isPermanent) return true;
    if (mode.startsAt && new Date(mode.startsAt) > now) return false;
    if (mode.endsAt && new Date(mode.endsAt) < now) return false;
    return true;
  });
};

/**
 * Check if a spell is banned in a given mode.
 */
export const isSpellBannedInMode = (modeId: string, spellId: string): boolean => {
  const mode = getModeById(modeId);
  return mode.modifiers.bannedSpells?.includes(spellId) ?? false;
};

/**
 * Get effective game config for a mode (merged with defaults).
 */
export const getEffectiveConfig = (modeId: string) => {
  const mode = getModeById(modeId);
  const m = mode.modifiers;
  return {
    maxHP: m.maxHP ?? 30,
    startingMana: m.startingMana ?? 0,
    maxMana: m.maxMana ?? 10,
    handSize: m.handSize ?? 5,
    deckMin: m.deckMin ?? 25,
    deckMax: m.deckMax ?? 30,
    cardsDrawnPerTurn: m.cardsDrawnPerTurn ?? 1,
    damageMultiplier: m.damageMultiplier ?? 1.0,
    manaCostModifier: m.manaCostModifier ?? 0,
    crossElementSynergy: m.crossElementSynergy ?? true,
    bannedSpells: m.bannedSpells ?? [],
    allowedElements: m.allowedElements ?? [],
    specialMechanic: m.specialMechanic,
  };
};
