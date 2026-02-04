import { useReducer, useCallback, useRef, useEffect } from 'react';
import { 
  SpellType, DuelPhase, DuelState, RoundResult, GameMode, AIProfile,
  GameLoopState, GameLoopAction, AIStatus
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
  targetingData: null
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
        effectMessages: [...state.effectMessages.slice(-4), action.payload] 
      };
    case 'SET_AI_STATUS':
      return { ...state, aiStatus: { ...state.aiStatus, ...action.payload } };
    case 'SET_TARGETING':
      return { ...state, targetingData: action.payload };
    case 'RESET_GAME':
      return initialGameLoopState;
    default:
      return state;
  }
}

export function useGameLoop(): [GameLoopState, any] {
  const [state, dispatch] = useReducer(gameReducer, initialGameLoopState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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
    let nextState = prepareNextTurn(currentState);
    const messages: string[] = [];
    
    // 玩家抽牌
    const pResult = drawCard(nextState.playerDeck, nextState.playerHand, nextState.playerFatigue);
    nextState.playerDeck = pResult.newDeck;
    nextState.playerHand = pResult.newHand;
    nextState.playerFatigue = pResult.newFatigue;
    
    if (pResult.fatigueDamage > 0) {
      nextState.playerHP = Math.max(0, nextState.playerHP - pResult.fatigueDamage);
      messages.push(`玩家由于疲劳受到 ${pResult.fatigueDamage} 点伤害`);
    }

    // 对手抽牌
    const oResult = drawCard(nextState.opponentDeck, [], nextState.opponentFatigue);
    nextState.opponentDeck = oResult.newDeck;
    nextState.opponentHandSize = Math.min(10, nextState.opponentHandSize + (oResult.drawnCard ? 1 : 0));
    nextState.opponentFatigue = oResult.newFatigue;
    
    if (oResult.fatigueDamage > 0) {
      nextState.opponentHP = Math.max(0, nextState.opponentHP - oResult.fatigueDamage);
      messages.push(`对手由于疲劳受到 ${oResult.fatigueDamage} 点伤害`);
    }

    dispatch({ type: 'UPDATE_STATE', payload: nextState });

    // 死亡检查
    const gameOverResult = checkGameOver(nextState);
    if (gameOverResult) {
        dispatch({ type: 'UPDATE_UI', payload: {
            isGameOver: true,
            gameResult: gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult,
            resultText: gameOverResult,
            isProcessing: false
        }});
        dispatch({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
        return;
    }
    
    dispatch({ type: 'SET_PHASE', payload: 'PLAYER_TURN' });
    dispatch({ type: 'UPDATE_UI', payload: {
        playerCard: null,
        opponentCard: null,
        isProcessing: false,
        effectMessages: messages.length > 0 ? messages : ['回合开始'],
        aiStatus: initialAIStatus
    }});
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

  // 玩家出牌 (Step-by-Step Actions)
  const playCard = useCallback(async (spellId: SpellType): Promise<boolean> => {
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
    
    dispatch({ type: 'UPDATE_UI', payload: { isProcessing: true, playerCard: spellId } });
    
    const { newState, command } = executeSpell(duelState, 'player', spellId);
    
    // 执行 Actions 队列
    for (const action of command.actions) {
        const currentDuelState = stateRef.current.duelState!;
        const result = GameSequenceExecutor.applyAction(currentDuelState, action);
        
        dispatch({ type: 'UPDATE_STATE', payload: result.state });
        if (result.log) dispatch({ type: 'ADD_MESSAGE', payload: result.log });
        
        await new Promise(resolve => setTimeout(resolve, ACTION_DELAY));
        
        if (result.state.playerHP <= 0 || result.state.opponentHP <= 0) break;
    }

    dispatch({ type: 'UPDATE_STATE', payload: newState });
    
    const gameOverResult = checkGameOver(newState);
    if (gameOverResult) {
        dispatch({ type: 'UPDATE_UI', payload: {
            isGameOver: true,
            gameResult: gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult,
            resultText: gameOverResult,
            isProcessing: false
        }});
        dispatch({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
        return true;
    }
    
    dispatch({ type: 'UPDATE_UI', payload: { isProcessing: false } });
    return true;
  }, []);

  // 玩家结束回合
  const passTurn = useCallback(() => {
    const { phase, duelState, isProcessing } = stateRef.current;
    if (phase !== 'PLAYER_TURN' || !duelState || isProcessing) return;
    
    dispatch({ type: 'SET_PHASE', payload: 'OPPONENT_TURN' });
    dispatch({ type: 'UPDATE_UI', payload: { isProcessing: true, playerCard: null } });
    dispatch({ type: 'ADD_MESSAGE', payload: '对手回合...' });
    dispatch({ type: 'SET_AI_STATUS', payload: { emote: 'thinking', message: '让我想想...' } });

    clearTimer();
    timerRef.current = setTimeout(async () => {
        const currentRefState = stateRef.current.duelState;
        if (!currentRefState) return;
        
        const { newState, commands } = executeAITurn(currentRefState);
        
        for (const cmd of commands) {
            if (cmd.sourceSpell) {
                dispatch({ type: 'UPDATE_UI', payload: { opponentCard: cmd.sourceSpell } });
                dispatch({ type: 'SET_AI_STATUS', payload: { emote: 'thinking_fast', message: '就是这张！' } });
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            for (const action of cmd.actions) {
                const innerState = stateRef.current.duelState!;
                const result = GameSequenceExecutor.applyAction(innerState, action);
                
                dispatch({ type: 'UPDATE_STATE', payload: result.state });
                if (result.log) dispatch({ type: 'ADD_MESSAGE', payload: result.log });
                
                await new Promise(resolve => setTimeout(resolve, ACTION_DELAY));
                if (result.state.playerHP <= 0 || result.state.opponentHP <= 0) break;
            }
            
            const interimState = stateRef.current.duelState!;
            if (interimState.playerHP <= 0 || interimState.opponentHP <= 0) break;
        }

        dispatch({ type: 'UPDATE_STATE', payload: newState });
        dispatch({ type: 'SET_AI_STATUS', payload: initialAIStatus });

        const gameOverResult = checkGameOver(newState);
        if (gameOverResult) {
            dispatch({ type: 'UPDATE_UI', payload: {
                isGameOver: true,
                gameResult: gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult,
                resultText: gameOverResult,
                isProcessing: false
            }});
            dispatch({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
        } else {
            timerRef.current = setTimeout(() => {
                const latest = stateRef.current.duelState;
                if (latest) startNewRound(latest);
            }, ROUND_TRANSITION_DELAY);
        }
    }, AI_DELAY);
    
  }, [startNewRound, clearTimer]);

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
