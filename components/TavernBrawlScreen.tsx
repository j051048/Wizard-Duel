/**
 * TavernBrawlScreen — 酒馆乱斗模式 UI
 *
 * 每周特殊规则对战
 */

import React, { useState, useCallback } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { TavernBrawlService, TavernBrawlState } from '../services/TavernBrawlService';
import { useUIStore } from '../stores/useUIStore';

interface TavernBrawlScreenProps {
  onBack: () => void;
}

export const TavernBrawlScreen: React.FC<TavernBrawlScreenProps> = ({ onBack }) => {
  const rule = TavernBrawlService.getCurrentRule();
  const [state] = useState<TavernBrawlState>(() => TavernBrawlService.getState());
  const setGameState = useUIStore(s => s.setGameState);
  const setGameMode = useUIStore(s => s.setGameMode);

  const handleStartBattle = useCallback(() => {
    setGameMode('tavern_brawl');
    setGameState('MATCHMAKING');
  }, [setGameMode, setGameState]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 pt-8">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🍺</div>
        <h1 className="text-3xl font-bold text-red-400 font-wizard mb-2">酒馆乱斗</h1>
        <p className="text-sm text-gray-400">每周不同特殊规则，首胜送卡包！</p>
      </div>

      {/* 本周规则 */}
      <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-2xl p-6 max-w-md w-full mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
        <div className="text-center">
          <div className="text-4xl mb-3">{rule.icon}</div>
          <h2 className="text-xl font-bold text-red-300 mb-2">{rule.name}</h2>
          <p className="text-gray-300 text-sm mb-4">{rule.description}</p>
        </div>

        {/* 本周统计 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="text-lg font-bold text-green-400">{state.wins}</div>
            <div className="text-[10px] text-gray-500">胜</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="text-lg font-bold text-red-400">{state.losses}</div>
            <div className="text-[10px] text-gray-500">负</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="text-lg font-bold text-amber-400">{state.totalRuns}</div>
            <div className="text-[10px] text-gray-500">总场次</div>
          </div>
        </div>
      </div>

      {/* 首胜奖励 */}
      <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4 max-w-md w-full mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-400" />
            <span className="text-sm text-gray-300">首胜奖励</span>
          </div>
          <span className={`text-sm font-bold ${state.hasClaimedFirstWin ? 'text-green-400' : 'text-gray-500'}`}>
            {state.hasClaimedFirstWin ? '✓ 已领取' : '50 法力 + 卡包'}
          </span>
        </div>
      </div>

      {/* 规则列表预览 */}
      <div className="max-w-md w-full mb-6">
        <h3 className="text-sm text-gray-500 mb-2">规则轮换预览</h3>
        <div className="grid grid-cols-2 gap-2">
          {TavernBrawlService.getAllRules().slice(0, 6).map((r) => (
            <div
              key={r.id}
              className={`bg-slate-900/40 rounded-lg p-2 text-xs flex items-center gap-2 ${
                r.id === rule.id ? 'border border-red-500/50 text-red-300' : 'text-gray-500'
              }`}
            >
              <span>{r.icon}</span>
              <span className="truncate">{r.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold border border-white/10"
        >
          返回
        </button>
        <button
          onClick={handleStartBattle}
          className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-colors flex items-center gap-2"
        >
          <ChevronRight size={18} />
          开始乱斗
        </button>
      </div>
    </div>
  );
};
