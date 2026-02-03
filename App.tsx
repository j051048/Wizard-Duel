import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { 
  Wallet, Trophy, History, Zap, Sparkles, UserCircle2, 
  Heart, Skull, LogOut, Flame, Shield, Brain
} from 'lucide-react';
import { SPELLS, BET_OPTIONS, GAME_CONFIG, getMechanicName } from './constants.ts';
import { 
  SpellType, GameState, BattleRecord, PlayerStats, DuelPhase, 
  DuelState, RoundResult, StatusEffect 
} from './types.ts';
import { ApiService } from './services/api.ts';
import { 
  determineWinner, calculatePayout, getSpellById, 
  createInitialDuelState, resolveRound, applyRoundResult,
  prepareNextTurn, getAISpell, canAffordSpell, getPlayableCards
} from './services/gameLogic.ts';
import { SpellCard } from './components/SpellCard.tsx';
import { ResultsModal } from './components/ResultsModal.tsx';

// Background image
const BATTLE_BG_URL = "url('/battle-bg.jpg')";

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

  // --- Duel State (重构后使用完整的 DuelState) ---
  const [duelState, setDuelState] = useState<DuelState | null>(null);
  const [duelPhase, setDuelPhase] = useState<DuelPhase>('PLAYER_TURN');
  const [playerCard, setPlayerCard] = useState<SpellType | null>(null);
  const [opponentCard, setOpponentCard] = useState<SpellType | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [roundResultText, setRoundResultText] = useState<string>("");
  const [effectMessages, setEffectMessages] = useState<string[]>([]);
  
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
      alert("法力点数不足！");
      return;
    }
    
    // 初始化完整的对战状态
    const initialState = createInitialDuelState();
    setDuelState(initialState);
    setPlayerCard(null);
    setOpponentCard(null);
    setRoundResult(null);
    setRoundResultText("");
    setEffectMessages([]);
    setFinalResult(null);
    setDuelPhase('PLAYER_TURN');
    setGameState('DUEL');
  };

  const playCard = async (spellId: SpellType) => {
    if (duelPhase !== 'PLAYER_TURN' || !duelState) return;

    // 检查是否能支付费用
    const affordCheck = canAffordSpell(spellId, duelState.playerMana, duelState.playerEffects);
    if (!affordCheck.canAfford) {
      setEffectMessages([affordCheck.reason || '无法使用此法术']);
      return;
    }

    setPlayerCard(spellId);
    setDuelPhase('OPPONENT_THINKING');

    // AI 思考并选择法术
    setTimeout(() => {
      const botSpell = getAISpell(duelState, spellId);
      setOpponentCard(botSpell);
      setDuelPhase('REVEAL');
      
      // 延迟后进入伤害结算
      setTimeout(() => {
        executeRound(spellId, botSpell);
      }, 1200);
    }, 1000);
  };

  const executeRound = async (pSpell: SpellType, oSpell: SpellType) => {
    if (!duelState) return;
    
    setDuelPhase('DAMAGE_PHASE');
    
    // 核心结算逻辑
    const result = resolveRound(duelState, pSpell, oSpell);
    setRoundResult(result);
    
    // 显示结果文本
    if (result.outcome === 'WIN') {
      setRoundResultText("击中!");
    } else if (result.outcome === 'LOSS') {
      setRoundResultText("受伤!");
    } else {
      setRoundResultText("抵消!");
    }
    
    // 显示触发的效果
    if (result.triggeredEffects.length > 0) {
      setEffectMessages(result.triggeredEffects);
    }
    
    // 应用结果到状态
    const newState = applyRoundResult(duelState, result, pSpell, oSpell);
    setDuelState(newState);
    
    // 效果展示阶段
    setTimeout(() => {
      setDuelPhase('EFFECTS_PHASE');
      
      // 检查游戏是否结束
      setTimeout(() => {
        checkDuelEnd(newState, pSpell, oSpell);
      }, 1500);
    }, 1000);
  };

  const checkDuelEnd = async (
    currentState: DuelState,
    lastPlayerSpell: SpellType,
    lastOpponentSpell: SpellType
  ) => {
    if (currentState.opponentHP <= 0 || currentState.playerHP <= 0) {
      // 对战结束
      const isWin = currentState.opponentHP <= 0;
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
      // 继续下一回合
      setDuelPhase('ROUND_RESET');
      
      setTimeout(() => {
        // 准备下一回合
        const nextState = prepareNextTurn(currentState);
        setDuelState(nextState);
        setPlayerCard(null);
        setOpponentCard(null);
        setRoundResult(null);
        setRoundResultText("");
        setEffectMessages([]);
        setDuelPhase('PLAYER_TURN');
      }, 1200);
    }
  };

  const resetGame = () => {
    setFinalResult(null);
    setDuelState(null);
    setGameState('LOBBY');
  };

  // --- Renders ---

  const renderHealth = (current: number, max: number, isPlayer: boolean = true) => {
    return (
      <div className="flex gap-1 mt-1 bg-black/50 px-2 py-1 rounded-full border border-white/10 backdrop-blur-sm">
        {Array.from({ length: max }).map((_, i) => (
          <Heart 
            key={i}
            size={16} 
            className={`
                ${i < current 
                  ? isPlayer ? 'text-red-500 fill-red-500' : 'text-red-600 fill-red-600' 
                  : 'text-gray-800 fill-gray-900'} 
                transition-all duration-300 drop-shadow-md
            `} 
          />
        ))}
      </div>
    );
  };

  const renderManaBar = (current: number, max: number) => {
    return (
      <div className="flex gap-1 items-center">
        {Array.from({ length: max }).map((_, i) => (
          <div 
            key={i}
            className={`
              w-3 h-3 rounded-full transition-all duration-300
              ${i < current 
                ? 'bg-gradient-to-br from-blue-400 to-purple-600 shadow-[0_0_6px_rgba(147,51,234,0.6)]' 
                : 'bg-gray-800 border border-gray-700'}
            `}
          />
        ))}
        <span className="text-xs text-purple-300 ml-1 font-mono">{current}/{max}</span>
      </div>
    );
  };

  const renderStatusEffects = (effects: StatusEffect[]) => {
    if (effects.length === 0) return null;
    
    return (
      <div className="flex gap-1">
        {effects.map((effect, i) => (
          <div 
            key={i}
            className={`
              px-2 py-0.5 rounded text-[9px] font-bold uppercase border
              ${effect.type === 'burn' ? 'bg-orange-900/50 border-orange-500/50 text-orange-300' :
                effect.type === 'tangle' ? 'bg-green-900/50 border-green-500/50 text-green-300' :
                effect.type === 'frozen' ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-300' :
                'bg-gray-900/50 border-gray-500/50 text-gray-300'}
            `}
          >
            {effect.type === 'burn' && '🔥'}
            {effect.type === 'tangle' && '🌿'}
            {effect.type === 'frozen' && '❄️'}
            {getMechanicName(effect.type)}
          </div>
        ))}
      </div>
    );
  };

  const renderArena = () => {
    if (!duelState) return null;
    
    const oppSpellDetails = opponentCard ? getSpellById(opponentCard) : null;
    const playerSpellDetails = playerCard ? getSpellById(playerCard) : null;
    const playableCards = getPlayableCards(
      duelState.playerHand, 
      duelState.playerMana, 
      duelState.playerEffects
    );

    return (
      <div className="absolute inset-0 bg-slate-950 overflow-hidden">
        {/* Background Image Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 transform"
          style={{ backgroundImage: BATTLE_BG_URL }}
        >
          <div className="absolute inset-0 bg-slate-950/50 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90"></div>
        </div>
        
        {/* Header - Surrender Button */}
        <div className="absolute top-0 right-0 p-4 z-50">
          <button 
            onClick={resetGame}
            className="flex items-center gap-2 px-3 py-1 bg-black/40 hover:bg-black/60 border border-white/20 rounded-full text-xs text-gray-300 hover:text-white transition-colors backdrop-blur-md"
          >
            <LogOut size={12} />
            <span>投降</span>
          </button>
        </div>

        {/* Round Counter */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="px-4 py-1 bg-black/60 rounded-full border border-purple-500/30 backdrop-blur-md">
            <span className="text-purple-300 text-xs font-tech uppercase tracking-wider">
              Round {duelState.roundNumber}
            </span>
          </div>
        </div>

        {/* --- TOP LEFT: OPPONENT INFO --- */}
        <div className="absolute top-16 left-4 z-10 flex flex-col gap-2">
          <div className="flex items-center gap-3 bg-black/40 p-2 rounded-xl pr-4 border border-white/10 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)] relative overflow-hidden">
              <Skull className="text-red-500 z-10" size={24} />
              <div className="absolute inset-0 bg-gradient-to-t from-red-900/50 to-transparent"></div>
            </div>
            <div>
              <div className="text-red-400 font-wizard text-sm tracking-wider drop-shadow-md">Dark Sorcerer</div>
              {renderHealth(duelState.opponentHP, GAME_CONFIG.maxHP, false)}
              <div className="mt-1">
                {renderManaBar(duelState.opponentMana, GAME_CONFIG.maxMana)}
              </div>
            </div>
          </div>
          {/* Opponent Status Effects */}
          {renderStatusEffects(duelState.opponentEffects)}
        </div>

        {/* --- OPPONENT HAND (face down) --- */}
        <div className="absolute top-16 right-4 z-10 opacity-80 scale-75 origin-top-right">
          <div className="flex -space-x-3">
            {Array.from({ length: Math.min(duelState.opponentHandSize, 5) }).map((_, i) => (
              <div key={i} className="transform transition-transform hover:-translate-y-1 duration-300">
                <SpellCard isFaceDown isSmall />
              </div>
            ))}
          </div>
        </div>

        {/* --- BOTTOM LEFT: PLAYER INFO --- */}
        <div className="absolute bottom-44 left-4 z-10 flex flex-col gap-2">
          <div className="flex items-center gap-3 bg-black/40 p-2 rounded-xl pr-4 border border-white/10 backdrop-blur-md">
            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] relative overflow-hidden">
              <UserCircle2 className="text-purple-400 z-10" size={32} />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent"></div>
            </div>
            <div>
              <div className="text-purple-300 font-wizard text-lg tracking-wider drop-shadow-md">You</div>
              {renderHealth(duelState.playerHP, GAME_CONFIG.maxHP, true)}
              <div className="mt-1">
                {renderManaBar(duelState.playerMana, GAME_CONFIG.maxMana)}
              </div>
            </div>
          </div>
          {/* Player Status Effects */}
          {renderStatusEffects(duelState.playerEffects)}
        </div>

        {/* --- MANA & BET INFO (Right Side) --- */}
        <div className="absolute top-1/2 right-0 translate-x-1 -translate-y-1/2 z-10 text-right">
          <div className="bg-black/50 py-3 pl-4 pr-3 rounded-l-xl border-y border-l border-purple-500/30 backdrop-blur-md shadow-xl">
            <div className="text-[9px] text-gray-400 font-tech mb-1 uppercase tracking-widest">Wager</div>
            <div className="text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
              {selectedBet}
            </div>
            <div className="text-purple-400 text-xs font-bold">PTS</div>
          </div>
        </div>

        {/* --- CENTER: BATTLEFIELD --- */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ perspective: '1000px' }}>
          <div className="relative flex items-center gap-8 md:gap-16 z-20"> 
            {/* Opponent Active Card */}
            <div className={`
              transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) transform
              ${opponentCard ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-32 opacity-0 scale-50'}
            `}>
              {duelPhase === 'REVEAL' || duelPhase === 'DAMAGE_PHASE' || duelPhase === 'EFFECTS_PHASE' || duelPhase === 'ROUND_RESET' || gameState === 'RESULT' ? (
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

            {/* VS Text / Result */}
            {(playerCard && opponentCard) && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                {roundResultText ? (
                  <span className={`
                    font-wizard text-5xl font-black drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-bounce
                    ${roundResultText === '击中!' ? 'text-yellow-400' : 
                      roundResultText === '受伤!' ? 'text-red-500' : 'text-gray-300'}
                  `}>
                    {roundResultText}
                  </span>
                ) : (
                  <span className="font-wizard text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-700 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-ping filter brightness-125">
                    VS
                  </span>
                )}
              </div>
            )}

            {/* Player Active Card */}
            <div className={`
              transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform
              ${playerCard ? 'translate-y-0 opacity-100 scale-110' : 'translate-y-32 opacity-0 scale-50'}
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

        {/* --- EFFECT MESSAGES --- */}
        {effectMessages.length > 0 && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-black/80 backdrop-blur-md rounded-lg px-4 py-2 border border-purple-500/30">
              {effectMessages.map((msg, i) => (
                <p key={i} className="text-sm text-purple-200 font-tech animate-pulse">
                  {msg}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* --- BOTTOM CENTER: PLAYER HAND --- */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4">
          {duelPhase === 'PLAYER_TURN' ? (
            <div className="flex items-end justify-center perspective-500">
              {duelState.playerHand.length === 0 ? (
                <div className="text-gray-500 text-sm py-8">牌组耗尽，等待刷新...</div>
              ) : (
                duelState.playerHand.map((spellId, index) => {
                  const spell = getSpellById(spellId);
                  const isAffordable = playableCards.includes(spellId);
                  const rotation = (index - Math.floor(duelState.playerHand.length / 2)) * 6;
                  const yOffset = Math.abs(index - Math.floor(duelState.playerHand.length / 2)) * 8;
                  
                  return (
                    <div 
                      key={`${spellId}-${index}`} 
                      className="relative -mx-2 transition-all duration-300 hover:z-30 group"
                      style={{ 
                        zIndex: index, 
                        transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                      }}
                    >
                      <div className={`
                        transform transition-transform duration-200 
                        ${isAffordable ? 'group-hover:-translate-y-12 group-hover:scale-110 group-hover:rotate-0 cursor-pointer' : ''}
                        shadow-2xl
                      `}>
                        <SpellCard 
                          spell={spell} 
                          onClick={() => playCard(spellId)}
                          isAffordable={isAffordable}
                          disabled={!isAffordable}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex justify-center pb-6">
              <div className="px-6 py-3 bg-black/60 backdrop-blur-md border border-purple-500/30 rounded-full shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                <p className="text-purple-200 font-wizard tracking-[0.15em] text-sm animate-pulse uppercase flex items-center gap-3">
                  <Sparkles size={14} />
                  {gameState === 'RESULT' ? '对战结束' :
                   duelPhase === 'OPPONENT_THINKING' ? '对手正在施法...' : 
                   duelPhase === 'REVEAL' ? '法术揭晓...' : 
                   duelPhase === 'DAMAGE_PHASE' ? '伤害结算中...' :
                   duelPhase === 'EFFECTS_PHASE' ? '效果生效中...' :
                   '准备下一回合...'}
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
              返回大厅
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderLobby = () => (
    <div className="max-w-md mx-auto p-4 space-y-6 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      {/* Hero Section */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-5xl font-wizard font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.5)]">
          WIZARD DUEL
        </h1>
        <p className="text-gray-400 text-sm font-tech tracking-wider uppercase opacity-80">元素策略对战</p>
      </div>

      {/* Game Mechanics Preview */}
      <section className="bg-slate-900/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
        <h3 className="flex items-center gap-2 text-gray-300 mb-3 text-xs font-bold uppercase tracking-wider">
          <Brain size={14} className="text-purple-400" />
          五元素法术
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {SPELLS.map(spell => (
            <div key={spell.id} className="text-center p-2 bg-black/30 rounded-lg border border-white/5 hover:border-white/20 transition-colors group">
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{spell.emoji}</div>
              <div className={`text-[8px] font-bold uppercase ${spell.color}`}>{spell.name.split(' ')[0]}</div>
              <div className="text-[7px] text-gray-500 mt-0.5">
                {spell.manaCost}💎 {spell.damage}❤️
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mt-3 text-center">
          🔥→🌿→❄️→⚡→🪨→🔥 | 每种法术拥有独特机制
        </p>
      </section>

      {/* Betting Section */}
      <section className="bg-slate-900/60 p-5 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={80} />
        </div>
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2 text-gray-200 text-sm uppercase tracking-wide font-bold">
            <Zap size={16} className="text-yellow-400" />
            <span>下注金额</span>
          </div>
          {!isConnected && (
            <span className="text-[10px] text-gray-500 font-mono uppercase border border-white/10 px-2 py-0.5 rounded bg-black/20">访客</span>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-3 relative z-10">
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
        
        <div className="mt-4 flex justify-between items-center text-xs text-gray-500 font-mono border-t border-white/5 pt-3">
          <span>预期收益</span>
          <span className="text-green-400 text-base font-bold">+{Math.floor(selectedBet * 0.92)} PTS</span>
        </div>
      </section>

      {/* Start Button */}
      <button
        onClick={startDuel}
        disabled={balance < selectedBet}
        className={`
          w-full py-5 rounded-2xl font-wizard font-black text-xl tracking-[0.2em] uppercase transition-all
          flex items-center justify-center gap-3 relative overflow-hidden group shadow-[0_0_40px_rgba(168,85,247,0.3)]
          ${balance >= selectedBet 
            ? 'bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 text-white hover:scale-[1.02] active:scale-[0.98] border border-purple-500/50'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}
        `}
      >
        <span className="relative z-10 drop-shadow-md">开始决斗</span>
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      </button>

      {/* Quick History */}
      <div className="pt-6 border-t border-white/5">
        <h3 className="flex items-center gap-2 text-gray-400 mb-3 text-xs font-bold uppercase tracking-wider">
          <History size={14} />
          对战记录
        </h3>
        <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-center py-4 text-gray-600 text-xs italic">暂无对战记录</div>
          ) : (
            history.slice(0, 5).map((record) => (
              <div key={record.id} className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5 text-xs hover:bg-white/5 transition-colors">
                <div className="flex gap-3 items-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${record.result === 'WIN' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : record.result === 'DRAW' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span className={record.result === 'WIN' ? 'text-gray-200' : 'text-gray-500'}>
                    {record.result === 'WIN' ? '胜利' : record.result === 'DRAW' ? '平局' : '失败'}
                  </span>
                </div>
                <span className={`font-mono ${record.amount > 0 ? 'text-green-400' : record.amount < 0 ? 'text-red-400' : 'text-gray-400'}`}>
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
                <span className="uppercase tracking-wide">连接钱包</span>
              </button>
            )}

            <div className="bg-black/40 border border-purple-500/30 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-inner">
              <span className="text-purple-400 text-[10px] uppercase font-bold tracking-wider">法力</span>
              <span className="font-mono font-bold text-white text-sm">{isLoading ? '...' : balance}</span>
            </div>
            
            <button 
              onClick={() => isConnected ? disconnect() : undefined} 
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