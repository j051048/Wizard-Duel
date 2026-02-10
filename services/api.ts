/**
 * API 服务层 - 支持 Zeabur 后端和 Supabase 积分系统
 * 
 * 架构说明：
 * - 开发模式：使用 Mock 数据
 * - 生产模式：连接真实后端 API
 * - 支持 Supabase 积分系统对接
 * 
 * 环境变量：
 * - VITE_API_BASE_URL: 后端 API 地址
 * - VITE_SUPABASE_URL: Supabase 项目 URL
 * - VITE_SUPABASE_ANON_KEY: Supabase 匿名密钥
 * - VITE_USE_MOCK: 是否使用 Mock 数据 (true/false)
 */

import { UserProfile, BattleRecord, PlayerStats, SpellType, Deck, Rank } from '../types';
import { determineWinner, calculatePayout } from './gameLogic';

// 安全获取环境变量
const getEnv = (key: string): string => {
  try {
    // @ts-ignore - Vite 环境变量
    return import.meta.env?.[key] || '';
  } catch {
    return '';
  }
};

// ============ 配置 ============

const CONFIG = {
  // API 基础地址 (来自环境变量或默认值)
  apiBaseUrl: getEnv('VITE_API_BASE_URL'),
  
  // Supabase 配置
  supabaseUrl: getEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: getEnv('VITE_SUPABASE_ANON_KEY'),
  
  // 是否使用 Mock 模式（无后端时自动启用）
  useMock: getEnv('VITE_USE_MOCK') === 'true' || !getEnv('VITE_API_BASE_URL'),
  
  // 请求超时时间
  timeout: 10000,
};

