import React, { useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Sparkles, Settings, CheckCircle, ShoppingBag } from 'lucide-react';

// Hooks
import { SpellType, GameMode } from './types/card';
import { DungeonNode } from './types/dungeon';
import { usePreloader } from './hooks/usePreloader';

// ... (other imports)

import { useGameLoop } from './hooks/useGameLoop';
import { useAudioManager } from './hooks/useAudioManager';
import { useSettings } from './context/SettingsContext';

// Stores
import { useUserStore } from './stores/useUserStore';
import { useUIStore } from './stores/useUIStore';

// Components
const BattleArena = React.lazy(() => import('./components/BattleArena'));
const DeckBuilder = React.lazy(() => import('./components/DeckBuilder'));
const DungeonMap = React.lazy(() => import('./components/DungeonMap'));
const ResultsModal = React.lazy(() => import('./components/ResultsModal'));
const TavernMode = React.lazy(() => import('./components/TavernMode'));

// Immediate Components
import { LoadingScreen } from './components/LoadingScreen';
import { Lobby } from './components/Lobby';
import { ModeSelect } from './components/ModeSelect';
import { MatchmakingAnimation } from './components/MatchmakingAnimation';
import { LoginScreen } from './components/LoginScreen';
import { MulliganScreen } from './components/MulliganScreen';
import { ToastContainer } from './components/ui/Toast';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
// [P0 Fix A-3] TurnBanner 和 TurnTimer 已移入 BattleArena 内部，由 useTurnManager 统一驱动
// import { TurnBanner } from './components/battle/TurnBanner';
// import { TurnTimer } from './components/battle/TurnTimer';
import { TutorialOverlay } from './components/battle/TutorialOverlay';
import { useTutorial } from './hooks/useTutorial';

// Stores
import { useToastStore } from './stores/useToastStore';

// UI Components
import { OrientationWarning } from './components/ui/OrientationWarning';
import { useScreenOrientation } from './hooks/useScreenOrientation';

// Lazy loaded components
const ShopScreen = React.lazy(() => import('./components/ShopScreen'));
const CollectionBook = React.lazy(() => import('./components/CollectionBook'));

// Services & Constants
import { ApiService } from './services/api';
import { calculatePayout, AI_PROFILES } from './services/gameLogic';
import { HapticService } from './services/haptic';
import { calculateRankUpdate } from './services/rankSystem';
import { DungeonService } from './services/dungeon';
import { GAME_CONFIG } from './constants';
import { QuestManager } from './services/QuestManager';

