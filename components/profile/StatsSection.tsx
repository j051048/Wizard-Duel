/**
 * StatsSection - 战绩统计区域
 */

import React from 'react';
import { Trophy, Swords, X, Gem } from 'lucide-react';
import { BattleRecord } from '../../types';

interface StatBlockProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

const StatBlock: React.FC<StatBlockProps> = ({ label, value, icon, color = 'text-white' }) => (
  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
    <div className="flex justify-center mb-1.5">{icon}</div>
    <div className={`text-lg font-mono font-black ${color}`}>{value}</div>
    <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
  </div>
);

interface StatsSectionProps {
  history: BattleRecord[];
}

export const StatsSection: React.FC<StatsSectionProps> = ({ history }) => {
  const wins = history.filter(h => h.result === 'WIN').length;
  const losses = history.filter(h => h.result === 'LOSS').length;
  const total = history.length;
  const totalEarnings = history.reduce((sum, h) => sum + (h.amount || 0), 0);
  const recent = history.slice(0, 10);

  return (
    <div className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Trophy size={18} className="text-amber-400" />
        战绩统计
      </h3>

      {/* 统计网格 */}
      <div className="grid grid-cols-4 gap-3">
        <StatBlock label="总场次" value={total} icon={<Swords size={14} className="text-gray-400" />} />
        <StatBlock label="胜利" value={wins} icon={<Trophy size={14} className="text-green-400" />} color="text-green-400" />
        <StatBlock label="失败" value={losses} icon={<X size={14} className="text-red-400" />} color="text-red-400" />
        <StatBlock label="总收益" value={totalEarnings > 0 ? `+${totalEarnings}` : String(totalEarnings)} icon={<Gem size={14} className="text-purple-400" />} color={totalEarnings >= 0 ? 'text-green-400' : 'text-red-400'} />
      </div>

      {/* 胜率进度条 */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">胜率分布</span>
          <span className="text-gray-400">{wins}W - {losses}L</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
          {total > 0 && (
            <>
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${(wins / total) * 100}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
                style={{ width: `${(losses / total) * 100}%` }}
              />
            </>
          )}
        </div>
      </div>

      {/* 最近战绩 */}
      <div className="space-y-2">
        <span className="text-xs text-gray-500">最近对战</span>
        <div className="flex gap-1.5 flex-wrap">
          {recent.length > 0 ? (
            recent.map((record, i) => (
              <div
                key={record.id || i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border transition-all ${
                  record.result === 'WIN'
                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                    : record.result === 'LOSS'
                    ? 'bg-red-500/20 border-red-500/30 text-red-400'
                    : 'bg-gray-500/20 border-gray-500/30 text-gray-400'
                }`}
                title={`${record.result} | ${record.amount > 0 ? '+' : ''}${record.amount}`}
              >
                {record.result === 'WIN' ? 'W' : record.result === 'LOSS' ? 'L' : 'D'}
              </div>
            ))
          ) : (
            <span className="text-xs text-gray-600">暂无对战记录</span>
          )}
        </div>
      </div>
    </div>
  );
};
