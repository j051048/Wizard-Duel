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
import { supabase, saveBattleResult } from '../services/supabase';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { calculateRankUpdate } from '../services/rankSystem';
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

    // 计算排名更新
    const { newScore, newRank, scoreDelta } = calculateRankUpdate(user.rankScore, result, newStreak);
    user.setRankScore(newScore);
    user.setUserRank(newRank);

    try {
      let finalPayout = 0;
      let finalIsCrit = false;

      if (user.activeAddress) {
        // 保存到 Supabase (如果已通过钱包登录)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const mock = calculatePayout(ui.selectedBet, result);
          await saveBattleResult({
            user_id: session.user.id,
            opponent_name: gameLoopState.duelState?.aiProfile?.name || 'Unknown',
            result: result.toLowerCase() as 'win' | 'loss' | 'draw',
            turns: gameLoopState.duelState?.roundNumber || 0,
            gold_earned: mock.payout,
            xp_earned: result === 'WIN' ? 50 : 10,
          });
          
          finalPayout = mock.payout;
          finalIsCrit = mock.isCrit;
          
          // 重新加载用户数据同步金币
          user.loadUserData(user.activeAddress);
        } else {
          // 回退到现有的 API 结算 (针对游客)
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
          user.setBalance(res.newBalance);
          user.loadUserData(user.activeAddress);
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
