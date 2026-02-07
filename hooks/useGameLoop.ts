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

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  SpellType, DuelState, GameMode, AIProfile,
  GameLoopState, AIStatus, GameActionCommand
} from '../types';
import { useAnimationQueue } from './useAnimationQueue';
import { useTurnManager } from './useTurnManager';
import { useRoundManager } from './useRoundManager';
import { usePlayerActions } from './usePlayerActions';
import { useAITurn } from './useAITurn';

const initialAIStatus: AIStatus = { emote: null, message: null };

export interface GameLoopActions {
  startDuel: (playerDeck: SpellType[], opponentDeck: SpellType[], mode: GameMode) => void;
  startTavernDuel: (playerDeck: SpellType[], opponentProfile: AIProfile, mode: GameMode) => void;
  playCard: (spellId: SpellType, e?: React.MouseEvent) => boolean;
  passTurn: () => void;
  reset: () => void;
  setTargeting: (data: GameLoopState['targetingData']) => void;
  handleMulligan: (indicesToReplace: number[]) => void;
  startFirstTurn: (currentState: DuelState) => void;
}

export function useGameLoop(): [GameLoopState, GameLoopActions] {
  // ============ [#6] Processing Lock ============
  // 使用 ref 而非 state 来追踪锁状态，避免额外渲染
  const processingLockRef = useRef(false);
  const actionInProgressRef = useRef<string | null>(null);

  // 1. Core State
  const [duelState, setDuelState] = useState<DuelState | null>(null);
  
  // 2. UI State - 合并为单一对象减少更新次数
  const [uiState, setUiState] = useState<{
    playerCard: SpellType | null;
    opponentCard: SpellType | null;
    resultText: string;
    effectMessages: string[];
    isGameOver: boolean;
    gameResult: 'WIN' | 'LOSS' | 'DRAW' | null;
    aiStatus: AIStatus;
    targetingData: GameLoopState['targetingData']; 
  }>({
    playerCard: null,
    opponentCard: null,
    resultText: '',
    effectMessages: [],
    isGameOver: false,
    gameResult: null,
    aiStatus: initialAIStatus,
    targetingData: null,
  });

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

  // 4. Command Processor - [#6] 优化批处理
  const processAction = useCallback((action: GameActionCommand) => {
    switch (action.type) {
      case 'UPDATE_STATE':
        setDuelState(prev => {
          if (!prev) return null;
          // [#6] 浅合并优化，避免深拷贝
          return { ...prev, ...action.payload };
        });
        break;
        
      case 'ADD_MESSAGE':
        setUiState(prev => ({ 
          ...prev, 
          // [#6] 限制消息数量，防止内存泄漏
          effectMessages: [...prev.effectMessages.slice(-30), action.payload] 
        }));
        break;
        
      case 'SET_PHASE':
        setPhase(action.payload);
        break;
        
      case 'UPDATE_UI':
        setUiState(prev => ({ ...prev, ...action.payload }));
        break;
        
      case 'SET_AI_STATUS':
        setUiState(prev => ({ 
          ...prev, 
          aiStatus: { ...prev.aiStatus, ...action.payload } 
        }));
        break;
        
      case 'SET_TARGETING':
        setUiState(prev => ({ ...prev, targetingData: action.payload }));
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

  // Refs for checking current state in callbacks
  const duelStateRef = useRef(duelState);
  useEffect(() => { duelStateRef.current = duelState; }, [duelState]);
  
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

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

  const { startNewRound } = useRoundManager({ enqueue: safeEnqueue, showTurnBanner });

  const { playCard, handleMulligan, startDuel, startTavernDuel } = usePlayerActions({
    duelStateRef,
    phaseRef,
    isProcessing,
    enqueue: safeEnqueue,
    showTurnBanner,
    setDuelState: (s) => setDuelState(s),
    setPhase,
    setUiState,
    startNewRound,
  });

  const { passTurn } = useAITurn({
    duelStateRef,
    phaseRef,
    isProcessing,
    enqueue: safeEnqueue,
    showTurnBanner,
    startNewRound,
  });
  
  passTurnRef.current = passTurn;
  
  // ============ Persistence ============
  useEffect(() => {
    if (duelState && phase !== 'DRAFT_PHASE' && !uiState.isGameOver) {
      // [#6] 使用 requestIdleCallback 延迟保存，避免阻塞主线程
      const saveData = {
        duelState,
        phase,
        effectMessages: uiState.effectMessages.slice(-20) // 只保存最近20条
      };
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          localStorage.setItem('wizard_duel_save', JSON.stringify(saveData));
        });
      } else {
        localStorage.setItem('wizard_duel_save', JSON.stringify(saveData));
      }
    } else if (uiState.isGameOver) {
      localStorage.removeItem('wizard_duel_save');
    }
  }, [duelState, phase, uiState.isGameOver, uiState.effectMessages]);
  
  // Restore saved game on mount
  useEffect(() => {
    const saved = localStorage.getItem('wizard_duel_save');
    if (saved && !duelState) {
      try {
        const parsed = JSON.parse(saved);
        setDuelState(parsed.duelState);
        setPhase(parsed.phase);
        setUiState(prev => ({ ...prev, effectMessages: parsed.effectMessages || [] }));
      } catch (e) {
        console.error('Failed to restore game:', e);
        localStorage.removeItem('wizard_duel_save');
      }
    }
  }, []); // Once on mount
  
  // ============ Reset ============
  const reset = useCallback(() => {
    // [#6] 清除所有锁和进行中的动作
    processingLockRef.current = false;
    actionInProgressRef.current = null;
    
    clearQueue();
    resetTurnManager();
    setDuelState(null);
    setUiState({
      playerCard: null,
      opponentCard: null,
      resultText: '',
      effectMessages: [],
      isGameOver: false,
      gameResult: null,
      aiStatus: initialAIStatus,
      targetingData: null,
    });
  }, [clearQueue, resetTurnManager]);

  // ============ [#6] 优化的 setTargeting ============
  const setTargeting = useCallback((data: GameLoopState['targetingData']) => {
    setUiState(prev => {
      // 避免不必要的更新
      if (prev.targetingData === data) return prev;
      return { ...prev, targetingData: data };
    });
  }, []);

  // ============ Return ============
  return [
    {
      duelState,
      phase,
      isProcessing,
      turnTimeLeft,
      turnBanner,
      actionQueue: queue,
      ...uiState
    },
    {
      startDuel,
      startTavernDuel,
      playCard,
      passTurn,
      reset,
      setTargeting,
      handleMulligan,
      startFirstTurn: startNewRound
    }
  ];
}

export default useGameLoop;
