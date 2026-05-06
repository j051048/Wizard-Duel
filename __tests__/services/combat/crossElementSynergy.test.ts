import { describe, it, expect } from 'vitest';
import type { DuelState, SpellType } from '../../../types';
import {
  checkCrossElementSynergy,
  executeCrossElementSynergy,
  CROSS_ELEMENT_SYNERGIES,
} from '../../../services/combat/crossElementSynergy';

const makeState = (overrides: Partial<DuelState> = {}): DuelState => ({
  playerHP: 30, opponentHP: 30,
  playerMana: 5, opponentMana: 5,
  playerMaxMana: 5, opponentMaxMana: 5,
  playerHand: [], opponentHand: [],
  playerLastSpell: null, opponentLastSpell: null,
  playerConsecutiveThunder: 0, opponentConsecutiveThunder: 0,
  playerEffects: [], opponentEffects: [],
  roundNumber: 1,
  playerArmor: 0, opponentArmor: 0,
  playerMinions: [], opponentMinions: [],
  rngState: { seed: 12345, state: 0 },
  triggerOrderCounter: 0,
  ...overrides,
} as DuelState);

describe('checkCrossElementSynergy', () => {
  it('returns null when lastSpellId is null', () => {
    expect(checkCrossElementSynergy(null, 'fire')).toBeNull();
  });

  it('returns null when lastSpellId is skip', () => {
    expect(checkCrossElementSynergy('skip', 'fire')).toBeNull();
  });

  it('returns null for same-element sequence (handled by combo system)', () => {
    expect(checkCrossElementSynergy('ice', 'ice2')).toBeNull();
  });

  it('returns null for neutral element spells', () => {
    expect(checkCrossElementSynergy('healing', 'fire')).toBeNull();
  });

  it('returns shatter synergy for ice → rock', () => {
    const result = checkCrossElementSynergy('ice', 'rock');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('shatter');
  });

  it('returns spread synergy for fire → vine', () => {
    const result = checkCrossElementSynergy('fire', 'vine2');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('spread');
  });

  it('returns root synergy for vine → rock', () => {
    const result = checkCrossElementSynergy('vine', 'rock');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('root');
  });

  it('does not return synergy for unmatched element pairs', () => {
    expect(checkCrossElementSynergy('fire', 'ice')).toBeNull();
    expect(checkCrossElementSynergy('thunder', 'fire')).toBeNull();
  });

  it('handles hero skill variants', () => {
    const result = checkCrossElementSynergy('hero_ice', 'rock');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('shatter');
  });
});

describe('executeCrossElementSynergy', () => {
  it('shatter: deals 5 bonus damage to opponent when player casts', () => {
    const state = makeState({ playerLastSpell: 'ice' as SpellType });
    const { actions, synergy } = executeCrossElementSynergy(state, 'player', 'rock');

    expect(synergy!.id).toBe('shatter');
    const hpAction = actions.find(a => a.type === 'HP_CHANGE');
    expect(hpAction).toBeDefined();
    expect(hpAction!.target).toBe('opponent');
    expect(hpAction!.value).toBe(-5);
  });

  it('shatter: deals 5 bonus damage to player when opponent casts', () => {
    const state = makeState({ opponentLastSpell: 'ice2' as SpellType });
    const { actions, synergy } = executeCrossElementSynergy(state, 'opponent', 'rock');

    expect(synergy!.id).toBe('shatter');
    const hpAction = actions.find(a => a.type === 'HP_CHANGE');
    expect(hpAction!.target).toBe('player');
    expect(hpAction!.value).toBe(-5);
  });

  it('spread: applies burn to opponent when player casts', () => {
    const state = makeState({ playerLastSpell: 'fire' as SpellType });
    const { actions, synergy } = executeCrossElementSynergy(state, 'player', 'vine');

    expect(synergy!.id).toBe('spread');
    const effectAction = actions.find(a => a.type === 'ADD_EFFECT');
    expect(effectAction).toBeDefined();
    expect(effectAction!.target).toBe('opponent');
    expect(effectAction!.value).toEqual({ type: 'burn', duration: 2, value: 2 });
  });

  it('root: grants 3 armor to caster', () => {
    const state = makeState({ playerLastSpell: 'vine' as SpellType });
    const { actions, synergy } = executeCrossElementSynergy(state, 'player', 'rock');

    expect(synergy!.id).toBe('root');
    const armorAction = actions.find(a => a.type === 'ARMOR_CHANGE');
    expect(armorAction).toBeDefined();
    expect(armorAction!.target).toBe('player');
    expect(armorAction!.value).toBe(3);
  });

  it('returns empty actions when no synergy matches', () => {
    const state = makeState({ playerLastSpell: 'fire' as SpellType });
    const { actions, synergy } = executeCrossElementSynergy(state, 'player', 'ice');

    expect(synergy).toBeNull();
    expect(actions).toHaveLength(0);
  });

  it('each synergy includes a MESSAGE action', () => {
    const state = makeState({ playerLastSpell: 'ice' as SpellType });
    const { actions } = executeCrossElementSynergy(state, 'player', 'rock');

    const messages = actions.filter(a => a.type === 'MESSAGE');
    expect(messages.length).toBeGreaterThan(0);
  });
});

describe('CROSS_ELEMENT_SYNERGIES', () => {
  it('has exactly 3 synergies defined', () => {
    expect(CROSS_ELEMENT_SYNERGIES).toHaveLength(3);
  });

  it('each synergy has required fields', () => {
    for (const synergy of CROSS_ELEMENT_SYNERGIES) {
      expect(synergy.id).toBeTruthy();
      expect(synergy.name).toBeTruthy();
      expect(synergy.icon).toBeTruthy();
      expect(synergy.fromElement).toBeTruthy();
      expect(synergy.toElement).toBeTruthy();
      expect(typeof synergy.execute).toBe('function');
    }
  });

  it('no synergy uses the same from and to element', () => {
    for (const synergy of CROSS_ELEMENT_SYNERGIES) {
      expect(synergy.fromElement).not.toBe(synergy.toElement);
    }
  });
});
