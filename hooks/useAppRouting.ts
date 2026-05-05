/**
 * useAppRouting - 应用视图路由管理
 *
 * [#5 App.tsx 瘦身] 从 App.tsx 提取视图切换逻辑
 *
 * 职责：
 * - 游戏模式选择处理
 * - 游戏重置与状态清理
 * - 登录完成处理
 * - 匹配完成处理
 */

import { useCallback } from 'react';
import { GameMode, SpellType } from '../types/card';
import { AIProfile } from '../types/ai';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { useToastStore } from '../stores/useToastStore';
import { DungeonService } from '../services/dungeon';
import { AI_PROFILES } from '../services/gameLogic';

interface UseAppRoutingDeps {
  gameLoopActions: {
    reset: () => void;
    startTavernDuel: (deck: SpellType[], ai: AIProfile, mode: GameMode) => void;
    startPvpDuel: (p1Deck: SpellType[], p2Deck: SpellType[], role: 'player1' | 'player2', seed?: number) => void;
  };
  audioActions: {
    playBgm: (track: 'lobby' | 'battle') => void;
  };
}

export function useAppRouting({ gameLoopActions, audioActions }: UseAppRoutingDeps) {
  // Use getState() inside callbacks to avoid subscribing to entire stores (prevents re-render loops)

  /**
   * 处理游戏模式选择
   */
  const handleSelectMode = useCallback((mode: GameMode) => {
    const ui = useUIStore.getState();
    const toast = useToastStore.getState();
    const { selectedDeck } = useUserStore.getState();

    if (mode === 'dungeon') {
      if (!selectedDeck) {
        toast.warning('需要牌组', '地牢模式需要先在牌组编辑器中选择一个起始牌组！');
        ui.setGameState('LOBBY');
        return;
      }
      const newRun = DungeonService.startNewRun(selectedDeck);
      ui.setDungeonRun(newRun);
      ui.setGameState('DUNGEON_MAP');
      audioActions.playBgm('lobby');
    } else {
      ui.setGameMode(mode);
      ui.setGameState('LOBBY');
    }
  }, [audioActions]);

  // Handle PVP Start - Transition to Sync Phase
  const handlePvpStart = useCallback((role: 'player1' | 'player2', seed?: number) => {
      const ui = useUIStore.getState();
      const toast = useToastStore.getState();
      const { selectedDeck } = useUserStore.getState();

      if (!selectedDeck || !selectedDeck.cards) {
          toast.warning('缺少牌组', '请先在牌组编辑器中选择一副牌组！');
          return;
      }

      console.log('Starting PVP Sync:', { role, seed });
      ui.setPvpRole(role);
      ui.setPvpSeed(seed ?? null);
      ui.setGameState('PVP_SYNC');
      // Wait for sync to complete before playing battle music
  }, []);

  // Handle PVP Sync Complete - Start Actual Duel
  const handlePvpSyncComplete = useCallback((p1Deck: SpellType[], p2Deck: SpellType[]) => {
      const ui = useUIStore.getState();
      const role = ui.pvpRole;
      const seed = ui.pvpSeed;

      if (!role || seed === null || seed === undefined) {
          console.error('[Pvp Routing] Missing role or seed');
          ui.setGameState('LOBBY');
          return;
      }

      console.log('PVP Sync Complete, Starting Duel');
      gameLoopActions.startPvpDuel(p1Deck, p2Deck, role, seed);
      ui.setGameState('MULLIGAN');
      audioActions.playBgm('battle');
  }, [gameLoopActions, audioActions]);

  /**
   * 重置游戏状态
   */
  const handleResetGame = useCallback(() => {
    const ui = useUIStore.getState();
    const wasDungeon = !!ui.dungeonRun;
    const isWin = ui.finalResult?.result === 'WIN';

    ui.resetResult();
    gameLoopActions.reset();
    ui.setPvpRoomId(null); // [P1] 清空 PVP 房间 ID

    if (wasDungeon) {
      if (isWin) {
        ui.setDungeonRun(prev => prev ? DungeonService.advanceNode(prev) : null);
        ui.setGameState('DUNGEON_MAP');
      } else {
        ui.setDungeonRun(null);
        ui.setGameState('LOBBY');
      }
    } else {
      ui.setGameState('LOBBY');
    }
    audioActions.playBgm('lobby');
  }, [gameLoopActions, audioActions]);

  /**
   * 登录完成处理
   */
  const handleLoginComplete = useCallback((address: string, isGuest: boolean) => {
    const userStore = useUserStore.getState();
    userStore.setActiveAddress(address);
    userStore.loadUserData(address);
    userStore.loadLeaderboard();
    useUIStore.setState({ isLoggedIn: true, isGuest, gameState: 'LOBBY' });
    useToastStore.getState().success('欢迎回来', isGuest ? '游客模式已开启' : `钱包已连接: ${address.slice(0, 6)}...`);
  }, []);

  /**
   * 匹配完成处理 - 开始对战
   */
  const handleMatchmakingComplete = useCallback(() => {
    const currentUI = useUIStore.getState();
    const currentUser = useUserStore.getState();

    const opp = currentUI.pendingTavernDuel || AI_PROFILES[Math.floor(Math.random() * (AI_PROFILES.length - 1)) + 1];
    const isDungeon = !!currentUI.dungeonRun;
    const deck = isDungeon ? currentUI.dungeonRun!.deck.cards : currentUser.selectedDeck!.cards;
    const mode = isDungeon ? 'wild' as const : currentUI.gameMode;

    gameLoopActions.startTavernDuel(deck, opp, mode);
    currentUI.setPendingTavernDuel(null);
    currentUI.setGameState('MULLIGAN');
    audioActions.playBgm('battle');
  }, [gameLoopActions, audioActions]);

  /**
   * 开始对战前的校验
   */
  const handleStartDuel = useCallback(() => {
    const currentUser = useUserStore.getState();
    const currentUI = useUIStore.getState();
    const toast = useToastStore.getState();

    if (!currentUser.selectedDeck) {
      toast.warning('需要牌组', '请先选择或创建一个牌组！');
      return false;
    }
    if (currentUser.balance < currentUI.selectedBet) {
      toast.error('法力不足', `需要 ${currentUI.selectedBet} 法力，当前只有 ${currentUser.balance}`);
      return false;
    }
    currentUI.setGameState('MATCHMAKING');
    return true;
  }, []);

  return {
    handleSelectMode,
    handleResetGame,
    handlePvpStart,
    handleLoginComplete,
    handleMatchmakingComplete,
    handlePvpSyncComplete,
    handleStartDuel,
  };
}
