/**
 * AchievementService — Achievement tracking, checking, and persistence
 */

import { Achievement, AchievementProgress, AchievementCondition, AchievementReward } from '../types/achievement';

const STORAGE_KEY = 'wizard_achievements_v1';

// ──────────────────── Achievement Definitions ────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // ── Battle ──
  { id: 'first_win', name: '初战告捷', description: '赢得第一场对战', icon: '🏆', category: 'battle',
    condition: { type: 'win_count', target: 1 }, reward: { type: 'mana', amount: 100 } },
  { id: 'win_10', name: '身经百战', description: '赢得10场对战', icon: '⚔️', category: 'battle',
    condition: { type: 'win_count', target: 10 }, reward: { type: 'mana', amount: 200 } },
  { id: 'win_50', name: '百战老将', description: '赢得50场对战', icon: '🎖️', category: 'battle',
    condition: { type: 'win_count', target: 50 }, reward: { type: 'pack', amount: 1 } },
  { id: 'win_100', name: '传奇战神', description: '赢得100场对战', icon: '🌟', category: 'battle',
    condition: { type: 'win_count', target: 100 }, reward: { type: 'pack', amount: 3 } },
  { id: 'streak_3', name: '三连胜', description: '连续赢得3场对战', icon: '🔥', category: 'battle',
    condition: { type: 'win_streak', target: 3 }, reward: { type: 'mana', amount: 150 } },
  { id: 'streak_5', name: '连胜达人', description: '连续赢得5场对战', icon: '⚡', category: 'battle',
    condition: { type: 'win_streak', target: 5 }, reward: { type: 'pack', amount: 1 } },
  { id: 'streak_10', name: '不败传说', description: '连续赢得10场对战', icon: '👑', category: 'battle',
    condition: { type: 'win_streak', target: 10 }, reward: { type: 'mana', amount: 500 } },
  { id: 'perfect_game', name: '完美对决', description: '不受伤赢得一场对战', icon: '💎', category: 'battle',
    condition: { type: 'perfect_game', target: 1 }, reward: { type: 'mana', amount: 300 } },
  { id: 'perfect_5', name: '完美主义者', description: '不受伤赢得5场对战', icon: '💠', category: 'battle',
    condition: { type: 'perfect_game', target: 5 }, reward: { type: 'pack', amount: 2 } },
  { id: 'combo_5', name: '连击大师', description: '达成5连击', icon: '🌀', category: 'battle',
    condition: { type: 'combo_count', target: 5 }, reward: { type: 'mana', amount: 200 } },
  { id: 'total_damage_1000', name: '毁灭之力', description: '累计造成1000点伤害', icon: '💥', category: 'battle',
    condition: { type: 'total_damage', target: 1000 }, reward: { type: 'dust', amount: 100 } },
  { id: 'total_damage_5000', name: '天崩地裂', description: '累计造成5000点伤害', icon: '🌋', category: 'battle',
    condition: { type: 'total_damage', target: 5000 }, reward: { type: 'pack', amount: 2 } },
  { id: 'total_damage_20000', name: '毁灭之神', description: '累计造成20000点伤害', icon: '☄️', category: 'battle',
    condition: { type: 'total_damage', target: 20000 }, reward: { type: 'pack', amount: 5 } },
  { id: 'play_100', name: '常驻法师', description: '完成100场对战', icon: '🏠', category: 'battle',
    condition: { type: 'total_games', target: 100 }, reward: { type: 'mana', amount: 400 } },
  { id: 'play_500', name: '巫师传说', description: '完成500场对战', icon: '🧙', category: 'battle',
    condition: { type: 'total_games', target: 500 }, reward: { type: 'pack', amount: 5 }, isHidden: true },

  // ── Element Mastery ──
  { id: 'fire_master', name: '火焰大师', description: '使用火系法术赢得10场', icon: '🔥', category: 'battle',
    condition: { type: 'element_wins', target: 10, element: 'fire' }, reward: { type: 'mana', amount: 200 } },
  { id: 'ice_master', name: '冰霜大师', description: '使用冰系法术赢得10场', icon: '❄️', category: 'battle',
    condition: { type: 'element_wins', target: 10, element: 'ice' }, reward: { type: 'mana', amount: 200 } },
  { id: 'thunder_master', name: '雷电大师', description: '使用雷系法术赢得10场', icon: '⚡', category: 'battle',
    condition: { type: 'element_wins', target: 10, element: 'thunder' }, reward: { type: 'mana', amount: 200 } },
  { id: 'vine_master', name: '自然大师', description: '使用藤系法术赢得10场', icon: '🌿', category: 'battle',
    condition: { type: 'element_wins', target: 10, element: 'vine' }, reward: { type: 'mana', amount: 200 } },
  { id: 'rock_master', name: '岩石大师', description: '使用岩石法术赢得10场', icon: '🪨', category: 'battle',
    condition: { type: 'element_wins', target: 10, element: 'rock' }, reward: { type: 'mana', amount: 200 } },
  { id: 'elemental_lord', name: '元素领主', description: '使用所有5种元素各赢得10场', icon: '🌈', category: 'battle',
    condition: { type: 'element_wins', target: 10, element: 'all' }, reward: { type: 'pack', amount: 5 }, isHidden: true },

  // ── Collection ──
  { id: 'collect_25', name: '小有收藏', description: '拥有25张不同卡牌', icon: '📚', category: 'collection',
    condition: { type: 'cards_collected', target: 25 }, reward: { type: 'mana', amount: 100 } },
  { id: 'collect_50', name: '收藏家', description: '拥有50张不同卡牌', icon: '📖', category: 'collection',
    condition: { type: 'cards_collected', target: 50 }, reward: { type: 'pack', amount: 1 } },
  { id: 'collect_all', name: '全集大师', description: '拥有所有卡牌', icon: '🏅', category: 'collection',
    condition: { type: 'cards_collected', target: 999 }, reward: { type: 'mana', amount: 1000 }, isHidden: true },
  { id: 'first_legendary', name: '传说降临', description: '获得第一张传说卡', icon: '✨', category: 'collection',
    condition: { type: 'legendary_owned', target: 1 }, reward: { type: 'dust', amount: 200 } },
  { id: 'legendary_5', name: '传说猎人', description: '拥有5张传说卡', icon: '💎', category: 'collection',
    condition: { type: 'legendary_owned', target: 5 }, reward: { type: 'pack', amount: 3 } },

  // ── Dungeon ──
  { id: 'dungeon_clear', name: '地牢征服者', description: '通关一次地牢', icon: '🗝️', category: 'dungeon',
    condition: { type: 'dungeon_clear', target: 1 }, reward: { type: 'pack', amount: 1 } },
  { id: 'dungeon_3', name: '地牢常客', description: '通关地牢3次', icon: '🏚️', category: 'dungeon',
    condition: { type: 'dungeon_clear', target: 3 }, reward: { type: 'mana', amount: 300 } },
  { id: 'dungeon_10', name: '地牢之王', description: '通关地牢10次', icon: '🏰', category: 'dungeon',
    condition: { type: 'dungeon_clear', target: 10 }, reward: { type: 'pack', amount: 3 } },

  // ── Arena ──
  { id: 'arena_first', name: '竞技场新秀', description: '完成一次竞技场', icon: '🏟️', category: 'special',
    condition: { type: 'arena_complete', target: 1 }, reward: { type: 'mana', amount: 150 } },
  { id: 'arena_7', name: '竞技场大师', description: '竞技场获得7胜', icon: '🥇', category: 'special',
    condition: { type: 'arena_high_wins', target: 7 }, reward: { type: 'pack', amount: 3 } },
  { id: 'arena_12', name: '竞技场传说', description: '竞技场获得12胜', icon: '🏆', category: 'special',
    condition: { type: 'arena_perfect', target: 1 }, reward: { type: 'pack', amount: 5 } },

  // ── Endless Tower ──
  { id: 'tower_floor_5', name: '塔楼探险者', description: '无尽塔到达第5层', icon: '🗼', category: 'special',
    condition: { type: 'tower_floor', target: 5 }, reward: { type: 'mana', amount: 100 } },
  { id: 'tower_floor_20', name: '塔楼征服者', description: '无尽塔到达第20层', icon: '🏔️', category: 'special',
    condition: { type: 'tower_floor', target: 20 }, reward: { type: 'pack', amount: 2 } },
  { id: 'tower_floor_50', name: '塔楼之主', description: '无尽塔到达第50层', icon: '👑', category: 'special',
    condition: { type: 'tower_floor', target: 50 }, reward: { type: 'pack', amount: 5 }, isHidden: true },

  // ── Guild ──
  { id: 'join_guild', name: '公会成员', description: '加入一个公会', icon: '🏰', category: 'social',
    condition: { type: 'guild_joined', target: 1 }, reward: { type: 'mana', amount: 100 } },
  { id: 'guild_contribute_100', name: '忠诚奉献', description: '向公会累计捐献100金币', icon: '🤝', category: 'social',
    condition: { type: 'guild_contribution', target: 100 }, reward: { type: 'mana', amount: 150 } },

  // ── Special ──
  { id: 'summon_50', name: '召唤师', description: '累计召唤50个随从', icon: '🐾', category: 'special',
    condition: { type: 'minion_summoned', target: 50 }, reward: { type: 'mana', amount: 200 } },
  { id: 'summon_200', name: '随从之王', description: '累计召唤200个随从', icon: '🦁', category: 'special',
    condition: { type: 'minion_summoned', target: 200 }, reward: { type: 'pack', amount: 3 } },
  { id: 'daily_7', name: '勤勉法师', description: '连续7天完成每日任务', icon: '📅', category: 'special',
    condition: { type: 'daily_streak', target: 7 }, reward: { type: 'pack', amount: 2 } },
];

