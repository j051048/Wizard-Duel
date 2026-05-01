/**
 * Turn Manager Tests
 */

import { describe, it, expect } from 'vitest';
import type { DuelState, StatusEffect } from '../../../types';
import {
  checkGameOver,
  recalculateCostMod,
} from '../../../services/combat/turnManager';

const makeState = (overrides: Partial<DuelState> = {}): DuelState => ({
  playerHP: 30,
  opponentHP: 30,
  playerArmor: 0,
  opponentArmor: 0,
  playerMana: 5,
  opponentMana: 5,
  playerMaxMana: 5,
  opponentMaxMana: 5,
  playerHand: [],
  opponentHand: [],
  opponentHandSize: 0,
  playerDeck: [],
  opponentDeck: [],
  playerEffects: [],
  opponentEffects: [],
  playerMinions: [],
  opponentMinions: [],
  playerLastSpell: null,
  opponentLastSpell: null,
  playerCostMod: 0,
  opponentCostMod: 0,
  playerConsecutiveThunder: 0,
  opponentConsecutiveThunder: 0,
  roundNumber: 1,
  playerFatigue: 0,
  opponentFatigue: 0,
  heroSkillsUsed: false,
  opponentHeroSkillUsed: false,
  playerTriggers: [],
  opponentTriggers: [],
  isTutorial: false,
  triggerOrderCounter: 0,
  ...overrides,
});

describe('checkGameOver', () => {
  it('should return null when both players are alive', () => {
    expect(checkGameOver(makeState())).toBeNull();
  });

  it('should return WIN when opponent HP is 0', () => {
    expect(checkGameOver(makeState({ opponentHP: 0 }))).toBe('WIN');
  });

  it('should return LOSS when player HP is 0', () => {
    expect(checkGameOver(makeState({ playerHP: 0 }))).toBe('LOSS');
  });

  it('should return DRAW when both HP are 0', () => {
    expect(checkGameOver(makeState({ playerHP: 0, opponentHP: 0 }))).toBe('DRAW');
  });

  it('should return LOSS when player HP is negative', () => {
    expect(checkGameOver(makeState({ playerHP: -5 }))).toBe('LOSS');
  });

  it('should return WIN when opponent HP is negative', () => {
    expect(checkGameOver(makeState({ opponentHP: -3 }))).toBe('WIN');
  });

  it('should return DRAW when both HP are negative', () => {
    expect(checkGameOver(makeState({ playerHP: -2, opponentHP: -1 }))).toBe('DRAW');
  });

  it('should return null when player HP is 1 (just alive)', () => {
    expect(checkGameOver(makeState({ playerHP: 1, opponentHP: 1 }))).toBeNull();
  });
});

describe('recalculateCostMod', () => {
  it('should return 0 for empty effects', () => {
    expect(recalculateCostMod([])).toBe(0);
  });

  it('should return tangle value from effects', () => {
    const effects: StatusEffect[] = [
      { type: 'burn', duration: 2, value: 1 },
      { type: 'tangle', duration: 3, value: 2 },
    ];
    expect(recalculateCostMod(effects)).toBe(2);
  });

  it('should return 0 when no tangle effect exists', () => {
    const effects: StatusEffect[] = [
      { type: 'burn', duration: 2, value: 1 },
      { type: 'frozen', duration: 1, value: 0 },
    ];
    expect(recalculateCostMod(effects)).toBe(0);
  });

  it('should use first tangle effect if multiple exist', () => {
    const effects: StatusEffect[] = [
      { type: 'tangle', duration: 2, value: 3 },
      { type: 'tangle', duration: 1, value: 1 },
    ];
    expect(recalculateCostMod(effects)).toBe(3);
  });

  it('should return 0 when tangle value is 0', () => {
    const effects: StatusEffect[] = [
      { type: 'tangle', duration: 1, value: 0 },
    ];
    expect(recalculateCostMod(effects)).toBe(0);
  });

  it('should return 0 when tangle value is undefined', () => {
    const effects: StatusEffect[] = [
      { type: 'tangle', duration: 1, value: undefined } as any,
    ];
    expect(recalculateCostMod(effects)).toBe(0);
  });
});
