/**
 * BattleArena - 战斗场景组件 (Refactored 4.0)
 *
 * Major refactor to split huge component into sub-components:
 * - OpponentHUD
 * - PlayerHUD
 * - HandArea
 * - DragDropZone
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SpellType, GameLoopState } from '../types';
import { GAME_CONFIG } from '../constants';
import { getPlayableCards, getSpellById } from '../services/gameLogic';
import { useIsMobile } from '../hooks/useIsMobile';
import { calculateSpellProjection } from '../services/projection';
import { useSettings } from '../context/SettingsContext';
import { pvpService } from '../services/pvpService';

// Components
import { SpellCard } from './SpellCard'; // Needed for Drag Preview
import TargetingArrow from './battle/TargetingArrow';
import CombatLog from './battle/CombatLog';
import BattleBoard from './battle/BattleBoard';
import BattleEffects from './battle/BattleEffects';
import CombatFeed from './battle/CombatFeed';
import TurnBanner from './battle/TurnBanner';
import { TurnTimer } from './battle/TurnTimer';
import CardDetailModal from './CardDetailModal';
import SpellCastEffect from './battle/SpellCastEffect';
import ElementIndicator from './battle/ElementIndicator';

// New Sub-Components
// New Sub-Components
import { OpponentHUD } from './battle/hud/OpponentHUD';
import { PlayerHUD } from './battle/hud/PlayerHUD';
import { HandArea } from './battle/hand/HandArea';
import { DragDropZone } from './battle/board/DragDropZone';
import { FloatingTextOverlay } from './battle/feedback/FloatingText';
import { FloatingActionLog } from './battle/FloatingActionLog';
import { SoundManager } from '../services/SoundManager';

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
  pvpRoomId?: string; // [P1] PVP 房间 ID，有值时才启用 PVP 模式
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
  setTargeting,
  pvpRoomId,
}) => {
  const { duelState, phase, playerCard, opponentCard, resultText, effectMessages, aiStatus } =
    gameLoopState;

  const isMobile = useIsMobile();
  const { isLowQuality } = useSettings();

  // States
  const [hoveredSpellId, setHoveredSpellId] = useState<SpellType | null>(null);
  const [hasShownTutorial, setHasShownTutorial] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [detailSpell, setDetailSpell] = useState<SpellType | null>(null);

  // [P0+P1] PVP 模式由 pvpRoomId 是否有值来决定，不再硬编码
  const isPVPMode = !!pvpRoomId;

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const isRemoteActionRef = useRef(false); // [PVP] 标记是否为远程同步过来的操作，防止无限循环
  const playerIdRef = useRef<string>(`player-${Date.now()}`); // [PVP] 玩家唯一ID

  // [P0] 用 Ref 存储最新回调引用，避免 useEffect 因引用变化重复触发
  const onPlayCardRef = useRef(onPlayCard);
  const onPassRef = useRef(onPass);
  useEffect(() => {
    onPlayCardRef.current = onPlayCard;
  }, [onPlayCard]);
  useEffect(() => {
    onPassRef.current = onPass;
  }, [onPass]);

  // Hooks
  const {
    canvasRef,
    showCritEffect,
    showBloodFlash,
    floatingTexts,
    addDamageNumber,
    triggerCrit,
    triggerShake,
    spawnProjectile,
    shakeClass,
    updateDragTrail,
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
    id => playableCards.includes(id),
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

  // Projection Logic - [P1-20] hover即显示伤害预览
  const projection = useMemo(() => {
    const activeId = dragState?.spellId || hoveredSpellId;
    if (!activeId || !duelState || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing)
      return null;
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
    return () => {
      isMounted.current = false;
    };
  }, []);

  // [P0] PVP WebSocket 连接 — 只在 pvpRoomId 有值时连接，依赖固定，不再因回调变化而重连
  useEffect(() => {
    if (!pvpRoomId) return; // [P1] 非 PVP 模式不连接 WebSocket

    // 清理旧的单机存档，防止进入 PVP 时被状态恢复劫持
    if (localStorage.getItem('wizard_duel_state')) {
      console.log('🧹 [PVP_INIT] 清理本地旧存档，确保联网环境纯净');
      localStorage.removeItem('wizard_duel_state');
    }

    console.log(`[PVP] 正在连接服务器: ${pvpRoomId}...`);

    pvpService.connect(pvpRoomId, playerIdRef.current, data => {
      if (!isMounted.current) return;

      console.log('📩 [PVP] 收到远程数据:', data);

      if (data.type === 'ACTION' && data.action) {
        const action = data.action;

        // 如果是自己发出的广播（被后端传回），则忽略
        if (action.playerId === playerIdRef.current) return;

        // 标记为远程操作，避免本地执行时再次广播
        isRemoteActionRef.current = true;

        try {
          if (action.type === 'PLAY_CARD' && action.spellId) {
            console.log(`🔥 [PVP] 执行对手法术: ${action.spellId}`);
            // [P0] 通过 ref 访问最新的回调，避免闭包捕获旧引用
            onPlayCardRef.current(action.spellId, action.isConfirmed);
          } else if (action.type === 'END_TURN') {
            console.log('⏳ [PVP] 对手结束回合');
            onPassRef.current?.();
          }
        } finally {
          setTimeout(() => {
            isRemoteActionRef.current = false;
          }, 200);
        }
      } else if (data.type === 'PLAYER_JOINED') {
        console.log('👥 [PVP] 对手已进入房间:', data.player_id);
      }
    });

    return () => {
      pvpService.disconnect();
    };
  }, [pvpRoomId]); // [P0] 只依赖 pvpRoomId，不再依赖回调函数引用

  // [P2 Fix #21] Dynamic BGM: 根据 HP 比例动态调整音乐气氛
  useEffect(() => {
    if (duelState && !isMuted) {
      SoundManager.updateBattleBGM(duelState.playerHP, duelState.opponentHP, GAME_CONFIG.maxHP);
    }
  }, [duelState?.playerHP, duelState?.opponentHP, isMuted]);

  // [P0 Fix A-2] TurnBanner 逻辑已移除，统一由 useTurnManager.showTurnBanner 控制
  // 通过 gameLoopState.turnBanner 传入 TurnBanner 组件

  const handlePlayCard = (spellId: SpellType, isConfirmed: boolean = false) => {
    if (!duelState) return;

    // [P0 新手引导] 只要出过一张牌，就永久关闭引导
    if (shouldShowTutorial) {
      setHasShownTutorial(true);
    }

    setHoveredSpellId(null);
    setTargeting(null);
    spawnProjectile('player');

    // [PVP] 只有本地操作才广播给对手，避免无限循环
    if (isPVPMode && !isRemoteActionRef.current) {
      pvpService.sendAction({
        type: 'ACTION',
        action: {
          type: 'PLAY_CARD',
          spellId,
          isConfirmed,
          playerId: playerIdRef.current,
          timestamp: Date.now(),
        },
      });
    }

    onPlayCard(spellId, isConfirmed);
  };

  // [P0 修复] 长按检测与拖拽冲突修复：检查是否正在拖拽
  // (handleCardPressStart 已移除，因不再通过 BattleHand 传递)

  const handleCardPressEnd = () => {
    // 保留作为防错
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // [PVP] 结束回合处理函数
  const handleEndTurn = useCallback(() => {
    // [PVP] 只有本地操作才广播给对手，避免无限循环
    if (isPVPMode && !isRemoteActionRef.current && phase === 'PLAYER_TURN') {
      pvpService.sendAction({
        type: 'ACTION',
        action: {
          type: 'END_TURN',
          playerId: playerIdRef.current,
          timestamp: Date.now(),
        },
      });
    }

    if (onPass) {
      onPass();
    }
  }, [isPVPMode, phase, onPass]);

  if (!duelState) return null;

  // 玩家回合时边框发光
  const isPlayerTurnGlow = phase === 'PLAYER_TURN' && !gameLoopState.isProcessing;

  return (
    <div
      className={`
      fixed inset-0 w-full h-full bg-slate-950 no-select flex flex-col z-40 overflow-hidden 
            ${shakeClass}
      ${isPlayerTurnGlow ? 'ring-4 ring-amber-500/30 ring-inset' : ''}
    `}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* [P0 Fix A-2] 回合横幅 — 统一由 useTurnManager 驱动 */}
      <TurnBanner type={gameLoopState.turnBanner} roundNumber={duelState?.roundNumber || 1} />

      {/* Background - [P1-18] 低端机降级优化 */}
      <div className="absolute inset-0 z-0 pointer-events-none arena-bg-overlay overflow-hidden">
        <img
          src="/ui/bg_arena.webp"
          alt="Arena Background"
          className={`absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110 optimize-gpu ${isLowQuality ? '' : 'blur-[2px] animate-bg-breathing'}`}
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/80" />
      </div>

      <FloatingTextOverlay items={floatingTexts} />

      {/* PVP 状态指示器 - 强提醒版 */}
      <div className="fixed top-4 left-4 z-[99] animate-pulse">
        <span
          className={`px-2 py-1 rounded text-[10px] font-bold ${isPVPMode ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
        >
          {isPVPMode ? 'PVP: ONLINE' : 'PVP: OFFLINE'}
        </span>
      </div>

      {/* [P1] Spell Cast Effects */}
      <SpellCastEffect spellId={playerCard} caster="player" />
      <SpellCastEffect spellId={opponentCard} caster="opponent" />

      {/* [P1] Element Counter Indicator */}
      <ElementIndicator
        opponentLastSpell={duelState?.opponentLastSpell || null}
        isPlayerTurn={phase === 'PLAYER_TURN' && !gameLoopState.isProcessing}
      />

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
          className="fixed inset-0 pointer-events-none z-50"
          style={{ width: '100%', height: '100%' }}
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
        onPass={handleEndTurn}
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
            id="end-turn-btn"
            onClick={handleEndTurn}
            disabled={phase !== 'PLAYER_TURN'}
            className={`
                  relative px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-sm md:text-base uppercase tracking-wider
                  shadow-2xl
                  transition-all duration-150 ease-[cubic-bezier(0.34, 1.56, 0.64, 1)]
              ${
                phase === 'PLAYER_TURN'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black border-2 border-amber-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] active:scale-90'
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

      <CombatLog isOpen={isLogOpen} messages={effectMessages} onClose={() => setIsLogOpen(false)} />

      <BattleEffects
        showCrit={showCritEffect}
        showBloodFlash={showBloodFlash}
        playerHp={duelState.playerHP}
        maxHp={GAME_CONFIG.maxHP}
      />

      {/* [P2 Fix #19] Floating Action Log — 常驻最近5条 */}
      {!isMobile && <FloatingActionLog messages={effectMessages} maxVisible={5} />}

      {/* Mobile Combat Feed - [P1-21] 改进移动端可读性 */}
      <div
        className={`${isMobile ? 'fixed top-16 left-2 z-30 pointer-events-none max-w-[180px]' : ''}`}
      >
        <CombatFeed messages={effectMessages} isMobile={isMobile} />
      </div>

      {/* [P0 Fix A-3] 回合计时器 — 统一在 BattleArena 内部渲染，由 useTurnManager 驱动 */}
      <TurnTimer
        isActive={phase === 'PLAYER_TURN' && !gameLoopState.isProcessing}
        duration={60}
        warningTime={15}
        onTimeUp={handleEndTurn}
      />

      {detailSpell && (
        <CardDetailModal spell={getSpellById(detailSpell)} onClose={() => setDetailSpell(null)} />
      )}
    </div>
  );
};

export default BattleArena;
