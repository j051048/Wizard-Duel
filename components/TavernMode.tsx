/**

 * TavernMode - 酒馆模式组件

 *

 * 专业游戏级设计：

 * - AI对手选择界面

 * - 难度选择和策略预览

 * - 免费练习对战

 * - 进度追踪和解锁

 */



import React, { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { AIProfile } from '../types';
import { AI_PROFILES } from '../services/gameLogic';
import { Trophy, Target, Shield, Star, Play, ArrowLeft } from 'lucide-react';
import { HapticService } from '../services/haptic';



interface TavernModeProps {

  onStartTavernDuel: (aiProfile: AIProfile) => void;

  onBackToLobby: () => void;

  playerStats?: {

    tavernWins: number;

    tavernLosses: number;

    bestStreak: number;

  };

}



export const TavernMode: React.FC<TavernModeProps> = ({

  onStartTavernDuel,

  onBackToLobby,

  playerStats = { tavernWins: 0, tavernLosses: 0, bestStreak: 0 }

}) => {
  const isMobile = useIsMobile();
  const [selectedAI, setSelectedAI] = useState<AIProfile | null>(null);

  const getDifficultyIcon = (difficulty: string) => {
    const size = isMobile ? 16 : 20;
    switch (difficulty) {
      case 'easy': return <Star size={size} className="text-green-400" />;
      case 'medium': return <Target size={size} className="text-yellow-400" />;
      case 'hard': return <Trophy size={size} className="text-red-400" />;
      default: return <Star size={size} className="text-gray-400" />;
    }
  };

  const getStrategyIcon = (strategy: string) => {
    const size = isMobile ? 14 : 16;
    switch (strategy) {
      case 'aggressive': return <Target size={size} className="text-red-400" />;
      case 'defensive': return <Shield size={size} className="text-blue-400" />;
      case 'balanced': return <Star size={size} className="text-yellow-400" />;
      default: return <Star size={size} className="text-gray-400" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'border-green-400/50 bg-green-900/20 shadow-green-900/40';
      case 'medium': return 'border-yellow-400/50 bg-yellow-900/20 shadow-yellow-900/40';
      case 'hard': return 'border-red-400/50 bg-red-900/20 shadow-red-900/40';
      default: return 'border-slate-500 bg-slate-900/20';
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 scroll-smooth`}>
      <div className={`w-full max-w-6xl flex-1 flex flex-col items-center py-6 px-4 ${isMobile ? 'safe-area-top pb-32' : 'py-12'}`}>
        
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-wizard font-bold text-white mb-2 tracking-widest`}>
            🏰 魔法酒馆
          </h1>
          <p className={`${isMobile ? 'text-xs' : 'text-lg'} text-gray-400`}>
            选择对手进行练习对战，磨炼你的咒语组合
          </p>
        </div>

        {/* Player Stats */}
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 md:p-6 mb-6 md:mb-10 border border-white/5 shadow-2xl">
          <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
            <div>
              <div className="text-xl md:text-3xl font-black text-green-400">{playerStats.tavernWins}</div>
              <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">胜场</div>
            </div>
            <div>
              <div className="text-xl md:text-3xl font-black text-red-500">{playerStats.tavernLosses}</div>
              <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">败场</div>
            </div>
            <div>
              <div className="text-xl md:text-3xl font-black text-amber-500">{playerStats.bestStreak}</div>
              <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">连胜</div>
            </div>
          </div>
        </div>

        {/* AI Selection */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3 w-full' : 'md:grid-cols-3 gap-8'} mb-10`}>
          {AI_PROFILES.map((ai) => (
            <div
              key={ai.name}
              className={`
                relative bg-slate-900/60 rounded-2xl p-4 md:p-8 border-2 cursor-pointer transition-all duration-300
                active:scale-95 group overflow-hidden
                ${selectedAI?.name === ai.name
                  ? `${getDifficultyColor(ai.difficulty)} scale-[1.02] ring-2 ring-white/10`
                  : 'border-white/5 hover:border-white/20'
                }
              `}
              onClick={() => {
                setSelectedAI(ai);
                HapticService.light();
              }}
            >
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-[-20deg] translate-x-1/2 group-hover:translate-x-0 transition-transform duration-700 pointer-events-none"></div>

              {/* Difficulty Badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                {getDifficultyIcon(ai.difficulty)}
                <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-tighter">
                  {ai.difficulty === 'easy' ? '简单' : ai.difficulty === 'medium' ? '平衡' : '精英'}
                </span>
              </div>

              <div className={`flex ${isMobile ? 'flex-row items-center gap-4' : 'flex-col items-center mb-4'}`}>
                {/* Avatar */}
                <div className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24 mb-4'} rounded-full bg-gradient-to-br from-indigo-600/40 to-blue-600/40 border border-white/10 flex items-center justify-center text-4xl shadow-inner relative z-10`}>
                  {ai.avatar ? (
                    <img src={ai.avatar} alt={ai.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    '🧙'
                  )}
                  {selectedAI?.name === ai.name && <div className="absolute -inset-1 rounded-full border-2 border-yellow-500/50 animate-ping opacity-20"></div>}
                </div>

                <div className={isMobile ? 'text-left flex-1' : 'text-center'}>
                  <h3 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white mb-1`}>{ai.name}</h3>
                  <p className="text-gray-400 text-xs line-clamp-2">{ai.description}</p>
                </div>
              </div>

              {!isMobile && (
                <div className="flex items-center justify-center gap-3 mt-4 py-2 bg-black/40 rounded-xl border border-white/5 text-sm">
                  {getStrategyIcon(ai.strategy)}
                  <span className="text-gray-300 font-bold tracking-wider">
                    {ai.strategy === 'aggressive' ? '速攻流' : ai.strategy === 'defensive' ? '控制流' : '均衡型'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className={`flex ${isMobile ? 'fixed bottom-0 inset-x-0 p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 gap-3 safe-area-bottom z-50' : 'gap-6'} mt-auto w-full max-w-xl justify-center`}>
          <button
            onClick={onBackToLobby}
            className={`flex items-center justify-center gap-2 ${isMobile ? 'flex-1 py-4 px-2' : 'px-8 py-4'} bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10 font-bold`}
          >
            <ArrowLeft size={isMobile ? 18 : 22} />
            返回首页
          </button>

          <button
            onClick={() => selectedAI && onStartTavernDuel(selectedAI)}
            disabled={!selectedAI}
            className={`
              flex items-center justify-center gap-2 ${isMobile ? 'flex-[1.5] py-4' : 'px-12 py-4'} rounded-2xl font-black text-lg transition-all shadow-2xl
              ${selectedAI
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black hover:scale-105 active:scale-95 shadow-orange-500/20'
                : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
              }
            `}
          >
            <Play size={isMobile ? 20 : 26} />
            挑战对手
          </button>
        </div>

        {/* Tips */}
        {!isMobile && (
          <div className="mt-12 text-center text-gray-500 text-sm max-w-md italic">
            <p>💡 提示：酒馆挑战不需要门票，且会为你提供法力奖励！</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TavernMode;
