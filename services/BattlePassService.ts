/**
 * BattlePassService - 战斗通行证服务
 * 
 * [P0 商业化] 管理通行证状态、任务进度、奖励领取
 */

import { 
  BattlePassSeason, 
  PlayerBattlePass, 
  BattlePassTask,
  BattlePassReward,
  DEFAULT_SEASON,
  DEFAULT_DAILY_TASKS,
  DEFAULT_WEEKLY_TASKS
} from '../types/battlepass';

const STORAGE_KEY_PASS = 'wizard_duel_battlepass';
const STORAGE_KEY_TASKS = 'wizard_duel_tasks';

class BattlePassServiceClass {
  private season: BattlePassSeason = DEFAULT_SEASON;
  private playerPass: PlayerBattlePass | null = null;
  private tasks: BattlePassTask[] = [];

  // ============ 初始化 ============
  
  init(): { pass: PlayerBattlePass; tasks: BattlePassTask[] } {
    this.loadPlayerPass();
    this.loadTasks();
    return { pass: this.playerPass!, tasks: this.tasks };
  }

  private loadPlayerPass(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PASS);
      if (saved) {
        this.playerPass = JSON.parse(saved);
        // 检查赛季是否匹配
        if (this.playerPass?.seasonId !== this.season.id) {
          this.resetForNewSeason();
        }
      } else {
        this.createNewPass();
      }
    } catch (e) {
      console.warn('Failed to load battle pass:', e);
      this.createNewPass();
    }
  }

  private createNewPass(): void {
    this.playerPass = {
      seasonId: this.season.id,
      currentXP: 0,
      currentLevel: 0,
      isPremium: false,
      claimedFreeRewards: [],
      claimedPremiumRewards: []
    };
    this.savePlayerPass();
  }

  private resetForNewSeason(): void {
    // 保留付费状态历史，重置进度
    this.createNewPass();
    this.tasks = [];
    this.saveTasks();
  }

  private savePlayerPass(): void {
    if (this.playerPass) {
      localStorage.setItem(STORAGE_KEY_PASS, JSON.stringify(this.playerPass));
    }
  }

  // ============ 任务系统 ============

  private loadTasks(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
      if (saved) {
        this.tasks = JSON.parse(saved);
        this.checkTaskExpiry();
      } else {
        this.generateDailyTasks();
        this.generateWeeklyTasks();
      }
    } catch (e) {
      this.generateDailyTasks();
      this.generateWeeklyTasks();
    }
  }

  private saveTasks(): void {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(this.tasks));
  }

  private generateDailyTasks(): void {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const expiresAt = today.toISOString();

    // 随机选择3个每日任务
    const shuffled = [...DEFAULT_DAILY_TASKS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    const dailyTasks: BattlePassTask[] = selected.map(t => ({
      ...t,
      current: 0,
      isCompleted: false,
      isClaimed: false,
      expiresAt
    }));

    // 移除旧的每日任务
    this.tasks = this.tasks.filter(t => t.type !== 'daily');
    this.tasks.push(...dailyTasks);
    this.saveTasks();
  }

  private generateWeeklyTasks(): void {
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + (8 - nextMonday.getDay()) % 7);
    nextMonday.setHours(23, 59, 59, 999);
    const expiresAt = nextMonday.toISOString();

    // 随机选择3个周常任务
    const shuffled = [...DEFAULT_WEEKLY_TASKS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    const weeklyTasks: BattlePassTask[] = selected.map(t => ({
      ...t,
      current: 0,
      isCompleted: false,
      isClaimed: false,
      expiresAt
    }));

    // 移除旧的周常任务
    this.tasks = this.tasks.filter(t => t.type !== 'weekly');
    this.tasks.push(...weeklyTasks);
    this.saveTasks();
  }

  private checkTaskExpiry(): void {
    const now = new Date().toISOString();
    let needsRefresh = false;

    // 检查每日任务
    const dailyTasks = this.tasks.filter(t => t.type === 'daily');
    if (dailyTasks.length === 0 || (dailyTasks[0]?.expiresAt && dailyTasks[0].expiresAt < now)) {
      this.generateDailyTasks();
      needsRefresh = true;
    }

    // 检查周常任务
    const weeklyTasks = this.tasks.filter(t => t.type === 'weekly');
    if (weeklyTasks.length === 0 || (weeklyTasks[0]?.expiresAt && weeklyTasks[0].expiresAt < now)) {
      this.generateWeeklyTasks();
      needsRefresh = true;
    }
  }

  // ============ 公开 API ============

  getSeason(): BattlePassSeason {
    return this.season;
  }

  getPlayerPass(): PlayerBattlePass {
    return this.playerPass!;
  }

  getTasks(): BattlePassTask[] {
    return this.tasks;
  }

  // 增加经验
  addXP(amount: number): { levelUp: boolean; newLevel: number } {
    if (!this.playerPass) return { levelUp: false, newLevel: 0 };

    this.playerPass.currentXP += amount;
    
    let levelUp = false;
    let newLevel = this.playerPass.currentLevel;

    // 检查升级
    while (newLevel < this.season.maxLevel) {
      const nextLevelData = this.season.levels[newLevel];
      if (nextLevelData && this.playerPass.currentXP >= nextLevelData.requiredXP) {
        newLevel++;
        levelUp = true;
      } else {
        break;
      }
    }

    this.playerPass.currentLevel = newLevel;
    this.savePlayerPass();

    return { levelUp, newLevel };
  }

  // 更新任务进度
  updateTaskProgress(taskId: string, progress: number): BattlePassTask | null {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || task.isCompleted) return null;

    task.current = Math.min(task.current + progress, task.target);
    
    if (task.current >= task.target) {
      task.isCompleted = true;
    }

    this.saveTasks();
    return task;
  }

  // 根据行为自动更新相关任务
  onBattleComplete(won: boolean, usedElements: string[], damage: Record<string, number>): void {
    // 更新胜利相关任务
    if (won) {
      this.tasks.filter(t => t.id.includes('win') && !t.isCompleted).forEach(t => {
        t.current++;
        if (t.current >= t.target) t.isCompleted = true;
      });
    }

    // 更新对战场次任务
    this.tasks.filter(t => t.id.includes('play') && !t.isCompleted).forEach(t => {
      t.current++;
      if (t.current >= t.target) t.isCompleted = true;
    });

    // 更新元素使用任务
    Object.entries(damage).forEach(([element, dmg]) => {
      this.tasks.filter(t => t.id.includes(`element_${element}`) && !t.isCompleted).forEach(t => {
        t.current += dmg;
        if (t.current >= t.target) t.isCompleted = true;
      });
    });

    // 更新五行大师任务
    const allElementsTask = this.tasks.find(t => t.id === 'weekly_element_all' && !t.isCompleted);
    if (allElementsTask) {
      const uniqueElements = new Set(usedElements);
      allElementsTask.current = uniqueElements.size;
      if (allElementsTask.current >= allElementsTask.target) {
        allElementsTask.isCompleted = true;
      }
    }

    this.saveTasks();
  }

  // 领取任务奖励
  claimTaskReward(taskId: string): { success: boolean; xp: number } {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || !task.isCompleted || task.isClaimed) {
      return { success: false, xp: 0 };
    }

    task.isClaimed = true;
    this.saveTasks();

    const result = this.addXP(task.xpReward);
    return { success: true, xp: task.xpReward };
  }

  // 领取通行证等级奖励
  claimLevelReward(level: number, isPremium: boolean): { success: boolean; reward: BattlePassReward | null } {
    if (!this.playerPass) return { success: false, reward: null };
    if (level > this.playerPass.currentLevel) return { success: false, reward: null };

    const levelData = this.season.levels[level - 1];
    if (!levelData) return { success: false, reward: null };

    if (isPremium) {
      if (!this.playerPass.isPremium) return { success: false, reward: null };
      if (this.playerPass.claimedPremiumRewards.includes(level)) return { success: false, reward: null };
      
      this.playerPass.claimedPremiumRewards.push(level);
      this.savePlayerPass();
      return { success: true, reward: levelData.premiumReward || null };
    } else {
      if (this.playerPass.claimedFreeRewards.includes(level)) return { success: false, reward: null };
      if (!levelData.freeReward) return { success: false, reward: null };
      
      this.playerPass.claimedFreeRewards.push(level);
      this.savePlayerPass();
      return { success: true, reward: levelData.freeReward };
    }
  }

  // 购买高级通行证
  purchasePremium(): boolean {
    if (!this.playerPass) return false;
    if (this.playerPass.isPremium) return false;

    this.playerPass.isPremium = true;
    this.savePlayerPass();
    return true;
  }

  // 获取当前等级进度
  getLevelProgress(): { current: number; required: number; percentage: number } {
    if (!this.playerPass) return { current: 0, required: 100, percentage: 0 };

    const currentLevel = this.playerPass.currentLevel;
    if (currentLevel >= this.season.maxLevel) {
      return { current: 0, required: 0, percentage: 100 };
    }

    const currentLevelData = currentLevel > 0 ? this.season.levels[currentLevel - 1] : null;
    const nextLevelData = this.season.levels[currentLevel];

    const baseXP = currentLevelData?.requiredXP || 0;
    const targetXP = nextLevelData?.requiredXP || 100;
    const progressXP = this.playerPass.currentXP - baseXP;
    const neededXP = targetXP - baseXP;

    return {
      current: progressXP,
      required: neededXP,
      percentage: Math.round((progressXP / neededXP) * 100)
    };
  }
}

export const BattlePassService = new BattlePassServiceClass();
