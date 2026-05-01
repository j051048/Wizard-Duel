/**
 * Damage Calculation Tests
 */

import { describe, it, expect } from 'vitest';
import type { SpellType, Spell } from '../../../types';
import {
  calculateSpellDamage,
  applyArmorReduction,
  calculateSpellCost,
} from '../../../services/combat/damageCalculation';

const makeSpell = (overrides: Partial<Spell>): Spell => ({
  id: 'fire' as SpellType,
  name: '测试法术',
  emoji: '🔥',
  artSrc: '',
  color: 'text-red-500',
  borderColor: 'border-red-500',
  shadowColor: 'rgba(239,68,68,0.5)',
  beats: 'vine' as SpellType,
  manaCost: 2,
  damage: 4,
  armorGain: 0,
  value: 0,
  rarity: 'common',
  mechanic: 'burn',
  cardSet: 'core',
  description: '',
  shortDesc: '',
  ...overrides,
});

describe('calculateSpellDamage', () => {
  it('should return base damage for normal (no counter, no crit)', () => {
    const spell = makeSpell({ damage: 5 });
    expect(calculateSpellDamage(spell, false, false)).toBe(5);
  });

  it('should apply 1.5x crit multiplier', () => {
    const spell = makeSpell({ damage: 10 });
    expect(calculateSpellDamage(spell, false, true)).toBe(15);
  });

  it('should apply combo multiplier', () => {
    const spell = makeSpell({ damage: 10 });
    expect(calculateSpellDamage(spell, false, false, 1.5)).toBe(15);
  });

  it('should stack crit and combo multipliers', () => {
    const spell = makeSpell({ damage: 10 });
    // 10 * 1.5 (crit) * 1.5 (combo) = 22.5 → floor = 22
    expect(calculateSpellDamage(spell, false, true, 1.5)).toBe(22);
  });

  it('should halve damage when countered (not cancel)', () => {
    const spell = makeSpell({ damage: 10 });
    expect(calculateSpellDamage(spell, true, false)).toBe(5);
  });

  it('should halve after crit+combo when countered', () => {
    const spell = makeSpell({ damage: 10 });
    // 10 * 1.5 * 1.5 = 22 → halved = 11
    expect(calculateSpellDamage(spell, true, true, 1.5)).toBe(11);
  });

  it('should floor correctly (not round up)', () => {
    const spell = makeSpell({ damage: 3 });
    // 3 * 0.5 = 1.5 → floor = 1
    expect(calculateSpellDamage(spell, true, false)).toBe(1);
  });

  it('should return 0 for 0-damage spell even with crit+combo', () => {
    const spell = makeSpell({ damage: 0 });
    expect(calculateSpellDamage(spell, false, true, 2.0)).toBe(0);
  });

  it('should use default combo multiplier of 1.0', () => {
    const spell = makeSpell({ damage: 8 });
    expect(calculateSpellDamage(spell, false, false)).toBe(8);
  });
});

describe('applyArmorReduction', () => {
  it('should pass through full damage when no armor', () => {
    expect(applyArmorReduction(5, 0)).toEqual({ finalDamage: 5, armorConsumed: 0 });
  });

  it('should consume armor and reduce damage', () => {
    expect(applyArmorReduction(10, 3)).toEqual({ finalDamage: 7, armorConsumed: 3 });
  });

  it('should fully absorb damage when armor >= damage', () => {
    expect(applyArmorReduction(5, 10)).toEqual({ finalDamage: 0, armorConsumed: 5 });
  });

  it('should fully absorb damage when armor equals damage', () => {
    expect(applyArmorReduction(7, 7)).toEqual({ finalDamage: 0, armorConsumed: 7 });
  });

  it('should handle negative armor as 0', () => {
    expect(applyArmorReduction(5, -3)).toEqual({ finalDamage: 5, armorConsumed: 0 });
  });

  it('should handle 0 damage', () => {
    expect(applyArmorReduction(0, 5)).toEqual({ finalDamage: 0, armorConsumed: 0 });
  });
});

describe('calculateSpellCost', () => {
  it('should return base mana cost with no modifier', () => {
    expect(calculateSpellCost('fire')).toBe(4);
  });

  it('should add cost modifier (tangle effect)', () => {
    expect(calculateSpellCost('fire', 2)).toBe(6);
  });

  it('should not go below 0 mana cost', () => {
    expect(calculateSpellCost('rock', -10)).toBe(0);
  });

  it('should return 0 for skip spell', () => {
    expect(calculateSpellCost('skip')).toBe(0);
  });

  it('should return 0 for skip with modifier', () => {
    expect(calculateSpellCost('skip', 3)).toBe(0);
  });

  it('should handle 0-cost spells with positive modifier', () => {
    // 'fire7' (余烬) is 0-cost, +2 tangle = 2
    expect(calculateSpellCost('fire7', 2)).toBe(2);
  });
});
