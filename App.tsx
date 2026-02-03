/**
 * Wizard Duel - 主应用组件
 * 
 * 重构后的架构：
 * - 使用 usePreloader 预加载资源
 * - 使用 useGameLoop 管理战斗状态机
 * - 使用 useAudioManager 管理音效
 * - 组件拆分为 LoadingScreen, Lobby, BattleArena, ResultsModal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, Sparkles } from 'lucide-react';

// Hooks
import { usePreloader } from './hooks/usePreloader';
import { useGameLoop } from './hooks/useGameLoop';
import { useAudioManager } from './hooks/useAudioManager';

// Components
import { LoadingScreen } from './components/LoadingScreen';
import { Lobby } from './components/Lobby';
import { BattleArena } from './components/BattleArena';
import { ResultsModal } from './components/ResultsModal';

// Services & Types
import { ApiService } from './services/api';
import { calculatePayout } from './services/gameLogic';
import { GameState, BattleRecord, PlayerStats, SpellType } from './types';

function App() {
  // ============ Web3 状态 ============
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  // ============ 应用状态 ============
  const [isResourcesLoaded, setIsResourcesLoaded] = useState(false);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [selectedBet, setSelectedBet] = useState<number>(10);
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [history, setHistory] = useState<BattleRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 动画状态
  const [isPlayerShaking, setIsPlayerShaking] = useState(false);
  const [isOpponentShaking, setIsOpponentShaking] = useState(false);

  // 最终结果
  const [finalResult, setFinalResult] = useState<{
    result: 'WIN' | 'LOSS' | 'DRAW';
    player: SpellType;
    opponent: SpellType;
    payout: number;
    isCrit: boolean;
  } | null>(null);

  // ============ 自定义 Hooks ============
  const { progress, startPreloading } = usePreloader();
  const [gameLoopState, gameLoopActions] = useGameLoop();
  const [audioState, audioActions] = useAudioManager();

  // ============ 初始化 ============

  // 启动预加载
  useEffect(() => {
    startPreloading();
  }, [startPreloading]);

  // 处理身份识别
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

  // 加载用户数据
  useEffect(() => {
    if (activeAddress) {
      loadUserData(activeAddress);
    }
  }, [activeAddress]);

  // 加载排行榜
  useEffect(() => {
    loadLeaderboard();
  }, []);

  // 监听游戏循环状态变化 - 处理游戏结束
  useEffect(() => {
    if (gameLoopState.isGameOver && gameLoopState.gameResult) {
      handleGameEnd(gameLoopState.gameResult);
    }
  }, [gameLoopState.isGameOver, gameLoopState.gameResult]);

  // 监听回合结果 - 播放音效和震动
  useEffect(() => {
    if (gameLoopState.roundResult && gameLoopState.phase === 'DAMAGE_PHASE') {
      const { outcome } = gameLoopState.roundResult;
      
      if (outcome === 'WIN') {
        audioActions.playSfx('hit');
        setIsOpponentShaking(true);
        setTimeout(() => setIsOpponentShaking(false), 500);
      } else if (outcome === 'LOSS') {
        audioActions.playSfx('hit');
        setIsPlayerShaking(true);
        setTimeout(() => setIsPlayerShaking(false), 500);
      } else {
        audioActions.playSfx('block');
      }
    }
  }, [gameLoopState.roundResult, gameLoopState.phase]);

  // ============ 数据加载 ============

  const loadUserData = async (addr: string) => {
    setIsLoading(true);
    try {
      const profile = await ApiService.getBalance(addr);
      setBalance(profile.balance);
      const hist = await ApiService.getHistory(addr);
      setHistory(hist);
    } catch (e) {
      console.error('Failed to load user data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const lb = await ApiService.getLeaderboard();
      setLeaderboard(lb);
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    }
  };

  // ============ 游戏逻辑 ============

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) connect({ connector });
  };

  const handleResourcesLoaded = () => {
    setIsResourcesLoaded(true);
    // 播放大厅 BGM
    audioActions.playBgm('lobby');
  };

  const handleStartDuel = useCallback(() => {
    if (balance < selectedBet) {
      alert('法力点数不足！');
      return;
    }

    gameLoopActions.startDuel();
    setGameState('DUEL');
    
    // 切换到战斗 BGM
    audioActions.playBgm('battle');
  }, [balance, selectedBet, gameLoopActions, audioActions]);

  const handlePlayCard = useCallback((spellId: SpellType) => {
    const success = gameLoopActions.playCard(spellId);
    if (success) {
      audioActions.playSfx('cardPlay');
      audioActions.playSpellSfx(spellId);
    }
  }, [gameLoopActions, audioActions]);

  const handleSurrender = useCallback(() => {
    gameLoopActions.reset();
    setGameState('LOBBY');
    audioActions.playBgm('lobby');
  }, [gameLoopActions, audioActions]);

  const handleGameEnd = async (result: 'WIN' | 'LOSS') => {
    const lastPlayerSpell = gameLoopState.playerCard || 'fire';
    const lastOpponentSpell = gameLoopState.opponentCard || 'fire';
    
    const { payout, isCrit } = calculatePayout(selectedBet, result);

    // 播放结束音效
    if (result === 'WIN') {
      audioActions.playSfx('victory');
    } else {
      audioActions.playSfx('defeat');
    }

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
        loadLeaderboard();
      }

      setFinalResult({
        result,
        player: lastPlayerSpell,
        opponent: lastOpponentSpell,
        payout,
        isCrit,
      });
      setGameState('RESULT');
    } catch (e) {
      console.error('Settlement failed:', e);
      handleResetGame();
    }
  };

  const handleResetGame = useCallback(() => {
    setFinalResult(null);
    gameLoopActions.reset();
    setGameState('LOBBY');
    audioActions.playBgm('lobby');
  }, [gameLoopActions, audioActions]);

  // ============ 渲染 ============

  // 显示加载画面
  if (!isResourcesLoaded) {
    return (
      <LoadingScreen 
        progress={progress} 
        onComplete={handleResourcesLoaded}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-tech selection:bg-purple-500/30">
      {/* 顶部导航（仅大厅显示） */}
      {gameState === 'LOBBY' && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles size={20} className="text-white" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isConnected && (
              <button
                onClick={handleConnect}
                className="hidden md:flex items-center gap-2 text-xs font-bold text-purple-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
              >
                <Wallet size={14} />
                <span>连接钱包</span>
              </button>
            )}

            <div className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-purple-400 text-xs uppercase font-bold">法力</span>
              <span className="font-mono font-bold text-white">{isLoading ? '...' : balance}</span>
            </div>
          </div>
        </header>
      )}

      {/* 主内容 */}
      <main className={gameState === 'LOBBY' ? 'pt-16' : ''}>
        {gameState === 'LOBBY' && (
          <Lobby
            balance={balance}
            selectedBet={selectedBet}
            onSelectBet={setSelectedBet}
            onStartDuel={handleStartDuel}
            history={history}
            isMuted={audioState.isMuted}
            onToggleMute={audioActions.toggleMute}
            isLoading={isLoading}
          />
        )}

        {gameState === 'DUEL' && gameLoopState.duelState && (
          <BattleArena
            duelState={gameLoopState.duelState}
            phase={gameLoopState.phase}
            playerCard={gameLoopState.playerCard}
            opponentCard={gameLoopState.opponentCard}
            roundResult={gameLoopState.roundResult}
            resultText={gameLoopState.resultText}
            effectMessages={gameLoopState.effectMessages}
            selectedBet={selectedBet}
            onPlayCard={handlePlayCard}
            onSurrender={handleSurrender}
            isMuted={audioState.isMuted}
            onToggleMute={audioActions.toggleMute}
            isPlayerShaking={isPlayerShaking}
            isOpponentShaking={isOpponentShaking}
          />
        )}
      </main>

      {/* 结果弹窗 */}
      {finalResult && (
        <ResultsModal
          result={finalResult.result}
          playerSpell={finalResult.player}
          opponentSpell={finalResult.opponent}
          payout={finalResult.payout}
          bet={selectedBet}
          isCrit={finalResult.isCrit}
          onClose={handleResetGame}
        />
      )}
    </div>
  );
}

export default App;