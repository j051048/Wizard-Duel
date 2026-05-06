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
import { SpellType, GameLoopState, DuelPhase } from '../types';
import { GAME_CONFIG } from '../constants';
import { getPlayableCards, getSpellById, spellNeedsTarget } from '../services/gameLogic';
import { getElementType } from '../services/combat/elementSystem';
import { useIsMobile } from '../hooks/useIsMobile';
import { calculateSpellProjection } from '../services/projection';
import { useSettingsStore } from '../stores/useSettingsStore';
import { pvpService } from '../services/pvpService';
import { useUserStore } from '../stores/useUserStore';
import { useBattleStore } from '../stores/useBattleStore';

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
import { DebuffOverlay } from './battle/DebuffOverlay';
import { TargetSelector } from './battle/TargetSelector';
import { HeroSkillSelection } from './battle/HeroSkillSelection';
import BattleSummary, { BattleStats } from './battle/BattleSummary';
import { audioBridge } from '../hooks/useAudioManager';

// Hooks
import { useDragToPlay } from '../hooks/useDragToPlay';
import { useBattleAnimations } from '../hooks/useBattleAnimations';
import { useTranslation } from '../i18n';
import { useTutorial } from '../hooks/useTutorial';
import { TutorialOverlay } from './battle/TutorialOverlay';

