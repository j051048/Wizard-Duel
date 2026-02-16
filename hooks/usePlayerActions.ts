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
  createInitialDuelState, createTavernDuelState, canAffordSpell, createPvpDuelState
} from '../services/gameLogic';
import { GameRuleEngine } from '../services/GameRuleEngine';
import { getGameRNG } from '../utils/seededRandom';
import { validateCardPlay } from '../services/validation/antiCheat';
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
  pvpRoleRef?: React.MutableRefObject<'player1' | 'player2' | null>;
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
  pvpRoleRef,
}: UsePlayerActionsDeps) {

    /** 出牌 */
  const playCard = useCallback((spellId: SpellType): boolean => {
    const state = duelStateRef.current;
    if (!state || phaseRef.current !== 'PLAYER_TURN' || isProcessing) return false;

    // [P0 Fix #6] 独立防作弊校验（不信任 canAffordSpell 单独的结果）
    const violations = validateCardPlay(state, spellId, 'player');
    if (violations.length > 0) {
      const criticalViolation = violations.find(v => v.severity === 'critical' || v.severity === 'error');
      if (criticalViolation) {
        console.warn('[AntiCheat] Card play rejected:', violations);
        setUiState((prev: any) => ({
          ...prev,
          effectMessages: [...prev.effectMessages, criticalViolation.message || '非法操作']
        }));
        return false;
      }
    }

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
    // [P0 Fix #2] 使用确定性 RNG 洗牌
    newDeck = getGameRNG().shuffle(newDeck);

    const newState = { ...state, playerHand: newHand, playerDeck: newDeck };
    setDuelState(newState);

    const commands: GameActionCommand[] = [
      { type: 'UPDATE_STATE', payload: newState },
      // [Fix] 根据角色决定显示哪个 Banner
      { type: 'EXECUTE_LOGIC', payload: () => showTurnBanner(pvpRoleRef?.current === 'player2' ? 'opponent' : 'player'), delay: PHASE_TRANSITION_DELAY },
      { type: 'WAIT', payload: null, delay: BANNER_WAIT_DELAY },
      // [Fix] 根据角色决定消息
      { type: 'ADD_MESSAGE', payload: pvpRoleRef?.current === 'player2' ? '等待对手...' : '对战开始！你的回合。' },
      {
        type: 'EXECUTE_LOGIC',
        payload: () => startNewRound({ ...newState, roundNumber: 0 }),
        delay: ROUND_TRANSITION_DELAY
      }
    ];

    setUiState((prev: any) => ({ ...prev, effectMessages: [] }));
    enqueue(commands, 'mulligan');
  }, [duelStateRef, enqueue, showTurnBanner, setDuelState, setUiState, startNewRound, pvpRoleRef]);

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

  /** [PVP] 初始化 PVP 对战 (已认证同步版 & P0 Fix) */
  const startPvpDuel = useCallback((p1Deck: SpellType[], p2Deck: SpellType[], role: 'player1' | 'player2', seed?: number) => {
    if (pvpRoleRef) pvpRoleRef.current = role;
    
    // PVP 模式不再默认 Standard，而是使用 createPvpDuelState 创建完全一致的初始状态
    // 此函数内部会对 p1Deck/p2Deck 进行确定性洗牌并根据 role 分配视角
    const initialState = createPvpDuelState(p1Deck, p2Deck, seed || 0, role);
    
    setDuelState(initialState);
    setPhase('MULLIGAN_PHASE');
    setUiState((prev: any) => ({
      ...prev,
      isGameOver: false,
      gameResult: null,
      effectMessages: [],
      resultText: ''
    }));
  }, [setDuelState, setPhase, setUiState, pvpRoleRef]);

  return {
    playCard,
    handleMulligan,
    startDuel,
    startTavernDuel,
    startPvpDuel,
  };
}