/**
 * DailyQuestService — 每日/每周任务系统
 *
 * 3个每日任务 + 2个每周任务
 * 完成任务获取金币和经验
 */

const STORAGE_KEY = 'wizard_daily_quests_v1';

// ============ 类型 ============

export type DailyQuestType =
  | 'win_games'
  | 'deal_damage'
  | 'play_cards'
  | 'play_element'
  | 'use_armor'
  | 'summon_minions'
  | 'win_streak'
  | 'complete_games'
  | 'deal_single_game_damage'
  | 'play_mechanic';

export interface DailyQuest {
  id: string;
  type: DailyQuestType;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  rewardGold: number;
  rewardExp: number;
  rarity: 'common' | 'rare' | 'epic';
  isCompleted: boolean;
  isClaimed: boolean;
  /** 涉及的元素（仅 play_element 类型使用） */
  element?: string;
  /** 涉及的机制（仅 play_mechanic 类型使用） */
  mechanic?: string;
  /** 是否可刷新 */
  refreshable: boolean;
}

export interface DailyQuestState {
  quests: DailyQuest[];
  weeklyQuests: DailyQuest[];
  lastRefreshDate: string; // YYYY-MM-DD
  weeklyRefreshDate: string; // YYYY-MM-DD (周一)
  dailyStreak: number;     // 连续完成天数
  lastStreakDate: string;
  totalCompleted: number;
}

// ============ 任务模板 ============

const DAILY_TEMPLATES: Omit<DailyQuest, 'id' | 'progress' | 'isCompleted' | 'isClaimed'>[] = [
  { type: 'win_games', title: '决斗胜利', description: '赢得 2 场对战', icon: '🏆', target: 2, rewardGold: 60, rewardExp: 50, rarity: 'common', refreshable: true },
  { type: 'win_games', title: '连胜时刻', description: '赢得 3 场对战', icon: '🔥', target: 3, rewardGold: 80, rewardExp: 80, rarity: 'rare', refreshable: true },
  { type: 'deal_damage', title: '输出机器', description: '造成 80 点伤害', icon: '💥', target: 80, rewardGold: 50, rewardExp: 40, rarity: 'common', refreshable: true },
  { type: 'deal_damage', title: '毁灭风暴', description: '造成 200 点伤害', icon: '🌋', target: 200, rewardGold: 100, rewardExp: 100, rarity: 'rare', refreshable: true },
  { type: 'play_cards', title: '法术连发', description: '使用 10 张法术牌', icon: '📜', target: 10, rewardGold: 40, rewardExp: 30, rarity: 'common', refreshable: true },
  { type: 'play_element', title: '火焰使者', description: '使用 5 张火系法术', icon: '🔥', target: 5, rewardGold: 50, rewardExp: 40, rarity: 'common', refreshable: true, element: 'fire' },
  { type: 'play_element', title: '冰霜使者', description: '使用 5 张冰系法术', icon: '❄️', target: 5, rewardGold: 50, rewardExp: 40, rarity: 'common', refreshable: true, element: 'ice' },
  { type: 'play_element', title: '雷电使者', description: '使用 5 张雷系法术', icon: '⚡', target: 5, rewardGold: 50, rewardExp: 40, rarity: 'common', refreshable: true, element: 'thunder' },
  { type: 'play_element', title: '自然使者', description: '使用 5 张藤系法术', icon: '🌿', target: 5, rewardGold: 50, rewardExp: 40, rarity: 'common', refreshable: true, element: 'vine' },
  { type: 'play_element', title: '岩石使者', description: '使用 5 张岩石法术', icon: '🪨', target: 5, rewardGold: 50, rewardExp: 40, rarity: 'common', refreshable: true, element: 'rock' },
  { type: 'use_armor', title: '铁壁防御', description: '获得 15 点护甲', icon: '🛡️', target: 15, rewardGold: 40, rewardExp: 30, rarity: 'common', refreshable: true },
  { type: 'summon_minions', title: '召唤大师', description: '召唤 5 个随从', icon: '🐾', target: 5, rewardGold: 50, rewardExp: 40, rarity: 'common', refreshable: true },
  { type: 'complete_games', title: '活跃法师', description: '完成 5 场对战', icon: '🎮', target: 5, rewardGold: 40, rewardExp: 30, rarity: 'common', refreshable: true },
  { type: 'deal_single_game_damage', title: '爆发输出', description: '单场对战造成 15 点伤害', icon: '⚡', target: 15, rewardGold: 60, rewardExp: 50, rarity: 'rare', refreshable: true },
];

const WEEKLY_TEMPLATES: Omit<DailyQuest, 'id' | 'progress' | 'isCompleted' | 'isClaimed'>[] = [
  { type: 'win_games', title: '周冠军', description: '本周赢得 10 场对战', icon: '👑', target: 10, rewardGold: 300, rewardExp: 200, rarity: 'epic', refreshable: false },
  { type: 'complete_games', title: '战斗狂热', description: '本周完成 20 场对战', icon: '🔥', target: 20, rewardGold: 200, rewardExp: 150, rarity: 'rare', refreshable: false },
  { type: 'deal_damage', title: '输出之王', description: '本周累计造成 1000 点伤害', icon: '💥', target: 1000, rewardGold: 350, rewardExp: 250, rarity: 'epic', refreshable: false },
];

