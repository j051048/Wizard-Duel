/**
 * MinionSprite - Animated minion card with state machine
 * [P0-2] Wraps MinionCard visual with combat animation states and keyword overlays
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Minion, MinionKeyword } from '../../types';

export type MinionAnimState = 'idle' | 'charging' | 'attacking' | 'hit' | 'dying';

interface MinionSpriteProps {
  minion: Minion;
  isPlayer: boolean;
  isMobile: boolean;
  animState?: MinionAnimState;
  onAnimComplete?: () => void;
  onClick?: (minion: Minion) => void;
  isTargetable?: boolean;
  isTargeted?: boolean;
}

const KEYWORD_ICONS: Record<MinionKeyword, string> = {
  taunt: '🛡️',
  divine_shield: '🔮',
  rush: '⚡',
  poison: '☠️',
  lifesteal: '🧛',
  windfury: '🌪️',
  cleave: '⚔️',
  discover: '🔍',
};

const KEYWORD_LABELS: Record<MinionKeyword, string> = {
  taunt: '嘲讽',
  divine_shield: '圣盾',
  rush: '突袭',
  poison: '剧毒',
  lifesteal: '吸血',
  windfury: '风怒',
  cleave: '横扫',
  discover: '发现',
};

const ANIM_CLASS_MAP: Record<MinionAnimState, string> = {
  idle: '',
  charging: 'minion-charge',
  attacking: 'minion-attacking',
  hit: 'minion-hit',
  dying: 'minion-dying',
};

export const MinionSprite: React.FC<MinionSpriteProps> = ({
  minion,
  isPlayer,
  isMobile,
  animState = 'idle',
  onAnimComplete,
  onClick,
  isTargetable = false,
  isTargeted = false,
}) => {
  const [currentState, setCurrentState] = useState<MinionAnimState>(animState);
  const prevAnimRef = useRef<MinionAnimState>(animState);

  useEffect(() => {
    if (animState !== prevAnimRef.current) {
      prevAnimRef.current = animState;
      setCurrentState(animState);

      // Auto-return to idle after animation duration
      if (animState !== 'idle' && animState !== 'dying') {
        const durations: Record<string, number> = {
          charging: 600,
          attacking: 500,
          hit: 300,
        };
        const timeout = setTimeout(() => {
          setCurrentState('idle');
          onAnimComplete?.();
        }, durations[animState] || 400);
        return () => clearTimeout(timeout);
      }
      if (animState === 'dying') {
        const timeout = setTimeout(() => onAnimComplete?.(), 600);
        return () => clearTimeout(timeout);
      }
    }
  }, [animState, onAnimComplete]);

  const borderColor = isPlayer ? 'border-blue-500/50' : 'border-red-500/50';
  const icon = isPlayer ? '🛡️' : '👾';
  const animClass = ANIM_CLASS_MAP[currentState];

  // HP bar calculation
  const hpPercent = Math.max(0, Math.min(100, (minion.hp / minion.maxHp) * 100));
  const hpColor = hpPercent > 60 ? 'bg-green-500' : hpPercent > 30 ? 'bg-yellow-500' : 'bg-red-500';

  // Keyword visual overlays
  const hasTaunt = minion.keywords?.includes('taunt');
  const hasShield = minion.hasShield;
  const hasPoison = minion.keywords?.includes('poison');
  const hasWindfury = minion.keywords?.includes('windfury');

  return (
    <motion.div
      key={minion.instanceId}
      className={`
        ${isMobile ? 'w-16 h-22' : 'w-20 h-28'}
        bg-slate-800 border-2 ${borderColor} rounded-lg
        flex flex-col items-center justify-center relative shadow-lg
        transition-all duration-200
        ${animClass}
        ${isTargetable ? 'cursor-pointer ring-2 ring-yellow-400/60 hover:ring-yellow-400' : ''}
        ${isTargeted ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
        ${hasTaunt ? 'ring-2 ring-amber-500/70' : ''}
      `}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: currentState === 'dying' ? 0 : 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={() => onClick?.(minion)}
      style={{
        // Taunt golden border pulse
        ...(hasTaunt && currentState === 'idle' ? {
          boxShadow: '0 0 12px 2px rgba(245, 158, 11, 0.4)',
        } : {}),
      }}
    >
      {/* Name */}
      <div className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-white/50 absolute top-1 truncate w-full text-center px-1`}>
        {minion.name}
      </div>

      {/* Icon */}
      <div className={isMobile ? 'text-lg' : 'text-2xl'}>{icon}</div>

      {/* Keyword icons row */}
      {minion.keywords && minion.keywords.length > 0 && (
        <div className="absolute top-[22px] flex gap-0.5">
          {minion.keywords.map(kw => (
            <span
              key={kw}
              className={`${isMobile ? 'text-[8px]' : 'text-[10px]'}`}
              title={KEYWORD_LABELS[kw]}
            >
              {KEYWORD_ICONS[kw]}
            </span>
          ))}
        </div>
      )}

      {/* Divine Shield overlay */}
      {hasShield && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(96,165,250,0.25) 0%, transparent 70%)',
            border: '2px solid rgba(96,165,250,0.5)',
            animation: 'gentlePulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Poison green fog */}
      {hasPoison && currentState === 'idle' && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden"
          style={{ opacity: 0.3 }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 h-1/3"
            style={{
              background: 'linear-gradient(to top, rgba(132,204,22,0.5), transparent)',
              animation: 'gentlePulse 3s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {/* Windfury swirl indicator */}
      {hasWindfury && (
        <div className="absolute top-0 right-0 text-[8px] opacity-70" title="风怒">
          🌪️
        </div>
      )}

      {/* ATK badge */}
      <div className={`absolute bottom-0.5 left-0.5 bg-slate-900 border border-white/20 ${isMobile ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold text-yellow-400`}>
        {minion.atk}{hasWindfury ? '×2' : ''}
      </div>

      {/* HP badge */}
      <div className={`absolute bottom-0.5 right-0.5 bg-slate-900 border border-white/20 ${isMobile ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold text-green-400`}>
        {minion.hp}
      </div>

      {/* HP bar */}
      <div className={`absolute bottom-0 left-0 right-0 ${isMobile ? 'h-[3px]' : 'h-[4px]'} bg-slate-900/80 rounded-b-lg overflow-hidden`}>
        <div
          className={`h-full ${hpColor} transition-all duration-300`}
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      {/* Dying overlay: red flash before disappearing */}
      {currentState === 'dying' && (
        <div className="absolute inset-0 bg-red-500/40 rounded-lg pointer-events-none" />
      )}

      {/* Hit flash overlay */}
      {currentState === 'hit' && (
        <div className="absolute inset-0 bg-white/30 rounded-lg pointer-events-none animate-ping" />
      )}
    </motion.div>
  );
};

export default React.memo(MinionSprite);
