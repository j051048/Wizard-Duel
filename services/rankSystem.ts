/**
 * 段位系统 - 9级渐进式段位
 * 
 * 段位等级：
 * LV1 黑铁 (Iron)     - 0分起始，需1000分升级
 * LV2 白银 (Silver)   - 1000分起始，需1500分升级
 * LV3 黄金 (Gold)     - 2500分起始，需2000分升级
 * LV4 铂金 (Platinum) - 4500分起始，需2500分升级
 * LV5 钻石 (Diamond)  - 7000分起始，需3000分升级
 * LV6 史诗 (Epic)     - 10000分起始，需4000分升级
 * LV7 王者 (Master)   - 14000分起始，需5000分升级
 * LV8 神话 (Mythic)   - 19000分起始，需6000分升级
 * LV9 传说 (Legend)   - 25000分起始
 */

import { Rank } from '../types';

// 段位阈值（累计积分）
export const RANK_THRESHOLDS: Record<Rank, number> = {
  Iron: 0,        // LV1
  Silver: 1000,   // LV2
  Gold: 2500,     // LV3
  Platinum: 4500, // LV4
  Diamond: 7000,  // LV5
  Epic: 10000,    // LV6
  Master: 14000,  // LV7
  Mythic: 19000,  // LV8
  Legend: 25000   // LV9
};

// 段位对应等级
export const RANK_LEVELS: Record<Rank, number> = {
  Iron: 1,
  Silver: 2,
  Gold: 3,
  Platinum: 4,
  Diamond: 5,
  Epic: 6,
  Master: 7,
  Mythic: 8,
  Legend: 9
};

// 段位顺序（用于遍历）
export const RANK_ORDER: Rank[] = [
  'Iron', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Epic', 'Master', 'Mythic', 'Legend'
];

/**
 * 根据积分获取当前段位
 */
export const getRankByScore = (score: number): Rank => {
  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    if (score >= RANK_THRESHOLDS[RANK_ORDER[i]]) {
      return RANK_ORDER[i];
    }
  }
  return 'Iron';
};

/**
 * 获取下一个段位的积分阈值
 */
export const getNextRankThreshold = (rank: Rank): number => {
  const currentIndex = RANK_ORDER.indexOf(rank);
  if (currentIndex < RANK_ORDER.length - 1) {
    return RANK_THRESHOLDS[RANK_ORDER[currentIndex + 1]];
  }
  // 已是最高段位，返回一个大数值
  return 99999;
};

/**
 * 获取当前段位的起始积分
 */
export const getCurrentRankThreshold = (rank: Rank): number => {
  return RANK_THRESHOLDS[rank];
};

/**
 * 计算战斗后的积分和段位更新
 */
export const calculateRankUpdate = (
  currentScore: number, 
  result: 'WIN' | 'LOSS' | 'DRAW',
  winStreak: number = 0
): { newScore: number; newRank: Rank; scoreDelta: number } => {
  let delta = 0;
  
  if (result === 'WIN') {
    // 基础胜利积分 + 连胜奖励（最高额外+30）
    delta = 25 + Math.min(winStreak * 5, 30);
  } else if (result === 'LOSS') {
    // 低段位保护：黑铁不扣分，白银少扣
    const currentRank = getRankByScore(currentScore);
    if (currentRank === 'Iron') {
      delta = 0; // 黑铁保护，不扣分
    } else if (currentRank === 'Silver') {
      delta = -10;
    } else if (currentRank === 'Gold') {
      delta = -12;
    } else {
      delta = -15;
    }
  } else {
    // 平局
    delta = 5;
  }
  
  const newScore = Math.max(0, currentScore + delta);
  const newRank = getRankByScore(newScore);
  
  return { newScore, newRank, scoreDelta: delta };
};

/**
 * 获取段位等级
 */
export const getRankLevel = (rank: Rank): number => {
  return RANK_LEVELS[rank];
};

/**
 * 获取段位渐变色（用于 UI）
 */
export const getRankGradient = (rank: Rank): string => {
  const gradients: Record<Rank, string> = {
    Iron: 'from-gray-500 to-gray-700',
    Silver: 'from-gray-300 to-gray-500',
    Gold: 'from-yellow-400 to-amber-600',
    Platinum: 'from-cyan-300 to-teal-500',
    Diamond: 'from-blue-400 to-indigo-600',
    Epic: 'from-purple-500 to-pink-600',
    Master: 'from-orange-400 to-red-600',
    Mythic: 'from-rose-400 to-purple-600',
    Legend: 'from-yellow-300 via-amber-400 to-orange-500'
  };
  return gradients[rank] || gradients.Iron;
};
