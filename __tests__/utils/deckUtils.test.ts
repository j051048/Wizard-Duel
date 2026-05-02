/**
 * Deck Utils Tests
 */

import { describe, it, expect } from 'vitest';
import type { SpellType } from '../../types';
import {
  shuffleArray,
  createDeck,
  getCardsForMode,
  isCardAvailableInMode,
  validateDeck
} from '../../utils/deckUtils';

describe('Deck Utils', () => {
  it('should shuffle array randomly', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // Use native random for non-deterministic shuffle test
    const shuffled = shuffleArray(original, true);

    expect(shuffled.length).toBe(original.length);
    expect(shuffled).not.toEqual(original); // Extremely unlikely to be same order
    expect([...shuffled].sort((a, b) => a - b)).toEqual(original); // Same elements after sorting
  });

  it('should create deck with 20 cards', () => {
    const deck = createDeck();
    expect(deck.length).toBe(20);
  });

  it('should create deck with provided base cards', () => {
    const baseCards: SpellType[] = ['fire', 'ice', 'thunder'];
    const deck = createDeck(baseCards);

    expect(deck.length).toBe(20);
    deck.forEach(card => {
      expect(baseCards).toContain(card);
    });
  });

  it('should get cards for standard mode', () => {
    const cards = getCardsForMode('standard');
    expect(cards.length).toBeGreaterThan(0);

    // All cards should be from standard sets
    cards.forEach(card => {
      expect(['core', 'classic', 'tournament', 'expansion_1']).toContain(card.cardSet || 'core');
    });
  });

  it('should get cards for wild mode', () => {
    const cards = getCardsForMode('wild');
    expect(cards.length).toBeGreaterThan(0);

    // Wild includes all sets
    const standardCards = getCardsForMode('standard');
    expect(cards.length).toBeGreaterThanOrEqual(standardCards.length);
  });

  it('should check card availability in mode', () => {
    // Core cards always available
    expect(isCardAvailableInMode('fire' as SpellType, 'standard')).toBe(true);
    expect(isCardAvailableInMode('fire' as SpellType, 'wild')).toBe(true);
  });

  it('should return false for non-existent cards', () => {
    expect(isCardAvailableInMode('nonexistent_card' as unknown as SpellType, 'standard')).toBe(false);
  });

  // --- Deck Validation Tests (Phase B-3) ---
  describe('validateDeck', () => {
    it('should accept a valid deck with up to 2 copies per card', () => {
      const deck: SpellType[] = ['fire', 'fire', 'ice', 'ice', 'thunder', 'thunder'];
      const result = validateDeck(deck);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject deck with more than 2 copies of a card', () => {
      const deck: SpellType[] = ['fire', 'fire', 'fire'];
      const result = validateDeck(deck);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('最多2份');
    });

    it('should reject legendary card with 2 copies', () => {
      const deck: SpellType[] = ['fire_ultimate', 'fire_ultimate'];
      const result = validateDeck(deck);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('传说卡');
    });

    it('should accept a single copy of a legendary card', () => {
      const deck: SpellType[] = ['fire_ultimate'];
      const result = validateDeck(deck);
      expect(result.valid).toBe(true);
    });

    it('should reject unknown card IDs', () => {
      const deck: SpellType[] = ['nonexistent_card_xyz'];
      const result = validateDeck(deck);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('未知卡牌');
    });
  });
});
