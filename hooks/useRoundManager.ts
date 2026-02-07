/**
 * useRoundManager - 回合流转管理
 * 
 * [Phase B-1] 从 useGameLoop 中拆出：
 * - 新回合准备 (prepareNextTurn + drawCard)
 * - 死亡检查
 * - 疲劳伤害
 * - 回合开始序列
 */

import { useCallback } from 'react';
import { DuelState, GameActionCommand, AIStatus } from '../types';
import { RuleArbiter } from '../services/RuleArbiter';
import {
  PHASE_TRANSITION_DELAY, BANNER_WAIT_DELAY
} from '../config/timing';

const initialAIStatus: AIStatus = { emote: null, message: null };

interface UseRoundManagerDeps {
  enqueue: (commands: GameActionCommand[], actionId?: string) => void;
  showTurnBanner: (type: 'player' | 'opponent') => void;
}

export function useRoundManager({ enqueue, showTurnBanner }: UseRoundManagerDeps) {

  /**
   * 执行新回合的完整流程：
   * 1. prepareNextTurn (DoT/效果tick/法力恢复)
   * 2. 死亡检查 (灼烧致死)
   * 3. 抽牌 (疲劳伤害)
   * 4. 死亡检查 (疲劳致死)
   * 5. 回合开始序列 (横幅/phase切换)
   */
  const startNewRound = useCallback((currentState: DuelState) => {
    const commands: GameActionCommand[] = [];
    
    // [Phase C-1] Unified Rule Arbiter
    const { newState, events, gameOver } = RuleArbiter.resolveRoundStart(currentState);
    
    // 1. Log events
    events.forEach(e => {
        if (e.description) {
            commands.push({ type: 'ADD_MESSAGE', payload: e.description });
        }
    });

    // 2. Update State
    commands.push({ type: 'UPDATE_STATE', payload: newState });

    // 3. Handle Game Over or Continue
    if (gameOver) {
       commands.push({
        type: 'UPDATE_UI', payload: {
          isGameOver: true,
          gameResult: gameOver === 'DRAW' ? 'LOSS' : gameOver,
          resultText: gameOver,
        }
      });
      commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
    } else {
      // 4. Start Player Turn
      commands.push({ type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('player'), delay: PHASE_TRANSITION_DELAY });
      commands.push({ type: 'WAIT', payload: null, delay: BANNER_WAIT_DELAY });
      commands.push({ type: 'SET_PHASE', payload: 'PLAYER_TURN' });
      commands.push({
        type: 'UPDATE_UI', payload: {
          playerCard: null,
          opponentCard: null,
          aiStatus: initialAIStatus
        }
      });
    }

    enqueue(commands, `round_${newState.roundNumber}`);
  }, [enqueue, showTurnBanner]);

  return { startNewRound };
}