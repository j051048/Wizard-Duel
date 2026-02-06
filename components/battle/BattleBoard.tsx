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
      <div className={`flex justify-center ${isMobile ? 'gap-1.5' : 'gap-4'} w-full h-24 md:h-32 items-center`}>
        {duelState?.opponentMinions.map(minion => (
          <div key={minion.instanceId} className={`${isMobile ? 'w-14 h-20' : 'w-20 h-28'} bg-slate-800 border-2 border-red-500/50 rounded-lg flex flex-col items-center justify-center relative shadow-lg animate-fade-in-up`}>
            <div className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-white/50 absolute top-1 truncate w-full text-center px-1`}>{minion.name}</div>
            <div className={isMobile ? 'text-lg' : 'text-2xl'}>👾</div>
            <div className={`absolute bottom-0.5 left-0.5 bg-slate-900 border border-white/20 ${isMobile ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold text-yellow-400`}>{minion.atk}</div>
            <div className={`absolute bottom-0.5 right-0.5 bg-slate-900 border border-white/20 ${isMobile ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold text-green-400`}>{minion.hp}</div>
          </div>
        ))}
      </div>

      {/* Action/Spell Display Slot */}
      <div className={`relative ${isMobile ? 'h-32' : 'h-48'} w-full flex flex-col items-center justify-center`}>
        <div className={`transition-all duration-500 transform absolute top-0 ${opponentCard ? 'translate-y-0 opacity-100 scale-100' : (isMobile ? '-translate-y-4' : '-translate-y-8') + ' opacity-0 scale-90'}`}>
          {oppSpellDetails && opponentCard && <SpellCard spell={oppSpellDetails} disabled isSmall={isMobile} />}
        </div>
        <div className={`transition-all duration-500 transform absolute bottom-0 ${playerCard ? 'translate-y-0 opacity-100 scale-100' : (isMobile ? 'translate-y-4' : 'translate-y-8') + ' opacity-0 scale-90'}`}>
          {playerSpellDetails && playerCard && <SpellCard spell={playerSpellDetails} isSelected disabled isSmall={isMobile} />}
        </div>
        
        {resultText && (
          <div className="absolute z-50 animate-bounce">
            <div className={`px-4 py-2 md:px-8 md:py-4 rounded-xl font-wizard text-xl md:text-5xl font-black shadow-2xl ${resultText.toUpperCase().includes('WIN') ? 'bg-yellow-500 text-white' : 'bg-red-700 text-white'}`}>
              {resultText}
            </div>
          </div>
        )}
      </div>

      {/* Player Minions Board */}
      <div className={`flex justify-center ${isMobile ? 'gap-1.5' : 'gap-4'} w-full h-24 md:h-32 items-center`}>
        {duelState?.playerMinions.map(minion => (
          <div key={minion.instanceId} className={`${isMobile ? 'w-14 h-20' : 'w-20 h-28'} bg-slate-800 border-2 border-blue-500/50 rounded-lg flex flex-col items-center justify-center relative shadow-lg animate-fade-in-down`}>
            <div className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-white/50 absolute top-1 truncate w-full text-center px-1`}>{minion.name}</div>
            <div className={isMobile ? 'text-lg' : 'text-2xl'}>🛡️</div>
            <div className={`absolute bottom-0.5 left-0.5 bg-slate-900 border border-white/20 ${isMobile ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold text-yellow-400`}>{minion.atk}</div>
            <div className={`absolute bottom-0.5 right-0.5 bg-slate-900 border border-white/20 ${isMobile ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold text-green-400`}>{minion.hp}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BattleBoard;
