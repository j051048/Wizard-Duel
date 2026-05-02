/**
 * DebuffOverlay - Persistent status effect visual overlays
 * [P1-3] Shows burn/freeze/poison/tangle/frozen effects on hero areas
 */

import React, { useMemo } from 'react';
import { StatusEffect } from '../../types';

interface DebuffOverlayProps {
  effects: StatusEffect[];
  position: 'player' | 'opponent';
  isMobile: boolean;
}

const EFFECT_CONFIGS = {
  burn: {
    gradient: 'linear-gradient(to top, rgba(239,68,68,0.25), rgba(249,115,22,0.1), transparent)',
    animation: 'gentlePulse 1.5s ease-in-out infinite',
    icon: '🔥',
    borderColor: 'rgba(239,68,68,0.4)',
  },
  frozen: {
    gradient: 'linear-gradient(135deg, rgba(96,165,250,0.3), rgba(147,197,253,0.15), transparent)',
    animation: 'none',
    icon: '🧊',
    borderColor: 'rgba(96,165,250,0.5)',
  },
  poisoned: {
    gradient: 'linear-gradient(to top, rgba(132,204,22,0.25), rgba(74,222,128,0.1), transparent)',
    animation: 'gentlePulse 3s ease-in-out infinite',
    icon: '☠️',
    borderColor: 'rgba(132,204,22,0.4)',
  },
  tangle: {
    gradient: 'linear-gradient(to top, rgba(34,197,94,0.2), rgba(22,163,74,0.1), transparent)',
    animation: 'gentlePulse 4s ease-in-out infinite',
    icon: '🌿',
    borderColor: 'rgba(34,197,94,0.4)',
  },
  thawed: {
    gradient: 'linear-gradient(to top, rgba(59,130,246,0.15), transparent)',
    animation: 'none',
    icon: '💧',
    borderColor: 'rgba(59,130,246,0.3)',
  },
  shielded: {
    gradient: 'radial-gradient(circle, rgba(96,165,250,0.2), transparent)',
    animation: 'none',
    icon: '🛡️',
    borderColor: 'rgba(96,165,250,0.4)',
  },
  empowered: {
    gradient: 'radial-gradient(circle, rgba(251,191,36,0.2), transparent)',
    animation: 'gentlePulse 2s ease-in-out infinite',
    icon: '✨',
    borderColor: 'rgba(251,191,36,0.4)',
  },
} as const;

type EffectType = keyof typeof EFFECT_CONFIGS;

export const DebuffOverlay: React.FC<DebuffOverlayProps> = ({ effects, position, isMobile }) => {
  const activeEffects = useMemo(() => {
    return effects
      .filter(e => EFFECT_CONFIGS[e.type as EffectType])
      .map(e => ({
        ...e,
        config: EFFECT_CONFIGS[e.type as EffectType],
      }));
  }, [effects]);

  if (activeEffects.length === 0) return null;

  // Stack all effect gradients
  const combinedGradient = activeEffects.map(e => e.config.gradient).join(', ');

  return (
    <div
      className={`absolute inset-0 pointer-events-none rounded-xl overflow-hidden z-10`}
      style={{
        background: combinedGradient,
        border: `2px solid ${activeEffects[0].config.borderColor}`,
        animation: activeEffects[0].config.animation,
      }}
    >
      {/* Status effect icons */}
      <div className={`absolute ${position === 'opponent' ? 'bottom-1' : 'top-1'} left-1 flex gap-0.5`}>
        {activeEffects.map((e, i) => (
          <span
            key={`${e.type}-${i}`}
            className={`${isMobile ? 'text-xs' : 'text-sm'} opacity-80`}
            title={`${e.type} (${e.duration})`}
          >
            {e.config.icon}
            {e.duration > 1 && (
              <span className="text-[8px] text-white/60 ml-0.5">{e.duration}</span>
            )}
          </span>
        ))}
      </div>

      {/* Frozen ice block overlay */}
      {effects.some(e => e.type === 'frozen') && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: 'rgba(96,165,250,0.15)',
            backdropFilter: 'blur(1px)',
          }}
        >
          <span className={`${isMobile ? 'text-xl' : 'text-3xl'} opacity-60`}>❄️</span>
        </div>
      )}

      {/* Burn fire particles (CSS-only bottom glow) */}
      {effects.some(e => e.type === 'burn') && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1/4 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(239,68,68,0.3), transparent)',
            animation: 'gentlePulse 1s ease-in-out infinite',
          }}
        />
      )}

      {/* Poison green mist rising from bottom */}
      {effects.some(e => e.type === 'poisoned') && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(132,204,22,0.2), transparent)',
            animation: 'gentlePulse 3s ease-in-out infinite 0.5s',
          }}
        />
      )}
    </div>
  );
};

export default React.memo(DebuffOverlay);
