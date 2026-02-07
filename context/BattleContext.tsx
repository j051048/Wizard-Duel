/**
 * BattleContext - 战斗场景上下文
 * 
 * [Phase B-2] 替代 props drilling，让子组件直接订阅需要的状态切片
 * 避免 gameLoopState 整体传递导致全树重渲染
 */

import React, { createContext, useContext, useMemo } from 'react';
import { DuelState, DuelPhase, SpellType, AIStatus, GameLoopState } from '../types';

// ============ 状态切片类型 ============

export interface BattleDuelSlice {
  duelState: DuelState | null;
}

export interface BattlePhaseSlice {
  phase: DuelPhase;
  isProcessing: boolean;
  turnTimeLeft: number;
  turnBanner: 'player' | 'opponent' | null;
}

export interface BattleUISlice {
  playerCard: SpellType | null;
  opponentCard: SpellType | null;
  resultText: string;
  effectMessages: string[];
  isGameOver: boolean;
  gameResult: 'WIN' | 'LOSS' | 'DRAW' | null;
  aiStatus: AIStatus;
  targetingData: GameLoopState['targetingData'];
}

// ============ Context 定义 ============

const BattleDuelContext = createContext<BattleDuelSlice | null>(null);
const BattlePhaseContext = createContext<BattlePhaseSlice | null>(null);
const BattleUIContext = createContext<BattleUISlice | null>(null);

// ============ Provider ============

interface BattleProviderProps {
  gameLoopState: GameLoopState;
  children: React.ReactNode;
}

export const BattleProvider: React.FC<BattleProviderProps> = ({ gameLoopState, children }) => {
  // 切片记忆化 — 只有相关字段变化时才创建新对象
  const duelSlice = useMemo<BattleDuelSlice>(() => ({
    duelState: gameLoopState.duelState,
  }), [gameLoopState.duelState]);

  const phaseSlice = useMemo<BattlePhaseSlice>(() => ({
    phase: gameLoopState.phase,
    isProcessing: gameLoopState.isProcessing,
    turnTimeLeft: gameLoopState.turnTimeLeft,
    turnBanner: gameLoopState.turnBanner,
  }), [gameLoopState.phase, gameLoopState.isProcessing, gameLoopState.turnTimeLeft, gameLoopState.turnBanner]);

  const uiSlice = useMemo<BattleUISlice>(() => ({
    playerCard: gameLoopState.playerCard,
    opponentCard: gameLoopState.opponentCard,
    resultText: gameLoopState.resultText,
    effectMessages: gameLoopState.effectMessages,
    isGameOver: gameLoopState.isGameOver,
    gameResult: gameLoopState.gameResult,
    aiStatus: gameLoopState.aiStatus,
    targetingData: gameLoopState.targetingData,
  }), [
    gameLoopState.playerCard, gameLoopState.opponentCard,
    gameLoopState.resultText, gameLoopState.effectMessages,
    gameLoopState.isGameOver, gameLoopState.gameResult,
    gameLoopState.aiStatus, gameLoopState.targetingData,
  ]);

  return (
    <BattleDuelContext.Provider value={duelSlice}>
      <BattlePhaseContext.Provider value={phaseSlice}>
        <BattleUIContext.Provider value={uiSlice}>
          {children}
        </BattleUIContext.Provider>
      </BattlePhaseContext.Provider>
    </BattleDuelContext.Provider>
  );
};

// ============ Consumer Hooks ============

export function useBattleDuel(): BattleDuelSlice {
  const ctx = useContext(BattleDuelContext);
  if (!ctx) throw new Error('useBattleDuel must be used within BattleProvider');
  return ctx;
}

export function useBattlePhase(): BattlePhaseSlice {
  const ctx = useContext(BattlePhaseContext);
  if (!ctx) throw new Error('useBattlePhase must be used within BattleProvider');
  return ctx;
}

export function useBattleUI(): BattleUISlice {
  const ctx = useContext(BattleUIContext);
  if (!ctx) throw new Error('useBattleUI must be used within BattleProvider');
  return ctx;
}