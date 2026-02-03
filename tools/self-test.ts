import { calculatePayout, determineWinner, getSpellById } from '../services/gameLogic.ts';
import { validateSpells } from './card-validations.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Payout tests
const bet = 100;
const win = calculatePayout(bet, 'WIN');
const draw = calculatePayout(bet, 'DRAW');
const loss = calculatePayout(bet, 'LOSS');

console.log('Payouts:', { win, draw, loss });
assert(draw.payout === bet, 'Draw should refund bet');
assert(loss.payout === 0, 'Loss payout should be 0');
assert(win.payout >= bet, 'Win payout should be at least bet');

// Determine winner test using SPELLS
const fire = getSpellById('fire');
const vine = getSpellById('vine');
assert(determineWinner('fire', 'vine') === 'WIN', 'fire should beat vine');
assert(determineWinner('vine', 'fire') === 'LOSS', 'vine should lose to fire');

// Run validations
const issues = validateSpells();
if (issues.length) {
  console.warn('Validation issues found:', issues);
} else {
  console.log('No validation issues detected.');
}

console.log('Self-test completed.');
