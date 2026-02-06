/**
 * 任务系统类型定义
 */

export type QuestRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type QuestType = 
  | 'play_cards'       // 使用任意卡牌
  | 'win_games'        // 赢得对战
  | 'deal_damage'      // 造成伤害
  | 'gain_armor'       // 获得护甲
  | 'play_fire'        // 使用火系法术
  | 'play_ice'         // 使用冰系法术
  | 'play_thunder'     // 使用雷系法术
  | 'play_nature';     // 使用自然法术

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  target: number;        // 目标数量
  current: number;       // 当前进度
  rewardGold: number;    // 金币奖励
  rewardExp?: number;    // 经验奖励（预留）
  rarity: QuestRarity;
  isClaimed: boolean;    // 是否已领取
  isCompleted: boolean;  // 是否已完成
  icon: string;          // 图标名称
  refreshTime?: number;  // 刷新时间戳
}

export const QUEST_TEMPLATE: Record<string, Partial<Quest>> = {
  'daily_win': {
    type: 'win_games',
    title: '决斗胜利',
    description: '在决斗中获得胜利',
    icon: 'trophy',
    target: 1,
    rewardGold: 50,
    rarity: 'common'
  },
  'daily_damage': {
    type: 'deal_damage',
    title: '输出机器',
    description: '造成伤害',
    icon: 'sword',
    target: 100,
    rewardGold: 40,
    rarity: 'common'
  },
  'daily_spells': {
    type: 'play_cards',
    title: '法术连发',
    description: '使用法术牌',
    icon: 'scroll',
    target: 10,
    rewardGold: 30,
    rarity: 'common'
  }
};
