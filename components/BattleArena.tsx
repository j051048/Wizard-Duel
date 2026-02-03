/**
 * BattleArena - 战斗场景组件 (Patch 2.0 Turn-Based)
 * 
 * 包含Draft选择、多卡连击界面、Pass按钮
 */

import React from 'react';
import { Sparkles, LogOut, Volume2, VolumeX, ArrowRight, Hand } from 'lucide-react';
import { SpellType, DuelPhase, DuelState, RoundResult } from '../types';
import { GAME_CONFIG, getSpellById } from '../constants';
import { getPlayableCards } from '../services/gameLogic';
import { PlayerFrame } from './PlayerFrame';
import { SpellCard } from './SpellCard';

interface BattleArenaProps {
  duelState: DuelState;
  phase: DuelPhase;
  playerCard: SpellType | null;
  opponentCard: SpellType | null;
  resultText: string;
  effectMessages: string[];
  selectedBet: number;
  onPlayCard: (spellId: SpellType) => void;
  onDraft?: (spellId: SpellType) => void;
  onPass?: () => void;
  onSurrender: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPlayerShaking?: boolean;
  isOpponentShaking?: boolean;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  duelState,
  phase,
  playerCard,
  opponentCard,
  resultText,
  effectMessages,
  selectedBet,
  onPlayCard,
  onDraft,
  onPass,
  onSurrender,
  isMuted,
  onToggleMute,
  isPlayerShaking = false,
  isOpponentShaking = false,
}) => {
  const oppSpellDetails = opponentCard ? getSpellById(opponentCard) : null;
  const playerSpellDetails = playerCard ? getSpellById(playerCard) : null;
  
  const playableCards = getPlayableCards(
    duelState.playerHand, 
    duelState.playerMana, 
    duelState.playerEffects,
    duelState.playerCostMod
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 select-none">
      {/* === 背景图 === */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950" />
        <img 
          src="/battle-bg.webp" 
          alt="Battle Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
          onError={(e) => (e.target as HTMLImageElement).style.opacity = '0'}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-purple-900/10 mix-blend-color-dodge pointer-events-none" />
        
        {/* 魔法阵 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <img 
            src="/ui/magic-circle.webp" 
            alt="Magic Circle" 
            className="w-[80vw] h-[80vw] md:w-[60vh] md:h-[60vh] animate-[spin_60s_linear_infinite] opacity-60 mix-blend-screen"
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
      </div>

      {/* === 装饰边框 === */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        
        <img src="/ui/corner-tl.png" alt="frame" className="absolute top-0 left-0 w-24 h-24 md:w-32 md:h-32 object-contain pointer-events-none opacity-80" />
        <img src="/ui/corner-tr.png" alt="frame" className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 object-contain pointer-events-none opacity-80" />
        <img src="/ui/corner-bl.png" alt="frame" className="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32 object-contain pointer-events-none opacity-80" />
        <img src="/ui/corner-br.png" alt="frame" className="absolute bottom-0 right-0 w-24 h-24 md:w-32 md:h-32 object-contain pointer-events-none opacity-80" />
      </div>

      {/* === 顶部控制栏 === */}
      <div className="absolute top-4 right-4 z-40 flex gap-2 pointer-events-auto">
        <button 
          onClick={onToggleMute}
          className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg hover:border-purple-500/50 transition-colors"
        >
          {isMuted ? <VolumeX size={16} className="text-gray-400" /> : <Volume2 size={16} className="text-purple-400" />}
        </button>
        <button 
          onClick={onSurrender}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/80 hover:bg-red-800 border border-red-500/50 rounded-lg text-sm text-red-200 hover:text-white transition-all backdrop-blur-md"
        >
          <LogOut size={14} />
          <span>投降</span>
        </button>
      </div>

      {/* === 顶部：对手信息 === */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-4 pb-8 pointer-events-none">
        <div className="w-full max-w-[90%] md:max-w-3xl mx-auto px-2 md:px-0 transition-all duration-300">
          <PlayerFrame 
            isPlayer={false}
            name="Dark Sorcerer"
            hp={duelState.opponentHP}
            armor={duelState.opponentArmor}
            maxHp={GAME_CONFIG.maxHP}
            mana={duelState.opponentMana}
            maxMana={duelState.opponentMaxMana} // Fix: Use correct maxMana
            effects={duelState.opponentEffects}
            isShaking={isOpponentShaking}
          />

          {/* 对手手牌数显示 */}
          <div className="flex justify-center mt-3 -space-x-4">
            {Array.from({ length: Math.min(duelState.opponentHandSize, 5) }).map((_, i) => (
              <div 
                key={i} 
                className="transition-transform duration-300"
                style={{ transform: `rotate(${(i - 2) * 5}deg)` }}
              >
                <SpellCard isFaceDown isSmall />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === Draft 阶段遮罩 === */}
      {phase === 'DRAFT_PHASE' && (
         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <h2 className="text-3xl font-wizard font-bold text-white mb-8 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
             选择你的法术
           </h2>
           <div className="flex gap-4 md:gap-8 flex-wrap justify-center px-4">
             {duelState.draftOptions.map((spellId, idx) => {
               const spell = getSpellById(spellId);
               return (
                 <div 
                   key={idx} 
                   className="transform hover:scale-105 transition-all duration-300 cursor-pointer hover:rotate-1"
                   onClick={() => onDraft && onDraft(spellId)}
                 >
                   <SpellCard spell={spell} />
                   <div className="mt-4 text-center">
                     <button className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold shadow-lg border border-purple-400/50">
                       选择
                     </button>
                   </div>
                 </div>
               );
             })}
           </div>
         </div>
      )}

      {/* === 中央战场区域 === */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {/* 对手打出的牌 */}
        <div className={`
             absolute top-[30%]
             transition-all duration-700 transform
             ${opponentCard ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-10 opacity-0 scale-90'}
        `}>
          {oppSpellDetails && opponentCard && (
            <div className="relative">
              <div className="absolute -inset-4 bg-red-500/20 blur-xl rounded-full" />
              <div className="bg-red-950/80 p-1 rounded-xl border border-red-500/50">
                 <SpellCard spell={oppSpellDetails} disabled />
              </div> 
              {/* 这里可以加一个 "Opponent Played" 标签 */}
            </div>
          )}
        </div>

        {/* 玩家打出的牌 (Temporary animation) */}
        <div className={`
             absolute bottom-[30%]
             transition-all duration-500 transform
             ${playerCard ? 'translate-y-0 opacity-100 scale-110' : 'translate-y-10 opacity-0 scale-90'}
        `}>
          {playerSpellDetails && playerCard && (
            <div className="relative">
              <div className="absolute -inset-4 bg-purple-500/30 blur-xl rounded-full" />
              <SpellCard spell={playerSpellDetails} isSelected disabled />
            </div>
          )}
        </div>
        
        {/* Round Result Floating Text */}
        {resultText && (
             <div className="absolute z-50 pointer-events-none animate-bounce">
                <div className={`
                  px-6 py-3 rounded-lg font-wizard text-3xl md:text-4xl font-black shadow-2xl
                  ${resultText.includes('Win') ? 'bg-gradient-to-r from-yellow-600 to-amber-500 text-white' : 
                    resultText.includes('Loss') ? 'bg-gradient-to-r from-red-700 to-red-500 text-white' : 
                    'bg-slate-800 text-white border border-slate-600'}
                `}>
                  {resultText}
                </div>
             </div>
        )}
      </div>

      {/* === 效果消息通知 === */}
      {effectMessages.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            {effectMessages.slice(-3).map((msg, i) => ( // Show last 3 messages
              <div key={i} className="bg-black/80 backdrop-blur-md rounded-full px-8 py-2 border border-purple-500/50 shadow-2xl animate-fade-in-up">
                <p className="text-base text-purple-200 font-tech text-center">
                  {msg}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === 底部区域：玩家信息 + 手牌 + Pass按钮 === */}
      <div className="absolute bottom-0 left-0 right-0 z-30 overflow-visible pointer-events-none">
        
        {/* 功能区容器 */}
        <div className="w-full max-w-[90%] md:max-w-5xl mx-auto relative h-[250px] flex items-end justify-center">
            
            {/* 玩家信息框 (Absolute Left) */}
            <div className="absolute left-0 bottom-4 w-[280px] z-20 pointer-events-auto">
               <PlayerFrame 
                  isPlayer={true}
                  name="Player Wizard"
                  hp={duelState.playerHP}
                  armor={duelState.playerArmor}
                  maxHp={GAME_CONFIG.maxHP}
                  mana={duelState.playerMana}
                  maxMana={duelState.playerMaxMana}
                  effects={duelState.playerEffects}
                  isShaking={isPlayerShaking}
                />
            </div>

            {/* 手牌区域 (Center) */}
            <div className="relative z-30 mb-6 flex items-end justify-center pointer-events-auto min-w-[300px]">
                {duelState.playerHand.length === 0 ? (
                  <div className="text-gray-500 text-sm py-4 bg-black/50 px-6 rounded-lg backdrop-blur-md border border-gray-700">
                    手牌耗尽
                  </div>
                ) : (
                  <div className="flex -space-x-8 md:-space-x-6 hover:space-x-2 transition-all duration-300 px-4 py-2">
                    {duelState.playerHand.map((spellId, index) => {
                      const spell = getSpellById(spellId);
                      const isAffordable = playableCards.includes(spellId);
                      // Calculate slight arc
                      const totalCards = duelState.playerHand.length;
                      const middleIndex = (totalCards - 1) / 2;
                      const rotation = (index - middleIndex) * 3;
                      const yOffset = Math.abs(index - middleIndex) * 5;

                      return (
                        <div 
                          key={`${spellId}-${index}`} 
                          className="relative transition-all duration-300 hover:z-50 group"
                          style={{ 
                            zIndex: index,
                            transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                          }}
                        >
                          <div className={`
                             transform transition-all duration-200
                             ${isAffordable && phase === 'PLAYER_TURN' 
                               ? 'group-hover:-translate-y-12 group-hover:scale-110 cursor-pointer' 
                               : 'grayscale brightness-75 opacity-90'}
                          `}>
                            <SpellCard 
                              spell={spell} 
                              onClick={() => isAffordable && phase === 'PLAYER_TURN' && onPlayCard(spellId)}
                              isAffordable={isAffordable}
                              disabled={!isAffordable || phase !== 'PLAYER_TURN'}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>

            {/* Pass 按钮 (Absolute Right in the red box area) */}
            <div className="absolute right-0 bottom-4 w-[120px] h-[100px] flex items-center justify-center z-20 pointer-events-auto">
                <button 
                  onClick={() => onPass && onPass()}
                  disabled={phase !== 'PLAYER_TURN'}
                  className={`
                    group relative w-full h-full flex flex-col items-center justify-center
                    rounded-xl border-2 transition-all duration-300
                    ${phase === 'PLAYER_TURN' 
                      ? 'bg-amber-900/80 border-amber-500 hover:bg-amber-800 hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer' 
                      : 'bg-gray-900/50 border-gray-700 opacity-50 cursor-not-allowed'}
                  `}
                >
                   {/* 屯牌提示 */}
                   <div className="absolute -top-10 right-0 bg-black/80 text-xs text-amber-200 px-2 py-1 rounded border border-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      结束回合 (保留手牌)
                   </div>

                   <span className="text-4xl text-amber-500 group-hover:scale-110 transition-transform">🛑</span>
                   <span className="text-amber-100 font-bold mt-1 text-sm tracking-wider">结束回合</span>
                   <span className="text-[10px] text-amber-300/60 uppercase">Pass Turn</span>
                </button>
            </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default BattleArena;
