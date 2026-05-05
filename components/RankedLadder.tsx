import React, { useState, useMemo } from 'react';
import { ArrowLeft, Trophy, TrendingUp, Flame, Shield, Crown, Medal } from 'lucide-react';
import { Rank } from '../types/ui';
import { useUserStore } from '../stores/useUserStore';
import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '../stores/useUIStore';
import {
  RANK_THRESHOLDS,
  RANK_ORDER,
  getRankGradient,
  getNextRankThreshold,
  getCurrentRankThreshold,
} from '../services/rankSystem';

const RANK_ICONS: Record<Rank, string> = {
  Iron: '⬛',
  Silver: '⬜',
  Gold: '🥇',
  Platinum: '🔷',
  Diamond: '💎',
  Epic: '🔮',
  Master: '👑',
  Mythic: '🌟',
  Legend: '🏆',
};

const RANK_NAMES: Record<Rank, string> = {
  Iron: '黑铁',
  Silver: '白银',
  Gold: '黄金',
  Platinum: '铂金',
  Diamond: '钻石',
  Epic: '史诗',
  Master: '王者',
  Mythic: '神话',
  Legend: '传说',
};

interface RankedLadderProps {
  onBack: () => void;
}

export const RankedLadder: React.FC<RankedLadderProps> = ({ onBack }) => {
  const { userRank, rankScore, history, activeAddress } = useUserStore(
    useShallow(s => ({ userRank: s.userRank, rankScore: s.rankScore, history: s.history, activeAddress: s.activeAddress }))
  );
  const language = useUIStore(s => s.language);
  const [activeTab, setActiveTab] = useState<'rank' | 'leaderboard'>('rank');

  const currentRank = userRank || 'Iron';
  const score = rankScore || 0;
  const nextThreshold = getNextRankThreshold(currentRank);
  const currentThreshold = getCurrentRankThreshold(currentRank);
  const isMaxRank = currentRank === 'Legend';
  const progress = isMaxRank ? 100 : Math.min(100, ((score - currentThreshold) / (nextThreshold - currentThreshold)) * 100);

  const wins = history?.filter(r => r.result === 'WIN').length || 0;
  const losses = history?.filter(r => r.result === 'LOSS').length || 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Mock leaderboard data (Top 20 + player)
  const leaderboard = useMemo(() => {
    const AI_NAMES = [
      '大法师梅林', '冰霜女巫', '雷霆领主', '暗影刺客', '元素使徒',
      '龙骑士', '时间术士', '圣光祭司', '亡灵君主', '风暴召唤者',
      '炼金大师', '幻影剑圣', '星辰守望者', '深渊行者', '火焰领主',
      '岩石守卫', '毒雾术士', '灵魂猎手', '幻术宗师', '天空行者',
      '黑暗贤者', '月光射手', '狂暴战士', '命运之子', '虚空行者',
    ];
    const entries = AI_NAMES.map((name, i) => ({
      rank: i + 1,
      name,
      score: Math.max(0, 2800 - i * 120 + Math.floor(Math.random() * 60)),
      rankTier: RANK_ORDER[Math.max(0, Math.min(8, 8 - Math.floor(i / 3)))] as Rank,
      isPlayer: false,
    }));
    // Insert player at their position
    const playerIdx = entries.findIndex(e => e.score <= (score || 0));
    const playerName = localStorage.getItem('wizard_display_name') || (activeAddress ? `Wizard_${activeAddress.slice(0, 6)}` : '你');
    const playerEntry = { rank: 0, name: playerName, score: score || 0, rankTier: (currentRank as Rank), isPlayer: true };
    if (playerIdx >= 0) {
      entries.splice(playerIdx, 0, playerEntry);
    } else {
      entries.push(playerEntry);
    }
    return entries.slice(0, 25).map((e, i) => ({ ...e, rank: i + 1 }));
  }, [score, currentRank, activeAddress]);

  return (
    <div className="min-h-full bg-slate-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="text-purple-400" /> 排位赛
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('rank')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'rank'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
              : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <TrendingUp size={14} className="inline mr-1.5" />
          我的段位
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30'
              : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Crown size={14} className="inline mr-1.5" />
          排行榜
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'leaderboard' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Crown size={20} className="text-amber-400" />
            <h3 className="text-lg font-bold">全球排行榜 Top 25</h3>
          </div>
          <div className="space-y-1.5">
            {leaderboard.map((entry) => (
              <div
                key={entry.name}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  entry.isPlayer
                    ? 'bg-purple-600/30 border-2 border-purple-500/50 shadow-lg shadow-purple-500/20'
                    : entry.rank <= 3
                      ? 'bg-gradient-to-r from-amber-900/20 to-slate-900/60 border border-amber-500/20'
                      : 'bg-slate-800/60 border border-white/5'
                }`}
              >
                {/* Rank Number */}
                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm ${
                  entry.rank === 1 ? 'bg-yellow-500 text-black' :
                  entry.rank === 2 ? 'bg-slate-300 text-black' :
                  entry.rank === 3 ? 'bg-orange-600 text-white' :
                  'bg-slate-700 text-gray-400'
                }`}>
                  {entry.rank <= 3 ? <Medal size={16} /> : entry.rank}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${entry.isPlayer ? 'text-purple-300' : 'text-white'}`}>
                    {entry.name} {entry.isPlayer && <span className="text-xs text-purple-400">(你)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{RANK_NAMES[entry.rankTier]} {RANK_ICONS[entry.rankTier]}</p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className={`font-mono font-bold text-sm ${entry.isPlayer ? 'text-purple-300' : 'text-amber-400'}`}>
                    {entry.score}
                  </p>
                  <p className="text-[10px] text-gray-500">积分</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'rank' && (
      <>
      {/* Current Rank Card */}
      <div className={`relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-br ${getRankGradient(currentRank)} p-6`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="text-6xl">{RANK_ICONS[currentRank]}</div>
          <div className="flex-1">
            <p className="text-sm opacity-80 font-bold uppercase tracking-wider">当前段位</p>
            <h2 className="text-3xl font-black mt-1">{RANK_NAMES[currentRank]}</h2>
            <p className="text-sm mt-1 opacity-80">{score} 分</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm">
              <Flame size={14} className="text-orange-300" />
              <span>{wins}胜</span>
              <Shield size={14} className="text-slate-300" />
              <span>{losses}负</span>
            </div>
            <p className="text-xs opacity-70 mt-1">胜率 {winRate}%</p>
          </div>
        </div>

        {/* Progress bar */}
        {!isMaxRank && (
          <div className="relative z-10 mt-4">
            <div className="flex justify-between text-xs opacity-80 mb-1">
              <span>{currentThreshold} 分</span>
              <span>{nextThreshold} 分</span>
            </div>
            <div className="h-3 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs mt-1 opacity-70">
              距离 {RANK_NAMES[RANK_ORDER[RANK_ORDER.indexOf(currentRank) + 1] || 'Legend']} 还需 {nextThreshold - score} 分
            </p>
          </div>
        )}
        {isMaxRank && (
          <div className="relative z-10 mt-4 text-center">
            <p className="text-lg font-bold animate-pulse">已达最高段位！</p>
          </div>
        )}
      </div>

      {/* Rank Tier List */}
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Trophy size={18} className="text-yellow-400" /> 段位一览
      </h3>
      <div className="space-y-2">
        {RANK_ORDER.slice().reverse().map((rank) => {
          const isCurrentRank = rank === currentRank;
          const isAchieved = RANK_ORDER.indexOf(rank) <= RANK_ORDER.indexOf(currentRank);

          return (
            <div
              key={rank}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                isCurrentRank
                  ? `bg-gradient-to-r ${getRankGradient(rank)} shadow-lg ring-2 ring-white/30`
                  : isAchieved
                    ? 'bg-slate-800/80 border border-white/10'
                    : 'bg-slate-900/40 border border-white/5 opacity-50'
              }`}
            >
              <span className="text-2xl w-10 text-center">{RANK_ICONS[rank]}</span>
              <div className="flex-1">
                <p className={`font-bold ${isCurrentRank ? 'text-white' : isAchieved ? 'text-gray-300' : 'text-gray-500'}`}>
                  {RANK_NAMES[rank]}
                </p>
                <p className="text-xs text-gray-400">{RANK_THRESHOLDS[rank]}+ 分</p>
              </div>
              {isCurrentRank && (
                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">当前位置</span>
              )}
              {isAchieved && !isCurrentRank && (
                <span className="text-xs text-green-400">已达成</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Scoring Rules */}
      <div className="mt-8 bg-slate-800/50 rounded-xl p-4 border border-white/5">
        <h4 className="font-bold text-sm mb-3 text-gray-300">积分规则</h4>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>胜利</span>
            <span className="text-green-400 font-bold">+25 分 (+连战奖励)</span>
          </div>
          <div className="flex justify-between">
            <span>失败</span>
            <span className="text-red-400 font-bold">-10 ~ -15 分 (低段位保护)</span>
          </div>
          <div className="flex justify-between">
            <span>平局</span>
            <span className="text-yellow-400 font-bold">+5 分</span>
          </div>
          <div className="flex justify-between">
            <span>连胜奖励</span>
            <span className="text-purple-400 font-bold">每次连胜 +5（上限 +30）</span>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default RankedLadder;
