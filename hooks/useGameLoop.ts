/**
 * useGameLoop - 游戏循环状态机 Hook
 * 
 * 将战斗流程抽象为事件队列，替代脆弱的 setTimeout 链式调用
 * 支持暂停、恢复、以及动画完成后的回调
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  SpellType, DuelPhase, DuelState, RoundResult, StatusEffect 
} from '../types';
import { 
  createInitialDuelState, resolveRound, applyRoundResult,
  prepareNextTurn, getAISpell, canAffordSpell
} from '../services/gameLogic';
import { GAME_CONFIG } from '../constants';

// 游戏事件类型
type GameEvent = 
  | { type: 'PLAYER_SELECT_CARD'; spellId: SpellType }
  | { type: 'AI_THINKING' }
  | { type: 'AI_SELECT_CARD'; spellId: SpellType }
  | { type: 'REVEAL_CARDS' }
  | { type: 'RESOLVE_DAMAGE' }
  | { type: 'APPLY_EFFECTS' }
  | { type: 'CHECK_END' }
  | { type: 'PREPARE_NEXT_TURN' }
  | { type: 'GAME_OVER'; result: 'WIN' | 'LOSS' };

// 阶段持续时间 (毫秒)
const PHASE_DURATIONS: Partial<Record<DuelPhase, number>> = {
  'OPPONENT_THINKING': 1000,
  'REVEAL': 1200,
  'DAMAGE_PHASE': 1000,
  'EFFECTS_PHASE': 1500,
  'ROUND_RESET': 1000,
};

export interface GameLoopState {
  duelState: DuelState | null;
  phase: DuelPhase;
  playerCard: SpellType | null;
  opponentCard: SpellType | null;
  roundResult: RoundResult | null;
  resultText: string;
  effectMessages: string[];
  isGameOver: boolean;
  gameResult: 'WIN' | 'LOSS' | null;
}

export interface GameLoopActions {
  startDuel: () => void;
  playCard: (spellId: SpellType) => boolean;
  reset: () => void;
}

export function useGameLoop(): [GameLoopState, GameLoopActions] {
  // 游戏状态
  const [duelState, setDuelState] = useState<DuelState | null>(null);
  const [phase, setPhase] = useState<DuelPhase>('PLAYER_TURN');
  const [playerCard, setPlayerCard] = useState<SpellType | null>(null);
  const [opponentCard, setOpponentCard] = useState<SpellType | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [resultText, setResultText] = useState<string>('');
  const [effectMessages, setEffectMessages] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSS' | null>(null);

  // 定时器引用
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 设置延迟执行
  const schedulePhase = useCallback((nextPhase: DuelPhase, callback: () => void) => {
    const duration = PHASE_DURATIONS[nextPhase] || 500;
    clearTimer();
    timerRef.current = setTimeout(() => {
      callback();
    }, duration);
  }, [clearTimer]);

  // 开始对战
  const startDuel = useCallback(() => {
    const initialState = createInitialDuelState();
    setDuelState(initialState);
    setPlayerCard(null);
    setOpponentCard(null);
    setRoundResult(null);
    setResultText('');
    setEffectMessages([]);
    setIsGameOver(false);
    setGameResult(null);
    setPhase('PLAYER_TURN');
  }, []);

  // 玩家出牌
  const playCard = useCallback((spellId: SpellType): boolean => {
    if (phase !== 'PLAYER_TURN' || !duelState) return false;

    const affordCheck = canAffordSpell(spellId, duelState.playerMana, duelState.playerEffects);
    if (!affordCheck.canAfford) {
      setEffectMessages([affordCheck.reason || '无法使用此法术']);
      return false;
    }

    setPlayerCard(spellId);
    setPhase('OPPONENT_THINKING');

    // AI 思考
    schedulePhase('OPPONENT_THINKING', () => {
      const botSpell = getAISpell(duelState, spellId);
      setOpponentCard(botSpell);
      setPhase('REVEAL');

      // 揭牌
      schedulePhase('REVEAL', () => {
        executeRound(spellId, botSpell);
      });
    });

    return true;
  }, [phase, duelState, schedulePhase]);

  // 执行回合结算
  const executeRound = useCallback((pSpell: SpellType, oSpell: SpellType) => {
    if (!duelState) return;

    setPhase('DAMAGE_PHASE');
    
    const result = resolveRound(duelState, pSpell, oSpell);
    setRoundResult(result);

    // 设置结果文本
    if (result.outcome === 'WIN') {
      setResultText('击中!');
    } else if (result.outcome === 'LOSS') {
      setResultText('受伤!');
    } else {
      setResultText('抵消!');
    }

    if (result.triggeredEffects.length > 0) {
      setEffectMessages(result.triggeredEffects);
    }

    // 应用结果
    const newState = applyRoundResult(duelState, result, pSpell, oSpell);
    setDuelState(newState);

    // 效果阶段
    schedulePhase('DAMAGE_PHASE', () => {
      setPhase('EFFECTS_PHASE');

      schedulePhase('EFFECTS_PHASE', () => {
        checkGameEnd(newState, pSpell, oSpell);
      });
    });
  }, [duelState, schedulePhase]);

  // 检查游戏结束
  const checkGameEnd = useCallback((currentState: DuelState, lastPlayerSpell: SpellType, lastOpponentSpell: SpellType) => {
    if (currentState.opponentHP <= 0 || currentState.playerHP <= 0) {
      const isWin = currentState.opponentHP <= 0;
      setGameResult(isWin ? 'WIN' : 'LOSS');
      setIsGameOver(true);
    } else {
      // 准备下一回合
      setPhase('ROUND_RESET');
      
      schedulePhase('ROUND_RESET', () => {
        const nextState = prepareNextTurn(currentState);
        setDuelState(nextState);
        setPlayerCard(null);
        setOpponentCard(null);
        setRoundResult(null);
        setResultText('');
        setEffectMessages([]);
        setPhase('PLAYER_TURN');
      });
    }
  }, [schedulePhase]);

  // 重置游戏
  const reset = useCallback(() => {
    clearTimer();
    setDuelState(null);
    setPhase('PLAYER_TURN');
    setPlayerCard(null);
    setOpponentCard(null);
    setRoundResult(null);
    setResultText('');
    setEffectMessages([]);
    setIsGameOver(false);
    setGameResult(null);
  }, [clearTimer]);

  // 组件卸载时清理
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const state: GameLoopState = {
    duelState,
    phase,
    playerCard,
    opponentCard,
    roundResult,
    resultText,
    effectMessages,
    isGameOver,
    gameResult,
  };

  const actions: GameLoopActions = {
    startDuel,
    playCard,
    reset,
  };

  return [state, actions];
}

export default useGameLoop;
