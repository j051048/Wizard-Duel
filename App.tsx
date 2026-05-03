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

  // ============ Stores ============
  const user = useUserStore(useShallow(state => ({
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

    // Actions
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
  const ui = useUIStore(useShallow(state => ({
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
  const toast = useToastStore(useShallow(state => ({
    toasts: state.toasts,
    removeToast: state.removeToast,
    success: state.success,
    warning: state.warning,
    error: state.error,
    info: state.info,
  })));

  // ============ Core Hooks ============
  const { progress, startPreloading } = usePreloader();
  const [gameLoopState, gameLoopActions] = useGameLoop(!!ui.pvpRoomId);
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
    ui.gameState,
    gameLoopState.phase,
    gameLoopState.duelState?.roundNumber || 0
  );

  // ============ Initialization ============
  useEffect(() => {
    // 强制清理旧版本缓存与存档
    const version = "v2026.02.13.PVP.01";
    const storedVer = localStorage.getItem('app_version');
    if (storedVer !== version) {
        console.log('🚀 [VERSION_RECOVERY] 检测到新版本 PVP 补丁，正在重置本地存储...');
        // 清理战斗状态、RNG状态等
        localStorage.removeItem('wizard_duel_state');
        localStorage.removeItem('wizard_rng_state');
        localStorage.setItem('app_version', version);
    }
    startPreloading();
  }, [startPreloading]);

  useEffect(() => {
    if (user.activeAddress) {
      user.loadUserData(user.activeAddress);
      user.loadLeaderboard();
    }
  }, [user.activeAddress]);

  const handleResourcesLoaded = () => {
    ui.setIsResourcesLoaded(true);
    audioActions.playBgm('lobby');
  };

  // ============ Render: Loading ============
  if (!ui.isResourcesLoaded) {
    return <LoadingScreen progress={progress} onComplete={handleResourcesLoaded} />;
  }

  // ============ Render: Login ============
  if (ui.gameState === 'LOGIN') {
    return (
      <>
        <LoginScreen onLoginComplete={routing.handleLoginComplete} />
        <ToastContainer toasts={toast.toasts} onDismiss={toast.removeToast} />
      </>
    );
  }

  // ============ Render: Main App ============
  return (
    <div className={`h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-slate-950 text-white font-tech selection:bg-purple-500/30 touch-pan-y ${isLowQuality ? 'low-quality' : ''}`}>
      
      {/* Orientation Warning */}
      {isMobileLandscape && <OrientationWarning />}

      {/* Main Content */}
      <main className={ui.gameState === 'LOBBY' ? 'pt-16' : ''}>
        
        {/* Lobby */}
        {ui.gameState === 'LOBBY' && (
          <Lobby
            onStartDuel={routing.handleStartDuel}
            onPvpStart={routing.handlePvpStart}
            isMuted={audioState.isMuted}
            onToggleMute={audioActions.toggleMute}
          />
        )}

        {/* Mode Select */}
        {ui.gameState === 'MODE_SELECT' && (
          <ModeSelect
            onSelectMode={routing.handleSelectMode}
            onBackToLobby={() => ui.setGameState('LOBBY')}
          />
        )}

        {/* Matchmaking */}
        {ui.gameState === 'MATCHMAKING' && (
          <MatchmakingAnimation
            onComplete={routing.handleMatchmakingComplete}
            opponentName={ui.pendingTavernDuel?.name}
            opponentAvatar={ui.pendingTavernDuel?.avatar}
            isTavernMode={!!ui.pendingTavernDuel}
          />
        )}

        {/* Lazy Loaded Views */}
        <LazyLoadErrorBoundary>
        <React.Suspense fallback={<LoadingScreen progress={{ percentage: 100, isComplete: false, loaded: 1, total: 1, currentItem: '加载中...', errors: [] }} />}>
          
          {/* Tavern Mode */}
          {ui.gameState === 'TAVERN' && (
            <TavernMode
              onStartTavernDuel={(ai: any) => {
                if (!user.selectedDeck) {
                  toast.warning('需要牌组', '请先选择牌组！');
                  return;
                }
                ui.setPendingTavernDuel(ai);
                ui.setGameState('MATCHMAKING');
              }}
              onBackToLobby={() => ui.setGameState('LOBBY')}
              playerStats={{ tavernWins: 0, tavernLosses: 0, bestStreak: 0 }}
            />
          )}

          {/* Dungeon Map */}
          {ui.gameState === 'DUNGEON_MAP' && ui.dungeonRun && (
            <DungeonMap
              runState={ui.dungeonRun}
              onSelectNode={(node: DungeonNode) => {
                if (['BATTLE', 'ELITE', 'BOSS'].includes(node.type)) {
                  const diff = node.type === 'BOSS' ? 'hard' : node.type === 'ELITE' ? 'medium' : 'easy';
                  const opp = AI_PROFILES.find(p => p.difficulty === diff) || AI_PROFILES[0];
                  ui.setPendingTavernDuel(opp);
                  ui.setGameState('MATCHMAKING');
                } else if (node.type === 'REST') {
                  const updated = DungeonService.updateHP(ui.dungeonRun!, Math.floor(ui.dungeonRun!.maxHP * 0.3));
                  ui.setDungeonRun(DungeonService.advanceNode(updated));
                  toast.success('休息完成', '恢复了 30% 生命值！');
                } else {
                  ui.setDungeonRun(DungeonService.advanceNode(ui.dungeonRun!));
                }
              }}
            />
          )}

          {/* Deck Builder */}
          {ui.gameState === 'DECK_BUILDER' && (
            <DeckBuilder
              onBack={() => ui.setGameState('LOBBY')}
              onSaveDeck={user.saveDeck}
              onSelectDeck={user.setSelectedDeck}
              existingDecks={user.decks}
              selectedDeck={user.selectedDeck}
              gameMode={ui.gameMode}
            />
          )}

          {/* Shop */}
          {ui.gameState === 'SHOP' && (
            <ShopScreen
              onBack={() => ui.setGameState('LOBBY')}
            />
          )}

                    {/* Collection */}
          {ui.gameState === 'COLLECTION' && (
            <CollectionBook onBack={() => ui.setGameState('LOBBY')} />
          )}

          {/* User Profile */}
          {ui.gameState === 'PROFILE' && (
            <UserProfilePage
              onBack={() => ui.setGameState('LOBBY')}
              balance={user.balance}
              userRank={user.userRank}
              rankScore={user.rankScore}
              history={user.history}
              activeAddress={user.activeAddress}
              isGuest={ui.isGuest}
              onUpdateBalance={user.setBalance}
              onUpdateName={(name: string) => {
                localStorage.setItem('wizard_display_name', name);
                toast.success('昵称已更新', name);
              }}
              displayName={localStorage.getItem('wizard_display_name') || (user.activeAddress ? `Wizard_${user.activeAddress.slice(0, 6)}` : '游客法师')}
            />
          )}

          {/* Battle Pass */}
          {ui.gameState === 'BATTLE_PASS' && (
            <BattlePassPage
              onBack={() => ui.setGameState('LOBBY')}
              onPurchasePremium={() => {
                toast.info('即将推出', '高级通行证即将上线！');
              }}
              balance={user.balance}
            />
          )}

          {/* Achievements */}
          {ui.gameState === 'ACHIEVEMENTS' && (
            <AchievementPanel onBack={() => ui.setGameState('LOBBY')} />
          )}

          {/* Ranked Ladder */}
          {ui.gameState === 'RANKED' && (
            <RankedLadder onBack={() => ui.setGameState('LOBBY')} />
          )}


          {/* PVP State Sync */}
          {ui.gameState === 'PVP_SYNC' && ui.pvpRole && ui.pvpSeed !== null && user.selectedDeck && (
            <PvpStateSync 
              role={ui.pvpRole}
              seed={ui.pvpSeed}
              myDeck={user.selectedDeck.cards}
              onSyncComplete={routing.handlePvpSyncComplete}
            />
          )}

          {/* Mulligan */}
          {ui.gameState === 'MULLIGAN' && gameLoopState.duelState && (
            <MulliganScreen
              initialHand={gameLoopState.duelState.playerHand}
              opponentName={gameLoopState.duelState.aiProfile?.name}
              opponentAvatar={gameLoopState.duelState.aiProfile?.avatar}
              onConfirm={(indices: number[]) => {
                gameLoopActions.handleMulligan(indices);
                tutorial.handleAction('MULLIGAN');
                ui.setGameState('DUEL');
              }}
              timeLimit={30}
            />
          )}

          {/* Battle */}
          {ui.gameState === 'DUEL' && (
            gameLoopState.duelState ? (
              <BattleArena
                gameLoopState={gameLoopState}
                selectedBet={ui.selectedBet}
                pvpRoomId={ui.pvpRoomId || undefined}
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
                  ui.showConfirmDialog({
                    title: '确认投降',
                    message: '投降将判定为失败，确定要放弃这场对战吗？',
                    confirmText: '投降',
                    cancelText: '继续战斗',
                    type: 'danger',
                    onConfirm: () => {
                      gameLoopActions.reset();
                      ui.setPvpRoomId(null);
                      ui.setGameState('LOBBY');
                      audioActions.playBgm('lobby');
                      ui.hideConfirmDialog();
                      toast.info('对战结束', '你选择了投降');
                    }
                  });
                }}
                isMuted={audioState.isMuted}
                onToggleMute={audioActions.toggleMute}
                isPlayerShaking={ui.isPlayerShaking}
                isOpponentShaking={ui.isOpponentShaking}
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

          {/* Results */}
          {ui.finalResult && (
            <ResultsModal
              result={ui.finalResult.result}
              playerSpell={ui.finalResult.player}
              opponentSpell={ui.finalResult.opponent}
              payout={ui.finalResult.payout}
              bet={ui.selectedBet}
              isCrit={ui.finalResult.isCrit}
              onClose={routing.handleResetGame}
              isTavernMode={gameLoopState.duelState?.isTavernMode}
              rankUpdates={ui.finalResult.rankUpdates}
            />
          )}
        </React.Suspense>
        </LazyLoadErrorBoundary>
      </main>

      {/* Global Components */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.removeToast} />
      
      <ConfirmDialog
        isOpen={ui.confirmDialog.isOpen}
        title={ui.confirmDialog.title}
        message={ui.confirmDialog.message}
        confirmText={ui.confirmDialog.confirmText}
        cancelText={ui.confirmDialog.cancelText}
        type={ui.confirmDialog.type}
        onConfirm={() => ui.confirmDialog.onConfirm?.()}
        onCancel={ui.hideConfirmDialog}
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
