import { Quest, QuestRarity, QuestType } from '../types/quest';

const STORAGE_KEY_QUESTS = 'wizard_duel_quests_v1';
const STORAGE_KEY_LAST_REFRESH = 'wizard_duel_quests_last_refresh';
const STORAGE_KEY_WEEKLY_QUESTS = 'wizard_duel_weekly_quests_v1';
const STORAGE_KEY_WEEKLY_REFRESH = 'wizard_duel_weekly_last_refresh';

// [P1] 经验奖励：按稀有度分级
const XP_BY_RARITY = { common: 20, rare: 40, epic: 80, legendary: 150 } as const;

// [Phase 4] 每周任务模板
const WEEKLY_QUEST_TEMPLATES: Array<Omit<Quest, 'id' | 'current' | 'isClaimed' | 'isCompleted'>> = [
  {
    title: "周冠军",
    description: "赢得15场对战",
    type: 'weekly_wins',
    target: 15,
    rewardGold: 500,
    rewardExp: XP_BY_RARITY.legendary,
    rarity: 'legendary',
    icon: 'crown'
  },
  {
    title: "百战老兵",
    description: "完成25场对战",
    type: 'weekly_games',
    target: 25,
    rewardGold: 300,
    rewardExp: XP_BY_RARITY.epic,
    rarity: 'epic',
    icon: 'shield'
  },
];

