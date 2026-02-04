import React, { useReducer, useCallback, useRef, useEffect } from 'react';
import { 
  SpellType, DuelPhase, DuelState, RoundResult, GameMode, AIProfile,
  GameLoopState, GameLoopAction, AIStatus, GameActionCommand
} from '../types';
import { 
  createInitialDuelState, executeSpell, executeAITurn,
  prepareNextTurn, drawCard, createTavernDuelState,
  canAffordSpell, checkGameOver
} from '../services/gameLogic';
import { GameSequenceExecutor } from '../services/sequence';

// 阶段持续时间 (毫秒)
const AI_DELAY = 1000;
const ROUND_TRANSITION_DELAY = 1500;
const ACTION_DELAY = 450; // 炉石级结算节奏感延迟

const initialAIStatus: AIStatus = { emote: null, message: null };

export type { GameLoopState };

export interface GameLoopActions {
  startDuel: (playerDeck: SpellType[], opponentDeck: SpellType[], mode: GameMode) => void;
  startTavernDuel: (playerDeck: SpellType[], opponentProfile: AIProfile, mode: GameMode) => void;
  playCard: (spellId: SpellType, e?: React.MouseEvent) => boolean;
  passTurn: () => void;
  reset: () => void;
  setTargeting: (data: GameLoopState['targetingData']) => void;
}

const initialGameLoopState: GameLoopState = {
  duelState: null,
  phase: 'DRAFT_PHASE',
  playerCard: null,
  opponentCard: null,
  resultText: '',
  effectMessages: [],
  isGameOver: false,
  gameResult: null,
  isProcessing: false,
  aiStatus: initialAIStatus,
  targetingData: null,
  actionQueue: []
};

function gameReducer(state: GameLoopState, action: GameLoopAction): GameLoopState {
  switch (action.type) {
    case 'START_GAME':
      return { 
        ...initialGameLoopState, 
        duelState: action.payload,
        phase: 'PLAYER_TURN' 
      };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'UPDATE_STATE':
      return { 
        ...state, 
        duelState: state.duelState ? { ...state.duelState, ...action.payload } : null 
      };
    case 'UPDATE_UI':
      return { ...state, ...action.payload };
    case 'ADD_MESSAGE':
      return { 
        ...state, 
        effectMessages: [...state.effectMessages.slice(-50), action.payload] 
      };
    case 'SET_AI_STATUS':
      return { ...state, aiStatus: { ...state.aiStatus, ...action.payload } };
    case 'SET_TARGETING':
      return { ...state, targetingData: action.payload };
    case 'ENQUEUE_ACTIONS':
      return { ...state, actionQueue: [...state.actionQueue, ...action.payload], isProcessing: true };
    case 'DEQUEUE_ACTION':
      return { ...state, actionQueue: state.actionQueue.slice(1), isProcessing: state.actionQueue.length > 1 };
    case 'RESET_GAME':
      return initialGameLoopState;
    default:
      return state;
  }
}

