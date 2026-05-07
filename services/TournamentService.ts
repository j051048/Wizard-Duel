/**
 * TournamentService — 锦标赛系统
 *
 * 周末锦标赛：瑞士轮制，8人参赛
 */

import { SpellType } from '../types/card';

const STORAGE_KEY = 'wizard_tournament_v1';

// ============ 类型 ============

export type TournamentStatus = 'registration' | 'active' | 'completed';

export interface TournamentMatch {
  round: number;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  completedAt?: number;
}

export interface TournamentEntry {
  id: string;
  name: string;
  deck: SpellType[];
  wins: number;
  losses: number;
  isEliminated: boolean;
  isBot: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  size: number;           // 参赛人数 (8)
  currentRound: number;
  maxRounds: number;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
  rewards: TournamentReward[];
  startedAt: number;
  completedAt?: number;
}

export interface TournamentReward {
  place: number;
  gold: number;
  packs: number;
  title?: string;
}

// ============ 常量 ============

const TOURNAMENT_REWARDS: TournamentReward[] = [
  { place: 1, gold: 500, packs: 5, title: '锦标赛冠军' },
  { place: 2, gold: 300, packs: 3, title: '锦标赛亚军' },
  { place: 3, gold: 200, packs: 2 },
  { place: 4, gold: 100, packs: 1 },
  { place: 5, gold: 50, packs: 0 },
  { place: 6, gold: 50, packs: 0 },
  { place: 7, gold: 25, packs: 0 },
  { place: 8, gold: 25, packs: 0 },
];

const BOT_NAMES = ['AI 火焰术士', 'AI 冰霜法师', 'AI 雷电萨满', 'AI 大地守卫', 'AI 暗影刺客', 'AI 奥术学者', 'AI 元素大师'];

// ============ Service ============

export class TournamentService {

  static readonly ENTRY_FEE = 100;
  static readonly TOURNAMENT_SIZE = 8;
  static readonly MAX_ROUNDS = 3; // Swiss: 3 rounds for 8 players

  /** 创建新锦标赛 */
  static createTournament(playerId: string, playerName: string, deck: SpellType[]): Tournament {
    const entries: TournamentEntry[] = [
      { id: playerId, name: playerName, deck, wins: 0, losses: 0, isEliminated: false, isBot: false },
    ];

    // 填充 AI 对手
    for (let i = 0; i < this.TOURNAMENT_SIZE - 1; i++) {
      entries.push({
        id: `bot_${i}`,
        name: BOT_NAMES[i % BOT_NAMES.length],
        deck: [],
        wins: 0,
        losses: 0,
        isEliminated: false,
        isBot: true,
      });
    }

    const tournament: Tournament = {
      id: `tournament_${Date.now()}`,
      name: '周末锦标赛',
      status: 'registration',
      size: this.TOURNAMENT_SIZE,
      currentRound: 0,
      maxRounds: this.MAX_ROUNDS,
      entries,
      matches: [],
      rewards: TOURNAMENT_REWARDS,
      startedAt: Date.now(),
    };

    return tournament;
  }

  /** 开始锦标赛（生成第一轮对阵） */
  static startTournament(tournament: Tournament): Tournament {
    const shuffled = [...tournament.entries].sort(() => Math.random() - 0.5);
    const matches: TournamentMatch[] = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      matches.push({
        round: 1,
        player1Id: shuffled[i].id,
        player2Id: shuffled[i + 1].id,
      });
    }

    return {
      ...tournament,
      status: 'active',
      currentRound: 1,
      matches,
    };
  }

  /** 记录比赛结果 */
  static recordMatch(
    tournament: Tournament,
    matchIndex: number,
    winnerId: string
  ): Tournament {
    const match = tournament.matches[matchIndex];
    if (!match || match.winnerId) return tournament;

    const updatedMatches = [...tournament.matches];
    updatedMatches[matchIndex] = { ...match, winnerId, completedAt: Date.now() };

    const updatedEntries = tournament.entries.map(e => {
      if (e.id === match.player1Id || e.id === match.player2Id) {
        if (e.id === winnerId) {
          return { ...e, wins: e.wins + 1 };
        } else {
          const newLosses = e.losses + 1;
          return { ...e, losses: newLosses, isEliminated: newLosses >= 2 };
        }
      }
      return e;
    });

    // 检查本轮是否全部完成
    const roundMatches = updatedMatches.filter(m => m.round === tournament.currentRound);
    const allRoundDone = roundMatches.every(m => m.winnerId);

    let newStatus = tournament.status;
    let newRound = tournament.currentRound;
    let finalMatches = updatedMatches;

    if (allRoundDone) {
      if (tournament.currentRound >= tournament.maxRounds) {
        newStatus = 'completed';
      } else {
        newRound = tournament.currentRound + 1;
        // 生成下一轮对阵（瑞士轮：同胜场匹配）
        finalMatches = this.generateNextRound(updatedEntries, finalMatches, newRound);
      }
    }

    return {
      ...tournament,
      status: newStatus,
      currentRound: newRound,
      entries: updatedEntries,
      matches: finalMatches,
      completedAt: newStatus === 'completed' ? Date.now() : undefined,
    };
  }

  /** 生成下一轮对阵（瑞士轮） */
  private static generateNextRound(
    entries: TournamentEntry[],
    existingMatches: TournamentMatch[],
    round: number
  ): TournamentMatch[] {
    // 按胜场排序，同胜场随机配对
    const sorted = [...entries]
      .filter(e => !e.isEliminated)
      .sort((a, b) => b.wins - a.wins);

    const newMatches: TournamentMatch[] = [];
    const paired = new Set<string>();

    for (let i = 0; i < sorted.length - 1; i += 2) {
      if (!paired.has(sorted[i].id) && !paired.has(sorted[i + 1].id)) {
        newMatches.push({
          round,
          player1Id: sorted[i].id,
          player2Id: sorted[i + 1].id,
        });
        paired.add(sorted[i].id);
        paired.add(sorted[i + 1].id);
      }
    }

    return [...existingMatches, ...newMatches];
  }

  /** 获取当前需要玩家参与的比赛 */
  static getPlayerMatch(tournament: Tournament, playerId: string): TournamentMatch | null {
    return tournament.matches.find(
      m => m.round === tournament.currentRound &&
      !m.winnerId &&
      (m.player1Id === playerId || m.player2Id === playerId)
    ) || null;
  }

  /** 获取排名 */
  static getRankings(tournament: Tournament): TournamentEntry[] {
    return [...tournament.entries].sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });
  }

  /** 获取玩家奖励 */
  static getPlayerReward(tournament: Tournament, playerId: string): TournamentReward | null {
    const rankings = this.getRankings(tournament);
    const place = rankings.findIndex(e => e.id === playerId) + 1;
    return tournament.rewards.find(r => r.place === place) || null;
  }

  /** 模拟 AI vs AI 比赛 */
  static simulateBotMatch(tournament: Tournament): TournamentMatch | null {
    const botMatch = tournament.matches.find(
      m => m.round === tournament.currentRound &&
      !m.winnerId &&
      tournament.entries.find(e => e.id === m.player1Id)?.isBot &&
      tournament.entries.find(e => e.id === m.player2Id)?.isBot
    );
    return botMatch || null;
  }

  /** 持久化 */
  static save(tournament: Tournament): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
    } catch { /* ignore */ }
  }

  static load(): Tournament | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
