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
import { useAnimationQueue } from './useAnimationQueue';
import { useTurnManager } from './useTurnManager';

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
        commands.push({ type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('player'), delay: 200 });
        commands.push({ type: 'WAIT', payload: null, delay: 1500 });
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
      
      const commands: GameActionCommand[] = [];
      const { newState, command } = executeSpell(state, 'player', spellId);
      
      // Simulate actions for immediate UI feedback commands
      let tempState = { ...state };
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
      
      enqueue(commands);
      return true;
   }, [isProcessing, enqueue]);

  // Pass Turn Action
  const passTurn = useCallback(() => {
     const state = duelStateRef.current;
     if (!state || phaseRef.current !== 'PLAYER_TURN' || isProcessing) return;
     
     const commands: GameActionCommand[] = [];
     
     // Switch to Opponent Turn
     commands.push({ type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('opponent'), delay: 200 });
     commands.push({ type: 'WAIT', payload: null, delay: 1500 });
     
     commands.push({ type: 'SET_PHASE', payload: 'OPPONENT_TURN' });
     commands.push({ type: 'UPDATE_UI', payload: { playerCard: null } });
     commands.push({ type: 'ADD_MESSAGE', payload: '对手回合...' });
     commands.push({ type: 'SET_AI_STATUS', payload: { emote: 'thinking', message: '让我想想...' }, delay: 1000 });
     
     // [P1] 增加 AI 思考时间，避免出牌太快
     commands.push({ type: 'WAIT', payload: null, delay: 1500 });
     
     // Calculate AI Turn
     const { newState, commands: aiCommands } = executeAITurn(state);
     
     let tempState = { ...state };
     
     // Process AI Actions
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
    
    // Minion Combat Phase
    const activeMinions = [...tempState.playerMinions, ...tempState.opponentMinions].filter(m => !m.exhausted);
    if (activeMinions.length > 0) {
        commands.push({ type: 'ADD_MESSAGE', payload: '随从进攻阶段！' });
        commands.push({ type: 'WAIT', payload: null, delay: 500 });
        
        // Player Minions Attack
        tempState.playerMinions.forEach((m, idx) => {
            if (!m.exhausted) {
                const action = { type: 'MINION_ATTACK', target: 'player', value: idx } as any;
                const result = GameSequenceExecutor.applyAction(tempState, action);
                tempState = result.state;
                commands.push({ type: 'UPDATE_STATE', payload: tempState });
                if (result.log) commands.push({ type: 'ADD_MESSAGE', payload: result.log });
            }
        });
        
        // Opponent Minions Attack
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
        // Trigger Next Round
        commands.push({ type: 'WAIT', payload: null, delay: 1000 });
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
        { type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('player'), delay: 500 },
        { type: 'WAIT', payload: null, delay: 1500 },
        { type: 'ADD_MESSAGE', payload: '对战开始！你的回合。' },
        // Trigger Round 1 Start (Mana, Draw)
        { 
            type: 'EXECUTE_LOGIC', 
            payload: () => startNewRound({ ...newState, roundNumber: 0 }),
            delay: 1000 
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
