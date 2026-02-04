/**
 * BattleArena - 战斗场景组件 (Patch 2.0 Turn-Based)
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { LogOut, Volume2, VolumeX, ScrollText, X } from 'lucide-react';
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

  const [isTutorialOpen, setIsTutorialOpen] = useState(duelState?.isTutorial || false);
  const [showCritEffect, setShowCritEffect] = useState(false);
  const [showBloodFlash, setShowBloodFlash] = useState(false);
  const [projectiles, setProjectiles] = useState<{id: number, type: string, x: number, y: number}[]>([]);
  const isMounted = useRef(true);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [tutorialAction, setTutorialAction] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isLogOpen && logEndRef.current) {
        logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLogOpen, effectMessages.length]);
  
  // [New 6.0] Drag to Play State
  const [dragState, setDragState] = useState<{
    spellId: SpellType;
    index: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);

  useEffect(() => {
    if (duelState?.isTutorial) setIsTutorialOpen(true);
  }, [duelState?.isTutorial]);

  // 全局指针移动监听
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState) return;
      setDragState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY, isDragging: true } : null);
      
      // 更新瞄准线
      if (e.clientY < window.innerHeight * 0.7) {
        setTargeting({
          isTargeting: true,
          startX: dragState.startX,
          startY: dragState.startY,
          endX: e.clientX,
          endY: e.clientY
        });
      } else {
        setTargeting(null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragState) return;
      
      const threshold = window.innerHeight * 0.6;
      if (e.clientY < threshold) {
        handlePlayCard(dragState.spellId, true);
      }
      
      setDragState(null);
      setTargeting(null);
    };

    if (dragState) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState]);

  const projection = useMemo(() => {
    const activeId = dragState?.spellId || hoveredSpellId;
    if (!activeId || !duelState || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing) return null;
    return calculateSpellProjection(duelState, 'player', activeId);
  }, [dragState?.spellId, hoveredSpellId, phase, duelState, gameLoopState.isProcessing]);

  // ... (keep canvas logic)
  
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

  useEffect(() => {
    if (!duelState) return;
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

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handlePlayCard = (spellId: SpellType, isConfirmed: boolean = false) => {
    if (!duelState) return;
    
    setSelectedSpellId(null);
    setHoveredSpellId(null);
    setTargeting(null);
    
    const id = Date.now();
    if (!isLowQuality) {
      setProjectiles(prev => [...prev, { id, type: 'player', x: 50, y: 80 }]);
    }

    // [New 6.4] 教学动作检测
    if (spellId.startsWith('fire')) {
        setTutorialAction('PLAY_FIRE_CARD');
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
      <div className="absolute inset-0 z-0 pointer-events-none arena-bg-overlay overflow-hidden">
        <div className="absolute inset-0 arena-bg-overlay pointer-events-auto opacity-0" />
        <img 
          src="/ui/bg_arena.webp" 
          alt="Arena Background"
          decoding="async"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110 blur-[2px] optimize-gpu animate-bg-breathing"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/80 arena-bg-overlay" />
      </div>

      {/* === 顶部：对手区 === */}
      <div className="w-full h-[15%] min-h-[120px] flex justify-center items-start pt-2 z-20 relative">
          <div className="flex flex-col items-center relative">
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
            <AIEmoteBubble status={aiStatus} />
            <div className="flex justify-center -space-x-4 scale-75 origin-top mt-1">
                {Array.from({ length: Math.min(duelState?.opponentHandSize || 0, 5) }).map((_, i) => (
                  <div key={i} style={{ transform: `rotate(${(i - 2) * 5}deg)` }} className="opacity-80">
                    <SpellCard isFaceDown isSmall />
                  </div>
                ))}
            </div>
          </div>
      </div>

      <TargetingArrow data={targetingData} />

      {!isLowQuality && (
          <canvas 
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            className="fixed inset-0 pointer-events-none z-50"
          />
      )}

      <div className="flex-1 relative z-10 flex flex-col items-center justify-around pointer-events-none w-full">
        {/* Opponent Minions Board */}
        <div className="flex justify-center gap-4 w-full h-32 items-center">
            {duelState?.opponentMinions.map(minion => (
              <div key={minion.instanceId} className="w-20 h-28 bg-slate-800 border-2 border-red-500/50 rounded-lg flex flex-col items-center justify-center relative shadow-lg animate-fade-in-up">
                  <div className="text-[10px] text-white/50 absolute top-1">{minion.name}</div>
                  <div className="text-2xl">👾</div>
                  <div className="absolute bottom-1 left-1 bg-slate-900 border border-white/20 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-400">{minion.atk}</div>
                  <div className="absolute bottom-1 right-1 bg-slate-900 border border-white/20 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-green-400">{minion.hp}</div>
              </div>
            ))}
        </div>

        {/* Action/Spell Display Slot */}
        <div className="relative h-48 w-full flex flex-col items-center justify-center">
          <div className={`transition-all duration-500 transform absolute top-0 ${opponentCard ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-90'}`}>
            {oppSpellDetails && opponentCard && <SpellCard spell={oppSpellDetails} disabled isSmall={isMobile} />}
          </div>
          <div className={`transition-all duration-500 transform absolute bottom-0 ${playerCard ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-90'}`}>
            {playerSpellDetails && playerCard && <SpellCard spell={playerSpellDetails} isSelected disabled isSmall={isMobile} />}
          </div>
          
          {resultText && (
            <div className="absolute z-50 animate-bounce">
              <div className={`px-8 py-4 rounded-xl font-wizard text-3xl md:text-5xl font-black shadow-2xl ${resultText.toUpperCase().includes('WIN') ? 'bg-yellow-500 text-white' : 'bg-red-700 text-white'}`}>
                {resultText}
              </div>
            </div>
          )}
        </div>

        {/* Player Minions Board */}
        <div className="flex justify-center gap-4 w-full h-32 items-center">
            {duelState?.playerMinions.map(minion => (
              <div key={minion.instanceId} className="w-20 h-28 bg-slate-800 border-2 border-blue-500/50 rounded-lg flex flex-col items-center justify-center relative shadow-lg animate-fade-in-down">
                  <div className="text-[10px] text-white/50 absolute top-1">{minion.name}</div>
                  <div className="text-2xl">🛡️</div>
                  <div className="absolute bottom-1 left-1 bg-slate-900 border border-white/20 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-400">{minion.atk}</div>
                  <div className="absolute bottom-1 right-1 bg-slate-900 border border-white/20 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-green-400">{minion.hp}</div>
              </div>
            ))}
        </div>
      </div>

      {/* === 底部：玩家操作区 === */}
      <div className="w-full h-[35%] min-h-[220px] max-h-[350px] z-30 relative safe-area-bottom">
        <div className="w-full h-full relative flex items-end justify-between px-2 pb-2 md:px-8 md:pb-6">
          <div className="z-40 mb-6 scale-90 md:scale-100">
             <PlayerFrame 
               isPlayer={true}
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

          <div className="flex-1 flex flex-col items-center justify-end h-full absolute inset-x-0 bottom-0 pointer-events-none">
             {/* Player Hand */}
             <div className="flex justify-center items-end -space-x-8 md:-space-x-4 mb-[-10px] pointer-events-auto">
                {duelState?.playerHand.map((id, index) => {
                  const isAffordable = playableCards.includes(id);
                  const isBeingDragged = dragState?.index === index;
                  const middleIndex = (duelState.playerHand.length - 1) / 2;
                  
                  return (
                    <div 
                      key={`${id}-${index}`} 
                      className={`relative transition-all duration-300 transform origin-bottom hover:z-50 ${isBeingDragged ? 'opacity-0' : ''}`}
                      style={{ 
                        transform: `rotate(${(index - middleIndex) * 4}deg) translateY(${Math.abs(index - middleIndex) * 8}px)`,
                      }}
                    >
                      <SpellCard 
                        spell={getSpellById(id)} 
                        onPointerDown={(e) => {
                          if (!isAffordable || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing) return;
                          HapticService.light();
                          setDragState({
                            spellId: id,
                            index,
                            startX: e.clientX,
                            startY: e.clientY,
                            currentX: e.clientX,
                            currentY: e.clientY,
                            isDragging: false
                          });
                        }}
                        onMouseEnter={() => setHoveredSpellId(id)}
                        onMouseLeave={() => setHoveredSpellId(null)}
                        isAffordable={isAffordable}
                        disabled={!isAffordable || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing}
                        isSmall={isMobile}
                      />
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="z-40 w-16 md:w-32 flex flex-col gap-2 mb-2 ml-auto">
             <button onClick={onPass} disabled={phase !== 'PLAYER_TURN'} className={`relative w-full aspect-square md:aspect-video flex flex-col items-center justify-center rounded-xl shadow-2xl transition-all ${phase === 'PLAYER_TURN' ? 'bg-amber-600 border-2 border-amber-300' : 'bg-slate-800'}`}>
                <div className="text-xl">{phase === 'PLAYER_TURN' ? '👉' : '⏳'}</div>
             </button>
          </div>
        </div>
      </div>

      {/* Floating Drag Effect */}
      {dragState?.isDragging && (
        <div 
          className="fixed z-[200] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 scale-125 transition-transform duration-200"
          style={{ left: dragState.currentX, top: dragState.currentY }}
        >
          <SpellCard spell={getSpellById(dragState.spellId)} isSmall={isMobile} isSelected />
        </div>
      )}

      <div className="fixed top-4 right-4 z-40 safe-area-top flex gap-2">
        <button 
          onClick={() => setIsLogOpen(!isLogOpen)} 
          className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white/60 hover:text-white transition-colors"
          title="对战日志"
        >
          <ScrollText size={20} />
        </button>
        <button onClick={onToggleMute} className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white/60">
           {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* [New 6.2] 战斗日志面板 (Combat Log Sidebar) */}
      <div className={`
        fixed left-0 top-0 bottom-0 w-64 md:w-80 bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-[100] transform transition-transform duration-300 ease-out shadow-2xl
        ${isLogOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-amber-400 font-wizard uppercase tracking-widest text-sm">
                <ScrollText size={16} />
                <span>对战日志</span>
            </div>
            <button onClick={() => setIsLogOpen(false)} className="text-white/40 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="h-[calc(100%-60px)] overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {effectMessages.length === 0 ? (
                <div className="text-white/20 text-xs text-center mt-10">暂无战斗记录</div>
              ) : (
                effectMessages.map((msg, i) => (
                  <div key={i} className="flex gap-2 group animate-fade-in-up">
                    <div className="text-[10px] text-white/20 mt-1 font-mono">{(i+1).toString().padStart(2, '0')}</div>
                    <div className={`text-xs leading-relaxed ${msg.includes('玩家') ? 'text-blue-300' : msg.includes('对手') ? 'text-red-300' : 'text-gray-300'}`}>
                      {msg}
                    </div>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
          </div>
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
        <TutorialOverlay 
          onComplete={() => {
            setIsTutorialOpen(false);
            setTutorialAction(undefined);
          }} 
          lastAction={tutorialAction}
        />
      )}
    </div>
  );
};

export default BattleArena;