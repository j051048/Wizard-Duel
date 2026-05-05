/**
 * CheckInService - 每日签到服务
 * 管理连续签到天数、奖励发放
 */

const STORAGE_KEY = 'wizard_duel_checkin';

interface CheckInState {
  lastCheckIn: string; // ISO date string YYYY-MM-DD
  streak: number; // consecutive days
  totalCheckIns: number;
  claimedRewards: number[]; // day indices that have been claimed this week
}

const REWARDS = [
  { day: 1, label: '第1天', gems: 10, icon: '💎' },
  { day: 2, label: '第2天', gems: 15, icon: '💎' },
  { day: 3, label: '第3天', gems: 20, icon: '💎' },
  { day: 4, label: '第4天', gems: 25, icon: '💎' },
  { day: 5, label: '第5天', gems: 30, icon: '💎' },
  { day: 6, label: '第6天', gems: 40, icon: '💎' },
  { day: 7, label: '第7天', gems: 100, icon: '🏆' },
];

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

class CheckInServiceClass {
  private state: CheckInState;

  constructor() {
    this.state = this.load();
  }

  private load(): CheckInState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Reset streak if more than 1 day gap
        if (parsed.lastCheckIn && parsed.lastCheckIn !== getTodayStr() && parsed.lastCheckIn !== getYesterdayStr()) {
          parsed.streak = 0;
          parsed.claimedRewards = [];
        }
        // Reset weekly rewards on new week (if last check-in was > 7 days ago)
        if (parsed.lastCheckIn) {
          const lastDate = new Date(parsed.lastCheckIn);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
          if (diffDays >= 7) {
            parsed.claimedRewards = [];
          }
        }
        return parsed;
      }
    } catch { /* ignore */ }
    return { lastCheckIn: '', streak: 0, totalCheckIns: 0, claimedRewards: [] };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch { /* ignore */ }
  }

  getState() {
    return { ...this.state };
  }

  canCheckIn(): boolean {
    return this.state.lastCheckIn !== getTodayStr();
  }

  checkIn(): { success: boolean; gems: number; streak: number; message: string } {
    if (!this.canCheckIn()) {
      return { success: false, gems: 0, streak: this.state.streak, message: '今天已经签到过了' };
    }

    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    // Check if streak continues
    if (this.state.lastCheckIn === yesterday) {
      this.state.streak += 1;
    } else {
      this.state.streak = 1;
      this.state.claimedRewards = [];
    }

    this.state.lastCheckIn = today;
    this.state.totalCheckIns += 1;

    const weekDay = ((this.state.streak - 1) % 7);
    const reward = REWARDS[weekDay];

    if (!this.state.claimedRewards.includes(weekDay)) {
      this.state.claimedRewards.push(weekDay);
    }

    this.save();

    return {
      success: true,
      gems: reward.gems,
      streak: this.state.streak,
      message: `签到成功！获得 ${reward.gems} 宝石`,
    };
  }

  getRewards() {
    return REWARDS;
  }

  getCurrentWeekDay(): number {
    return ((this.state.streak) % 7);
  }
}

export const CheckInService = new CheckInServiceClass();
export default CheckInService;
