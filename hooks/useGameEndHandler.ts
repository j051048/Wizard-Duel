/**
 * useGameEndHandler - 游戏结束处理
 *
 * [#5 App.tsx 瘦身] 从 App.tsx 提取游戏结束逻辑
 *
 * 职责：
 * - 监听游戏结束状态
 * - 处理结算、排名更新、任务进度
 * - 调用 API 进行结算（fire-and-forget，不阻塞 UI）
 */

import { useEffect, useCallback, useRef } from 'react';
import { DuelState } from '../types/duel';
import { SpellType } from '../types';
import { ApiService } from '../services/api';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { calculateRankUpdate, getRankByScore } from '../services/rankSystem';
import { QuestManager } from '../services/QuestManager';
import { calculatePayout } from '../services/gameLogic';
import { BattlePassService } from '../services/BattlePassService';

interface GameLoopState {
  isGameOver: boolean;
  gameResult: 'WIN' | 'LOSS' | 'DRAW' | null;
  playerCard: SpellType | null;
  opponentCard: SpellType | null;
  duelState: DuelState | null;
}

interface UseGameEndHandlerDeps {
  gameLoopState: GameLoopState;
  onGameEndFeedback: (result: 'WIN' | 'LOSS' | 'DRAW') => void;
  onResetGame: () => void;
}

