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

import React, { useEffect } from 'react';
import { Sparkles, Settings, CheckCircle } from 'lucide-react';

// Types
import { SpellType } from './types/card';
import { DungeonNode } from './types/dungeon';
import { TRANSLATIONS } from './translations';
import { Language } from './types';

// Hooks
import { usePreloader } from './hooks/usePreloader';
import { useGameLoop } from './hooks/useGameLoop';
import { useAudioManager } from './hooks/useAudioManager';
import { useSettings } from './context/SettingsContext';
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



function App() {
  const { quality, setQuality, isLowQuality } = useSettings();

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
  const ui = useUIStore();
  const toast = useToastStore();

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

      {/* Lobby Header */}
      {ui.gameState === 'LOBBY' && (
        <LobbyHeader
          quality={quality}
          setQuality={setQuality}
          isLowQuality={isLowQuality}
          balance={user.balance}
          isLoading={user.isLoading}
          showSettings={ui.showSettings}
          setShowSettings={ui.setShowSettings}
          language={ui.language}
        />
      )}

      {ui.showSettings && (
        <div className="fixed inset-0 z-[55]" onClick={() => ui.setShowSettings(false)} />
      )}

      {/* Main Content */}
      <main className={ui.gameState === 'LOBBY' ? 'pt-16' : ''}>
        
        {/* Lobby */}
        {ui.gameState === 'LOBBY' && (
          <Lobby
            balance={user.balance}
            userRank={user.userRank}
            rankScore={user.rankScore}
            selectedBet={ui.selectedBet}
            onSelectBet={ui.setSelectedBet}
            onStartDuel={routing.handleStartDuel}
            onPvpStart={routing.handlePvpStart}
            onOpenShop={() => ui.setGameState('SHOP')}
            onOpenCollection={() => ui.setGameState('COLLECTION')}
            history={user.history}
            isMuted={audioState.isMuted}
            onToggleMute={audioActions.toggleMute}
            isLoading={user.isLoading}
            decks={user.decks}
            selectedDeck={user.selectedDeck}
            onOpenDeckBuilder={() => ui.setGameState('DECK_BUILDER')}
            onSelectDeck={user.setSelectedDeck}
            onOpenTavernMode={() => ui.setGameState('TAVERN')}
            gameMode={ui.gameMode}
            onOpenModeSelect={() => ui.setGameState('MODE_SELECT')}
            language={ui.language}
            onLanguageChange={ui.setLanguage}
                        onClaimQuestReward={(amount: number) => {
              user.setBalance(user.balance + amount);
              toast.success('奖励到账', `获得 ${amount} 法力值！`);
            }}
            onOpenProfile={() => ui.setGameState('PROFILE')}
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
              balance={user.balance}
              onBack={() => ui.setGameState('LOBBY')}
              onUpdateBalance={user.setBalance}
              onAddCards={(cardIds: SpellType[]) => {
                user.addCardsToInventory(cardIds);
                toast.success('卡牌已添加', `${cardIds.length} 张卡牌已加入收藏`);
              }}
              purchasedBundles={user.purchasedBundles}
              onPurchaseBundle={user.purchaseBundle}
              packInventory={user.packInventory}
              setPackInventory={user.setPackInventory}
              onAddPacks={user.addPacks}
              onConsumePack={user.consumePack}
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

interface LobbyHeaderProps {
  quality: 'high' | 'low';
  setQuality: (q: 'high' | 'low') => void;
  isLowQuality: boolean;
  balance: number;
  isLoading: boolean;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  language: Language;
}

const LobbyHeader: React.FC<LobbyHeaderProps> = ({
  quality,
  setQuality,
  isLowQuality,
  balance,
  isLoading,
  showSettings,
  setShowSettings,
  language,
}) => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center safe-area-top">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
        <Sparkles size={20} className="text-white" />
      </div>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70"
      >
        <Settings size={20} />
      </button>
    </div>

    <div className="flex items-center gap-3">
      {isLowQuality && (
        <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded border border-amber-500/30 font-bold uppercase">
          省电模式
        </span>
      )}
      <div className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
        <span className="text-purple-400 text-xs uppercase font-bold text-nowrap">{TRANSLATIONS[language]?.['GOLD'] || '钻石'}</span>
        <span className="font-mono font-bold text-white">{isLoading ? '...' : balance}</span>
      </div>
    </div>

    {showSettings && (
      <div className="absolute top-full left-4 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2">
        <div className="text-[10px] text-gray-400 font-bold uppercase px-2 mb-1 tracking-wider">
          画面设置
        </div>
        <button
          onClick={() => { setQuality('high'); setShowSettings(false); }}
          className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${quality === 'high' ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-white/5'}`}
        >
          <span>高画质 (全特效)</span>
          {quality === 'high' && <CheckCircle size={14} />}
        </button>
        <button
          onClick={() => { setQuality('low'); setShowSettings(false); }}
          className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${quality === 'low' ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-white/5'}`}
        >
          <span>低画质 (更流畅)</span>
          {quality === 'low' && <CheckCircle size={14} />}
        </button>
      </div>
    )}
  </header>
);

export default App;
