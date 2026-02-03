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
    if (!affordable.canAfford) return false;
    // executeSpell 内部已经检查了费用(在UI层也应该检查)，这里假设UI层调用前checked
    // 或者我们直接调用，executeSpell 如果扣减成功则成功。
    // 但 executeSpell 是纯逻辑，不会报错。
    // 我们应该用 canAfford 检查一下为了 UI 反馈？
    // 实际上 executeSpell 会执行扣费。如果扣成负数?
    // canAffordSpell 应该在 UI disable 按钮。
    
    const { newState, logs } = executeSpell(duelState, 'player', spellId);
    
    // 如果法力没变且不是skip牌，说明没扣费成功？(不对，executeSpell logic assumes caller checked or handles it)
    // 我们可以信任 gameLogic 的 check.
    // 实际上 gameLogic 里 executeSpell 没有 check canAfford!
    // 必须在这里防止非法调用。
    // (Wait, I added canAfford check in gameLogic.ts? No, I added getPlayableCards)
    // executeSpell only subtracts.
    
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
    
    // 可以在这里设置短暂的 card animation timeout
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
        if (!duelState) return; // Should allow current state ref?
        // 使用 functional update 拿到最新的 state (in case playCard updated it recently)
        // 但 passTurn 是同步的。
        // 然而 AI turn 需要基于 pass 后的 state。
        
        // 我们最好在 useEffect 里监听 phase change?
        // OR just execute here with ref to latest state?
        // 这里的 duelState 是闭包里的旧值吗？
        // passTurn 是 useCallback，依赖 [duelState]。
        // 所以 duelState 是最新的。
        
        const { newState, logs } = executeAITurn(duelState);
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

  // Cleanup
  useEffect(() => {
    return () => clearTimer();
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