// ============ HTTP 工具函数 ============

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  if (CONFIG.useMock) {
    throw new Error('Mock mode - should not reach here');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}` 
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: '请求超时' };
    }
    return { success: false, error: error.message };
  }
}

// LocalStorage Keys
const STORAGE_KEYS = {
  PROFILE: 'wizard_user_profile',
  DECKS: 'wizard_user_decks',
  HISTORY: 'wizard_battle_history',
  INVENTORY: 'wizard_user_inventory'
};

// Helper to load/save local data
const _loadLocalData = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const _saveLocalData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// ============ Mock 数据存储 (In-Memory Fallback) ============
// Note: We now primarily use LocalStorage in Mock Mode
let mockBalance = 100;
let mockHistory: BattleRecord[] = [];
const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============ API 接口定义 ============

/**
 * 游戏结算请求参数
 */
export interface SettleGameRequest {
  userId: string;
  bet: number;
  result: 'WIN' | 'LOSS' | 'DRAW';
  playerSpell: SpellType;
  opponentSpell: SpellType;
  // 以下字段由后端计算或验证
  payout?: number;
  isCrit?: boolean;
  // 游戏元数据
  gameId?: string;
  roundNumber?: number;
  finalPlayerHP?: number;
  finalOpponentHP?: number;
  newScore?: number;
  newRank?: Rank;
}

/**
 * 积分变更请求参数
 */
export interface PointsChangeRequest {
  userId: string;
  amount: number;
  reason: 'game_bet' | 'game_win' | 'game_loss' | 'daily_bonus' | 'achievement' | 'admin_adjust';
  gameId?: string;
  metadata?: Record<string, any>;
}

/**
 * API 服务对象
 */
export const ApiService = {
  // ---------- 用户相关 ----------
  
  /**
   * 获取用户完整档案 (包括排位、积分、统计)
   */
  async getProfile(userId: string): Promise<UserProfile> {
    if (CONFIG.useMock) {
      await mockDelay(300);
      const profiles = _loadLocalData<Record<string, UserProfile>>(STORAGE_KEYS.PROFILE, {});
      
      if (!profiles[userId]) {
        // Init new profile
        profiles[userId] = {
          address: userId,
          balance: 100,
          userRank: 'Iron',
          rankScore: 0,
          stats: { wins: 0, losses: 0, totalGames: 0, winStreak: 0 }
        };
        _saveLocalData(STORAGE_KEYS.PROFILE, profiles);
      }
      
      return profiles[userId];
    }
    // TODO: Real API implementation
    return { address: userId, balance: 0 }; 
  },

  /**
   * 获取用户余额/积分 (Compatible wrapper)
   */
  async getBalance(userId: string): Promise<UserProfile> {
    return this.getProfile(userId);
  },

  /**
   * 同步用户状态到后端（首次登录时调用）
   */
  async syncUser(userId: string, metadata?: { walletAddress?: string }): Promise<boolean> {
    if (CONFIG.useMock) {
      return true;
    }

    const response = await apiRequest<{ success: boolean }>('/api/users/sync', {
      method: 'POST',
      body: JSON.stringify({ userId, ...metadata }),
    });
    return response.success;
  },

  // ---------- 收藏管理 ----------

  async getInventory(userId: string): Promise<SpellType[]> {
    if (CONFIG.useMock) {
      const allInventories = _loadLocalData<Record<string, SpellType[]>>(STORAGE_KEYS.INVENTORY, {});
      return allInventories[userId] || [];
    }
    // TODO: Real API
    return [];
  },

  async saveInventory(userId: string, inventory: SpellType[]): Promise<void> {
    if (CONFIG.useMock) {
      const allInventories = _loadLocalData<Record<string, SpellType[]>>(STORAGE_KEYS.INVENTORY, {});
      allInventories[userId] = inventory;
      _saveLocalData(STORAGE_KEYS.INVENTORY, allInventories);
      return;
    }
    // TODO: Real API
  },

  // ---------- 牌组管理 (NEW) ----------

  async getDecks(userId: string): Promise<Deck[]> {
    if (CONFIG.useMock) {
      const allDecks = _loadLocalData<Record<string, Deck[]>>(STORAGE_KEYS.DECKS, {});
      return allDecks[userId] || [];
    }
    return []; // TODO: Real API
  },

  async saveDeck(userId: string, deck: Deck): Promise<void> {
    if (CONFIG.useMock) {
      const allDecks = _loadLocalData<Record<string, Deck[]>>(STORAGE_KEYS.DECKS, {});
      const userDecks = allDecks[userId] || [];
      
      const idx = userDecks.findIndex(d => d.id === deck.id);
      if (idx >= 0) userDecks[idx] = deck;
      else userDecks.push(deck);
      
      allDecks[userId] = userDecks;
      _saveLocalData(STORAGE_KEYS.DECKS, allDecks);
      return;
    }
    // TODO: Real API
  },

  // ---------- 游戏相关 ----------

  /**
   * 游戏结算 - 核心接口
   * 
   * 后端应该：
   * 1. 验证游戏结果（防作弊）
   * 2. 计算积分变更
   * 3. 更新用户余额
   * 4. 记录游戏历史
   */
  async settleGame(
    userId: string,
    bet: number,
    result: 'WIN' | 'LOSS' | 'DRAW',
    playerSpell: SpellType,
    opponentSpell: SpellType,
    gameMetadata?: { gameId?: string; roundNumber?: number; finalPlayerHP?: number; finalOpponentHP?: number },
    newScore?: number,
    newRank?: Rank
  ): Promise<{ newBalance: number; verified: boolean; payout: number; isCrit: boolean }> {
    if (CONFIG.useMock) {
      await mockDelay(500);
      
      const profiles = _loadLocalData<Record<string, UserProfile>>(STORAGE_KEYS.PROFILE, {});
      const profile = profiles[userId] || { 
        address: userId, 
        balance: 100, 
        userRank: 'Iron', 
        rankScore: 0, 
        stats: { wins: 0, losses: 0, totalGames: 0, winStreak: 0 } 
      };

      // 后端计算核心逻辑 (防篡改)
      const { payout, isCrit } = calculatePayout(bet, result);

      // Update Balance
      const profit = result === 'WIN' ? payout - bet : (result === 'DRAW' ? 0 : -bet);
      profile.balance = Math.max(0, profile.balance + profit);
      
      // Update Rank
      if (typeof newScore === 'number') profile.rankScore = newScore;
      if (newRank) profile.userRank = newRank;

      // Update Stats
      if (!profile.stats) profile.stats = { wins: 0, losses: 0, totalGames: 0, winStreak: 0 };
      profile.stats.totalGames++;
      if (result === 'WIN') {
        profile.stats.wins++;
        profile.stats.winStreak++;
      } else if (result === 'LOSS') {
        profile.stats.losses++;
        profile.stats.winStreak = 0;
      }

      profiles[userId] = profile;
      _saveLocalData(STORAGE_KEYS.PROFILE, profiles);

      // Record History
      const histories = _loadLocalData<Record<string, BattleRecord[]>>(STORAGE_KEYS.HISTORY, {});
      const userHistory = histories[userId] || [];
      
      const record: BattleRecord = {
        id: Math.random().toString(36).substr(2, 9),
        playerSpell,
        opponentSpell,
        result,
        amount: profit,
        timestamp: Date.now(),
        isCrit,
      };
      
      userHistory.unshift(record);
      if (userHistory.length > 50) userHistory.pop();
      histories[userId] = userHistory;
      _saveLocalData(STORAGE_KEYS.HISTORY, histories);

      return { newBalance: profile.balance, verified: true, payout, isCrit };
    }

    // 生产模式：调用真实后端
    // 后端会忽略 client 传来的 payout/isCrit，自行重新计算
    const { payout: _unused_p, isCrit: _unused_c } = calculatePayout(bet, result); 
    
    const request: SettleGameRequest = {
      userId,
      bet,
      result,
      playerSpell,
      opponentSpell,
      ...gameMetadata,
      newScore, newRank
    };

    const response = await apiRequest<{ newBalance: number; verified: boolean; payout: number; isCrit: boolean }>('/api/games/settle', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.success) {
      console.error('游戏结算失败:', response.error);
      const profiles = _loadLocalData<Record<string, UserProfile>>(STORAGE_KEYS.PROFILE, {});
      const profile = profiles[userId];
      return { newBalance: profile ? profile.balance : 100, verified: false, payout: 0, isCrit: false };
    }

    return response.data!;
  },

  /**
   * 创建新游戏会话（可选，用于防作弊）
   */
  async createGameSession(userId: string, bet: number): Promise<{ gameId: string; seed?: string } | null> {
    if (CONFIG.useMock) {
      return { 
        gameId: `game_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        seed: Math.random().toString(36).substr(2, 16),
      };
    }

    const response = await apiRequest<{ gameId: string; seed: string }>('/api/games/create', {
      method: 'POST',
      body: JSON.stringify({ userId, bet }),
    });

    return response.success ? response.data! : null;
  },

  // ---------- 积分相关 ----------

  /**
   * 通用积分变更接口
   * 用于：每日签到、成就奖励、管理员调整等
   */
  async changePoints(request: PointsChangeRequest): Promise<{ newBalance: number; success: boolean }> {
    if (CONFIG.useMock) {
      await mockDelay(300);
      const profiles = _loadLocalData<Record<string, UserProfile>>(STORAGE_KEYS.PROFILE, {});
      const profile = profiles[request.userId] || { 
        address: request.userId, 
        balance: 1000, 
        userRank: 'Iron', 
        rankScore: 0, 
        stats: { wins: 0, losses: 0, totalGames: 0, winStreak: 0 } 
      };
      profile.balance += request.amount;
      profiles[request.userId] = profile;
      _saveLocalData(STORAGE_KEYS.PROFILE, profiles);
      return { newBalance: profile.balance, success: true };
    }

    const response = await apiRequest<{ newBalance: number }>('/api/points/change', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.success) {
      console.error('积分变更失败:', response.error);
      return { newBalance: mockBalance, success: false };
    }

    return { newBalance: response.data!.newBalance, success: true };
  },

  /**
   * 领取每日签到奖励
   */
  async claimDailyBonus(userId: string): Promise<{ amount: number; newBalance: number } | null> {
    if (CONFIG.useMock) {
      await mockDelay(500);
      const bonus = 50;
      const profiles = _loadLocalData<Record<string, UserProfile>>(STORAGE_KEYS.PROFILE, {});
      const profile = profiles[userId] || { 
        address: userId, 
        balance: 100, 
        userRank: 'Iron', 
        rankScore: 0, 
        stats: { wins: 0, losses: 0, totalGames: 0, winStreak: 0 } 
      };
      profile.balance += bonus;
      profiles[userId] = profile;
      _saveLocalData(STORAGE_KEYS.PROFILE, profiles);
      return { amount: bonus, newBalance: profile.balance };
    }

    const response = await apiRequest<{ amount: number; newBalance: number }>(`/api/users/${userId}/daily-bonus`, {
      method: 'POST',
    });

    return response.success ? response.data! : null;
  },

  // ---------- 历史记录 ----------

  /**
   * 获取游戏历史
   */
  async getHistory(userId: string, limit = 20): Promise<BattleRecord[]> {
    if (CONFIG.useMock) {
      await mockDelay(200);
      const histories = _loadLocalData<Record<string, BattleRecord[]>>(STORAGE_KEYS.HISTORY, {});
      return (histories[userId] || []).slice(0, limit);
    }

    const response = await apiRequest<{ records: BattleRecord[] }>(`/api/users/${userId}/history?limit=${limit}`);
    return response.success ? response.data!.records : [];
  },

  /**
   * 获取排行榜
   */
  async getLeaderboard(type: 'daily' | 'weekly' | 'all' = 'all', limit = 10): Promise<PlayerStats[]> {
    if (CONFIG.useMock) {
      await mockDelay(300);
      return ApiService._getMockLeaderboard(limit);
    }

    const response = await apiRequest<{ leaderboard: PlayerStats[] }>(`/api/leaderboard?type=${type}&limit=${limit}`);
    return response.success ? response.data!.leaderboard : [];
  },

  _getMockLeaderboard(limit: number) {
      return Array.from({ length: limit }).map((_, i) => ({
        address: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
        wins: Math.floor(Math.random() * 50) + 10,
        losses: Math.floor(Math.random() * 40),
        draws: Math.floor(Math.random() * 20),
        totalEarnings: Math.floor(Math.random() * 10000),
      })).sort((a, b) => b.totalEarnings - a.totalEarnings);
  },

  // ---------- 外部集成 ----------

  /**
   * 从外部应用接收积分（用于嵌入其他App时）
   * 
   * 调用方式：
   * - 父应用通过 postMessage 发送积分信息
   * - 或通过 URL 参数传递初始积分
   */
  async receiveExternalPoints(
    source: 'parent_app' | 'url_param' | 'api',
    data: { userId: string; points: number; token?: string }
  ): Promise<{ success: boolean; balance: number }> {
    if (CONFIG.useMock) {
      mockBalance = data.points;
      return { success: true, balance: mockBalance };
    }

    const response = await apiRequest<{ balance: number }>('/api/integration/receive-points', {
      method: 'POST',
      body: JSON.stringify({ source, ...data }),
    });

    if (response.success) {
      return { success: true, balance: response.data!.balance };
    }
    return { success: false, balance: 0 };
  },

  /**
   * 向外部应用报告积分变更（用于嵌入其他App时）
   * [P2 Fix #23] 使用配置的 origin 替代 '*'
   */
  notifyExternalApp(event: 'balance_change' | 'game_end' | 'ready', data: any): void {
    // [P2 Fix #23] 指定允许的 origin
    const ALLOWED_ORIGIN = import.meta.env.VITE_PARENT_ORIGIN || '*';
    
    // 使用 postMessage 通知父应用
    if (window.parent !== window) {
      window.parent.postMessage({
        type: `wizard_duel_${event}`,
        ...data,
      }, ALLOWED_ORIGIN);
    }

    // 触发自定义事件（供宿主应用监听）
    window.dispatchEvent(new CustomEvent(`wizardDuel:${event}`, { detail: data }));
  },

  // ---------- 配置和状态 ----------

  /**
   * 获取当前配置状态
   */
  getConfig() {
    return {
      isMockMode: CONFIG.useMock,
      hasBackend: !!CONFIG.apiBaseUrl,
      hasSupabase: !!CONFIG.supabaseUrl,
    };
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ api: boolean; supabase: boolean }> {
    if (CONFIG.useMock) {
      return { api: false, supabase: false };
    }

    const apiHealthy = await apiRequest('/api/health').then(r => r.success).catch(() => false);
    const supabaseHealthy = CONFIG.supabaseUrl 
      ? await fetch(`${CONFIG.supabaseUrl}/rest/v1/`).then(r => r.ok).catch(() => false)
      : false;

    return { api: apiHealthy, supabase: supabaseHealthy };
  },
};

// ============ 类型导出 ============

export type { ApiResponse };
export default ApiService;
