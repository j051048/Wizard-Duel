/**
 * Element System Tests
 */

import { describe, it, expect } from 'vitest';
import type { SpellType } from '../../../types';
import {
  isElementCounter,
  evaluateElementInteraction,
  getSpellById
} from '../../../services/combat/elementSystem';

describe('Element System', () => {
  it('should correctly identify element counters', () => {
    // fire > vine
    expect(isElementCounter('fire' as SpellType, 'vine' as SpellType)).toBe(true);
    expect(isElementCounter('vine' as SpellType, 'fire' as SpellType)).toBe(false);

    // ice > thunder
    expect(isElementCounter('ice' as SpellType, 'thunder' as SpellType)).toBe(true);
  });

  it('should return false for non-counter relationships', () => {
    expect(isElementCounter('fire' as SpellType, 'ice' as SpellType)).toBe(false);
    expect(isElementCounter('thunder' as SpellType, 'vine' as SpellType)).toBe(false);
  });

  it('should evaluate element interaction for crit', () => {
    const { crit, countered } = evaluateElementInteraction('fire' as SpellType, 'vine' as SpellType);
    expect(crit).toBe(true);
    expect(countered).toBe(false);
  });

  it('should evaluate element interaction for counter', () => {
    const { crit, countered } = evaluateElementInteraction('vine' as SpellType, 'fire' as SpellType);
    expect(crit).toBe(false);
    expect(countered).toBe(true);
  });

  it('should handle null target spell', () => {
    const { crit, countered } = evaluateElementInteraction('fire' as SpellType, null);
    expect(crit).toBe(false);
    expect(countered).toBe(false);
  });

  it('should get spell by id correctly', () => {
    const spell = getSpellById('fire' as SpellType);
    expect(spell).toBeDefined();
    expect(spell.id).toBe('fire');
  });
});
