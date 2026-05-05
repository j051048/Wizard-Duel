/**
 * BattleSummary - 战斗结束摘要
 * 显示本局关键数据统计
 */

import React from 'react';
import { Trophy, Swords, Flame, Snowflake, Zap, Mountain, Leaf, RotateCcw, Home } from 'lucide-react';

export interface BattleStats {
  totalDamageDealt: number;
  totalDamageReceived: number;
  highestSingleHit: number;
  cardsPlayed: number;
  burnTicks: number;
  freezeCount: number;
  chargeCombo: number;
  armorGained: number;
  turnsPlayed: number;
}

interface BattleSummaryProps {
  result: 'WIN' | 'LOSS' | 'DRAW';
  stats: BattleStats;
  onClose: () => void;
  onRematch?: () => void;
}

const BattleSummary: React.FC<BattleSummaryProps> = ({ result, stats, onClose, onRematch }) => {
  const isWin = result === 'WIN';

  const statItems = [
    { icon: <Swords size={16} />, label: '总伤害', value: stats.totalDamageDealt, color: 'text-red-400' },
    { icon: <Flame size={16} />, label: '最高单次', value: stats.highestSingleHit, color: 'text-orange-400' },
    { icon: <Zap size={16} />, label: '出牌数', value: stats.cardsPlayed, color: 'text-yellow-400' },
    { icon: <Flame size={16} />, label: '灼烧触发', value: stats.burnTicks, color: 'text-red-300' },
    { icon: <Snowflake size={16} />, label: '冻结次数', value: stats.freezeCount, color: 'text-cyan-400' },
    { icon: <Mountain size={16} />, label: '获得护甲', value: stats.armorGained, color: 'text-stone-400' },
    { icon: <Zap size={16} />, label: '最高连击', value: stats.chargeCombo, color: 'text-purple-400' },
    { icon: <RotateCcw size={16} />, label: '回合数', value: stats.turnsPlayed, color: 'text-gray-400' },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* Result Banner */}
        <div className={`relative p-6 text-center ${isWin ? 'bg-gradient-to-r from-amber-600/30 to-yellow-600/30' : 'bg-gradient-to-r from-red-600/30 to-slate-600/30'}`}>
          <div className="text-5xl mb-2">{isWin ? '🏆' : '💀'}</div>
          <h2 className={`text-3xl font-black ${isWin ? 'text-amber-400' : 'text-red-400'}`}>
            {isWin ? '胜利！' : '战败'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {isWin ? '你击败了对手！' : '再接再厉，下次一定！'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">战斗统计</h3>
          <div className="grid grid-cols-2 gap-2">
            {statItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/50 border border-white/5"
              >
                <span className={item.color}>{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500">{item.label}</p>
                  <p className={`font-mono font-bold text-sm ${item.color}`}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 flex gap-3">
          {onRematch && (
            <button
              onClick={onRematch}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              再来一局
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl font-bold text-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={16} />
            返回大厅
          </button>
        </div>
      </div>
    </div>
  );
};

export default BattleSummary;
