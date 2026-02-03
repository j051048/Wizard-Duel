import React from 'react';
import { SpellType } from '../types.ts';
import { getSpellById } from '../services/gameLogic.ts';
import { RefreshCcw, Trophy, Skull, Minus, Sparkles } from 'lucide-react';

interface ResultsModalProps {
  result: 'WIN' | 'LOSS' | 'DRAW' | null;
  playerSpell: SpellType | null;
  opponentSpell: SpellType | null;
  payout: number;
  bet: number;
  onClose: () => void;
  isCrit: boolean;
  isTavernMode?: boolean;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ 
  result, 
  playerSpell, 
  opponentSpell, 
  payout, 
  bet,
  onClose, 
  isCrit,
  isTavernMode = false
}) => {
  if (!result || !playerSpell || !opponentSpell) return null;

  const playerParams = getSpellById(playerSpell);
  const oppParams = getSpellById(opponentSpell);

  const profit = result === 'WIN' ? payout - bet : result === 'DRAW' ? 0 : -bet;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl shadow-purple-900/30 overflow-hidden">
        
        {/* Background FX */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent pointer-events-none" />
        
        {/* Sparkle effect for wins */}
        {result === 'WIN' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Sparkles className="absolute top-4 left-4 text-yellow-400/30 animate-pulse" size={24} />
            <Sparkles className="absolute top-8 right-8 text-yellow-400/20 animate-pulse" size={16} />
            <Sparkles className="absolute bottom-12 left-8 text-yellow-400/20 animate-pulse" size={20} />
          </div>
        )}
        
        <div className="relative z-10 text-center">
          {/* Result Icon */}
          <div className={`
            w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center
            ${result === 'WIN' 
              ? 'bg-gradient-to-br from-yellow-500 to-amber-600 shadow-[0_0_30px_rgba(250,204,21,0.4)]' 
              : result === 'LOSS' 
              ? 'bg-gradient-to-br from-red-600 to-red-800 shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
              : 'bg-gradient-to-br from-gray-500 to-gray-700'}
          `}>
            {result === 'WIN' && <Trophy className="text-white" size={28} />}
            {result === 'LOSS' && <Skull className="text-white" size={28} />}
            {result === 'DRAW' && <Minus className="text-white" size={28} />}
          </div>

          {/* Result Text */}
          <h2 className={`text-3xl font-wizard font-black mb-2 tracking-wider
            ${result === 'WIN' ? 'text-yellow-400' : 
              result === 'LOSS' ? 'text-red-500' : 
              'text-gray-300'}
          `}>
            {result === 'WIN' ? (isCrit ? '暴击!' : '胜利!') : result === 'LOSS' ? '失败' : '平局'}
          </h2>
          
          {isCrit && result === 'WIN' && (
            <p className="text-yellow-300 text-xs mb-4 animate-pulse font-tech uppercase tracking-wider">
              ⚡ 暴击加成已触发 ⚡
            </p>
          )}

          {/* Spell Comparison */}
          <div className="flex justify-between items-center mb-6 px-2 py-4 bg-black/30 rounded-xl border border-white/5">
            <div className="flex flex-col items-center flex-1">
              <span className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">你的法术</span>
              <div className="text-4xl mb-1">{playerParams.emoji}</div>
              <span className={`text-xs font-bold ${playerParams.color}`}>{playerParams.name}</span>
            </div>
            
            <div className="text-xl font-bold text-white/20 px-2">VS</div>
            
            <div className="flex flex-col items-center flex-1">
              <span className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">对手法术</span>
              <div className="text-4xl mb-1">{oppParams.emoji}</div>
              <span className={`text-xs font-bold ${oppParams.color}`}>{oppParams.name}</span>
            </div>
          </div>

          {/* Payout Breakdown - Only show in non-tavern mode */}
          {!isTavernMode && (
            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5 text-left">
              <p className="text-gray-400 text-xs font-tech mb-3 uppercase tracking-wider">结算明细</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-300">
                  <span>下注金额</span>
                  <span className="font-mono">{bet} PTS</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {profit >= 0 ? '收益' : '损失'}
                  </span>
                  <span className={`font-mono font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profit >= 0 ? '+' : ''}{profit} PTS
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white font-bold">最终获得</span>
                    <span className="font-mono font-bold text-white text-lg">{payout} PTS</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Play Again Button */}
          <button 
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
          >
            <RefreshCcw size={18} />
            再来一局
          </button>
        </div>
      </div>
    </div>
  );
};