// ============ Service ============

export class DailyQuestService {

  /** 获取或初始化每日任务状态 */
  static getState(): DailyQuestState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state: DailyQuestState = JSON.parse(raw);
        const today = this.getToday();
        const currentMonday = this.getWeekMonday();

        // 新的一天刷新每日任务
        if (state.lastRefreshDate !== today) {
          state.quests = this.generateDailyQuests();
          state.lastRefreshDate = today;
        }

        // 新的一周刷新每周任务
        if (state.weeklyRefreshDate !== currentMonday) {
          state.weeklyQuests = this.generateWeeklyQuests();
          state.weeklyRefreshDate = currentMonday;
        }

        return state;
      }
    } catch { /* ignore */ }

    return this.createFreshState();
  }

  /** 生成每日任务（3个） */
  static generateDailyQuests(): DailyQuest[] {
    const shuffled = [...DAILY_TEMPLATES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map(t => ({
      ...t,
      id: `dq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      progress: 0,
      isCompleted: false,
      isClaimed: false,
    }));
  }

  /** 生成每周任务（2个） */
  static generateWeeklyQuests(): DailyQuest[] {
    const shuffled = [...WEEKLY_TEMPLATES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2).map(t => ({
      ...t,
      id: `wq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      progress: 0,
      isCompleted: false,
      isClaimed: false,
    }));
  }

  /** 更新任务进度 */
  static updateProgress(type: DailyQuestType, delta: number, element?: string, mechanic?: string): DailyQuestState {
    const state = this.getState();
    const allQuests = [...state.quests, ...state.weeklyQuests];

    for (const quest of allQuests) {
      if (quest.isCompleted) continue;
      if (quest.type !== type) continue;

      // 元素过滤
      if (type === 'play_element' && quest.element && quest.element !== element) continue;

      // 机制过滤
      if (type === 'play_mechanic' && quest.mechanic && quest.mechanic !== mechanic) continue;

      quest.progress = Math.min(quest.target, quest.progress + delta);
      if (quest.progress >= quest.target) {
        quest.isCompleted = true;
      }
    }

    this.saveState(state);
    return state;
  }

  /** 领取任务奖励 */
  static claimReward(questId: string): { gold: number; exp: number } | null {
    const state = this.getState();
    const allQuests = [...state.quests, ...state.weeklyQuests];
    const quest = allQuests.find(q => q.id === questId);

    if (!quest || !quest.isCompleted || quest.isClaimed) return null;

    quest.isClaimed = true;

    // 更新连续天数
    const today = this.getToday();
    if (state.lastStreakDate !== today) {
      state.dailyStreak++;
      state.lastStreakDate = today;
    }
    state.totalCompleted++;

    this.saveState(state);
    return { gold: quest.rewardGold, exp: quest.rewardExp };
  }

  /** 刷新单个每日任务（消耗金币） */
  static refreshQuest(questId: string): { cost: number; newQuest: DailyQuest | null } {
    const state = this.getState();
    const idx = state.quests.findIndex(q => q.id === questId);
    if (idx < 0) return { cost: 0, newQuest: null };

    const quest = state.quests[idx];
    if (!quest.refreshable || quest.progress > 0) return { cost: 0, newQuest: null };

    // 生成新任务
    const available = DAILY_TEMPLATES.filter(t => t.type !== quest.type);
    const template = available[Math.floor(Math.random() * available.length)];
    const newQuest: DailyQuest = {
      ...template,
      id: `dq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      progress: 0,
      isCompleted: false,
      isClaimed: false,
    };

    state.quests[idx] = newQuest;
    this.saveState(state);
    return { cost: 10, newQuest };
  }

  /** 获取任务完成统计 */
  static getStats(): { dailyCompleted: number; weeklyCompleted: number; streak: number } {
    const state = this.getState();
    return {
      dailyCompleted: state.quests.filter(q => q.isCompleted).length,
      weeklyCompleted: state.weeklyQuests.filter(q => q.isCompleted).length,
      streak: state.dailyStreak,
    };
  }

  /** 检查今日所有每日任务是否完成 */
  static allDailyCompleted(): boolean {
    const state = this.getState();
    return state.quests.every(q => q.isCompleted);
  }

  private static createFreshState(): DailyQuestState {
    return {
      quests: this.generateDailyQuests(),
      weeklyQuests: this.generateWeeklyQuests(),
      lastRefreshDate: this.getToday(),
      weeklyRefreshDate: this.getWeekMonday(),
      dailyStreak: 0,
      lastStreakDate: this.getToday(),
      totalCompleted: 0,
    };
  }

  private static saveState(state: DailyQuestState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }

  private static getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private static getWeekMonday(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    return monday.toISOString().slice(0, 10);
  }
}
