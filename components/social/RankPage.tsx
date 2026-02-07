/**
 * RankPage - 排位赛季页面
 * 
 * [P0 Phase 4] 段位展示、排行榜、赛季奖励
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Trophy, Medal, Crown, ChevronUp, ChevronDown,
  Gift, Clock, TrendingUp, Swords, Star
} from 'lucide-react';
import { 
  RankInfo, 
  PlayerSeasonData, 
  SeasonInfo,
  RANK_TIERS,
  RANK_POINTS_CONFIG 
} from '../../types/social';
import { RankService } from '../../services/RankService';

interface RankPageProps {
  userId: string;
  onBack: () => void;
  onStartRankedMatch: () => void;
}

export const RankPage: React.FC<RankPageProps> = ({ userId, onBack, onStartRankedMatch }) => {
  const [playerData, setPlayerData] = useState<PlayerSeasonData | null>(null);
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'rank' | 'leaderboard' | 'rewards'>('rank');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = RankService.init(userId);
    setPlayerData(data);
    setSeason(RankService.getCurrentSeason());
    
    // 加载排行榜
    RankService.getLeaderboard(50).then(lb => {
      setLeaderboard(lb);
      setIsLoading(false);
    });
  }, [userId]);

  if (isLoading || !playerData || !season) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const rankDisplay = RankService.getRankDisplay(playerData.currentRank);
  const progress = RankService.getProgressToNextDivision();
  const seasonRewards = RankService.getSeasonRewards();

  const getDaysRemaining = () => {
    const end = new Date(season.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-300 hover:text-white">
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold">{season.name}</h1>
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <Clock size={14} />
            <span>{getDaysRemaining()}天</span>
          </div>
        </div>
      </header>

      {/* Rank Card */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 rounded-3xl p-6 border border-purple-500/30 overflow-hidden"
        >
          {/* Background Decoration */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${rankDisplay.color}66, transparent 70%)`
            }}
          />

          <div className="relative z-10">
            {/* Rank Display */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                className="text-6xl mb-2"
              >
                {rankDisplay.icon}
              </motion.div>
              <h2 
                className="text-2xl font-bold"
                style={{ color: rankDisplay.color }}
              >
                {rankDisplay.name}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                总积分: {playerData.currentRank.totalPoints}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>段位进度</span>
                <span>{playerData.currentRank.points} / {RANK_POINTS_CONFIG.divisionPoints}</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: rankDisplay.color }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatBox 
                icon={<Trophy size={16} className="text-green-400" />}
                label="胜场"
                value={playerData.wins}
              />
              <StatBox 
                icon={<Swords size={16} className="text-slate-400" />}
                label="总场次"
                value={playerData.wins + playerData.losses}
              />
              <StatBox 
                icon={<TrendingUp size={16} className="text-amber-400" />}
                label="连胜"
                value={playerData.winStreak}
                highlight={playerData.winStreak >= 3}
              />
            </div>

            {/* Start Ranked Button */}
            <button
              onClick={onStartRankedMatch}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold text-lg shadow-lg hover:shadow-purple-500/30 transition-all"
            >
              <Swords size={20} className="inline mr-2" />
              开始排位赛
            </button>
          </div>
        </motion.div>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 max-w-2xl mx-auto">
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl">
          <TabButton
            active={activeTab === 'rank'}
            onClick={() => setActiveTab('rank')}
            icon={<Medal size={16} />}
            label="段位"
          />
          <TabButton
            active={activeTab === 'leaderboard'}
            onClick={() => setActiveTab('leaderboard')}
            icon={<Crown size={16} />}
            label="排行榜"
          />
          <TabButton
            active={activeTab === 'rewards'}
            onClick={() => setActiveTab('rewards')}
            icon={<Gift size={16} />}
            label="赛季奖励"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'rank' && (
            <motion.div
              key="rank"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              <h3 className="font-bold text-lg mb-4">段位系统</h3>
              {RANK_TIERS.map((tier, index) => {
                const isCurrentTier = tier.tier === playerData.currentRank.tier;
                const isUnlocked = playerData.currentRank.totalPoints >= tier.minPoints;
                
                return (
                  <div
                    key={tier.tier}
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                      isCurrentTier 
                        ? 'bg-purple-900/30 border-purple-500/50 shadow-lg' 
                        : isUnlocked
                          ? 'bg-slate-900/50 border-slate-700/50'
                          : 'bg-slate-900/20 border-slate-800/30 opacity-50'
                    }`}
                  >
                    <div className="text-3xl">{tier.icon}</div>
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: isUnlocked ? tier.color : undefined }}>
                        {getTierNameCN(tier.tier)}
                      </p>
                      <p className="text-xs text-slate-500">{tier.minPoints}+ 积分</p>
                    </div>
                    {isCurrentTier && (
                      <div className="px-3 py-1 bg-purple-500 rounded-full text-xs font-bold">
                        当前
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-2"
            >
              <h3 className="font-bold text-lg mb-4">全服排行榜</h3>
              {leaderboard.map((entry, index) => {
                const entryRankDisplay = RankService.getRankDisplay(entry.rankInfo);
                const isTop3 = index < 3;
                
                return (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      isTop3 
                        ? 'bg-gradient-to-r from-amber-900/30 to-slate-900/50 border border-amber-500/30' 
                        : 'bg-slate-900/50 border border-slate-700/30'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-amber-500 text-black' :
                      index === 1 ? 'bg-slate-400 text-black' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {entry.rank}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{entry.username}</p>
                      <p className="text-xs" style={{ color: entryRankDisplay.color }}>
                        {entryRankDisplay.icon} {entryRankDisplay.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold">{entry.rankInfo.totalPoints}</p>
                      <p className="text-xs text-slate-500">积分</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'rewards' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <h3 className="font-bold text-lg mb-4">赛季结算奖励</h3>
              <p className="text-sm text-slate-400 mb-4">
                赛季结束时，根据你达到的最高段位发放奖励
              </p>
              
              {seasonRewards.map(({ tier, rewards, unlocked }) => {
                const tierInfo = RANK_TIERS.find(t => t.tier === tier)!;
                
                return (
                  <div
                    key={tier}
                    className={`p-4 rounded-xl border ${
                      unlocked 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : 'bg-slate-900/30 border-slate-700/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{tierInfo.icon}</span>
                      <span className="font-bold" style={{ color: tierInfo.color }}>
                        {getTierNameCN(tier)}
                      </span>
                      {unlocked && (
                        <span className="ml-auto px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                          ✓ 已达成
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <RewardBadge icon="💰" label={`${rewards.gold} 金币`} />
                      <RewardBadge icon="📦" label={`${rewards.packs} 卡包`} />
                      {rewards.cardback && <RewardBadge icon="🎴" label="限定卡背" />}
                      {rewards.avatar && <RewardBadge icon="👤" label="限定头像" />}
                      {rewards.title && <RewardBadge icon="📛" label={`称号: ${rewards.title}`} />}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============ Helper Functions ============

const getTierNameCN = (tier: string): string => {
  const names: Record<string, string> = {
    'Bronze': '青铜',
    'Silver': '白银',
    'Gold': '黄金',
    'Platinum': '铂金',
    'Diamond': '钻石',
    'Master': '大师',
    'Grandmaster': '宗师'
  };
  return names[tier] || tier;
};

// ============ Sub-Components ============

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${
      active 
        ? 'bg-purple-600 text-white shadow-lg' 
        : 'text-slate-400 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const StatBox: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <div className={`p-3 rounded-xl text-center ${
    highlight ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-slate-800/50'
  }`}>
    <div className="flex items-center justify-center gap-1 mb-1">
      {icon}
    </div>
    <p className={`text-xl font-bold ${highlight ? 'text-amber-400' : ''}`}>{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);

const RewardBadge: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-lg text-xs">
    <span>{icon}</span>
    <span>{label}</span>
  </div>
);

export default RankPage;
