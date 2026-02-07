import React, { useMemo } from 'react';
import { DuelState, SpellType } from '../../../types';
import { GAME_CONFIG, SPELLS } from '../../../constants';
import { PlayerFrame } from '../../PlayerFrame';
import { HeroSkillButton } from '../HeroSkillButton';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface PlayerHUDProps {
  duelState: DuelState;
  phase: string;
  isProcessing: boolean;
  isPlayerShaking: boolean;
  projection: any;
  onPlayCard: (spellId: SpellType, isConfirmed?: boolean) => void;
  onPass: () => void; // Included for Mobile layout
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
  duelState,
  phase,
  isProcessing,
  isPlayerShaking,
  projection,
  onPlayCard,
  onPass
}) => {
  const isMobile = useIsMobile();
  
  // Hero Skills Logic
  const heroSkills = useMemo(() => {
    return SPELLS.filter(s => s.id.startsWith('hero_'));
  }, []);

  const isPlayerTurn = phase === 'PLAYER_TURN';

  if (isMobile) {
     /* ====== 移动端底部布局：Avatar + Skills + EndTurn Orb ====== */
     return (
       <div className="absolute bottom-12 left-0 right-0 z-[60] flex items-end justify-between px-3 w-full pointer-events-none safe-area-bottom">
         
         {/* 左侧：Avatar + Skills (Side-by-Side) */}
         <div className="relative pointer-events-auto flex items-end gap-3 mb-2">
            {/* Avatar Container */}
            <div className={`
              relative group transition-all duration-500
              ${isPlayerTurn ? 'scale-110' : 'scale-100 opacity-90'}
            `}>
               {/* Turn Glow Effect */}
               {isPlayerTurn && (
                  <div className="absolute -inset-1.5 bg-blue-500/40 rounded-full blur-md animate-pulse z-0" />
               )}

               <div className={`
                 w-16 h-16 rounded-full border-2 
                 ${isPlayerTurn ? 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : 'border-slate-500/60 shadow-lg'}
                 bg-slate-950 overflow-hidden relative z-10 ring-2 ring-black/50
               `}>
                  <img src="/avatars/player-wizard.webp" className="w-full h-full object-cover" alt="Player" />
                  
                  {/* Injured Overlay */}
                  {duelState.playerHP < 10 && (
                    <div className="absolute inset-0 bg-red-900/20 animate-pulse pointer-events-none" />
                  )}
               </div>
               
               {/* HP Badge (Bottom Left) */}
               <div className="absolute -bottom-1 -left-1 bg-gradient-to-br from-red-800 to-black text-white border border-red-500/50 rounded-full w-8 h-8 flex flex-col items-center justify-center font-black text-xs shadow-xl z-20">
                  <span className="text-[8px] leading-none opacity-80">HP</span>
                  <span className="leading-none">{duelState.playerHP}</span>
               </div>

               {/* Armor Badge (Top Right) */}
               {duelState.playerArmor > 0 && (
                 <div className="absolute -top-1 -right-1 bg-slate-800 text-cyan-300 border border-cyan-500/50 rounded-full w-6 h-6 flex items-center justify-center text-[10px] z-20 shadow-lg font-bold">
                    🛡️{duelState.playerArmor}
                 </div>
               )}

               {/* Mana Bar (Floating above avatar) */}
               <div className={`
                 absolute -top-3 left-1/2 -translate-x-1/2 
                 bg-slate-950/90 border rounded-full px-2.5 py-0.5 
                 flex items-center gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-20 
                 min-w-[4rem] justify-center whitespace-nowrap transition-colors
                 ${isPlayerTurn ? 'border-blue-500/80 shadow-blue-900/40' : 'border-slate-700'}
               `}>
                  <div className={`w-2 h-2 rounded-full ${isPlayerTurn ? 'bg-blue-400 animate-pulse shadow-[0_0_5px_#60a5fa]' : 'bg-slate-500'}`} />
                  <span className="text-white font-black text-xs tracking-tighter">
                    {duelState.playerMana} <span className="text-slate-500 font-normal">/ {duelState.playerMaxMana}</span>
                  </span>
               </div>
            </div>

            {/* Skills (Right of Avatar) */}
            <div className="flex gap-1.5 p-1.5 bg-black/60 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl mb-1">
              {heroSkills.slice(0, 3).map(skill => (
                <HeroSkillButton
                  key={skill.id}
                  skill={skill}
                  canUse={isPlayerTurn && !duelState.heroSkillsUsed && !isProcessing}
                  currentMana={duelState.playerMana}
                  onClick={() => onPlayCard(skill.id)}
                  compact={true} 
                />
              ))}
            </div>
         </div>

         {/* 右侧：End Turn Orb */}
         <div className="pointer-events-auto mb-3 mr-1 relative">
            <button 
              id="end-turn-btn"
              onClick={onPass} 
              disabled={!isPlayerTurn || isProcessing}
              className={`
                w-16 h-16 rounded-full flex flex-col items-center justify-center 
                border-[3px] shadow-[0_0_25px_rgba(0,0,0,0.6)] 
                transition-all duration-300 active:scale-90
                ${isPlayerTurn 
                  ? 'bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-900 border-blue-400 text-white animate-pulse-slow shadow-blue-500/40' 
                  : 'bg-slate-800 border-slate-700 text-slate-500 grayscale'}
                ${isProcessing ? 'cursor-wait opacity-80' : ''}
              `}
            >
              {isPlayerTurn ? (
                 <>
                   <span className="text-xl leading-none drop-shadow-md">✨</span>
                   <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md mt-0.5">结束</span>
                 </>
              ) : (
                 <span className="text-2xl animate-spin-slow opacity-40">⏳</span>
              )}
            </button>
            
            {/* Energy Ring Effect (When Active) */}
            {isPlayerTurn && !isProcessing && (
               <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 animate-ping pointer-events-none" />
            )}
         </div>
       </div>
     );
  }

  /* ====== 桌面端：左下角信息框 ====== */
  return (
    <div className="absolute left-6 bottom-6 z-40 animate-in slide-in-from-left duration-500">
      {/* 英雄技能栏 - 头像上方横排显示 */}
      <div id="hero-skills-container" className="flex flex-row gap-3 mb-4 pointer-events-auto justify-start">
        {heroSkills.slice(0, 3).map(skill => (
          <HeroSkillButton
            key={skill.id}
            skill={skill}
            canUse={isPlayerTurn && !duelState.heroSkillsUsed && !isProcessing}
            currentMana={duelState.playerMana}
            onClick={() => onPlayCard(skill.id)}
          />
        ))}
      </div>
      
      <PlayerFrame 
        isPlayer={true}
        name="你"
        hp={duelState.playerHP}
        armor={duelState.playerArmor}
        maxHp={GAME_CONFIG.maxHP}
        mana={duelState.playerMana}
        maxMana={duelState.playerMaxMana}
        effects={duelState.playerEffects}
        isShaking={isPlayerShaking}
        projection={projection?.target === 'player' ? { hpChange: projection.netHpChange, armorChange: projection.netArmorChange } : null}
      />
    </div>
  );
};
