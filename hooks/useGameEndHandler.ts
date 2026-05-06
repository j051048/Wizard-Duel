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
import { AchievementService } from '../services/AchievementService';
import { useToastStore } from '../stores/useToastStore';
import { audioBridge } from './useAudioManager';
import { AnalyticsService } from '../services/AnalyticsService';

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
  const gameLoopStateRef = useRef(gameLoopState);
  gameLoopStateRef.current = gameLoopState;

  const onGameEndFeedbackRef = useRef(onGameEndFeedback);
  onGameEndFeedbackRef.current = onGameEndFeedback;

  const saveToSupabase = useCallback(async (
    result: 'WIN' | 'LOSS',
    scoreDelta: number,
    opponentHP: number
  ) => {
    const user = useUserStore.getState();
    const ui = useUIStore.getState();
    const gs = gameLoopStateRef.current;

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
          opponent_name: gs.duelState?.aiProfile?.name || 'Unknown',
          result: result.toLowerCase() as 'win' | 'loss' | 'draw',
          turns: gs.duelState?.roundNumber || 0,
          gold_earned: mock.payout,
          xp_earned: result === 'WIN' ? 50 : 10,
          score_delta: scoreDelta
        });

        if (rpcResult?.success) {
          user.setBalance(rpcResult.new_balance);
          user.setRankScore(rpcResult.new_score);
          const rpcRank = getRankByScore(rpcResult.new_score);
          user.setUserRank(rpcRank);
          const currentResult = useUIStore.getState().finalResult;
          if (currentResult) {
            useUIStore.getState().setFinalResult({
              ...currentResult,
              payout: rpcResult.new_balance - user.balance + currentResult.payout,
            });
          }
          console.log(`[Battle] Supabase RPC 成功: score=${rpcResult.new_score}, rank=${rpcResult.new_rank}`);
        }

        user.loadUserData(user.activeAddress).catch(err =>
          console.warn('[BattleEnd] Failed to refresh user data after Supabase save:', err)
        );
        return;
      }
    } catch (supabaseErr) {
      console.warn('[Battle] Supabase save skipped:', supabaseErr);
    }

    try {
      const pCard = (gs.playerCard || 'fire') as SpellType;
      const oCard = (gs.opponentCard || 'fire') as SpellType;
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
  }, []);

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
    const gs = gameLoopStateRef.current;

    // 行为分析：追踪游戏结束
    const dState = gs.duelState;
    if (dState) {
      AnalyticsService.trackGameEnd({
        result,
        totalRounds: dState.roundNumber,
        durationMs: Date.now() - (dState.rngState?.initialSeed || Date.now()),
        playerHP: dState.playerHP,
        opponentHP: dState.opponentHP,
        deckElementDistribution: {},
      });
    }

    onGameEndFeedbackRef.current(result);

    const newStreak = result === 'WIN' ? user.winStreak + 1 : 0;
    user.setWinStreak(newStreak);

    let firstWinBonus = 0;
    if (result === 'WIN') {
      const today = new Date().toDateString();
      const lastFirstWin = localStorage.getItem('wizard_first_win_date');
      if (lastFirstWin !== today) {
        firstWinBonus = 50;
        localStorage.setItem('wizard_first_win_date', today);
      }
    }

    let reliefBonus = 0;
    if (user.balance < 50) {
      const today = new Date().toDateString();
      const lastRelief = localStorage.getItem('wizard_relief_date');
      if (lastRelief !== today) {
        reliefBonus = 30;
        localStorage.setItem('wizard_relief_date', today);
      }
    }

    QuestManager.updateProgress('play_cards', 1);
    if (result === 'WIN') {
      QuestManager.updateProgress('win_games', 1);
    }
    const damage = opponentMaxMana - opponentHP;
    if (damage > 0) QuestManager.updateProgress('deal_damage', damage);

    const bpXP = result === 'WIN' ? 50 : 10;
    BattlePassService.addXP(bpXP);
    BattlePassService.onBattleComplete(result === 'WIN', [], {});

    const ds = gs.duelState;
    const achievementResult = AchievementService.check({
      won: result === 'WIN',
      winStreak: newStreak,
      damageDealt: damage,
      damageTaken: ds ? Math.max(0, 30 - ds.playerHP) : 0,
      maxCombo: ds?.playerConsecutiveThunder,
      mainElement: playerCard.split('_')[0],
    });
    if (achievementResult.unlocked.length > 0) {
      const toastApi = useToastStore.getState();
      const names = achievementResult.unlocked.map(a => a.name).join('、');
      toastApi.success('成就解锁！', names);
      audioBridge.playSfx('achievement_unlock');
    }

    const { newScore, newRank, scoreDelta } = calculateRankUpdate(user.rankScore, result, newStreak);
    user.setRankScore(newScore);
    user.setUserRank(newRank);

    const mock = calculatePayout(ui.selectedBet, result);
    let finalPayout = mock.payout;
    const finalIsCrit = mock.isCrit;

    const bonusTotal = firstWinBonus + reliefBonus;
    if (bonusTotal > 0) {
      user.setBalance(user.balance + bonusTotal);
      finalPayout += bonusTotal;
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

    isProcessingRef.current = false;

    saveToSupabase(result, scoreDelta, opponentHP).catch(err =>
      console.warn('[BattleEnd] Background Supabase save failed (local state preserved):', err)
    );
  }, [saveToSupabase]);

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
