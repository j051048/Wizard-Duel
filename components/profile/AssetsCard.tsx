/**
 * AssetsCard - 资产卡片（钻石和胜率）
 */

import React from 'react';
import { Gem, TrendingUp, Wallet } from 'lucide-react';

interface AssetsCardProps {
  balance: number;
  winRate: number;
  recentWinRate: number;
  onToggleDonatePanel: () => void;
}

export const AssetsCard: React.FC<AssetsCardProps> = ({
  balance,
  winRate,
  recentWinRate,
  onToggleDonatePanel
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 钻石/法力 */}
      <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Gem size={16} className="text-purple-400" />
          <span className="text-xs text-purple-300 font-bold uppercase">钻石</span>
        </div>
        <div className="text-2xl font-mono font-black text-white">{balance.toLocaleString()}</div>
        <button
          onClick={onToggleDonatePanel}
          className="mt-3 w-full py-2 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-xs font-bold text-purple-300 transition-all flex items-center justify-center gap-1.5"
        >
          <Wallet size={12} />
          捐赠获取积分
        </button>
      </div>

      {/* 胜率 */}
      <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className="text-amber-400" />
          <span className="text-xs text-amber-300 font-bold uppercase">总胜率</span>
        </div>
        <div className="text-2xl font-mono font-black text-white">{winRate}%</div>
        <div className="text-[10px] text-gray-500 mt-1">
          近10局: <span className={recentWinRate >= 50 ? 'text-green-400' : 'text-red-400'}>{recentWinRate}%</span>
        </div>
      </div>
    </div>
  );
};
