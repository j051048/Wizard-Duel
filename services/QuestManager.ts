import { Quest, QuestRarity, QuestType } from '../types/quest';

const STORAGE_KEY_QUESTS = 'wizard_duel_quests_v1';
const STORAGE_KEY_LAST_REFRESH = 'wizard_duel_quests_last_refresh';

// [P1] 经验奖励：按稀有度分级
const XP_BY_RARITY = { common: 20, rare: 40, epic: 80, legendary: 150 } as const;

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
  }
};
