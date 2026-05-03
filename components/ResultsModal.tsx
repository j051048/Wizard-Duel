import React, { useState, useEffect, useMemo } from 'react';
import { SpellType, Rank } from '../types';
import { getSpellById } from '../services/gameLogic';
import { Trophy, Skull } from 'lucide-react';
import { useTranslation } from '../i18n';

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

/** B-4: 金币滚动计数器 Hook */
function useCountUp(target: number, duration: number = 800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/** B-4: Confetti 粒子配置 */
function generateConfetti(count: number) {
  const colors = ['#fbbf24', '#f59e0b', '#eab308', '#a855f7', '#8b5cf6', '#ec4899', '#22c55e'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 6,
    rotate: Math.random() * 360,
    sway: (Math.random() - 0.5) * 80,
  }));
}

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
  const { t } = useTranslation();

  const playerParams = getSpellById(playerSpell);
  const oppParams = getSpellById(opponentSpell);
  const profit = result === 'WIN' ? payout - bet : result === 'DRAW' ? 0 : -bet;

  // B-4: 金币滚动计数器
  const animatedPayout = useCountUp(result === 'WIN' || result === 'DRAW' ? payout : 0);
  const animatedProfit = useCountUp(
    profit > 0 ? profit : 0,
    1000
  );

  // B-4: Confetti 粒子（仅胜利时）
  const confetti = useMemo(() => result === 'WIN' ? generateConfetti(40) : [], [result]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-hidden">
      {/* B-4: Confetti 粒子层 (胜利) */}
      {result === 'WIN' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[101]">
          {confetti.map(c => (
            <div
              key={c.id}
              className="confetti-particle"
              style={{
                '--left': c.left,
                '--delay': c.delay,
                '--duration': c.duration,
                '--color': c.color,
                '--size': `${c.size}px`,
                '--sway': `${c.sway}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* 全局庆祝/失败背景动画 */}
      {result === 'WIN' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.15),transparent_70%)] animate-pulse" />
        </div>
      )}

      {/* 顶部横幅 - 史诗级胜利/失败 */}
      <div className="absolute top-[8%] md:top-[12%] left-0 right-0 z-50 flex flex-col items-center pointer-events-none safe-area-top">
          <div className={`
             text-center font-wizard italic font-black text-4xl md:text-8xl tracking-tighter drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]
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

      <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-5 md:p-8 max-w-lg w-full relative shadow-[0_0_100px_rgba(0,0,0,1)] backdrop-blur-2xl overflow-hidden mt-20 md:mt-12 animate-[fadeInScale_0.5s_ease-out_forwards]">

        {/* Background FX */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10">
          {/* Main Visual: Rank Badge */}
          <div className="relative w-28 h-28 md:w-40 md:h-40 mx-auto mb-4 md:mb-6 flex items-center justify-center">
             {/* B-4: 脉冲光晕 */}
             <div className={`absolute inset-[-20%] rounded-full blur-3xl opacity-30
                ${result === 'WIN' ? 'bg-yellow-500 animate-pulse' : result === 'LOSS' ? 'bg-red-500/60' : 'bg-slate-500/40'}
             `} />

             {/* B-4: 旋转光环 (胜利) */}
             {result === 'WIN' && (
               <div className="absolute inset-[-8%] rounded-full border-2 border-dashed border-amber-400/40 animate-[spin_8s_linear_infinite]" />
             )}

             {/* B-4: 失败碎裂效果 */}
             {result === 'LOSS' && (
               <div className="absolute inset-[-5%] rounded-full border-2 border-red-500/30 opacity-50 animate-[shrinkBadge_1s_ease-out_forwards]" />
             )}

             {rankUpdates ? (
                <img
                  src={getRankIcon(rankUpdates.newRank)}
                  alt={rankUpdates.newRank}
                  className={`w-full h-full object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${result === 'WIN' ? 'animate-[float_3s_ease-in-out_infinite]' : ''}`}
                />
             ) : (
                <div className={`w-full h-full bg-slate-800 rounded-full border-4 flex items-center justify-center ${result === 'WIN' ? 'border-amber-600/50' : 'border-slate-700'}`}>
                   {result === 'WIN' ? <Trophy className="text-yellow-400" size={40} /> : <Skull className="text-red-500" size={40} />}
                </div>
             )}
          </div>

          {/* Rank Text & Score */}
          {rankUpdates && (
            <div className="text-center mb-4 md:mb-8">
               <h3 className="text-2xl md:text-3xl font-wizard font-black text-white tracking-widest uppercase mb-1 drop-shadow-md">
                 {rankUpdates.newRank}
               </h3>
               <div className="flex items-center justify-center gap-2">
                  <span className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-wider font-tech">Rank Score</span>
                  <span className="text-white font-mono font-bold text-base md:text-lg">{rankUpdates.newScore}</span>
                  <span className={`text-xs md:text-sm font-black transition-all ${rankUpdates.scoreDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({rankUpdates.scoreDelta >= 0 ? '+' : ''}{rankUpdates.scoreDelta})
                  </span>
               </div>
            </div>
          )}

          {/* Spell Recap (Mini) */}
          <div className="flex justify-center items-center gap-8 md:gap-12 mb-4 md:mb-8 opacity-80 scale-90 md:scale-100">
            <div className="flex flex-col items-center">
              <div className="text-4xl md:text-5xl mb-2 drop-shadow-lg filter grayscale-[0.2]">{playerParams.emoji}</div>
              <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${playerParams.color}`}>YOU</span>
            </div>
            <div className="text-white/20 font-black italic text-xs md:text-base">VS</div>
            <div className="flex flex-col items-center">
              <div className="text-4xl md:text-5xl mb-2 drop-shadow-lg filter grayscale-[0.2]">{oppParams.emoji}</div>
              <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${oppParams.color}`}>FOE</span>
            </div>
          </div>

          {/* Economics — B-4: 滚动计数器 */}
          {!isTavernMode && (
             <div className="bg-black/40 border border-white/5 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 flex items-center justify-between">
                <div>
                   <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Total Payout</p>
                   <p className={`text-2xl md:text-3xl font-mono font-black tracking-tighter ${result === 'WIN' ? 'text-amber-300' : 'text-white'}`}>
                      {animatedPayout} <span className="text-xs text-purple-400 ml-1">💎</span>
                   </p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Profit/Loss</p>
                   <p className={`text-lg md:text-xl font-mono font-black ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profit >= 0 ? '+' : ''}{profit > 0 ? animatedProfit : profit}
                   </p>
                </div>
             </div>
          )}

          {/* Action Button */}
          <button
            onClick={onClose}
            className={`
              w-full py-4 md:py-5 rounded-2xl font-black text-base md:text-lg uppercase tracking-[0.2em] transition-all duration-300
              ${result === 'WIN'
                ? 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.5)] hover:-translate-y-1'
                : 'bg-slate-800 text-white border border-white/10 hover:bg-slate-700'}
            `}
          >
            {result === 'WIN' ? t('Continue Journey') : t('Rise Again')}
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
        @keyframes shrinkBadge {
          from { transform: scale(1); opacity: 0.5; }
          to { transform: scale(0.85); opacity: 0; }
        }
        /* B-4: Confetti 粒子下落动画 */
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(var(--sway)) rotate(720deg);
            opacity: 0;
          }
        }
        .confetti-particle {
          position: absolute;
          top: -10px;
          left: var(--left);
          width: var(--size);
          height: var(--size);
          background: var(--color);
          border-radius: 2px;
          animation: confettiFall var(--duration) ease-in var(--delay) infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default ResultsModal;
