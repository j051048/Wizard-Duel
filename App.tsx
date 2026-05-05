/**
 * App.tsx - 主应用组件
 * 
 * [#5 App.tsx 瘦身] 重构后职责：
 * - 应用骨架与布局
 * - 视图路由分发
 * - 全局组件挂载
 * 
 * 逻辑已提取到：
 * - useAppRouting: 视图切换逻辑
 * - useGameFeedback: 音效与震动反馈
 * - useGameEndHandler: 游戏结束处理
 */

import React, { useEffect, Component, type ReactNode } from 'react';

// Types
import { SpellType } from './types/card';
import { DungeonNode } from './types/dungeon';

// Hooks
import { usePreloader } from './hooks/usePreloader';
import { useGameLoop } from './hooks/useGameLoop';
import { useAudioManager } from './hooks/useAudioManager';
import { useSettingsStore } from './stores/useSettingsStore';
import { useScreenOrientation } from './hooks/useScreenOrientation';
import { useTutorial } from './hooks/useTutorial';
import { useAppRouting } from './hooks/useAppRouting';
import { useGameFeedback } from './hooks/useGameFeedback';
import { useGameEndHandler } from './hooks/useGameEndHandler';

// Stores
import { useUserStore } from './stores/useUserStore';
import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from './stores/useUIStore';
import { useToastStore } from './stores/useToastStore';

// Lazy Components
const BattleArena = React.lazy(() => import('./components/BattleArena'));
const DeckBuilder = React.lazy(() => import('./components/DeckBuilder'));
const DungeonMap = React.lazy(() => import('./components/DungeonMap'));
const TavernMode = React.lazy(() => import('./components/TavernMode'));
const ShopScreen = React.lazy(() => import('./components/ShopScreen'));
const CollectionBook = React.lazy(() => import('./components/CollectionBook'));
const UserProfilePage = React.lazy(() => import('./components/UserProfilePage'));
const BattlePassPage = React.lazy(() => import('./components/shop/BattlePassPage'));
const PvpStateSync = React.lazy(() => import('./components/PvpStateSync').then(m => ({ default: m.PvpStateSync })));
const AchievementPanel = React.lazy(() => import('./components/AchievementPanel'));
const RankedLadder = React.lazy(() => import('./components/RankedLadder'));
const FriendsPage = React.lazy(() => import('./components/social/FriendsPage'));

// Immediate Components
import { ResultsModal } from './components/ResultsModal';
import { LoadingScreen } from './components/LoadingScreen';
import { Lobby } from './components/Lobby';
import { ModeSelect } from './components/ModeSelect';
import { MatchmakingAnimation } from './components/MatchmakingAnimation';
import { LoginScreen } from './components/LoginScreen';
import { MulliganScreen } from './components/MulliganScreen';
import { ToastContainer } from './components/ui/Toast';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { TutorialOverlay } from './components/battle/TutorialOverlay';
import { OrientationWarning } from './components/ui/OrientationWarning';

// Services
import { DungeonService } from './services/dungeon';
import { AI_PROFILES } from './services/gameLogic';



interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class LazyLoadErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] Lazy component failed to load:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50 p-8">
          <div className="text-6xl mb-4">💥</div>
          <h2 className="text-xl text-red-400 font-tech mb-2">加载失败</h2>
          <p className="text-gray-400 text-sm mb-6 text-center max-w-md">
            {this.state.error?.message || '页面组件加载出错，请刷新页面重试'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-tech transition-colors"
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


function App() {
  const { isLowQuality } = useSettingsStore();

  // ============ Stores: Data (triggers re-render on change) ============
  const userData = useUserStore(useShallow(state => ({
    activeAddress: state.activeAddress,
    balance: state.balance,
    isLoading: state.isLoading,
    userRank: state.userRank,
    rankScore: state.rankScore,
    history: state.history,
    decks: state.decks,
    selectedDeck: state.selectedDeck,
    packInventory: state.packInventory,
    purchasedBundles: state.purchasedBundles,
  })));
  const uiData = useUIStore(useShallow(state => ({
    gameState: state.gameState,
    gameMode: state.gameMode,
    selectedBet: state.selectedBet,
    isResourcesLoaded: state.isResourcesLoaded,
    isGuest: state.isGuest,
    dungeonRun: state.dungeonRun,
    pendingTavernDuel: state.pendingTavernDuel,
    finalResult: state.finalResult,
    isPlayerShaking: state.isPlayerShaking,
    isOpponentShaking: state.isOpponentShaking,
    confirmDialog: state.confirmDialog,
    pvpRoomId: state.pvpRoomId,
    pvpRole: state.pvpRole,
    pvpSeed: state.pvpSeed,
  })));
  const toastData = useToastStore(useShallow(state => ({
    toasts: state.toasts,
  })));

  // ============ Stores: Actions (stable refs, never cause re-render) ============
  const userActions = useUserStore(useShallow(state => ({
    setActiveAddress: state.setActiveAddress,
    loadUserData: state.loadUserData,
    loadLeaderboard: state.loadLeaderboard,
    setBalance: state.setBalance,
    saveDeck: state.saveDeck,
    setSelectedDeck: state.setSelectedDeck,
    addCardsToInventory: state.addCardsToInventory,
    purchaseBundle: state.purchaseBundle,
    addPacks: state.addPacks,
    consumePack: state.consumePack,
    setPackInventory: state.setPackInventory
  })));
  const uiActions = useUIStore(useShallow(state => ({
    setGameState: state.setGameState,
    setIsResourcesLoaded: state.setIsResourcesLoaded,
    setDungeonRun: state.setDungeonRun,
    setPendingTavernDuel: state.setPendingTavernDuel,
    showConfirmDialog: state.showConfirmDialog,
    hideConfirmDialog: state.hideConfirmDialog,
    setPvpRoomId: state.setPvpRoomId,
    setPvpRole: state.setPvpRole,
    setPvpSeed: state.setPvpSeed,
  })));
  const toastActions = useToastStore(useShallow(state => ({
    removeToast: state.removeToast,
    success: state.success,
    warning: state.warning,
    error: state.error,
    info: state.info,
  })));

  // ============ Core Hooks ============
  const { progress, startPreloading } = usePreloader();
  const [gameLoopState, gameLoopActions] = useGameLoop(!!uiData.pvpRoomId);
  const [audioState, audioActions] = useAudioManager();
  const { isMobileLandscape } = useScreenOrientation();

  // ============ Extracted Hooks ============
  const routing = useAppRouting({ gameLoopActions, audioActions });

  const feedback = useGameFeedback({
    effectMessages: gameLoopState.effectMessages,
    audioActions,
  });

  useGameEndHandler({
    gameLoopState,
    onGameEndFeedback: feedback.triggerGameEndFeedback,
    onResetGame: routing.handleResetGame,
  });

  const tutorial = useTutorial(
    true,
    uiData.gameState,
    gameLoopState.phase,
    gameLoopState.duelState?.roundNumber || 0
  );

  // ============ Initialization ============
  useEffect(() => {
    const version = "v2026.02.13.PVP.01";
    const storedVer = localStorage.getItem('app_version');
    if (storedVer !== version) {
        console.log('🚀 [VERSION_RECOVERY] 检测到新版本 PVP 补丁，正在重置本地存储...');
        localStorage.removeItem('wizard_duel_state');
        localStorage.removeItem('wizard_rng_state');
        localStorage.setItem('app_version', version);
    }
    startPreloading();

    (async () => {
      try {
        const { supabase, isSupabaseConfigured } = await import('./services/supabase');
        if (!isSupabaseConfigured) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const walletAddr = session.user.user_metadata?.wallet_address;
          if (walletAddr) {
            const store = useUserStore.getState();
            store.setActiveAddress(walletAddr);
            store.setSupabaseUserId(session.user.id);
            store.loadUserData(walletAddr);
            store.loadLeaderboard();
            useUIStore.getState().setGameState('LOBBY');
          }
        }
      } catch { /* no session — show login */ }
    })();
  }, [startPreloading]);

  const handleResourcesLoaded = () => {
    uiActions.setIsResourcesLoaded(true);
    audioActions.playBgm('lobby');
  };

  // ============ Render: Loading ============
  if (!uiData.isResourcesLoaded) {
    return <LoadingScreen progress={progress} onComplete={handleResourcesLoaded} />;
  }

  // ============ Render: Login ============
  if (uiData.gameState === 'LOGIN') {
    return (
      <>
        <LoginScreen onLoginComplete={routing.handleLoginComplete} />
        <ToastContainer toasts={toastData.toasts} onDismiss={toastActions.removeToast} />
      </>
    );
  }

  // ============ Render: Main App ============
  return (
    <div className={`h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-slate-950 text-white font-tech selection:bg-purple-500/30 touch-pan-y ${isLowQuality ? 'low-quality' : ''}`}>

      {isMobileLandscape && <OrientationWarning />}

      <main className={uiData.gameState === 'LOBBY' ? 'pt-16' : ''}>

        {uiData.gameState === 'LOBBY' && (
          <Lobby
            onStartDuel={routing.handleStartDuel}
            onPvpStart={routing.handlePvpStart}
            isMuted={audioState.isMuted}
            onToggleMute={audioActions.toggleMute}
          />
        )}

        {uiData.gameState === 'MODE_SELECT' && (
          <ModeSelect
            onSelectMode={routing.handleSelectMode}
            onBackToLobby={() => uiActions.setGameState('LOBBY')}
          />
        )}

        {uiData.gameState === 'MATCHMAKING' && (
          <MatchmakingAnimation
            onComplete={routing.handleMatchmakingComplete}
            opponentName={uiData.pendingTavernDuel?.name}
            opponentAvatar={uiData.pendingTavernDuel?.avatar}
            isTavernMode={!!uiData.pendingTavernDuel}
          />
        )}

        <LazyLoadErrorBoundary>
        <React.Suspense fallback={<LoadingScreen progress={{ percentage: 100, isComplete: false, loaded: 1, total: 1, currentItem: '加载中...', errors: [] }} />}>

          {uiData.gameState === 'TAVERN' && (
            <TavernMode
              onStartTavernDuel={(ai: any) => {
                if (!userData.selectedDeck) {
                  toastActions.warning('需要牌组', '请先选择牌组！');
                  return;
                }
                uiActions.setPendingTavernDuel(ai);
                uiActions.setGameState('MATCHMAKING');
              }}
              onBackToLobby={() => uiActions.setGameState('LOBBY')}
              playerStats={{ tavernWins: 0, tavernLosses: 0, bestStreak: 0 }}
            />
          )}

          {uiData.gameState === 'DUNGEON_MAP' && uiData.dungeonRun && (
            <DungeonMap
              runState={uiData.dungeonRun}
              onSelectNode={(node: DungeonNode) => {
                if (['BATTLE', 'ELITE', 'BOSS'].includes(node.type)) {
                  const diff = node.type === 'BOSS' ? 'hard' : node.type === 'ELITE' ? 'medium' : 'easy';
                  const opp = AI_PROFILES.find(p => p.difficulty === diff) || AI_PROFILES[0];
                  uiActions.setPendingTavernDuel(opp);
                  uiActions.setGameState('MATCHMAKING');
                } else if (node.type === 'REST') {
                  const updated = DungeonService.updateHP(uiData.dungeonRun!, Math.floor(uiData.dungeonRun!.maxHP * 0.3));
                  uiActions.setDungeonRun(DungeonService.advanceNode(updated));
                  toastActions.success('休息完成', '恢复了 30% 生命值！');
                } else {
                  uiActions.setDungeonRun(DungeonService.advanceNode(uiData.dungeonRun!));
                }
              }}
            />
          )}

          {uiData.gameState === 'DECK_BUILDER' && (
            <DeckBuilder
              onBack={() => uiActions.setGameState('LOBBY')}
              onSaveDeck={userActions.saveDeck}
              onSelectDeck={userActions.setSelectedDeck}
              existingDecks={userData.decks}
              selectedDeck={userData.selectedDeck}
              gameMode={uiData.gameMode}
            />
          )}

          {uiData.gameState === 'SHOP' && (
            <ShopScreen
              onBack={() => uiActions.setGameState('LOBBY')}
            />
          )}

          {uiData.gameState === 'COLLECTION' && (
            <CollectionBook onBack={() => uiActions.setGameState('LOBBY')} />
          )}

          {uiData.gameState === 'PROFILE' && (
            <UserProfilePage
              onBack={() => uiActions.setGameState('LOBBY')}
              balance={userData.balance}
              userRank={userData.userRank}
              rankScore={userData.rankScore}
              history={userData.history}
              activeAddress={userData.activeAddress}
              isGuest={uiData.isGuest}
              onUpdateBalance={userActions.setBalance}
              onUpdateName={(name: string) => {
                localStorage.setItem('wizard_display_name', name);
                toastActions.success('昵称已更新', name);
              }}
              displayName={localStorage.getItem('wizard_display_name') || (userData.activeAddress ? `Wizard_${userData.activeAddress.slice(0, 6)}` : '游客法师')}
            />
          )}

          {uiData.gameState === 'BATTLE_PASS' && (
            <BattlePassPage
              onBack={() => uiActions.setGameState('LOBBY')}
              onPurchasePremium={() => {
                const premiumCost = 680; // 680 gems
                if ((userData.balance || 0) < premiumCost) {
                  toastActions.error('宝石不足', `需要 ${premiumCost} 宝石，当前余额 ${userData.balance || 0}`);
                  return;
                }
                // Lazy import to avoid circular deps
                import('./services/BattlePassService').then(({ BattlePassService }) => {
                  const success = BattlePassService.purchasePremium();
                  if (success) {
                    userActions.setBalance((userData.balance || 0) - premiumCost);
                    toastActions.success('购买成功！', '已解锁高级通行证，领取专属奖励！');
                  } else {
                    toastActions.error('购买失败', '你已拥有高级通行证');
                  }
                });
              }}
              balance={userData.balance}
            />
          )}

          {uiData.gameState === 'ACHIEVEMENTS' && (
            <AchievementPanel onBack={() => uiActions.setGameState('LOBBY')} />
          )}

          {uiData.gameState === 'RANKED' && (
            <RankedLadder onBack={() => uiActions.setGameState('LOBBY')} />
          )}

          {uiData.gameState === 'FRIENDS' && (
            <FriendsPage
              userId={userData.activeAddress || 'guest'}
              username={localStorage.getItem('wizard_display_name') || (userData.activeAddress ? `Wizard_${userData.activeAddress.slice(0, 6)}` : 'Guest')}
              onBack={() => uiActions.setGameState('LOBBY')}
              onStartFriendBattle={(friendId, roomId) => {
                toastActions.info('好友对战', '正在准备对战房间...');
              }}
            />
          )}

          {uiData.gameState === 'PVP_SYNC' && uiData.pvpRole && uiData.pvpSeed !== null && userData.selectedDeck && (
            <PvpStateSync
              role={uiData.pvpRole}
              seed={uiData.pvpSeed}
              myDeck={userData.selectedDeck.cards}
              onSyncComplete={routing.handlePvpSyncComplete}
            />
          )}

          {uiData.gameState === 'MULLIGAN' && gameLoopState.duelState && (
            <MulliganScreen
              initialHand={gameLoopState.duelState.playerHand}
              opponentName={gameLoopState.duelState.aiProfile?.name}
              opponentAvatar={gameLoopState.duelState.aiProfile?.avatar}
              onConfirm={(indices: number[]) => {
                gameLoopActions.handleMulligan(indices);
                tutorial.handleAction('MULLIGAN');
                uiActions.setGameState('DUEL');
              }}
              timeLimit={30}
            />
          )}

          {uiData.gameState === 'DUEL' && (
            gameLoopState.duelState ? (
              <BattleArena
                gameLoopState={gameLoopState}
                selectedBet={uiData.selectedBet}
                pvpRoomId={uiData.pvpRoomId || undefined}
                onRemotePlayCard={gameLoopActions.handleRemotePlayCard}
                onRemoteEndTurn={gameLoopActions.handleRemoteEndTurn}
                getSerializedState={gameLoopActions.getSerializedState}
                restoreFromSync={gameLoopActions.restoreFromSync}
                onPlayCard={(spellId: SpellType) => {
                  if (gameLoopActions.playCard(spellId)) {
                    feedback.triggerCardPlayFeedback();
                    audioActions.playSpellSfx(spellId);
                    tutorial.handleAction('PLAY_CARD');
                  }
                }}
                onPass={() => {
                  gameLoopActions.passTurn();
                  feedback.triggerButtonFeedback();
                  tutorial.handleAction('END_TURN');
                }}
                onSurrender={() => {
                  uiActions.showConfirmDialog({
                    title: '确认投降',
                    message: '投降将判定为失败，确定要放弃这场对战吗？',
                    confirmText: '投降',
                    cancelText: '继续战斗',
                    type: 'danger',
                    onConfirm: () => {
                      gameLoopActions.reset();
                      uiActions.setPvpRoomId(null);
                      uiActions.setGameState('LOBBY');
                      audioActions.playBgm('lobby');
                      uiActions.hideConfirmDialog();
                      toastActions.info('对战结束', '你选择了投降');
                    }
                  });
                }}
                isMuted={audioState.isMuted}
                onToggleMute={audioActions.toggleMute}
                isPlayerShaking={uiData.isPlayerShaking}
                isOpponentShaking={uiData.isOpponentShaking}
                setTargeting={gameLoopActions.setTargeting}
                onSelectHeroSkill={gameLoopActions.selectHeroSkill}
                onUseHeroSkill={gameLoopActions.useHeroSkill}
              />
            ) : (
              <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                <p className="text-purple-300 font-tech animate-pulse">正在同步法术波长...</p>
              </div>
            )
          )}

          {uiData.finalResult && (
            <ResultsModal
              result={uiData.finalResult.result}
              playerSpell={uiData.finalResult.player}
              opponentSpell={uiData.finalResult.opponent}
              payout={uiData.finalResult.payout}
              bet={uiData.selectedBet}
              isCrit={uiData.finalResult.isCrit}
              onClose={routing.handleResetGame}
              isTavernMode={gameLoopState.duelState?.isTavernMode}
              rankUpdates={uiData.finalResult.rankUpdates}
            />
          )}
        </React.Suspense>
        </LazyLoadErrorBoundary>
      </main>

      <ToastContainer toasts={toastData.toasts} onDismiss={toastActions.removeToast} />

      <ConfirmDialog
        isOpen={uiData.confirmDialog.isOpen}
        title={uiData.confirmDialog.title}
        message={uiData.confirmDialog.message}
        confirmText={uiData.confirmDialog.confirmText}
        cancelText={uiData.confirmDialog.cancelText}
        type={uiData.confirmDialog.type}
        onConfirm={() => uiData.confirmDialog.onConfirm?.()}
        onCancel={uiActions.hideConfirmDialog}
      />

      {tutorial.activeStep && (
        <TutorialOverlay
          step={tutorial.activeStep}
          onNext={tutorial.nextStep}
          onSkip={tutorial.nextStep}
        />
      )}
    </div>
  );
}

// ============ Sub-Components ============

export default App;
