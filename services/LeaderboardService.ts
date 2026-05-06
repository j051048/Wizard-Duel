/**
 * LeaderboardService - 排行榜服务
 *
 * 从 Supabase 获取全球排行榜数据，支持分页和缓存。
 * 当 Supabase 未配置时使用本地 mock 数据。
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { getRankByScore, RANK_THRESHOLDS } from './rankSystem';
import type { Rank } from '../types';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  tier: Rank;
  winRate: number;
  totalGames: number;
  winStreak: number;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// Cache
let cachedLeaderboard: LeaderboardPage | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

// Mock data for when Supabase is unavailable
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 'mock_1', username: '大魔导师', score: 28500, tier: 'Legend', winRate: 0.72, totalGames: 320, winStreak: 8 },
  { rank: 2, userId: 'mock_2', username: '冰霜领主', score: 26200, tier: 'Legend', winRate: 0.68, totalGames: 280, winStreak: 5 },
  { rank: 3, userId: 'mock_3', username: '雷霆之怒', score: 24100, tier: 'Mythic', winRate: 0.65, totalGames: 410, winStreak: 3 },
  { rank: 4, userId: 'mock_4', username: '烈焰术士', score: 21800, tier: 'Mythic', winRate: 0.63, totalGames: 190, winStreak: 2 },
  { rank: 5, userId: 'mock_5', username: '自然守护者', score: 19500, tier: 'Master', winRate: 0.60, totalGames: 350, winStreak: 1 },
  { rank: 6, userId: 'mock_6', username: '岩石战士', score: 17200, tier: 'Master', winRate: 0.58, totalGames: 220, winStreak: 0 },
  { rank: 7, userId: 'mock_7', username: '暗影刺客', score: 15800, tier: 'Epic', winRate: 0.56, totalGames: 180, winStreak: 4 },
  { rank: 8, userId: 'mock_8', username: '元素使者', score: 13500, tier: 'Epic', winRate: 0.55, totalGames: 290, winStreak: 1 },
  { rank: 9, userId: 'mock_9', username: '风暴骑士', score: 11200, tier: 'Diamond', winRate: 0.53, totalGames: 150, winStreak: 0 },
  { rank: 10, userId: 'mock_10', username: '圣光祭司', score: 9800, tier: 'Diamond', winRate: 0.51, totalGames: 200, winStreak: 2 },
];

class LeaderboardServiceClass {
  /**
   * Fetch leaderboard page from Supabase (with cache).
   */
  async getLeaderboard(page: number = 0, pageSize: number = 20): Promise<LeaderboardPage> {
    const now = Date.now();

    // Return cache if fresh and requesting first page
    if (page === 0 && cachedLeaderboard && (now - cacheTimestamp) < CACHE_TTL_MS) {
      return cachedLeaderboard;
    }

    if (!isSupabaseConfigured) {
      const result = this.getMockLeaderboard(page, pageSize);
      if (page === 0) {
        cachedLeaderboard = result;
        cacheTimestamp = now;
      }
      return result;
    }

    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, rank_score, total_games, wins, win_streak', { count: 'exact' })
        .order('rank_score', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const entries: LeaderboardEntry[] = (data || []).map((row: any, idx: number) => ({
        rank: from + idx + 1,
        userId: row.id,
        username: row.username || '匿名巫师',
        avatarUrl: row.avatar_url,
        score: row.rank_score || 0,
        tier: getRankByScore(row.rank_score || 0),
        winRate: row.total_games > 0 ? (row.wins || 0) / row.total_games : 0,
        totalGames: row.total_games || 0,
        winStreak: row.win_streak || 0,
      }));

      const result: LeaderboardPage = {
        entries,
        total: count || entries.length,
        page,
        pageSize,
      };

      if (page === 0) {
        cachedLeaderboard = result;
        cacheTimestamp = now;
      }

      return result;
    } catch (err) {
      console.warn('[Leaderboard] Supabase fetch failed, using mock:', err);
      return this.getMockLeaderboard(page, pageSize);
    }
  }

  /**
   * Get a specific user's rank position.
   */
  async getUserRank(userId: string): Promise<{ rank: number; score: number; tier: Rank } | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      // Get user's score
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('rank_score')
        .eq('id', userId)
        .single();

      if (userError || !userData) return null;

      const score = (userData as any).rank_score || 0;

      // Count how many players have higher score
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('rank_score', score);

      if (countError) throw countError;

      return {
        rank: (count || 0) + 1,
        score,
        tier: getRankByScore(score),
      };
    } catch (err) {
      console.warn('[Leaderboard] getUserRank failed:', err);
      return null;
    }
  }

  /**
   * Get leaderboard statistics summary.
   */
  async getStats(): Promise<{ totalPlayers: number; avgScore: number; topTier: Rank }> {
    if (!isSupabaseConfigured) {
      return { totalPlayers: MOCK_LEADERBOARD.length, avgScore: 15000, topTier: 'Legend' };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('rank_score');

      if (error) throw error;

      const scores = (data || []).map((d: any) => d.rank_score || 0);
      const totalPlayers = scores.length;
      const avgScore = totalPlayers > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / totalPlayers : 0;
      const maxScore = Math.max(...scores, 0);
      const topTier = getRankByScore(maxScore);

      return { totalPlayers, avgScore: Math.round(avgScore), topTier };
    } catch {
      return { totalPlayers: 0, avgScore: 0, topTier: 'Iron' };
    }
  }

  private getMockLeaderboard(page: number, pageSize: number): LeaderboardPage {
    const from = page * pageSize;
    const entries = MOCK_LEADERBOARD.slice(from, from + pageSize);
    return {
      entries,
      total: MOCK_LEADERBOARD.length,
      page,
      pageSize,
    };
  }

  /**
   * Invalidate cache (call after user's score changes).
   */
  invalidateCache() {
    cachedLeaderboard = null;
    cacheTimestamp = 0;
  }
}

export const LeaderboardService = new LeaderboardServiceClass();