// 任务模板库
const QUEST_TEMPLATES: Array<Omit<Quest, 'id' | 'current' | 'isClaimed' | 'isCompleted'>> = [
  {
    title: "First Blood",
    description: "Win 1 Duel",
    type: 'win_games',
    target: 1,
    rewardGold: 100,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'trophy'
  },
  {
    title: "Spellcaster",
    description: "Cast 10 Spells",
    type: 'play_cards',
    target: 10,
    rewardGold: 50,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'scroll'
  },
  {
    title: "Damage Dealer",
    description: "Deal 50 Damage",
    type: 'deal_damage',
    target: 50,
    rewardGold: 60,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'sword'
  },
  {
    title: "Pyromancer",
    description: "Cast 3 Fire Spells",
    type: 'play_fire',
    target: 3,
    rewardGold: 80,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'flame'
  },
  {
    title: "Cryomancer",
    description: "Cast 3 Ice Spells",
    type: 'play_ice',
    target: 3,
    rewardGold: 80,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'snowflake'
  },
  {
    title: "Stormcaller",
    description: "Cast 3 Thunder Spells",
    type: 'play_thunder',
    target: 3,
    rewardGold: 80,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'zap'
  },
  {
    title: "Naturalist",
    description: "Cast 3 Nature Spells",
    type: 'play_nature',
    target: 3,
    rewardGold: 80,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'leaf'
  },
  {
    title: "Fortifier",
    description: "Gain 20 Armor",
    type: 'gain_armor',
    target: 20,
    rewardGold: 60,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'shield'
  },
  {
    title: "Grand Magus",
    description: "Win 3 Duels",
    type: 'win_games',
    target: 3,
    rewardGold: 300,
    rewardExp: XP_BY_RARITY.epic,
    rarity: 'epic',
    icon: 'crown'
  },
  {
    title: "Total Destruction",
    description: "Deal 200 Damage",
    type: 'deal_damage',
    target: 200,
    rewardGold: 250,
    rewardExp: XP_BY_RARITY.epic,
    rarity: 'epic',
    icon: 'skull'
  },

  // [P3.3] Quest Pool Expansion — 20 new templates

  // --- Element-specific win quests ---
  {
    title: "火焰胜利",
    description: "使用火系法术获胜3次",
    type: 'win_element_fire',
    target: 3,
    rewardGold: 80,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'flame'
  },
  {
    title: "寒冰胜利",
    description: "使用冰系法术获胜3次",
    type: 'win_element_ice',
    target: 3,
    rewardGold: 80,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'snowflake'
  },
  {
    title: "雷霆胜利",
    description: "使用雷系法术获胜3次",
    type: 'win_element_thunder',
    target: 3,
    rewardGold: 80,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'zap'
  },
  {
    title: "自然胜利",
    description: "使用藤系法术获胜3次",
    type: 'win_element_vine',
    target: 3,
    rewardGold: 80,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'leaf'
  },
  {
    title: "岩石胜利",
    description: "使用岩石法术获胜3次",
    type: 'win_element_rock',
    target: 3,
    rewardGold: 80,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'shield'
  },

  // --- Keyword / mechanic quests ---
  {
    title: "烈焰掌控",
    description: "使用灼烧效果5次",
    type: 'use_mechanic_burn',
    target: 5,
    rewardGold: 60,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'flame'
  },
  {
    title: "冰封之力",
    description: "使用冻结效果5次",
    type: 'use_mechanic_freeze',
    target: 5,
    rewardGold: 60,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'snowflake'
  },
  {
    title: "生命之泉",
    description: "使用治疗效果5次",
    type: 'use_mechanic_heal',
    target: 5,
    rewardGold: 50,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'heart'
  },
  {
    title: "召唤大师",
    description: "召唤10个随从",
    type: 'summon_minions',
    target: 10,
    rewardGold: 70,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'scroll'
  },

  // --- Combo / streak quests ---
  {
    title: "连击达人",
    description: "达成3连击",
    type: 'combo_count',
    target: 3,
    rewardGold: 60,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'zap'
  },
  {
    title: "三连胜",
    description: "连胜3场",
    type: 'win_streak',
    target: 3,
    rewardGold: 200,
    rewardExp: XP_BY_RARITY.epic,
    rarity: 'epic',
    icon: 'trophy'
  },
  {
    title: "绝地反击",
    description: "在10HP以下获胜1次",
    type: 'low_hp_win',
    target: 1,
    rewardGold: 150,
    rewardExp: XP_BY_RARITY.epic,
    rarity: 'epic',
    icon: 'skull'
  },

  // --- Legendary / high-value quests ---
  {
    title: "传说降临",
    description: "使用传说卡牌3次",
    type: 'play_legendary',
    target: 3,
    rewardGold: 250,
    rewardExp: XP_BY_RARITY.epic,
    rarity: 'epic',
    icon: 'crown'
  },

  // --- Dungeon ---
  {
    title: "地牢探索",
    description: "通关1个地牢房间",
    type: 'dungeon_room',
    target: 1,
    rewardGold: 40,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'scroll'
  },

  // --- Specialty quests ---
  {
    title: "先发制人",
    description: "在对手之前获胜（先手获胜）",
    type: 'first_blood',
    target: 1,
    rewardGold: 30,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'sword'
  },
  {
    title: "坚不可摧",
    description: "累计获得30点护甲",
    type: 'gain_armor',
    target: 30,
    rewardGold: 60,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'shield'
  },
  {
    title: "毁灭风暴",
    description: "单场造成50+伤害",
    type: 'single_game_damage',
    target: 50,
    rewardGold: 100,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'skull'
  },
  {
    title: "完美胜利",
    description: "不受伤获胜1次",
    type: 'perfect_game',
    target: 1,
    rewardGold: 300,
    rewardExp: XP_BY_RARITY.epic,
    rarity: 'epic',
    icon: 'crown'
  },
  {
    title: "元素克制",
    description: "使用克制元素获胜3次",
    type: 'counter_element',
    target: 3,
    rewardGold: 100,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'zap'
  },
  {
    title: "勤勉决斗者",
    description: "完成3场对战",
    type: 'total_games',
    target: 3,
    rewardGold: 50,
    rewardExp: XP_BY_RARITY.common,
    rarity: 'common',
    icon: 'trophy'
  },

  // [Phase 4] 联动任务
  {
    title: "元素共鸣",
    description: "触发跨元素联动3次",
    type: 'trigger_synergy',
    target: 3,
    rewardGold: 120,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'zap'
  },

  // [Phase 4] 新机制任务
  {
    title: "时空旅者",
    description: "使用新机制卡牌5次",
    type: 'play_new_mechanic',
    target: 5,
    rewardGold: 100,
    rewardExp: XP_BY_RARITY.rare,
    rarity: 'rare',
    icon: 'scroll'
  }
];

