import React, { useMemo, useState } from 'react';
import { DuelState, SpellType } from '../../../types';
import { SpellProjection } from '../../../services/projection';
import { GAME_CONFIG } from '../../../constants';
import { PlayerFrame } from '../../PlayerFrame';
import { HeroSkillButton } from '../HeroSkillButton';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { getHeroSkillById } from '../../../data/heroSkills';
import { ChevronUp } from 'lucide-react';

interface PlayerHUDProps {
  duelState: DuelState;
  phase: string;
  isProcessing: boolean;
  isPlayerShaking: boolean;
  projection: SpellProjection | null;
  onPlayCard: (spellId: SpellType, isConfirmed?: boolean) => void;
  onPass: () => void;
  onUseHeroSkill?: () => void;
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
  duelState,
  phase,
  isProcessing,
  isPlayerShaking,
  projection,
  onPlayCard,
  onPass,
  onUseHeroSkill
}) => {
  const isMobile = useIsMobile();
  const [showSkills, setShowSkills] = useState(false);

  // [P3-2] Get selected hero skill from DuelState
  const selectedSkill = useMemo(() => {
    if (!duelState.selectedHeroSkill) return null;
    return getHeroSkillById(duelState.selectedHeroSkill);
  }, [duelState.selectedHeroSkill]);

  const isPlayerTurn = phase === 'PLAYER_TURN';
  const canUseSkill = isPlayerTurn && !duelState.heroSkillsUsed && !isProcessing && !!selectedSkill;

  if (isMobile) {
     /* ====== 移动端极简底部布局 ====== */
     return (
       <div className="absolute bottom-[140px] left-0 right-0 z-[55] flex items-center justify-between px-3 pointer-events-none">

         {/* 左侧：玩家状态 - 极简横条 */}
         <div className="flex items-center gap-2 pointer-events-auto">
           {/* 迷你头像 + 回合指示 */}
           <div className="relative">
             <div className={`
               w-10 h-10 rounded-full border-2 overflow-hidden bg-slate-900 shadow-lg
               ${isPlayerTurn ? 'border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'border-slate-600'}
             `}>
               <img src="/avatars/player-wizard.webp" className="w-full h-full object-cover" alt="Player" />
             </div>
             {/* 回合指示光环 */}
             {isPlayerTurn && (
               <div className="absolute -inset-1 rounded-full border-2 border-blue-400/50 animate-ping pointer-events-none" />
             )}
           </div>

           {/* 状态数值条 */}
           <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-2.5 py-1.5">
             {/* HP */}
             <div className="flex items-center gap-0.5">
               <span className="text-red-400 text-xs">❤️</span>
               <span className={`font-bold text-sm tabular-nums ${duelState.playerHP < 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                 {duelState.playerHP}
               </span>
             </div>
             {/* 护甲 */}
             {duelState.playerArmor > 0 && (
               <>
                 <div className="w-px h-3 bg-white/20" />
                 <div className="flex items-center gap-0.5">
                   <span className="text-cyan-400 text-xs">🛡️</span>
                   <span className="text-cyan-300 font-bold text-sm tabular-nums">{duelState.playerArmor}</span>
                 </div>
               </>
             )}
             {/* 分隔 */}
             <div className="w-px h-3 bg-white/20" />
             {/* Mana */}
             <div className="flex items-center gap-0.5">
               <span className="text-blue-400 text-xs">💎</span>
               <span className="text-blue-300 font-bold text-sm tabular-nums">
                 {duelState.playerMana}<span className="text-slate-500 text-xs">/{duelState.playerMaxMana}</span>
               </span>
             </div>
           </div>

           {/* 技能展开按钮 */}
           {selectedSkill && !duelState.heroSkillsUsed && (
             <button
               onClick={() => setShowSkills(!showSkills)}
               className={`
                 w-8 h-8 rounded-full flex items-center justify-center transition-all
                 ${showSkills
                   ? 'bg-amber-500 text-black rotate-180'
                   : 'bg-slate-800/80 text-amber-400 border border-amber-500/50'}
               `}
             >
               <ChevronUp size={16} />
             </button>
           )}
         </div>

         {/* 右侧：结束回合按钮 */}
         <div className="pointer-events-auto">
           <button
             id="end-turn-btn"
             onClick={onPass}
             disabled={!isPlayerTurn || isProcessing}
             className={`
               px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide
               border-2 shadow-lg transition-all duration-200 active:scale-95
               ${isPlayerTurn
                 ? 'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400 text-white shadow-blue-500/30'
                 : 'bg-slate-800 border-slate-700 text-slate-500'}
               ${isProcessing ? 'cursor-wait opacity-70' : ''}
             `}
           >
             {isPlayerTurn ? (
               <span className="flex items-center gap-1.5">
                 <span>结束</span>
                 <span className="text-base">✨</span>
               </span>
             ) : (
               <span className="flex items-center gap-1.5">
                 <span>等待</span>
                 <span className="animate-spin">⏳</span>
               </span>
             )}
           </button>
         </div>

         {/* 技能展开面板 */}
         {showSkills && selectedSkill && !duelState.heroSkillsUsed && (
           <div
             className="absolute bottom-14 left-3 bg-slate-900/95 backdrop-blur-md rounded-xl border border-amber-500/30 p-2 shadow-2xl pointer-events-auto z-60"
             style={{ minWidth: '180px' }}
           >
             <div className="text-amber-400 text-xs font-bold mb-2 px-1">英雄技能</div>
             <div className="flex flex-col gap-1">
               <HeroSkillButton
                 key={selectedSkill.id}
                 skill={selectedSkill}
                 canUse={canUseSkill}
                 currentMana={duelState.playerMana}
                 onClick={() => { onUseHeroSkill?.(); setShowSkills(false); }}
                 compact={true}
               />
             </div>
           </div>
         )}
       </div>
     );
  }

  /* ====== 桌面端：左下角信息框 ====== */
  return (
    <div className="absolute left-6 bottom-6 z-40 animate-in slide-in-from-left duration-500">
      {/* 英雄技能栏 - 头像上方显示 */}
      {selectedSkill && (
        <div id="hero-skills-container" className="flex flex-row gap-3 mb-4 pointer-events-auto justify-start">
          <HeroSkillButton
            key={selectedSkill.id}
            skill={selectedSkill}
            canUse={canUseSkill}
            currentMana={duelState.playerMana}
            onClick={() => onUseHeroSkill?.()}
          />
        </div>
      )}

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
