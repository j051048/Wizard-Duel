import React from 'react';

interface BattleEffectsProps {
  showCrit: boolean;
  showBloodFlash: boolean;
  playerHp: number;
  maxHp: number;
  /** [P2-2] Current combo count (0 = no combo) */
  comboCount?: number;
}

const BattleEffects: React.FC<BattleEffectsProps> = ({ showCrit, showBloodFlash, playerHp, maxHp, comboCount = 0 }) => {
  const hpPercent = maxHp > 0 ? playerHp / maxHp : 1;
  const isLowHp = hpPercent <= 0.3;
  const isCriticalHp = hpPercent <= 0.15;
  
  // Vignette intensity scales with how low HP is
  const vignetteOpacity = isLowHp ? Math.min(0.7, 0.15 + (0.3 - hpPercent) * 2) : 0;
  const pulseSpeed = isCriticalHp ? '0.5s' : '1.5s';

  return (
    <>
      {/* Low HP Vignette Effect */}
      {isLowHp && (
        <div 
          className="fixed inset-0 z-40 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 150px rgba(220, 38, 38, ${vignetteOpacity})`,
            animation: `heartbeat ${pulseSpeed} ease-in-out infinite`,
          }}
        />
      )}

      {/* Critical HP Warning Text */}
      {isCriticalHp && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <span 
            className="text-red-500 font-bold text-sm tracking-widest uppercase opacity-80"
            style={{ animation: 'blink 0.8s step-end infinite' }}
          >
            ⚠ 血量危险 ⚠
          </span>
        </div>
      )}

      {showCrit && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
           <div className="absolute inset-0 bg-white/30 animate-[critFlash_0.5s_ease-out_forwards] mix-blend-overlay" />
           <div className="absolute inset-0 bg-red-500/10 animate-[pulse_0.2s_ease-in-out_2]" />
           <div className="text-6xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] animate-[bounce_0.5s_infinite] rotate-[-15deg] border-4 border-red-500 bg-black/50 p-4 rounded-xl uppercase tracking-widest">
             CRITICAL!
           </div>
        </div>
      )}

      {showBloodFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none shadow-[inset_0_0_100px_rgba(220,38,38,0.8)] animate-pulse" />
      )}

      {/* [P2-2] Combo screen-edge glow */}
      {comboCount >= 2 && (
        <div
          className="fixed inset-0 z-35 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 ${40 + comboCount * 15}px rgba(168,85,247,${Math.min(0.5, 0.2 + comboCount * 0.1)})`,
            animation: `gentlePulse ${Math.max(0.3, 1.5 - comboCount * 0.3)}s ease-in-out infinite`,
          }}
        />
      )}
    </>
  );
};

export default BattleEffects;
