/**
 * 好友系统类型定义
 * 
 * [P0 Phase 4] 社交系统核心
 */

export type FriendStatus = 'online' | 'offline' | 'in_game' | 'away';
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface Friend {
  id: string;
  oduserId: string;          // 对方用户ID
  username: string;
  avatar?: string;
  status: FriendStatus;
  lastOnline?: string;       // ISO 日期
  addedAt: string;           // 添加时间
  wins?: number;             // 对战胜场
  losses?: number;           // 对战败场
  note?: string;             // 备注
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatar?: string;
  toUserId: string;
  status: FriendRequestStatus;
  message?: string;          // 添加好友时的留言
  createdAt: string;
  respondedAt?: string;
}

export interface FriendBattleInvite {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  roomId: string;
  bet: number;
  createdAt: string;
  expiresAt: string;         // 邀请过期时间
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

// ============ 排位赛季系统 ============

export type RankTier = 'Iron' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Epic' | 'Master' | 'Mythic' | 'Legend';

export interface RankInfo {
  tier: RankTier;
  division: number;          // 1-4 (4是该段位最低)
  points: number;            // 当前段位积分 (0-100)
  totalPoints: number;       // 总积分 (用于排行榜)
  rank?: number;             // 全服排名 (可选)
}

export interface SeasonInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface SeasonReward {
  tier: RankTier;
  rewards: {
    gold: number;
    packs: number;
    cardback?: string;
    avatar?: string;
    title?: string;
  };
}

export interface PlayerSeasonData {
  oduserId: string;
  seasonId: string;
  currentRank: RankInfo;
  peakRank: RankInfo;        // 本赛季最高段位
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
  rewardsClaimed: boolean;
}

// ============ 段位配置 ============

export const RANK_TIERS: { tier: RankTier; minPoints: number; icon: string; color: string }[] = [
  { tier: 'Iron', minPoints: 0, icon: '🥉', color: '#a19d94' },
  { tier: 'Silver', minPoints: 1000, icon: '🥈', color: '#c0c0c0' },
  { tier: 'Gold', minPoints: 2500, icon: '🥇', color: '#ffd700' },
  { tier: 'Platinum', minPoints: 4500, icon: '💠', color: '#e5e4e2' },
  { tier: 'Diamond', minPoints: 7000, icon: '💎', color: '#b9f2ff' },
  { tier: 'Epic', minPoints: 10000, icon: '🟣', color: '#9d00ff' },
  { tier: 'Master', minPoints: 14000, icon: '👑', color: '#ff8c00' },
  { tier: 'Mythic', minPoints: 19000, icon: '🔥', color: '#ff4500' },
  { tier: 'Legend', minPoints: 25000, icon: '🏆', color: '#ff0000' },
];

export const SEASON_REWARDS: SeasonReward[] = [
  { tier: 'Iron', rewards: { gold: 50, packs: 1 } },
  { tier: 'Silver', rewards: { gold: 200, packs: 2 } },
  { tier: 'Gold', rewards: { gold: 400, packs: 3, cardback: 'cardback_gold_s1' } },
  { tier: 'Platinum', rewards: { gold: 600, packs: 4, cardback: 'cardback_platinum_s1' } },
  { tier: 'Diamond', rewards: { gold: 1000, packs: 5, cardback: 'cardback_diamond_s1', avatar: 'avatar_diamond_s1' } },
  { tier: 'Epic', rewards: { gold: 1500, packs: 6, cardback: 'cardback_epic_s1' } },
  { tier: 'Master', rewards: { gold: 2000, packs: 8, cardback: 'cardback_master_s1', avatar: 'avatar_master_s1', title: '大师' } },
  { tier: 'Mythic', rewards: { gold: 3000, packs: 10, title: '神话' } },
  { tier: 'Legend', rewards: { gold: 5000, packs: 20, title: '传说' } },
];

// ============ 积分计算配置 ============

export const RANK_POINTS_CONFIG = {
  winBase: 25,               // 基础胜利积分
  loseBase: -20,             // 基础失败积分
  winStreakBonus: 5,         // 连胜额外积分 (每场)
  maxWinStreakBonus: 25,     // 连胜奖励上限
  rankDiffMultiplier: 1.2,   // 击败高段位玩家的积分倍率
  divisionPoints: 100,       // 每个小段位所需积分
  promotionBonus: 50,        // 晋级奖励积分
  demotionProtection: 3,     // 降级保护场次
};
