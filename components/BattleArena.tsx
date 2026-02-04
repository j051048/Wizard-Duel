/**
 * BattleArena - 战斗场景组件 (Patch 2.0 Turn-Based)
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import { SpellType, DuelPhase, DuelState, GameLoopState, AIStatus, AIEmoteType } from '../types';
import { GAME_CONFIG } from '../constants';
import { getSpellById, getPlayableCards } from '../services/gameLogic';
import { HapticService } from '../services/haptic';
import { PlayerFrame } from './PlayerFrame';
import { SpellCard } from './SpellCard';
import { useIsMobile } from '../hooks/useIsMobile';
import { calculateSpellProjection, SpellProjection } from '../services/projection';
import { useSettings } from '../context/SettingsContext';
import { TutorialOverlay } from './TutorialOverlay';

interface BattleArenaProps {
  gameLoopState: GameLoopState;
  selectedBet: number;
  onPlayCard: (spellId: SpellType, isConfirmed?: boolean) => void;
  onPass?: () => void;
  onSurrender: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPlayerShaking?: boolean;
  isOpponentShaking?: boolean;
  isTavernMode?: boolean;
  setTargeting: (data: GameLoopState['targetingData']) => void;
}

// === 子组件：AI 气泡组件 ===
const AIEmoteBubble: React.FC<{ status: AIStatus }> = ({ status }) => {
  if (!status.emote && !status.message) return null;
  
  const getEmoteIcon = (emote: AIEmoteType | null) => {
    switch (emote) {
      case 'thinking': return '🤔';
      case 'thinking_fast': return '💡';
      case 'laugh': return '😂';
      case 'angry': return '💢';
      case 'surprised': return '😲';
      case 'taunt': return '😏';
      default: return '💬';
    }
  };

  return (
    <div className="absolute -right-32 top-8 z-50 animate-bounce-slight pointer-events-none">
       <div className="relative bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-slate-300 shadow-xl max-w-[150px]">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getEmoteIcon(status.emote)}</span>
            <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
              {status.message}
            </p>
          </div>
          {/* 下标 */}
          <div className="absolute -left-2 top-4 w-4 h-4 bg-white/90 border-l-2 border-b-2 border-slate-300 rotate-45" />
       </div>
    </div>
  );
};

// === 子组件：瞄准指示线 ===
const TargetingArrow: React.FC<{ data: GameLoopState['targetingData'] }> = ({ data }) => {
  if (!data?.isTargeting) return null;
  
  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-[60]">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" opacity="0.8" />
        </marker>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
           <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
           <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path 
        d={`M ${data.startX} ${data.startY} Q ${(data.startX + data.endX)/2 - 50} ${(data.startY + data.endY)/2}, ${data.endX} ${data.endY}`}
        stroke="url(#lineGrad)" 
        strokeWidth="4" 
        fill="none" 
        strokeDasharray="8 8"
        markerEnd="url(#arrowhead)"
        className="animate-dash-move"
      />
    </svg>
  );
};

