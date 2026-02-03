/**
 * BattleArena - 战斗场景组件 (Patch 2.0 Turn-Based)
 * 
 * 包含Draft选择、多卡连击界面、Pass按钮
 */

import React, { useState, useRef } from 'react';
import { Sparkles, LogOut, Volume2, VolumeX, ArrowRight, Hand } from 'lucide-react';
import { SpellType, DuelPhase, DuelState, RoundResult } from '../types';
import { GAME_CONFIG } from '../constants';
import { getSpellById } from '../services/gameLogic';
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
  onPass?: () => void;
  onSurrender: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPlayerShaking?: boolean;
  isOpponentShaking?: boolean;
  isTavernMode?: boolean;
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
  onPass,
  onSurrender,
  isMuted,
  onToggleMute,
  isPlayerShaking = false,
  isOpponentShaking = false,
  isTavernMode = false,
}) => {
  const [damageNumbers, setDamageNumbers] = useState<{id: number, value: number, x: number, y: number, isPlayer: boolean}[]>([]);
  const damageIdRef = useRef(0);
  const playerSpellDetails = playerCard ? getSpellById(playerCard) : null;
  const oppSpellDetails = opponentCard ? getSpellById(opponentCard) : null;

  // 伤害数字动画
  const addDamageNumber = (damage: number, isPlayer: boolean) => {
    const id = damageIdRef.current++;
    const x = Math.random() * 100 + 50; // 随机位置
    const y = isPlayer ? 200 : 100;
    setDamageNumbers(prev => [...prev, { id, value: damage, x, y, isPlayer }]);
    
    // 移除动画
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id));
    }, 1000);
  };

  // 监听伤害变化添加动画 (简化版)
  React.useEffect(() => {
    if (effectMessages.length > 0) {
      const lastMsg = effectMessages[effectMessages.length - 1];
      if (lastMsg.includes('造成') || lastMsg.includes('受到')) {
        const damageMatch = lastMsg.match(/(\d+) 点伤害/);
        if (damageMatch) {
          const damage = parseInt(damageMatch[1]);
          const isPlayerDamage = lastMsg.includes('造成');
          addDamageNumber(damage, isPlayerDamage);
        }
      }
    }
  }, [effectMessages]);
  
  const playableCards = getPlayableCards(
    duelState.playerHand, 
    duelState.playerMana, 
    duelState.playerEffects,
    duelState.playerCostMod
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 select-none flex flex-col">
      {/* === 背景层 (底层) === */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950" />
        <img 
          src="/battle-bg.webp" 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          onError={(e) => (e.target as HTMLImageElement).style.opacity = '0'}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        
        {/* 魔法阵 - 优化尺寸和混合 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <img 
            src="/ui/magic-circle.webp" 
            alt="" 
            className="w-[120vw] h-[120vw] md:w-[90vh] md:h-[90vh] animate-[spin_120s_linear_infinite] mix-blend-screen"
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
      </div>

      {/* === 顶部：对手区 === */}
      <div className="w-full pt-4 px-4 z-20 flex-shrink-0">
         <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
            <PlayerFrame 
              isPlayer={false}
              name={duelState.aiProfile?.name || "Dark Sorcerer"}
              hp={duelState.opponentHP}
              armor={duelState.opponentArmor}
              maxHp={GAME_CONFIG.maxHP}
              mana={duelState.opponentMana}
              maxMana={duelState.opponentMaxMana} 
              effects={duelState.opponentEffects}
              isShaking={isOpponentShaking}
              avatar={duelState.aiProfile?.avatar}
            />
            {/* 对手手牌预览 - 紧凑化 */}
            <div className="flex justify-center -space-x-6 scale-75 origin-top">
              {Array.from({ length: Math.min(duelState.opponentHandSize, 5) }).map((_, i) => (
                <div key={i} style={{ transform: `rotate(${(i - 2) * 4}deg)` }}>
                  <SpellCard isFaceDown isSmall />
                </div>
              ))}
            </div>
         </div>
      </div>

      {/* === 中间：战斗动画区 (自适应增长) === */}
      <div className="flex-1 relative z-10 flex items-center justify-center my-4 overflow-visible">
        {/* 对手出牌 */}
        <div className={`
             absolute top-[10%]
             transition-all duration-700 transform
             ${opponentCard ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-20 opacity-0 scale-90'}
        `}>
          {oppSpellDetails && opponentCard && (
            <div className="relative group">
              <div className="absolute -inset-8 bg-red-600/30 blur-2xl rounded-full animate-pulse" />
              <div className="relative p-1 bg-red-950/40 border border-red-500/30 rounded-2xl backdrop-blur-sm">
                <SpellCard spell={oppSpellDetails} disabled isSmall={window.innerWidth < 768} />
              </div>
            </div>
          )}
        </div>

        {/* 玩家出牌 */}
        <div className={`
             absolute bottom-[10%]
             transition-all duration-500 transform
             ${playerCard ? 'translate-y-0 opacity-100 scale-110' : 'translate-y-20 opacity-0 scale-90'}
        `}>
          {playerSpellDetails && playerCard && (
            <div className="relative group">
              <div className="absolute -inset-8 bg-purple-600/40 blur-2xl rounded-full animate-pulse" />
              <div className="relative p-1 bg-purple-950/40 border border-purple-500/30 rounded-2xl backdrop-blur-sm">
                <SpellCard spell={playerSpellDetails} isSelected disabled isSmall={window.innerWidth < 768} />
              </div>
            </div>
          )}
        </div>
        
        {/* 结果文字 */}
        {resultText && (
             <div className="absolute z-50 animate-bounce">
                <div className={`
                  px-8 py-4 rounded-xl font-wizard text-3xl md:text-5xl font-black shadow-[0_0_50px_rgba(0,0,0,0.5)]
                  ${resultText.includes('Win') ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-white' : 
                    resultText.includes('Loss') ? 'bg-gradient-to-r from-red-700 via-rose-600 to-red-800 text-white' : 
                    'bg-slate-800/90 text-white border border-slate-500 backdrop-blur-lg'}
                `}>
                  {resultText}
                </div>
             </div>
        )}

        {/* 伤害数字 */}
        {damageNumbers.map(damage => (
          <div
            key={damage.id}
            className={`absolute pointer-events-none text-5xl font-black italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] ${
              damage.isPlayer ? 'text-red-500' : 'text-blue-400'
            }`}
            style={{
              left: `${damage.x}%`,
              top: `${damage.y}%`,
              animation: 'damageFloat 0.8s ease-out forwards'
            }}
          >
            -{damage.value}
          </div>
        ))}

        {/* 提示信息 */}
        {effectMessages.length > 0 && (
          <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
            {effectMessages.slice(-2).map((msg, i) => (
              <div key={i} className="bg-black/80 backdrop-blur-xl rounded-2xl px-6 py-2 border border-purple-500/50 shadow-2xl animate-fade-in-up">
                <p className="text-sm md:text-base text-purple-200 font-bold text-center italic">
                  {msg}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === 底部：玩家操作区 (固定底部) === */}
      <div className="w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-8 pb-4 px-2 z-30 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col items-stretch gap-2 relative">
          
          {/* 玩家状态层 - 移动端浮动，Web端嵌入 */}
          <div className="md:absolute md:left-0 md:bottom-2 w-full md:w-72 pointer-events-auto">
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

          {/* 右侧功能区与手牌区分离 */}
          <div className="flex flex-col md:flex-row items-end gap-2 md:gap-4 md:pl-80">
            {/* 中间：手牌区 */}
            <div className="flex-1 w-full min-h-[140px] md:min-h-[200px] flex flex-col justify-end pointer-events-auto">
              {/* 英雄技能行 - 移动端更小 */}
              <div className="flex justify-center gap-1 mb-1 md:mb-2 translate-y-2">
                {(['hero_fire', 'hero_vine', 'hero_ice', 'hero_thunder', 'hero_rock'] as const).map((id) => {
                  const spell = getSpellById(id);
                  const canUse = phase === 'PLAYER_TURN' && !duelState.heroSkillsUsed;
                  return (
                    <div key={id} className="relative transition-all duration-300 transform hover:-translate-y-2 scale-[0.6] md:scale-75 origin-bottom">
                      <SpellCard 
                        spell={spell} 
                        onClick={() => canUse && onPlayCard(id)}
                        isAffordable={canUse}
                        disabled={!canUse}
                      />
                      {!canUse && <div className="absolute inset-x-0 bottom-0 top-1/2 bg-black/80 rounded-b-xl flex items-center justify-center font-bold text-[10px] text-white/50">USED</div>}
                    </div>
                  );
                })}
              </div>

              {/* 主手牌 - 堆叠优化 */}
              <div className="flex justify-center items-end -space-x-12 md:-space-x-8 px-4 py-2 hover:space-x-1 transition-all duration-500">
                {duelState.playerHand.map((id, index) => {
                  const isAffordable = playableCards.includes(id);
                  const middleIndex = (duelState.playerHand.length - 1) / 2;
                  const rotation = (index - middleIndex) * (window.innerWidth < 768 ? 2 : 4);
                  const yOffset = Math.abs(index - middleIndex) * 4;

                  return (
                    <div 
                      key={`${id}-${index}`} 
                      className="relative transition-all duration-300 transform hover:-translate-y-16 hover:scale-110 active:scale-125 hover:z-[100]"
                      style={{ 
                        zIndex: index + 10,
                        transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                      }}
                    >
                      <SpellCard 
                        spell={getSpellById(id)} 
                        onClick={() => isAffordable && phase === 'PLAYER_TURN' && onPlayCard(id)}
                        isAffordable={isAffordable}
                        disabled={!isAffordable || phase !== 'PLAYER_TURN'}
                        isSmall={window.innerWidth < 768}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右侧按钮 - 移动端横向 */}
            <div className="w-full md:w-32 flex flex-row md:flex-col gap-2 flex-shrink-0 pointer-events-auto">
               <button 
                  onClick={() => onPass && onPass()}
                  disabled={phase !== 'PLAYER_TURN'}
                  className={`
                    flex-1 h-12 md:h-24 flex flex-col items-center justify-center rounded-xl border-2 transition-all
                    ${phase === 'PLAYER_TURN' ? 'bg-amber-900/60 border-amber-500/50 hover:bg-amber-800 shadow-lg shadow-amber-900/40' : 'bg-slate-900/40 border-slate-700/30 opacity-40 grayscale'}
                  `}
                >
                  <span className="text-xl md:text-3xl">🛑</span>
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-amber-200">PASS</span>
               </button>
               <button 
                  onClick={onSurrender}
                  className="flex-shrink-0 w-20 md:w-full h-12 md:h-10 flex items-center justify-center gap-1 rounded-xl border border-red-500/20 bg-red-950/20 text-[10px] font-bold text-red-400 hover:bg-red-900/40 transition-colors"
                >
                  <LogOut size={12} /> 退
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* 辅助层：声音控制 */}
      <div className="fixed top-4 right-4 z-40">
        <button onClick={onToggleMute} className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white/60">
           {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      <style>{`
        @keyframes damageFloat {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
          100% { transform: translateY(-80px) scale(1); opacity: 0; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BattleArena;
