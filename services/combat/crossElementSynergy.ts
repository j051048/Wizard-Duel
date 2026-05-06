/**
 * Cross-Element Synergy System
 *
 * When spells of specific elements are cast in sequence (last turn → this turn),
 * a bonus effect triggers. These combos reward strategic element planning.
 *
 * Synergies:
 * - 碎裂 (Shatter): Ice → Rock — The frost cracks the rock's shell, +5 bonus damage
 * - 蔓延 (Spread):  Fire → Vine — Fire spreads through vines, applies burn (2 dmg, 2 turns)
 * - 扎根 (Root):    Vine → Rock — Roots stabilize the stone, gain +3 armor
 */

import { DuelState, GameAction, SpellType } from '../../types';
import { getElementType, ElementType } from './elementSystem';

export interface CrossElementSynergy {
  id: string;
  name: string;
  icon: string;
  fromElement: ElementType;
  toElement: ElementType;
  description: string;
  /** Generate GameActions for this synergy. caster = who cast the current spell. */
  execute: (state: DuelState, caster: 'player' | 'opponent') => GameAction[];
}

export const CROSS_ELEMENT_SYNERGIES: CrossElementSynergy[] = [
  {
    id: 'shatter',
    name: '碎裂',
    icon: '💥',
    fromElement: 'ice',
    toElement: 'rock',
    description: '寒冰碎裂岩壳，造成 +5 额外伤害',
    execute: (_state, caster) => {
      const target = caster === 'player' ? 'opponent' : 'player';
      return [
        {
          type: 'HP_CHANGE',
          target,
          value: -5,
          description: '💥 碎裂！寒冰碎裂岩壳，额外造成 5 点伤害！',
        },
        {
          type: 'MESSAGE',
          target: 'system',
          description: '💥 碎裂联动触发！',
        },
      ];
    },
  },
  {
    id: 'spread',
    name: '蔓延',
    icon: '🔥🌿',
    fromElement: 'fire',
    toElement: 'vine',
    description: '火焰借藤蔓蔓延，对对手施加灼烧 (2伤害/2回合)',
    execute: (_state, caster) => {
      const target = caster === 'player' ? 'opponent' : 'player';
      return [
        {
          type: 'ADD_EFFECT',
          target,
          value: { type: 'burn', duration: 2, value: 2 },
          description: '🔥🌿 蔓延！火焰借藤蔓蔓延，灼烧对手！',
        },
        {
          type: 'MESSAGE',
          target: 'system',
          description: '🔥🌿 蔓延联动触发！',
        },
      ];
    },
  },
  {
    id: 'root',
    name: '扎根',
    icon: '🌿🪨',
    fromElement: 'vine',
    toElement: 'rock',
    description: '藤蔓扎根岩石，获得 +3 护甲',
    execute: (_state, caster) => {
      return [
        {
          type: 'ARMOR_CHANGE',
          target: caster,
          value: 3,
          description: '🌿🪨 扎根！藤蔓稳固岩壁，获得 3 点护甲！',
        },
        {
          type: 'MESSAGE',
          target: 'system',
          description: '🌿🪨 扎根联动触发！',
        },
      ];
    },
  },
];

/**
 * Check if casting `currentSpellId` after `lastSpellId` triggers a cross-element synergy.
 * Returns the matching synergy or null.
 */
export const checkCrossElementSynergy = (
  lastSpellId: SpellType | null,
  currentSpellId: SpellType
): CrossElementSynergy | null => {
  if (!lastSpellId || lastSpellId === 'skip') return null;

  const lastElement = getElementType(lastSpellId);
  const currentElement = getElementType(currentSpellId);

  // Must be different elements (same-element combos are handled by the existing combo system)
  if (lastElement === currentElement || lastElement === 'neutral' || currentElement === 'neutral') {
    return null;
  }

  return CROSS_ELEMENT_SYNERGIES.find(
    s => s.fromElement === lastElement && s.toElement === currentElement
  ) || null;
};

/**
 * Execute a cross-element synergy if applicable.
 * Returns the GameActions to append (empty array if no synergy triggered).
 */
export const executeCrossElementSynergy = (
  state: DuelState,
  caster: 'player' | 'opponent',
  spellId: SpellType
): { actions: GameAction[]; synergy: CrossElementSynergy | null } => {
  const isPlayer = caster === 'player';
  const lastSpellId = isPlayer ? state.playerLastSpell : state.opponentLastSpell;
  const synergy = checkCrossElementSynergy(lastSpellId, spellId);

  if (!synergy) {
    return { actions: [], synergy: null };
  }

  const actions = synergy.execute(state, caster);
  return { actions, synergy };
};
