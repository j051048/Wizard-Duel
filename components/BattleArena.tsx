/**
 * BattleArena - 战斗场景组件
 * 
 * 包含战场背景、魔法阵、玩家双方信息、卡牌对决区域
 */

import React from 'react';
import { Sparkles, LogOut, Volume2, VolumeX } from 'lucide-react';
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
  roundResult: RoundResult | null;
  resultText: string;
  effectMessages: string[];
  selectedBet: number;
  onPlayCard: (spellId: SpellType) => void;
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
  roundResult,
  resultText,
  effectMessages,
  selectedBet,
  onPlayCard,
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
    duelState.playerEffects
  );

  const isRevealPhase = phase === 'REVEAL' || phase === 'DAMAGE_PHASE' || phase === 'EFFECTS_PHASE' || phase === 'ROUND_RESET';

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* === 背景层 === */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/battle-bg.webp')" }}
      >
        {/* 备用渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-purple-950/30 to-slate-950/50" />
      </div>

      {/* === 装饰边框 === */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 顶部边框 */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        {/* 底部边框 */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        {/* 左侧边框 */}
        <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent" />
        {/* 右侧边框 */}
        <div className="absolute top-0 bottom-0 right-0 w-2 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent" />

        {/* 角落装饰 */}
        <img src="/ui/corner-tl.webp" className="absolute top-0 left-0 w-24 h-24 opacity-60" alt="" onError={(e) => (e.target as HTMLImageElement).style.display='none'} />
        <img src="/ui/corner-tr.webp" className="absolute top-0 right-0 w-24 h-24 opacity-60" alt="" onError={(e) => (e.target as HTMLImageElement).style.display='none'} />
        <img src="/ui/corner-bl.webp" className="absolute bottom-0 left-0 w-24 h-24 opacity-60" alt="" onError={(e) => (e.target as HTMLImageElement).style.display='none'} />
        <img src="/ui/corner-br.webp" className="absolute bottom-0 right-0 w-24 h-24 opacity-60" alt="" onError={(e) => (e.target as HTMLImageElement).style.display='none'} />
      </div>

      {/* === 顶部控制栏 === */}
      <div className="absolute top-4 right-4 z-30 flex gap-2">
        {/* 音量控制 */}
        <button 
          onClick={onToggleMute}
          className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg hover:border-purple-500/50 transition-colors"
        >
          {isMuted ? <VolumeX size={16} className="text-gray-400" /> : <Volume2 size={16} className="text-purple-400" />}
        </button>
        
        {/* 投降按钮 */}
        <button 
          onClick={onSurrender}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/80 hover:bg-red-800 border border-red-500/50 rounded-lg text-sm text-red-200 hover:text-white transition-all backdrop-blur-md"
        >
          <LogOut size={14} />
          <span>投降</span>
        </button>
      </div>

      {/* === 顶部区域：对手信息 === */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
        <PlayerFrame 
          isPlayer={false}
          name="Dark Sorcerer"
          hp={duelState.opponentHP}
          maxHp={GAME_CONFIG.maxHP}
          mana={duelState.opponentMana}
          maxMana={GAME_CONFIG.maxMana}
          effects={duelState.opponentEffects}
          isShaking={isOpponentShaking}
        />

        {/* 对手手牌（背面） */}
        <div className="flex justify-center mt-3 -space-x-4">
          {Array.from({ length: Math.min(duelState.opponentHandSize, 5) }).map((_, i) => (
            <div 
              key={i} 
              className="transition-transform hover:-translate-y-1 duration-300"
              style={{ transform: `rotate(${(i - 2) * 8}deg)` }}
            >
              <SpellCard isFaceDown isSmall />
            </div>
          ))}
        </div>
      </div>

      {/* === 中央战场：魔法阵 === */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* 魔法阵背景 */}
        <div className="relative w-80 h-80 md:w-96 md:h-96">
          {/* 魔法阵图片 */}
          <img 
            src="/ui/magic-circle.webp" 
            alt=""
            className="absolute inset-0 w-full h-full object-contain opacity-40 animate-spin-slow"
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
          {/* CSS 备用魔法阵 */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-pulse" />
          <div className="absolute inset-4 rounded-full border border-purple-400/20" />
          <div className="absolute inset-8 rounded-full border border-purple-300/10" />

          {/* 卡牌对决区域 */}
          <div className="absolute inset-0 flex items-center justify-center gap-12 md:gap-20">
            {/* 对手出牌 */}
            <div className={`
              transition-all duration-700 transform
              ${opponentCard ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-20 opacity-0 scale-75'}
            `}>
              {isRevealPhase && oppSpellDetails ? (
                <div className="relative">
                  <div className="absolute -inset-4 bg-red-500/20 blur-xl animate-pulse rounded-full" />
                  <SpellCard spell={oppSpellDetails} disabled />
                </div>
              ) : opponentCard ? (
                <SpellCard isFaceDown />
              ) : null}
            </div>

            {/* VS / 结果文字 */}
            {(playerCard && opponentCard) && (
              <div className="absolute z-30">
                {resultText ? (
                  <div className={`
                    px-6 py-3 rounded-lg font-wizard text-3xl md:text-4xl font-black
                    animate-bounce shadow-2xl
                    ${resultText === '击中!' 
                      ? 'bg-gradient-to-r from-yellow-600 to-amber-500 text-white shadow-yellow-500/50' 
                      : resultText === '受伤!' 
                      ? 'bg-gradient-to-r from-red-700 to-red-500 text-white shadow-red-500/50' 
                      : 'bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-gray-500/50'}
                  `}>
                    {resultText}
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/50 animate-ping">
                    <span className="text-2xl font-black text-white">VS</span>
                  </div>
                )}
              </div>
            )}

            {/* 玩家出牌 */}
            <div className={`
              transition-all duration-500 transform
              ${playerCard ? 'translate-y-0 opacity-100 scale-110' : 'translate-y-20 opacity-0 scale-75'}
            `}>
              {playerSpellDetails && (
                <div className="relative">
                  <div className="absolute -inset-4 bg-purple-500/30 blur-xl animate-pulse rounded-full" />
                  <SpellCard spell={playerSpellDetails} isSelected disabled />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === 效果消息 === */}
      {effectMessages.length > 0 && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-black/90 backdrop-blur-md rounded-xl px-6 py-3 border border-purple-500/50 shadow-2xl">
            {effectMessages.map((msg, i) => (
              <p key={i} className="text-sm text-purple-200 font-tech animate-pulse text-center">
                {msg}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* === 回合信息栏 === */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20">
        <div className="bg-black/70 backdrop-blur-md rounded-xl p-4 border border-purple-500/30 shadow-xl text-center">
          <div className="text-[10px] text-gray-400 font-tech uppercase tracking-widest mb-1">Round</div>
          <div className="text-3xl font-wizard font-bold text-purple-300">{duelState.roundNumber}</div>
          <div className="w-px h-4 bg-purple-500/30 mx-auto my-2" />
          <div className="text-[10px] text-gray-400 font-tech uppercase tracking-widest mb-1">Wager</div>
          <div className="text-xl font-bold text-white">{selectedBet}</div>
          <div className="text-purple-400 text-xs">PTS</div>
        </div>
      </div>

      {/* === 底部区域：玩家信息 + 手牌 === */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* 玩家手牌 */}
        <div className="flex justify-center pb-4" style={{ perspective: '1000px' }}>
          {phase === 'PLAYER_TURN' ? (
            <div className="flex items-end">
              {duelState.playerHand.length === 0 ? (
                <div className="text-gray-500 text-sm py-8 bg-black/50 px-8 rounded-lg">牌组耗尽...</div>
              ) : (
                duelState.playerHand.map((spellId, index) => {
                  const spell = getSpellById(spellId);
                  const isAffordable = playableCards.includes(spellId);
                  const totalCards = duelState.playerHand.length;
                  const middleIndex = (totalCards - 1) / 2;
                  const rotation = (index - middleIndex) * 8;
                  const yOffset = Math.abs(index - middleIndex) * 12;

                  return (
                    <div 
                      key={`${spellId}-${index}`} 
                      className="relative transition-all duration-300 hover:z-50 group pointer-events-auto"
                      style={{ 
                        zIndex: index,
                        marginLeft: index === 0 ? 0 : '-24px'
                      }}
                    >
                      <div 
                        className={`
                          transform transition-all duration-300
                          ${isAffordable ? 'group-hover:-translate-y-16 group-hover:rotate-0 group-hover:scale-110 cursor-pointer' : ''}
                        `}
                        style={{ transform: `rotate(${rotation}deg) translateY(${yOffset}px)` }}
                      >
                        <SpellCard 
                          spell={spell} 
                          onClick={() => onPlayCard(spellId)}
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
            <div className="px-8 py-4 bg-black/70 backdrop-blur-md border border-purple-500/30 rounded-xl shadow-xl">
              <p className="text-purple-200 font-wizard tracking-widest text-sm animate-pulse uppercase flex items-center gap-3">
                <Sparkles size={14} className="animate-spin" />
                {phase === 'OPPONENT_THINKING' ? '对手正在施法...' : 
                 phase === 'REVEAL' ? '法术揭晓...' : 
                 phase === 'DAMAGE_PHASE' ? '伤害结算中...' :
                 phase === 'EFFECTS_PHASE' ? '效果生效中...' :
                 '准备下一回合...'}
                <Sparkles size={14} className="animate-spin" />
              </p>
            </div>
          )}
        </div>

        {/* 玩家信息栏 */}
        <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pb-4 pt-2">
          <div className="max-w-md mx-auto">
            <PlayerFrame 
              isPlayer={true}
              name="Player Wizard"
              hp={duelState.playerHP}
              maxHp={GAME_CONFIG.maxHP}
              mana={duelState.playerMana}
              maxMana={GAME_CONFIG.maxMana}
              effects={duelState.playerEffects}
              isShaking={isPlayerShaking}
            />
          </div>
        </div>
      </div>

      {/* 全局动画样式 */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default BattleArena;
