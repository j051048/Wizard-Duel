/**
 * Deck Utils Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  shuffleArray, 
  createDeck, 
  getCardsForMode,
  isCardAvailableInMode 
} from '../../utils/deckUtils';

describe('Deck Utils', () => {
  it('should shuffle array randomly', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffleArray(original);
    
    expect(shuffled.length).toBe(original.length);
    expect(shuffled).not.toEqual(original); // Extremely unlikely to be same order
    expect(shuffled.sort()).toEqual(original); // Same elements after sorting
  });

  it('should create deck with 20 cards', () => {
    const deck = createDeck();
    expect(deck.length).toBe(20);
  });

  it('should create deck with provided base cards', () => {
    const baseCards = ['fire1', 'ice1', 'thunder1'];
    const deck = createDeck(baseCards);
    
    expect(deck.length).toBe(20);
    deck.forEach(card => {
      expect(baseCards).toContain(card);
    });
  });

  it('should get cards for standard mode', () => {
    const cards = getCardsForMode('standard');
    expect(cards.length).toBeGreaterThan(0);
    
    // All cards should be from allowed sets
    cards.forEach(card => {
      expect(['core', 'season1']).toContain(card.cardSet || 'core');
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
    expect(isCardAvailableInMode('fire1', 'standard')).toBe(true);
    expect(isCardAvailableInMode('fire1', 'wild')).toBe(true);
  });

  it('should return false for non-existent cards', () => {
    expect(isCardAvailableInMode('nonexistent_card' as any, 'standard')).toBe(false);
  });
});
