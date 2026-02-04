import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Sparkles, Settings, CheckCircle } from 'lucide-react';

// Hooks
import { usePreloader } from './hooks/usePreloader';
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

// Services & Constants
import { ApiService } from './services/api';
import { calculatePayout, AI_PROFILES } from './services/gameLogic';
import { HapticService } from './services/haptic';
import { calculateRankUpdate } from './services/rankSystem';
import { DungeonService } from './services/dungeon_v2';
import { GAME_CONFIG } from './constants';

function App() {
  const { address, isConnected } = useAccount();
  const { quality, setQuality, isLowQuality } = useSettings();

  // ============ Zustand Stores ============
  const user = useUserStore();
  const ui = useUIStore();

  // ============ Hooks ============
  const { progress, startPreloading } = usePreloader();
  const [gameLoopState, gameLoopActions] = useGameLoop();
  const [audioState, audioActions] = useAudioManager();

  // ============ 初始化与同步 ============

  useEffect(() => {
    startPreloading();
  }, [startPreloading]);

  // 地址同步
  useEffect(() => {
    if (isConnected && address) {
      user.setActiveAddress(address);
    } else {
      let guestId = localStorage.getItem('wizard_guest_id');
      if (!guestId) {
        guestId = `Guest-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        localStorage.setItem('wizard_guest_id', guestId);
      }
      user.setActiveAddress(guestId);
    }
  }, [isConnected, address, user]);

  // 数据加载
  useEffect(() => {
    if (user.activeAddress) {
      user.loadUserData(user.activeAddress);
      user.loadLeaderboard();
    }
  }, [user.activeAddress, user]);

  // 游戏结束判定
  useEffect(() => {
    if (gameLoopState.isGameOver && gameLoopState.gameResult) {
      const finalRes = gameLoopState.gameResult === 'DRAW' ? 'LOSS' : gameLoopState.gameResult;
      handleGameEnd(finalRes as 'WIN' | 'LOSS');
    }
  }, [gameLoopState.isGameOver, gameLoopState.gameResult]); // handleGameEnd is a stable function, no need to add to deps

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
  }, [gameLoopState.effectMessages, audioActions, ui]);

  // ============ 逻辑处理器 ============

  const handleResourcesLoaded = () => {
    ui.setIsResourcesLoaded(true);
    audioActions.playBgm('lobby');
  };

  const handleSelectMode = (mode: any) => {
    if (mode === 'dungeon') {
      if (!user.selectedDeck) {
        alert('地牢模式需要先在牌组编辑器中选择一个起始牌组！');
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
  };

  const handleGameEnd = async (result: 'WIN' | 'LOSS') => {
    const lastPlayerSpell = gameLoopState.playerCard || 'fire';
    const lastOpponentSpell = gameLoopState.opponentCard || 'fire';
    
    const { payout, isCrit } = calculatePayout(ui.selectedBet, result);

    if (result === 'WIN') {
      audioActions.playSfx('victory');
      HapticService.success();
    } else {
      audioActions.playSfx('defeat');
      HapticService.failure();
    }

    const newStreak = result === 'WIN' ? user.winStreak + 1 : 0;
    user.setWinStreak(newStreak);

    const { newScore, newRank, scoreDelta } = calculateRankUpdate(user.rankScore, result, newStreak);
    user.setRankScore(newScore);
    user.setUserRank(newRank);

    try {
      if (user.activeAddress) {
        const { newBalance } = await ApiService.settleGame(
          user.activeAddress,
          ui.selectedBet,
          result,
          payout,
          lastPlayerSpell,
          lastOpponentSpell,
          isCrit
        );
        user.setBalance(newBalance);
        user.loadUserData(user.activeAddress);
      }

      ui.setFinalResult({
        result,
        player: lastPlayerSpell,
        opponent: lastOpponentSpell,
        payout,
        isCrit,
        rankUpdates: { scoreDelta, newScore, newRank }
      });
      ui.setGameState('RESULT');
    } catch (e) {
      console.error('Settlement failed:', e);
      handleResetGame();
    }
  };

  const handleResetGame = () => {
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
  };

  // ============ 渲染逻辑 ============

  if (!ui.isResourcesLoaded) {
    return <LoadingScreen progress={progress} onComplete={handleResourcesLoaded} />;
  }

  return (
    <div className={`h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-slate-950 text-white font-tech selection:bg-purple-500/30 touch-pan-y ${isLowQuality ? 'low-quality' : ''}`}>
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
            <div className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
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
              if (!user.selectedDeck) return alert('请先选择牌组！');
              if (user.balance < ui.selectedBet) return alert('法力不足！');
              ui.setGameState('MATCHMAKING');
            }}
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
          />
        )}

        {ui.gameState === 'MODE_SELECT' && (
          <ModeSelect onSelectMode={handleSelectMode} onBackToLobby={() => ui.setGameState('LOBBY')} tags={[]} />
        )}

        {ui.gameState === 'MATCHMAKING' && (
          <MatchmakingAnimation 
            onComplete={() => {
              const opp = ui.pendingTavernDuel || AI_PROFILES[Math.floor(Math.random() * (AI_PROFILES.length - 1)) + 1];
              gameLoopActions.startTavernDuel(user.selectedDeck!.cards, opp, ui.gameMode);
              ui.setPendingTavernDuel(null);
              ui.setGameState('DUEL');
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
                if (!user.selectedDeck) return alert('请先选择牌组！');
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
              onSelectNode={(node) => {
                if (['BATTLE', 'ELITE', 'BOSS'].includes(node.type)) {
                  const diff = node.type === 'BOSS' ? 'hard' : node.type === 'ELITE' ? 'medium' : 'easy';
                  const opp = AI_PROFILES.find(p => p.difficulty === diff) || AI_PROFILES[0];
                  gameLoopActions.startTavernDuel(ui.dungeonRun!.deck.cards, opp, 'wild');
                  ui.setGameState('DUEL');
                  audioActions.playBgm('battle');
                } else if (node.type === 'REST') {
                  const updated = DungeonService.updateHP(ui.dungeonRun!, Math.floor(ui.dungeonRun!.maxHP * 0.3));
                  ui.setDungeonRun(DungeonService.advanceNode(updated));
                  alert('休息恢复了 30% 生命值！');
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
              existingDecks={user.decks}
              selectedDeck={user.selectedDeck}
              gameMode={ui.gameMode}
            />
          )}

          {ui.gameState === 'DUEL' && (
            gameLoopState.duelState ? (
              <BattleArena
                gameLoopState={gameLoopState}
                selectedBet={ui.selectedBet}
                onPlayCard={(spellId) => {
                  if (gameLoopActions.playCard(spellId)) {
                    audioActions.playSfx('cardPlay');
                    audioActions.playSpellSfx(spellId);
                    HapticService.medium();
                  }
                }}
                onPass={() => {
                  gameLoopActions.passTurn();
                  audioActions.playSfx('button');
                }}
                onSurrender={() => {
                  gameLoopActions.reset();
                  ui.setGameState('LOBBY');
                  audioActions.playBgm('lobby');
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
    </div>
  );
}

export default App;