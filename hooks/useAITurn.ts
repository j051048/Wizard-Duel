/**
 * useAITurn - AI 回合执行管理
 * 
 * [Phase B-1] 从 useGameLoop 中拆出：
 * - AI 回合切换序列
 * - AI 出牌指令生成
 * - 随从战斗阶段
 * - 回合结束 → 新回合触发
 */

import React, { useCallback } from 'react';
import { DuelState, GameActionCommand } from '../types';
import {
  executeAITurn, executeSpell, checkGameOver
} from '../services/gameLogic';
import { GameRuleEngine } from '../services/GameRuleEngine';
import { RuleArbiter, ArbiterEvent } from '../services/RuleArbiter';
import {
  AI_THINK_DELAY, AI_CARD_PLAY_DELAY, AI_EMOTE_DELAY,
  PHASE_TRANSITION_DELAY, BANNER_WAIT_DELAY, ROUND_TRANSITION_DELAY
} from '../config/timing';

interface UseAITurnDeps {
  duelStateRef: React.MutableRefObject<DuelState | null>;
  phaseRef: React.MutableRefObject<string>;
  isProcessing: boolean;
  enqueue: (commands: GameActionCommand[], actionId?: string) => void;
  showTurnBanner: (type: 'player' | 'opponent') => void;
  startNewRound: (state: DuelState) => void;
}

export function useAITurn({
  duelStateRef,
  phaseRef,
  isProcessing,
  enqueue,
  showTurnBanner,
  startNewRound,
}: UseAITurnDeps) {

  /**
   * 结束玩家回合，执行完整的 AI 回合：
   * 1. 横幅切换
   * 2. AI 思考延迟
   * 3. 逐张出牌 + 中间状态快照
   * 4. 随从战斗
   * 5. 死亡检查
   * 6. 触发新回合
   */
  const passTurn = useCallback(() => {
    const state = duelStateRef.current;
    if (!state || phaseRef.current !== 'PLAYER_TURN' || isProcessing) return;

    const commands: GameActionCommand[] = [];

    // 1. 切换到对手回合
    commands.push({ type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('opponent'), delay: PHASE_TRANSITION_DELAY });
    commands.push({ type: 'WAIT', payload: null, delay: BANNER_WAIT_DELAY });
    commands.push({ type: 'SET_PHASE', payload: 'OPPONENT_TURN' });
    commands.push({ type: 'UPDATE_UI', payload: { playerCard: null } });
    commands.push({ type: 'ADD_MESSAGE', payload: '对手回合...' });
    commands.push({ type: 'SET_AI_STATUS', payload: { emote: 'thinking', message: '让我想想...' }, delay: AI_EMOTE_DELAY });
    commands.push({ type: 'WAIT', payload: null, delay: AI_THINK_DELAY });

    // 2. [Fix 1.3] 逐张出牌，每张都用 executeSpell 计算中间状态
    //    不再预计算最终状态，避免状态分叉
    const { newState: aiResultState, commands: aiCommands } = executeAITurn(state);

    // aiCommands 中的每个 command 都有 snapshot（中间状态快照）
    // 直接使用这些快照作为真实的中间状态
    let latestState = { ...state };

    for (let i = 0; i < aiCommands.length; i++) {
      const cmd = aiCommands[i];

      if (cmd.sourceSpell) {
        commands.push({ type: 'WAIT', payload: null, delay: AI_CARD_PLAY_DELAY });
        commands.push({ type: 'UPDATE_UI', payload: { opponentCard: cmd.sourceSpell } });
        commands.push({ type: 'SET_AI_STATUS', payload: { emote: 'thinking_fast', message: '就是这张！' }, delay: AI_EMOTE_DELAY });
      }

      if (cmd.sourceSpell && cmd.sourceSpell !== 'skip') {
        for (const action of cmd.actions) {
          if (action.description) {
            commands.push({ type: 'ADD_MESSAGE', payload: action.description });
          }
        }

        // 使用 executeAITurn 已经计算好的 snapshot 作为权威中间状态
        if (cmd.snapshot) {
            latestState = cmd.snapshot;
        }

        commands.push({ type: 'UPDATE_STATE', payload: latestState });
        commands.push({ type: 'WAIT', payload: null, delay: AI_CARD_PLAY_DELAY });

        if (checkGameOver(latestState)) break;
      } else if (cmd.sourceSpell === 'skip') {
        commands.push({ type: 'ADD_MESSAGE', payload: '对手跳过了出牌' });
      }
    }

    // [Fix 1.3] 不再用 aiResultState 覆盖：latestState 就是最终状态
    // aiResultState 与最后一个 snapshot 是同一条执行链的结果，所以直接用 aiResultState
    let tempState = aiResultState;

    // 4. 回合结束 DoT 结算 [Fix 1.1]
    const roundEndResult = RuleArbiter.resolveRoundEnd(tempState);
    if (roundEndResult.events.length > 0) {
      roundEndResult.events.forEach((e: any) => {
        if (e.description) {
          commands.push({ type: 'ADD_MESSAGE', payload: e.description });
        }
      });
      commands.push({ type: 'UPDATE_STATE', payload: roundEndResult.newState });
      tempState = roundEndResult.newState;
    }

    if (roundEndResult.gameOver) {
      commands.push({
        type: 'UPDATE_UI', payload: {
          isGameOver: true,
          gameResult: roundEndResult.gameOver === 'DRAW' ? 'LOSS' : roundEndResult.gameOver,
          resultText: roundEndResult.gameOver,
        }
      });
      commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
      enqueue(commands, 'ai_turn');
      return;
    }

    // 5. 随从战斗阶段
    const activeMinionsCount =
      tempState.playerMinions.filter(m => !m.exhausted).length +
      tempState.opponentMinions.filter(m => !m.exhausted).length;

    if (activeMinionsCount > 0) {
      const combatResult = GameRuleEngine.resolveMinionCombat(tempState);
      tempState = combatResult.finalState;
      combatResult.commands.forEach(cmd => commands.push(cmd));

      if (checkGameOver(tempState)) {
        enqueue(commands);
        return;
      }
    }

    // 6. 死亡检查 / 新回合触发
    const gameOverResult = checkGameOver(tempState);
    if (gameOverResult) {
      commands.push({
        type: 'UPDATE_UI', payload: {
          isGameOver: true,
          gameResult: gameOverResult === 'DRAW' ? 'LOSS' : gameOverResult,
          resultText: gameOverResult,
        }
      });
      commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
    } else {
      commands.push({ type: 'WAIT', payload: null, delay: ROUND_TRANSITION_DELAY });
      commands.push({
        type: 'EXECUTE_LOGIC',
        payload: () => {
          if (duelStateRef.current) startNewRound(duelStateRef.current);
        }
      });
    }

    enqueue(commands, 'ai_turn');
  }, [duelStateRef, phaseRef, isProcessing, enqueue, showTurnBanner, startNewRound]);

  return { passTurn };
}