/** B-6: 环境粒子组件 */
const EnvironmentParticles: React.FC<{ element: string | null }> = ({ element }) => {
  const particles = React.useMemo(() => {
    if (!element || element === 'neutral') return [];
    const count = 15;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 3 + Math.random() * 4,
      delay: `${Math.random() * 6}s`,
      drift: `${(Math.random() - 0.5) * 60}px`,
    }));
  }, [element]);

  if (!element || particles.length === 0) return null;
  const cls = `env-particle env-particle-${element}`;

  return (
    <div className="absolute inset-0 pointer-events-none z-[1]">
      {particles.map(p => (
        <div
          key={p.id}
          className={cls}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            '--drift': p.drift,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

interface BattleArenaProps {
  gameLoopState: GameLoopState;
  selectedBet: number;
  onPlayCard: (spellId: SpellType, isConfirmed?: boolean, target?: { type: 'hero' | 'minion'; id?: string }) => void;
  onPass?: () => void;
  onSurrender: () => void;
  onRematch?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPlayerShaking?: boolean;
  isOpponentShaking?: boolean;
  isTavernMode?: boolean;
  setTargeting: (data: GameLoopState['targetingData']) => void;
  pvpRoomId?: string;
  // [P3-2] Hero skill callbacks
  onSelectHeroSkill?: (skillId: string) => void;
  onUseHeroSkill?: () => void;
  // [PVP] 远程操作回调（对手的操作以对手身份执行，不走玩家出牌逻辑）
  onRemotePlayCard?: (spellId: SpellType) => void;
  onRemoteEndTurn?: () => void;
  // [P0-4] PvP state sync for reconnection
  getSerializedState?: () => { duelState: any; phase: string };
  restoreFromSync?: (syncData: { duelState: any; phase: string }) => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  gameLoopState,
  onPlayCard,
  onPass,
  onSurrender,
  onRematch,
  isMuted,
  onToggleMute,
  isPlayerShaking = false,
  isOpponentShaking = false,
  setTargeting,
  pvpRoomId,
  onSelectHeroSkill,
  onUseHeroSkill,
  onRemotePlayCard,
  onRemoteEndTurn,
  getSerializedState,
  restoreFromSync,
}) => {
  // [Phase 3] Subscribe to store directly instead of receiving via props
  const duelState        = useBattleStore(s => s.duelState);
  const phase            = useBattleStore(s => s.phase);
  const playerCard       = useBattleStore(s => s.playerCard);
  const opponentCard     = useBattleStore(s => s.opponentCard);
  const resultText       = useBattleStore(s => s.resultText);
  const effectMessages   = useBattleStore(s => s.effectMessages);
  const aiStatus         = useBattleStore(s => s.aiStatus);
  const isProcessing     = useBattleStore(s => s.isProcessing);
  const isGameOver       = useBattleStore(s => s.isGameOver);
  const gameResult       = useBattleStore(s => s.gameResult);
  const turnBanner       = useBattleStore(s => s.turnBanner);
  const targetingData    = useBattleStore(s => s.targetingData);

  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { isLowQuality } = useSettingsStore();

  // States
  const [hoveredSpellId, setHoveredSpellId] = useState<SpellType | null>(null);
  const hoverCooldownRef = useRef(false);
  const handleSetHoveredSpellId = (id: SpellType | null) => {
    setHoveredSpellId(id);
    if (id && !isMuted && !hoverCooldownRef.current) {
      audioBridge.playSfx('card_hover');
      hoverCooldownRef.current = true;
      setTimeout(() => { hoverCooldownRef.current = false; }, 200);
    }
  };
  const [hasShownTutorial, setHasShownTutorial] = useState(false);
  // [P0-4] Opponent disconnect tracking
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(30);
  // [P0-4] 本地连接状态追踪（用于断线重连 UI）
  const [localConnState, setLocalConnState] = useState<'connected' | 'connecting' | 'reconnecting' | 'disconnected'>('connected');
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [detailSpell, setDetailSpell] = useState<SpellType | null>(null);
  // [P1-1] Target selection state
  const [pendingTargetSpell, setPendingTargetSpell] = useState<SpellType | null>(null);

  // [P4-4] Parallax offset for arena background (gated behind !isLowQuality)
  const parallaxRef = useRef({ x: 0, y: 0 });
  const [, forceParallaxUpdate] = useState(0);
  const parallaxTimerRef = useRef<number | null>(null);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isLowQuality) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 to 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    parallaxRef.current = { x: nx * 12, y: ny * 8 };          // max ±12px, ±8px
    // Throttle re-render to ~30fps
    if (!parallaxTimerRef.current) {
      parallaxTimerRef.current = requestAnimationFrame(() => {
        parallaxTimerRef.current = null;
        forceParallaxUpdate(n => n + 1);
      });
    }
  }, [isLowQuality]);

  // [P0+P1] PVP 模式由 pvpRoomId 是否有值来决定，不再硬编码
  const isPVPMode = !!pvpRoomId;

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const isRemoteActionRef = useRef(false); // [PVP] 标记是否为远程同步过来的操作，防止无限循环
  // [PVP修复] 使用 activeAddress 作为 playerId，确保和匹配端的 userId 一致
  const playerIdRef = useRef<string>(useUserStore.getState().activeAddress || `guest_${Date.now()}`);

  // [P0] 用 Ref 存储最新回调引用，避免 useEffect 因引用变化重复触发
  const onPlayCardRef = useRef(onPlayCard);
  const onPassRef = useRef(onPass);
  const onRemotePlayCardRef = useRef(onRemotePlayCard);
  const onRemoteEndTurnRef = useRef(onRemoteEndTurn);
  useEffect(() => { onPlayCardRef.current = onPlayCard; }, [onPlayCard]);
  useEffect(() => { onPassRef.current = onPass; }, [onPass]);
  useEffect(() => { onRemotePlayCardRef.current = onRemotePlayCard; }, [onRemotePlayCard]);
  useEffect(() => { onRemoteEndTurnRef.current = onRemoteEndTurn; }, [onRemoteEndTurn]);
  // [P0-4] Refs for state sync functions
  const getSerializedStateRef = useRef(getSerializedState);
  const restoreFromSyncRef = useRef(restoreFromSync);
  useEffect(() => { getSerializedStateRef.current = getSerializedState; }, [getSerializedState]);
  useEffect(() => { restoreFromSyncRef.current = restoreFromSync; }, [restoreFromSync]);

  // Hooks
  const {
    canvasRef,
    showCritEffect,
    showBloodFlash,
    counterFlashElement,
    floatingTexts,
    addDamageNumber,
    triggerCrit,
    triggerCounterFlash,
    triggerShake,
    spawnProjectile,
    shakeClass,
    updateDragTrail,
  } = useBattleAnimations(isLowQuality);

  // [P0 Tutorial] First-battle tutorial system
  const [isFirstBattle] = useState(() => {
    try { return !localStorage.getItem('wizard_duel_tutorial_v2'); } catch { return false; }
  });
  const tutorial = useTutorial(isFirstBattle && !isPVPMode, 'DUEL', phase as DuelPhase, duelState?.roundNumber || 0);

  // [P3] Battle stats tracking
  const battleStatsRef = useRef<BattleStats>({
    totalDamageDealt: 0, totalDamageReceived: 0, highestSingleHit: 0,
    cardsPlayed: 0, burnTicks: 0, freezeCount: 0, chargeCombo: 0,
    armorGained: 0, turnsPlayed: 0,
  });
  const [showSummary, setShowSummary] = useState(false);

  const playableCards = useMemo(() => {
    if (!duelState) return [];
    return getPlayableCards(
      duelState.playerHand,
      duelState.playerMana,
      duelState.playerEffects,
      duelState.playerCostMod
    );
  }, [duelState]);

  // [P3-2] Compute main element from player's hand
  const mainElement = useMemo(() => {
    if (!duelState) return undefined;
    const counts: Record<string, number> = {};
    for (const spellId of duelState.playerHand) {
      const el = getElementType(spellId);
      if (el !== 'neutral') {
        counts[el] = (counts[el] || 0) + 1;
      }
    }
    let maxEl: string | undefined;
    let maxCount = 0;
    for (const [el, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxEl = el;
      }
    }
    return maxEl;
  }, [duelState?.playerHand]);

  const { dragState, startDrag, dragX, dragY } = useDragToPlay(
    (id, confirmed) => handlePlayCard(id, confirmed),
    setTargeting,
    isProcessing,
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
    if (!activeId || !duelState || phase !== 'PLAYER_TURN' || isProcessing)
      return null;
    return calculateSpellProjection(duelState, 'player', activeId);
  }, [dragState?.spellId, hoveredSpellId, phase, duelState, isProcessing]);

  // [P0 新手引导] 判断是否显示首次出牌气泡
  const shouldShowTutorial =
    !hasShownTutorial &&
    duelState?.roundNumber === 1 &&
    phase === 'PLAYER_TURN' &&
    !isProcessing &&
    playableCards.length > 0;

  // [P3] Track battle stats from effect messages + [P3] keyword SFX
  useEffect(() => {
    if (effectMessages.length === 0) return;
    const lastMsg = effectMessages[effectMessages.length - 1];

    // Stats tracking
    const dmgMatch = lastMsg.match(/(\d+)点伤害/);
    if (dmgMatch) {
      const dmg = parseInt(dmgMatch[1]);
      battleStatsRef.current.totalDamageDealt += dmg;
      battleStatsRef.current.highestSingleHit = Math.max(battleStatsRef.current.highestSingleHit, dmg);
    }
    if (lastMsg.includes('灼烧')) battleStatsRef.current.burnTicks++;
    if (lastMsg.includes('冻结')) battleStatsRef.current.freezeCount++;
    if (lastMsg.includes('护甲')) battleStatsRef.current.armorGained += 3;
    if (lastMsg.includes('连击') || lastMsg.includes('充能')) battleStatsRef.current.chargeCombo++;

    // [P3] Keyword SFX
    if (!isMuted) {
      if (lastMsg.includes('灼烧')) audioBridge.playSfx('status_burn');
      else if (lastMsg.includes('冻结')) audioBridge.playSfx('status_freeze');
      else if (lastMsg.includes('缠绕')) audioBridge.playSfx('tangle');
      else if (lastMsg.includes('护甲')) audioBridge.playSfx('shield');
      else if (lastMsg.includes('治疗')) audioBridge.playSfx('heal');
      else if (lastMsg.includes('克制')) audioBridge.playSfx('counter');
      else if (lastMsg.includes('暴击')) audioBridge.playSfx('crit_hit');
      else if (lastMsg.includes('连击')) audioBridge.playSfx('combo_streak');
      else if (lastMsg.includes('中毒')) audioBridge.playSfx('status_poison');
      else if (lastMsg.includes('召唤')) audioBridge.playSfx('summon');
    }
  }, [effectMessages, isMuted]);

  // [P3] Show summary when game is over
  useEffect(() => {
    if (isGameOver && gameResult) {
      battleStatsRef.current.turnsPlayed = duelState?.roundNumber || 0;
      battleStatsRef.current.cardsPlayed = Math.max(1, (duelState?.roundNumber || 1) * 2);
      const timer = setTimeout(() => setShowSummary(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isGameOver, gameResult, duelState?.roundNumber]);

  // Effects Monitoring
  useEffect(() => {
    if (effectMessages.length > 0) {
      const lastMsg = effectMessages[effectMessages.length - 1];
      const isCrit = lastMsg.includes('暴击');

      if (isCrit) triggerCrit();

      // Element counter flash
      if (lastMsg.includes('克制')) {
        if (lastMsg.includes('🔥')) triggerCounterFlash('fire');
        else if (lastMsg.includes('❄️')) triggerCounterFlash('ice');
        else if (lastMsg.includes('⚡')) triggerCounterFlash('thunder');
        else if (lastMsg.includes('🌿')) triggerCounterFlash('vine');
        else if (lastMsg.includes('🪨')) triggerCounterFlash('rock');
      }

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
  }, [effectMessages, triggerCrit, triggerCounterFlash, addDamageNumber, triggerShake]);

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

    // Track local connection state for disconnect UI
    pvpService.onConnectionStateChange = (state) => {
      setLocalConnState(state);
    };
    setLocalConnState('connecting');

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
            // [核心修复] 走远程出牌回调，以“对手”身份执行法术结算
            onRemotePlayCardRef.current?.(action.spellId);
          } else if (action.type === 'END_TURN') {
            console.log('⏳ [PVP] 对手结束回合');
            // [核心修复] 走远程结束回合回调，触发回合结算→新回合
            onRemoteEndTurnRef.current?.();
          }
        } finally {
          setTimeout(() => {
            isRemoteActionRef.current = false;
          }, 200);
        }
      } else if (data.type === 'PLAYER_JOINED') {
        console.log('👥 [PVP] 对手已进入房间:', data.player_id);
        // Opponent reconnected
        setOpponentDisconnected(false);
        if (disconnectTimerRef.current) {
          clearInterval(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
      } else if (data.type === 'PLAYER_LEFT') {
        console.log('⚠️ [PVP] 对手断开连接:', data.player_id);
        setOpponentDisconnected(true);
        setReconnectCountdown(30);
      } else if (data.type === 'RECONNECTED') {
        console.log(`🔄 [PVP] 重连成功! Role: ${data.role}, Seed: ${data.seed}`);
        setOpponentDisconnected(false);
        if (disconnectTimerRef.current) {
          clearInterval(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        // If I reconnected and I'm player1, send current state to player2
        const info = pvpService.getRoomInfo();
        if (info.role === 'player1' && getSerializedStateRef.current) {
          const state = getSerializedStateRef.current();
          if (state.duelState) {
            pvpService.sendAction({ type: 'STATE_SYNC', state });
          }
        }
        // If I'm player2, request state from player1
        if (data.role === 'player2') {
          pvpService.sendAction({ type: 'REQUEST_STATE' });
        }
      } else if (data.type === 'STATE_SYNC') {
        // Received full state from P1 (only P2 should process this)
        const info = pvpService.getRoomInfo();
        if (info.role === 'player2' && data.state && restoreFromSyncRef.current) {
          console.log('📦 [PVP] 收到状态同步，正在恢复游戏...');
          restoreFromSyncRef.current(data.state);
          setOpponentDisconnected(false);
        }
      } else if (data.type === 'REQUEST_STATE') {
        // P1 receives this — send current state to P2
        const info = pvpService.getRoomInfo();
        if (info.role === 'player1' && getSerializedStateRef.current) {
          const state = getSerializedStateRef.current();
          if (state.duelState) {
            console.log('📦 [PVP] 发送状态同步给 P2...');
            pvpService.sendAction({ type: 'STATE_SYNC', state });
          }
        }
      }
    });

    return () => {
      pvpService.disconnect();
    };
  }, [pvpRoomId]); // [P0] 只依赖 pvpRoomId，不再依赖回调函数引用

  // [P2 Fix #21] Dynamic BGM: 根据 HP 比例动态调整音乐气氛
  useEffect(() => {
    if (duelState && !isMuted) {
      audioBridge.updateBattleBGM(duelState.playerHP, duelState.opponentHP, GAME_CONFIG.maxHP);
    }
  }, [duelState?.playerHP, duelState?.opponentHP, isMuted]);

  // [P0.4] Combo audio escalation — playbackRate increases per combo stack
  useEffect(() => {
    const combo = duelState?.playerConsecutiveThunder ?? 0;
    if (combo >= 2 && !isMuted) {
      const baseRate = 1.0 + (combo - 1) * 0.15; // x2=1.15, x3=1.30, x4=1.45
      audioBridge.playSfx('combo_streak', { rate: baseRate });
    }
  }, [duelState?.playerConsecutiveThunder, isMuted]);

  // [P0-4] Opponent disconnect countdown (30s → surrender)
  useEffect(() => {
    if (!opponentDisconnected) {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      return;
    }

    disconnectTimerRef.current = setInterval(() => {
      setReconnectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(disconnectTimerRef.current!);
          disconnectTimerRef.current = null;
          // Auto-surrender if opponent doesn't reconnect
          onSurrender();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    };
  }, [opponentDisconnected, onSurrender]);

  // [P0 Fix A-2] TurnBanner 逻辑已移除，统一由 useTurnManager.showTurnBanner 控制
  // 通过 gameLoopState.turnBanner 传入 TurnBanner 组件

  const handlePlayCard = (spellId: SpellType, isConfirmed: boolean = false) => {
    if (!duelState) return;

    // [P1-1] Target selection: if spell needs a target, show TargetSelector
    if (spellNeedsTarget(spellId) && duelState.opponentMinions.length > 0) {
      setPendingTargetSpell(spellId);
      return; // Don't play yet — wait for target selection
    }

    // [P0 新手引导] 只要出过一张牌，就永久关闭引导
    if (shouldShowTutorial) {
      setHasShownTutorial(true);
    }

    // [P0 Tutorial] Notify tutorial system
    tutorial.handleAction('PLAY_CARD');

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

  // [P1-1] Target selection: handle target chosen from TargetSelector
  const handleTargetSelected = useCallback((target: { type: 'hero' | 'minion'; id?: string }) => {
    if (!pendingTargetSpell) return;
    const spellId = pendingTargetSpell;
    setPendingTargetSpell(null);

    // [P0 新手引导] 只要出过一张牌，就永久关闭引导
    if (shouldShowTutorial) setHasShownTutorial(true);

    // [P0 Tutorial] Notify tutorial system
    tutorial.handleAction('PLAY_CARD');

    setHoveredSpellId(null);
    setTargeting(null);
    spawnProjectile('player');

    // 传递目标选择给游戏逻辑层
    if (isPVPMode && !isRemoteActionRef.current) {
      pvpService.sendAction({
        type: 'ACTION',
        action: { type: 'PLAY_CARD', spellId, isConfirmed: true, playerId: playerIdRef.current, timestamp: Date.now() },
      });
    }
    onPlayCard(spellId, true, target);
  }, [pendingTargetSpell, shouldShowTutorial, isPVPMode, spawnProjectile, setTargeting, onPlayCard]);

  const handleTargetCancel = useCallback(() => {
    setPendingTargetSpell(null);
  }, []);

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
    // [P0 Tutorial] Notify tutorial system
    tutorial.handleAction('END_TURN');

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
  const isPlayerTurnGlow = phase === 'PLAYER_TURN' && !isProcessing;

  return (
    <div
      className={`
      fixed inset-0 w-full h-full bg-slate-950 no-select flex flex-col z-40 overflow-hidden
            ${shakeClass}
      ${isPlayerTurnGlow ? 'ring-4 ring-amber-500/30 ring-inset' : ''}
      ${isGameOver ? 'bullet-time' : ''}
    `}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      onPointerMove={handlePointerMove}
    >
      {/* [P0 Fix A-2] 回合横幅 — 统一由 useTurnManager 驱动 */}
      <TurnBanner type={turnBanner} roundNumber={duelState?.roundNumber || 1} />

      {/* Background - [P1-18] 低端机降级优化 */}
      <div className="absolute inset-0 z-0 pointer-events-none arena-bg-overlay overflow-hidden">
        <img
          src="/ui/bg_arena.webp"
          alt="Arena Background"
          className={`absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110 optimize-gpu ${isLowQuality ? '' : 'blur-[2px] animate-bg-breathing'}`}
          style={{
            objectPosition: 'center 40%',
            transform: isLowQuality ? undefined : `translate(${parallaxRef.current.x}px, ${parallaxRef.current.y}px)`,
            transition: 'transform 0.15s ease-out',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/80" />
        {/* [P2-3] Dynamic battlefield theme based on opponent element */}
        {(() => {
          const opponentElement = duelState?.opponentLastSpell ? getElementType(duelState.opponentLastSpell) : null;
          const themeGradients: Record<string, string> = {
            fire: 'linear-gradient(180deg, rgba(127,29,29,0.2) 0%, transparent 50%, rgba(120,53,15,0.15) 100%)',
            ice: 'linear-gradient(180deg, rgba(30,58,138,0.2) 0%, transparent 50%, rgba(22,78,99,0.15) 100%)',
            thunder: 'linear-gradient(180deg, rgba(88,28,135,0.2) 0%, transparent 50%, rgba(49,46,129,0.15) 100%)',
            vine: 'linear-gradient(180deg, rgba(20,83,45,0.2) 0%, transparent 50%, rgba(22,101,52,0.15) 100%)',
            rock: 'linear-gradient(180deg, rgba(68,64,60,0.2) 0%, transparent 50%, rgba(41,37,36,0.15) 100%)',
          };
          const gradient = opponentElement && themeGradients[opponentElement];
          return gradient ? (
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-1000"
              style={{ background: gradient }}
            />
          ) : null;
        })()}

        {/* B-6: 环境粒子层 */}
        {!isLowQuality && duelState && <EnvironmentParticles element={duelState.opponentLastSpell ? getElementType(duelState.opponentLastSpell) : null} />}
      </div>

      <FloatingTextOverlay items={floatingTexts} />

      {/* PVP 状态指示器 - 根据连接状态动态更新 */}
      {isPVPMode && (
        <div className="fixed top-4 left-4 z-[99]">
          <span
            className={`px-2 py-1 rounded text-[10px] font-bold animate-pulse ${
              localConnState === 'connected' ? 'bg-emerald-500 text-white' :
              localConnState === 'reconnecting' || localConnState === 'connecting' ? 'bg-yellow-500 text-white' :
              'bg-red-500 text-white'
            }`}
          >
            {localConnState === 'connected' ? 'PVP: ONLINE' :
             localConnState === 'reconnecting' ? 'PVP: RECONNECTING...' :
             localConnState === 'connecting' ? 'PVP: CONNECTING...' :
             'PVP: OFFLINE'}
          </span>
        </div>
      )}

      {/* [P1] Spell Cast Effects */}
      <SpellCastEffect spellId={playerCard} caster="player" />
      <SpellCastEffect spellId={opponentCard} caster="opponent" />

      {/* [P1] Element Counter Indicator */}
      <ElementIndicator
        opponentLastSpell={duelState?.opponentLastSpell || null}
        isPlayerTurn={phase === 'PLAYER_TURN' && !isProcessing}
      />

      {/* Opponent Area */}
      <div className="w-full flex justify-center items-start pt-4 md:pt-6 z-20 relative safe-area-top">
        <DebuffOverlay effects={duelState.opponentEffects} position="opponent" isMobile={isMobile} />
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

      <TargetingArrow data={targetingData} isMobile={isMobile} />

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
      <div className="relative">
        <DebuffOverlay effects={duelState.playerEffects} position="player" isMobile={isMobile} />
        <PlayerHUD
          duelState={duelState}
          phase={phase}
          isProcessing={isProcessing}
          isPlayerShaking={isPlayerShaking}
          projection={projection}
          onPlayCard={handlePlayCard}
          onPass={handleEndTurn}
          onUseHeroSkill={onUseHeroSkill}
        />
      </div>

      {/* Hand Area (Bottom Layer) */}
      <HandArea
        hand={duelState.playerHand}
        playableCards={playableCards}
        phase={phase}
        isProcessing={isProcessing}
        isMobile={isMobile}
        dragState={dragState}
        startDrag={startDrag}
        onCardPressEnd={handleCardPressEnd}
        setHoveredSpellId={handleSetHoveredSpellId}
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
                <span>{t('End Turn')}</span>
                <span className="text-lg">👉</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>{t('Waiting')}</span>
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
        comboCount={duelState.playerConsecutiveThunder}
        counterFlashElement={counterFlashElement}
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
        isActive={phase === 'PLAYER_TURN' && !isProcessing}
        duration={60}
        warningTime={15}
        onTimeUp={handleEndTurn}
      />

      {/* [P0-4] Opponent disconnected overlay */}
      {opponentDisconnected && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-8 rounded-2xl bg-gray-900/90 border border-yellow-500/40 max-w-sm mx-4">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">{t('Opponent Disconnected')}</h2>
            <p className="text-gray-300 mb-4">
              {t('Waiting for opponent to reconnect...')}
            </p>
            <div className="text-4xl font-mono text-white mb-4">
              {reconnectCountdown}s
            </div>
            <p className="text-sm text-gray-500">
              {reconnectCountdown > 0
                ? t('If opponent reconnects in time, battle resumes')
                : t('Opponent did not reconnect in time, Victory')}
            </p>
          </div>
        </div>
      )}

      {/* [P0-4] Local player disconnect overlay with manual reconnect */}
      {isPVPMode && localConnState === 'disconnected' && !opponentDisconnected && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-8 rounded-2xl bg-gray-900/90 border border-red-500/40 max-w-sm mx-4">
            <div className="text-5xl mb-4">🔌</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">{t('Connection Lost')}</h2>
            <p className="text-gray-300 mb-6">
              {t('Auto-reconnect failed. Try reconnecting manually.')}
            </p>
            <button
              onClick={() => pvpService.manualReconnect()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-white transition-colors shadow-lg shadow-emerald-900/30"
            >
              {t('Reconnect')}
            </button>
          </div>
        </div>
      )}

      {detailSpell && (
        <CardDetailModal spell={getSpellById(detailSpell)} onClose={() => setDetailSpell(null)} />
      )}

      {/* [P1-1] Target selection overlay */}
      <TargetSelector
        isActive={!!pendingTargetSpell}
        spellId={pendingTargetSpell}
        opponentMinions={duelState?.opponentMinions || []}
        onSelectTarget={handleTargetSelected}
        onCancel={handleTargetCancel}
        isMobile={isMobile}
      />

      {/* [P3-2] Hero Skill Selection overlay */}
      <HeroSkillSelection
        isActive={phase === 'SKILL_SELECT_PHASE'}
        mainElement={mainElement}
        onSelect={(skillId) => {
          audioBridge.playSfx('hero_skill');
          onSelectHeroSkill?.(skillId);
        }}
        isMobile={isMobile}
      />

      {/* [P0 Tutorial] First-battle tutorial overlay */}
      {tutorial.isActive && tutorial.activeStep && (
        <TutorialOverlay
          step={tutorial.activeStep}
          onNext={tutorial.nextStep}
          onSkip={tutorial.skipTutorial}
        />
      )}

      {/* [P3] Battle Summary overlay */}
      {showSummary && gameResult && (
        <BattleSummary
          result={gameResult}
          stats={battleStatsRef.current}
          onClose={() => { setShowSummary(false); onSurrender(); }}
          onRematch={onRematch}
        />
      )}
    </div>
  );
};

export default BattleArena;
