/**
 * Lobby - 游戏大厅组件
 * 
 * 包含法术预览、下注选择、开始对战等功能
 */

import React from 'react';
import { Sparkles, Volume2, VolumeX } from 'lucide-react';
import { SPELLS, BET_OPTIONS } from '../constants';
import { BattleRecord } from '../types';

interface LobbyProps {
  balance: number;
  selectedBet: number;
  onSelectBet: (bet: number) => void;
  onStartDuel: () => void;
  history: BattleRecord[];
  isMuted: boolean;
  onToggleMute: () => void;
  isLoading?: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  balance,
  selectedBet,
  onSelectBet,
  onStartDuel,
  history,
  isMuted,
  onToggleMute,
  isLoading = false,
}) => {
  const canStart = balance >= selectedBet;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/lobby-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/80 via-purple-950/60 to-slate-950/90" />
      </div>

      <div className="relative z-10 max-w-md mx-auto p-4 space-y-6 pt-8">
        {/* Logo */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-5xl md:text-6xl font-wizard font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400 drop-shadow-[0_4px_20px_rgba(168,85,247,0.5)]">
            WIZARD DUEL
          </h1>
          <p className="text-gray-400 text-sm font-tech tracking-[0.3em] uppercase">元素策略对战</p>
        </div>

        {/* 音量控制 */}
        <div className="absolute top-4 right-4">
          <button
            onClick={onToggleMute}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-colors"
          >
            {isMuted ? (
              <VolumeX size={20} className="text-gray-400" />
            ) : (
              <Volume2 size={20} className="text-purple-400" />
            )}
          </button>
        </div>

        {/* 法术预览 */}
        <section className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-purple-500/20">
          <h3 className="text-center text-gray-300 mb-3 text-xs font-bold uppercase tracking-widest">五元素法术</h3>
          <div className="grid grid-cols-5 gap-2">
            {SPELLS.map(spell => (
              <div 
                key={spell.id} 
                className="text-center p-3 bg-black/40 rounded-xl border border-white/5 hover:border-purple-500/50 transition-all group cursor-pointer"
              >
                <div className="text-3xl mb-2 group-hover:scale-125 transition-transform">{spell.emoji}</div>
                <div className={`text-[9px] font-bold uppercase ${spell.color}`}>
                  {spell.name.split(' ')[0]}
                </div>
                <div className="flex justify-center gap-1 mt-1 text-[8px] text-gray-500">
                  <span className="text-blue-400">{spell.manaCost}💎</span>
                  <span className="text-red-400">{spell.damage}❤️</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-3 text-center">
            🔥→🌿→❄️→⚡→🪨→🔥 克制循环
          </p>
        </section>

        {/* 下注选择 */}
        <section className="bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-200 text-sm uppercase tracking-wider font-bold">下注金额</span>
            <span className="text-purple-400 font-mono text-sm">
              余额: {isLoading ? '...' : balance} PTS
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {BET_OPTIONS.map((amt) => (
              <button
                key={amt}
                onClick={() => onSelectBet(amt)}
                disabled={balance < amt}
                className={`
                  py-4 rounded-xl font-bold border-2 transition-all
                  ${selectedBet === amt 
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600 border-purple-400 text-white shadow-lg shadow-purple-500/30 scale-105' 
                    : balance < amt
                      ? 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-black/40 border-gray-700 text-gray-400 hover:border-purple-500/50 hover:text-white'
                  }
                `}
              >
                <span className="text-2xl">{amt}</span>
              </button>
            ))}
          </div>
          
          <div className="mt-4 flex justify-between items-center text-sm text-gray-400 border-t border-white/10 pt-3">
            <span>预期收益</span>
            <span className="text-green-400 text-lg font-bold">+{Math.floor(selectedBet * 0.92)} PTS</span>
          </div>
        </section>

        {/* 开始按钮 */}
        <button
          onClick={onStartDuel}
          disabled={!canStart}
          className={`
            w-full py-5 rounded-2xl font-wizard font-black text-xl tracking-[0.2em] uppercase transition-all
            flex items-center justify-center gap-3 relative overflow-hidden group
            ${canStart 
              ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 text-white hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] border-2 border-purple-400/50'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed border-2 border-gray-700'
            }
          `}
        >
          <Sparkles size={24} className={canStart ? 'animate-pulse' : ''} />
          <span className="relative z-10">开始决斗</span>
          <Sparkles size={24} className={canStart ? 'animate-pulse' : ''} />
          
          {/* 光效扫过动画 */}
          {canStart && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          )}
        </button>

        {/* 对战记录 */}
        <section className="pt-4">
          <h3 className="text-gray-400 mb-3 text-xs font-bold uppercase tracking-widest text-center">对战记录</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-center py-4 text-gray-600 text-xs italic">暂无对战记录</div>
            ) : (
              history.slice(0, 5).map((record) => (
                <div 
                  key={record.id} 
                  className="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-white/5 text-xs"
                >
                  <div className="flex gap-3 items-center">
                    <span className={`
                      w-2 h-2 rounded-full 
                      ${record.result === 'WIN' ? 'bg-green-500' : record.result === 'DRAW' ? 'bg-yellow-500' : 'bg-red-500'}
                    `} />
                    <span className={
                      record.result === 'WIN' ? 'text-green-400' : 
                      record.result === 'DRAW' ? 'text-yellow-400' : 
                      'text-red-400'
                    }>
                      {record.result === 'WIN' ? '胜利' : record.result === 'DRAW' ? '平局' : '失败'}
                    </span>
                  </div>
                  <span className={`
                    font-mono font-bold 
                    ${record.amount > 0 ? 'text-green-400' : record.amount < 0 ? 'text-red-400' : 'text-gray-400'}
                  `}>
                    {record.amount > 0 ? '+' : ''}{record.amount}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Lobby;
