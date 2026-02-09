import React, { useState } from 'react';
import { DuelState, GameLoopState, SpellType } from '../../../types';
import { GAME_CONFIG } from '../../../constants';
import { PlayerFrame } from '../../PlayerFrame';
import AIEmoteBubble from '../AIEmoteBubble';
// import { SpellCard } from '../../SpellCard'; // [P2 Fix] Removed unused import
import { ScrollText, VolumeX, Volume2, Flag, MoreHorizontal } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface OpponentHUDProps {
  duelState: DuelState;
  aiStatus: GameLoopState['aiStatus'];
  opponentCard: SpellType | null;
  isOpponentShaking: boolean;
  projection: {
    hpChange: number;
    armorChange: number;
    netHpChange?: number;
    netArmorChange?: number;
    target?: string;
  } | null;
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
  opponentCard: _opponentCard, // [Lint Fix] Unused variable
  isOpponentShaking,
  projection,
  isMuted,
  onToggleMute,
  onSurrender,
  isLogOpen,
  setIsLogOpen
}) => {
  const isMobile = useIsMobile();
  const [showMenu, setShowMenu] = useState(false);

  if (isMobile) {
    /* ====== 移动端：超极简顶部条 (占用最少空间) ====== */
    return (
      <>
        {/* 顶部极简条 - 只有最关键信息 */}
        <div className="mobile-opponent-bar w-full px-2 pt-1 flex justify-between items-center pointer-events-none z-30"
             style={{ paddingTop: 'max(env(safe-area-inset-top), 4px)' }}>
          
          {/* 左侧：对手信息 - 横向极简 */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* 迷你头像 */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full border border-red-500/50 overflow-hidden bg-slate-900 shadow-lg">
                <img 
                  src={duelState.aiProfile?.avatar || '/avatars/dark_mage.webp'} 
                  alt="Opponent"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* 思考指示器 */}
              {(aiStatus.emote === 'thinking' || aiStatus.emote === 'thinking_fast') && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full animate-pulse border border-black" />
              )}
            </div>

            {/* 核心数值 - 一行显示 */}
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
              {/* HP */}
              <div className="flex items-center gap-0.5">
                <span className="text-red-400 text-xs">❤️</span>
                <span className="text-white font-bold text-sm tabular-nums">{duelState.opponentHP}</span>
              </div>
              {/* 分隔 */}
              <div className="w-px h-3 bg-white/20" />
              {/* Mana */}
              <div className="flex items-center gap-0.5">
                <span className="text-blue-400 text-xs">💎</span>
                <span className="text-blue-300 font-bold text-sm tabular-nums">{duelState.opponentMana}</span>
              </div>
              {/* 手牌数 */}
              <div className="flex items-center gap-0.5">
                <span className="text-amber-300 text-xs">🃏</span>
                <span className="text-amber-200 text-sm tabular-nums">{duelState.opponentHandSize}</span>
              </div>
            </div>
          </div>

          {/* 中间：回合信息 */}
          <div className="absolute left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur px-3 py-0.5 rounded-full border border-slate-600/50">
            <span className="text-slate-300 text-xs font-medium">回合 {duelState.roundNumber}</span>
          </div>

          {/* 右侧：折叠菜单按钮 */}
          <div className="pointer-events-auto relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center text-white/70 active:scale-90 transition-transform"
            >
              <MoreHorizontal size={18} />
            </button>

            {/* 展开菜单 */}
            {showMenu && (
              <div className="absolute right-0 top-10 bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl p-2 flex flex-col gap-1.5 min-w-[120px] z-50">
                <button 
                  onClick={() => { setIsLogOpen(!isLogOpen); setShowMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 text-sm"
                >
                  <ScrollText size={16} />
                  <span>战斗日志</span>
                </button>
                <button 
                  onClick={() => { onToggleMute(); setShowMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 text-sm"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{isMuted ? '开启音效' : '静音'}</span>
                </button>
                <div className="h-px bg-white/10 my-1" />
                <button 
                  onClick={() => { onSurrender(); setShowMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-900/30 text-red-400 text-sm"
                >
                  <Flag size={16} />
                  <span>投降</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI思考状态浮动提示 - 独立显示 */}
        {(aiStatus.emote === 'thinking' || aiStatus.emote === 'thinking_fast') && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <div className="bg-black/80 backdrop-blur px-3 py-1.5 rounded-xl border border-amber-500/40 flex items-center gap-2 shadow-lg">
              <span className="text-xs text-amber-300 font-bold">对手思考中</span>
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* 点击外部关闭菜单 */}
        {showMenu && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
        )}
      </>
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
          projection={projection?.target === 'opponent' ? { hpChange: projection.netHpChange || 0, armorChange: projection.netArmorChange || 0 } : null}
        />
        
      {/* AI 表情气泡 */}
      <div className="absolute -right-4 top-0">
        <AIEmoteBubble status={aiStatus} />
      </div>
      
      {/* 对手手牌展示 - 扇形排列 */}
      {/* [P2 Fix #2] 已隐藏对手手牌视觉展示
      <div className="flex justify-center mt-3 relative h-12">
          ...
      </div>
      */}

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
