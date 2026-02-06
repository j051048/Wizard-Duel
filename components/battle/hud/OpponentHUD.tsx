import React from 'react';
import { DuelState, GameLoopState, SpellType } from '../../../types';
import { GAME_CONFIG } from '../../../constants';
import { PlayerFrame } from '../../PlayerFrame';
import AIEmoteBubble from '../AIEmoteBubble';
import { SpellCard } from '../../SpellCard';
import { ScrollText, VolumeX, Volume2, Flag } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface OpponentHUDProps {
  duelState: DuelState;
  aiStatus: GameLoopState['aiStatus'];
  opponentCard: SpellType | null;
  isOpponentShaking: boolean;
  projection: any;
  // Controls (Mobile integration)
  isMuted: boolean;
  onToggleMute: () => void;
  onSurrender: () => void;
  isLogOpen: boolean;
  setIsLogOpen: (open: boolean) => void;
}

export const OpponentHUD: React.FC<OpponentHUDProps> = ({
  duelState,
  aiStatus,
  opponentCard,
  isOpponentShaking,
  projection,
  isMuted,
  onToggleMute,
  onSurrender,
  isLogOpen,
  setIsLogOpen
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    /* ====== 移动端：暴雪极简风格对手栏 (Top HUD) ====== */
    return (
      <div className="mobile-opponent-bar w-full px-4 flex justify-between items-start pointer-events-none z-30">
        {/* 左侧：对手头像与血量 (浮空设计) */}
        <div className="flex items-center gap-3 pointer-events-auto">
           <div className="relative">
             {/* 头像 */}
             <div className="w-10 h-10 rounded-full border-2 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.4)] overflow-hidden bg-slate-900">
                <img 
                  src={duelState.aiProfile?.avatar || '/avatars/dark_mage.webp'} 
                  alt="Opponent"
                  className="w-full h-full object-cover"
                />
             </div>
             {/* 意图气泡 (Intent) - 挂在头像右下角 */}
             {opponentCard && (
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-slate-900 rounded-full border border-purple-400 flex items-center justify-center z-10 animate-pulse">
                   <span className="text-xs">🔮</span>
                </div>
             )}
           </div>

           {/* 信息列 */}
           <div className="flex flex-col">
              {/* 名字 & 血量 */}
              <div className="flex items-baseline gap-2 filter drop-shadow-md">
                <span className="text-white font-bold text-shadow text-sm">
                  {duelState.aiProfile?.name || "对手"}
                </span>
                <span className="text-red-400 font-mono font-bold text-base">
                  {duelState.opponentHP}
                </span>
              </div>
              {/* 资源条 (Mana & Hand) */}
              <div className="flex items-center gap-3 text-xs opacity-90">
                 <div className="flex items-center gap-1 text-blue-300">
                   <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_blue]"></div>
                   {duelState.opponentMana}
                 </div>
                 <div className="flex items-center gap-1 text-amber-100">
                   <span className="text-[10px]">🃏</span>
                   {duelState.opponentHandSize}
                 </div>
              </div>
           </div>
        </div>

        {/* 右侧：整合后的按钮组 + AI思考状态 */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto z-50">
           {/* Mobile Controls - Integrated to prevent overlap */}
           <div className="flex gap-1">
              <button 
                 onClick={() => setIsLogOpen(!isLogOpen)}
                 className="w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center text-white/70 active:scale-90 transition-transform"
              >
                 <ScrollText size={16} />
              </button>
              <button 
                onClick={onToggleMute}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center text-white/70 active:scale-90 transition-transform"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button 
                onClick={onSurrender}
                className="w-8 h-8 rounded-full bg-red-900/40 backdrop-blur border border-red-500/30 flex items-center justify-center text-red-500/70 active:scale-90 transition-transform"
              >
                <Flag size={16} />
              </button>
           </div>

                      {/* AI Status Bubble */}
           {/* [P0 Fix 3.5] 修复运算符优先级：&& 优先于 ||，需要加括号 */}
           {(aiStatus.emote === 'thinking' || aiStatus.emote === 'thinking_fast') && (
              <div className="bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-xs text-amber-300 animate-pulse flex items-center gap-2 shadow-lg">
                 <span>思考中...</span>
                 <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
              </div>
           )}
        </div>
      </div>
    );
  }

  /* ====== 桌面端：原有完整布局 ====== */
  return (
    <div className="flex flex-col items-center relative z-20">
       {/* 对手信息框 */}
       <PlayerFrame 
          isPlayer={false}
          name={duelState.aiProfile?.name || "黑魔法师"}
          hp={duelState.opponentHP}
          armor={duelState.opponentArmor}
          maxHp={GAME_CONFIG.maxHP}
          mana={duelState.opponentMana}
          maxMana={duelState.opponentMaxMana} 
          effects={duelState.opponentEffects}
          isShaking={isOpponentShaking}
          avatarSrc={duelState.aiProfile?.avatar}
          isThinking={aiStatus.emote === 'thinking'}
          projection={projection?.target === 'opponent' ? { hpChange: projection.netHpChange, armorChange: projection.netArmorChange } : null}
        />
        
      {/* AI 表情气泡 */}
      <div className="absolute -right-4 top-0">
        <AIEmoteBubble status={aiStatus} />
      </div>
      
      {/* 对手手牌展示 - 扇形排列 */}
      <div className="flex justify-center mt-3 relative h-12">
          {Array.from({ length: Math.min(duelState.opponentHandSize, 7) }).map((_, i) => {
            const totalCards = Math.min(duelState.opponentHandSize, 7);
            const centerIndex = (totalCards - 1) / 2;
            const offsetIndex = i - centerIndex;
            const rotation = offsetIndex * 4;
            const translateX = offsetIndex * 18;
            const translateY = Math.abs(offsetIndex) * 2;
            
            return (
              <div 
                key={i} 
                className="absolute opacity-70 hover:opacity-100 transition-opacity"
                style={{ 
                  transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
                  zIndex: i
                }}
              >
                <SpellCard isFaceDown isSmall />
              </div>
            );
          })}
      </div>

      {/* Desktop Controls (Fixed Top Right) */}
      <div className="fixed z-40 top-4 right-4 safe-area-top flex gap-2">
           <button 
             onClick={onSurrender} 
             className="p-2 backdrop-blur-md rounded-lg border border-red-500/30 text-red-400 hover:text-red-200 hover:bg-red-900/40 transition-colors bg-red-900/40"
             title="投降"
           >
             <Flag size={20} />
           </button>
           <button 
             onClick={() => setIsLogOpen(!isLogOpen)} 
             className="p-2 backdrop-blur-md rounded-lg border border-white/10 text-white/60 hover:text-white transition-colors bg-black/40"
           >
             <ScrollText size={20} />
           </button>
           <button 
             onClick={onToggleMute} 
             className="p-2 backdrop-blur-md rounded-lg border border-white/10 text-white/60 hover:text-white transition-colors bg-black/40"
           >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
           </button>
      </div>
    </div>
  );
};
