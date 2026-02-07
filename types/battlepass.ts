/**
 * 战斗通行证系统 (Battle Pass)
 * 
 * [P0 商业化] 核心变现模块
 * - 免费轨道 + 付费轨道
 * - 每日/周常任务获取经验
 * - 赛季重置机制
 */

import { SpellType } from './card';

// ============ 通行证等级奖励 ============

export type RewardType = 'gold' | 'pack' | 'card' | 'cosmetic' | 'avatar' | 'cardback';

export interface BattlePassReward {
  type: RewardType;
  amount?: number;       // 金币/卡包数量
  itemId?: string;       // 具体物品ID
  cardId?: SpellType;    // 卡牌ID
  name: string;          // 显示名称
  icon?: string;         // 图标
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface BattlePassLevel {
  level: number;
  requiredXP: number;      // 升到此级所需累计经验
  freeReward?: BattlePassReward;
  premiumReward?: BattlePassReward;
}

// ============ 赛季配置 ============

export interface BattlePassSeason {
  id: string;
  name: string;
  startDate: string;     // ISO 日期
  endDate: string;
  maxLevel: number;
  premiumPrice: number;  // 付费解锁价格
  levels: BattlePassLevel[];
}

// ============ 玩家通行证状态 ============

export interface PlayerBattlePass {
  seasonId: string;
  currentXP: number;
  currentLevel: number;
  isPremium: boolean;
  claimedFreeRewards: number[];   // 已领取的免费奖励等级
  claimedPremiumRewards: number[]; // 已领取的付费奖励等级
}

// ============ 任务系统 ============

export type TaskType = 'daily' | 'weekly' | 'seasonal';
export type TaskCategory = 'battle' | 'collection' | 'social' | 'spending';

export interface BattlePassTask {
  id: string;
  type: TaskType;
  category: TaskCategory;
  name: string;
  description: string;
  target: number;        // 目标值
  current: number;       // 当前进度
  xpReward: number;      // 经验奖励
  isCompleted: boolean;
  isClaimed: boolean;
  expiresAt?: string;    // 过期时间 (仅每日/周常)
}

// ============ 默认赛季配置 ============

export const DEFAULT_SEASON: BattlePassSeason = {
  id: 'season_1',
  name: '元素觉醒',
  startDate: '2026-02-01',
  endDate: '2026-03-31',
  maxLevel: 50,
  premiumPrice: 680,  // 68元
  levels: generateSeasonLevels(50)
};

// ============ 辅助函数 ============

function generateSeasonLevels(maxLevel: number): BattlePassLevel[] {
  const levels: BattlePassLevel[] = [];
  
  for (let i = 1; i <= maxLevel; i++) {
    const level: BattlePassLevel = {
      level: i,
      requiredXP: calculateRequiredXP(i),
    };
    
    // 免费轨道奖励 (每2级一个)
    if (i % 2 === 0) {
      level.freeReward = generateFreeReward(i);
    }
    
    // 付费轨道奖励 (每级一个)
    level.premiumReward = generatePremiumReward(i);
    
    levels.push(level);
  }
  
  return levels;
}

function calculateRequiredXP(level: number): number {
  // 递增经验需求: 100 + (level - 1) * 50
  return 100 + (level - 1) * 50;
}

function generateFreeReward(level: number): BattlePassReward {
  // 免费奖励分布
  if (level % 10 === 0) {
    // 每10级一个卡包
    return { type: 'pack', amount: 1, name: '标准卡包', icon: '📦' };
  } else if (level % 6 === 0) {
    // 每6级100金币
    return { type: 'gold', amount: 100, name: '100 金币', icon: '💰' };
  } else {
    // 其他50金币
    return { type: 'gold', amount: 50, name: '50 金币', icon: '💰' };
  }
}

function generatePremiumReward(level: number): BattlePassReward {
  // 付费奖励分布 (更丰厚)
  if (level === 50) {
    // 满级传说卡背
    return { 
      type: 'cardback', 
      itemId: 'cardback_season1_legendary',
      name: '传说卡背: 元素之心', 
      icon: '🎴',
      rarity: 'legendary'
    };
  } else if (level === 25) {
    // 中期传说头像
    return { 
      type: 'avatar', 
      itemId: 'avatar_season1_epic',
      name: '史诗头像: 元素法师', 
      icon: '👤',
      rarity: 'epic'
    };
  } else if (level % 10 === 0) {
    // 每10级2个卡包
    return { type: 'pack', amount: 2, name: '2x 标准卡包', icon: '📦📦' };
  } else if (level % 5 === 0) {
    // 每5级150金币
    return { type: 'gold', amount: 150, name: '150 金币', icon: '💰' };
  } else {
    // 其他75金币
    return { type: 'gold', amount: 75, name: '75 金币', icon: '💰' };
  }
}

// ============ 默认任务列表 ============

export const DEFAULT_DAILY_TASKS: Omit<BattlePassTask, 'current' | 'isCompleted' | 'isClaimed' | 'expiresAt'>[] = [
  {
    id: 'daily_win_1',
    type: 'daily',
    category: 'battle',
    name: '首胜奖励',
    description: '赢得 1 场对战',
    target: 1,
    xpReward: 100
  },
  {
    id: 'daily_win_3',
    type: 'daily',
    category: 'battle',
    name: '三连胜',
    description: '赢得 3 场对战',
    target: 3,
    xpReward: 150
  },
  {
    id: 'daily_play_5',
    type: 'daily',
    category: 'battle',
    name: '活跃法师',
    description: '完成 5 场对战',
    target: 5,
    xpReward: 100
  },
  {
    id: 'daily_element_fire',
    type: 'daily',
    category: 'battle',
    name: '火焰使者',
    description: '使用火系卡牌造成 20 点伤害',
    target: 20,
    xpReward: 75
  }
];

export const DEFAULT_WEEKLY_TASKS: Omit<BattlePassTask, 'current' | 'isCompleted' | 'isClaimed' | 'expiresAt'>[] = [
  {
    id: 'weekly_win_10',
    type: 'weekly',
    category: 'battle',
    name: '周冠军',
    description: '本周赢得 10 场对战',
    target: 10,
    xpReward: 500
  },
  {
    id: 'weekly_play_20',
    type: 'weekly',
    category: 'battle',
    name: '战斗狂热',
    description: '本周完成 20 场对战',
    target: 20,
    xpReward: 400
  },
  {
    id: 'weekly_element_all',
    type: 'weekly',
    category: 'battle',
    name: '五行大师',
    description: '使用所有5种元素各至少1次',
    target: 5,
    xpReward: 300
  },
  {
    id: 'weekly_crit_5',
    type: 'weekly',
    category: 'battle',
    name: '暴击专家',
    description: '触发 5 次属性克制暴击',
    target: 5,
    xpReward: 350
  }
];
