import React from 'react';
import { SpellCard } from '../SpellCard';
import { DuelState, SpellType } from '../../types';
import { getSpellById } from '../../services/gameLogic';

interface BattleBoardProps {
  duelState: DuelState | null;
  playerCard: SpellType | null;
  opponentCard: SpellType | null;
  resultText: string | null;
  isMobile: boolean;
}

const BattleBoard: React.FC<BattleBoardProps> = ({
  duelState,
  playerCard,
  opponentCard,
  resultText,
  isMobile
}) => {
  const playerSpellDetails = playerCard ? getSpellById(playerCard) : null;
  const oppSpellDetails = opponentCard ? getSpellById(opponentCard) : null;

  return (
    <div id="battle-board-area" className="flex-1 relative z-10 flex flex-col items-center justify-around pointer-events-none w-full">
      {/* Opponent Minions Board */}
      <div className="flex justify-center gap-4 w-full h-32 items-center">
        {duelState?.opponentMinions.map(minion => (
          <div key={minion.instanceId} className="w-20 h-28 bg-slate-800 border-2 border-red-500/50 rounded-lg flex flex-col items-center justify-center relative shadow-lg animate-fade-in-up">
            <div className="text-[10px] text-white/50 absolute top-1">{minion.name}</div>
            <div className="text-2xl">👾</div>
            <div className="absolute bottom-1 left-1 bg-slate-900 border border-white/20 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-400">{minion.atk}</div>
            <div className="absolute bottom-1 right-1 bg-slate-900 border border-white/20 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-green-400">{minion.hp}</div>
          </div>
        ))}
      </div>

      {/* Action/Spell Display Slot */}
      <div className="relative h-48 w-full flex flex-col items-center justify-center">
        <div className={`transition-all duration-500 transform absolute top-0 ${opponentCard ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-90'}`}>
          {oppSpellDetails && opponentCard && <SpellCard spell={oppSpellDetails} disabled isSmall={isMobile} />}
        </div>
        <div className={`transition-all duration-500 transform absolute bottom-0 ${playerCard ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-90'}`}>
          {playerSpellDetails && playerCard && <SpellCard spell={playerSpellDetails} isSelected disabled isSmall={isMobile} />}
        </div>
        
        {resultText && (
          <div className="absolute z-50 animate-bounce">
            <div className={`px-8 py-4 rounded-xl font-wizard text-3xl md:text-5xl font-black shadow-2xl ${resultText.toUpperCase().includes('WIN') ? 'bg-yellow-500 text-white' : 'bg-red-700 text-white'}`}>
              {resultText}
            </div>
          </div>
        )}
      </div>

      {/* Player Minions Board */}
      <div className="flex justify-center gap-4 w-full h-32 items-center">
        {duelState?.playerMinions.map(minion => (
          <div key={minion.instanceId} className="w-20 h-28 bg-slate-800 border-2 border-blue-500/50 rounded-lg flex flex-col items-center justify-center relative shadow-lg animate-fade-in-down">
            <div className="text-[10px] text-white/50 absolute top-1">{minion.name}</div>
            <div className="text-2xl">🛡️</div>
            <div className="absolute bottom-1 left-1 bg-slate-900 border border-white/20 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-400">{minion.atk}</div>
            <div className="absolute bottom-1 right-1 bg-slate-900 border border-white/20 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-green-400">{minion.hp}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BattleBoard;
