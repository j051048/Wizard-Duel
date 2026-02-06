/**
 * BattleArena - 战斗场景组件 (Refactored 4.0)
 * 
 * Major refactor to split huge component into sub-components:
 * - OpponentHUD
 * - PlayerHUD
 * - HandArea
 * - DragDropZone
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SpellType, GameLoopState } from '../types';
import { GAME_CONFIG } from '../constants';
import { getPlayableCards, getSpellById } from '../services/gameLogic';
import { HapticService } from '../services/haptic';
import { useIsMobile } from '../hooks/useIsMobile';
import { calculateSpellProjection } from '../services/projection';
import { useSettings } from '../context/SettingsContext';
import { 
  TURN_BANNER_PLAYER_DURATION, TURN_BANNER_OPPONENT_DURATION, LONG_PRESS_THRESHOLD 
} from '../config/timing';

// Components
import { SpellCard } from './SpellCard'; // Needed for Drag Preview
import TargetingArrow from './battle/TargetingArrow';
import CombatLog from './battle/CombatLog';
import BattleBoard from './battle/BattleBoard';
import BattleEffects from './battle/BattleEffects';
import CombatFeed from './battle/CombatFeed';
import TurnBanner from './battle/TurnBanner';
import CardDetailModal from './CardDetailModal';

// New Sub-Components
import { OpponentHUD } from './battle/hud/OpponentHUD';
import { PlayerHUD } from './battle/hud/PlayerHUD';
import { HandArea } from './battle/hand/HandArea';
import { DragDropZone } from './battle/board/DragDropZone';

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


  const { dragState, startDrag, dragX, dragY } = useDragToPlay(
    (id, confirmed) => handlePlayCard(id, confirmed),
    setTargeting,
    gameLoopState.isProcessing,
    phase,
    (id) => playableCards.includes(id),
    updateDragTrail 
  );

  /* 
   * [P0 Fix] 长按与拖拽冲突修复 
   * 当拖拽开始时，立即取消长按计时器，防止在拖拽过程中弹出详情
   */
  useEffect(() => {
    if (dragState?.isDragging && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, [dragState?.isDragging]);

  // Projection Logic
  const projection = useMemo(() => {
    const activeId = dragState?.spellId || hoveredSpellId;
    if (!activeId || !duelState || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing) return null;
    return calculateSpellProjection(duelState, 'player', activeId);
  }, [dragState?.spellId, hoveredSpellId, phase, duelState, gameLoopState.isProcessing]);

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
      const timer = setTimeout(() => setTurnBannerType(null), TURN_BANNER_PLAYER_DURATION);
      return () => clearTimeout(timer);
    }
    // [P0 Fix 3.6] 修正：DuelPhase 中没有 'AI_TURN'，正确值是 'OPPONENT_TURN'
    if (phase === 'OPPONENT_TURN' && prevPhase === 'PLAYER_TURN') {
      setTurnBannerType('opponent');
      const timer = setTimeout(() => setTurnBannerType(null), TURN_BANNER_OPPONENT_DURATION);
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
      }, LONG_PRESS_THRESHOLD);
  };

  const handleCardPressEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };
  
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

      {/* Opponent Area */}
      <div className="w-full flex justify-center items-start pt-4 md:pt-6 z-20 relative safe-area-top">
          <OpponentHUD 
              duelState={duelState}
              aiStatus={aiStatus}
              opponentCard={opponentCard}
              isOpponentShaking={isOpponentShaking}
              projection={projection}
              isMuted={isMuted}
              onToggleMute={onToggleMute}
              onSurrender={onSurrender}
              isLogOpen={isLogOpen}
              setIsLogOpen={setIsLogOpen}
          />
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

      {/* Central Battle Board */}
      <BattleBoard 
        duelState={duelState}
        playerCard={playerCard}
        opponentCard={opponentCard}
        resultText={resultText}
        isMobile={isMobile}
      />

      {/* Drag Drop Zone Overlay */}
      <DragDropZone dragState={dragState} />

      {/* Player Area Layer */}
      <PlayerHUD 
          duelState={duelState}
          phase={phase}
          isProcessing={gameLoopState.isProcessing}
          isPlayerShaking={isPlayerShaking}
          projection={projection}
          onPlayCard={handlePlayCard}
          onPass={() => onPass && onPass()}
      />
      
      {/* Hand Area (Bottom Layer) */}
      <HandArea 
           hand={duelState.playerHand}
           playableCards={playableCards}
           phase={phase}
           isProcessing={gameLoopState.isProcessing}
           isMobile={isMobile}
           dragState={dragState}
           startDrag={startDrag}
           onCardPressStart={handleCardPressStart}
           onCardPressEnd={handleCardPressEnd}
           setHoveredSpellId={setHoveredSpellId}
           handlePlayCard={handlePlayCard}
           shouldShowTutorial={shouldShowTutorial}
      />

      {/* Floating Dragged Card Preview */}
      {dragState?.isDragging && (
        <motion.div 
          className="fixed z-[200] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 scale-125"
          style={{ left: dragX, top: dragY }}
        >
          <SpellCard spell={getSpellById(dragState.spellId)} isSmall={isMobile} isSelected />
        </motion.div>
      )}

      {/* Desktop End Turn Button - Keep standalone for now as it doesn't fit neatly into HUDs without creating whitespace issues */}
      {!isMobile && (
        <div className="absolute right-6 bottom-6 z-40 hidden md:block">
              <button 
                id="end-turn-btn-desktop"
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
      )}

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

      {/* Mobile Combat Feed */}
      <div className={`${isMobile ? 'scale-75 origin-top-left absolute top-32 left-4 pointer-events-none z-30' : ''}`}>
         <CombatFeed messages={effectMessages} />
      </div>

      {detailSpell && (
         <CardDetailModal 
           spell={getSpellById(detailSpell)} 
           onClose={() => setDetailSpell(null)} 
         />
      )}
    </div>
  );
};

export default BattleArena;