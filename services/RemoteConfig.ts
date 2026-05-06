/**
 * RemoteConfig — 服务端远程配置系统
 *
 * 从 Supabase 获取服务端配置，覆盖本地默认值。
 * 支持热更新：无需重新部署即可调整游戏平衡参数。
 *
 * 配置优先级：Remote Config > 本地默认值
 *
 * 使用场景：
 * - 卡牌数值平衡调整（伤害/费用/效果）
 * - 活动开关（限时模式/双倍经验）
 * - 系统参数（匹配范围/冷却时间）
 */

import { supabase, isSupabaseConfigured } from './supabase';

// ============ Config Schema ============

export interface RemoteBalanceConfig {
  /** Card damage overrides: { spellId: newDamage } */
  cardDamageOverrides: Record<string, number>;
  /** Card mana cost overrides: { spellId: newCost } */
  cardCostOverrides: Record<string, number>;
  /** Element damage multipliers: { element: multiplier } */
  elementMultipliers: Record<string, number>;
  /** Cross-element synergy enabled */
  crossElementSynergyEnabled: boolean;
  /** Combo stack limits override */
  comboLimits: Record<string, number>;
}

export interface RemoteSystemConfig {
  /** MMR match range (override default 100) */
  mmrMatchRange: number;
  /** Max reconnect attempts */
  maxReconnectAttempts: number;
  /** Enable analytics tracking */
  analyticsEnabled: boolean;
  /** Enable server-side replay validation */
  replayValidationEnabled: boolean;
  /** Maintenance mode flag */
  maintenanceMode: boolean;
  /** Maintenance message */
  maintenanceMessage: string;
}

export interface RemoteEventConfig {
  /** Active limited-time mode ID (null = none) */
  activeLimitedMode: string | null;
  /** XP multiplier (1.0 = normal) */
  xpMultiplier: number;
  /** Gold multiplier */
  goldMultiplier: number;
  /** Event banner text */
  eventBanner: string;
  /** Event start time (ISO) */
  eventStart: string | null;
  /** Event end time (ISO) */
  eventEnd: string | null;
}

export interface RemoteConfig {
  balance: RemoteBalanceConfig;
  system: RemoteSystemConfig;
  event: RemoteEventConfig;
  /** Config version (for cache invalidation) */
  version: number;
  /** Last updated timestamp */
  updatedAt: string;
}

// ============ Default Config ============

const DEFAULT_CONFIG: RemoteConfig = {
  balance: {
    cardDamageOverrides: {},
    cardCostOverrides: {},
    elementMultipliers: {
      fire: 1.0,
      vine: 1.0,
      ice: 1.0,
      thunder: 1.0,
      rock: 1.0,
    },
    crossElementSynergyEnabled: true,
    comboLimits: {},
  },
  system: {
    mmrMatchRange: 100,
    maxReconnectAttempts: 5,
    analyticsEnabled: true,
    replayValidationEnabled: false,
    maintenanceMode: false,
    maintenanceMessage: '服务器维护中，请稍后再来...',
  },
  event: {
    activeLimitedMode: null,
    xpMultiplier: 1.0,
    goldMultiplier: 1.0,
    eventBanner: '',
    eventStart: null,
    eventEnd: null,
  },
  version: 0,
  updatedAt: new Date(0).toISOString(),
};

// ============ Cache ============

let cachedConfig: RemoteConfig = { ...DEFAULT_CONFIG };
let configVersion = 0;
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes
let lastFetchTime = 0;

// ============ Service ============

class RemoteConfigServiceClass {
  /**
   * Fetch remote config from Supabase (with cache).
   * Returns default config if Supabase is unavailable.
   */
  async fetch(): Promise<RemoteConfig> {
    const now = Date.now();

    // Return cache if fresh
    if ((now - lastFetchTime) < CACHE_TTL_MS && configVersion > 0) {
      return cachedConfig;
    }

    if (!isSupabaseConfigured) {
      return DEFAULT_CONFIG;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('remote_config')
        .select('config, version, updated_at')
        .eq('id', 'game_config')
        .single();

      if (error) throw error;

      if (data && (data as any).version > configVersion) {
        const remoteData = (data as any).config || {};
        cachedConfig = {
          balance: { ...DEFAULT_CONFIG.balance, ...remoteData.balance },
          system: { ...DEFAULT_CONFIG.system, ...remoteData.system },
          event: { ...DEFAULT_CONFIG.event, ...remoteData.event },
          version: (data as any).version,
          updatedAt: (data as any).updated_at,
        };
        configVersion = (data as any).version;
        lastFetchTime = now;
      }

      return cachedConfig;
    } catch (err) {
      console.warn('[RemoteConfig] Fetch failed, using cached/default:', err);
      return cachedConfig;
    }
  }

  /**
   * Get a specific balance value for a card.
   * Returns remote override if exists, otherwise null.
   */
  getCardDamageOverride(spellId: string): number | null {
    return cachedConfig.balance.cardDamageOverrides[spellId] ?? null;
  }

  getCardCostOverride(spellId: string): number | null {
    return cachedConfig.balance.cardCostOverrides[spellId] ?? null;
  }

  getElementMultiplier(element: string): number {
    return cachedConfig.balance.elementMultipliers[element] ?? 1.0;
  }

  isCrossElementSynergyEnabled(): boolean {
    return cachedConfig.balance.crossElementSynergyEnabled;
  }

  isMaintenanceMode(): boolean {
    return cachedConfig.system.maintenanceMode;
  }

  getMaintenanceMessage(): string {
    return cachedConfig.system.maintenanceMessage;
  }

  isAnalyticsEnabled(): boolean {
    return cachedConfig.system.analyticsEnabled;
  }

  isReplayValidationEnabled(): boolean {
    return cachedConfig.system.replayValidationEnabled;
  }

  getActiveLimitedMode(): string | null {
    const event = cachedConfig.event;
    if (!event.activeLimitedMode) return null;
    // Check if event is within time window
    if (event.eventStart && new Date(event.eventStart) > new Date()) return null;
    if (event.eventEnd && new Date(event.eventEnd) < new Date()) return null;
    return event.activeLimitedMode;
  }

  getXpMultiplier(): number {
    return cachedConfig.event.xpMultiplier;
  }

  getGoldMultiplier(): number {
    return cachedConfig.event.goldMultiplier;
  }

  getEventBanner(): string {
    return cachedConfig.event.eventBanner;
  }

  /**
   * Force refresh (ignores cache TTL).
   */
  async forceRefresh(): Promise<RemoteConfig> {
    lastFetchTime = 0;
    configVersion = 0;
    return this.fetch();
  }

  /**
   * Get the currently cached config (no fetch).
   */
  getCached(): RemoteConfig {
    return cachedConfig;
  }
}

export const RemoteConfigService = new RemoteConfigServiceClass();
