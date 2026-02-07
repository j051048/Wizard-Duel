import { supabase, isSupabaseConfigured } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface OnlineUser {
  id: string;
  username: string;
  avatar_url?: string;
  status: 'online' | 'seeking' | 'battling';
  last_active: number;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  text: string;
  timestamp: number;
}

export type MatchmakingCallback = (payload: { roomId: string; opponent: OnlineUser; isHost: boolean }) => void;

class MatchmakingService {
  private lobbyChannel: RealtimeChannel | null = null;
  private userId: string | null = null;
  private username: string = 'Anonymous';
  private onMatchFound: MatchmakingCallback | null = null;

    async init(userId: string, username: string) {
    if (!isSupabaseConfigured) {
      console.warn('Matchmaking unavailable: Supabase not configured');
      return;
    }
    this.userId = userId;
    this.username = username;
    
    // 清理之前的连接
    if (this.lobbyChannel) {
      await this.lobbyChannel.unsubscribe();
    }

    this.lobbyChannel = supabase.channel('lobby', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

        // 监听在线状态变更
    this.lobbyChannel!
      .on('presence', { event: 'sync' }, () => {
        const state = this.lobbyChannel!.presenceState();
        // console.log('Online users:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // console.log('User left:', key, leftPresences);
      })
      // 监听广播消息（聊天 & 匹配）
      .on('broadcast', { event: 'chat' }, (payload) => {
        // console.log('Chat message:', payload);
      })
      .on('broadcast', { event: 'match_request' }, (payload) => {
        this.handleMatchRequest(payload);
      })
      .on('broadcast', { event: 'match_accept' }, (payload) => {
        this.handleMatchAccept(payload);
      });

    await this.lobbyChannel!.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.updateStatus('online');
      }
    });

    return this.lobbyChannel;
  }

  // 更新用户 Presence 状态
  async updateStatus(status: OnlineUser['status']) {
    if (!this.lobbyChannel || !this.userId) return;
    
    await this.lobbyChannel.track({
      id: this.userId,
      username: this.username,
      status: status,
      last_active: Date.now(),
    });
  }

  // 发送聊天消息
  sendChatMessage(text: string) {
    if (!this.lobbyChannel || !this.userId) return;
    
    this.lobbyChannel.send({
      type: 'broadcast',
      event: 'chat',
      payload: {
        id: Math.random().toString(36).substr(2, 9),
        user_id: this.userId,
        username: this.username,
        text: text,
        timestamp: Date.now(),
      },
    });
  }

  // 发起匹配请求
  async startSeeking(callback: MatchmakingCallback) {
    this.onMatchFound = callback;
    await this.updateStatus('seeking');
    
    // 广播一个寻求对手的消息
    this.lobbyChannel?.send({
      type: 'broadcast',
      event: 'match_request',
      payload: {
        requester_id: this.userId,
        requester_name: this.username,
      },
    });
  }

  // 处理收到的匹配请求
  private handleMatchRequest(payload: any) {
    // 如果我正在寻找对手，且对方不是我
    if (this.userId && payload.requester_id !== this.userId) {
      // 在实际应用中，这里可能会弹出一个确认框，或者自动接受
      // 这里我们演示：如果我也在寻找，我们就互相同意
      // ... 逻辑实现 ...
    }
  }

  private handleMatchAccept(payload: any) {
    if (payload.target_id === this.userId && this.onMatchFound) {
      this.onMatchFound({
        roomId: payload.room_id,
        opponent: payload.accepter,
        isHost: false, // 发起者通常是 Host，接受者是 Guest，这里看逻辑
      });
    }
  }

  async stop() {
    if (this.lobbyChannel) {
      await this.lobbyChannel.unsubscribe();
      this.lobbyChannel = null;
    }
  }
}

export const matchmaking = new MatchmakingService();