interface DamageNumber {
  id: number;
  value: number;
  x: number;
  y: number;
  isPlayer: boolean;
  isCrit?: boolean;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  gameLoopState,
  onPlayCard,
  onPass,
  onSurrender,
  isMuted,
  onToggleMute,
  isPlayerShaking = false,
  isOpponentShaking = false,
  setTargeting
}) => {
  const { 
    duelState, phase, playerCard, opponentCard, resultText, effectMessages, aiStatus, targetingData 
  } = gameLoopState;

  const isMobile = useIsMobile();
  const { isLowQuality } = useSettings();
  
  // Canvas 渲染相关
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const prevPlayerHP = useRef(duelState?.playerHP || GAME_CONFIG.maxHP);
  const prevOpponentHP = useRef(duelState?.opponentHP || GAME_CONFIG.maxHP);
  
  // [Patch 3.0] Selected/Preview State
  const [selectedSpellId, setSelectedSpellId] = useState<SpellType | null>(null);
  const [hoveredSpellId, setHoveredSpellId] = useState<SpellType | null>(null);

  const activePreviewId = selectedSpellId || hoveredSpellId;

  const playerSpellDetails = playerCard ? getSpellById(playerCard) : null;
  const oppSpellDetails = opponentCard ? getSpellById(opponentCard) : null;

  const [showCritEffect, setShowCritEffect] = useState(false);
  const [showBloodFlash, setShowBloodFlash] = useState(false);
  const [projectiles, setProjectiles] = useState<{id: number, type: string, x: number, y: number}[]>([]);
  const [isTutorialOpen, setIsTutorialOpen] = useState(duelState?.isTutorial || false);

  useEffect(() => {
    if (duelState?.isTutorial) setIsTutorialOpen(true);
  }, [duelState?.isTutorial]);

  const projection = useMemo(() => {
    if (!activePreviewId || !duelState || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing) return null;
    return calculateSpellProjection(duelState, 'player', activePreviewId);
  }, [activePreviewId, phase, duelState, gameLoopState.isProcessing]);

  // Canvas 动画逻辑
  useEffect(() => {
    if (isLowQuality) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const now = Date.now();
        
        damageNumbersRef.current = damageNumbersRef.current.filter(d => {
            const age = now - d.id;
            if (age > 1200) return false;
            
            const opacity = 1 - age / 1200;
            const yOffset = (age / 1200) * 100;
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = d.isPlayer ? '#ef4444' : '#60a5fa';
            ctx.font = `italic black ${d.isCrit ? '48px' : '36px'} WizardFont, sans-serif`;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            
            const drawX = (d.x / 100) * canvas.width;
            const drawY = (d.y / 100) * canvas.height - yOffset;
            
            ctx.strokeText(`-${d.value}`, drawX, drawY);
            ctx.fillText(`-${d.value}`, drawX, drawY);
            ctx.restore();
            return true;
        });
        
        animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [isLowQuality]);

  const addDamageNumber = (damage: number, isPlayer: boolean, isCrit: boolean = false) => {
    HapticService.medium();
    if (isCrit) HapticService.heavy();

    if (isPlayer) {
       setShowBloodFlash(true);
       setTimeout(() => setShowBloodFlash(false), 400);
    }

    const x = 50 + (Math.random() - 0.5) * 20; 
    const y = isPlayer ? 65 : 25;
    damageNumbersRef.current.push({ id: Date.now(), value: damage, x, y, isPlayer, isCrit });
  };

  useEffect(() => {
    if (!duelState) return;
    if (duelState.playerHP < prevPlayerHP.current) {
        // 触发掉血逻辑
    }
    prevPlayerHP.current = duelState.playerHP;
    prevOpponentHP.current = duelState.opponentHP;
  }, [duelState?.playerHP, duelState?.opponentHP]);

  useEffect(() => {
    if (effectMessages.length > 0) {
      const lastMsg = effectMessages[effectMessages.length - 1];
      const isCrit = lastMsg.includes('暴击');
      
      if (isCrit) {
        setShowCritEffect(true);
        setTimeout(() => setShowCritEffect(false), 800);
      }

      const match = lastMsg.match(/(\d+)\s*点伤害/);
      if (match) {
          const damage = parseInt(match[1]);
          const isPlayerTarget = lastMsg.includes('受到'); 
          addDamageNumber(damage, isPlayerTarget, isCrit); 
      }
    }
  }, [effectMessages]);

  // 追踪组件挂载状态，防止异步回调内存泄漏
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handlePlayCard = (spellId: SpellType, isConfirmed: boolean = false) => {
    if (!duelState) return;
    if (isMobile && !isConfirmed && selectedSpellId !== spellId) {
      setSelectedSpellId(spellId);
      HapticService.light();
      
      // 更新瞄准线位置 (初步位置，后面在渲染手牌处可以更精确获取中心点)
      setTargeting({
          isTargeting: true,
          startX: window.innerWidth / 2,
          startY: window.innerHeight - 100,
          endX: window.innerWidth / 2,
          endY: 150
      });
      return;
    }

    setSelectedSpellId(null);
    setHoveredSpellId(null);
    setTargeting(null);
    
    const id = Date.now();
    if (!isLowQuality) {
      setProjectiles(prev => [...prev, { id, type: 'player', x: 50, y: 80 }]);
    }
    onPlayCard(spellId, isConfirmed);
    setTimeout(() => {
      if (isMounted.current) {
        setProjectiles(prev => prev.filter(p => p.id !== id));
      }
    }, 600);
  };

  const clearSelection = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('arena-bg-overlay')) {
      setSelectedSpellId(null);
      setTargeting(null);
    }
  };

  const prevOppCard = useRef<SpellType | null>(null);
  useEffect(() => {
    if (opponentCard && opponentCard !== prevOppCard.current) {
       const id = Date.now();
       if (!isLowQuality) {
         setProjectiles(prev => [...prev, { id, type: 'opp', x: 50, y: 15 }]);
       }
       setTimeout(() => {
         if (isMounted.current) {
           setProjectiles(prev => prev.filter(p => p.id !== id));
         }
       }, 600);
    }
    prevOppCard.current = opponentCard;
  }, [opponentCard]);

  const playableCards = useMemo(() => getPlayableCards(
    duelState.playerHand, 
    duelState.playerMana, 
    duelState.playerEffects,
    duelState.playerCostMod
  ), [duelState.playerHand, duelState.playerMana, duelState.playerEffects, duelState.playerCostMod]);

  return (
    <div 
      onClick={clearSelection}
      className="fixed inset-0 w-full h-full bg-slate-950 no-select flex flex-col z-40 overflow-hidden"
    >
      {/* === 背景层 === */}
      <div className="absolute inset-0 z-0 pointer-events-none arena-bg-overlay">
        <div className="absolute inset-0 arena-bg-overlay pointer-events-auto opacity-0" />
        <img 
          src="/ui/bg_arena.webp" 
          alt="Arena Background"
          decoding="async"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110 blur-[2px] optimize-gpu"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/80 arena-bg-overlay" />
        {/* 中心法阵 */}
        {!isLowQuality && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <img 
              src="/ui/magic-portal.webp" 
              alt="" 
              decoding="async"
              loading="lazy"
              className="w-[80vmin] h-[80vmin] animate-spin opacity-50"
              style={{ animationDuration: '60s' }}
              onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
            />
          </div>
        )}
      </div>

      {/* === 顶部：对手区 (15% Height / Fixed) === */}
      <div className="w-full h-[15%] min-h-[120px] flex justify-center items-start pt-2 z-20 relative">
          <div className="flex flex-col items-center relative">
            {/* Opponent Avatar */}
            <div className="transform scale-90 md:scale-100 origin-top transition-transform duration-300">
               <PlayerFrame 
                  isPlayer={false}
                  name={duelState?.aiProfile?.name || "黑魔法师"}
                  hp={duelState?.opponentHP || 0}
                  armor={duelState?.opponentArmor || 0}
                  maxHp={GAME_CONFIG.maxHP}
                  mana={duelState?.opponentMana || 0}
                  maxMana={duelState?.opponentMaxMana || 0} 
                  effects={duelState?.opponentEffects || []}
                  isShaking={isOpponentShaking}
                  avatarSrc={duelState?.aiProfile?.avatar}
                  projection={projection?.target === 'opponent' ? { hpChange: projection.netHpChange, armorChange: projection.netArmorChange } : null}
                />
            </div>
            {/* AI Emote Bubble */}
            <AIEmoteBubble status={aiStatus} />

            {/* Opponent Hand (Slightly further down to avoid blocking HUD) */}
            <div className="flex justify-center -space-x-4 scale-75 origin-top mt-1">
                {Array.from({ length: Math.min(duelState?.opponentHandSize || 0, 5) }).map((_, i) => (
                  <div key={i} style={{ transform: `rotate(${(i - 2) * 5}deg)` }} className="opacity-80">
                    <SpellCard isFaceDown isSmall />
                  </div>
                ))}
            </div>
          </div>
      </div>

      {/* Targeting UI */}
      <TargetingArrow data={targetingData} />

      {/* Performance Canvas Layer */}
      {!isLowQuality && (
          <canvas 
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            className="fixed inset-0 pointer-events-none z-50"
          />
      )}

      {/* === 中间：战斗动画区 === */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center my-0 overflow-visible pointer-events-none">
        {/* Opponent Active Card */}
        <div className={`
             transition-all duration-500 transform mb-4
             ${opponentCard ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-90'}
        `}>
          {oppSpellDetails && opponentCard && (
            <div className="relative group pointer-events-auto">
               <SpellCard spell={oppSpellDetails} disabled isSmall={isMobile} />
            </div>
          )}
        </div>

        {/* Player Active Card */}
        <div className={`
             transition-all duration-500 transform mt-4
             ${playerCard ? 'translate-y-0 opacity-100 scale-100 md:scale-110' : 'translate-y-8 opacity-0 scale-90'}
        `}>
          {playerSpellDetails && playerCard && (
            <div className="relative group pointer-events-auto">
               <SpellCard spell={playerSpellDetails} isSelected disabled isSmall={isMobile} />
            </div>
          )}
        </div>
        
        {resultText && (
             <div className="absolute z-50 animate-bounce">
                <div className={`
                  px-8 py-4 rounded-xl font-wizard text-3xl md:text-5xl font-black shadow-[0_0_50px_rgba(0,0,0,0.5)]
                  ${resultText.toUpperCase().includes('WIN') ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-white' : 
                    resultText.toUpperCase().includes('LOSS') ? 'bg-gradient-to-r from-red-700 via-rose-600 to-red-800 text-white' : 
                    'bg-slate-800/90 text-white border border-slate-500 backdrop-blur-lg'}
                `}>
                  {resultText}
                </div>
             </div>
        )}



        {effectMessages.length > 0 && (
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50">
            {/* 只显示最新的一条消息，并让它自动淡出 */}
            <div 
               key={`${effectMessages.length}-${effectMessages[effectMessages.length - 1]}`}
               className="bg-black/60 backdrop-blur-md rounded-full px-8 py-2 border border-purple-500/30 shadow-2xl animate-[messageSlideUpFade_3s_ease-out_forwards]"
            >
              <p className="text-base md:text-lg text-purple-200 font-bold tracking-wider italic shadow-black drop-shadow-md">
                {effectMessages[effectMessages.length - 1]}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* === 底部：玩家操作区 (30-35% Height) === */}
      <div className="w-full h-[35%] min-h-[220px] max-h-[350px] z-30 relative safe-area-bottom">
        <div className="w-full h-full relative flex items-end justify-between px-2 pb-2 md:px-8 md:pb-6">
          
          {/* Left: Player Stats (Bottom Left Corner) */}
          <div className="z-40 transform origin-bottom-left mb-6 md:mb-10 scale-90 md:scale-100">
             <PlayerFrame 
               isPlayer={true}
               name="玩家"
               hp={duelState?.playerHP || 0}
               armor={duelState?.playerArmor || 0}
               maxHp={GAME_CONFIG.maxHP}
               mana={duelState?.playerMana || 0}
               maxMana={duelState?.playerMaxMana || 0}
               effects={duelState?.playerEffects || []}
               isShaking={isPlayerShaking}
               projection={projection?.target === 'player' ? { hpChange: projection.netHpChange, armorChange: projection.netArmorChange } : null}
             />
          </div>

          {/* Center: Hand Cards & Hero Skills */}
          <div className="flex-1 flex flex-col items-center justify-end h-full absolute inset-x-0 bottom-0 pointer-events-none">
             
             {/* Hero Skills Bar (Above Hand) */}
             {duelState && !duelState.heroSkillsUsed && (
               <div className="flex justify-center gap-2 mb-4 pointer-events-auto z-40 transform scale-75 md:scale-90 transition-all origin-bottom">
                 {(['hero_fire', 'hero_vine', 'hero_ice', 'hero_thunder', 'hero_rock'] as const).map((id) => {
                       const spell = getSpellById(id);
                       const canUse = phase === 'PLAYER_TURN' && !gameLoopState.isProcessing;
                       return (
                         <div key={id} className="hover:-translate-y-2 transition-transform shadow-xl rounded-lg">
                           <SpellCard 
                             spell={spell} 
                             onClick={() => canUse && handlePlayCard(id)}
                             onMouseEnter={() => setHoveredSpellId(id)}
                             onMouseLeave={() => setHoveredSpellId(null)}
                             isAffordable={canUse}
                             disabled={!canUse}
                             isSmall
                           />
                         </div>
                       );
                 })}
               </div>
             )}

             {/* Player Hand */}
             <div className={`
                flex justify-center items-end -space-x-8 md:-space-x-4 
                mb-[-10px] md:mb-[-20px] pointer-events-auto
                transition-transform duration-300
                ${duelState?.heroSkillsUsed ? 'translate-y-0' : 'translate-y-4'}
             `}>
                {duelState?.playerHand.map((id, index) => {
                  const isAffordable = playableCards.includes(id);
                  const isSelected = selectedSpellId === id;
                  const total = duelState.playerHand.length;
                  const middleIndex = (total - 1) / 2;
                  const rotation = (index - middleIndex) * 4; 
                  
                  // 选中时升起更明显
                  let yOffset = Math.abs(index - middleIndex) * 8;
                  if (isSelected) {
                    yOffset -= isMobile ? 60 : 100;
                  } else if (!(isAffordable && phase === 'PLAYER_TURN')) {
                    yOffset += 20;
                  }

                  return (
                    <div 
                      key={`${id}-${index}`} 
                      className={`
                        relative transition-all duration-300 transform origin-bottom hover:z-50
                        ${isSelected ? 'z-[100]' : ''}
                        ${phase === 'PLAYER_TURN' && isAffordable ? 'hover:-translate-y-16 hover:scale-125 cursor-pointer' : ''}
                      `}
                      id={`player-card-${index}`}
                      style={{ 
                        zIndex: isSelected ? 100 : index + 10,
                        transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                      }}
                    >
                      <SpellCard 
                        spell={getSpellById(id)} 
                        onClick={(e) => {
                           if (!isAffordable || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing) return;
                           
                           // 更新瞄准起点坐标
                           const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                           setTargeting({
                              isTargeting: true,
                              sourceIndex: index,
                              startX: rect.left + rect.width / 2,
                              startY: rect.top,
                              endX: window.innerWidth / 2,
                              endY: 200
                           });
                           
                           handlePlayCard(id, isSelected);
                        }}
                        onMouseEnter={() => !selectedSpellId && setHoveredSpellId(id)}
                        onMouseLeave={() => setHoveredSpellId(null)}
                        isAffordable={isAffordable}
                        disabled={!isAffordable || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing}
                        isSelected={isSelected}
                        isSmall={isMobile}
                      />
                    </div>
                  );
                })}
             </div>
          </div>

          {/* Right: End Turn & Menu (Bottom Right Corner) */}
          <div className="z-40 w-16 md:w-32 flex flex-col gap-2 md:gap-4 mb-2 md:mb-4 ml-auto">
             <button 
                onClick={() => onPass && onPass()}
                disabled={phase !== 'PLAYER_TURN'}
                className={`
                  relative w-full aspect-square md:aspect-video flex flex-col items-center justify-center rounded-xl shadow-2xl transition-all
                  ${phase === 'PLAYER_TURN' 
                    ? 'bg-gradient-to-br from-amber-500 to-amber-700 border-2 border-amber-300 animate-pulse hover:scale-105 active:scale-95' 
                    : 'bg-slate-800 border-2 border-slate-600 grayscale opacity-70 cursor-not-allowed'}
                `}
              >
                <div className="text-2xl md:text-3xl filter drop-shadow-md">{phase === 'PLAYER_TURN' ? '👉' : '⏳'}</div>
                <div className="text-[10px] md:text-xs font-bold uppercase text-white drop-shadow-md mt-1">
                  {phase === 'PLAYER_TURN' ? '结束' : '等待'}
                </div>
             </button>
             <button 
                onClick={onSurrender}
                className="w-full py-1 md:py-2 flex items-center justify-center rounded bg-red-950/80 border border-red-500/30 text-red-300 text-xs hover:bg-red-900 transition-colors"
              >
                <LogOut size={12} className="mr-1" />
                <span className="hidden md:inline">投降</span>
                <span className="md:hidden">退</span>
             </button>
          </div>

        </div>
      </div>

      <div className="fixed top-4 right-4 z-40 safe-area-top">
        <button onClick={onToggleMute} className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white/60">
           {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {showCritEffect && (
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

      <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
        {projectiles.map(p => (
           <div 
            key={p.id}
            className={`absolute w-12 h-12 rounded-full blur-md z-50 ${p.type === 'player' ? 'bg-gradient-to-t from-purple-500 to-white animate-projectile' : 'bg-gradient-to-b from-red-500 to-white animate-projectile-opp'}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, marginLeft: '-24px' }}
           >
              <div className="absolute inset-0 bg-white rounded-full scale-50 blend-screen" />
           </div>
        ))}
      </div>

      {isTutorialOpen && (
        <TutorialOverlay onComplete={() => setIsTutorialOpen(false)} />
      )}
    </div>
  );
};

export default BattleArena;