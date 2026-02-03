import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, Trophy, History, Zap, Sparkles, UserCircle2, Heart, Skull, LogOut } from 'lucide-react';
import { SPELLS, BET_OPTIONS, MAX_HP } from './constants';
import { SpellType, GameState, BattleRecord, PlayerStats, DuelPhase } from './types';
import { ApiService } from './services/api';
import { determineWinner, calculatePayout, getRandomSpell, getSpellById } from './services/gameLogic';
import { SpellCard } from './components/SpellCard';
import { ResultsModal } from './components/ResultsModal';

// PLACEHOLDER BACKGROUND - Replace this string with: "url('/battle-bg.jpg')" after saving your image
const BATTLE_BG_URL = "url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544&auto=format&fit=crop')";

function App() {
  // Web3 State
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  // Identity
  const [activeAddress, setActiveAddress] = useState<string | null>(null);

  // Global App State
  const [balance, setBalance] = useState<number>(0);
  const [selectedBet, setSelectedBet] = useState<number>(10);
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [history, setHistory] = useState<BattleRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- Duel State ---
  const [playerHP, setPlayerHP] = useState(MAX_HP);
  const [opponentHP, setOpponentHP] = useState(MAX_HP);
  const [duelPhase, setDuelPhase] = useState<DuelPhase>('PLAYER_TURN');
  const [playerCard, setPlayerCard] = useState<SpellType | null>(null);
  const [opponentCard, setOpponentCard] = useState<SpellType | null>(null);
  const [roundResultText, setRoundResultText] = useState<string>("");
  
  // Final Result
  const [finalResult, setFinalResult] = useState<{
    result: 'WIN' | 'LOSS' | 'DRAW';
    player: SpellType;
    opponent: SpellType;
    payout: number;
    isCrit: boolean;
  } | null>(null);

  // --- Initialization ---

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

  useEffect(() => {
    if (activeAddress) {
      loadUserData(activeAddress);
    }
  }, [activeAddress]);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadUserData = async (addr: string) => {
    setIsLoading(true);
    try {
      const profile = await ApiService.getBalance(addr);
      setBalance(profile.balance);
      const hist = await ApiService.getHistory(addr);
      setHistory(hist);
    } catch (e) {
      console.error("Failed to load user data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    const lb = await ApiService.getLeaderboard();
    setLeaderboard(lb);
  };

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) connect({ connector });
  };

  // --- Game Logic ---

  const startDuel = () => {
    if (balance < selectedBet) {
      alert("Insufficient mana (points)!");
      return;
    }
    setPlayerHP(MAX_HP);
    setOpponentHP(MAX_HP);
    setPlayerCard(null);
    setOpponentCard(null);
    setRoundResultText("");
    setFinalResult(null);
    setDuelPhase('PLAYER_TURN');
    setGameState('DUEL');
  };

  const playCard = async (spellId: SpellType) => {
    if (duelPhase !== 'PLAYER_TURN') return;

    setPlayerCard(spellId);
    setDuelPhase('OPPONENT_THINKING');

    // Simulate opponent thinking
    setTimeout(() => {
      const botSpell = getRandomSpell(spellId);
      setOpponentCard(botSpell);
      setDuelPhase('REVEAL');
      resolveRound(spellId, botSpell);
    }, 1000);
  };

  const resolveRound = async (pSpell: SpellType, oSpell: SpellType) => {
    // Wait for reveal animation
    await new Promise(r => setTimeout(r, 1000));
    
    setDuelPhase('DAMAGE_PHASE');
    const outcome = determineWinner(pSpell, oSpell);
    
    // Apply Damage
    // Calculate new HP locally to avoid reading stale React state in async callbacks
    let newPlayerHP = playerHP;
    let newOpponentHP = opponentHP;

    if (outcome === 'WIN') {
      newOpponentHP = Math.max(0, newOpponentHP - 1);
      setRoundResultText("Victory!");
    } else if (outcome === 'LOSS') {
      newPlayerHP = Math.max(0, newPlayerHP - 1);
      setRoundResultText("Defeat!");
    } else {
      setRoundResultText("Draw!");
    }

    // Update state now
    setPlayerHP(newPlayerHP);
    setOpponentHP(newOpponentHP);

    // Wait for damage animation then check win condition
    setTimeout(() => {
        checkDuelEnd(
            newOpponentHP,
            newPlayerHP,
            pSpell,
            oSpell
        );
    }, 1500);
  };

  const checkDuelEnd = async (
      currentOppHP: number, 
      currentPlayerHP: number,
      lastPlayerSpell: SpellType,
      lastOpponentSpell: SpellType
  ) => {
    if (currentOppHP <= 0 || currentPlayerHP <= 0) {
        // Duel Over
        const isWin = currentOppHP <= 0;
        const result = isWin ? 'WIN' : 'LOSS';
        
        const { payout, isCrit } = calculatePayout(selectedBet, result);

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
                isCrit
            });
            setGameState('RESULT');
        } catch (e) {
            console.error("Settlement failed", e);
            setGameState('LOBBY');
        }

    } else {
        // Next Round
        setDuelPhase('ROUND_RESET');
        setTimeout(() => {
            setPlayerCard(null);
            setOpponentCard(null);
            setRoundResultText("");
            setDuelPhase('PLAYER_TURN');
        }, 1000);
    }
  };

  const resetGame = () => {
    setFinalResult(null);
    setGameState('LOBBY');
  };

  // --- Renders ---

  const renderHealth = (current: number, max: number) => {
    return (
      <div className="flex gap-1 mt-1 bg-black/50 px-2 py-1 rounded-full border border-white/10 backdrop-blur-sm">
        {Array.from({ length: max }).map((_, i) => (
          <Heart 
            key={i}
            size={18} 
            className={`
                ${i < current ? 'text-red-500 fill-red-500' : 'text-gray-800 fill-gray-900'} 
                transition-all duration-300 drop-shadow-md
            `} 
          />
        ))}
      </div>
    );
  };

  const renderArena = () => {
    const oppSpellDetails = opponentCard ? getSpellById(opponentCard) : null;
    const playerSpellDetails = playerCard ? getSpellById(playerCard) : null;

    return (
        <div className="absolute inset-0 bg-slate-950 overflow-hidden">
            {/* Background Image Layer */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 transform hover:scale-105"
                style={{ 
                    backgroundImage: BATTLE_BG_URL,
                }}
            >
                {/* Dark Overlay to make UI pop */}
                <div className="absolute inset-0 bg-slate-950/40 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90"></div>
            </div>
            
            {/* Header in Arena Mode (Small) */}
            <div className="absolute top-0 right-0 p-4 z-50">
                 <button 
                    onClick={resetGame}
                    className="flex items-center gap-2 px-3 py-1 bg-black/40 hover:bg-black/60 border border-white/20 rounded-full text-xs text-gray-300 hover:text-white transition-colors backdrop-blur-md"
                >
                    <LogOut size={12} />
                    <span>Surrender</span>
                </button>
            </div>

            {/* --- TOP LEFT: OPPONENT AVATAR --- */}
            <div className="absolute top-6 left-6 z-10 flex flex-col items-start gap-2">
                <div className="flex items-center gap-3 bg-black/40 p-2 rounded-full pr-6 border border-white/10 backdrop-blur-md">
                    <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] relative overflow-hidden">
                         {/* Optional: Add an image here for opponent later */}
                        <Skull className="text-red-500 z-10" size={28} />
                         <div className="absolute inset-0 bg-gradient-to-t from-red-900/50 to-transparent"></div>
                    </div>
                    <div>
                        <div className="text-red-400 font-wizard text-lg tracking-wider drop-shadow-md">Dark Sorcerer</div>
                        {renderHealth(opponentHP, MAX_HP)}
                    </div>
                </div>
            </div>

            {/* --- TOP RIGHT: OPPONENT HAND --- */}
            <div className="absolute top-20 right-6 z-10 mt-8 sm:mt-0 opacity-90 scale-75 origin-top-right sm:scale-100">
                <div className="flex -space-x-4">
                    {[1, 2, 3, 4, 5].map((_, i) => (
                        <div 
                            key={i} 
                            className="transform transition-transform hover:-translate-y-2 duration-300"
                        >
                            <SpellCard isFaceDown isSmall />
                        </div>
                    ))}
                </div>
            </div>

            {/* --- BOTTOM LEFT: PLAYER AVATAR --- */}
            <div className="absolute bottom-6 left-6 z-10 flex flex-col items-start gap-2">
                <div className="flex items-center gap-3 bg-black/40 p-2 rounded-full pr-6 border border-white/10 backdrop-blur-md">
                     <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] relative overflow-hidden">
                        <UserCircle2 className="text-purple-400 z-10" size={36} />
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent"></div>
                    </div>
                    <div>
                        <div className="text-purple-300 font-wizard text-xl tracking-wider drop-shadow-md">You</div>
                        {renderHealth(playerHP, MAX_HP)}
                    </div>
                </div>
            </div>

            {/* --- RIGHT CENTER: MANA POOL --- */}
            <div className="absolute top-1/2 right-0 translate-x-2 -translate-y-1/2 z-10 text-right bg-black/50 py-3 pl-6 pr-4 rounded-l-xl border-y border-l border-purple-500/30 backdrop-blur-md shadow-xl">
                <div className="text-[10px] text-gray-400 font-tech mb-1 uppercase tracking-widest">Mana Pool</div>
                <div className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                    {balance}
                </div>
                <div className="text-purple-400 text-xs font-bold">PTS</div>
            </div>

            {/* --- CENTER: BATTLEFIELD --- */}
            {/* Added perspective to match the tabletop feel of the background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ perspective: '1000px' }}>
                <div className="relative flex items-center gap-8 md:gap-16 z-20 transform rotate-x-10"> 
                     {/* Opponent Active Card */}
                    <div className={`
                        transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) transform
                        ${opponentCard ? 'translate-y-0 opacity-100 scale-100 rotate-x-0' : '-translate-y-32 opacity-0 scale-50 rotate-x-12'}
                    `}>
                        {duelPhase === 'REVEAL' || duelPhase === 'DAMAGE_PHASE' || duelPhase === 'ROUND_RESET' || gameState === 'RESULT' ? (
                            oppSpellDetails && <SpellCard spell={oppSpellDetails} disabled />
                        ) : (
                             <div className="relative">
                                {opponentCard && (
                                    <div className="absolute inset-0 bg-red-500/20 blur-xl animate-pulse"></div>
                                )}
                                {opponentCard && <SpellCard isFaceDown />}
                             </div>
                        )}
                    </div>

                    {/* VS Text */}
                    {(playerCard && opponentCard) && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                            <span className="font-wizard text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-700 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-ping filter brightness-125">
                                VS
                            </span>
                        </div>
                    )}
                    
                    {/* Result Text - Floats above */}
                    {roundResultText && (
                         <div className="absolute top-[-140px] left-1/2 -translate-x-1/2 w-max text-center z-50">
                             <h2 className={`
                                text-6xl font-wizard font-bold text-white drop-shadow-[0_4px_0_#000] 
                                animate-bounce tracking-widest uppercase
                                ${roundResultText === 'Victory!' ? 'text-yellow-400' : roundResultText === 'Defeat!' ? 'text-red-500' : 'text-gray-300'}
                             `}>
                                 {roundResultText}
                             </h2>
                        </div>
                    )}

                    {/* Player Active Card */}
                    <div className={`
                        transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform
                        ${playerCard ? 'translate-y-0 opacity-100 scale-110 rotate-x-0' : 'translate-y-32 opacity-0 scale-50 rotate-x-12'}
                    `}>
                        {playerSpellDetails && (
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/30 blur-2xl animate-pulse"></div>
                                <SpellCard spell={playerSpellDetails} isSelected={true} disabled />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- BOTTOM CENTER: PLAYER HAND --- */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4">
                 {duelPhase === 'PLAYER_TURN' ? (
                     <div className="flex items-end justify-center perspective-500">
                        {SPELLS.map((spell, index) => {
                             // Arc layout logic
                             const rotation = (index - 2) * 5;
                             const yOffset = Math.abs(index - 2) * 10;
                             
                             return (
                                <div 
                                    key={spell.id} 
                                    className="relative -mx-3 transition-all duration-300 hover:z-30 group"
                                    style={{ 
                                        zIndex: index, 
                                        transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                                    }}
                                >
                                    <div className="transform transition-transform duration-200 group-hover:-translate-y-16 group-hover:scale-125 group-hover:rotate-0 cursor-pointer shadow-2xl">
                                        <SpellCard 
                                            spell={spell} 
                                            onClick={() => playCard(spell.id)}
                                        />
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                 ) : (
                     <div className="flex justify-center pb-8">
                         <div className="px-8 py-3 bg-black/60 backdrop-blur-md border border-purple-500/30 rounded-full shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                            <p className="text-purple-200 font-wizard tracking-[0.2em] text-sm animate-pulse uppercase flex items-center gap-3">
                                <Sparkles size={14} />
                                {gameState === 'RESULT' ? 'Duel Ended' :
                                duelPhase === 'OPPONENT_THINKING' ? 'Opponent is channeling...' : 
                                duelPhase === 'REVEAL' ? 'Revealing Arcana...' : 
                                'Resolving Magic...'}
                                <Sparkles size={14} />
                            </p>
                         </div>
                     </div>
                 )}
            </div>

            {/* Fallback Game Over Button */}
            {gameState === 'RESULT' && !finalResult && (
                 <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                     <button onClick={resetGame} className="px-8 py-4 bg-purple-600 rounded-xl font-bold text-white shadow-lg shadow-purple-900/50 hover:scale-105 transition-transform">
                        Return to Lobby
                     </button>
                 </div>
            )}
        </div>
    );
  };

  const renderLobby = () => (
      <div className="max-w-md mx-auto p-4 space-y-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
        {/* Hero Section */}
        <div className="text-center space-y-2 mb-10">
            <h1 className="text-5xl font-wizard font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.5)]">
              WIZARD DUEL
            </h1>
            <p className="text-gray-400 text-sm font-tech tracking-wider uppercase opacity-80">Web3 Elemental Strategy</p>
        </div>

        {/* Betting Section */}
        <section className="bg-slate-900/60 p-6 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={100} />
          </div>
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-2 text-gray-200 text-sm uppercase tracking-wide font-bold">
              <Zap size={16} className="text-yellow-400" />
              <span>Wager Amount</span>
            </div>
            {!isConnected && (
              <span className="text-[10px] text-gray-500 font-mono uppercase border border-white/10 px-2 py-0.5 rounded bg-black/20">Guest</span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4 relative z-10">
            {BET_OPTIONS.map((amt) => (
              <button
                key={amt}
                onClick={() => setSelectedBet(amt)}
                className={`py-4 rounded-xl font-bold border transition-all relative overflow-hidden group
                  ${selectedBet === amt 
                    ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-105' 
                    : 'bg-black/40 border-white/5 text-gray-500 hover:bg-white/5 hover:border-white/20'}
                `}
              >
                <span className="relative z-10 text-lg">{amt}</span>
              </button>
            ))}
          </div>
          
          <div className="mt-6 flex justify-between items-center text-xs text-gray-500 font-mono border-t border-white/5 pt-4">
              <span>Potential Reward</span>
              <span className="text-green-400 text-base font-bold">+{Math.floor(selectedBet * 0.92)} PTS</span>
          </div>
        </section>

        {/* Start Button */}
        <button
          onClick={startDuel}
          className={`
            w-full py-6 rounded-2xl font-wizard font-black text-2xl tracking-[0.2em] uppercase transition-all
            flex items-center justify-center gap-3 relative overflow-hidden group shadow-[0_0_40px_rgba(168,85,247,0.3)]
            bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 text-white
            hover:scale-[1.02] active:scale-[0.98] border border-purple-500/50
          `}
        >
            <span className="relative z-10 drop-shadow-md">Battle</span>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        </button>

        {/* Quick History */}
        <div className="pt-8 border-t border-white/5">
            <h3 className="flex items-center gap-2 text-gray-400 mb-4 text-xs font-bold uppercase tracking-wider">
              <History size={14} /> Battle Log
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {history.length === 0 ? (
                  <div className="text-center py-4 text-gray-600 text-xs italic">No duels recorded yet.</div>
              ) : (
                history.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5 text-xs hover:bg-white/5 transition-colors">
                    <div className="flex gap-3 items-center">
                            <div className={`w-1.5 h-1.5 rounded-full ${record.result === 'WIN' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500'}`}></div>
                            <span className={record.result === 'WIN' ? 'text-gray-200' : 'text-gray-500'}>{record.result}</span>
                    </div>
                    <span className={`font-mono ${record.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {record.amount > 0 ? '+' : ''}{record.amount}
                    </span>
                    </div>
                ))
              )}
            </div>
        </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-0 font-tech selection:bg-purple-500/30 overflow-hidden flex flex-col">
      {/* Lobby Background */}
      {gameState === 'LOBBY' && (
           <div className="absolute inset-0 z-0">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#4c1d95_0%,_#0f0518_60%)] opacity-40"></div>
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
           </div>
      )}

      {/* Header */}
      {gameState === 'LOBBY' && (
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={resetGame}>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/50 group-hover:scale-110 transition-transform">
                    <Sparkles size={18} className="text-white" />
                </div>
            </div>
            
            <div className="flex items-center gap-3">
            {!isConnected && (
                <button 
                onClick={handleConnect}
                className="hidden sm:flex items-center gap-2 text-xs font-bold text-purple-300 hover:text-white transition-colors mr-2 px-3 py-1.5 rounded-full hover:bg-white/5"
                >
                <Wallet size={14} />
                <span className="uppercase tracking-wide">Sync Wallet</span>
                </button>
            )}

            <div className="bg-black/40 border border-purple-500/30 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-inner">
                <span className="text-purple-400 text-[10px] uppercase font-bold tracking-wider">Mana</span>
                <span className="font-mono font-bold text-white text-sm">{isLoading ? '...' : balance}</span>
            </div>
            
            <button 
                onClick={() => isConnected ? disconnect() : null} 
                className={`p-1 rounded-full transition-all border ${isConnected ? 'border-purple-500/50 hover:bg-white/10' : 'border-white/10 cursor-default'}`}
            >
                {isConnected ? (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_10px_rgba(34,211,238,0.3)] border-2 border-slate-950"></div>
                ) : (
                    <UserCircle2 size={28} className="text-gray-600" />
                )}
            </button>
            </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative w-full h-full">
        {gameState === 'LOBBY' ? renderLobby() : renderArena()}
      </main>

      {finalResult && (
        <ResultsModal 
            result={finalResult.result}
            playerSpell={finalResult.player}
            opponentSpell={finalResult.opponent}
            payout={finalResult.payout}
            bet={selectedBet}
            isCrit={finalResult.isCrit}
            onClose={resetGame}
        />
      )}
    </div>
  );
}

export default App;