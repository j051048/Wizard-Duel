import { Rank } from '../types';

export const RANK_THRESHOLDS: Record<Rank, number> = {
  Iron: 0,
  Bronze: 100,
  Silver: 300,
  Gold: 600,
  Diamond: 1000,
  Legend: 2000
};

export const calculateRankUpdate = (
  currentScore: number, 
  result: 'WIN' | 'LOSS' | 'DRAW',
  winStreak: number = 0
): { newScore: number; newRank: Rank; scoreDelta: number } => {
  let delta = 0;
  
  if (result === 'WIN') {
    delta = 20 + Math.min(winStreak * 5, 30); // 连胜奖励，最高额外+30
  } else if (result === 'LOSS') {
    // 保护分：低段位扣分少
    if (currentScore < 100) delta = 0;
    else if (currentScore < 300) delta = -10;
    else delta = -15;
  }
  
  const newScore = Math.max(0, currentScore + delta);
  let newRank: Rank = 'Iron';
  
  if (newScore >= RANK_THRESHOLDS.Legend) newRank = 'Legend';
  else if (newScore >= RANK_THRESHOLDS.Diamond) newRank = 'Diamond';
  else if (newScore >= RANK_THRESHOLDS.Gold) newRank = 'Gold';
  else if (newScore >= RANK_THRESHOLDS.Silver) newRank = 'Silver';
  else if (newScore >= RANK_THRESHOLDS.Bronze) newRank = 'Bronze';
  
  return { newScore, newRank, scoreDelta: delta };
};
