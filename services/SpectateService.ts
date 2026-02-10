
/**
 * SpectateService - 社交观战模式
 * 
 * [P3 Fix #24] 支持通过链接直接观看好友比赛
 * 
 * 架构：
 * - 观战者通过 roomId 订阅 Supabase Realtime channel
 * - 对战方每次状态变更广播 snapshot
 * - 观战者只读接收，不能发送任何操作
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { DuelState } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SpectateSnapshot {
  state: DuelState;
  phase: string;
  timestamp: number;
  playerName: string;
  opponentName: string;
}

export type SpectateCallback = (snapshot: SpectateSnapshot) => void;

class SpectateServiceImpl {
  private channel: RealtimeChannel | null = null;
  private _isSpectating = false;
  private _roomId: string | null = null;

  get isSpectating(): boolean {
    return this._isSpectating;
  }

  get roomId(): string | null {
    return this._roomId;
  }

  /**
   * 生成观战链接
   */
  generateSpectateLink(roomId: string): string {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}?spectate=${roomId}`;
  }

  /**
   * 从 URL 中提取观战 roomId
   */
  getSpectateRoomFromURL(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('spectate');
  }

  /**
   * 作为对战方：广播状态快照给观战者
   */
  async broadcastSnapshot(
    roomId: string,
    snapshot: SpectateSnapshot
  ): Promise<void> {
    if (!isSupabaseConfigured) return;

    try {
      const channel = supabase.channel(`spectate:${roomId}`);
      await channel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: {
          state: {
            // 安全过滤：不发送对手手牌详情
            ...snapshot.state,
            opponentHand: [],
            playerDeck: [],
            opponentDeck: [],
          },
          phase: snapshot.phase,
          timestamp: snapshot.timestamp,
          playerName: snapshot.playerName,
          opponentName: snapshot.opponentName,
        },
      });
    } catch (e) {
      console.debug('[SpectateService] Broadcast error:', e);
    }
  }

  /**
   * 作为观战者：加入观战频道
   */
  async startSpectating(
    roomId: string,
    onSnapshot: SpectateCallback,
    onEnd?: () => void
  ): Promise<boolean> {
    if (!isSupabaseConfigured) {
      console.warn('[SpectateService] Supabase not configured');
      return false;
    }

    try {
      this.stopSpectating();

      this._roomId = roomId;
      this.channel = supabase.channel(`spectate:${roomId}`);

      this.channel!
        .on('broadcast', { event: 'game_state' }, (payload) => {
          const data = payload.payload as SpectateSnapshot;
          if (data) {
            onSnapshot(data);
          }
        })
        .on('broadcast', { event: 'game_end' }, () => {
          onEnd?.();
          this.stopSpectating();
        });

      await this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this._isSpectating = true;
          console.log('[SpectateService] Spectating room:', roomId);
        }
      });

      return true;
    } catch (e) {
      console.error('[SpectateService] Failed to start spectating:', e);
      return false;
    }
  }

  /**
   * 停止观战
   */
  async stopSpectating(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this._isSpectating = false;
    this._roomId = null;
  }

  /**
   * 通知观战者游戏结束
   */
  async broadcastGameEnd(roomId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const channel = supabase.channel(`spectate:${roomId}`);
      await channel.send({
        type: 'broadcast',
        event: 'game_end',
        payload: { timestamp: Date.now() },
      });
    } catch (e) {
      console.debug('[SpectateService] End broadcast error:', e);
    }
  }
}

export const SpectateService = new SpectateServiceImpl();
export default SpectateService;