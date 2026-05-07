/**
 * SecureGameService - 安全游戏服务层
 * 
 * [P0 Fix #3, #4, #5] 使用 Supabase RPC 函数进行服务端验证
 * 
 * 所有敏感操作（金币、开包、战斗结算）必须通过此服务
 * 客户端无法绕过验证
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { Rarity, SpellType } from '../types';

// ============ 类型定义 ============

export interface GoldResult {
  success: boolean;
  newBalance: number;
  error?: string;
}

export interface PackOpenResult {
  success: boolean;
  cards: Array<{ rarity: Rarity; index: number }>;
  pityTriggered: boolean;
  error?: string;
}

export interface BattleSettleResult {
  success: boolean;
  newGold: number;
  newXp: number;
  error?: string;
}

// ============ 安全服务 ============

export const SecureGameService = {
  /**
   * 安全金币操作（原子性）
   * [P0 Fix #3] 替代 localStorage 金币存储
   */
  async adjustGold(
    userId: string,
    delta: number,
    reason: string = 'game'
  ): Promise<GoldResult> {
    if (!isSupabaseConfigured) {
      console.warn('[SecureGameService] Supabase not configured, using mock');
      return { success: true, newBalance: 1000 + delta };
    }

    try {
      const { data, error } = await supabase.rpc('adjust_gold_secure', {
        p_user_id: userId,
        p_delta: delta,
        p_reason: reason
      });

      if (error) {
        console.error('[SecureGameService] adjustGold error:', error);
        return { success: false, newBalance: 0, error: error.message };
      }

      const result = data?.[0];
      if (!result?.success) {
        return { 
          success: false, 
          newBalance: result?.new_balance || 0, 
          error: result?.error_message || 'Unknown error' 
        };
      }

      return { success: true, newBalance: result.new_balance };
    } catch (e: any) {
      console.error('[SecureGameService] adjustGold exception:', e);
      return { success: false, newBalance: 0, error: e.message };
    }
  },

  /**
   * 安全开包（服务端概率计算）
   * [P0 Fix #4] 替代前端概率生成
   */
  async openPack(
    userId: string,
    packId: string,
    packType: 'standard' | 'premium' | 'legendary' = 'standard'
  ): Promise<PackOpenResult> {
    if (!isSupabaseConfigured) {
      console.warn('[SecureGameService] Supabase not configured, using mock');
      // Mock: 返回随机卡牌
      const mockCards = Array.from({ length: 5 }, (_, i) => ({
        rarity: (['common', 'common', 'common', 'rare', 'common'][i]) as Rarity,
        index: i + 1
      }));
      return { success: true, cards: mockCards, pityTriggered: false };
    }

    try {
      const { data, error } = await supabase.rpc('open_pack_secure', {
        p_user_id: userId,
        p_pack_id: packId,
        p_pack_type: packType
      });

      if (error) {
        console.error('[SecureGameService] openPack error:', error);
        return { success: false, cards: [], pityTriggered: false, error: error.message };
      }

      const result = data?.[0];
      if (!result?.success) {
        return { 
          success: false, 
          cards: [], 
          pityTriggered: false,
          error: result?.error_message || 'Unknown error' 
        };
      }

      return { 
        success: true, 
        cards: (result.cards as { rarity: Rarity; index: number }[] | null) || [],
        pityTriggered: result.pity_triggered || false 
      };
    } catch (e: any) {
      console.error('[SecureGameService] openPack exception:', e);
      return { success: false, cards: [], pityTriggered: false, error: e.message };
    }
  },

  /**
   * 安全战斗结算 (Rank System v2.0)
   * [P0 Fix #5] 服务端验证战斗结果，自动计算金币与积分
   */
  async settleBattle(
    userId: string,
    betAmount: number,
    result: 'WIN' | 'LOSS' | 'DRAW',
    playerSpell: any,
    opponentSpell: any,
    metadata: any = {}
  ): Promise<any> {
    if (!isSupabaseConfigured) {
      console.warn('[SecureGameService] Supabase not configured, using mock');
      return { 
        success: true, 
        new_score: 100, 
        new_balance: 1000 + (result === 'WIN' ? betAmount * 2 : 0) 
      };
    }

    try {
      const { data, error } = await supabase.rpc('settle_battle_secure', {
        p_user_id: userId,
        p_bet_amount: betAmount,
        p_result: result,
        p_player_spell: playerSpell,
        p_opponent_spell: opponentSpell,
        p_meta: metadata
      });

      if (error) {
        console.error('[SecureGameService] settleBattle error:', error);
        return { success: false, error: error.message };
      }

      // RPC 返回的是单个 JSON 对象
      const res = data;
      if (!res?.success) {
        return { 
          success: false, 
          error: res?.error || 'Unknown settlement error' 
        };
      }

      return res;
    } catch (e: any) {
      console.error('[SecureGameService] settleBattle exception:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 获取当前金币余额（从服务端）
   */
  async getGoldBalance(userId: string): Promise<number> {
    if (!isSupabaseConfigured) {
      return 1000; // Mock
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('gold')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[SecureGameService] getGoldBalance error:', error);
        return 0;
      }

      return data?.gold || 0;
    } catch (e) {
      console.error('[SecureGameService] getGoldBalance exception:', e);
      return 0;
    }
  },

  /**
   * 获取保底计数器（用于 UI 显示）
   */
  async getPityCounters(userId: string): Promise<{
    rare: number;
    mythic: number;
    legendary: number;
  }> {
    if (!isSupabaseConfigured) {
      return { rare: 0, mythic: 0, legendary: 0 };
    }

    try {
      const { data, error } = await supabase
        .from('pity_counters')
        .select('rare_pity, mythic_pity, legendary_pity')
        .eq('user_id', userId)
        .single();

      if (error) {
        // 可能是新用户，还没有记录
        return { rare: 0, mythic: 0, legendary: 0 };
      }

      return {
        rare: data?.rare_pity || 0,
        mythic: data?.mythic_pity || 0,
        legendary: data?.legendary_pity || 0
      };
    } catch (e) {
      return { rare: 0, mythic: 0, legendary: 0 };
    }
  }
};

export default SecureGameService;
