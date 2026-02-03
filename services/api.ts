import { UserProfile, BattleRecord, PlayerStats, SpellType } from '../types.ts';
import { determineWinner, calculatePayout } from './gameLogic.ts';

// Mock delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Data Storage (In-memory for MVP demo)
let mockBalance = 1000;
let mockHistory: BattleRecord[] = [];

export const ApiService = {
  async getBalance(address: string): Promise<UserProfile> {
    await delay(600);
    return {
      address,
      balance: mockBalance,
    };
  },

  async settleGame(
    address: string, 
    bet: number, 
    result: 'WIN' | 'LOSS' | 'DRAW', 
    payout: number,
    playerSpell: SpellType,
    opponentSpell: SpellType,
    isCrit: boolean
  ): Promise<{ newBalance: number }> {
    await delay(800);
    
    // Server-side validation: recompute result and payout
    const expectedOutcome = determineWinner(playerSpell, opponentSpell);
    const expected = calculatePayout(bet, expectedOutcome);

    // Prefer server calculation if mismatch
    let finalPayout = payout;
    let finalIsCrit = isCrit;
    let finalResult = result;

    if (expectedOutcome !== result || expected.payout !== payout) {
      finalPayout = expected.payout;
      finalIsCrit = expected.isCrit;
      finalResult = expectedOutcome;
    }

    // Update balance
    mockBalance = mockBalance - bet + finalPayout;

    const record: BattleRecord = {
      id: Math.random().toString(36).substr(2, 9),
      playerSpell,
      opponentSpell,
      result: finalResult,
      amount: finalResult === 'WIN' ? finalPayout - bet : (finalResult === 'DRAW' ? 0 : -bet),
      timestamp: Date.now(),
      isCrit: finalIsCrit
    };
    
    mockHistory.unshift(record);
    if (mockHistory.length > 10) mockHistory.pop();

    return { newBalance: mockBalance };
  },

  async getLeaderboard(): Promise<PlayerStats[]> {
    await delay(500);
    return Array.from({ length: 10 }).map((_, i) => ({
      address: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      wins: Math.floor(Math.random() * 50) + 10,
      losses: Math.floor(Math.random() * 40),
      draws: Math.floor(Math.random() * 20),
      totalEarnings: Math.floor(Math.random() * 10000)
    })).sort((a, b) => b.totalEarnings - a.totalEarnings);
  },

  async getHistory(address: string): Promise<BattleRecord[]> {
    await delay(400);
    return mockHistory;
  }
};
