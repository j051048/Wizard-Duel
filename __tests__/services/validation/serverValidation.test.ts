/**
 * Server Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  validateCardPlay, 
  validateDamageCalculation, 
  validateGameResult 
} from '../../services/validation/serverValidation';
import { createInitialDuelState } from '../../services/gameLogic';

describe('Server Validation', () => {
  it('should validate card play - valid card in hand', async () => {
    const state = createInitialDuelState(['fire1', 'ice1', 'thunder1']);
    state.playerHand = ['fire1', 'ice1'];
    
    const result = await validateCardPlay(state, 'fire1', 'player');
    
    expect(result.valid).toBe(true);
  });

  it('should reject card not in hand', async () => {
    const state = createInitialDuelState(['fire1']);
    state.playerHand = [];
    
    const result = await validateCardPlay(state, 'fire1', 'player');
    
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not in hand');
  });

  it('should validate damage calculation - normal damage', async () => {
    const state = createInitialDuelState([]);
    
    const result = await validateDamageCalculation(state, 50);
    
    expect(result.valid).toBe(true);
    expect(result.calculatedDamage).toBe(50);
  });

  it('should reject negative damage', async () => {
    const state = createInitialDuelState([]);
    
    const result = await validateDamageCalculation(state, -10);
    
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Negative damage');
  });

  it('should reject suspiciously high damage', async () => {
    const state = createInitialDuelState([]);
    
    const result = await validateDamageCalculation(state, 9999);
    
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('too high');
  });

  it('should validate game result - win', async () => {
    const state = createInitialDuelState([]);
    state.opponentHP = 0;
    
    const result = await validateGameResult(state);
    
    expect(result.valid).toBe(true);
    expect(result.result).toBe('WIN');
  });

  it('should validate game result - loss', async () => {
    const state = createInitialDuelState([]);
    state.playerHP = 0;
    
    const result = await validateGameResult(state);
    
    expect(result.valid).toBe(true);
    expect(result.result).toBe('LOSS');
  });

  it('should reject unfinished game', async () => {
    const state = createInitialDuelState([]);
    
    const result = await validateGameResult(state);
    
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not finished');
  });
});
