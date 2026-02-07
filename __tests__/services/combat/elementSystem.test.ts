/**
 * Element System Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  isElementCounter, 
  evaluateElementInteraction, 
  getSpellById 
} from '../../services/combat/elementSystem';

describe('Element System', () => {
  it('should correctly identify element counters', () => {
    // fire > vine
    expect(isElementCounter('fire1', 'vine1')).toBe(true);
    expect(isElementCounter('vine1', 'fire1')).toBe(false);
    
    // ice > thunder
    expect(isElementCounter('ice1', 'thunder1')).toBe(true);
  });

  it('should return false for non-counter relationships', () => {
    expect(isElementCounter('fire1', 'ice1')).toBe(false);
    expect(isElementCounter('thunder1', 'vine1')).toBe(false);
  });

  it('should evaluate element interaction for crit', () => {
    const { crit, countered } = evaluateElementInteraction('fire1', 'vine1');
    expect(crit).toBe(true);
    expect(countered).toBe(false);
  });

  it('should evaluate element interaction for counter', () => {
    const { crit, countered } = evaluateElementInteraction('vine1', 'fire1');
    expect(crit).toBe(false);
    expect(countered).toBe(true);
  });

  it('should handle null target spell', () => {
    const { crit, countered } = evaluateElementInteraction('fire1', null);
    expect(crit).toBe(false);
    expect(countered).toBe(false);
  });

  it('should get spell by id correctly', () => {
    const spell = getSpellById('fire1');
    expect(spell).toBeDefined();
    expect(spell.id).toBe('fire1');
  });
});
