/**
 * useGameEndHandler - 游戏结束处理
 * 
 * [#5 App.tsx 瘦身] 从 App.tsx 提取游戏结束逻辑
 * 
 * 职责：
 * - 监听游戏结束状态
 * - 处理结算、排名更新、任务进度
 * - 调用 API 进行结算
 */

import { useEffect, useCallback, useRef } from 'react';
import { DuelState } from '../types/duel';
import { SpellType } from '../types'; // Corrected import path for SpellType
import { ApiService } from '../services/api';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { calculateRankUpdate, getRankByScore } from '../services/rankSystem';
import { QuestManager } from '../services/QuestManager';
import { calculatePayout } from '../services/gameLogic';

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
   * 核心结算逻辑
   */
  const processGameEnd = useCallback(async (
    result: 'WIN' | 'LOSS',
    playerCard: SpellType,
    opponentCard: SpellType,
    opponentMaxMana: number,
    opponentHP: number
  ) => {
    // 防止重复处理
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const user = useUserStore.getState();
    const ui = useUIStore.getState();

    // 触发反馈
    onGameEndFeedback(result);

    // 更新连胜
    const newStreak = result === 'WIN' ? user.winStreak + 1 : 0;
    user.setWinStreak(newStreak);

    // 更新任务进度
    QuestManager.updateProgress('play_cards', 1);
    if (result === 'WIN') {
      QuestManager.updateProgress('win_games', 1);
    }
    const damage = opponentMaxMana - opponentHP;
    if (damage > 0) QuestManager.updateProgress('deal_damage', damage);

    // 计算排名更新（客户端先乐观计算）
    let { newScore, newRank, scoreDelta } = calculateRankUpdate(user.rankScore, result, newStreak);
    user.setRankScore(newScore);
    user.setUserRank(newRank);

    try {
      let finalPayout = 0;
      let finalIsCrit = false;

            if (user.activeAddress) {
        // 尝试保存到 Supabase（可选，失败则回退）
        let supabaseSaved = false;
        const supabaseUid = user.supabaseUserId;

        try {
          const { supabase, isSupabaseConfigured, saveBattleResult } = await import('../services/supabase');
          
          // 使用 store 中缓存的 supabaseUserId，或者回退到 session 查询
          let sessionUserId = supabaseUid;
          if (!sessionUserId && isSupabaseConfigured) {
            const { data: { session } } = await supabase.auth.getSession();
            sessionUserId = session?.user?.id ?? null;
          }
          
          if (sessionUserId && isSupabaseConfigured) {
            const mock = calculatePayout(ui.selectedBet, result);
            
            // [P0 Fix #3] 调用原子化 settlement RPC
            // 包含：金币结算、经验增加、积分变动、战绩记录
            const rpcResult = await saveBattleResult({
              user_id: sessionUserId,
              opponent_name: gameLoopState.duelState?.aiProfile?.name || 'Unknown',
              result: result.toLowerCase() as 'win' | 'loss' | 'draw',
              turns: gameLoopState.duelState?.roundNumber || 0,
              gold_earned: mock.payout,
              xp_earned: result === 'WIN' ? 50 : 10,
              score_delta: scoreDelta // 传递客户端计算的 ELO 变化
            });

            // 立即使用 RPC 返回的最新数据更新 store
            if (rpcResult?.success) {
              user.setBalance(rpcResult.new_balance);
              user.setRankScore(rpcResult.new_score);
              const rpcRank = getRankByScore(rpcResult.new_score);
              user.setUserRank(rpcRank);
              // 用服务端的权威数据覆盖客户端的乐观计算
              newScore = rpcResult.new_score;
              newRank = rpcRank;
              console.log(`[Battle] RPC 成功: score=${rpcResult.new_score}, rank=${rpcResult.new_rank}`);
            }
            
            finalPayout = mock.payout;
            finalIsCrit = mock.isCrit;
            supabaseSaved = true;
            
            // 异步加载完整数据（不阻塞结算UI）
            user.loadUserData(user.activeAddress!).catch(() => {});
          }
        } catch (supabaseErr) {
          console.warn('Supabase save skipped:', supabaseErr);
        }

        if (!supabaseSaved) {
          // 回退到现有的 API 结算（localStorage mock）
          const res = await ApiService.settleGame(
            user.activeAddress,
            ui.selectedBet,
            result,
            playerCard,
            opponentCard,
            {
              finalPlayerHP: 100,
              finalOpponentHP: opponentHP
            },
            newScore,
            newRank
          );
          user.setBalance(res.newBalance); // 本地模式直接设置
          // [Fix] RPC失败回退模式下，不要重新拉取数据，否则会覆盖本地的乐观更新
          // user.loadUserData(user.activeAddress!);
          finalPayout = res.payout;
          finalIsCrit = res.isCrit;
        }
      } else {
        const mock = calculatePayout(ui.selectedBet, result);
        finalPayout = mock.payout;
        finalIsCrit = mock.isCrit;
      }

      ui.setFinalResult({
        result,
        player: playerCard,
        opponent: opponentCard,
        payout: finalPayout,
        isCrit: finalIsCrit,
        rankUpdates: { scoreDelta, newScore, newRank }
      });
      ui.setGameState('RESULT');
    } catch (e) {
      console.error('Settlement failed:', e);
      onResetGame();
    } finally {
      isProcessingRef.current = false;
    }
  }, [onGameEndFeedback, onResetGame]);

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
