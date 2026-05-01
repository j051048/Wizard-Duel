/**
 * Game Logic Tests
 */

import { describe, it, expect } from 'vitest';
import type { SpellType } from '../../types';
import {
  canAffordSpell,
  drawCard,
  createInitialDuelState,
  checkGameOver
} from '../../services/gameLogic';

describe('Game Logic', () => {
  it('should check if player can afford spell', () => {
    const result = canAffordSpell('fire' as SpellType, 5, [], 0);
    expect(result.canAfford).toBe(true);
  });

  it('should detect insufficient mana', () => {
    const result = canAffordSpell('fire3' as SpellType, 1, [], 0);
    expect(result.canAfford).toBe(false);
    expect(result.reason).toContain('法力不足');
  });

  it('should block casting when frozen', () => {
    const effects = [{ type: 'frozen' as const, duration: 1 }];
    const result = canAffordSpell('fire' as SpellType, 5, effects, 0);
    expect(result.canAfford).toBe(false);
    expect(result.reason).toContain('冻结');
  });

  it('should draw card from deck', () => {
    const deck: SpellType[] = ['fire', 'ice', 'thunder'];
    const hand: SpellType[] = [];

    const { newDeck, newHand, drawnCard, fatigueDamage } = drawCard(deck, hand, 0);

    expect(newDeck.length).toBe(2);
    expect(newHand.length).toBe(1);
    expect(drawnCard).toBe('fire');
    expect(fatigueDamage).toBe(0);
  });

  it('should apply fatigue damage when deck is empty', () => {
    const deck: SpellType[] = [];
    const hand: SpellType[] = [];

    const { fatigueDamage, newFatigue } = drawCard(deck, hand, 2);

    expect(fatigueDamage).toBe(3); // Previous fatigue + 1
    expect(newFatigue).toBe(3);
  });

  it('should create initial duel state', () => {
    const playerDeck: SpellType[] = ['fire', 'ice', 'thunder', 'vine', 'rock', 'fire2', 'ice2', 'thunder2', 'vine2', 'rock2', 'fire3', 'ice3', 'thunder3', 'vine3', 'rock3', 'healing', 'aoe', 'draw', 'silence', 'skip'];
    const state = createInitialDuelState(playerDeck);

    expect(state.playerHP).toBe(30);
    expect(state.opponentHP).toBe(30);
    expect(state.playerHand.length).toBe(5);
    expect(state.roundNumber).toBe(0);
  });

  it('should detect win condition', () => {
    const state = createInitialDuelState(['fire', 'ice', 'thunder', 'vine', 'rock', 'fire2', 'ice2', 'thunder2', 'vine2', 'rock2', 'fire3', 'ice3', 'thunder3', 'vine3', 'rock3', 'healing', 'aoe', 'draw', 'silence', 'skip'] as SpellType[]);
    state.opponentHP = 0;

    expect(checkGameOver(state)).toBe('WIN');
  });

  it('should detect loss condition', () => {
    const state = createInitialDuelState(['fire', 'ice', 'thunder', 'vine', 'rock', 'fire2', 'ice2', 'thunder2', 'vine2', 'rock2', 'fire3', 'ice3', 'thunder3', 'vine3', 'rock3', 'healing', 'aoe', 'draw', 'silence', 'skip'] as SpellType[]);
    state.playerHP = 0;

    expect(checkGameOver(state)).toBe('LOSS');
  });

  it('should detect draw condition', () => {
    const state = createInitialDuelState(['fire', 'ice', 'thunder', 'vine', 'rock', 'fire2', 'ice2', 'thunder2', 'vine2', 'rock2', 'fire3', 'ice3', 'thunder3', 'vine3', 'rock3', 'healing', 'aoe', 'draw', 'silence', 'skip'] as SpellType[]);
    state.playerHP = 0;
    state.opponentHP = 0;

    expect(checkGameOver(state)).toBe('DRAW');
  });
});
