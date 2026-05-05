/**
 * FriendService - 好友系统服务
 * 
 * [P0 Phase 4] 好友添加、删除、在线状态、好友对战
 */

import { 
  Friend, 
  FriendRequest, 
  FriendBattleInvite,
  FriendStatus,
  FriendRequestStatus 
} from '../types/social';

const STORAGE_KEY_FRIENDS = 'wizard_duel_friends';
const STORAGE_KEY_REQUESTS = 'wizard_duel_friend_requests';
const STORAGE_KEY_INVITES = 'wizard_duel_battle_invites';

class FriendServiceClass {
  private friends: Friend[] = [];
  private requests: FriendRequest[] = [];
  private invites: FriendBattleInvite[] = [];
  private currentUserId: string | null = null;

  // ============ 初始化 ============

  init(userId: string): { friends: Friend[]; requests: FriendRequest[] } {
    this.currentUserId = userId;
    this.loadFriends();
    this.loadRequests();
    this.loadInvites();
    return { friends: this.friends, requests: this.getIncomingRequests() };
  }

  private loadFriends(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FRIENDS);
      if (saved) {
        this.friends = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load friends:', e);
      this.friends = [];
    }
  }

  private saveFriends(): void {
    localStorage.setItem(STORAGE_KEY_FRIENDS, JSON.stringify(this.friends));
  }

  private loadRequests(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REQUESTS);
      if (saved) {
        this.requests = JSON.parse(saved);
      }
    } catch (e) {
      this.requests = [];
    }
  }

  private saveRequests(): void {
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(this.requests));
  }

  private loadInvites(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVITES);
      if (saved) {
        this.invites = JSON.parse(saved);
        // 清理过期邀请
        const now = new Date().toISOString();
        this.invites = this.invites.filter(inv => inv.expiresAt > now || inv.status !== 'pending');
      }
    } catch (e) {
      this.invites = [];
    }
  }

  private saveInvites(): void {
    localStorage.setItem(STORAGE_KEY_INVITES, JSON.stringify(this.invites));
  }

  // ============ 好友列表 ============

  getFriends(): Friend[] {
    return [...this.friends].sort((a, b) => {
      // 在线优先
      const statusOrder: Record<FriendStatus, number> = {
        'online': 0,
        'in_game': 1,
        'away': 2,
        'offline': 3
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }

  getFriendById(oduserId: string): Friend | null {
    return this.friends.find(f => f.oduserId === oduserId) || null;
  }

  getOnlineFriends(): Friend[] {
    return this.friends.filter(f => f.status === 'online' || f.status === 'in_game');
  }

  // ============ 好友请求 ============

  sendFriendRequest(toUserId: string, toUsername: string, message?: string): FriendRequest {
    const request: FriendRequest = {
      id: this.generateId(),
      fromUserId: this.currentUserId!,
      fromUsername: 'Me', // 实际应用中从用户store获取
      toUserId,
      status: 'pending',
      message,
      createdAt: new Date().toISOString()
    };

    this.requests.push(request);
    this.saveRequests();
    
    // Planned: Supabase Realtime delivery for real-time friend requests
    
    return request;
  }

  getIncomingRequests(): FriendRequest[] {
    return this.requests.filter(
      r => r.toUserId === this.currentUserId && r.status === 'pending'
    );
  }

  getOutgoingRequests(): FriendRequest[] {
    return this.requests.filter(
      r => r.fromUserId === this.currentUserId && r.status === 'pending'
    );
  }

  acceptRequest(requestId: string): Friend | null {
    const request = this.requests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'accepted';
    request.respondedAt = new Date().toISOString();
    this.saveRequests();

    // 添加为好友
    const newFriend: Friend = {
      id: this.generateId(),
      oduserId: request.fromUserId,
      username: request.fromUsername,
      avatar: request.fromAvatar,
      status: 'offline',
      addedAt: new Date().toISOString()
    };

    this.friends.push(newFriend);
    this.saveFriends();

    return newFriend;
  }

  rejectRequest(requestId: string): boolean {
    const request = this.requests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return false;

    request.status = 'rejected';
    request.respondedAt = new Date().toISOString();
    this.saveRequests();

    return true;
  }

  // ============ 好友管理 ============

  removeFriend(oduserId: string): boolean {
    const index = this.friends.findIndex(f => f.oduserId === oduserId);
    if (index === -1) return false;

    this.friends.splice(index, 1);
    this.saveFriends();
    return true;
  }

  updateFriendNote(oduserId: string, note: string): boolean {
    const friend = this.friends.find(f => f.oduserId === oduserId);
    if (!friend) return false;

    friend.note = note;
    this.saveFriends();
    return true;
  }

  updateFriendStatus(oduserId: string, status: FriendStatus): void {
    const friend = this.friends.find(f => f.oduserId === oduserId);
    if (friend) {
      friend.status = status;
      if (status !== 'offline') {
        friend.lastOnline = new Date().toISOString();
      }
      this.saveFriends();
    }
  }

  // ============ 好友对战 ============

  sendBattleInvite(toUserId: string, toUsername: string, bet: number = 0): FriendBattleInvite {
    const roomId = `friend_${this.currentUserId}_${toUserId}_${Date.now()}`;
    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 60 * 1000); // 5分钟过期

    const invite: FriendBattleInvite = {
      id: this.generateId(),
      fromUserId: this.currentUserId!,
      fromUsername: 'Me',
      toUserId,
      roomId,
      bet,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: 'pending'
    };

    this.invites.push(invite);
    this.saveInvites();

    // Planned: Supabase Realtime delivery for real-time friend requests

    return invite;
  }

  getPendingInvites(): FriendBattleInvite[] {
    const now = new Date().toISOString();
    return this.invites.filter(
      inv => inv.toUserId === this.currentUserId && 
             inv.status === 'pending' && 
             inv.expiresAt > now
    );
  }

  acceptBattleInvite(inviteId: string): FriendBattleInvite | null {
    const invite = this.invites.find(i => i.id === inviteId);
    if (!invite || invite.status !== 'pending') return null;

    const now = new Date().toISOString();
    if (invite.expiresAt < now) {
      invite.status = 'expired';
      this.saveInvites();
      return null;
    }

    invite.status = 'accepted';
    this.saveInvites();

    return invite;
  }

  rejectBattleInvite(inviteId: string): boolean {
    const invite = this.invites.find(i => i.id === inviteId);
    if (!invite || invite.status !== 'pending') return false;

    invite.status = 'rejected';
    this.saveInvites();
    return true;
  }

  // ============ 对战记录 ============

  recordBattleResult(opponentId: string, won: boolean): void {
    const friend = this.friends.find(f => f.oduserId === opponentId);
    if (friend) {
      friend.wins = (friend.wins || 0) + (won ? 1 : 0);
      friend.losses = (friend.losses || 0) + (won ? 0 : 1);
      this.saveFriends();
    }
  }

  // ============ 工具方法 ============

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 搜索好友 (模拟，实际应调用后端API)
  async searchUsers(query: string): Promise<{ id: string; username: string; avatar?: string }[]> {
    // Stub: Supabase search API integration pending
    if (!query.trim()) return [];
    
    return [
      { id: 'user_mock_1', username: `Player_${query}`, avatar: '/avatars/default.webp' },
      { id: 'user_mock_2', username: `${query}_Wizard`, avatar: '/avatars/default.webp' },
    ];
  }
}

export const FriendService = new FriendServiceClass();
