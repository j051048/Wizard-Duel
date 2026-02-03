import { SpellType, Spell } from '../types';
import { SPELLS, CRIT_CHANCE } from '../constants';

export const getSpellById = (id: SpellType): Spell => {
  return SPELLS.find(s => s.id === id) || SPELLS[0];
};

export const getRandomSpell = (): SpellType => {
  const randomIndex = Math.floor(Math.random() * SPELLS.length);
  return SPELLS[randomIndex].id;
};

export const determineWinner = (playerSpellId: SpellType, opponentSpellId: SpellType): 'WIN' | 'LOSS' | 'DRAW' => {
  if (playerSpellId === opponentSpellId) return 'DRAW';

  const playerSpell = getSpellById(playerSpellId);
  if (playerSpell.beats === opponentSpellId) {
    return 'WIN';
  }
  return 'LOSS';
};

export const calculatePayout = (bet: number, result: 'WIN' | 'LOSS' | 'DRAW'): { payout: number, isCrit: boolean } => {
  let payout = 0;
  let isCrit = false;

  if (result === 'DRAW') {
    payout = Math.floor(bet * 0.92);
  } else if (result === 'WIN') {
    isCrit = Math.random() < CRIT_CHANCE;
    const multiplier = isCrit ? 2.0 : 0.92; // As per prompt: Crit is 2x (assumed on profit), regular is 92%
    // If prompt says "Victory gets 92% x Crit Multiplier", 
    // Simplified: 
    // Normal Win: Bet + (Bet * 0.92)
    // Crit Win: Bet + (Bet * 0.92 * 2) OR Bet * 2 * 0.92? 
    // Let's interpret "Victory gets 92% * Crit(2)".
    
    const profit = bet * multiplier;
    payout = Math.floor(bet + profit);
  }

  return { payout, isCrit };
};
