/**
 * ArenaService — 竞技场模式（Draft Pick）
 *
 * 随机选牌构建临时牌组，累计胜利获取奖励
 */

import { SpellType, Rarity } from '../types/card';
import { SPELLS } from '../constants';

const STORAGE_KEY = 'wizard_arena_v1';

// ============ 类型 ============

export interface ArenaRun {
  id: string;
  userId: string;
  deck: SpellType[];
  draftChoices: SpellType[][]; // 30 次选择，每次 3 选 1
  wins: number;
  losses: number;
  status: 'drafting' | 'active' | 'completed' | 'retired';
  currentDraftPick: number; // 0-29
  rewards: ArenaReward[];
  startedAt: number;
  completedAt?: number;
}

export interface ArenaReward {
  type: 'gold' | 'pack' | 'card';
  amount: number;
  rarity?: Rarity;
  claimed: boolean;
}

export interface ArenaDraftOption {
  cards: SpellType[];
  pickIndex: number;
}

// ============ 常量 ============

export const ARENA_CONFIG = {
  ENTRY_FEE: 150,
  DECK_SIZE: 20,
  PICKS_PER_CHOICE: 3,
  MAX_WINS: 12,
  MAX_LOSSES: 3,
} as const;

// 胜利奖励表
const REWARD_TABLE: Record<number, ArenaReward[]> = {
  0: [{ type: 'gold', amount: 25, claimed: false }],
  1: [{ type: 'gold', amount: 40, claimed: false }],
  2: [{ type: 'gold', amount: 50, claimed: false }],
  3: [{ type: 'gold', amount: 60, claimed: false }, { type: 'pack', amount: 1, claimed: false }],
  4: [{ type: 'gold', amount: 80, claimed: false }, { type: 'pack', amount: 1, claimed: false }],
  5: [{ type: 'gold', amount: 100, claimed: false }, { type: 'pack', amount: 1, claimed: false }],
  6: [{ type: 'gold', amount: 120, claimed: false }, { type: 'pack', amount: 2, claimed: false }],
  7: [{ type: 'gold', amount: 150, claimed: false }, { type: 'pack', amount: 2, claimed: false }],
  8: [{ type: 'gold', amount: 180, claimed: false }, { type: 'pack', amount: 2, claimed: false }],
  9: [{ type: 'gold', amount: 220, claimed: false }, { type: 'pack', amount: 3, claimed: false }],
  10: [{ type: 'gold', amount: 260, claimed: false }, { type: 'pack', amount: 3, claimed: false }],
  11: [{ type: 'gold', amount: 300, claimed: false }, { type: 'pack', amount: 4, claimed: false }],
  12: [{ type: 'gold', amount: 400, claimed: false }, { type: 'pack', amount: 5, claimed: false }],
};

// ============ Service ============

export class ArenaService {

  /** 随机选取 N 张可选卡牌 */
  static generateDraftPool(count: number): SpellType[] {
    const available = SPELLS.filter(s =>
      s.id !== 'skip' && s.id !== 'luck_coin' && !s.id.startsWith('hero_')
    );
    const pool: SpellType[] = [];
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      pool.push(shuffled[i].id);
    }
    return pool;
  }

  /** 生成一轮选牌选项（3 张卡） */
  static generateDraftChoices(): SpellType[] {
    // 保证稀有度分布合理：60% common, 25% rare, 10% mythic, 5% legendary
    const roll = Math.random();
    let targetRarity: Rarity;
    if (roll < 0.60) targetRarity = 'common';
    else if (roll < 0.85) targetRarity = 'rare';
    else if (roll < 0.95) targetRarity = 'mythic';
    else targetRarity = 'legendary';

    const pool = SPELLS.filter(s =>
      s.id !== 'skip' && s.id !== 'luck_coin' && !s.id.startsWith('hero_') &&
      (s.rarity === targetRarity || Math.random() < 0.3) // 30% 概率跨稀有度
    );

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, ARENA_CONFIG.PICKS_PER_CHOICE).map(s => s.id);
  }

  /** 创建新的竞技场回合 */
  static startRun(userId: string): ArenaRun {
    const firstChoices = this.generateDraftChoices();
    return {
      id: `arena_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      deck: [],
      draftChoices: [firstChoices],
      wins: 0,
      losses: 0,
      status: 'drafting',
      currentDraftPick: 0,
      rewards: [],
      startedAt: Date.now(),
    };
  }

  /** 选牌 */
  static makePick(run: ArenaRun, cardId: SpellType): ArenaRun {
    const newDeck = [...run.deck, cardId];
    const nextPick = run.currentDraftPick + 1;

    if (nextPick >= ARENA_CONFIG.DECK_SIZE) {
      // 选牌完成，进入战斗
      return {
        ...run,
        deck: newDeck,
        currentDraftPick: nextPick,
        status: 'active',
      };
    }

    // 生成下一轮选项
    const newChoices = [...run.draftChoices, this.generateDraftChoices()];
    return {
      ...run,
      deck: newDeck,
      draftChoices: newChoices,
      currentDraftPick: nextPick,
    };
  }

  /** 记录战斗结果 */
  static recordBattle(run: ArenaRun, won: boolean): ArenaRun {
    const newWins = won ? run.wins + 1 : run.wins;
    const newLosses = won ? run.losses : run.losses + 1;

    if (newWins >= ARENA_CONFIG.MAX_WINS || newLosses >= ARENA_CONFIG.MAX_LOSSES) {
      // 竞技场结束
      const rewards = this.calculateRewards(newWins);
      return {
        ...run,
        wins: newWins,
        losses: newLosses,
        status: 'completed',
        rewards,
        completedAt: Date.now(),
      };
    }

    return { ...run, wins: newWins, losses: newLosses };
  }

  /** 计算奖励 */
  static calculateRewards(wins: number): ArenaReward[] {
    return (REWARD_TABLE[wins] || REWARD_TABLE[0]).map(r => ({ ...r }));
  }

  /** 获取胜率文本 */
  static getWinRecord(run: ArenaRun): string {
    return `${run.wins}胜 ${run.losses}负`;
  }

  /** 持久化 */
  static save(run: ArenaRun): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
    } catch { /* ignore */ }
  }

  static load(): ArenaRun | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
