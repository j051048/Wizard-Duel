import { UserProfile, BattleRecord, PlayerStats } from '../types';

// Mock delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Data Storage (In-memory for MVP demo)
let mockBalance = 1000;
let mockHistory: BattleRecord[] = [];

export const ApiService = {
  async getBalance(address: string): Promise<UserProfile> {
    await delay(600); // Simulate network latency
    // In real app: return axios.get(`${API_BASE_URL}/user/balance?address=${address}`);
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
    playerSpell: string,
    opponentSpell: string,
    isCrit: boolean
  ): Promise<{ newBalance: number }> {
    await delay(800);
    // In real app: POST to backend to verify signature and update DB
    
    // Optimistic update for demo
    mockBalance = mockBalance - bet + payout;
    
    const record: BattleRecord = {
      id: Math.random().toString(36).substr(2, 9),
      playerSpell: playerSpell as any,
      opponentSpell: opponentSpell as any,
      result,
      amount: result === 'WIN' ? payout - bet : (result === 'DRAW' ? payout - bet : -bet),
      timestamp: Date.now(),
      isCrit
    };
    
    mockHistory.unshift(record);
    if (mockHistory.length > 10) mockHistory.pop();

    return { newBalance: mockBalance };
  },

  async getLeaderboard(): Promise<PlayerStats[]> {
    await delay(500);
    // Mock data
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
