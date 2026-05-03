import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SpellCard } from '../SpellCard';
import { DuelState, SpellType } from '../../types';
import { getSpellById } from '../../services/gameLogic';
import { MinionSprite } from './MinionSprite';

// ============ Battle Scenery System ============
type SceneryTheme = 'volcano' | 'frost' | 'enchanted';

const SCENERY_CONFIG: Record<SceneryTheme, { label: string; gradient: string; particleColor: string; borderColor: string }> = {
  volcano: {
    label: '火山',
    gradient: 'linear-gradient(180deg, #1a0a0a 0%, #4a1a0a 40%, #2d1108 100%)',
    particleColor: 'rgba(239,68,68,0.4)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  frost: {
    label: '冰原',
    gradient: 'linear-gradient(180deg, #0a1a2a 0%, #0d2847 40%, #061220 100%)',
    particleColor: 'rgba(34,211,238,0.3)',
    borderColor: 'rgba(34,211,238,0.2)',
  },
  enchanted: {
    label: '魔法森林',
    gradient: 'linear-gradient(180deg, #0a1a0a 0%, #0d2a15 40%, #081a0a 100%)',
    particleColor: 'rgba(34,197,94,0.3)',
    borderColor: 'rgba(34,197,94,0.2)',
  },
};

function getThemeForElement(element: string): SceneryTheme {
  if (element === 'fire' || element === 'thunder') return 'volcano';
  if (element === 'ice') return 'frost';
  return 'enchanted'; // vine, rock, default
}

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

  // Determine scenery from player's most-played element
  const sceneryTheme: SceneryTheme = useMemo(() => {
    if (playerSpellDetails) return getThemeForElement(playerSpellDetails.id.split(/[\d_]/)[0]);
    return 'enchanted';
  }, [playerSpellDetails]);

  const scenery = SCENERY_CONFIG[sceneryTheme];

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
    <div
      id="battle-board-area"
      className={`flex-1 relative z-10 flex flex-col items-center justify-around pointer-events-none w-full ${isDuelShaking ? 'duel-area-shake' : ''}`}
      style={{
        background: scenery.gradient,
        borderColor: scenery.borderColor,
      }}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: isMobile ? 6 : 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full scenery-particle"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              background: scenery.particleColor,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

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
