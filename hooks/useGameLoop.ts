/**
 * useGameLoop - 游戏主循环 (组合层)
 * 
 * [Phase B-1] 精简为组合层，职责分离到：
 * - useRoundManager: 回合流转 (prepareNextTurn/drawCard/死亡检查)
 * - usePlayerActions: 玩家行动 (playCard/mulligan/startDuel)
 * - useAITurn: AI 回合执行 (passTurn)
 * - useTurnManager: 计时器/横幅
 * - useAnimationQueue: 指令队列
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  // 1. Core State
  const [duelState, setDuelState] = useState<DuelState | null>(null);
  
  // 2. UI State
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
  const passTurnRef = useRef<() => void>();

  // 3. Turn Manager Hook
  const { 
    phase, turnTimeLeft, turnBanner, 
    setPhase, showTurnBanner, resetTurnManager 
  } = useTurnManager('DRAFT_PHASE', () => {
    // Timeout Handling
    passTurnRef.current?.();
  });

  // 4. Command Processor
  const processAction = useCallback((action: GameActionCommand) => {
    switch (action.type) {
      case 'UPDATE_STATE':
        setDuelState(prev => prev ? ({ ...prev, ...action.payload }) : null);
        break;
      case 'ADD_MESSAGE':
        setUiState(prev => ({ 
            ...prev, 
            effectMessages: [...prev.effectMessages.slice(-50), action.payload] 
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
      case 'SET_TARGETING': // If passed as command
         setUiState(prev => ({ ...prev, targetingData: action.payload }));
         break;
      case 'EXECUTE_LOGIC':
         if (typeof action.payload === 'function') {
            action.payload();
         }
         break;
      // PLAY_ANIMATION and WAIT are handled implicitly by UI observing state or queue delay
    }
  }, [setPhase]);

  // 5. Animation Queue Hook
  const { queue, isProcessing, enqueue, clearQueue } = useAnimationQueue(processAction);

  // Refs for checking current state in callbacks
  const duelStateRef = useRef(duelState);
  useEffect(() => { duelStateRef.current = duelState; }, [duelState]);
  
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);


    // ============ [B-1] 组合拆分后的子 Hooks ============

  const { startNewRound } = useRoundManager({ enqueue, showTurnBanner });

  const { playCard, handleMulligan, startDuel, startTavernDuel } = usePlayerActions({
    duelStateRef,
    phaseRef,
    isProcessing,
    enqueue,
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
    enqueue,
    showTurnBanner,
    startNewRound,
  });
  
  passTurnRef.current = passTurn;
  
  
  // Persistence
  useEffect(() => {
    if (duelState && phase !== 'DRAFT_PHASE' && !uiState.isGameOver) {
      localStorage.setItem('wizard_duel_save', JSON.stringify({
        duelState, phase, effectMessages: uiState.effectMessages
      }));
    } else if (uiState.isGameOver) {
      localStorage.removeItem('wizard_duel_save');
    }
  }, [duelState, phase, uiState.isGameOver, uiState.effectMessages]);
  
  useEffect(() => {
    const saved = localStorage.getItem('wizard_duel_save');
    if (saved && !duelState) {
      try {
        const parsed = JSON.parse(saved);
        setDuelState(parsed.duelState);
        setPhase(parsed.phase);
        setUiState(prev => ({...prev, effectMessages: parsed.effectMessages || []}));
      } catch (e) {
        console.error('Failed to restore game:', e);
      }
    }
  }, []); // Once
  
  const reset = useCallback(() => {
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
       setTargeting: (d) => setUiState(prev => ({...prev, targetingData: d})),
       handleMulligan,
       startFirstTurn: startNewRound
    }
  ];
}

export default useGameLoop;