export const QuestManager = {
  /**
   * 初始化并检查是否需要生成新任务
   */
  init(): Quest[] {
    const lastRefresh = localStorage.getItem(STORAGE_KEY_LAST_REFRESH);
    const today = new Date().toDateString();

    const storedQuests = this.loadQuests();

    // 如果今天是新的一天，或者没有任务，则刷新
    if (lastRefresh !== today || storedQuests.length === 0) {
      const newQuests = this.generateDailyQuests();
      this.saveQuests(newQuests);
      localStorage.setItem(STORAGE_KEY_LAST_REFRESH, today);
      return newQuests;
    }

    return storedQuests;
  },

  /**
   * 加载任务
   */
  loadQuests(): Quest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_QUESTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load quests', e);
      return [];
    }
  },

  /**
   * 保存任务
   */
  saveQuests(quests: Quest[]) {
    localStorage.setItem(STORAGE_KEY_QUESTS, JSON.stringify(quests));
  },

  /**
   * 生成每日任务（每天3个）
   */
  generateDailyQuests(): Quest[] {
    // 随机选择3个不重复的任务模板
    const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    return selected.map(template => ({
      ...template,
      id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      current: 0,
      isClaimed: false,
      isCompleted: false
    }));
  },

  /**
   * 更新任务进度
   */
  updateProgress(type: QuestType, amount: number = 1): Quest[] {
    const quests = this.loadQuests();
    let hasUpdates = false;

    const updatedQuests = quests.map(quest => {
      // 如果任务已完成或类型不匹配，则跳过
      if (quest.isCompleted || quest.type !== type) return quest;

      // 如果类型匹配，增加进度
      const newCurrent = Math.min(quest.current + amount, quest.target);
      
      if (newCurrent !== quest.current) {
        hasUpdates = true;
        const isCompleted = newCurrent >= quest.target;
        return {
          ...quest,
          current: newCurrent,
          isCompleted
        };
      }
      return quest;
    });

    if (hasUpdates) {
      this.saveQuests(updatedQuests);
      
      // 如果有刚完成的任务，可以触发通知（这里简化处理）
      const completed = updatedQuests.filter(q => q.isCompleted && !quests.find(old => old.id === q.id)?.isCompleted);
      if (completed.length > 0) {
        // console.log('Quests completed:', completed);
      }
    }

    return updatedQuests;
  },

  /**
   * 领取任务奖励
   */
  claimReward(questId: string): { success: boolean; reward?: number; rewardExp?: number; quests: Quest[] } {
    const quests = this.loadQuests();
    const questIndex = quests.findIndex(q => q.id === questId);

    if (questIndex === -1) return { success: false, quests };

    const quest = quests[questIndex];
    if (!quest.isCompleted || quest.isClaimed) return { success: false, quests };

    // 标记为已领取
    quests[questIndex] = { ...quest, isClaimed: true };
    this.saveQuests(quests);

    return { success: true, reward: quest.rewardGold, rewardExp: quest.rewardExp, quests };
  },

  // ============ [Phase 4] 每周任务 ============

  /** 初始化每周任务（每周一刷新） */
  initWeekly(): Quest[] {
    const lastRefresh = localStorage.getItem(STORAGE_KEY_WEEKLY_REFRESH);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];

    const storedQuests = this.loadWeeklyQuests();

    if (lastRefresh !== weekKey || storedQuests.length === 0) {
      const newQuests = this.generateWeeklyQuests();
      this.saveWeeklyQuests(newQuests);
      localStorage.setItem(STORAGE_KEY_WEEKLY_REFRESH, weekKey);
      return newQuests;
    }

    return storedQuests;
  },

  loadWeeklyQuests(): Quest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_WEEKLY_QUESTS);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  saveWeeklyQuests(quests: Quest[]) {
    localStorage.setItem(STORAGE_KEY_WEEKLY_QUESTS, JSON.stringify(quests));
  },

  generateWeeklyQuests(): Quest[] {
    return WEEKLY_QUEST_TEMPLATES.map(template => ({
      ...template,
      id: `weekly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      current: 0,
      isClaimed: false,
      isCompleted: false
    }));
  },

  /** 更新每周任务进度 */
  updateWeeklyProgress(type: QuestType, amount: number = 1): Quest[] {
    const quests = this.loadWeeklyQuests();
    let hasUpdates = false;

    const updatedQuests = quests.map(quest => {
      if (quest.isCompleted || quest.type !== type) return quest;
      const newCurrent = Math.min(quest.current + amount, quest.target);
      if (newCurrent !== quest.current) {
        hasUpdates = true;
        return { ...quest, current: newCurrent, isCompleted: newCurrent >= quest.target };
      }
      return quest;
    });

    if (hasUpdates) this.saveWeeklyQuests(updatedQuests);
    return updatedQuests;
  },

  /** 领取每周任务奖励 */
  claimWeeklyReward(questId: string): { success: boolean; reward?: number; rewardExp?: number; quests: Quest[] } {
    const quests = this.loadWeeklyQuests();
    const idx = quests.findIndex(q => q.id === questId);
    if (idx === -1) return { success: false, quests };
    const quest = quests[idx];
    if (!quest.isCompleted || quest.isClaimed) return { success: false, quests };
    quests[idx] = { ...quest, isClaimed: true };
    this.saveWeeklyQuests(quests);
    return { success: true, reward: quest.rewardGold, rewardExp: quest.rewardExp, quests };
  }
};
