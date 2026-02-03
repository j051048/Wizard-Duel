/**
 * BattleArena - 战斗场景组件 (Patch 2.0 Turn-Based)
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import { SpellType, DuelPhase, DuelState } from '../types';
import { GAME_CONFIG } from '../constants';
import { getSpellById } from '../services/gameLogic';
import { getPlayableCards } from '../services/gameLogic';
import { HapticService } from '../services/haptic';
import { PlayerFrame } from './PlayerFrame';
import { SpellCard } from './SpellCard';
import { useIsMobile } from '../hooks/useIsMobile';

interface BattleArenaProps {
  duelState: DuelState;
  phase: DuelPhase;
  playerCard: SpellType | null;
  opponentCard: SpellType | null;
  resultText: string;
  effectMessages: string[];
  selectedBet: number;
  onPlayCard: (spellId: SpellType) => void;
  onPass?: () => void;
  onSurrender: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPlayerShaking?: boolean;
  isOpponentShaking?: boolean;
  isTavernMode?: boolean;
}

interface DamageNumber {
  id: number;
  value: number;
  x: number;
  y: number;
  isPlayer: boolean;
  isCrit?: boolean;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  duelState,
  phase,
  playerCard,
  opponentCard,
  resultText,
  effectMessages,
  onPlayCard,
  onPass,
  onSurrender,
  isMuted,
  onToggleMute,
  isPlayerShaking = false,
  isOpponentShaking = false,
}) => {
  const isMobile = useIsMobile();
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const damageIdRef = useRef(0);
  const prevPlayerHP = useRef(duelState?.playerHP || GAME_CONFIG.maxHP);
  const prevOpponentHP = useRef(duelState?.opponentHP || GAME_CONFIG.maxHP);

  const playerSpellDetails = playerCard ? getSpellById(playerCard) : null;
  const oppSpellDetails = opponentCard ? getSpellById(opponentCard) : null;

  const [showCritEffect, setShowCritEffect] = useState(false);
  const [showBloodFlash, setShowBloodFlash] = useState(false);
  const [projectiles, setProjectiles] = useState<{id: number, type: string, x: number, y: number}[]>([]);

  const addDamageNumber = (damage: number, isPlayer: boolean, isCrit: boolean = false) => {
    HapticService.medium();
    if (isCrit) HapticService.heavy();

    if (isPlayer) {
       setShowBloodFlash(true);
       setTimeout(() => setShowBloodFlash(false), 400);
    }

    const id = damageIdRef.current++;
    const x = 50 + (Math.random() - 0.5) * 20; 
    const y = isPlayer ? 65 : 25;
    setDamageNumbers(prev => [...prev, { id, value: damage, x, y, isPlayer, isCrit }]);
    
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id));
    }, 1200);
  };

  useEffect(() => {
    if (duelState.playerHP < prevPlayerHP.current) {
        HapticService.heavy(); 
    }
    prevPlayerHP.current = duelState.playerHP;

    if (duelState.opponentHP < prevOpponentHP.current) {
        HapticService.heavy(); 
    }
    prevOpponentHP.current = duelState.opponentHP;
  }, [duelState.playerHP, duelState.opponentHP]);

  useEffect(() => {
    if (effectMessages.length > 0) {
      const lastMsg = effectMessages[effectMessages.length - 1];
      const isCrit = lastMsg.includes('暴击');
      
      if (isCrit) {
        setShowCritEffect(true);
        setTimeout(() => setShowCritEffect(false), 800);
      }

      if (lastMsg.includes('造成') || lastMsg.includes('受到')) {
        const match = lastMsg.match(/(\d+)\s*点伤害/);
        if (match) {
          const damage = parseInt(match[1]);
          const isPlayerTarget = lastMsg.includes('受到'); 
          addDamageNumber(damage, isPlayerTarget, isCrit); 
        }
      }
    }
  }, [effectMessages]);

  // 追踪组件挂载状态，防止异步回调内存泄漏
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handlePlayCard = (spellId: SpellType) => {
    const id = Date.now();
    setProjectiles(prev => [...prev, { id, type: 'player', x: 50, y: 80 }]);
    onPlayCard(spellId);
    setTimeout(() => {
      if (isMounted.current) {
        setProjectiles(prev => prev.filter(p => p.id !== id));
      }
    }, 600);
  };

  const prevOppCard = useRef<SpellType | null>(null);
  useEffect(() => {
    if (opponentCard && opponentCard !== prevOppCard.current) {
       const id = Date.now();
       setProjectiles(prev => [...prev, { id, type: 'opp', x: 50, y: 15 }]);
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
    <div className="relative min-h-full w-full bg-slate-950 no-select flex flex-col z-40">
      {/* === 背景层 === */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src="/ui/bg_arena.webp" 
          alt="Arena Background"
          decoding="async"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110 blur-[2px] optimize-gpu"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-slate-950/20" />
        {/* 中心法阵 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <img 
            src="/ui/magic-portal.webp" 
            alt="" 
            decoding="async"
            loading="lazy"
            className="w-[90vh] h-[90vh] animate-spin opacity-50"
            style={{ animationDuration: '60s' }}
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
      </div>

      {/* === 顶部：对手区 === */}
      <div className="w-full pt-2 px-2 z-20 flex-shrink-0 flex flex-col items-center">
          <div className="w-full max-w-sm transform transition-all duration-300 origin-top scale-90 md:scale-100">
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
            />
          </div>
          <div className="flex justify-center -space-x-4 scale-75 origin-top mt-1">
              {Array.from({ length: Math.min(duelState.opponentHandSize, 5) }).map((_, i) => (
                <div key={i} style={{ transform: `rotate(${(i - 2) * 4}deg)` }}>
                  <SpellCard isFaceDown isSmall />
                </div>
              ))}
          </div>
      </div>

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
             ${playerCard ? 'translate-y-0 opacity-100 scale-110' : 'translate-y-8 opacity-0 scale-90'}
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

        {damageNumbers.map(damage => (
            <div 
              key={damage.id} 
              className={`absolute pointer-events-none text-5xl font-black italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] ${
                damage.isPlayer ? 'text-red-500' : 'text-blue-400'
              } animate-[damageFloat_0.8s_ease-out_forwards]`}
              style={{
                left: `${damage.x}%`,
                top: `${damage.y}%`,
                willChange: 'transform, opacity'
              }}
            >
            -{damage.value}
          </div>
        ))}

        {effectMessages.length > 0 && (
          <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
            {effectMessages.slice(-2).map((msg, i) => (
              <div key={i} className="bg-black/80 backdrop-blur-xl rounded-2xl px-6 py-2 border border-purple-500/50 shadow-2xl animate-fade-in-up">
                <p className="text-sm md:text-base text-purple-200 font-bold text-center italic">
                  {msg}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === 底部：玩家操作区 === */}
      <div className="w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-2 pb-1 px-2 z-30 flex-shrink-0 relative safe-area-bottom">
        <div className="max-w-6xl mx-auto flex flex-col gap-2">
          
          {/* Top Row: Hero Skills & Hand */}
          <div className="flex justify-between items-end relative h-28 md:h-40">
             
             {/* Left: Player Stats (Mobile Compact) */}
             <div className="absolute left-0 bottom-0 z-40 w-48 md:w-64 transform scale-90 md:scale-100 origin-bottom-left">
                <PlayerFrame 
                  isPlayer={true}
                  name="玩家"
                  hp={duelState.playerHP}
                  armor={duelState.playerArmor}
                  maxHp={GAME_CONFIG.maxHP}
                  mana={duelState.playerMana}
                  maxMana={duelState.playerMaxMana}
                  effects={duelState.playerEffects}
                  isShaking={isPlayerShaking}
                />
             </div>

             {/* Center: Hand Cards */}
             <div className="flex-1 flex justify-center items-end pl-44 md:pl-64 pr-16 md:pr-32 pb-2">
                <div className="flex justify-center items-end -space-x-8 md:-space-x-4 min-h-[100px]">
                    {duelState.playerHand.map((id, index) => {
                      const isAffordable = playableCards.includes(id);
                      const total = duelState.playerHand.length;
                      const middleIndex = (total - 1) / 2;
                      const rotation = (index - middleIndex) * 5;
                      const yOffset = Math.abs(index - middleIndex) * 6;

                      return (
                        <div 
                          key={`${id}-${index}`} 
                          className={`
                            relative transition-all duration-300 transform origin-bottom
                            ${phase === 'PLAYER_TURN' && isAffordable ? 'active:-translate-y-8 md:hover:-translate-y-16 hover:scale-110' : ''}
                          `}
                          style={{ 
                            zIndex: index + 10,
                            transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                          }}
                        >
                          <SpellCard 
                            spell={getSpellById(id)} 
                            onClick={() => isAffordable && phase === 'PLAYER_TURN' && handlePlayCard(id)}
                            isAffordable={isAffordable}
                            disabled={!isAffordable || phase !== 'PLAYER_TURN'}
                            isSelected={false}
                            isSmall={isMobile}
                          />
                        </div>
                      );
                    })}
                </div>
             </div>

             {/* Right: End Turn Button */}
             <div className="absolute right-0 bottom-0 z-40 w-14 md:w-28 flex flex-col gap-2">
                 <button 
                    onClick={() => onPass && onPass()}
                    disabled={phase !== 'PLAYER_TURN'}
                    className={`
                      relative w-full aspect-square flex flex-col items-center justify-center rounded-lg shadow-lg
                      ${phase === 'PLAYER_TURN' 
                        ? 'bg-amber-600 border-2 border-amber-400 animate-pulse' 
                        : 'bg-slate-800 border-2 border-slate-700 grayscale opacity-70'}
                    `}
                  >
                    <div className="text-xl md:text-3xl">{phase === 'PLAYER_TURN' ? '⏭️' : '⏳'}</div>
                 </button>
                 <button 
                    onClick={onSurrender}
                    className="w-full h-8 flex items-center justify-center rounded bg-red-900/50 border border-red-500/20 text-red-300 text-xs"
                  >
                    <LogOut size={12} />
                 </button>
             </div>
          </div>
          
          {/* Hero Skills Bar (Optional / Above) */}
          <div className="flex justify-center gap-2 pb-1">
             {(['hero_fire', 'hero_vine', 'hero_ice', 'hero_thunder', 'hero_rock'] as const).map((id) => {
                  const spell = getSpellById(id);
                  const canUse = phase === 'PLAYER_TURN' && !duelState.heroSkillsUsed;
                  return (
                    <div key={id} className="transform scale-75 md:scale-90 origin-bottom hover:-translate-y-1 transition-transform">
                      <SpellCard 
                        spell={spell} 
                        onClick={() => canUse && handlePlayCard(id)}
                        isAffordable={canUse}
                        disabled={!canUse}
                        isSmall
                      />
                    </div>
                  );
             })}
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
    </div>
  );
};

export default BattleArena;