export function useGameLoop(): [GameLoopState, GameLoopActions] {
  const [state, dispatch] = useReducer(gameReducer, initialGameLoopState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // [New 6.1] 状态持久化：断线重连基础
  useEffect(() => {
    if (state.duelState && state.phase !== 'DRAFT_PHASE' && !state.isGameOver) {
      localStorage.setItem('wizard_duel_save', JSON.stringify({
        duelState: state.duelState,
        phase: state.phase,
        effectMessages: state.effectMessages
      }));
    } else if (state.isGameOver) {
      localStorage.removeItem('wizard_duel_save');
    }
  }, [state.duelState, state.phase, state.isGameOver]);

  // 恢复状态
  useEffect(() => {
    const saved = localStorage.getItem('wizard_duel_save');
    if (saved && !state.duelState) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'UPDATE_UI', payload: parsed });
      } catch (e) {
        console.error('Failed to restore game:', e);
      }
    }
  }, []);
  useEffect(() => {
    if (state.actionQueue.length === 0 || timerRef.current) return;

    const action = state.actionQueue[0];
    const delay = action.delay !== undefined ? action.delay : ACTION_DELAY;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      
      switch (action.type) {
        case 'UPDATE_STATE':
          dispatch({ type: 'UPDATE_STATE', payload: action.payload });
          break;
        case 'ADD_MESSAGE':
          dispatch({ type: 'ADD_MESSAGE', payload: action.payload });
          break;
        case 'SET_PHASE':
          dispatch({ type: 'SET_PHASE', payload: action.payload });
          break;
        case 'SET_AI_STATUS':
          dispatch({ type: 'SET_AI_STATUS', payload: action.payload });
          break;
        case 'PLAY_ANIMATION':
          // 暂时透传给 UI 控制
          dispatch({ type: 'UPDATE_UI', payload: action.payload });
          break;
        case 'UPDATE_UI':
          dispatch({ type: 'UPDATE_UI', payload: action.payload });
          break;
        case 'WAIT':
          break;
      }
      
      dispatch({ type: 'DEQUEUE_ACTION' });
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.actionQueue]);

  // 使用 ref 追踪最新的 state，解决异步逻辑闭包问题
  const stateRef = useRef<GameLoopState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 启动新回合
  const startNewRound = useCallback((currentState: DuelState) => {
    const commands: GameActionCommand[] = [];
    let nextState = prepareNextTurn(currentState);
    
    // 抽牌逻辑
    const pResult = drawCard(nextState.playerDeck, nextState.playerHand, nextState.playerFatigue);
    nextState.playerDeck = pResult.newDeck;
    nextState.playerHand = pResult.newHand;
    nextState.playerFatigue = pResult.newFatigue;
    
    if (pResult.fatigueDamage > 0) {
      nextState.playerHP = Math.max(0, nextState.playerHP - pResult.fatigueDamage);
      commands.push({ type: 'ADD_MESSAGE', payload: `玩家由于疲劳受到 ${pResult.fatigueDamage} 点伤害` });
    }

    const oResult = drawCard(nextState.opponentDeck, nextState.opponentHand, nextState.opponentFatigue);
    nextState.opponentDeck = oResult.newDeck;
    nextState.opponentHand = oResult.newHand;
    nextState.opponentHandSize = nextState.opponentHand.length;
    nextState.opponentFatigue = oResult.newFatigue;
    
    if (oResult.fatigueDamage > 0) {
      nextState.opponentHP = Math.max(0, nextState.opponentHP - oResult.fatigueDamage);
      commands.push({ type: 'ADD_MESSAGE', payload: `对手由于疲劳受到 ${oResult.fatigueDamage} 点伤害` });
    }

    commands.push({ type: 'UPDATE_STATE', payload: nextState });

    // 死亡检查
    const gameOverResult = checkGameOver(nextState);
    if (gameOverResult) {
        commands.push({ type: 'UPDATE_UI', payload: {
            isGameOver: true,
            gameResult: gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult,
            resultText: gameOverResult,
        }});
        commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
    } else {
        commands.push({ type: 'SET_PHASE', payload: 'PLAYER_TURN' });
        commands.push({ type: 'UPDATE_UI', payload: {
            playerCard: null,
            opponentCard: null,
            effectMessages: commands.length > 0 ? [] : ['回合开始'],
            aiStatus: initialAIStatus
        }});
    }
    
    dispatch({ type: 'ENQUEUE_ACTIONS', payload: commands });
  }, []);

  // 开始对战
  const startDuel = useCallback((deck?: SpellType[], gameMode: GameMode = 'standard') => {
    const initialState = createInitialDuelState(deck || [], gameMode);
    dispatch({ type: 'START_GAME', payload: initialState });
    startNewRound(initialState);
  }, [startNewRound]);

  const startTavernDuel = useCallback((deck: SpellType[], aiProfile: AIProfile, gameMode: GameMode = 'standard') => {
    const initialState = createTavernDuelState(deck, aiProfile, gameMode);
    dispatch({ type: 'START_GAME', payload: initialState });
    startNewRound(initialState);
  }, [startNewRound]);

  // 玩家出牌
  const playCard = useCallback((spellId: SpellType): boolean => {
    const { phase, duelState, isProcessing } = stateRef.current;
    if (phase !== 'PLAYER_TURN' || !duelState || isProcessing) return false;

    if (duelState.playerEffects.some(e => e.type === 'frozen')) {
        dispatch({ type: 'ADD_MESSAGE', payload: '❄️ 你被冻结了，本回合无法出牌！' });
        return false;
    }

    const affordable = canAffordSpell(spellId, duelState.playerMana, duelState.playerEffects, duelState.playerCostMod);
    if (!affordable.canAfford) {
        dispatch({ type: 'ADD_MESSAGE', payload: affordable.reason || '无法出牌' });
        return false;
    }
    
    const commands: GameActionCommand[] = [];
    commands.push({ type: 'UPDATE_UI', payload: { playerCard: spellId } });
    
    const { newState, command } = executeSpell(duelState, 'player', spellId);
    
    let tempState = { ...duelState };
    for (const action of command.actions) {
        const result = GameSequenceExecutor.applyAction(tempState, action);
        tempState = result.state;
        commands.push({ type: 'UPDATE_STATE', payload: result.state });
        if (result.log) commands.push({ type: 'ADD_MESSAGE', payload: result.log });
        
        if (tempState.playerHP <= 0 || tempState.opponentHP <= 0) break;
    }

    const gameOverResult = checkGameOver(tempState);
    if (gameOverResult) {
        commands.push({ type: 'UPDATE_UI', payload: {
            isGameOver: true,
            gameResult: gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult,
            resultText: gameOverResult,
        }});
        commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
    } else {
        commands.push({ type: 'UPDATE_STATE', payload: newState });
    }
    
    dispatch({ type: 'ENQUEUE_ACTIONS', payload: commands });
    return true;
  }, []);

  // 玩家结束回合
  const passTurn = useCallback(() => {
    const { phase, duelState, isProcessing } = stateRef.current;
    if (phase !== 'PLAYER_TURN' || !duelState || isProcessing) return;
    
    const commands: GameActionCommand[] = [];
    commands.push({ type: 'SET_PHASE', payload: 'OPPONENT_TURN' });
    commands.push({ type: 'UPDATE_UI', payload: { playerCard: null } });
    commands.push({ type: 'ADD_MESSAGE', payload: '对手回合...' });
    commands.push({ type: 'SET_AI_STATUS', payload: { emote: 'thinking', message: '让我想想...' }, delay: 1000 });

    const { newState, commands: aiCommands } = executeAITurn(duelState);
    
    let tempState = { ...duelState };
    for (const cmd of aiCommands) {
        if (cmd.sourceSpell) {
            commands.push({ type: 'UPDATE_UI', payload: { opponentCard: cmd.sourceSpell } });
            commands.push({ type: 'SET_AI_STATUS', payload: { emote: 'thinking_fast', message: '就是这张！' }, delay: 800 });
        }

        for (const action of cmd.actions) {
            const result = GameSequenceExecutor.applyAction(tempState, action);
            tempState = result.state;
            commands.push({ type: 'UPDATE_STATE', payload: result.state });
            if (result.log) commands.push({ type: 'ADD_MESSAGE', payload: result.log });
            if (tempState.playerHP <= 0 || tempState.opponentHP <= 0) break;
        }
        if (tempState.playerHP <= 0 || tempState.opponentHP <= 0) break;
    }

    // [New 6.3] 随从攻击阶段 (Board Combat Phase)
    const activeMinions = [...tempState.playerMinions, ...tempState.opponentMinions].filter(m => !m.exhausted);
    if (activeMinions.length > 0) {
        commands.push({ type: 'ADD_MESSAGE', payload: '随从进攻阶段！' });
        commands.push({ type: 'WAIT', payload: null, delay: 500 });
        
        // 玩家随从攻击
        tempState.playerMinions.forEach((m, idx) => {
            if (!m.exhausted) {
                const action = { type: 'MINION_ATTACK', target: 'player', value: idx } as any;
                const result = GameSequenceExecutor.applyAction(tempState, action);
                tempState = result.state;
                commands.push({ type: 'UPDATE_STATE', payload: tempState });
                if (result.log) commands.push({ type: 'ADD_MESSAGE', payload: result.log });
            }
        });

        // 对手随从攻击
        tempState.opponentMinions.forEach((m, idx) => {
            if (!m.exhausted) {
                const action = { type: 'MINION_ATTACK', target: 'opponent', value: idx } as any;
                const result = GameSequenceExecutor.applyAction(tempState, action);
                tempState = result.state;
                commands.push({ type: 'UPDATE_STATE', payload: tempState });
                if (result.log) commands.push({ type: 'ADD_MESSAGE', payload: result.log });
            }
        });
    }

    const gameOverResult = checkGameOver(tempState);
    if (gameOverResult) {
        commands.push({ type: 'UPDATE_UI', payload: {
            isGameOver: true,
            gameResult: gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult,
            resultText: gameOverResult,
        }});
        commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
    } else {
        commands.push({ type: 'WAIT', payload: null, delay: 1000 });
        commands.push({ type: 'PLAY_ANIMATION', payload: { _triggerNewRound: Date.now() } }); 
    }

    dispatch({ type: 'ENQUEUE_ACTIONS', payload: commands });
  }, []);

  // 特殊效果：触发新回合
  useEffect(() => {
    if ((state as any)._triggerNewRound && state.duelState) {
        startNewRound(state.duelState);
    }
  }, [(state as any)._triggerNewRound]);

  const reset = useCallback(() => {
    clearTimer();
    dispatch({ type: 'RESET_GAME' });
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return [
    state,
    {
      startDuel,
      startTavernDuel,
      playCard,
      passTurn,
      reset,
      setTargeting: (data: GameLoopState['targetingData']) => dispatch({ type: 'SET_TARGETING', payload: data })
    }
  ];
}


export default useGameLoop;
