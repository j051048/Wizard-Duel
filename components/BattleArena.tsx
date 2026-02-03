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
import { HapticService } from '../services/haptic';
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
  // 新增：追踪HP变化，默认值为初始HP
  const prevPlayerHP = useRef(duelState.playerHP);
  const prevOpponentHP = useRef(duelState.opponentHP);

  const playerSpellDetails = playerCard ? getSpellById(playerCard) : null;
  const oppSpellDetails = opponentCard ? getSpellById(opponentCard) : null;

  // 伤害数字动画
  // 伤害数字动画
  const [showCritEffect, setShowCritEffect] = useState(false); // 暴击特效

  const [showBloodFlash, setShowBloodFlash] = useState(false);
  const [projectiles, setProjectiles] = useState<{id: number, type: string, x: number, y: number}[]>([]);

  const addDamageNumber = (damage: number, isPlayer: boolean, isCrit: boolean = false) => {
    HapticService.medium(); // 伤害数字弹出时的反馈
    if (isCrit) HapticService.heavy();

    if (isPlayer) {
       setShowBloodFlash(true);
       setTimeout(() => setShowBloodFlash(false), 400);
    }

    const id = damageIdRef.current++; // Fixed: Increment current
    
    // Position logic...
    const x = isPlayer ? 50 + Math.random() * 50 : 50 + Math.random() * 50; 
    const y = isPlayer ? 150 : 50; // Adjusted for visibility
    setDamageNumbers(prev => [...prev, { id, value: damage, x, y, isPlayer, isCrit }]);
    
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id));
    }, 1200);
  };

  // 监听HP变化触发强力震动 & 伤害显示
  React.useEffect(() => {
    if (duelState.playerHP < prevPlayerHP.current) {
        HapticService.heavy(); 
    }
    prevPlayerHP.current = duelState.playerHP;

    if (duelState.opponentHP < prevOpponentHP.current) {
        HapticService.heavy(); 
    }
    prevOpponentHP.current = duelState.opponentHP;
  }, [duelState.playerHP, duelState.opponentHP]);

  // 监听战斗日志以触发特效
  React.useEffect(() => {
    if (effectMessages.length > 0) {
      const lastMsg = effectMessages[effectMessages.length - 1];
      const isCrit = lastMsg.includes('暴击');
      
      if (isCrit) {
        setShowCritEffect(true);
        setTimeout(() => setShowCritEffect(false), 800); // 闪光持续时间
      }

      if (lastMsg.includes('造成') || lastMsg.includes('受到')) {
        const damageMatch = lastMsg.match(/(\d+) 点伤害/);
        if (damageMatch) {
          const damage = parseInt(damageMatch[1]);
          // "造成" means player dealt damage (opponent took it)
          // "受到" means player took damage
          // But wait, "造成" usually implies Subject (Player?) dealt to Object? 
          // Log usually says "你造成了 X 点伤害" or "对手造成了 X 点伤害".
          // Or "你受到 X 点伤害". 
          // Let's assume standard log format.
          // Correct mapping based on typical log: "Player dealt X" -> isPlayer (SOURCE) damage? No, isPlayerUsually means TARGET in this context?
          // Let's stick to simple: if "受到" (took damage), it's consistent with HP check.
          
          const isPlayerTarget = lastMsg.includes('受到') || (lastMsg.includes('造成') && lastMsg.includes('对手')); 
          // If "对手造成...", Player is target. 
          // If "你造成...", Opponent is target.
          // Simplified:
          const isOpponentTarget = !isPlayerTarget;

          addDamageNumber(damage, isOpponentTarget, isCrit); 
        }
      }
    }
  }, [effectMessages]);

  const handlePlayCard = (spellId: SpellType) => {
    const id = Date.now();
    // 基础投射物定位
    setProjectiles(prev => [...prev, { id, type: 'player', x: 50, y: 80 }]);
    onPlayCard(spellId);
    setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== id)), 600);
  };

  // 监听对手出牌触发投射物
  const prevOppCard = useRef<SpellType | null>(null);
  React.useEffect(() => {
    if (opponentCard && opponentCard !== prevOppCard.current) {
       const id = Date.now();
       setProjectiles(prev => [...prev, { id, type: 'opp', x: 50, y: 15 }]);
       setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== id)), 600);
    }
    prevOppCard.current = opponentCard;
  }, [opponentCard]);

  // ... (rest of component)
  
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
        <img 
          src="/ui/bg_arena.webp" 
          alt="Arena" 
          className="absolute inset-0 w-full h-full object-cover animate-[breath_20s_ease-in-out_infinite]"
        />
        {/* Vignette & Atmosphere */}
        <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-transparent to-black/95" />
        
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
              name={duelState.aiProfile?.name || "黑魔法师"}
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
      <div className="w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-4 pb-2 px-1 z-30 flex-shrink-0 relative">
        <div className="max-w-6xl mx-auto h-full relative flex flex-col justify-end">
          
          {/* 左下角：玩家状态 (PlayerFrame) - 移动端绝对定位缩放 */}
          <div className="absolute left-0 bottom-2 z-40 w-56 scale-[0.65] origin-bottom-left md:static md:w-72 md:scale-100 pointer-events-auto">
             <PlayerFrame 
              isPlayer={true}
              name="玩家"
              hp={duelState.playerHP}
                armor={duelState.playerArmor}
                maxHp={GAME_CONFIG.maxHP}
                mana={duelState.playerMana}
                maxMana={duelState.playerMaxMana}
                effects={duelState.playerEffects}
                isShaking={isPlayerShaking}
              />
          </div>

          {/* 右下角：功能按钮 - 移动端绝对定位缩放 */}
          <div className="absolute right-0 bottom-2 z-40 flex flex-col gap-2 w-20 scale-90 origin-bottom-right md:static md:w-32 md:scale-100 md:flex-col pointer-events-auto">
             {/* 结束回合按钮 - 3D 机械质感 */}
             <button 
                onClick={() => onPass && onPass()}
                disabled={phase !== 'PLAYER_TURN'}
                className={`
                  relative w-full h-16 md:h-24 flex flex-col items-center justify-center rounded-xl transition-all duration-300 group/btn shadow-2xl overflow-hidden
                  ${phase === 'PLAYER_TURN' 
                    ? 'bg-gradient-to-b from-amber-600 to-amber-900 border-b-8 border-amber-950 active:border-b-0 active:translate-y-2 hover:brightness-110 active:shadow-inner' 
                    : 'bg-slate-900/60 border-b-8 border-slate-950 opacity-50 grayscale cursor-not-allowed'}
                `}
              >
                {/* 内部金属光泽 */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 pointer-events-none" />
                
                <div className={`text-2xl md:text-4xl transition-transform ${phase === 'PLAYER_TURN' ? 'group-hover/btn:scale-110' : ''}`}>
                  {phase === 'PLAYER_TURN' ? '⌛' : '💤'}
                </div>
                <div className="text-[10px] md:text-sm font-black uppercase tracking-tighter mt-1 text-amber-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {phase === 'PLAYER_TURN' ? '结束回合' : '对方回合'}
                </div>

                {/* 发光提示 */}
                {phase === 'PLAYER_TURN' && (
                  <div className="absolute -inset-2 bg-yellow-500/20 blur-xl animate-pulse -z-10" />
                )}
             </button>
             <button 
                onClick={onSurrender}
                className="w-full h-8 md:h-10 flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-950/60 text-[10px] font-bold text-red-300 hover:bg-red-900/80"
              >
                <LogOut size={10} strokeWidth={3} />
                <span>退</span>
             </button>
          </div>

          {/* 中间：手牌区与技能区 - 移动端两侧留空防止遮挡 */}
          <div className="w-full flex flex-col items-center justify-end md:pl-72 md:pr-32 pb-1 md:pb-0 relative z-30 pointer-events-none">
            
            {/* 英雄技能行 */}
            <div className="flex justify-center gap-2 mb-1 md:mb-4 pointer-events-auto">
                {(['hero_fire', 'hero_vine', 'hero_ice', 'hero_thunder', 'hero_rock'] as const).map((id) => {
                  const spell = getSpellById(id);
                  const canUse = phase === 'PLAYER_TURN' && !duelState.heroSkillsUsed;
                  return (
                    <div key={id} className="relative transition-all duration-300 transform hover:-translate-y-2 scale-[0.55] md:scale-90 origin-bottom">
                      <SpellCard 
                        spell={spell} 
                        onClick={() => canUse && handlePlayCard(id)}
                        isAffordable={canUse}
                        disabled={!canUse}
                      />
                      {!canUse && <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center font-bold text-xs text-white/50">已用</div>}
                    </div>
                  );
                })}
            </div>

            {/* 主手牌区 */}
            <div className="flex justify-center items-end -space-x-10 md:-space-x-4 pointer-events-auto min-h-[100px] md:min-h-[160px]">
                {duelState.playerHand.map((id, index) => {
                  const isAffordable = playableCards.includes(id);
                  const total = duelState.playerHand.length;
                  const middleIndex = (total - 1) / 2;
                  // 移动端扇形展开修正
                  const rotation = (index - middleIndex) * 5;
                  const xOffset = (index - middleIndex) * 10;
                  const yOffset = Math.abs(index - middleIndex) * (window.innerWidth < 768 ? 6 : 10);

                  return (
                    <div 
                      key={`${id}-${index}`} 
                      className={`
                        relative transition-all duration-300 transform origin-bottom
                        ${phase === 'PLAYER_TURN' && isAffordable ? 'hover:-translate-y-16 hover:scale-125 hover:z-50 cursor-pointer' : ''}
                      `}
                      style={{ 
                        zIndex: index,
                        transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                        marginLeft: index === 0 ? 0 : window.innerWidth < 768 ? '-30px' : '-40px'
                      }}
                    >
                      <SpellCard 
                        spell={getSpellById(id)} 
                        onClick={() => isAffordable && phase === 'PLAYER_TURN' && handlePlayCard(id)}
                        isAffordable={isAffordable}
                        disabled={!isAffordable || phase !== 'PLAYER_TURN'}
                        isSelected={false}
                        isSmall={window.innerWidth < 768} // 移动端使用小卡模式
                      />
                    </div>
                  );
                })}
                {duelState.playerHand.length === 0 && (
                   <div className="h-24 flex items-center text-white/30 text-xs italic">空手牌</div>
                )}
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
        @keyframes critFlash {
          0% { opacity: 0; transform: scale(1); }
          10% { opacity: 0.8; transform: scale(1.05); }
          100% { opacity: 0; transform: scale(1); }
        }
        @keyframes breath {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.1); }
        }
        @keyframes projectile {
          0% { transform: translateY(0) scale(1.5); opacity: 1; filter: blur(4px); }
          100% { transform: translateY(-400px) scale(0.5); opacity: 0; filter: blur(10px); }
        }
        @keyframes projectile-opp {
          0% { transform: translateY(0) scale(1.5); opacity: 1; filter: blur(4px); }
          100% { transform: translateY(400px) scale(0.5); opacity: 0; filter: blur(10px); }
        }
        .animate-projectile {
          animation: projectile 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-projectile-opp {
          animation: projectile-opp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Crit Effect Overlay */}
      {showCritEffect && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
           <div className="absolute inset-0 bg-white/30 animate-[critFlash_0.5s_ease-out_forwards] mix-blend-overlay" />
           <div className="absolute inset-0 bg-red-500/10 animate-[pulse_0.2s_ease-in-out_2]" />
           <div className="text-6xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] animate-[bounce_0.5s_infinite] rotate-[-15deg] border-4 border-red-500 bg-black/50 p-4 rounded-xl uppercase tracking-widest">
             CRITICAL!
           </div>
        </div>
      )}

      {/* Blood Hurt Flash Overlay */}
      {showBloodFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none shadow-[inset_0_0_100px_rgba(220,38,38,0.8)] animate-pulse" />
      )}

      {/* Projectiles Layer */}
      <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
        {projectiles.map(p => (
           <div 
            key={p.id}
            className={`absolute w-12 h-12 rounded-full blur-md z-50 ${p.type === 'player' ? 'bg-gradient-to-t from-purple-500 to-white animate-projectile' : 'bg-gradient-to-b from-red-500 to-white animate-projectile-opp'}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, marginLeft: '-24px' }}
           >
              {/* 核心光点 */}
              <div className="absolute inset-0 bg-white rounded-full scale-50 blend-screen" />
           </div>
        ))}
      </div>
    </div>
  );
};

export default BattleArena;
