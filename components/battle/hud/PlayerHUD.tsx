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

  if (isMobile) {
     /* ====== 移动端底部布局：Avatar + Skills + EndTurn Orb ====== */
     /* This matches the layout in BattleArena lines 522-596 */
     return (
       <div className="absolute bottom-12 left-0 right-0 z-[60] flex items-end justify-between px-2 w-full pointer-events-none safe-area-bottom">
         
         {/* 左侧：Avatar + Skills (Side-by-Side) */}
         <div className="relative pointer-events-auto flex items-end gap-2 mb-2 ml-1">
            {/* Avatar Container */}
            <div className="relative group">
               <div className="w-16 h-16 rounded-full border-2 border-amber-500/60 shadow-[0_0_20px_rgba(0,0,0,0.6)] bg-slate-900 overflow-hidden relative z-10 ring-2 ring-black/50">
                  <img src="/avatars/player-wizard.webp" className="w-full h-full object-cover" alt="Player" />
               </div>
               
               {/* HP Badge (Bottom Left) */}
               <div className="absolute -bottom-1 -left-1 bg-gradient-to-br from-red-900 to-slate-900 text-red-500 border border-red-500/50 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shadow-md z-20">
                  {duelState.playerHP}
               </div>

               {/* Armor Badge (Top Right) */}
               {duelState.playerArmor > 0 && (
                 <div className="absolute -top-1 -right-1 bg-slate-800 text-slate-300 border border-slate-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] z-20 shadow-sm">
                    🛡️{duelState.playerArmor}
                 </div>
               )}

               {/* Mana Bar (Floating above avatar) */}
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-blue-500/50 rounded-full px-2 py-0.5 flex items-center gap-0.5 shadow-lg z-20 min-w-[3.5rem] justify-center whitespace-nowrap">
                  <span className="text-blue-400 text-[10px]">💠</span>
                  <span className="text-blue-100 font-bold text-xs">{duelState.playerMana}/{duelState.playerMaxMana}</span>
               </div>
            </div>

            {/* Skills (Right of Avatar) */}
            <div className="flex gap-1.5 p-1 bg-black/40 rounded-full backdrop-blur-sm border border-white/5 shadow-xl mb-1">
              {heroSkills.slice(0, 3).map(skill => (
                <HeroSkillButton
                  key={skill.id}
                  skill={skill}
                  canUse={phase === 'PLAYER_TURN' && !duelState.heroSkillsUsed && !isProcessing}
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
              disabled={phase !== 'PLAYER_TURN'}
              className={`
                w-16 h-16 rounded-full flex flex-col items-center justify-center 
                border-[3px] shadow-[0_0_25px_rgba(0,0,0,0.5)] 
                transition-all duration-300 active:scale-90
                ${phase === 'PLAYER_TURN' 
                  ? 'bg-gradient-to-br from-amber-400 via-orange-600 to-amber-900 border-amber-300 text-white animate-pulse-slow shadow-amber-500/30' 
                  : 'bg-slate-800 border-slate-600 text-slate-500 grayscale'}
              `}
            >
              {phase === 'PLAYER_TURN' ? (
                 <>
                   <span className="text-xl leading-none drop-shadow-md">⚔️</span>
                   <span className="text-[10px] font-bold uppercase tracking-wider drop-shadow-md">结束</span>
                 </>
              ) : (
                 <span className="text-2xl animate-spin-slow opacity-50">⏳</span>
              )}
            </button>
            
            {/* Energy Ring Effect (When Active) */}
            {phase === 'PLAYER_TURN' && (
               <div className="absolute inset-0 rounded-full border border-amber-400 opacity-0 animate-ping pointer-events-none" />
            )}
         </div>
       </div>
     );
  }

  /* ====== 桌面端：左下角信息框 ====== */
  return (
    <div className="absolute left-2 md:left-6 bottom-4 md:bottom-6 z-40">
      {/* 英雄技能栏 - 头像上方横排显示 */}
      <div id="hero-skills-container" className="flex flex-row gap-2 mb-2 pointer-events-auto justify-start">
        {heroSkills.slice(0, 3).map(skill => (
          <HeroSkillButton
            key={skill.id}
            skill={skill}
            canUse={phase === 'PLAYER_TURN' && !duelState.heroSkillsUsed && !isProcessing}
            currentMana={duelState.playerMana}
            onClick={() => onPlayCard(skill.id)}
          />
        ))}
      </div>
      
      <PlayerFrame 
        isPlayer={true}
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
