/**
 * Combo System Tests
 */

import { describe, it, expect } from 'vitest';
import type { SpellType } from '../../../types';
import {
  calculateComboBonus
} from '../../../services/combat/comboSystem';
import type { DuelState } from '../../../types';

describe('Combo System', () => {
  const mockState: DuelState = {
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
  };

  it('should calculate combo bonus for first thunder spell', () => {
    const state = { ...mockState, playerLastSpell: 'thunder' as SpellType };
    const result = calculateComboBonus(state, 'player', 'thunder2', false);

    expect(result.multiplier).toBeGreaterThan(1);
    expect(result.newComboCount).toBe(1);
    expect(result.comboMessage).toContain('闪电连击');
  });

  it('should still apply combo when countered (50% damage handled elsewhere)', () => {
    const state = { ...mockState, playerLastSpell: 'thunder' as SpellType };
    const result = calculateComboBonus(state, 'player', 'thunder2', true);

    // Combo persists through counter — the 50% damage reduction is handled in gameLogic, not here
    expect(result.multiplier).toBeCloseTo(1.35); // 1 + (1 * 0.35)
    expect(result.newComboCount).toBe(1);
    expect(result.comboMessage).toContain('闪电连击');
  });

  it('should cap combo at 2 stacks', () => {
    const state = { ...mockState, playerLastSpell: 'thunder' as SpellType, playerConsecutiveThunder: 2 };
    const result = calculateComboBonus(state, 'player', 'thunder2', false);

    expect(result.multiplier).toBeCloseTo(1.7); // Max multiplier: 1 + (2 * 0.35)
    expect(result.newComboCount).toBe(2); // No increase
  });

  it('should reset combo for non-thunder spells', () => {
    const state = { ...mockState, playerLastSpell: 'thunder' as SpellType, playerConsecutiveThunder: 1 };
    const result = calculateComboBonus(state, 'player', 'fire', false);

    expect(result.multiplier).toBe(1.0);
    expect(result.newComboCount).toBe(0);
  });
});
