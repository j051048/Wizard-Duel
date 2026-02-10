/**
 * RankService - 排位赛季服务
 * 
 * [P0 Phase 4] 排位积分、段位晋级、赛季奖励
 */

import { 
  RankInfo, 
  RankTier, 
  SeasonInfo, 
  PlayerSeasonData,
  RANK_TIERS,
  RANK_POINTS_CONFIG,
  SEASON_REWARDS
} from '../types/social';

const STORAGE_KEY_SEASON = 'wizard_duel_season_data';

class RankServiceClass {
  private currentSeason: SeasonInfo;
  private playerData: PlayerSeasonData | null = null;

  constructor() {
    // 默认赛季配置
    this.currentSeason = {
      id: 'season_1',
      name: '元素觉醒',
      startDate: '2026-02-01',
      endDate: '2026-03-31',
      isActive: true
    };
  }

  // ============ 初始化 ============

  init(userId: string): PlayerSeasonData {
    this.loadPlayerData(userId);
    return this.playerData!;
  }

  private loadPlayerData(userId: string): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SEASON);
      if (saved) {
        const data = JSON.parse(saved);
        // 检查是否是当前赛季
        if (data.seasonId === this.currentSeason.id) {
          this.playerData = data;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load rank data:', e);
    }

    // 创建新赛季数据
    this.playerData = this.createNewSeasonData(userId);
    this.savePlayerData();
  }

  private createNewSeasonData(userId: string): PlayerSeasonData {
    return {
      oduserId: userId,
      seasonId: this.currentSeason.id,
      currentRank: {
        tier: 'Iron',
        division: 4,
        points: 0,
        totalPoints: 0
      },
      peakRank: {
        tier: 'Iron',
        division: 4,
        points: 0,
        totalPoints: 0
      },
      wins: 0,
      losses: 0,
      winStreak: 0,
      bestWinStreak: 0,
      rewardsClaimed: false
    };
  }

  private savePlayerData(): void {
    if (this.playerData) {
      localStorage.setItem(STORAGE_KEY_SEASON, JSON.stringify(this.playerData));
    }
  }

  // ============ 获取数据 ============

  getPlayerData(): PlayerSeasonData | null {
    return this.playerData;
  }

  getCurrentSeason(): SeasonInfo {
    return this.currentSeason;
  }

  getRankInfo(): RankInfo | null {
    return this.playerData?.currentRank || null;
  }

  // ============ 积分计算 ============

  calculatePointsChange(won: boolean, opponentRank?: RankInfo): number {
    if (!this.playerData) return 0;

    const config = RANK_POINTS_CONFIG;
    let points = won ? config.winBase : config.loseBase;

    // 连胜加成
    if (won && this.playerData.winStreak > 0) {
      const streakBonus = Math.min(
        this.playerData.winStreak * config.winStreakBonus,
        config.maxWinStreakBonus
      );
      points += streakBonus;
    }

    // 击败高段位玩家加成
    if (won && opponentRank) {
      const myTotalPoints = this.playerData.currentRank.totalPoints;
      const oppTotalPoints = opponentRank.totalPoints;
      if (oppTotalPoints > myTotalPoints + 200) {
        points = Math.floor(points * config.rankDiffMultiplier);
      }
    }

    return points;
  }

  // ============ 对战结算 ============

  recordMatch(won: boolean, opponentRank?: RankInfo): {
    pointsChange: number;
    promoted: boolean;
    demoted: boolean;
    newRank: RankInfo;
  } {
    if (!this.playerData) {
      return { pointsChange: 0, promoted: false, demoted: false, newRank: this.createDefaultRank() };
    }

    const pointsChange = this.calculatePointsChange(won, opponentRank);
    
    // 更新胜负记录
    if (won) {
      this.playerData.wins++;
      this.playerData.winStreak++;
      this.playerData.bestWinStreak = Math.max(
        this.playerData.bestWinStreak,
        this.playerData.winStreak
      );
    } else {
      this.playerData.losses++;
      this.playerData.winStreak = 0;
    }

    // 更新积分
    this.playerData.currentRank.points += pointsChange;
    this.playerData.currentRank.totalPoints += pointsChange;
    this.playerData.currentRank.totalPoints = Math.max(0, this.playerData.currentRank.totalPoints);

    // 检查晋级/降级
    const { promoted, demoted } = this.checkRankChange();

    // 更新峰值
    if (this.playerData.currentRank.totalPoints > this.playerData.peakRank.totalPoints) {
      this.playerData.peakRank = { ...this.playerData.currentRank };
    }

    this.savePlayerData();

    return {
      pointsChange,
      promoted,
      demoted,
      newRank: { ...this.playerData.currentRank }
    };
  }

  private checkRankChange(): { promoted: boolean; demoted: boolean } {
    if (!this.playerData) return { promoted: false, demoted: false };

    const rank = this.playerData.currentRank;
    const config = RANK_POINTS_CONFIG;
    let promoted = false;
    let demoted = false;

    // 晋级检查
    while (rank.points >= config.divisionPoints) {
      rank.points -= config.divisionPoints;
      
      if (rank.division > 1) {
        // 小段位晋级
        rank.division--;
        promoted = true;
      } else {
        // 大段位晋级
        const currentTierIndex = RANK_TIERS.findIndex(t => t.tier === rank.tier);
        if (currentTierIndex < RANK_TIERS.length - 1) {
          rank.tier = RANK_TIERS[currentTierIndex + 1].tier;
          rank.division = 4;
          rank.points += config.promotionBonus;
          promoted = true;
        } else {
          // 已经是最高段位
          rank.points = config.divisionPoints;
        }
      }
    }

    // 降级检查
    while (rank.points < 0) {
      if (rank.division < 4) {
        // 小段位降级
        rank.division++;
        rank.points += config.divisionPoints;
        demoted = true;
      } else {
        // 大段位降级
        const currentTierIndex = RANK_TIERS.findIndex(t => t.tier === rank.tier);
        if (currentTierIndex > 0) {
          rank.tier = RANK_TIERS[currentTierIndex - 1].tier;
          rank.division = 1;
          rank.points += config.divisionPoints;
          demoted = true;
        } else {
          // 已经是最低段位
          rank.points = 0;
        }
      }
    }

    return { promoted, demoted };
  }

  private createDefaultRank(): RankInfo {
    return {
      tier: 'Iron',
      division: 4,
      points: 0,
      totalPoints: 0
    };
  }

  // ============ 段位信息 ============

  getRankDisplay(rank: RankInfo): { name: string; icon: string; color: string } {
    const tierInfo = RANK_TIERS.find(t => t.tier === rank.tier) || RANK_TIERS[0];
    return {
      name: `${this.getTierNameCN(rank.tier)} ${this.getDivisionName(rank.division)}`,
      icon: tierInfo.icon,
      color: tierInfo.color
    };
  }

  private getTierNameCN(tier: RankTier): string {
    const names: Record<RankTier, string> = {
      'Iron': '黑铁',
      'Silver': '白银',
      'Gold': '黄金',
      'Platinum': '铂金',
      'Diamond': '钻石',
      'Epic': '史诗',
      'Master': '大师',
      'Mythic': '神话',
      'Legend': '传说'
    };
    return names[tier];
  }

  private getDivisionName(division: number): string {
    const names = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];
    return names[division - 1] || '';
  }

  getProgressToNextDivision(): number {
    if (!this.playerData) return 0;
    return Math.min(100, (this.playerData.currentRank.points / RANK_POINTS_CONFIG.divisionPoints) * 100);
  }

  // ============ 赛季奖励 ============

  getSeasonRewards(): { tier: RankTier; rewards: any; unlocked: boolean }[] {
    if (!this.playerData) return [];

    const currentTierIndex = RANK_TIERS.findIndex(t => t.tier === this.playerData!.peakRank.tier);
    
    return SEASON_REWARDS.map((sr, index) => ({
      tier: sr.tier,
      rewards: sr.rewards,
      unlocked: index <= currentTierIndex
    }));
  }

  claimSeasonRewards(): { success: boolean; rewards: any } {
    if (!this.playerData || this.playerData.rewardsClaimed) {
      return { success: false, rewards: null };
    }

    // 检查赛季是否结束
    const now = new Date().toISOString();
    if (now < this.currentSeason.endDate) {
      return { success: false, rewards: null };
    }

    const peakTier = this.playerData.peakRank.tier;
    const rewardConfig = SEASON_REWARDS.find(r => r.tier === peakTier);
    
    if (!rewardConfig) {
      return { success: false, rewards: null };
    }

    this.playerData.rewardsClaimed = true;
    this.savePlayerData();

    return { success: true, rewards: rewardConfig.rewards };
  }

  // ============ 排行榜 ============

  async getLeaderboard(limit: number = 100): Promise<{ rank: number; username: string; rankInfo: RankInfo }[]> {
    // TODO: 实际实现应调用 Supabase
    // 这里返回模拟数据
    const mockLeaderboard = [];
    for (let i = 0; i < Math.min(limit, 20); i++) {
      const tierIndex = Math.max(0, RANK_TIERS.length - 1 - Math.floor(i / 3));
      mockLeaderboard.push({
        rank: i + 1,
        username: `Player_${1000 + i}`,
        rankInfo: {
          tier: RANK_TIERS[tierIndex].tier,
          division: (i % 4) + 1,
          points: Math.floor(Math.random() * 100),
          totalPoints: 3000 - i * 50
        }
      });
    }
    return mockLeaderboard;
  }
}

export const RankService = new RankServiceClass();
