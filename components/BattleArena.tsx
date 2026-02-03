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
    <div className="fixed inset-0 overflow-hidden bg-slate-950">
      {/* === 背景图 === */}
      <div className="absolute inset-0 z-0">
        {/* 基础底色（防止图片加载失败变全黑） */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950" />
        
        {/* 背景图片 */}
        <img 
          src="/backgrounds/library-desktop.webp" 
          alt="Battle Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 hidden md:block mix-blend-overlay"
          onError={(e) => (e.target as HTMLImageElement).style.opacity = '0'}
        />
        <img 
          src="/backgrounds/library-mobile.webp" 
          alt="Battle Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 md:hidden mix-blend-overlay"
          onError={(e) => (e.target as HTMLImageElement).style.opacity = '0'}
        />
        
        {/* 氛围遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-purple-900/10 mix-blend-color-dodge pointer-events-none" />
      </div>

      {/* === 装饰边框与角落 === */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* 边框线条 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        {/* 角落 SVG 矢量装饰 (SVG代码保持不变) */}
        {/* 左上角 */}
        <svg className="absolute top-0 left-0 w-24 h-24 md:w-48 md:h-48 text-amber-500/60 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]" viewBox="0 0 100 100" fill="none">
          <path d="M0,0 L30,0 L35,5 L100,5 L100,2 L32,2 L28,-2 L-2,-2 L-2,28 L2,32 L2,100 L5,100 L5,35 L0,30 Z" fill="currentColor" />
          <path d="M0,0 L40,0 L40,1 L1,1 L1,40 L0,40 Z" fill="currentColor" opacity="0.6" />
          <circle cx="15" cy="15" r="2" fill="currentColor" className="animate-pulse" />
        </svg>
        
        {/* 右上角 */}
        <svg className="absolute top-0 right-0 w-24 h-24 md:w-48 md:h-48 text-amber-500/60 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] transform scale-x-[-1]" viewBox="0 0 100 100" fill="none">
          <path d="M0,0 L30,0 L35,5 L100,5 L100,2 L32,2 L28,-2 L-2,-2 L-2,28 L2,32 L2,100 L5,100 L5,35 L0,30 Z" fill="currentColor" />
          <path d="M0,0 L40,0 L40,1 L1,1 L1,40 L0,40 Z" fill="currentColor" opacity="0.6" />
          <circle cx="15" cy="15" r="2" fill="currentColor" className="animate-pulse" />
        </svg>
        
        {/* 左下角 */}
        <svg className="absolute bottom-0 left-0 w-24 h-24 md:w-48 md:h-48 text-amber-500/60 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] transform scale-y-[-1]" viewBox="0 0 100 100" fill="none">
          <path d="M0,0 L30,0 L35,5 L100,5 L100,2 L32,2 L28,-2 L-2,-2 L-2,28 L2,32 L2,100 L5,100 L5,35 L0,30 Z" fill="currentColor" />
          <path d="M0,0 L40,0 L40,1 L1,1 L1,40 L0,40 Z" fill="currentColor" opacity="0.6" />
        </svg>

        {/* 右下角 */}
        <svg className="absolute bottom-0 right-0 w-24 h-24 md:w-48 md:h-48 text-amber-500/60 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] transform scale-[-1]" viewBox="0 0 100 100" fill="none">
          <path d="M0,0 L30,0 L35,5 L100,5 L100,2 L32,2 L28,-2 L-2,-2 L-2,28 L2,32 L2,100 L5,100 L5,35 L0,30 Z" fill="currentColor" />
          <path d="M0,0 L40,0 L40,1 L1,1 L1,40 L0,40 Z" fill="currentColor" opacity="0.6" />
        </svg>
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
      {/* 调整：PC端使用 max-w-2xl，移动端保持全宽但有padding */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-4 pb-8">
        <div className="w-full max-w-[90%] md:max-w-3xl mx-auto px-2 md:px-0 transition-all duration-300">
          <PlayerFrame 
            isPlayer={false}
            name="Dark Sorcerer"
            hp={duelState.opponentHP}
            armor={duelState.opponentArmor}
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
      </div>

      {/* === 中央战场：CSS 魔法阵 (移除图片) === */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
          
          {/* CSS 魔法阵 - 外圈 */}
          <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-spin-slow-reverse border-dashed" />
          
          {/* CSS 魔法阵 - 中圈 (旋转) */}
          <div className="absolute inset-8 rounded-full border border-purple-400/30 animate-spin-slow">
            <div className="absolute inset-0 border-t-2 border-b-2 border-purple-400/50 rounded-full" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-purple-500/50 rounded-full blur-sm" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-purple-500/50 rounded-full blur-sm" />
          </div>

          {/* CSS 魔法阵 - 内圈 (脉冲) */}
          <div className="absolute inset-20 rounded-full border-2 border-purple-300/40 animate-pulse bg-purple-900/10">
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
               {/* 简单的几何图形 */}
               <div className="w-32 h-32 border border-purple-300/30 transform rotate-45" />
               <div className="absolute w-32 h-32 border border-purple-300/30" />
            </div>
          </div>
          
          {/* 核心光晕 */}
          <div className="absolute inset-0 bg-purple-600/5 blur-3xl rounded-full" />

          {/* 卡牌对决区域 */}
          <div className="absolute inset-0 flex items-center justify-center gap-12 md:gap-20 z-10">
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

      {/* === 回合信息栏（增大） === */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20">
        <div className="bg-black/80 backdrop-blur-md rounded-xl p-5 border-2 border-purple-500/50 shadow-2xl text-center min-w-[80px]">
          {/* 回合数 */}
          <div className="text-xs text-gray-400 font-tech uppercase tracking-widest mb-1">回合</div>
          <div className="text-4xl font-wizard font-bold text-purple-300 drop-shadow-lg">{duelState.roundNumber}</div>
          
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mx-auto my-3" />
          
          {/* 下注额 */}
          <div className="text-xs text-gray-400 font-tech uppercase tracking-widest mb-1">下注</div>
          <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-yellow-400 drop-shadow-lg">
            <img 
              src="/icons/icon-coin.webp" 
              alt="Coin" 
              className="w-5 h-5 object-contain"
              onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
            />
            {selectedBet}
          </div>
          <div className="text-purple-400 text-xs font-bold mt-0.5">积分</div>
        </div>
      </div>

      {/* === 玩家回合提示（大型动画） === */}
      {phase === 'PLAYER_TURN' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-fade-in-out">
          <div className="relative">
            {/* 发光背景 */}
            <div className="absolute -inset-8 bg-purple-500/20 blur-3xl rounded-full animate-pulse" />
            {/* 主文字 */}
            <div className="relative px-10 py-5 bg-gradient-to-r from-purple-900/95 via-purple-800/95 to-purple-900/95 rounded-2xl border-2 border-purple-400/70 shadow-2xl shadow-purple-500/30">
              <div className="text-3xl md:text-4xl font-wizard font-black text-white tracking-widest drop-shadow-lg text-center">
                ⚔️ 你的回合 ⚔️
              </div>
              <div className="text-sm text-purple-200 text-center mt-2 font-tech animate-pulse">
                选择一张卡牌施放
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === 底部区域：玩家信息 + 手牌 === */}
      <div className="absolute bottom-0 left-0 right-0 z-20 overflow-visible">
        {/* 玩家手牌 */}
        <div className="flex justify-center pb-4 relative z-30" style={{ perspective: '1000px' }}>
          {phase === 'PLAYER_TURN' ? (
            <div className="flex items-end -space-x-4 md:-space-x-2">
              {duelState.playerHand.length === 0 ? (
                <div className="text-gray-500 text-sm py-8 bg-black/50 px-8 rounded-lg">牌组耗尽...</div>
              ) : (
                duelState.playerHand.map((spellId, index) => {
                  const spell = getSpellById(spellId);
                  const isAffordable = playableCards.includes(spellId);
                  const totalCards = duelState.playerHand.length;
                  const middleIndex = (totalCards - 1) / 2;
                  const rotation = (index - middleIndex) * 6;
                  const yOffset = Math.abs(index - middleIndex) * 12;

                  return (
                    <div 
                      key={`${spellId}-${index}`} 
                      className="relative transition-all duration-300 hover:z-50 group pointer-events-auto"
                      style={{ 
                        zIndex: index,
                      }}
                    >
                      <div 
                        className={`
                          transform transition-all duration-300 origin-bottom 
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

        {/* 玩家信息栏 - 增加宽度限制适配宽屏 */}
        <div className="bg-gradient-to-t from-black/90 via-black/80 to-transparent px-4 pb-6 pt-12 mt-[-40px]">
          <div className="w-full max-w-[90%] md:max-w-3xl mx-auto transition-all duration-300">
            <PlayerFrame 
              isPlayer={true}
              name="Player Wizard"
              hp={duelState.playerHP}
              armor={duelState.playerArmor}
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
          animation: spin-slow 15s linear infinite;
        }
        
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 2.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default BattleArena;
