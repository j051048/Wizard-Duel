import { SpellType, Spell } from '../types.ts';
import { SPELLS, CRIT_CHANCE, WIN_MULTIPLIER, CRIT_MULTIPLIER } from '../constants.ts';

export const getSpellById = (id: SpellType): Spell => {
  return SPELLS.find(s => s.id === id) || SPELLS[0];
};

// AI: optionally prefer a counter to the player's last play
export const getRandomSpell = (playerSpellId?: SpellType): SpellType => {
  if (playerSpellId) {
    // 50% chance to pick a counter (the spell that beats player's), else random
    if (Math.random() < 0.5) {
      const playerSpell = getSpellById(playerSpellId);
      const counter = SPELLS.find(s => s.beats === playerSpell.id);
      if (counter) return counter.id;
    }
  }
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

/**
 * Payout rules (clear and consistent):
 * - DRAW: refund the bet (payout = bet)
 * - WIN: profit = bet * WIN_MULTIPLIER ; if crit then profit *= CRIT_MULTIPLIER
 *   final payout = Math.floor(bet + profit)
 * - LOSS: payout = 0
 */
export const calculatePayout = (bet: number, result: 'WIN' | 'LOSS' | 'DRAW'): { payout: number, isCrit: boolean } => {
  let payout = 0;
  let isCrit = false;

  if (result === 'DRAW') {
    payout = Math.floor(bet); // refund full bet on draw
  } else if (result === 'WIN') {
    isCrit = Math.random() < CRIT_CHANCE;
    let profit = bet * WIN_MULTIPLIER;
    if (isCrit) profit *= CRIT_MULTIPLIER;
    payout = Math.floor(bet + profit);
  } else {
    payout = 0;
  }

  return { payout, isCrit };
};
