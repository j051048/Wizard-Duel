import React from 'react';
import { Spell, SpellType } from '../types';
import { getSpellById } from '../services/gameLogic';
import { X, RefreshCcw } from 'lucide-react';

interface ResultsModalProps {
  result: 'WIN' | 'LOSS' | 'DRAW' | null;
  playerSpell: SpellType | null;
  opponentSpell: SpellType | null;
  payout: number;
  bet: number;
  onClose: () => void;
  isCrit: boolean;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ result, playerSpell, opponentSpell, payout, onClose, isCrit }) => {
  if (!result || !playerSpell || !opponentSpell) return null;

  const playerParams = getSpellById(playerSpell);
  const oppParams = getSpellById(opponentSpell);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-arcane-950 border border-arcane-500/50 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl shadow-arcane-900/50 overflow-hidden">
        
        {/* Background FX */}
        <div className="absolute inset-0 bg-gradient-to-br from-arcane-900/50 to-transparent pointer-events-none" />
        
        <div className="relative z-10 text-center">
          <h2 className={`text-4xl font-wizard font-black mb-6 tracking-wider
            ${result === 'WIN' ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 
              result === 'LOSS' ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
              'text-gray-300'}
          `}>
            {result === 'WIN' ? (isCrit ? 'CRITICAL HIT!' : 'VICTORY') : result === 'LOSS' ? 'DEFEATED' : 'DRAW'}
          </h2>

          <div className="flex justify-between items-center mb-8 px-4">
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-2 uppercase">You</span>
              <div className="text-5xl animate-bounce">{playerParams.emoji}</div>
              <span className={`text-xs mt-2 ${playerParams.color}`}>{playerParams.name}</span>
            </div>
            
            <div className="text-2xl font-bold text-white/20">VS</div>
            
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-2 uppercase">Rival</span>
              <div className="text-5xl">{oppParams.emoji}</div>
              <span className={`text-xs mt-2 ${oppParams.color}`}>{oppParams.name}</span>
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-4 mb-6 border border-white/5 text-left">
            <p className="text-gray-400 text-sm font-tech">Payout Breakdown</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Wager</span>
                <span>{bet} PTS</span>
              </div>
              <div className="flex justify-between text-xs text-gray-300">
                <span>Profit</span>
                <span className="font-bold">{Math.max(0, payout - bet)} PTS</span>
              </div>
              <div className="flex justify-between text-xs text-gray-300">
                <span>Total</span>
                <span className="font-bold">{payout} PTS</span>
              </div>
              {isCrit && <p className="text-yellow-400 text-xs mt-1 animate-pulse">Critical multiplier applied!</p>}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-arcane-700 to-arcane-500 hover:from-arcane-600 hover:to-arcane-400 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCcw size={18} />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
