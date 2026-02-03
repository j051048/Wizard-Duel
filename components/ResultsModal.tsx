import React from 'react';
import { SpellType, Rank } from '../types.ts';
import { getSpellById } from '../services/gameLogic.ts';
import { Trophy, Skull, RefreshCcw } from 'lucide-react';

interface ResultsModalProps {
  result: 'WIN' | 'LOSS' | 'DRAW' | null;
  playerSpell: SpellType | null;
  opponentSpell: SpellType | null;
  payout: number;
  bet: number;
  onClose: () => void;
  isCrit: boolean;
  isTavernMode?: boolean;
  rankUpdates?: {
    newScore: number;
    newRank: Rank;
    scoreDelta: number;
  };
}

const getRankIcon = (rank: Rank) => {
  switch (rank) {
    case 'Iron': return '/ui/rank_iron.webp';
    case 'Gold': return '/ui/rank_gold.webp';
    case 'Legend': return '/ui/rank_legend.webp';
    default: return '/ui/rank_iron.webp';
  }
};

export const ResultsModal: React.FC<ResultsModalProps> = ({ 
  result, 
  playerSpell, 
  opponentSpell, 
  payout, 
  bet,
  onClose, 
  isCrit,
  isTavernMode = false,
  rankUpdates
}) => {
  if (!result || !playerSpell || !opponentSpell) return null;

  const playerParams = getSpellById(playerSpell);
  const oppParams = getSpellById(opponentSpell);

  const profit = result === 'WIN' ? payout - bet : result === 'DRAW' ? 0 : -bet;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-hidden">
      {/* 全局庆祝/失败背景动画 */}
      {result === 'WIN' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.15),transparent_70%)] animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] mix-blend-overlay" />
        </div>
      )}

      {/* 顶部横幅 - 史诗级胜利/失败 */}
      <div className="absolute top-[10%] left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
          <div className={`
             text-center font-wizard italic font-black text-6xl md:text-8xl tracking-tighter drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]
             animate-[slideDown_0.6s_cubic-bezier(0.34,1.56,0.64,1)_forwards]
             ${result === 'WIN' ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-600' : 
               result === 'LOSS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-rose-600 to-red-900' : 'text-slate-300'}
          `}>
             {result === 'WIN' ? 'VICTORY' : result === 'LOSS' ? 'DEFEATED' : 'DRAW'}
          </div>
          <div className={`
             h-1 w-0 bg-gradient-to-r from-transparent via-current to-transparent opacity-50
             animate-[expandLine_0.8s_ease-out_0.2s_forwards]
             ${result === 'WIN' ? 'text-yellow-500' : 'text-red-500'}
          `} />
      </div>

      <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-8 max-w-lg w-full relative shadow-[0_0_100px_rgba(0,0,0,1)] backdrop-blur-2xl overflow-hidden mt-12 animate-[fadeInScale_0.5s_ease-out_forwards]">
        
        {/* Background FX */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          {/* Main Visual: Rank Badge */}
          <div className="relative w-40 h-40 mx-auto mb-6 flex items-center justify-center">
             {/* Glow behind badge */}
             <div className={`absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse
                ${result === 'WIN' ? 'bg-yellow-500' : 'bg-red-500'}
             `} />
             
             {rankUpdates ? (
                <img 
                  src={getRankIcon(rankUpdates.newRank)} 
                  alt={rankUpdates.newRank} 
                  className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] animate-[float_3s_ease-in-out_infinite]"
                />
             ) : (
                <div className="w-full h-full bg-slate-800 rounded-full border-4 border-slate-700 flex items-center justify-center">
                   {result === 'WIN' ? <Trophy className="text-yellow-400" size={60} /> : <Skull className="text-red-500" size={60} />}
                </div>
             )}
          </div>
          
          {/* Rank Text & Score */}
          {rankUpdates && (
            <div className="text-center mb-8">
               <h3 className="text-3xl font-wizard font-black text-white tracking-widest uppercase mb-1 drop-shadow-md">
                 {rankUpdates.newRank}
               </h3>
               <div className="flex items-center justify-center gap-2">
                  <span className="text-slate-400 text-sm font-bold uppercase tracking-wider font-tech">Rank Score</span>
                  <span className="text-white font-mono font-bold text-lg">{rankUpdates.newScore}</span>
                  <span className={`text-sm font-black transition-all ${rankUpdates.scoreDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({rankUpdates.scoreDelta >= 0 ? '+' : ''}{rankUpdates.scoreDelta})
                  </span>
               </div>
            </div>
          )}

          {/* Spell Recap (Mini) */}
          <div className="flex justify-center items-center gap-12 mb-8 opacity-80 scale-90">
            <div className="flex flex-col items-center">
              <div className="text-5xl mb-2 drop-shadow-lg filter grayscale-[0.2]">{playerParams.emoji}</div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${playerParams.color}`}>YOU</span>
            </div>
            <div className="text-white/20 font-black italic">VS</div>
            <div className="flex flex-col items-center">
              <div className="text-5xl mb-2 drop-shadow-lg filter grayscale-[0.2]">{oppParams.emoji}</div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${oppParams.color}`}>FOE</span>
            </div>
          </div>

          {/* Economics */}
          {!isTavernMode && (
             <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-8 flex items-center justify-between">
                <div>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Total Payout</p>
                   <p className="text-3xl font-mono font-black text-white tracking-tighter">
                      {payout} <span className="text-xs text-purple-400 ml-1">PTS</span>
                   </p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Profit/Loss</p>
                   <p className={`text-xl font-mono font-black ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profit >= 0 ? '+' : ''}{profit}
                   </p>
                </div>
             </div>
          )}

          {/* Action Button */}
          <button 
            onClick={onClose}
            className={`
              w-full py-5 rounded-2xl font-black text-lg uppercase tracking-[0.2em] transition-all duration-300
              ${result === 'WIN' 
                ? 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.5)] hover:-translate-y-1' 
                : 'bg-slate-800 text-white border border-white/10 hover:bg-slate-700'}
            `}
          >
            {result === 'WIN' ? '继续征程' : '重振旗鼓'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes expandLine {
          from { width: 0; }
          to { width: 300px; }
        }
        @keyframes fadeInScale {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
};
e x p o r t   d e f a u l t   R e s u l t s M o d a l ;  
 