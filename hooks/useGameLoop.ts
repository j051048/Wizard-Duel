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
import { throttle } from '../utils/helpers';
import { GameFSM } from '../services/GameFSM';
import { restoreGameRNG } from '../utils/seededRandom';
import { GameRuleEngine } from '../services/GameRuleEngine';
import { AI_DIFFICULTY_PRESETS } from '../services/ai';
import { resolveDifficultyKey } from '../data/aiDecks';

const initialAIStatus: AIStatus = { emote: null, message: null };

// [P2 Fix #22] 节流保存函数，3秒内只保存一次
const throttledSave = throttle((data: object) => {
  localStorage.setItem('wizard_duel_save', JSON.stringify(data));
}, 3000);

export interface GameLoopActions {
  startDuel: (playerDeck: SpellType[], opponentDeck: SpellType[], mode: GameMode) => void;
  startTavernDuel: (playerDeck: SpellType[], opponentProfile: AIProfile, mode: GameMode) => void;
  playCard: (spellId: SpellType, e?: React.MouseEvent) => boolean;
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
    setDuelState: (s) => setDuelState(s),
    setPhase,
    setUiState,
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
    setUiState(prev => ({ ...prev, opponentCard: spellId }));
    
    // [关键修复] PVP 模式下本地 opponentHand 与远程实际不同步
    // castSpell → executeSpell 内部会校验手牌是否持有该卡 (casterHasCard)
    // 如果 opponentHand 中没有这张卡，castSpell 会返回 noop（不执行伤害）
    // 解决方案：在调用前将该卡强制注入 opponentHand，确保校验通过
    const patchedState: typeof state = {
      ...state,
      opponentHand: state.opponentHand.includes(spellId)
        ? state.opponentHand
        : [...state.opponentHand, spellId],
    };
    
    // 以对手身份执行法术结算
    const { commands: engineCommands } = GameRuleEngine.castSpell(patchedState, spellId, 'opponent');
    safeEnqueue([...engineCommands], `remote_play_${spellId}_${Date.now()}`);
  }, [duelStateRef, safeEnqueue, setUiState]);
  
  passTurnRef.current = passTurn;
  
  // ============ Persistence ============
  // [P0 Bug 4 Fix] 完整保存战斗状态，包括回合数、状态效果剩余回合等
  useEffect(() => {
    if (duelState && phase !== 'DRAFT_PHASE' && !uiState.isGameOver) {
      // [#6] 使用 requestIdleCallback 延迟保存，避免阻塞主线程
      // [P0 Bug 4] 完整保存 duelState，确保断线重连时能恢复：
      // - roundNumber (当前回合数)
      // - playerEffects/opponentEffects (状态效果及剩余回合数)
      // - playerFatigue/opponentFatigue (疲劳计数)
      // - heroSkillsUsed/opponentHeroSkillUsed (英雄技能使用状态)
      const saveData = {
        duelState: {
          ...duelState,
          // 确保状态效果完整保存（包括 duration）
          playerEffects: duelState.playerEffects.map(e => ({ ...e })),
          opponentEffects: duelState.opponentEffects.map(e => ({ ...e })),
        },
        phase,
        effectMessages: uiState.effectMessages.slice(-20), // 只保存最近20条
        savedAt: Date.now(), // 记录保存时间，用于调试
      };
      
      // [P2 Fix #22] 使用节流保存，减少 localStorage 写入频率
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => throttledSave(saveData));
      } else {
        throttledSave(saveData);
      }
    } else if (uiState.isGameOver) {
      localStorage.removeItem('wizard_duel_save');
    }
  }, [duelState, phase, uiState.isGameOver, uiState.effectMessages]);
  
  // Restore saved game on mount
  // [P0 Bug 4 Fix] 完整恢复战斗状态
  useEffect(() => {
    const saved = localStorage.getItem('wizard_duel_save');
    if (saved && !duelState) {
      try {
        const parsed = JSON.parse(saved);
              // [P0 Bug 4] 验证保存数据的完整性
        if (parsed.duelState && 
            typeof parsed.duelState.roundNumber === 'number' &&
            Array.isArray(parsed.duelState.playerEffects) &&
            Array.isArray(parsed.duelState.opponentEffects)) {
          // 恢复完整的 duelState
          setDuelState(parsed.duelState);
          setPhase(parsed.phase);
          // [P0 Fix #1] 恢复 FSM 状态
          fsmRef.current.reset(parsed.phase);
          // [P0 Fix #2] 恢复 RNG 状态（确定性重连）
          if (parsed.duelState.rngState) {
            restoreGameRNG(parsed.duelState.rngState);
            console.log('[GameLoop] RNG 状态已恢复, seed:', parsed.duelState.rngState.initialSeed, 'calls:', parsed.duelState.rngState.callCount);
          }
          setUiState(prev => ({ 
            ...prev, 
            effectMessages: parsed.effectMessages || [],
          }));
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
    // [#6] 清除所有锁和进行中的动作
    processingLockRef.current = false;
    actionInProgressRef.current = null;
    // [P0 Fix #1] 重置 FSM
    fsmRef.current.reset('DRAFT_PHASE');
    
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

  // ============ [P0-4] PvP State Sync ============
  const getSerializedState = useCallback(() => {
    return { duelState, phase };
  }, [duelState, phase]);

  const restoreFromSync = useCallback((syncData: { duelState: DuelState; phase: string }) => {
    if (syncData.duelState) {
      setDuelState(syncData.duelState);
    }
    if (syncData.phase) {
      setPhase(syncData.phase as any);
    }
  }, [setPhase]);

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
    }
  ];
}

export default useGameLoop;
