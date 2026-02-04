import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Sparkles } from 'lucide-react';

// Hooks
import { usePreloader } from './hooks/usePreloader';
import { useGameLoop } from './hooks/useGameLoop';
import { useAudioManager } from './hooks/useAudioManager';

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

// Services & Types
import { ApiService } from './services/api';
import { calculatePayout, AI_PROFILES } from './services/gameLogic';
import { HapticService } from './services/haptic';
import { calculateRankUpdate } from './services/rankSystem';
import { GameState, BattleRecord, PlayerStats, SpellType, Deck, GameMode, Rank, Language } from './types';
import { DungeonRunState, DungeonNode } from './types/dungeon';
import { DungeonService } from './services/dungeon_v2';

function App() {
  const { address, isConnected } = useAccount();

  // ============ 应用状态 ============
  const [isResourcesLoaded, setIsResourcesLoaded] = useState(false);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [userRank, setUserRank] = useState<Rank>('Iron');
  const [rankScore, setRankScore] = useState<number>(0);
  const [winStreak, setWinStreak] = useState<number>(0);
  
  const [selectedBet, setSelectedBet] = useState<number>(10);
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [history, setHistory] = useState<BattleRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');

  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [dungeonRun, setDungeonRun] = useState<DungeonRunState | null>(null);
  const [pendingTavernDuel, setPendingTavernDuel] = useState<any>(null);

  const [isPlayerShaking, setIsPlayerShaking] = useState(false);
  const [isOpponentShaking, setIsOpponentShaking] = useState(false);

  const [finalResult, setFinalResult] = useState<{
    result: 'WIN' | 'LOSS' | 'DRAW';
    player: SpellType;
    opponent: SpellType;
    payout: number;
    isCrit: boolean;
    rankUpdates?: {
      newScore: number;
      newRank: Rank;
      scoreDelta: number;
    };
  } | null>(null);

  // ============ 自定义 Hooks ============
  const { progress, startPreloading } = usePreloader();
  const [gameLoopState, gameLoopActions] = useGameLoop();
  const [audioState, audioActions] = useAudioManager();

  // ============ 初始化 ============

  useEffect(() => {
    startPreloading();
  }, [startPreloading]);

  useEffect(() => {
    if (isConnected && address) {
      setActiveAddress(address);
    } else {
      let guestId = localStorage.getItem('wizard_guest_id');
      if (!guestId) {
        guestId = `Guest-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        localStorage.setItem('wizard_guest_id', guestId);
      }
      setActiveAddress(guestId);
    }
  }, [isConnected, address]);

  const loadUserData = useCallback(async (addr: string) => {
    setIsLoading(true);
    try {
      const profile = await ApiService.getProfile(addr);
      setBalance(profile.balance);
      if (profile.userRank) setUserRank(profile.userRank);
      if (profile.rankScore) setRankScore(profile.rankScore);
      if (profile.stats?.winStreak) setWinStreak(profile.stats.winStreak);

      const userDecks = await ApiService.getDecks(addr);
      setDecks(userDecks);
      if (userDecks.length > 0 && !selectedDeck) {
        setSelectedDeck(userDecks[0]);
      }

      const hist = await ApiService.getHistory(addr);
      setHistory(hist);
    } catch (e) {
      console.error('Failed to load user data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeAddress) {
      loadUserData(activeAddress);
    }
  }, [activeAddress, loadUserData]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const lb = await ApiService.getLeaderboard();
        setLeaderboard(lb);
      } catch (e) {
        console.error('Failed to load leaderboard:', e);
      }
    };
    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (gameLoopState.isGameOver && gameLoopState.gameResult) {
      handleGameEnd(gameLoopState.gameResult);
    }
  }, [gameLoopState.isGameOver, gameLoopState.gameResult]);

  useEffect(() => {
     if (gameLoopState.effectMessages.length > 0) {
        const lastMsg = gameLoopState.effectMessages[gameLoopState.effectMessages.length - 1];
        if (lastMsg.includes('受到')) {
            setIsPlayerShaking(true);
            audioActions.playSfx('hit');
            setTimeout(() => setIsPlayerShaking(false), 500);
        } else if (lastMsg.includes('造成')) {
            setIsOpponentShaking(true);
            audioActions.playSfx('hit');
            setTimeout(() => setIsOpponentShaking(false), 500);
        }
     }
  }, [gameLoopState.effectMessages, audioActions]);

  // ============ 游戏逻辑 ============

  const handleResourcesLoaded = () => {
    setIsResourcesLoaded(true);
    audioActions.playBgm('lobby');
  };

  const handleOpenModeSelect = useCallback(() => {
    setGameState('MODE_SELECT');
  }, []);

  const handleSelectMode = useCallback((mode: GameMode | 'dungeon') => {
    if (mode === 'dungeon') {
      if (!selectedDeck) {
        alert('地牢模式需要先在牌组编辑器中选择一个起始牌组！');
        setGameState('LOBBY');
        return;
      }
      const newRun = DungeonService.startNewRun(selectedDeck);
      setDungeonRun(newRun);
      setGameState('DUNGEON_MAP');
      audioActions.playBgm('lobby');
    } else {
      setGameMode(mode);
      setGameState('LOBBY');
    }
  }, [selectedDeck, audioActions]);

  const handleStartDuel = useCallback(() => {
    if (!selectedDeck) {
      alert('请先选择或创建牌组！');
      return;
    }
    if (balance < selectedBet) {
      alert('法力点数不足！');
      return;
    }
    setGameState('MATCHMAKING');
  }, [selectedDeck, balance, selectedBet]);

  const handlePlayCard = useCallback((spellId: SpellType) => {
    const success = gameLoopActions.playCard(spellId);
    if (success) {
      audioActions.playSfx('cardPlay');
      audioActions.playSpellSfx(spellId);
      HapticService.medium();
    }
  }, [gameLoopActions, audioActions]);

  const handleSurrender = useCallback(() => {
    gameLoopActions.reset();
    setGameState('LOBBY');
    audioActions.playBgm('lobby');
  }, [gameLoopActions, audioActions]);

  const handleOpenDeckBuilder = useCallback(() => {
    setGameState('DECK_BUILDER');
  }, []);

  const handleOpenTavernMode = useCallback(() => {
    setGameState('TAVERN');
  }, []);

  const handleStartTavernDuel = useCallback((aiProfile: any) => {
    if (!selectedDeck) {
      alert('请先选择或创建牌组！');
      return;
    }
    setGameState('MATCHMAKING');
    setPendingTavernDuel(aiProfile);
  }, [selectedDeck]);

  const handleBackToLobby = useCallback(() => {
    setGameState('LOBBY');
  }, []);

  const handleEnterDungeonNode = useCallback((node: DungeonNode) => {
    if (!dungeonRun) return;

    if (node.type === 'BATTLE' || node.type === 'ELITE' || node.type === 'BOSS') {
      const oppProfile = AI_PROFILES.find(p => p.difficulty === (node.type === 'BOSS' ? 'hard' : node.type === 'ELITE' ? 'medium' : 'easy')) || AI_PROFILES[0];
      gameLoopActions.startTavernDuel(dungeonRun.deck.cards, oppProfile, 'wild');
      setGameState('DUEL');
      audioActions.playBgm('battle');
    } else if (node.type === 'REST') {
       const updated = DungeonService.updateHP(dungeonRun, Math.floor(dungeonRun.maxHP * 0.3));
       setDungeonRun(updated);
       alert('你在营火旁休息，恢复了 30% 生命值！');
       setDungeonRun(DungeonService.advanceNode(updated));
    } else {
       setDungeonRun(DungeonService.advanceNode(dungeonRun));
    }
  }, [dungeonRun, gameLoopActions, audioActions]);

  const handleSelectDeck = useCallback((deck: Deck) => {
    setSelectedDeck(deck);
  }, []);

  const handleSaveDeck = useCallback(async (deck: Deck) => {
    if (activeAddress) {
       await ApiService.saveDeck(activeAddress, deck);
    }

    const existingIndex = decks.findIndex(d => d.id === deck.id);
    if (existingIndex >= 0) {
      const newDecks = [...decks];
      newDecks[existingIndex] = deck;
      setDecks(newDecks);
    } else {
      setDecks([...decks, deck]);
    }
    setSelectedDeck(deck);
    setGameState('LOBBY');
  }, [decks, activeAddress]);

  const handleMatchmakingComplete = useCallback(() => {
    if (pendingTavernDuel) {
      gameLoopActions.startTavernDuel(selectedDeck!.cards, pendingTavernDuel, gameMode);
      setPendingTavernDuel(null);
    } else {
      const mockOpponent = AI_PROFILES[Math.floor(Math.random() * (AI_PROFILES.length - 1)) + 1];
      gameLoopActions.startTavernDuel(selectedDeck!.cards, mockOpponent, gameMode);
    }
    setGameState('DUEL');
    audioActions.playBgm('battle');
  }, [pendingTavernDuel, selectedDeck, gameMode, gameLoopActions, audioActions]);

  const handleGameEnd = async (result: 'WIN' | 'LOSS') => {
    const lastPlayerSpell = gameLoopState.playerCard || 'fire';
    const lastOpponentSpell = gameLoopState.opponentCard || 'fire';
    
    const { payout, isCrit } = calculatePayout(selectedBet, result);

    if (result === 'WIN') {
      audioActions.playSfx('victory');
      HapticService.success();
    } else {
      audioActions.playSfx('defeat');
      HapticService.failure();
    }

    const newStreak = result === 'WIN' ? winStreak + 1 : 0;
    setWinStreak(newStreak);

    const { newScore, newRank, scoreDelta } = calculateRankUpdate(rankScore, result, newStreak);
    setRankScore(newScore);
    setUserRank(newRank);

    try {
      if (activeAddress) {
        const { newBalance } = await ApiService.settleGame(
          activeAddress,
          selectedBet,
          result,
          payout,
          lastPlayerSpell,
          lastOpponentSpell,
          isCrit
        );
        setBalance(newBalance);
        loadUserData(activeAddress);
        // 更新排行榜可以等一会儿或者通过新数据更新
      }

      setFinalResult({
        result,
        player: lastPlayerSpell,
        opponent: lastOpponentSpell,
        payout,
        isCrit,
        rankUpdates: {
          scoreDelta,
          newScore,
          newRank
        }
      });
      setGameState('RESULT');
    } catch (e) {
      console.error('Settlement failed:', e);
      handleResetGame();
    }
  };

  const handleResetGame = useCallback(() => {
    const wasDungeon = !!dungeonRun;
    const isWin = finalResult?.result === 'WIN';

    setFinalResult(null);
    gameLoopActions.reset();
    
    if (wasDungeon) {
      if (isWin) {
        setDungeonRun(prev => prev ? DungeonService.advanceNode(prev) : null);
        setGameState('DUNGEON_MAP');
      } else {
        setDungeonRun(null);
        setGameState('LOBBY');
      }
    } else {
      setGameState('LOBBY');
    }
    audioActions.playBgm('lobby');
  }, [gameLoopActions, audioActions, dungeonRun, finalResult]);

  // ============ 渲染 ============

  if (!isResourcesLoaded) {
    return <LoadingScreen progress={progress} onComplete={handleResourcesLoaded} />;
  }

  return (
    <div className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-slate-950 text-white font-tech selection:bg-purple-500/30 touch-pan-y">
      {gameState === 'LOBBY' && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center safe-area-top">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles size={20} className="text-white" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-purple-400 text-xs uppercase font-bold text-nowrap">法力</span>
              <span className="font-mono font-bold text-white">{isLoading ? '...' : balance}</span>
            </div>
          </div>
        </header>
      )}

      <main className={gameState === 'LOBBY' ? 'pt-16' : ''}>
        {gameState === 'LOBBY' && (
          <Lobby
            balance={balance}
            userRank={userRank}
            rankScore={rankScore}
            selectedBet={selectedBet}
            onSelectBet={setSelectedBet}
            onStartDuel={handleStartDuel}
            history={history}
            isMuted={audioState.isMuted}
            onToggleMute={audioActions.toggleMute}
            isLoading={isLoading}
            decks={decks}
            selectedDeck={selectedDeck}
            onOpenDeckBuilder={handleOpenDeckBuilder}
            onSelectDeck={handleSelectDeck}
            onOpenTavernMode={handleOpenTavernMode}
            gameMode={gameMode}
            onOpenModeSelect={handleOpenModeSelect}
            language={language}
            onLanguageChange={setLanguage}
          />
        )}

        {gameState === 'MODE_SELECT' && (
          <ModeSelect onSelectMode={handleSelectMode} onBackToLobby={handleBackToLobby} tags={[]} />
        )}

        {gameState === 'MATCHMAKING' && (
          <MatchmakingAnimation 
            onComplete={handleMatchmakingComplete}
            opponentName={pendingTavernDuel?.name}
            opponentAvatar={pendingTavernDuel?.avatar}
            isTavernMode={!!pendingTavernDuel}
          />
        )}

        <React.Suspense fallback={<LoadingScreen progress={{ percentage: 100, isComplete: false, loaded: 1, total: 1, currentItem: 'Loading Module...', errors: [] }} />}>
          {gameState === 'TAVERN' && (
            <TavernMode
              onStartTavernDuel={handleStartTavernDuel}
              onBackToLobby={handleBackToLobby}
              playerStats={{ tavernWins: 0, tavernLosses: 0, bestStreak: 0 }}
            />
          )}

          {gameState === 'DUNGEON_MAP' && dungeonRun && (
            <DungeonMap runState={dungeonRun} onSelectNode={handleEnterDungeonNode} />
          )}

          {gameState === 'DECK_BUILDER' && (
            <DeckBuilder
              onBack={() => setGameState('LOBBY')}
              onSaveDeck={handleSaveDeck}
              existingDecks={decks}
              selectedDeck={selectedDeck}
              gameMode={gameMode}
            />
          )}

          {gameState === 'DUEL' && (
            gameLoopState.duelState ? (
              <BattleArena
                duelState={gameLoopState.duelState}
                phase={gameLoopState.phase}
                playerCard={gameLoopState.playerCard}
                opponentCard={gameLoopState.opponentCard}
                resultText={gameLoopState.resultText}
                effectMessages={gameLoopState.effectMessages}
                selectedBet={selectedBet}
                onPlayCard={handlePlayCard}
                onPass={() => {
                  gameLoopActions.passTurn();
                  audioActions.playSfx('button');
                }}
                onSurrender={handleSurrender}
                isMuted={audioState.isMuted}
                onToggleMute={audioActions.toggleMute}
                isPlayerShaking={isPlayerShaking}
                isOpponentShaking={isOpponentShaking}
              />
            ) : (
              <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                <p className="text-purple-300 font-tech animate-pulse">正在同步法术波长...</p>
              </div>
            )
          )}

          {finalResult && (
            <ResultsModal
              result={finalResult.result}
              playerSpell={finalResult.player}
              opponentSpell={finalResult.opponent}
              payout={finalResult.payout}
              bet={selectedBet}
              isCrit={finalResult.isCrit}
              onClose={handleResetGame}
              isTavernMode={gameLoopState.duelState?.isTavernMode}
              rankUpdates={finalResult.rankUpdates}
            />
          )}
        </React.Suspense>
      </main>
    </div>
  );
}

export default App;