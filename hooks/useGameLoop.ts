/**
 * useGameLoop - 游戏主循环 (组合层)
 * 
 * [Phase B-1] 精简为组合层，职责分离到：
 * - useRoundManager: 回合流转 (prepareNextTurn/drawCard/死亡检查)
 * - usePlayerActions: 玩家行动 (playCard/mulligan/startDuel)
 * - useAITurn: AI 回合执行 (passTurn)
 * - useTurnManager: 计时器/横幅
 * - useAnimationQueue: 指令队列
 * 
 * [#6 游戏循环优化]
 * - 细化 isProcessing 锁机制，区分 UI 更新和逻辑处理
 * - 添加 processingLock ref 防止重复触发
 * - 优化状态更新批处理
 */

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  SpellType, DuelState, GameMode, AIProfile,
  GameLoopState, GameActionCommand
} from '../types';
import { useBattleStore } from '../stores/useBattleStore';
import { useAnimationQueue } from './useAnimationQueue';
import { useTurnManager } from './useTurnManager';
import { useRoundManager } from './useRoundManager';
import { usePlayerActions } from './usePlayerActions';
import { useAITurn } from './useAITurn';
import { throttle } from '../utils/helpers';
import { GameFSM } from '../services/GameFSM';
import { restoreGameRNG } from '../utils/seededRandom';
import { GameRuleEngine } from '../services/GameRuleEngine';
import { AI_DIFFICULTY_PRESETS } from '../services/ai';
import { resolveDifficultyKey } from '../data/aiDecks';

// [P2 Fix #22] 节流保存函数，3秒内只保存一次
const throttledSave = throttle((data: object) => {
  localStorage.setItem('wizard_duel_save', JSON.stringify(data));
}, 3000);

export interface GameLoopActions {
  startDuel: (playerDeck: SpellType[], opponentDeck: SpellType[], mode: GameMode) => void;
  startTavernDuel: (playerDeck: SpellType[], opponentProfile: AIProfile, mode: GameMode) => void;
  playCard: (spellId: SpellType, e?: React.MouseEvent, target?: import('../types/card').SpellTarget) => boolean;
  passTurn: () => void;
  reset: () => void;
  setTargeting: (data: GameLoopState['targetingData']) => void;
  handleMulligan: (indicesToReplace: number[]) => void;
  startFirstTurn: (currentState: DuelState) => void;
  // [P3-2] Hero skill actions
  selectHeroSkill: (skillId: string) => void;
  useHeroSkill: () => boolean;
  // [PVP] 远程操作处理
  handleRemotePlayCard: (spellId: SpellType) => void;
  handleRemoteEndTurn: () => void;
  startPvpDuel: (p1Deck: SpellType[], p2Deck: SpellType[], role: 'player1' | 'player2', seed?: number) => void;
  // [P0-4] PvP state sync for reconnection
  getSerializedState: () => { duelState: DuelState | null; phase: string };
  restoreFromSync: (syncData: { duelState: DuelState; phase: string }) => void;
}

