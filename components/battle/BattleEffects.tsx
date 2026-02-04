import React from 'react';

interface BattleEffectsProps {
  showCrit: boolean;
  showBloodFlash: boolean;
}

const BattleEffects: React.FC<BattleEffectsProps> = ({ showCrit, showBloodFlash }) => {
  return (
    <>
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
    </>
  );
};

export default BattleEffects;
