/**
 * FriendsPage - 好友列表页面
 * 
 * [P0 Phase 4] 好友管理、好友对战、好友请求
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, UserPlus, Swords, MessageCircle, 
  Search, X, Check, Clock, Trash2, MoreVertical,
  Circle, Gamepad2, Moon
} from 'lucide-react';
import { Friend, FriendRequest, FriendBattleInvite, FriendStatus } from '../../types/social';
import { FriendService } from '../../services/FriendService';

interface FriendsPageProps {
  userId: string;
  username: string;
  onBack: () => void;
  onStartFriendBattle: (friendId: string, roomId: string) => void;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({ 
  userId, 
  username, 
  onBack,
  onStartFriendBattle 
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [invites, setInvites] = useState<FriendBattleInvite[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  useEffect(() => {
    const { friends: loadedFriends, requests: loadedRequests } = FriendService.init(userId);
    setFriends(loadedFriends);
    setRequests(loadedRequests);
    setInvites(FriendService.getPendingInvites());
  }, [userId]);

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await FriendService.searchUsers(searchQuery);
      // 过滤掉已是好友的用户
      const friendIds = friends.map(f => f.oduserId);
      setSearchResults(results.filter(r => !friendIds.includes(r.id)));
    } finally {
      setIsSearching(false);
    }
  };

  // 发送好友请求
  const handleSendRequest = (toUserId: string, toUsername: string) => {
    FriendService.sendFriendRequest(toUserId, toUsername);
    setSearchResults(prev => prev.filter(r => r.id !== toUserId));
  };

  // 接受好友请求
  const handleAcceptRequest = (requestId: string) => {
    const newFriend = FriendService.acceptRequest(requestId);
    if (newFriend) {
      setFriends(FriendService.getFriends());
      setRequests(FriendService.getIncomingRequests());
    }
  };

  // 拒绝好友请求
  const handleRejectRequest = (requestId: string) => {
    FriendService.rejectRequest(requestId);
    setRequests(FriendService.getIncomingRequests());
  };

  // 删除好友
  const handleRemoveFriend = (oduserId: string) => {
    if (confirm('确定要删除这位好友吗？')) {
      FriendService.removeFriend(oduserId);
      setFriends(FriendService.getFriends());
      setSelectedFriend(null);
    }
  };

  // 发送对战邀请
  const handleSendBattleInvite = (friend: Friend) => {
    const invite = FriendService.sendBattleInvite(friend.oduserId, friend.username, 0);
    alert(`已向 ${friend.username} 发送对战邀请！`);
  };

  // 接受对战邀请
  const handleAcceptBattleInvite = (inviteId: string) => {
    const invite = FriendService.acceptBattleInvite(inviteId);
    if (invite) {
      onStartFriendBattle(invite.fromUserId, invite.roomId);
    }
  };

  const getStatusIcon = (status: FriendStatus) => {
    switch (status) {
      case 'online': return <Circle size={10} className="fill-green-500 text-green-500" />;
      case 'in_game': return <Gamepad2 size={12} className="text-amber-500" />;
      case 'away': return <Moon size={10} className="text-yellow-500" />;
      default: return <Circle size={10} className="fill-slate-500 text-slate-500" />;
    }
  };

  const getStatusText = (status: FriendStatus) => {
    switch (status) {
      case 'online': return '在线';
      case 'in_game': return '游戏中';
      case 'away': return '离开';
      default: return '离线';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/30 to-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-300 hover:text-white">
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold">好友</h1>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users size={16} />
            <span>{friends.length}</span>
          </div>
        </div>
      </header>

      {/* 待处理邀请提醒 */}
      {invites.length > 0 && (
        <div className="px-4 py-3 max-w-2xl mx-auto">
          <div className="bg-amber-900/30 border border-amber-500/50 rounded-xl p-3">
            <p className="text-amber-400 text-sm font-bold mb-2">⚔️ 你有 {invites.length} 个对战邀请</p>
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between bg-black/20 rounded-lg p-2 mt-2">
                <span className="text-sm">{invite.fromUsername} 邀请你对战</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptBattleInvite(invite.id)}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-500"
                  >
                    接受
                  </button>
                  <button
                    onClick={() => FriendService.rejectBattleInvite(invite.id)}
                    className="px-3 py-1 bg-slate-700 text-white text-xs rounded-lg hover:bg-slate-600"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="px-4 py-4 max-w-2xl mx-auto">
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl">
          <TabButton
            active={activeTab === 'friends'}
            onClick={() => setActiveTab('friends')}
            icon={<Users size={16} />}
            label={`好友 (${friends.length})`}
          />
          <TabButton
            active={activeTab === 'requests'}
            onClick={() => setActiveTab('requests')}
            icon={<Clock size={16} />}
            label={`请求 (${requests.length})`}
            badge={requests.length > 0}
          />
          <TabButton
            active={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
            icon={<UserPlus size={16} />}
            label="添加"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {friends.length === 0 ? (
                <EmptyState 
                  icon={<Users size={48} className="text-slate-600" />}
                  title="还没有好友"
                  description="点击「添加」搜索并添加好友"
                />
              ) : (
                friends.map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onInviteBattle={() => handleSendBattleInvite(friend)}
                    onRemove={() => handleRemoveFriend(friend.oduserId)}
                    getStatusIcon={getStatusIcon}
                    getStatusText={getStatusText}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-2"
            >
              {requests.length === 0 ? (
                <EmptyState 
                  icon={<Clock size={48} className="text-slate-600" />}
                  title="没有好友请求"
                  description="当有人向你发送好友请求时会显示在这里"
                />
              ) : (
                requests.map(request => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onAccept={() => handleAcceptRequest(request.id)}
                    onReject={() => handleRejectRequest(request.id)}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Search Input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="输入用户名搜索..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isSearching ? '搜索中...' : '搜索'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">搜索结果</p>
                  {searchResults.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <Users size={20} className="text-slate-500" />
                          )}
                        </div>
                        <span className="font-medium">{user.username}</span>
                      </div>
                      <button
                        onClick={() => handleSendRequest(user.id, user.username)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition-colors"
                      >
                        <UserPlus size={14} className="inline mr-1" />
                        添加
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============ Sub-Components ============

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: boolean;
}> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${
      active 
        ? 'bg-purple-600 text-white shadow-lg' 
        : 'text-slate-400 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
    {badge && (
      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
    )}
  </button>
);

const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon}
    <h3 className="mt-4 text-lg font-bold text-slate-300">{title}</h3>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
  </div>
);

const FriendCard: React.FC<{
  friend: Friend;
  onInviteBattle: () => void;
  onRemove: () => void;
  getStatusIcon: (status: FriendStatus) => React.ReactNode;
  getStatusText: (status: FriendStatus) => string;
}> = ({ friend, onInviteBattle, onRemove, getStatusIcon, getStatusText }) => {
  const [showMenu, setShowMenu] = useState(false);
  const canInvite = friend.status === 'online';

  return (
    <div className="relative flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-purple-500/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden">
            {friend.avatar ? (
              <img src={friend.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users size={24} className="text-slate-500" />
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 bg-slate-900 rounded-full p-0.5">
            {getStatusIcon(friend.status)}
          </div>
        </div>
        <div>
          <p className="font-bold">{friend.username}</p>
          <p className="text-xs text-slate-500">{getStatusText(friend.status)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* 对战记录 */}
        {(friend.wins !== undefined || friend.losses !== undefined) && (
          <div className="text-xs text-slate-500 mr-2">
            <span className="text-green-400">{friend.wins || 0}胜</span>
            <span className="mx-1">/</span>
            <span className="text-red-400">{friend.losses || 0}负</span>
          </div>
        )}

        {/* 对战按钮 */}
        <button
          onClick={onInviteBattle}
          disabled={!canInvite}
          className={`p-2 rounded-lg transition-colors ${
            canInvite 
              ? 'bg-amber-600 hover:bg-amber-500 text-white' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title={canInvite ? '邀请对战' : '好友不在线'}
        >
          <Swords size={18} />
        </button>

        {/* 更多菜单 */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
          >
            <MoreVertical size={18} />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { onRemove(); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                >
                  <Trash2 size={14} />
                  删除好友
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const RequestCard: React.FC<{
  request: FriendRequest;
  onAccept: () => void;
  onReject: () => void;
}> = ({ request, onAccept, onReject }) => (
  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-purple-500/30">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
        {request.fromAvatar ? (
          <img src={request.fromAvatar} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          <UserPlus size={20} className="text-purple-400" />
        )}
      </div>
      <div>
        <p className="font-bold">{request.fromUsername}</p>
        <p className="text-xs text-slate-500">
          {request.message || '想加你为好友'}
        </p>
      </div>
    </div>
    <div className="flex gap-2">
      <button
        onClick={onAccept}
        className="p-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition-colors"
      >
        <Check size={18} />
      </button>
      <button
        onClick={onReject}
        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  </div>
);

export default FriendsPage;
