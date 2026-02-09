/**
 * RankProgress - 天梯段位进度组件
 */

import React from 'react';
import { Crown, Target } from 'lucide-react';
import { Rank } from '../../types';
import { useUIStore } from '../../stores/useUIStore';
import { TRANSLATIONS } from '../../translations';
import { getNextRankThreshold, getRankGradient } from '../../services/rankSystem';

interface RankProgressProps {
  userRank: Rank;
  rankScore: number;
  rankStyle: { text: string; bg: string; border: string; glow: string };
}


export const RankProgress: React.FC<RankProgressProps> = ({ userRank, rankScore, rankStyle }) => {
  const { language } = useUIStore();
  const t = (key: string) => TRANSLATIONS[language][key] || key;
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
            <span className={`font-bold ${rankStyle.text}`}>{t(userRank)}</span>
            <span className="text-xs text-gray-500 font-mono">{rankScore} / {getNextRankThreshold(userRank)} {t('PTS')}</span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${getRankGradient(userRank)}`}
              style={{ width: `${Math.min(100, (rankScore / getNextRankThreshold(userRank)) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-600 mt-1">
            {t('DISTANCE_TO_NEXT_RANK')} {Math.max(0, getNextRankThreshold(userRank) - rankScore)} {t('PTS')}
          </div>
        </div>
      </div>
    </div>
  );
};
