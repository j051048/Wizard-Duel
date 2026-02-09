/**
 * UserProfilePage - 用户个人信息页面 (Refactored)
 * 
 * 重构为thin wrapper，使用分解的子组件
 */

import React, { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BattleRecord, Rank } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { ProfileHeader } from './profile/ProfileHeader';
import { AssetsCard } from './profile/AssetsCard';
import { StatsSection } from './profile/StatsSection';
import { RankProgress } from './profile/RankProgress';
import { DonatePanel } from './profile/DonatePanel';

interface UserProfilePageProps {
  onBack: () => void;
  balance: number;
  userRank: Rank;
  rankScore: number;
  history: BattleRecord[];
  activeAddress: string | null;
  isGuest: boolean;
  onUpdateBalance: (newBalance: number) => void;
  onUpdateName: (name: string) => void;
  displayName: string;
}

const RANK_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  Iron:     { text: 'text-gray-400',   bg: 'bg-gray-500/20',   border: 'border-gray-500/30',   glow: '' },
  Silver:   { text: 'text-slate-300',  bg: 'bg-slate-300/20',  border: 'border-slate-300/30',  glow: '' },
  Gold:     { text: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30', glow: 'shadow-[0_0_15px_rgba(250,204,21,0.15)]' },
  Platinum: { text: 'text-cyan-300',   bg: 'bg-cyan-300/20',   border: 'border-cyan-300/30',   glow: 'shadow-[0_0_15px_rgba(103,232,249,0.2)]' },
  Diamond:  { text: 'text-blue-400',   bg: 'bg-blue-400/20',   border: 'border-blue-400/30',   glow: 'shadow-[0_0_20px_rgba(96,165,250,0.25)]' },
  Epic:     { text: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400/30', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.3)]' },
  Master:   { text: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30', glow: 'shadow-[0_0_25px_rgba(251,146,60,0.35)]' },
  Mythic:   { text: 'text-rose-400',   bg: 'bg-rose-400/20',   border: 'border-rose-400/30',   glow: 'shadow-[0_0_25px_rgba(251,113,133,0.4)]' },
  Legend:   { text: 'text-amber-300',  bg: 'bg-amber-300/20',  border: 'border-amber-300/30',  glow: 'shadow-[0_0_30px_rgba(252,211,77,0.5)]' },
};

const UserProfilePage: React.FC<UserProfilePageProps> = ({
  onBack,
  balance,
  userRank,
  rankScore,
  history,
  activeAddress,
  isGuest,
  onUpdateBalance,
  onUpdateName,
  displayName,
}) => {
  const isMobile = useIsMobile();
  const [showDonatePanel, setShowDonatePanel] = useState(false);

  const stats = useMemo(() => {
    const wins = history.filter(h => h.result === 'WIN').length;
    const total = history.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    
    const recent = history.slice(0, 10);
    const recentWins = recent.filter(h => h.result === 'WIN').length;
    const recentWinRate = recent.length > 0 ? Math.round((recentWins / recent.length) * 100) : 0;

    return { winRate, recentWinRate };
  }, [history]);

  const rankStyle = RANK_COLORS[userRank] || RANK_COLORS.Iron;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/50 to-slate-950 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-bold">返回</span>
          </button>
          <h1 className="text-lg font-wizard font-bold text-white">个人中心</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className={`max-w-2xl mx-auto ${isMobile ? 'px-4 pb-24' : 'px-6 pb-12'} pt-6 space-y-6`}>
        
        <ProfileHeader
          displayName={displayName}
          userRank={userRank}
          rankScore={rankScore}
          activeAddress={activeAddress}
          isGuest={isGuest}
          rankStyle={rankStyle}
          onUpdateName={onUpdateName}
          isMobile={isMobile}
        />

        <AssetsCard
          balance={balance}
          winRate={stats.winRate}
          recentWinRate={stats.recentWinRate}
          onToggleDonatePanel={() => setShowDonatePanel(!showDonatePanel)}
        />

        {showDonatePanel && (
          <DonatePanel
            onClose={() => setShowDonatePanel(false)}
            balance={balance}
            activeAddress={activeAddress}
            isGuest={isGuest}
            onUpdateBalance={onUpdateBalance}
          />
        )}

        <StatsSection history={history} />

        <RankProgress
          userRank={userRank}
          rankScore={rankScore}
          rankStyle={rankStyle}
        />

      </div>
    </div>
  );
};

export default UserProfilePage;
