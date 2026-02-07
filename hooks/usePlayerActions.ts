/**
 * usePlayerActions - 玩家行动管理
 * 
 * [Phase B-1] 从 useGameLoop 中拆出：
 * - 出牌 (playCard)
 * - 换牌 (handleMulligan)
 */

import React, { useCallback } from 'react';
import { 
  SpellType, DuelState, GameMode, AIProfile, GameActionCommand, AIStatus
} from '../types';
import { 
  createInitialDuelState, createTavernDuelState, canAffordSpell
} from '../services/gameLogic';
import { GameRuleEngine } from '../services/GameRuleEngine';
import {
  PHASE_TRANSITION_DELAY, BANNER_WAIT_DELAY, ROUND_TRANSITION_DELAY
} from '../config/timing';

const initialAIStatus: AIStatus = { emote: null, message: null };

interface UsePlayerActionsDeps {
  duelStateRef: React.MutableRefObject<DuelState | null>;
  phaseRef: React.MutableRefObject<string>;
  isProcessing: boolean;
  enqueue: (commands: GameActionCommand[], actionId?: string) => void;
  showTurnBanner: (type: 'player' | 'opponent') => void;
  setDuelState: (state: DuelState | null) => void;
  setPhase: (phase: any) => void;
  setUiState: React.Dispatch<React.SetStateAction<any>>;
  startNewRound: (state: DuelState) => void;
}

export function usePlayerActions({
  duelStateRef,
  phaseRef,
  isProcessing,
  enqueue,
  showTurnBanner,
  setDuelState,
  setPhase,
  setUiState,
  startNewRound,
}: UsePlayerActionsDeps) {

  /** 出牌 */
  const playCard = useCallback((spellId: SpellType): boolean => {
    const state = duelStateRef.current;
    if (!state || phaseRef.current !== 'PLAYER_TURN' || isProcessing) return false;

    const affordable = canAffordSpell(spellId, state.playerMana, state.playerEffects, state.playerCostMod);
    if (!affordable.canAfford) {
      setUiState((prev: any) => ({
        ...prev,
        effectMessages: [...prev.effectMessages, affordable.reason || '无法出牌']
      }));
      return false;
    }

    setUiState((prev: any) => ({ ...prev, playerCard: spellId }));

    const { newState, commands: engineCommands } = GameRuleEngine.castSpell(state, spellId, 'player');
    enqueue([...engineCommands], `play_${spellId}_${Date.now()}`);
    return true;
  }, [duelStateRef, phaseRef, isProcessing, enqueue, setUiState]);

  /** 起手换牌 */
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

    const commands: GameActionCommand[] = [
      { type: 'UPDATE_STATE', payload: newState },
      { type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('player'), delay: PHASE_TRANSITION_DELAY },
      { type: 'WAIT', payload: null, delay: BANNER_WAIT_DELAY },
      { type: 'ADD_MESSAGE', payload: '对战开始！你的回合。' },
      {
        type: 'EXECUTE_LOGIC',
        payload: () => startNewRound({ ...newState, roundNumber: 0 }),
        delay: ROUND_TRANSITION_DELAY
      }
    ];

    setUiState((prev: any) => ({ ...prev, effectMessages: [] }));
    enqueue(commands, 'mulligan');
  }, [duelStateRef, enqueue, showTurnBanner, setDuelState, setUiState, startNewRound]);

  /** 初始化标准对战 */
  const startDuel = useCallback((playerDeck: SpellType[], _opponentDeck: SpellType[], gameMode: GameMode = 'standard') => {
    const initialState = createInitialDuelState(playerDeck || [], gameMode);
    setDuelState(initialState);
    setPhase('MULLIGAN_PHASE');
    setUiState((prev: any) => ({
      ...prev,
      isGameOver: false,
      gameResult: null,
      effectMessages: [],
      resultText: ''
    }));
  }, [setDuelState, setPhase, setUiState]);

  /** 初始化酒馆对战 */
  const startTavernDuel = useCallback((deck: SpellType[], aiProfile: AIProfile, gameMode: GameMode = 'standard') => {
    const state = createTavernDuelState(deck, aiProfile, gameMode);
    setDuelState(state);
    setPhase('MULLIGAN_PHASE');
    setUiState((prev: any) => ({
      ...prev,
      isGameOver: false,
      gameResult: null,
      effectMessages: [],
      resultText: ''
    }));
  }, [setDuelState, setPhase, setUiState]);

  return {
    playCard,
    handleMulligan,
    startDuel,
    startTavernDuel,
  };
}