// ──────────────────── Service ────────────────────

export class AchievementService {

  static getAll(): Achievement[] {
    return ACHIEVEMENTS;
  }

  static getByCategory(category: string): Achievement[] {
    return ACHIEVEMENTS.filter(a => a.category === category);
  }

  /** Load progress from localStorage */
  static loadProgress(): Record<string, AchievementProgress> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
  }

  /** Save progress to localStorage */
  static saveProgress(progress: Record<string, AchievementProgress>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch { /* ignore */ }
  }

  /**
   * Check and update achievements after a game event.
   * Returns newly unlocked achievements.
   */
  static check(event: AchievementCheckEvent): { unlocked: Achievement[]; progress: Record<string, AchievementProgress> } {
    const progress = this.loadProgress();
    const newlyUnlocked: Achievement[] = [];

    for (const ach of ACHIEVEMENTS) {
      const p = progress[ach.id] || { id: ach.id, current: 0, claimed: false };
      if (p.unlockedAt) continue; // already unlocked

      const delta = this.evaluateCondition(ach.condition, event);
      if (delta > 0) {
        p.current += delta;
      }

      if (p.current >= ach.condition.target) {
        p.unlockedAt = Date.now();
        newlyUnlocked.push(ach);
      }

      progress[ach.id] = p;
    }

    this.saveProgress(progress);
    return { unlocked: newlyUnlocked, progress };
  }

  /** Claim a reward for an unlocked achievement */
  static claim(achievementId: string): { success: boolean; reward?: AchievementReward } {
    const progress = this.loadProgress();
    const p = progress[achievementId];
    if (!p?.unlockedAt || p.claimed) return { success: false };

    const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!ach) return { success: false };

    p.claimed = true;
    this.saveProgress(progress);
    return { success: true, reward: ach.reward };
  }

  /** Get progress summary for display */
  static getSummary(): { total: number; unlocked: number; unclaimed: number } {
    const progress = this.loadProgress();
    const entries = Object.values(progress);
    return {
      total: ACHIEVEMENTS.length,
      unlocked: entries.filter(p => p.unlockedAt).length,
      unclaimed: entries.filter(p => p.unlockedAt && !p.claimed).length,
    };
  }

  private static evaluateCondition(condition: AchievementCondition, event: AchievementCheckEvent): number {
    switch (condition.type) {
      case 'win_count':
        return event.won ? 1 : 0;
      case 'win_streak':
        return event.won ? (event.winStreak || 0) : 0;
      case 'perfect_game':
        return (event.won && event.damageTaken === 0) ? 1 : 0;
      case 'combo_count':
        return Math.max(0, (event.maxCombo || 0) - (event.previousMaxCombo || 0));
      case 'total_damage':
        return event.damageDealt || 0;
      case 'total_games':
        return 1;
      case 'cards_collected':
        return Math.max(0, (event.uniqueCards || 0) - (event.previousUniqueCards || 0));
      case 'legendary_owned':
        return Math.max(0, (event.legendaryCount || 0) - (event.previousLegendaryCount || 0));
      case 'element_wins':
        if (condition.element === 'all') {
          // 隐藏成就：所有元素各赢10场由各独立成就达成后触发
          return 0;
        }
        return (event.won && event.mainElement === condition.element) ? 1 : 0;
      case 'dungeon_clear':
        return event.dungeonCleared ? 1 : 0;
      case 'minion_summoned':
        return event.minionsSummoned || 0;
      case 'arena_complete':
        return event.arenaCompleted ? 1 : 0;
      case 'arena_high_wins':
        return (event.arenaWins || 0) >= 7 ? 1 : 0;
      case 'arena_perfect':
        return (event.arenaWins || 0) >= 12 ? 1 : 0;
      case 'tower_floor':
        return event.towerFloor || 0;
      case 'guild_joined':
        return event.guildJoined ? 1 : 0;
      case 'guild_contribution':
        return event.guildContribution || 0;
      case 'daily_streak':
        return event.dailyStreak || 0;
      default:
        return 0;
    }
  }
}

/** Event data passed to AchievementService.check() */
export interface AchievementCheckEvent {
  won?: boolean;
  winStreak?: number;
  damageTaken?: number;
  damageDealt?: number;
  maxCombo?: number;
  previousMaxCombo?: number;
  uniqueCards?: number;
  previousUniqueCards?: number;
  legendaryCount?: number;
  previousLegendaryCount?: number;
  mainElement?: string;
  dungeonCleared?: boolean;
  minionsSummoned?: number;
  arenaCompleted?: boolean;
  arenaWins?: number;
  towerFloor?: number;
  guildJoined?: boolean;
  guildContribution?: number;
  dailyStreak?: number;
}
