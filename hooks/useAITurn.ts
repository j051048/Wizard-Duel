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
import { generateValidationReport } from '../services/validation/antiCheat';
import {
  AI_THINK_DELAY, AI_CARD_PLAY_DELAY, AI_EMOTE_DELAY,
  PHASE_TRANSITION_DELAY, BANNER_WAIT_DELAY, ROUND_TRANSITION_DELAY
} from '../config/timing';

interface UseAITurnDeps {
  duelStateRef: React.MutableRefObject<DuelState | null>;
  phaseRef: React.MutableRefObject<string>;
  isProcessing: boolean;
  isPVPMode: boolean; // [PVP] 是否为 PVP 模式
  enqueue: (commands: GameActionCommand[], actionId?: string) => void;
  showTurnBanner: (type: 'player' | 'opponent') => void;
  startNewRound: (state: DuelState) => void;
}

export function useAITurn({
  duelStateRef,
  phaseRef,
  isProcessing: _isProcessing,
  isPVPMode,
  enqueue,
  showTurnBanner,
  startNewRound,
}: UseAITurnDeps) {

  /**
   * PVP 模式下：只切换到对手回合，等待 WebSocket 传来的操作
   * AI 模式下：执行完整的 AI 回合逻辑
   */
  const passTurn = useCallback(() => {
    const state = duelStateRef.current;
    if (!state || phaseRef.current !== 'PLAYER_TURN') return;

    // ============ [PVP] PVP 模式：不运行 AI，只切换阶段 ============
    if (isPVPMode) {
      const commands: GameActionCommand[] = [];
      commands.push({ type: 'EXECUTE_LOGIC', payload: () => showTurnBanner('opponent'), delay: PHASE_TRANSITION_DELAY });
      commands.push({ type: 'WAIT', payload: null, delay: BANNER_WAIT_DELAY });
      commands.push({ type: 'SET_PHASE', payload: 'WAITING_FOR_OPPONENT' });
      commands.push({ type: 'UPDATE_UI', payload: { playerCard: null } });
      commands.push({ type: 'ADD_MESSAGE', payload: '等待对手操作...' });
      enqueue(commands, 'pvp_pass_turn');
      return;
    }

    // ============ AI 模式：执行完整 AI 回合 ============
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
    const { newState: aiResultState, commands: aiCommands } = executeAITurn(state);

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

    let tempState = aiResultState;

    // 4. 回合结束 DoT 结算
    const roundEndResult = RuleArbiter.resolveRoundEnd(tempState);
    if (roundEndResult.events.length > 0) {
      roundEndResult.events.forEach((e: ArbiterEvent) => {
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
      // [P0 Fix #6] 回合结束时执行防作弊校验
      const finalValidationState = tempState;
      commands.push({
        type: 'EXECUTE_LOGIC',
        payload: () => {
          const report = generateValidationReport(finalValidationState);
          if (!report.valid) {
            console.error('[AntiCheat] Round validation FAILED:', report.violations);
          }
        }
      });

      commands.push({ type: 'WAIT', payload: null, delay: ROUND_TRANSITION_DELAY });
      commands.push({
        type: 'EXECUTE_LOGIC',
        payload: () => {
          if (duelStateRef.current) startNewRound(duelStateRef.current);
        }
      });
    }

    enqueue(commands, 'ai_turn');
  }, [duelStateRef, phaseRef, isPVPMode, enqueue, showTurnBanner, startNewRound]);

  /**
   * [PVP] 处理远程对手结束回合：
   * 触发回合结算 → 新回合 → 切回玩家回合
   */
  const handleRemoteEndTurn = useCallback(() => {
    const state = duelStateRef.current;
    if (!state) return;

    const commands: GameActionCommand[] = [];

    // 1. 回合结束 DoT 结算
    const roundEndResult = RuleArbiter.resolveRoundEnd(state);
    let tempState = state;
    
    if (roundEndResult.events.length > 0) {
      roundEndResult.events.forEach((e: ArbiterEvent) => {
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
      enqueue(commands, 'pvp_remote_end');
      return;
    }

    // 2. 随从战斗
    const activeMinionsCount =
      tempState.playerMinions.filter(m => !m.exhausted).length +
      tempState.opponentMinions.filter(m => !m.exhausted).length;

    if (activeMinionsCount > 0) {
      const combatResult = GameRuleEngine.resolveMinionCombat(tempState);
      tempState = combatResult.finalState;
      combatResult.commands.forEach(cmd => commands.push(cmd));

      if (checkGameOver(tempState)) {
        enqueue(commands, 'pvp_remote_end');
        return;
      }
    }

    // 3. 触发新回合 → 切换到玩家回合
    commands.push({ type: 'WAIT', payload: null, delay: ROUND_TRANSITION_DELAY });
    commands.push({
      type: 'EXECUTE_LOGIC',
      payload: () => {
        if (duelStateRef.current) startNewRound(duelStateRef.current);
      }
    });

    enqueue(commands, 'pvp_remote_end');
  }, [duelStateRef, enqueue, startNewRound]);

  return { passTurn, handleRemoteEndTurn };
}