export function useGameLoop(isPVPMode: boolean = false): [GameLoopState, GameLoopActions] {
    // ============ [#6] Processing Lock ============
  const processingLockRef = useRef(false);
  const actionInProgressRef = useRef<string | null>(null);

  // ============ [P0 Fix #1] FSM 实例 ============
  const fsmRef = useRef(new GameFSM('DRAFT_PHASE'));

  // 1. Core State — from useBattleStore (replaces useState)
  const duelState        = useBattleStore(s => s.duelState);
  const playerCard       = useBattleStore(s => s.playerCard);
  const opponentCard     = useBattleStore(s => s.opponentCard);
  const resultText       = useBattleStore(s => s.resultText);
  const effectMessages   = useBattleStore(s => s.effectMessages);
  const isGameOver       = useBattleStore(s => s.isGameOver);
  const gameResult       = useBattleStore(s => s.gameResult);
  const aiStatus         = useBattleStore(s => s.aiStatus);
  const targetingData    = useBattleStore(s => s.targetingData);
  const isStoreProcessing = useBattleStore(s => s.isProcessing);

  // Ref to access passTurn in TurnManager
  const passTurnRef = useRef<(() => void) | undefined>(undefined);

  // 3. Turn Manager Hook
  const { 
    phase, turnTimeLeft, turnBanner, 
    setPhase, showTurnBanner, resetTurnManager 
  } = useTurnManager('DRAFT_PHASE', () => {
    // Timeout Handling - 只有在非处理中时才触发
    if (!processingLockRef.current) {
      passTurnRef.current?.();
    }
  });

  // 4. Command Processor — delegates to useBattleStore
  const processAction = useCallback((action: GameActionCommand) => {
    const store = useBattleStore.getState();
    switch (action.type) {
      case 'UPDATE_STATE':
        store.updateDuelState(action.payload);
        break;

      case 'ADD_MESSAGE':
        store.addEffectMessage(action.payload);
        break;

      case 'SET_PHASE':
        setPhase(action.payload);
        break;

      case 'UPDATE_UI':
        // Zustand set() shallow-merges partial objects
        useBattleStore.setState(action.payload as any);
        break;

      case 'SET_AI_STATUS':
        store.setAIStatus(action.payload);
        break;

      case 'SET_TARGETING':
        store.setTargetingData(action.payload as any);
        break;

      case 'EXECUTE_LOGIC':
        if (typeof action.payload === 'function') {
          action.payload();
        }
        break;

      // PLAY_ANIMATION and WAIT are handled implicitly by queue delay
    }
  }, [setPhase]);

  // 5. Animation Queue Hook
  const { queue, isProcessing: isQueueProcessing, enqueue, clearQueue } = useAnimationQueue(processAction);

  // [#6] 组合 isProcessing 状态
  const isProcessing = useMemo(() => {
    return isQueueProcessing || processingLockRef.current;
  }, [isQueueProcessing]);

  // Sync isProcessing to store for child component subscriptions
  useEffect(() => {
    useBattleStore.setState({ isProcessing });
  }, [isProcessing]);

  // Refs for checking current state in callbacks (sub-hooks read these)
  const duelStateRef = useRef(duelState);
  useEffect(() => { duelStateRef.current = duelState; }, [duelState]);

  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Sync useTurnManager values to store for child component selectors
  useEffect(() => { useBattleStore.setState({ phase }); }, [phase]);
  useEffect(() => { useBattleStore.setState({ turnTimeLeft }); }, [turnTimeLeft]);
  useEffect(() => { useBattleStore.setState({ turnBanner }); }, [turnBanner]);

  // [PVP] 角色引用，用于在各个 Hook 间共享角色信息
  const pvpRoleRef = useRef<'player1' | 'player2' | null>(null);

  // [Phase C-1] AI 难度配置引用，酒馆对战启动时由 AIProfile 设置
  const aiDifficultyConfigRef = useRef<import('../services/ai').AIDifficultyConfig | undefined>(undefined);

  // ============ [#6] 优化的 enqueue 包装 ============
  const safeEnqueue = useCallback((commands: GameActionCommand[], actionId?: string) => {
    // 防止重复触发同一动作
    if (actionId && actionInProgressRef.current === actionId) {
      console.warn(`[GameLoop] Action ${actionId} already in progress, skipping`);
      return;
    }
    
    if (actionId) {
      actionInProgressRef.current = actionId;
      // 在队列处理完后清除标记
      commands.push({
        type: 'EXECUTE_LOGIC',
        payload: () => { actionInProgressRef.current = null; }
      });
    }
    
    enqueue(commands);
  }, [enqueue]);

  // ============ [B-1] 组合拆分后的子 Hooks ============

  const { startNewRound } = useRoundManager({ 
    enqueue: safeEnqueue, 
    showTurnBanner,
    pvpRoleRef 
  });

  const { playCard, handleMulligan, startDuel, startTavernDuel: rawStartTavernDuel, startPvpDuel, selectHeroSkill, useHeroSkill } = usePlayerActions({
    duelStateRef,
    phaseRef,
    isProcessing,
    enqueue: safeEnqueue,
    showTurnBanner,
    setDuelState: useBattleStore.getState().setDuelState,
    setPhase,
    addMessage: useBattleStore.getState().addEffectMessage,
    setPlayerCard: useBattleStore.getState().setPlayerCard,
    clearMessages: useBattleStore.getState().clearEffectMessages,
    resetBattleUI: () => useBattleStore.setState({
      isGameOver: false, gameResult: null, effectMessages: [], resultText: ''
    }),
    startNewRound,
    pvpRoleRef
  });

  // [Phase C-1] 包装 startTavernDuel，同步设置 AI 难度配置
  const startTavernDuel = useCallback((deck: SpellType[], aiProfile: AIProfile, gameMode: GameMode = 'standard') => {
    const diffKey = aiProfile.difficultyConfig
      ? undefined
      : resolveDifficultyKey(aiProfile.difficulty);
    aiDifficultyConfigRef.current = aiProfile.difficultyConfig || (diffKey ? AI_DIFFICULTY_PRESETS[diffKey] : AI_DIFFICULTY_PRESETS.normal);
    rawStartTavernDuel(deck, aiProfile, gameMode);
  }, [rawStartTavernDuel]);

  const { passTurn, handleRemoteEndTurn } = useAITurn({
    duelStateRef,
    phaseRef,
    isProcessing,
    isPVPMode,
    enqueue: safeEnqueue,
    showTurnBanner,
    startNewRound,
    pvpRoleRef,
    aiDifficultyConfig: aiDifficultyConfigRef.current,
  });

  // [PVP] 处理远程对手出牌：以"对手"身份执行法术结算
  const handleRemotePlayCard = useCallback((spellId: SpellType) => {
    const state = duelStateRef.current;
    if (!state) return;

    console.log(`🌐 [PVP] 执行对手远程出牌: ${spellId}`);

    // 设置对手出牌 UI
    useBattleStore.getState().setOpponentCard(spellId);

    // PVP 模式下本地 opponentHand 与远程实际不同步（隐藏信息）
    // skipHandCheck 跳过 casterHasCard 校验，直接执行法术效果
    const { commands: engineCommands } = GameRuleEngine.castSpell(state, spellId, 'opponent', { skipHandCheck: true });
    safeEnqueue([...engineCommands], `remote_play_${spellId}_${Date.now()}`);
  }, [duelStateRef, safeEnqueue]);
  
  passTurnRef.current = passTurn;
  
  // ============ Persistence ============
  // [P0 Bug 4 Fix] 完整保存战斗状态，包括回合数、状态效果剩余回合等
  useEffect(() => {
    if (duelState && phase !== 'DRAFT_PHASE' && !isGameOver) {
      const saveData = {
        duelState: {
          ...duelState,
          playerEffects: duelState.playerEffects.map(e => ({ ...e })),
          opponentEffects: duelState.opponentEffects.map(e => ({ ...e })),
        },
        phase,
        effectMessages: effectMessages.slice(-20),
        savedAt: Date.now(),
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => throttledSave(saveData));
      } else {
        throttledSave(saveData);
      }
    } else if (isGameOver) {
      localStorage.removeItem('wizard_duel_save');
    }
  }, [duelState, phase, isGameOver, effectMessages]);
  
  // Restore saved game on mount
  useEffect(() => {
    const saved = localStorage.getItem('wizard_duel_save');
    if (saved && !duelState) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.duelState &&
            typeof parsed.duelState.roundNumber === 'number' &&
            Array.isArray(parsed.duelState.playerEffects) &&
            Array.isArray(parsed.duelState.opponentEffects)) {
          const store = useBattleStore.getState();
          store.setDuelState(parsed.duelState);
          setPhase(parsed.phase);
          fsmRef.current.reset(parsed.phase);
          if (parsed.duelState.rngState) {
            restoreGameRNG(parsed.duelState.rngState);
            console.log('[GameLoop] RNG 状态已恢复, seed:', parsed.duelState.rngState.initialSeed, 'calls:', parsed.duelState.rngState.callCount);
          }
          store.clearEffectMessages();
          (parsed.effectMessages || []).forEach((m: string) => store.addEffectMessage(m));
          console.log('[GameLoop] 战斗状态已恢复', {
            roundNumber: parsed.duelState.roundNumber,
            playerEffects: parsed.duelState.playerEffects.length,
            opponentEffects: parsed.duelState.opponentEffects.length,
            savedAt: parsed.savedAt ? new Date(parsed.savedAt).toISOString() : 'unknown'
          });
        } else {
          console.warn('[GameLoop] 保存数据不完整，清除旧存档');
          localStorage.removeItem('wizard_duel_save');
        }
      } catch (e) {
        console.error('Failed to restore game:', e);
        localStorage.removeItem('wizard_duel_save');
      }
    }
  }, []); // Once on mount
  
  // ============ Reset ============
  const reset = useCallback(() => {
    processingLockRef.current = false;
    actionInProgressRef.current = null;
    fsmRef.current.reset('DRAFT_PHASE');

    clearQueue();
    resetTurnManager();
    useBattleStore.getState().resetBattle();
  }, [clearQueue, resetTurnManager]);

  // ============ setTargeting ============
  const setTargeting = useCallback((data: GameLoopState['targetingData']) => {
    useBattleStore.getState().setTargetingData(data as any);
  }, []);

  // ============ [P0-4] PvP State Sync ============
  const getSerializedState = useCallback(() => {
    return { duelState: useBattleStore.getState().duelState, phase };
  }, [phase]);

  const restoreFromSync = useCallback((syncData: { duelState: DuelState; phase: string }) => {
    if (syncData.duelState) {
      useBattleStore.getState().setDuelState(syncData.duelState);
    }
    if (syncData.phase) {
      setPhase(syncData.phase as any);
    }
  }, [setPhase]);

  // ============ Return ============
  const gameLoopState: GameLoopState = useMemo(() => ({
    duelState,
    phase,
    isProcessing,
    turnTimeLeft,
    turnBanner,
    actionQueue: queue,
    playerCard,
    opponentCard,
    resultText,
    effectMessages,
    isGameOver,
    gameResult,
    aiStatus,
    targetingData,
  }), [duelState, phase, isProcessing, turnTimeLeft, turnBanner, queue, playerCard, opponentCard, resultText, effectMessages, isGameOver, gameResult, aiStatus, targetingData]);

  const gameLoopActions: GameLoopActions = useMemo(() => ({
    startDuel,
    startTavernDuel,
    startPvpDuel,
    playCard,
    passTurn,
    reset,
    setTargeting,
    handleMulligan,
    selectHeroSkill,
    useHeroSkill,
    startFirstTurn: startNewRound,
    handleRemotePlayCard,
    handleRemoteEndTurn,
    getSerializedState,
    restoreFromSync,
  }), [startDuel, startTavernDuel, startPvpDuel, playCard, passTurn, reset, setTargeting, handleMulligan, selectHeroSkill, useHeroSkill, startNewRound, handleRemotePlayCard, handleRemoteEndTurn, getSerializedState, restoreFromSync]);

  return [gameLoopState, gameLoopActions];
}

export default useGameLoop;
