/**
 * Achievement System Types
 */

export type AchievementCategory = 'battle' | 'collection' | 'social' | 'dungeon' | 'special';

export type AchievementConditionType =
  | 'win_count'
  | 'win_streak'
  | 'cards_collected'
  | 'element_wins'
  | 'dungeon_clear'
  | 'combo_count'
  | 'perfect_game'
  | 'total_damage'
  | 'total_games'
  | 'legendary_owned'
  | 'minion_summoned'
  | 'arena_complete'
  | 'arena_high_wins'
  | 'arena_perfect'
  | 'tower_floor'
  | 'guild_joined'
  | 'guild_contribution'
  | 'daily_streak';

export interface AchievementCondition {
  type: AchievementConditionType;
  target: number;
  element?: string;       // for element_wins
  rarity?: string;        // for cards_collected filter
}

export interface AchievementReward {
  type: 'mana' | 'pack' | 'dust' | 'title';
  amount: number;
  titleText?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition: AchievementCondition;
  reward: AchievementReward;
  isHidden?: boolean;
}

export interface AchievementProgress {
  id: string;
  current: number;
  unlockedAt?: number;    // timestamp, undefined = not unlocked
  claimed: boolean;
}
