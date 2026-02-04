/**
 * useGameLoop - 游戏循环状态机 Hook (Patch 2.0 Turn-Based)
 * 
 * 全新回合制逻辑：Draft -> Player Turn (Multi-Play) -> Opponent Turn -> Review
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  SpellType, DuelPhase, DuelState, RoundResult, GameMode, AIProfile
} from '../types';
import { 
  createInitialDuelState, executeSpell, executeAITurn,
  prepareNextTurn, drawCard, createTavernDuelState,
  canAffordSpell, checkGameOver
} from '../services/gameLogic';

// 阶段持续时间 (毫秒)
const AI_DELAY = 1000;
const ROUND_TRANSITION_DELAY = 1500;

export interface GameLoopState {
  duelState: DuelState | null;
  phase: DuelPhase;
  playerCard: SpellType | null; // 最近打出的牌（用于动画）
  opponentCard: SpellType | null;
  resultText: string;
  effectMessages: string[];
  isGameOver: boolean;
  gameResult: 'WIN' | 'LOSS' | null;
  isProcessing: boolean; // 🔒 动画锁/动作队列锁
}

export interface GameLoopActions {
  startDuel: (deck?: SpellType[], gameMode?: GameMode) => void;
  startTavernDuel: (deck: SpellType[], aiProfile: any, gameMode?: GameMode) => void;
  playCard: (spellId: SpellType) => Promise<boolean>;
  passTurn: () => void;
  reset: () => void;
}

export function useGameLoop(): [GameLoopState, GameLoopActions] {
  // 游戏状态
  const [duelState, setDuelState] = useState<DuelState | null>(null);
  const [phase, setPhase] = useState<DuelPhase>('DRAFT_PHASE');
  
  // UI 辅助状态
  const [playerCard, setPlayerCard] = useState<SpellType | null>(null);
  const [opponentCard, setOpponentCard] = useState<SpellType | null>(null);
  const [resultText, setResultText] = useState<string>('');
  const [effectMessages, setEffectMessages] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSS' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 使用 ref 追踪最新的 duelState，解决闭包问题
  const duelStateRef = useRef<DuelState | null>(null);
  useEffect(() => {
    duelStateRef.current = duelState;
  }, [duelState]);

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
    
    // 2.1 玩家抽牌
    const pResult = drawCard(nextState.playerDeck, nextState.playerHand, nextState.playerFatigue);
    nextState.playerDeck = pResult.newDeck;
    nextState.playerHand = pResult.newHand;
    nextState.playerFatigue = pResult.newFatigue;
    
    if (pResult.fatigueDamage > 0) {
      nextState.playerHP = Math.max(0, nextState.playerHP - pResult.fatigueDamage);
      messages.push(`玩家由于疲劳受到 ${pResult.fatigueDamage} 点伤害`);
    } else if (pResult.drawnCard) {
      messages.push(`抽到: ${pResult.drawnCard}`);
    }

    // 2.2 对手抽牌 (模拟 Draft 1张)
    const oResult = drawCard(nextState.opponentDeck, [], nextState.opponentFatigue);
    nextState.opponentDeck = oResult.newDeck;
    nextState.opponentHandSize = Math.min(10, nextState.opponentHandSize + (oResult.drawnCard ? 1 : 0));
    nextState.opponentFatigue = oResult.newFatigue;
    
    if (oResult.fatigueDamage > 0) {
      nextState.opponentHP = Math.max(0, nextState.opponentHP - oResult.fatigueDamage);
      messages.push(`对手由于疲劳受到 ${oResult.fatigueDamage} 点伤害`);
    }

        // 3. 🔧 使用统一死亡检查（疲劳死）
    const gameOverResult = checkGameOver(nextState);
    if (gameOverResult) {
        setDuelState(nextState);
        setIsGameOver(true);
        const finalResult = gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult;
        setGameResult(finalResult);
        setResultText(gameOverResult);
        setPhase('ROUND_RESET');
        return;
    }
    
    setDuelState(nextState);
    setPhase('PLAYER_TURN');
    setEffectMessages(messages.length > 0 ? messages : ['回合开始']);
    setPlayerCard(null);
    setOpponentCard(null);
    setIsProcessing(false); // Unlock at start of round
  }, []);

  // 开始对战
  const startDuel = useCallback((deck?: SpellType[], gameMode: GameMode = 'standard') => {
    let initialState = createInitialDuelState(deck || [], gameMode);
    // 初始状态下 roundNumber = 0，我们需要直接进入第一回合 Draft
    startNewRound(initialState);
    
    setIsGameOver(false);
    setGameResult(null);
    setResultText('');
    setIsProcessing(false);
  }, [startNewRound]);

  // 开始酒馆模式对战
  const startTavernDuel = useCallback((deck: SpellType[], aiProfile: AIProfile, gameMode: GameMode = 'standard') => {
    const initialState = createTavernDuelState(deck, aiProfile, gameMode);
    // 初始状态下 roundNumber = 0，我们需要直接进入第一回合 Draft
    startNewRound(initialState);

    setIsGameOver(false);
    setGameResult(null);
    setResultText('');
    setIsProcessing(false);
  }, [startNewRound]);

    // 玩家出牌 (Multi-Play) - Async Animation Lock
  const playCard = useCallback(async (spellId: SpellType): Promise<boolean> => {
    if (phase !== 'PLAYER_TURN' || !duelState || isProcessing) return false;

    // 🔧 检查玩家是否被冻结
    const isFrozen = duelState.playerEffects.some(e => e.type === 'frozen');
    if (isFrozen) {
      setEffectMessages(['❄️ 你被冻结了，本回合无法出牌！']);
      return false;
    }

    // 强制能量检查（杜绝脚本漏洞）
    const affordable = canAffordSpell(spellId, duelState.playerMana, duelState.playerEffects, duelState.playerCostMod);
    if (!affordable.canAfford) {
        setEffectMessages([affordable.reason || '无法出牌']);
        return false;
    }
    
    // 🔒 Set Lock & Visuals
    setIsProcessing(true);
    setPlayerCard(spellId); 
    
    // Wait for animation (e.g. card flying up)
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Execute Logic
    const { newState, logs } = executeSpell(duelState, 'player', spellId);
    
    setDuelState(newState);
    setEffectMessages(logs);
    
    // Slight delay for impact readability
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 🔧 使用统一死亡检查
    const gameOverResult = checkGameOver(newState);
    if (gameOverResult) {
        setIsGameOver(true);
        // DRAW 情况下暂时判定为 LOSS
        const finalResult = gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult;
        setGameResult(finalResult);
        setResultText(gameOverResult);
        setPhase('ROUND_RESET');
        return true;
    }
    
    setIsProcessing(false);
    return true;
  }, [phase, duelState, isProcessing]);

    // 玩家结束回合
  const passTurn = useCallback(() => {
    if (phase !== 'PLAYER_TURN' || !duelState || isProcessing) return;
    
    setPhase('OPPONENT_TURN');
    setIsProcessing(true); // Lock during opponent turn
    setEffectMessages(['对手回合...']);
    setPlayerCard(null);
    
    // 延迟执行 AI，模拟思考
    clearTimer();
    timerRef.current = setTimeout(() => {
        // 使用 ref 获取最新的状态，避免闭包陷阱
        const currentState = duelStateRef.current;
        if (!currentState) return;
        
        const { newState, logs } = executeAITurn(currentState);
        setDuelState(newState);
        setEffectMessages(logs.length > 0 ? logs : ['对手观察着你...']); // Show AI logs or fallback
        
        // 简单显示最后一张牌作为 OpponentCard
        if (newState.opponentLastSpell) {
            setOpponentCard(newState.opponentLastSpell);
        }

                // 🔧 使用统一死亡检查
        const gameOverResult = checkGameOver(newState);
        if (gameOverResult) {
            setIsGameOver(true);
            const finalResult = gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult;
            setGameResult(finalResult);
            setResultText(gameOverResult);
            setPhase('ROUND_RESET');
        } else {
            // 回合结束，准备下一轮
            timerRef.current = setTimeout(() => {
                startNewRound(newState);
            }, ROUND_TRANSITION_DELAY);
        }
    }, AI_DELAY);
    
  }, [phase, duelState, startNewRound, clearTimer, isProcessing]);

  const reset = useCallback(() => {
    clearTimer();
    setDuelState(null);
    setPhase('DRAFT_PHASE');
    setIsProcessing(false);
    setIsGameOver(false);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
        clearTimer();
    };
  }, [clearTimer]);

  return [
    {
      duelState,
      phase,
      playerCard,
      opponentCard,
      resultText,
      effectMessages,
      isGameOver,
      gameResult,
      isProcessing,
    },
    {
      startDuel,
      startTavernDuel,
      playCard,
      passTurn,
      reset,
    }
  ];
}

export default useGameLoop;
