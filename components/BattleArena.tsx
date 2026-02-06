/**
 * BattleArena - 战斗场景组件 (Refactored 3.0)
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Volume2, VolumeX, ScrollText, Flag } from 'lucide-react';
import { SpellType, DuelState, GameLoopState } from '../types';
import { GAME_CONFIG, SPELLS } from '../constants';
import { getSpellById, getPlayableCards } from '../services/gameLogic';
import { HapticService } from '../services/haptic';
import { PlayerFrame } from './PlayerFrame';
import { SpellCard } from './SpellCard';
import { useIsMobile } from '../hooks/useIsMobile';
import { calculateSpellProjection } from '../services/projection';
import { useSettings } from '../context/SettingsContext';
// import { TutorialOverlay, TutorialStep } from './tutorial/TutorialOverlay';
import CardDetailModal from './CardDetailModal';
import { TutorialBubble } from './ui/TutorialBubble';

// Components
import AIEmoteBubble from './battle/AIEmoteBubble';
import TargetingArrow from './battle/TargetingArrow';
import CombatLog from './battle/CombatLog';
import BattleBoard from './battle/BattleBoard';
import BattleHand from './battle/BattleHand';
import BattleEffects from './battle/BattleEffects';
import CombatFeed from './battle/CombatFeed';
import { TurnIndicator } from './battle/TurnIndicator';
import { HeroSkillButton } from './battle/HeroSkillButton';
import TurnBanner from './battle/TurnBanner';

// Hooks
import { useDragToPlay } from '../hooks/useDragToPlay';
import { useBattleAnimations } from '../hooks/useBattleAnimations';

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
  
  // States
  const [hoveredSpellId, setHoveredSpellId] = useState<SpellType | null>(null);
  const [hasShownTutorial, setHasShownTutorial] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [detailSpell, setDetailSpell] = useState<SpellType | null>(null);
  
  // [P1 回合横幅] 回合开始显示横幅
  const [turnBannerType, setTurnBannerType] = useState<'player' | 'opponent' | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const prevRoundRef = useRef<number>(0);
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Hooks
  const { 
    canvasRef, showCritEffect, showBloodFlash, projectiles, 
    addDamageNumber, triggerCrit, triggerShake, spawnProjectile, shakeClass,
    updateDragTrail
  } = useBattleAnimations(isLowQuality);

  const playableCards = useMemo(() => {
    if (!duelState) return [];
    return getPlayableCards(
      duelState.playerHand, 
      duelState.playerMana, 
      duelState.playerEffects,
      duelState.playerCostMod
    );
  }, [duelState]);

  const { dragState, startDrag } = useDragToPlay(
    (id, confirmed) => handlePlayCard(id, confirmed),
    setTargeting,
    gameLoopState.isProcessing,
    phase,
    (id) => playableCards.includes(id),
    updateDragTrail 
  );

  // Projection Logic
  const projection = useMemo(() => {
    const activeId = dragState?.spellId || hoveredSpellId;
    if (!activeId || !duelState || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing) return null;
    return calculateSpellProjection(duelState, 'player', activeId);
  }, [dragState?.spellId, hoveredSpellId, phase, duelState, gameLoopState.isProcessing]);

  // Hero Skills Logic
  const heroSkills = useMemo(() => {
    return SPELLS.filter(s => s.id.startsWith('hero_'));
  }, []);

  // [P0 新手引导] 判断是否显示首次出牌气泡
  const shouldShowTutorial = 
    !hasShownTutorial && 
    duelState?.roundNumber === 1 && 
    phase === 'PLAYER_TURN' && 
    !gameLoopState.isProcessing &&
    playableCards.length > 0;

  // Effects Monitoring
  useEffect(() => {
    if (effectMessages.length > 0) {
      const lastMsg = effectMessages[effectMessages.length - 1];
      const isCrit = lastMsg.includes('暴击');
      
      if (isCrit) triggerCrit();

      const match = lastMsg.match(/(\d+)\s*点伤害/);
      if (match) {
          const damage = parseInt(match[1]);
          const isPlayerTarget = lastMsg.includes('受到'); 
          
          let pType: any = 'default';
          if (lastMsg.includes('🔥')) pType = 'fire';
          else if (lastMsg.includes('❄️')) pType = 'ice';
          else if (lastMsg.includes('⚡')) pType = 'thunder';
          else if (lastMsg.includes('🌿')) pType = 'poison';
          else if (lastMsg.includes('🪨')) pType = 'rock';
          
          addDamageNumber(damage, isPlayerTarget, isCrit, pType); 
          triggerShake(pType);
      }
    }
  }, [effectMessages, triggerCrit, addDamageNumber, triggerShake]);

  /* 
  useEffect(() => {
    if (duelState?.isTutorial) setIsTutorialOpen(true);
  }, [duelState?.isTutorial]);
  */

  const prevOppCard = useRef<SpellType | null>(null);
  useEffect(() => {
    if (opponentCard && opponentCard !== prevOppCard.current) {
       spawnProjectile('opp');
    }
    prevOppCard.current = opponentCard;
  }, [opponentCard, spawnProjectile]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // [P1 回合横幅] 检测回合切换，显示横幅
  useEffect(() => {
    if (!duelState) return;
    
    const currentRound = duelState.roundNumber;
    const prevRound = prevRoundRef.current;
    const prevPhase = prevPhaseRef.current;
    
    // 新回合开始时显示玩家回合横幅
    if (currentRound > prevRound && phase === 'PLAYER_TURN') {
      setTurnBannerType('player');
      const timer = setTimeout(() => setTurnBannerType(null), 2500);
      return () => clearTimeout(timer);
    }
    // AI回合开始
    if (phase === 'AI_TURN' && prevPhase === 'PLAYER_TURN') {
      setTurnBannerType('opponent');
      const timer = setTimeout(() => setTurnBannerType(null), 1800);
      return () => clearTimeout(timer);
    }
    
    prevPhaseRef.current = phase;
    prevRoundRef.current = currentRound;
  }, [phase, duelState?.roundNumber]);

  const handlePlayCard = (spellId: SpellType, isConfirmed: boolean = false) => {
    if (!duelState) return;
    
    // [P0 新手引导] 只要出过一张牌，就永久关闭引导
    if (shouldShowTutorial) {
        setHasShownTutorial(true);
    }

    setHoveredSpellId(null);
    setTargeting(null);
    spawnProjectile('player');

    /*
    if (spellId.startsWith('fire')) {
        setTutorialAction('PLAY_FIRE_CARD');
    }
    */

    onPlayCard(spellId, isConfirmed);
  };

  // [P0 修复] 长按检测与拖拽冲突修复：检查是否正在拖拽
  const handleCardPressStart = (spellId: SpellType) => {
      // 清除之前的计时器
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
      }
      
      longPressTimerRef.current = setTimeout(() => {
          // [P0 Fix] 如果正在拖拽，不弹出详情弹窗
          if (dragState?.isDragging) {
              return;
          }
          setDetailSpell(spellId);
          HapticService.medium();
      }, 600);
  };

  const handleCardPressEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };
  
  // [P0 Fix] 拖拽开始时立即清除长按计时器
  useEffect(() => {
      if (dragState?.isDragging && longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  }, [dragState?.isDragging]);

  if (!duelState) return null;

  // [P1 回合横幅] 玩家回合时边框发光
  const isPlayerTurnGlow = phase === 'PLAYER_TURN' && !gameLoopState.isProcessing;

  return (
    <div className={`
      fixed inset-0 w-full h-full bg-slate-950 no-select flex flex-col z-40 overflow-hidden 
      ${shakeClass}
      ${isPlayerTurnGlow ? 'ring-4 ring-amber-500/30 ring-inset' : ''}
    `}>
      {/* [P1 回合横幅] 回合开始全屏横幅 */}
      <TurnBanner type={turnBannerType} roundNumber={duelState?.roundNumber || 1} />
      
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none arena-bg-overlay overflow-hidden">
        <img 
          src="/ui/bg_arena.webp" 
          alt="Arena Background"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110 blur-[2px] optimize-gpu animate-bg-breathing"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/80" />
      </div>

            {/* Opponent Area - 响应式布局 */}
      <div className="w-full flex justify-center items-start pt-4 md:pt-6 z-20 relative safe-area-top">
        {isMobile ? (
          /* ====== 移动端：紧凑横条布局 ====== */
          <div className="mobile-opponent-bar w-[90%] max-w-md">
            {/* 头像 - 缩小至 32px (w-8) */}
            <div className="w-8 h-8 rounded-full overflow-hidden border border-red-500/50 flex-shrink-0 shadow-sm">
              <img 
                src={duelState.aiProfile?.avatar || '/avatars/dark_mage.webp'} 
                alt="Opponent"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* 血条 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-bold truncate max-w-[80px]">
                  {duelState.aiProfile?.name || "对手"}
                </span>
                <span className="text-red-400 font-mono">
                  {duelState.opponentHP}/{GAME_CONFIG.maxHP}
                </span>
              </div>
              <div className="hp-bar">
                <div 
                  className="hp-fill" 
                  style={{ width: `${(duelState.opponentHP / GAME_CONFIG.maxHP) * 100}%` }}
                />
              </div>
            </div>
            
            {/* 法力值指示 */}
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <span className="text-blue-300 font-bold">{duelState.opponentMana}</span>
              <span className="text-blue-400/60">💧</span>
            </div>
            
            {/* 手牌数 */}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span className="font-bold">{duelState.opponentHandSize}</span>
              <span>🃏</span>
            </div>
            
            {/* AI状态指示 */}
            {aiStatus === 'THINKING' && (
              <div className="w-6 h-6 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : (
          /* ====== 桌面端：原有完整布局 ====== */
          <div className="flex flex-col items-center relative">
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
                isThinking={aiStatus === 'THINKING'}
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
          </div>
        )}
      </div>

      <TargetingArrow data={gameLoopState.targetingData} isMobile={isMobile} />
      
      {!isLowQuality && (
          <canvas 
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            className="fixed inset-0 pointer-events-none z-50"
          />
      )}

      <BattleBoard 
        duelState={duelState}
        playerCard={playerCard}
        opponentCard={opponentCard}
        resultText={resultText}
        isMobile={isMobile}
      />

      {/* [P0 新手引导] 拖拽时显示释放区域提示 */}
      {dragState?.isDragging && (
        <div className="fixed inset-0 z-[150] pointer-events-none flex items-center justify-center">
          {/* 释放区域发光提示 */}
          <div 
            className={`
              w-48 h-48 md:w-64 md:h-64 rounded-full 
              border-4 border-dashed 
              flex items-center justify-center
              transition-all duration-300
              ${dragState.isInDropZone 
                ? 'border-green-400 bg-green-500/20 scale-110 shadow-[0_0_60px_rgba(74,222,128,0.5)]' 
                : 'border-amber-400/60 bg-amber-500/10 animate-pulse shadow-[0_0_40px_rgba(251,191,36,0.3)]'
              }
            `}
          >
            <div className={`text-center ${dragState.isInDropZone ? 'scale-110' : ''} transition-transform`}>
              <div className={`text-4xl md:text-5xl mb-2 ${dragState.isInDropZone ? 'animate-bounce' : ''}`}>
                {dragState.isInDropZone ? '✨' : '⬆️'}
              </div>
              <span className={`
                text-sm md:text-base font-bold
                ${dragState.isInDropZone ? 'text-green-300' : 'text-amber-300/80'}
              `}>
                {dragState.isInDropZone ? '松开释放！' : '拖到这里释放'}
              </span>
            </div>
          </div>
          
          {/* 箭头指引 - 从手牌指向释放区 */}
          {!dragState.isInDropZone && (
            <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2">
              <div className="text-amber-400/60 text-3xl animate-bounce">
                ⬆️
              </div>
            </div>
          )}
        </div>
      )}

      {/* Player Area - 响应式布局重构 */}
      <div className="absolute bottom-0 left-0 right-0 z-30 safe-area-bottom">
        
        {isMobile ? (
          /* ====== 移动端底部布局：分层叠加 (手牌在下 + 控制栏悬浮在上) ====== */
          <div className="relative w-full flex flex-col justify-end pointer-events-none">
            
            {/* 1. 底层：横向滚动卡牌 (CSS中已设置 padding-bottom 留出空间) */}
            <div id="player-hand-container" className="w-full relative z-40 pointer-events-auto">
              <TutorialBubble 
                  isVisible={shouldShowTutorial} 
                  text="👆 拖动或点击出牌！" 
                  position="top"
              />
              <BattleHand 
                hand={duelState.playerHand}
                playableCards={playableCards}
                phase={phase}
                isProcessing={gameLoopState.isProcessing}
                isMobile={true}
                dragState={dragState}
                startDrag={startDrag}
                onPointerDownCard={handleCardPressStart}
                onPointerUpCard={handleCardPressEnd}
                onMouseEnterCard={setHoveredSpellId}
                onMouseLeaveCard={() => setHoveredSpellId(null)}
                onDoubleClickCard={(spellId) => handlePlayCard(spellId, true)}
              />
            </div>

            {/* 2. 顶层悬浮：控制栏 (玩家信息、技能、结束按钮) */}
            <div className="absolute bottom-0 left-0 right-0 z-50 flex items-end justify-between px-3 pb-1 w-full pointer-events-none">
              {/* 左侧：玩家简要信息 + 技能 */}
              <div className="flex flex-col gap-2 pointer-events-auto max-w-[70%] mb-1">
                {/* 移动端玩家简报 */}
                <div className="mobile-player-frame flex items-center gap-2 border border-slate-700/50 shadow-lg">
                    {/* 头像 */}
                   <div className="avatar rounded-full overflow-hidden border border-blue-400/50 flex-shrink-0">
                     <img src="/avatars/player-wizard.webp" className="w-full h-full object-cover" alt="Player" />
                   </div>
                   
                   {/* 数值 (HP/Mana) */}
                   <div className="flex flex-col justify-center leading-none gap-0.5">
                     <div className="flex items-center gap-1.5">
                        <span className="text-red-400 font-bold text-xs">{duelState.playerHP}</span>
                        {duelState.playerArmor > 0 && (
                          <span className="text-slate-200 text-[10px] bg-slate-800/80 px-1 rounded flex items-center h-3.5">
                            🛡️{duelState.playerArmor}
                          </span>
                        )}
                     </div>
                     <div className="flex items-center gap-1">
                        <span className="text-blue-300 font-bold text-xs">{duelState.playerMana}</span>
                        <span className="text-[9px] text-blue-400/50">/{duelState.playerMaxMana}</span>
                     </div>
                   </div>

                   {/* Buffs (简化圆点) */}
                   {duelState.playerEffects.length > 0 && (
                     <div className="flex -space-x-1 pl-1">
                        {duelState.playerEffects.map((_, i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded-full bg-yellow-500/50 border border-black shadow-sm" />
                        ))}
                     </div>
                   )}
                </div>

                {/* 英雄技能 (紧凑排列) */}
                <div className="flex gap-2 pl-1 opacity-90 scale-90 origin-bottom-left">
                  {heroSkills.slice(0, 3).map(skill => (
                    <HeroSkillButton
                      key={skill.id}
                      skill={skill}
                      canUse={phase === 'PLAYER_TURN' && !duelState.heroSkillsUsed && !gameLoopState.isProcessing}
                      currentMana={duelState.playerMana}
                      onClick={() => handlePlayCard(skill.id)}
                      compact={true} 
                    />
                  ))}
                </div>
              </div>

              {/* 右侧：结束回合按钮 (紧凑版) */}
              <div className="pointer-events-auto pb-1 mb-0.5">
                <button 
                  id="end-turn-btn"
                  onClick={onPass} 
                  disabled={phase !== 'PLAYER_TURN'} 
                  className={`
                    mobile-end-turn-btn
                    relative font-bold text-white overflow-hidden
                    flex items-center gap-1.5
                    transition-all duration-200
                    ${phase === 'PLAYER_TURN' 
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-95 border-b-2 border-amber-800' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border-b-2 border-slate-900 grayscale opacity-80'
                    }
                  `}
                >
                  <span className="relative z-10 drop-shadow-sm">
                    {phase === 'PLAYER_TURN' ? '结束' : '对手'}
                  </span>
                  {phase === 'PLAYER_TURN' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ====== 桌面端原有布局：绝对定位覆盖 ====== */
          <>
            {/* 手牌区域 */}
            <div id="player-hand-container" className="w-full flex justify-center pb-4 md:pb-6 pointer-events-none relative">
                 {/* [P0 新手引导] 首次出牌气泡 */}
               <TutorialBubble 
                   isVisible={shouldShowTutorial} 
                   text="👆 拖动或双击卡牌打出！" 
                   position="top"
               />
              <BattleHand 
                hand={duelState.playerHand}
                playableCards={playableCards}
                phase={phase}
                isProcessing={gameLoopState.isProcessing}
                isMobile={false}
                dragState={dragState}
                startDrag={startDrag}
                onPointerDownCard={handleCardPressStart}
                onPointerUpCard={handleCardPressEnd}
                onMouseEnterCard={setHoveredSpellId}
                onMouseLeaveCard={() => setHoveredSpellId(null)}
                onDoubleClickCard={(spellId) => handlePlayCard(spellId, true)}
              />
            </div>
          
            {/* 玩家信息框 - 左下角 */}
            <div className="absolute left-2 md:left-6 bottom-4 md:bottom-6 z-40">
              {/* 英雄技能栏 - 头像上方横排显示 */}
              <div id="hero-skills-container" className="flex flex-row gap-2 mb-2 pointer-events-auto justify-start">
                {heroSkills.slice(0, 3).map(skill => (
                  <HeroSkillButton
                    key={skill.id}
                    skill={skill}
                    canUse={phase === 'PLAYER_TURN' && !duelState.heroSkillsUsed && !gameLoopState.isProcessing}
                    currentMana={duelState.playerMana}
                    onClick={() => handlePlayCard(skill.id)}
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
            
            {/* 结束回合按钮 - 右下角 */}
            <div className="absolute right-2 md:right-6 bottom-4 md:bottom-6 z-40">
              <button 
                id="end-turn-btn"
                onClick={onPass} 
                disabled={phase !== 'PLAYER_TURN'} 
                className={`
                  relative px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-sm md:text-base uppercase tracking-wider
                  transition-all duration-300 shadow-2xl
              ${phase === 'PLAYER_TURN' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black border-2 border-amber-300 hover:scale-105 hover:shadow-amber-500/50 active:scale-95' 
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }
            `}
          >
            {phase === 'PLAYER_TURN' ? (
              <span className="flex items-center gap-2">
                <span>结束回合</span>
                <span className="text-lg">👉</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>等待中</span>
                <span className="animate-spin">⏳</span>
              </span>
            )}
          </button>
        </div>
      </>
    )}
  </div>

      {/* Floating Dragged Card */}
      {dragState?.isDragging && (
        <div 
          className="fixed z-[200] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 scale-125 transition-transform duration-200"
          style={{ left: dragState.currentX, top: dragState.currentY }}
        >
          <SpellCard spell={getSpellById(dragState.spellId)} isSmall={isMobile} isSelected />
        </div>
      )}

      {/* Top Right Controls - 移动端更紧凑 */}
      <div className={`fixed z-40 flex gap-2 transition-all ${isMobile ? 'top-2 right-2 gap-1.5' : 'top-4 right-4 safe-area-top'}`}>
        <button 
          onClick={onSurrender} 
          className={`
            backdrop-blur-md rounded-lg border border-red-500/30 text-red-400 hover:text-red-200 hover:bg-red-900/60 transition-colors
            ${isMobile ? 'p-1.5 bg-red-900/30' : 'p-2 bg-red-900/40'}
          `}
          title="投降"
        >
          <Flag size={isMobile ? 16 : 20} />
        </button>
        <button 
          onClick={() => setIsLogOpen(!isLogOpen)} 
          className={`
            backdrop-blur-md rounded-lg border border-white/10 text-white/60 hover:text-white transition-colors
            ${isMobile ? 'p-1.5 bg-black/30' : 'p-2 bg-black/40'}
          `}
        >
          <ScrollText size={isMobile ? 16 : 20} />
        </button>
        <button 
          onClick={onToggleMute} 
          className={`
            backdrop-blur-md rounded-lg border border-white/10 text-white/60 hover:text-white transition-colors
            ${isMobile ? 'p-1.5 bg-black/30' : 'p-2 bg-black/40'}
          `}
        >
           {isMuted ? <VolumeX size={isMobile ? 16 : 20} /> : <Volume2 size={isMobile ? 16 : 20} />}
        </button>
      </div>

      <CombatLog 
        isOpen={isLogOpen} 
        messages={effectMessages} 
        onClose={() => setIsLogOpen(false)} 
      />

      <BattleEffects 
        showCrit={showCritEffect} 
        showBloodFlash={showBloodFlash}
        playerHp={duelState.playerHP}
        maxHp={GAME_CONFIG.maxHP}
      />

      <CombatFeed messages={effectMessages} />

      {detailSpell && (
         <CardDetailModal 
           spell={getSpellById(detailSpell)} 
           onClose={() => setDetailSpell(null)} 
         />
      )}

      {/* Tutorial Overlay Removed - Moved to App.tsx */}
    </div>
  );
};

export default BattleArena;