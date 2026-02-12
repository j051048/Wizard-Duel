import React from 'react';
import { motion } from 'framer-motion';
import { SpellCard } from '../SpellCard';
import { DuelState, SpellType, Minion } from '../../types';
import { getSpellById } from '../../services/gameLogic';

// 随从入场动画配置 - 只在首次挂载时执行
const minionEntryAnimation = {
  initial: { opacity: 0, scale: 0.8, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.2, ease: "easeOut" }
};

// ============ MinionCard 子组件 ============
interface MinionCardProps {
  minion: Minion;
  isPlayer: boolean;
  isMobile: boolean;
}

const MinionCard: React.FC<MinionCardProps> = ({ minion, isPlayer, isMobile }) => {
  const borderColor = isPlayer ? 'border-blue-500/50' : 'border-red-500/50';
  const icon = isPlayer ? '🛡️' : '👾';

  return (
    <motion.div
      key={minion.instanceId}
      className={`${isMobile ? 'w-14 h-20' : 'w-20 h-28'} bg-slate-800 border-2 ${borderColor} rounded-lg flex flex-col items-center justify-center relative shadow-lg`}
      {...minionEntryAnimation}
    >
      <div className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-white/50 absolute top-1 truncate w-full text-center px-1`}>{minion.name}</div>
      <div className={isMobile ? 'text-lg' : 'text-2xl'}>{icon}</div>
      <div className={`absolute bottom-0.5 left-0.5 bg-slate-900 border border-white/20 ${isMobile ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold text-yellow-400`}>{minion.atk}</div>
      <div className={`absolute bottom-0.5 right-0.5 bg-slate-900 border border-white/20 ${isMobile ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold text-green-400`}>{minion.hp}</div>
    </motion.div>
  );
};

// ============ BattleBoard 主组件 ============
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
          <MinionCard
            key={minion.instanceId}
            minion={minion}
            isPlayer={false}
            isMobile={isMobile}
          />
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
          <MinionCard
            key={minion.instanceId}
            minion={minion}
            isPlayer={true}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
};

export default BattleBoard;
