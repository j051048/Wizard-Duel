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

    // 2. AI 一次性计算所有出牌的最终状态
    const { newState: aiResultState, commands: aiCommands } = executeAITurn(state);

    // 3. 逐张生成 UI 指令 + 中间状态快照
    // [P0 Bug 3 Fix] 在每张出牌前插入思考时间延迟，避免 AI 瞬间打空手牌
    let intermediateState = { ...state };

    for (let i = 0; i < aiCommands.length; i++) {
      const cmd = aiCommands[i];

      if (cmd.sourceSpell) {
        // [P0 Bug 3] 每张牌之前都有思考延迟，让玩家能看清 AI 的出牌节奏
        commands.push({ type: 'WAIT', payload: null, delay: AI_CARD_PLAY_DELAY });
        commands.push({ type: 'UPDATE_UI', payload: { opponentCard: cmd.sourceSpell } });
        commands.push({ type: 'SET_AI_STATUS', payload: { emote: 'thinking_fast', message: '就是这张！' }, delay: AI_EMOTE_DELAY });
      }

      if (cmd.sourceSpell && cmd.sourceSpell !== 'skip') {
        // 提取日志
        for (const action of cmd.actions) {
          if (action.description) {
            commands.push({ type: 'ADD_MESSAGE', payload: action.description });
          }
        }

        // 中间状态快照（优化：优先使用预计算的快照，避免二次执行逻辑）
        if (cmd.snapshot) {
            intermediateState = cmd.snapshot;
        } else {
            // 回退逻辑：如果快照丢失，则重新计算
            const singleResult = executeSpell(intermediateState, 'opponent', cmd.sourceSpell);
            intermediateState = singleResult.newState;
        }

        commands.push({ type: 'UPDATE_STATE', payload: intermediateState });
        commands.push({ type: 'WAIT', payload: null, delay: AI_CARD_PLAY_DELAY });

        if (checkGameOver(intermediateState)) break;
      } else if (cmd.sourceSpell === 'skip') {
        commands.push({ type: 'ADD_MESSAGE', payload: '对手跳过了出牌' });
      }
    }

    // 4. 最终状态校正
    commands.push({ type: 'UPDATE_STATE', payload: aiResultState });
    let tempState = aiResultState;

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