import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { GameRuleEngine } from '../services/GameRuleEngine';
import { useAnimationQueue } from './useAnimationQueue';
import { useTurnManager } from './useTurnManager';
import {
  AI_THINK_DELAY, AI_CARD_PLAY_DELAY, AI_EMOTE_DELAY,
  PHASE_TRANSITION_DELAY, BANNER_WAIT_DELAY, ROUND_TRANSITION_DELAY
} from '../config/timing';

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


  // ============ Logic Implementation ============

  // Start New Round Logic (Replaces _triggerNewRound)
  const startNewRound = useCallback((currentState: DuelState) => {
    const commands: GameActionCommand[] = [];
    let nextState = prepareNextTurn(currentState);
    
    // Death Check
    const gameOver = checkGameOver(nextState);
    if (gameOver) {
       commands.push({ type: 'UPDATE_STATE', payload: nextState });
       commands.push({ type: 'UPDATE_UI', payload: {
          isGameOver: true,
          gameResult: gameOver === 'DRAW' ? 'LOSS' : gameOver,
          resultText: gameOver,
       }});
       commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
       enqueue(commands);
       return;
    }

    // Draw Cards
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

    const gameOverResult = checkGameOver(nextState);
    if (gameOverResult) {
        commands.push({ type: 'UPDATE_UI', payload: {
            isGameOver: true,
            gameResult: gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult,
            resultText: gameOverResult,
        }});
        commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
    } else {
        // Round Start Sequence
                commands.push({ type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('player'), delay: PHASE_TRANSITION_DELAY });
        commands.push({ type: 'WAIT', payload: null, delay: BANNER_WAIT_DELAY });
        commands.push({ type: 'SET_PHASE', payload: 'PLAYER_TURN' }); 
        commands.push({ type: 'UPDATE_UI', payload: {
            playerCard: null,
            opponentCard: null,
            aiStatus: initialAIStatus
        }});
        commands.push({ type: 'ADD_MESSAGE', payload: `第 ${nextState.roundNumber} 回合开始` });
    }
    
    enqueue(commands);
  }, [enqueue, showTurnBanner]);

  // Start Duel Init
  const startDuel = useCallback((deck?: SpellType[], gameMode: GameMode = 'standard') => {
    const initialState = createInitialDuelState(deck || [], gameMode);
    setDuelState(initialState);
    setPhase('MULLIGAN_PHASE');
    setUiState(prev => ({
        ...prev, 
        isGameOver: false, 
        gameResult: null, 
        effectMessages: [],
        resultText: ''
    }));
  }, [setPhase]);

  // Start Tavern Duel Init
  const startTavernDuel = useCallback((deck: SpellType[], aiProfile: AIProfile, gameMode: GameMode = 'standard') => {
     const state = createTavernDuelState(deck, aiProfile, gameMode);
     setDuelState(state);
     setPhase('MULLIGAN_PHASE');
     setUiState(prev => ({ 
         ...prev, 
         isGameOver: false, 
         gameResult: null, 
         effectMessages: [],
         resultText: ''
     }));
  }, [setPhase]);

  // Play Card Action
   const playCard = useCallback((spellId: SpellType): boolean => {
      const state = duelStateRef.current;
      if (!state || phaseRef.current !== 'PLAYER_TURN' || isProcessing) return false;
      
      const affordable = canAffordSpell(spellId, state.playerMana, state.playerEffects, state.playerCostMod);
      if (!affordable.canAfford) {
          setUiState(prev => ({...prev, effectMessages: [...prev.effectMessages, affordable.reason || '无法出牌']}));
          return false;
      }
      
      setUiState(prev => ({ ...prev, playerCard: spellId }));
      
      // [P0 Refactor] Use GameRuleEngine to cast spell
      const { newState, commands: engineCommands } = GameRuleEngine.castSpell(state, spellId, 'player');
      
      const commands: GameActionCommand[] = [...engineCommands];
      
      // Game Over is checked inside castSpell and appropriate commands are added
      // We just need to ensure the queue processes them
      
      enqueue(commands);
      return true;
   }, [isProcessing, enqueue]);

  // Pass Turn Action
  const passTurn = useCallback(() => {
     const state = duelStateRef.current;
     if (!state || phaseRef.current !== 'PLAYER_TURN' || isProcessing) return;
     
     const commands: GameActionCommand[] = [];
     
          // Switch to Opponent Turn
     commands.push({ type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('opponent'), delay: PHASE_TRANSITION_DELAY });
     commands.push({ type: 'WAIT', payload: null, delay: BANNER_WAIT_DELAY });
     
     commands.push({ type: 'SET_PHASE', payload: 'OPPONENT_TURN' });
     commands.push({ type: 'UPDATE_UI', payload: { playerCard: null } });
     commands.push({ type: 'ADD_MESSAGE', payload: '对手回合...' });
     commands.push({ type: 'SET_AI_STATUS', payload: { emote: 'thinking', message: '让我想想...' }, delay: AI_EMOTE_DELAY });
     
     // [P1] 增加 AI 思考时间，避免出牌太快
     commands.push({ type: 'WAIT', payload: null, delay: AI_THINK_DELAY });
     
     // [P0 Fix 3.2] 使用 GameRuleEngine.castSpell 逐张处理 AI 的牌
     // 不再重放 executeAITurn 的 actions，避免双重执行
     const { newState: aiResultState, commands: aiCommands } = executeAITurn(state);
     
     // 构建中间状态快照链：从 AI 计算结果中提取每张牌的 UI 指令
     let progressState = { ...state };
     
     for (const cmd of aiCommands) {
        if (cmd.sourceSpell) {
            commands.push({ type: 'UPDATE_UI', payload: { opponentCard: cmd.sourceSpell } });
            commands.push({ type: 'SET_AI_STATUS', payload: { emote: 'thinking_fast', message: '就是这张！' }, delay: AI_EMOTE_DELAY });
        }

        // [P0 Fix 3.2] 使用 GameRuleEngine 重新计算每张牌的效果以生成正确的 UI 命令
        // 而非从 executeAITurn 的内部 actions 重复执行
        if (cmd.sourceSpell && cmd.sourceSpell !== 'skip') {
            const castResult = GameRuleEngine.castSpell(progressState, cmd.sourceSpell, 'opponent');
            progressState = castResult.newState;
            
            // 将 GameRuleEngine 生成的 UI 命令加入队列
            castResult.commands.forEach(c => commands.push(c));
            
            // [P0 AI Pacing] 每张牌打出后等待，让玩家看清
            commands.push({ type: 'WAIT', payload: null, delay: AI_CARD_PLAY_DELAY });
            
            if (checkGameOver(progressState)) break;
        } else if (cmd.sourceSpell === 'skip') {
            commands.push({ type: 'ADD_MESSAGE', payload: '对手跳过了出牌' });
        }
    }
    
    // 使用 progressState 作为后续逻辑的基础
    let tempState = progressState;
    
// Minion Combat Phase
    const activeMinionsCount = tempState.playerMinions.filter(m => !m.exhausted).length + tempState.opponentMinions.filter(m => !m.exhausted).length;
    
    if (activeMinionsCount > 0) {
        // [P0 Refactor] Use GameRuleEngine for sequential combat & death checks
        const combatResult = GameRuleEngine.resolveMinionCombat(tempState);
        tempState = combatResult.finalState;
        
        // Add all combat commands to the queue
        combatResult.commands.forEach(cmd => commands.push(cmd));
        
        // If game ended during combat, stop here (checkGameOver is handled inside resolveMinionCombat to add UI commands, but we need to break outer flow)
        if (checkGameOver(tempState)) {
             // commands already has the GAME_OVER UI updates from resolveMinionCombat
             enqueue(commands);
             return;
        }
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
        // Trigger Next Round
        commands.push({ type: 'WAIT', payload: null, delay: ROUND_TRANSITION_DELAY });
        commands.push({ 
           type: 'EXECUTE_LOGIC', 
           payload: () => {
              if (duelStateRef.current) startNewRound(duelStateRef.current);
           } 
        });
    }
    
    enqueue(commands);
  }, [enqueue, startNewRound, showTurnBanner]);
  
  passTurnRef.current = passTurn;
  
  // Handle Mulligan
  const handleMulligan = useCallback((indicesToReplace: number[]) => {
     if (!duelStateRef.current) return;
     const state = duelStateRef.current;
     
     let newHand = [...state.playerHand];
     let newDeck = [...state.playerDeck];
     
     indicesToReplace.forEach(index => {
       if (index < newHand.length && newDeck.length > 0) {
         const card = newHand[index];
         const newCard = newDeck[0];
         newDeck = newDeck.slice(1);
         newHand[index] = newCard;
         newDeck.push(card);
       }
     });
     newDeck = newDeck.sort(() => Math.random() - 0.5);
     
     const newState = { ...state, playerHand: newHand, playerDeck: newDeck };
     setDuelState(newState);
     
     // Start Game Sequence
          const commands: GameActionCommand[] = [
        { type: 'UPDATE_STATE', payload: newState },
        // Show Player Turn Banner via Queue
        { type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('player'), delay: PHASE_TRANSITION_DELAY },
        { type: 'WAIT', payload: null, delay: BANNER_WAIT_DELAY },
        { type: 'ADD_MESSAGE', payload: '对战开始！你的回合。' },
        // Trigger Round 1 Start (Mana, Draw)
        { 
            type: 'EXECUTE_LOGIC', 
            payload: () => startNewRound({ ...newState, roundNumber: 0 }),
            delay: ROUND_TRANSITION_DELAY 
        }
     ];
     
     setUiState(prev => ({...prev, effectMessages: []}));
     enqueue(commands);
     
  }, [enqueue, startNewRound, showTurnBanner]);
  
  
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
