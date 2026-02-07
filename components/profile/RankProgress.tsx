/**
 * RankProgress - 天梯段位进度组件
 */

import React from 'react';
import { Crown, Target } from 'lucide-react';
import { Rank } from '../../types';

interface RankProgressProps {
  userRank: Rank;
  rankScore: number;
  rankStyle: { text: string; bg: string; border: string; glow: string };
}

function getNextRankThreshold(rank: string): number {
  const thresholds: Record<string, number> = {
    Iron: 300, Bronze: 600, Silver: 1000, Gold: 1500, Diamond: 2500, Legend: 5000
  };
  return thresholds[rank] || 1000;
}

function getRankGradient(rank: string): string {
  const gradients: Record<string, string> = {
    Iron: 'from-gray-500 to-gray-400',
    Bronze: 'from-amber-700 to-amber-500',
    Silver: 'from-slate-400 to-slate-300',
    Gold: 'from-yellow-500 to-amber-400',
    Diamond: 'from-cyan-500 to-blue-400',
    Legend: 'from-amber-400 to-yellow-300',
  };
  return gradients[rank] || 'from-gray-500 to-gray-400';
}

export const RankProgress: React.FC<RankProgressProps> = ({ userRank, rankScore, rankStyle }) => {
  return (
    <div className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Target size={18} className="text-cyan-400" />
        天梯进度
      </h3>

      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-xl ${rankStyle.bg} ${rankStyle.border} border-2 flex items-center justify-center ${rankStyle.glow}`}>
          <Crown size={28} className={rankStyle.text} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className={`font-bold ${rankStyle.text}`}>{userRank}</span>
            <span className="text-xs text-gray-500 font-mono">{rankScore} / {getNextRankThreshold(userRank)} PTS</span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${getRankGradient(userRank)}`}
              style={{ width: `${Math.min(100, (rankScore / getNextRankThreshold(userRank)) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-600 mt-1">
            距离下一段位还需 {Math.max(0, getNextRankThreshold(userRank) - rankScore)} 分
          </div>
        </div>
      </div>
    </div>
  );
};
