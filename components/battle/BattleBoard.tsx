import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

// ============ 可交互棋盘机关 ============
interface InteractiveElementProps {
  emoji: string;
  label: string;
  position: React.CSSProperties;
  particleColor: string;
  isMobile: boolean;
}

const InteractiveElement: React.FC<InteractiveElementProps> = ({ emoji, label, position, particleColor, isMobile }) => {
  const [isActivated, setIsActivated] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number }>>([]);

  const handleClick = useCallback(() => {
    if (isActivated) return;
    setIsActivated(true);
    // 生成爆炸粒子
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: 0, y: 0,
      vx: (Math.random() - 0.5) * 120,
      vy: (Math.random() - 0.5) * 120,
    }));
    setParticles(newParticles);
    setTimeout(() => {
      setIsActivated(false);
      setParticles([]);
    }, 1000);
  }, [isActivated]);

  return (
    <div
      className="absolute z-20 pointer-events-auto cursor-pointer select-none"
      style={{ ...position, transform: 'translate(-50%, -50%)' }}
      onClick={handleClick}
      title={label}
    >
      <div
        className={`
          ${isMobile ? 'text-xl' : 'text-2xl'}
          transition-transform duration-300
          ${isActivated ? 'scale-150 rotate-12' : 'hover:scale-125 board-element-breathe'}
        `}
        style={{ filter: isActivated ? 'brightness(1.5) drop-shadow(0 0 8px rgba(255,255,255,0.6))' : 'none' }}
      >
        {emoji}
      </div>
      {/* 爆炸粒子 */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full animate-ping"
          style={{
            background: particleColor,
            left: '50%',
            top: '50%',
            transform: `translate(${p.vx}px, ${p.vy}px)`,
            transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.8s ease-out',
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
};

// ============ 回合氛围层 ============
interface AtmosphereLayerProps {
  roundNumber: number;
  isMobile: boolean;
  scenery: typeof SCENERY_CONFIG[SceneryTheme];
}

const AtmosphereLayer: React.FC<AtmosphereLayerProps> = ({ roundNumber }) => {
  // 回合数越高，氛围越暗沉
  const intensity = Math.min(roundNumber / 15, 1); // 0 at round 1, ~1 at round 15+
  const darken = intensity * 0.25; // 最多暗 25%

  return (
    <div
      className="absolute inset-0 pointer-events-none z-[1] transition-opacity duration-2000"
      style={{
        background: `radial-gradient(ellipse at center, transparent ${60 - darken * 30}%, rgba(0,0,0,${darken}) 100%)`,
        opacity: intensity > 0.1 ? 1 : 0,
      }}
    />
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

const INTERACTIVE_ELEMENTS = [
  { emoji: '🔥', label: '熔岩泡', corner: 'top-left' as const, particleColor: 'rgba(239,68,68,0.6)' },
  { emoji: '❄️', label: '冰晶', corner: 'top-right' as const, particleColor: 'rgba(34,211,238,0.6)' },
  { emoji: '⚡', label: '雷球', corner: 'bottom-left' as const, particleColor: 'rgba(253,224,71,0.6)' },
  { emoji: '🌿', label: '藤蔓', corner: 'bottom-right' as const, particleColor: 'rgba(34,197,94,0.6)' },
];

const CORNER_STYLES: Record<string, (isMobile: boolean) => React.CSSProperties> = {
  'top-left': (m) => ({ top: m ? '8%' : '10%', left: m ? '8%' : '10%' }),
  'top-right': (m) => ({ top: m ? '8%' : '10%', right: m ? '8%' : '10%' }),
  'bottom-left': (m) => ({ bottom: m ? '12%' : '15%', left: m ? '8%' : '10%' }),
  'bottom-right': (m) => ({ bottom: m ? '12%' : '15%', right: m ? '8%' : '10%' }),
};

const BattleBoard: React.FC<BattleBoardProps> = ({
  duelState,
  playerCard,
  opponentCard,
  resultText,
  isMobile
}) => {
  const playerSpellDetails = playerCard ? getSpellById(playerCard) : null;
  const oppSpellDetails = opponentCard ? getSpellById(opponentCard) : null;

  const sceneryTheme: SceneryTheme = useMemo(() => {
    if (playerSpellDetails) return getThemeForElement(playerSpellDetails.id.split(/[\d_]/)[0]);
    return 'enchanted';
  }, [playerSpellDetails]);

  const scenery = SCENERY_CONFIG[sceneryTheme];
  const roundNumber = duelState?.roundNumber || 1;

  // B-2: 碰撞闪光状态
  const [showClash, setShowClash] = useState(false);
  const [isDuelShaking, setIsDuelShaking] = useState(false);
  const prevBothRef = useRef(false);

  useEffect(() => {
    const bothVisible = !!playerCard && !!opponentCard;
    if (bothVisible && !prevBothRef.current) {
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
      {/* Layer 0: Ambient particles (底层) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {Array.from({ length: isMobile ? 8 : 16 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full scenery-particle"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: scenery.particleColor,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Layer 1: 回合氛围层 (随回合加深暗角) */}
      <AtmosphereLayer roundNumber={roundNumber} isMobile={isMobile} scenery={scenery} />

      {/* Layer 2: 可交互棋盘机关 (四角可点击彩蛋) */}
      {!isMobile && INTERACTIVE_ELEMENTS.map((el) => (
        <InteractiveElement
          key={el.label}
          emoji={el.emoji}
          label={el.label}
          position={CORNER_STYLES[el.corner](isMobile)}
          particleColor={el.particleColor}
          isMobile={isMobile}
        />
      ))}

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
        <div className={`transform absolute top-0 ${opponentCard ? 'opponent-card-fly-in opacity-100' : (isMobile ? '-translate-y-4' : '-translate-y-8') + ' opacity-0 scale-90'}`}>
          {oppSpellDetails && opponentCard && <SpellCard spell={oppSpellDetails} disabled isSmall={isMobile} />}
        </div>

        {showClash && (
          <div className="absolute z-40 w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/80 duel-clash-flash" />
        )}

        <div className={`transform absolute bottom-0 ${playerCard ? 'player-card-enter opacity-100' : (isMobile ? 'translate-y-4' : 'translate-y-8') + ' opacity-0 scale-90'}`}>
          {playerSpellDetails && playerCard && <SpellCard spell={playerSpellDetails} isSelected disabled isSmall={isMobile} />}
        </div>

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
