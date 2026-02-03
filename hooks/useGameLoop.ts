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
  canAffordSpell
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
}

export interface GameLoopActions {
  startDuel: (deck?: SpellType[], gameMode?: GameMode) => void;
  startTavernDuel: (deck: SpellType[], aiProfile: any, gameMode?: GameMode) => void;
  playCard: (spellId: SpellType) => boolean;
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

    // 3. 检查疲劳死
    if (nextState.playerHP <= 0 || nextState.opponentHP <= 0) {
        setDuelState(nextState);
        setIsGameOver(true);
        setGameResult(nextState.playerHP <= 0 ? 'LOSS' : 'WIN');
        setPhase('ROUND_RESET');
        return;
    }
    
    setDuelState(nextState);
    setPhase('PLAYER_TURN');
    setEffectMessages(messages.length > 0 ? messages : ['回合开始']);
    setPlayerCard(null);
    setOpponentCard(null);
  }, []);

  // 开始对战
  const startDuel = useCallback((deck?: SpellType[], gameMode: GameMode = 'standard') => {
    let initialState = createInitialDuelState(deck || [], gameMode);
    // 初始状态下 roundNumber = 0，我们需要直接进入第一回合 Draft
    startNewRound(initialState);
    
    setIsGameOver(false);
    setGameResult(null);
    setResultText('');
  }, [startNewRound]);

  // 开始酒馆模式对战
  const startTavernDuel = useCallback((deck: SpellType[], aiProfile: AIProfile, gameMode: GameMode = 'standard') => {
    const initialState = createTavernDuelState(deck, aiProfile, gameMode);
    // 初始状态下 roundNumber = 0，我们需要直接进入第一回合 Draft
    startNewRound(initialState);

    setIsGameOver(false);
    setGameResult(null);
    setResultText('');
  }, [startNewRound]);

  // 玩家出牌 (Multi-Play)
  const playCard = useCallback((spellId: SpellType): boolean => {
    if (phase !== 'PLAYER_TURN' || !duelState) return false;

    // 强制能量检查（杜绝脚本漏洞）
    const affordable = canAffordSpell(spellId, duelState.playerMana, duelState.playerEffects, duelState.playerCostMod);
    // 如果是 debug 模式或者特殊情况可能允许? 不，H5PVP必须严格。
    if (!affordable.canAfford) {
        console.warn('Cheating attempt detected: Insufficient mana for spell', spellId);
        return false;
    }
    
    // 执行扣费与效果（executeSpell 内部只负责扣减，不负责检查，防止 logic 重复）
    // 但为了状态原子性，我们在这里已经 check 了 affordable。
    
    const { newState, logs } = executeSpell(duelState, 'player', spellId);
    
    setDuelState(newState);
    setEffectMessages(logs);
    setPlayerCard(spellId); // Show animation
    
    // 检查胜利
    if (newState.opponentHP <= 0) {
        setIsGameOver(true);
        setGameResult('WIN');
        setPhase('ROUND_RESET'); // Stop interaction
        return true;
    }
    
    return true;
  }, [phase, duelState]);

    // 玩家结束回合
  const passTurn = useCallback(() => {
    if (phase !== 'PLAYER_TURN' || !duelState) return;
    
    setPhase('OPPONENT_TURN');
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
        setEffectMessages(logs); // Show AI logs
        
        // 简单显示最后一张牌作为 OpponentCard
        if (newState.opponentLastSpell) {
            setOpponentCard(newState.opponentLastSpell);
        }

        if (newState.playerHP <= 0) {
            setIsGameOver(true);
            setGameResult('LOSS');
        } else {
            // 回合结束，准备下一轮
            timerRef.current = setTimeout(() => {
                startNewRound(newState);
            }, ROUND_TRANSITION_DELAY);
        }
    }, AI_DELAY);
    
  }, [phase, duelState, startNewRound, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setDuelState(null);
    setPhase('DRAFT_PHASE');
    setIsGameOver(false);
  }, [clearTimer]);

  // Cleanup and Visibility Handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 暂停或做记号
      } else {
        // 恢复前台：如果处于 AI 回合，且超时未响应，可能需要强制推进
        // 这里简单做一个状态同步检查
        if (phase === 'OPPONENT_TURN' && duelStateRef.current && !isGameOver) {
             // 如果 AI 卡住了（比如 timer 被吃掉），这里可以尝试恢复
             // 但由于 executeAITurn 是同步的，只是被 setTimeout 延迟了。
             // 实际上最好的办法是：纪录上一次操作时间。如果 delta > 5秒且应该是 AI 回合，则立即执行。
             // 简单起见，我们不做复杂重放，依赖 React 的 state 保持。
             // 主要是防止 timerRef 在后台没跑完就被杀掉了？
             // 大多数浏览器会暂停 timer，切回来会继续跑。
             // 除非页面被完全挂起。
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        clearTimer();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearTimer, phase, isGameOver]);

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
