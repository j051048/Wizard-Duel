import React, { useState, useEffect, useRef } from 'react';
import { SpellCard } from '../SpellCard';
import { DuelState, SpellType } from '../../types';
import { getSpellById } from '../../services/gameLogic';
import { MinionSprite } from './MinionSprite';

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

  // B-2: 碰撞闪光状态
  const [showClash, setShowClash] = useState(false);
  const [isDuelShaking, setIsDuelShaking] = useState(false);
  const prevBothRef = useRef(false);

  useEffect(() => {
    const bothVisible = !!playerCard && !!opponentCard;
    if (bothVisible && !prevBothRef.current) {
      // 两张卡同时出现 → 触发碰撞效果
      setShowClash(true);
      setIsDuelShaking(true);
      const t1 = setTimeout(() => setShowClash(false), 400);
      const t2 = setTimeout(() => setIsDuelShaking(false), 300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevBothRef.current = bothVisible;
  }, [playerCard, opponentCard]);

  return (
    <div id="battle-board-area" className={`flex-1 relative z-10 flex flex-col items-center justify-around pointer-events-none w-full ${isDuelShaking ? 'duel-area-shake' : ''}`}>
      {/* Opponent Minions Board */}
      <div className={`flex justify-center ${isMobile ? 'gap-1.5' : 'gap-4'} w-full h-24 md:h-32 items-center`}>
        {duelState?.opponentMinions.map(minion => (
          <MinionSprite
            key={minion.instanceId}
            minion={minion}
            isPlayer={false}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Action/Spell Display Slot */}
      <div className={`relative ${isMobile ? 'h-32' : 'h-48'} w-full flex flex-col items-center justify-center`}>
        {/* 对手卡牌 - 从上方飞入 */}
        <div className={`transform absolute top-0 ${opponentCard ? 'opponent-card-fly-in opacity-100' : (isMobile ? '-translate-y-4' : '-translate-y-8') + ' opacity-0 scale-90'}`}>
          {oppSpellDetails && opponentCard && <SpellCard spell={oppSpellDetails} disabled isSmall={isMobile} />}
        </div>

        {/* 碰撞闪光 */}
        {showClash && (
          <div className="absolute z-40 w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/80 duel-clash-flash" />
        )}

        {/* 玩家卡牌 - 从下方飞入 */}
        <div className={`transform absolute bottom-0 ${playerCard ? 'player-card-enter opacity-100' : (isMobile ? 'translate-y-4' : 'translate-y-8') + ' opacity-0 scale-90'}`}>
          {playerSpellDetails && playerCard && <SpellCard spell={playerSpellDetails} isSelected disabled isSmall={isMobile} />}
        </div>

        {/* 结果横幅 */}
        {resultText && (
          <div className="absolute z-50 kill-banner">
            <div className={`impact-shake px-4 py-2 md:px-8 md:py-4 rounded-xl font-wizard text-xl md:text-5xl font-black shadow-2xl ${resultText.toUpperCase().includes('WIN') ? 'bg-yellow-500 text-white' : 'bg-red-700 text-white'}`}>
              {resultText}
            </div>
          </div>
        )}
      </div>

      {/* Player Minions Board */}
      <div className={`flex justify-center ${isMobile ? 'gap-1.5' : 'gap-4'} w-full h-24 md:h-32 items-center`}>
        {duelState?.playerMinions.map(minion => (
          <MinionSprite
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

export default React.memo(BattleBoard);