function App() {
  const { address, isConnected } = useAccount();
  const { quality, setQuality, isLowQuality } = useSettings();

    // ============ Zustand Stores ============
  const user = useUserStore();
  const ui = useUIStore();
  const toast = useToastStore();

  // ============ Hooks ============
  const { progress, startPreloading } = usePreloader();
  const [gameLoopState, gameLoopActions] = useGameLoop();
  const [audioState, audioActions] = useAudioManager();
  
  // D-3: Orientation Check
  const { isMobileLandscape } = useScreenOrientation();

  // ============ 引导系统 ============
  const tutorial = useTutorial(
    true, 
    ui.gameState,
    gameLoopState.phase,
    gameLoopState.duelState?.roundNumber || 0
  );

  // ============ 逻辑处理器 ============

  const handleResourcesLoaded = useCallback(() => {
    ui.setIsResourcesLoaded(true);
    audioActions.playBgm('lobby');
  }, [ui, audioActions]);

  const handleSelectMode = useCallback((mode: GameMode) => {
    if (mode === 'dungeon') {
      if (!user.selectedDeck) {
        toast.warning('需要牌组', '地牢模式需要先在牌组编辑器中选择一个起始牌组！');
        ui.setGameState('LOBBY');
        return;
      }
      const newRun = DungeonService.startNewRun(user.selectedDeck);
      ui.setDungeonRun(newRun);
      ui.setGameState('DUNGEON_MAP');
      audioActions.playBgm('lobby');
    } else {
      ui.setGameMode(mode);
      ui.setGameState('LOBBY');
    }
  }, [user.selectedDeck, ui, audioActions, toast]);

  const handleResetGame = useCallback(() => {
    const wasDungeon = !!ui.dungeonRun;
    const isWin = ui.finalResult?.result === 'WIN';

    ui.resetResult();
    gameLoopActions.reset();
    
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
  }, [ui, gameLoopActions, audioActions]);

  const handleGameEnd = useCallback(async (
    result: 'WIN' | 'LOSS',
    playerCard: SpellType,
    opponentCard: SpellType,
    opponentMaxMana: number,
    opponentHP: number
  ) => {
    const user = useUserStore.getState();
    const ui = useUIStore.getState();

    if (result === 'WIN') {
      audioActions.playSfx('victory');
      HapticService.success();
    } else {
      audioActions.playSfx('defeat');
      HapticService.failure();
    }

    const newStreak = result === 'WIN' ? user.winStreak + 1 : 0;
    user.setWinStreak(newStreak);

    // [Quest] 更新任务进度
    QuestManager.updateProgress('play_cards', 1); 
    if (result === 'WIN') {
      QuestManager.updateProgress('win_games', 1);
    }
    
    const damage = opponentMaxMana - opponentHP; 
    if (damage > 0) QuestManager.updateProgress('deal_damage', damage);

    const { newScore, newRank, scoreDelta } = calculateRankUpdate(user.rankScore, result, newStreak);
    user.setRankScore(newScore);
    user.setUserRank(newRank);

    try {
      let finalPayout = 0;
      let finalIsCrit = false;

      if (user.activeAddress) {
        const res = await ApiService.settleGame(
          user.activeAddress,
          ui.selectedBet,
          result,
          playerCard,
          opponentCard,
          { 
            finalPlayerHP: 100, // Should use real HP from state if available
            finalOpponentHP: opponentHP 
          },
          newScore,
          newRank
        );
        user.setBalance(res.newBalance);
        user.loadUserData(user.activeAddress);
        finalPayout = res.payout;
        finalIsCrit = res.isCrit;
      } else {
        // Fallback for non-logged in (shouldn't happen with current logic)
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
      handleResetGame();
    }
  }, [audioActions, handleResetGame]);

  // ============ 初始化与同步 ============

  useEffect(() => {
    startPreloading();
  }, [startPreloading]);

  // 登录完成处理
  const handleLoginComplete = useCallback((address: string, isGuest: boolean) => {
    user.setActiveAddress(address);
    ui.setIsLoggedIn(true);
    ui.setIsGuest(isGuest);
    ui.setGameState('LOBBY');
    toast.success('欢迎回来', isGuest ? '游客模式已开启' : `钱包已连接: ${address.slice(0, 6)}...`);
  }, [user, ui, toast]);

  // 数据加载
  useEffect(() => {
    if (user.activeAddress) {
      user.loadUserData(user.activeAddress);
      user.loadLeaderboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.activeAddress]);

  // 游戏结束判定
  useEffect(() => {
    if (gameLoopState.isGameOver && gameLoopState.gameResult && ui.gameState === 'DUEL') {
      const finalRes = gameLoopState.gameResult === 'DRAW' ? 'LOSS' : gameLoopState.gameResult;
      
      // Safe access to loop state properties
      const pCard = (gameLoopState.playerCard || 'fire') as SpellType;
      const oCard = (gameLoopState.opponentCard || 'fire') as SpellType;
      const dState = gameLoopState.duelState;
      
      handleGameEnd(
        finalRes as 'WIN' | 'LOSS',
        pCard,
        oCard,
        dState?.opponentMaxMana || 0,
        dState?.opponentHP || 0
      );
    }
  }, [gameLoopState.isGameOver, gameLoopState.gameResult, handleGameEnd, gameLoopState.playerCard, gameLoopState.opponentCard, gameLoopState.duelState, ui.gameState]);

  // 震动与音效反馈
  useEffect(() => {
    if (gameLoopState.effectMessages.length > 0) {
      const lastMsg = gameLoopState.effectMessages[gameLoopState.effectMessages.length - 1];
      if (lastMsg.includes('受到')) {
        ui.setIsPlayerShaking(true);
        audioActions.playSfx('hit');
        setTimeout(() => ui.setIsPlayerShaking(false), 500);
      } else if (lastMsg.includes('造成')) {
        ui.setIsOpponentShaking(true);
        audioActions.playSfx('hit');
        setTimeout(() => ui.setIsOpponentShaking(false), 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameLoopState.effectMessages]); 


    // ============ 渲染逻辑 ============

  // 资源加载中
  if (!ui.isResourcesLoaded) {
    return <LoadingScreen progress={progress} onComplete={handleResourcesLoaded} />;
  }

  // 登录页面
  if (ui.gameState === 'LOGIN') {
    return (
      <>
        <LoginScreen onLoginComplete={handleLoginComplete} />
        <ToastContainer toasts={toast.toasts} onDismiss={toast.removeToast} />
      </>
    );
  }

  return (
    <div className={`h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-slate-950 text-white font-tech selection:bg-purple-500/30 touch-pan-y ${isLowQuality ? 'low-quality' : ''}`}>
      
      {/* D-3: Force Portrait on Mobile */}
      {isMobileLandscape && <OrientationWarning />}

      {ui.gameState === 'LOBBY' && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center safe-area-top">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <button 
              onClick={() => ui.setShowSettings(!ui.showSettings)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70"
            >
              <Settings size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
             {isLowQuality && (
               <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded border border-amber-500/30 font-bold uppercase">省电模式</span>
             )}
            <div id="header-mana-display" className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-purple-400 text-xs uppercase font-bold text-nowrap">法力</span>
              <span className="font-mono font-bold text-white">{user.isLoading ? '...' : user.balance}</span>
            </div>
          </div>

          {ui.showSettings && (
            <div className="absolute top-full left-4 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2">
               <div className="text-[10px] text-gray-400 font-bold uppercase px-2 mb-1 tracking-wider">画面设置</div>
               <button onClick={() => { setQuality('high'); ui.setShowSettings(false); }} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${quality === 'high' ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-white/5'}`}>
                 <span>高画质 (全特效)</span>
                 {quality === 'high' && <CheckCircle size={14} />}
               </button>
               <button onClick={() => { setQuality('low'); ui.setShowSettings(false); }} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${quality === 'low' ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-white/5'}`}>
                 <span>低画质 (更流畅)</span>
                 {quality === 'low' && <CheckCircle size={14} />}
               </button>
            </div>
          )}
        </header>
      )}

      {ui.showSettings && <div className="fixed inset-0 z-[55]" onClick={() => ui.setShowSettings(false)} />}

      <main className={ui.gameState === 'LOBBY' ? 'pt-16' : ''}>
        {ui.gameState === 'LOBBY' && (
          <Lobby
            balance={user.balance}
            userRank={user.userRank}
            rankScore={user.rankScore}
            selectedBet={ui.selectedBet}
            onSelectBet={ui.setSelectedBet}
                        onStartDuel={() => {
              if (!user.selectedDeck) {
                toast.warning('需要牌组', '请先选择或创建一个牌组！');
                return;
              }
              if (user.balance < ui.selectedBet) {
                toast.error('法力不足', `需要 ${ui.selectedBet} 法力，当前只有 ${user.balance}`);
                return;
              }
              ui.setGameState('MATCHMAKING');
            }}
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
          />
        )}

        {ui.gameState === 'MODE_SELECT' && (
          <ModeSelect onSelectMode={handleSelectMode} onBackToLobby={() => ui.setGameState('LOBBY')} />
        )}

                {ui.gameState === 'MATCHMAKING' && (
                    <MatchmakingAnimation 
            onComplete={() => {
              const opp = ui.pendingTavernDuel || AI_PROFILES[Math.floor(Math.random() * (AI_PROFILES.length - 1)) + 1];
              const isDungeon = !!ui.dungeonRun;
              const deck = isDungeon ? ui.dungeonRun!.deck.cards : user.selectedDeck!.cards;
              const mode = isDungeon ? 'wild' as const : ui.gameMode;
              gameLoopActions.startTavernDuel(deck, opp, mode);
              ui.setPendingTavernDuel(null);
              ui.setGameState('MULLIGAN');
              audioActions.playBgm('battle');
            }}
            opponentName={ui.pendingTavernDuel?.name}
            opponentAvatar={ui.pendingTavernDuel?.avatar}
            isTavernMode={!!ui.pendingTavernDuel}
          />
        )}

        <React.Suspense fallback={<LoadingScreen progress={{ percentage: 100, isComplete: false, loaded: 1, total: 1, currentItem: '加载中...', errors: [] }} />}>
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
              onAddPacks={user.addPacks}
              onConsumePack={user.consumePack}
            />
          )}

          {ui.gameState === 'COLLECTION' && (
            <CollectionBook onBack={() => ui.setGameState('LOBBY')} />
          )}

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

          {ui.gameState === 'DUEL' && (
            gameLoopState.duelState ? (
              <>
                                <BattleArena
                gameLoopState={gameLoopState}
                selectedBet={ui.selectedBet}
                onPlayCard={(spellId: SpellType) => {
                  if (gameLoopActions.playCard(spellId)) {
                    audioActions.playSfx('cardPlay');
                    audioActions.playSpellSfx(spellId);
                    HapticService.medium();
                    tutorial.handleAction('PLAY_CARD');
                  }
                }}
                onPass={() => {
                  gameLoopActions.passTurn();
                  audioActions.playSfx('button');
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
                {/* [P0 Fix A-3] TurnTimer 和 TurnBanner 已移入 BattleArena 内部统一管理 */}
              </>
            ) : (
              <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                <p className="text-purple-300 font-tech animate-pulse">正在同步法术波长...</p>
              </div>
            )
          )}

          {ui.finalResult && (
            <ResultsModal
              result={ui.finalResult.result}
              playerSpell={ui.finalResult.player}
              opponentSpell={ui.finalResult.opponent}
              payout={ui.finalResult.payout}
              bet={ui.selectedBet}
              isCrit={ui.finalResult.isCrit}
              onClose={handleResetGame}
              isTavernMode={gameLoopState.duelState?.isTavernMode}
              rankUpdates={ui.finalResult.rankUpdates}
            />
          )}
                </React.Suspense>
      </main>

      {/* 全局Toast消息 */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.removeToast} />

      {/* 全局确认弹窗 */}
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

      {/* 新手引导覆盖层 */}
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

export default App;