export function useGameEndHandler({
  gameLoopState,
  onGameEndFeedback,
  onResetGame,
}: UseGameEndHandlerDeps) {
  const isProcessingRef = useRef(false);

  /**
   * 异步保存到 Supabase（fire-and-forget，不阻塞 UI）
   */
  const saveToSupabase = useCallback(async (
    result: 'WIN' | 'LOSS',
    scoreDelta: number,
    opponentHP: number
  ) => {
    const user = useUserStore.getState();
    const ui = useUIStore.getState();

    if (!user.activeAddress) return;

    const supabaseUid = user.supabaseUserId;

    try {
      const { supabase, isSupabaseConfigured, saveBattleResult } = await import('../services/supabase');

      let sessionUserId = supabaseUid;
      if (!sessionUserId && isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        sessionUserId = session?.user?.id ?? null;
      }

      if (sessionUserId && isSupabaseConfigured) {
        const mock = calculatePayout(ui.selectedBet, result);

        const rpcResult = await saveBattleResult({
          user_id: sessionUserId,
          opponent_name: gameLoopState.duelState?.aiProfile?.name || 'Unknown',
          result: result.toLowerCase() as 'win' | 'loss' | 'draw',
          turns: gameLoopState.duelState?.roundNumber || 0,
          gold_earned: mock.payout,
          xp_earned: result === 'WIN' ? 50 : 10,
          score_delta: scoreDelta
        });

        if (rpcResult?.success) {
          user.setBalance(rpcResult.new_balance);
          user.setRankScore(rpcResult.new_score);
          const rpcRank = getRankByScore(rpcResult.new_score);
          user.setUserRank(rpcRank);
          // Update finalResult with server-authoritative data
          const currentResult = useUIStore.getState().finalResult;
          if (currentResult) {
            useUIStore.getState().setFinalResult({
              ...currentResult,
              payout: rpcResult.new_balance - user.balance + currentResult.payout,
            });
          }
          console.log(`[Battle] Supabase RPC 成功: score=${rpcResult.new_score}, rank=${rpcResult.new_rank}`);
        }

        user.loadUserData(user.activeAddress).catch(() => {});
        return;
      }
    } catch (supabaseErr) {
      console.warn('[Battle] Supabase save skipped:', supabaseErr);
    }

    // Fallback: localStorage API
    try {
      const pCard = (gameLoopState.playerCard || 'fire') as SpellType;
      const oCard = (gameLoopState.opponentCard || 'fire') as SpellType;
      const { newScore, newRank } = calculateRankUpdate(user.rankScore, result, user.winStreak);
      const res = await ApiService.settleGame(
        user.activeAddress,
        ui.selectedBet,
        result,
        pCard,
        oCard,
        { finalPlayerHP: 100, finalOpponentHP: opponentHP },
        newScore,
        newRank
      );
      user.setBalance(res.newBalance);
    } catch (e) {
      console.warn('[Battle] Fallback settlement failed:', e);
    }
  }, [gameLoopState]);

  /**
   * 核心结算逻辑 — 乐观更新 UI，后台异步保存
   */
  const processGameEnd = useCallback(async (
    result: 'WIN' | 'LOSS',
    playerCard: SpellType,
    opponentCard: SpellType,
    opponentMaxMana: number,
    opponentHP: number
  ) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const user = useUserStore.getState();
    const ui = useUIStore.getState();

    // 触发反馈
    onGameEndFeedback(result);

    // 更新连胜
    const newStreak = result === 'WIN' ? user.winStreak + 1 : 0;
    user.setWinStreak(newStreak);

    // 首胜奖励
    let firstWinBonus = 0;
    if (result === 'WIN') {
      const today = new Date().toDateString();
      const lastFirstWin = localStorage.getItem('wizard_first_win_date');
      if (lastFirstWin !== today) {
        firstWinBonus = 50;
        localStorage.setItem('wizard_first_win_date', today);
      }
    }

    // 金币救济
    let reliefBonus = 0;
    if (user.balance < 50) {
      const today = new Date().toDateString();
      const lastRelief = localStorage.getItem('wizard_relief_date');
      if (lastRelief !== today) {
        reliefBonus = 30;
        localStorage.setItem('wizard_relief_date', today);
      }
    }

    // 更新任务进度
    QuestManager.updateProgress('play_cards', 1);
    if (result === 'WIN') {
      QuestManager.updateProgress('win_games', 1);
    }
    const damage = opponentMaxMana - opponentHP;
    if (damage > 0) QuestManager.updateProgress('deal_damage', damage);

    // 战斗通行证经验
    const bpXP = result === 'WIN' ? 50 : 10;
    BattlePassService.addXP(bpXP);
    BattlePassService.onBattleComplete(result === 'WIN', [], {});

    // 排名更新（客户端乐观计算）
    const { newScore, newRank, scoreDelta } = calculateRankUpdate(user.rankScore, result, newStreak);
    user.setRankScore(newScore);
    user.setUserRank(newRank);

    // ===== 立即计算 payout 并显示 UI（不等待 Supabase） =====
    const mock = calculatePayout(ui.selectedBet, result);
    let finalPayout = mock.payout;
    const finalIsCrit = mock.isCrit;

    // 应用首胜和救济金奖励
    const bonusTotal = firstWinBonus + reliefBonus;
    if (bonusTotal > 0) {
      user.setBalance(user.balance + bonusTotal);
      finalPayout += bonusTotal;
    }

    // 立即显示结算页面
    ui.setFinalResult({
      result,
      player: playerCard,
      opponent: opponentCard,
      payout: finalPayout,
      isCrit: finalIsCrit,
      rankUpdates: { scoreDelta, newScore, newRank }
    });
    ui.setGameState('RESULT');

    isProcessingRef.current = false;

    // ===== 后台异步保存到 Supabase（不阻塞 UI） =====
    saveToSupabase(result, scoreDelta, opponentHP).catch(() => {});
  }, [onGameEndFeedback, saveToSupabase]);

  /**
   * 监听游戏结束状态
   */
  useEffect(() => {
    const ui = useUIStore.getState();

    if (
      gameLoopState.isGameOver &&
      gameLoopState.gameResult &&
      ui.gameState === 'DUEL' &&
      !isProcessingRef.current
    ) {
      const finalRes = gameLoopState.gameResult === 'DRAW' ? 'LOSS' : gameLoopState.gameResult;
      const pCard = (gameLoopState.playerCard || 'fire') as SpellType;
      const oCard = (gameLoopState.opponentCard || 'fire') as SpellType;
      const dState = gameLoopState.duelState;

      processGameEnd(
        finalRes as 'WIN' | 'LOSS',
        pCard,
        oCard,
        dState?.opponentMaxMana || 0,
        dState?.opponentHP || 0
      );
    }
  }, [
    gameLoopState.isGameOver,
    gameLoopState.gameResult,
    gameLoopState.playerCard,
    gameLoopState.opponentCard,
    gameLoopState.duelState,
    processGameEnd
  ]);
}
