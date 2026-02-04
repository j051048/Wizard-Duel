/**
 * PlayerFrame - 玩家/对手信息框组件
 * 
 * 专业游戏级设计：
 * - 增大头像尺寸（80px）
 * - 血条带平滑动画过渡
 * - 法力水晶更大更清晰
 * - 震动效果更强烈
 * - 增加受伤闪红效果
 */

import React, { useState, useEffect, useRef } from 'react';
import { StatusEffect } from '../types';
import { getMechanicName } from '../constants';
import { Shield } from 'lucide-react';

// ======== 子组件：血条（带动画） ========
interface HealthBarProps {
  current: number;
  max: number;
  isPlayer: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = ({ current, max, isPlayer }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = percentage <= 30;
  const isCritical = percentage <= 15;
  
  // 动画状态 - 血条平滑过渡
  const [displayPercentage, setDisplayPercentage] = useState(percentage);
  const [isHurt, setIsHurt] = useState(false);
  const prevPercentage = useRef(percentage);
  
  useEffect(() => {
    // 检测血量减少
    if (percentage < prevPercentage.current) {
      setIsHurt(true);
      setTimeout(() => setIsHurt(false), 300);
    }
    prevPercentage.current = percentage;
    
    // 平滑过渡到目标值
    if (Math.abs(percentage - displayPercentage) < 0.5) {
      setDisplayPercentage(percentage);
      return;
    }

    let rafId: number;
    const startTime = performance.now();
    const startValue = displayPercentage;
    const endValue = percentage;
    const duration = 400; // 400ms 动画时长

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (endValue - startValue) * eased;
      
      setDisplayPercentage(nextValue);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [percentage]);

  
  return (
    <div className="relative">
      <div className={`
        relative w-full h-7 md:h-9 bg-gray-900 rounded-lg overflow-hidden 
        border-2 ${isHurt ? 'border-red-400' : 'border-gray-700'} 
        shadow-inner transition-colors duration-200
      `}>
        {/* 伤害层（延迟消失的红色背景） */}
        <div 
          className="absolute inset-0 bg-red-600/50 transition-all duration-700 ease-out"
          style={{ width: `${prevPercentage.current}%` }}
        />
        
        {/* 血量填充 */}
        <div 
          className={`
            h-full relative z-10 transition-colors duration-300
            ${isCritical 
              ? 'bg-gradient-to-r from-red-900 to-red-600 animate-pulse' 
              : isLow 
                ? 'bg-gradient-to-r from-red-800 to-red-500' 
                : 'bg-gradient-to-r from-red-700 via-red-600 to-red-500'
            }
          `}
          style={{ width: `${displayPercentage}%`, transition: 'width 0.3s ease-out' }}
        >
          {/* 流动光效 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
        
        {/* 顶部高光 */}
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent z-10" />
        
        {/* 底部阴影 */}
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/30 to-transparent z-10" />
      </div>

      {/* 血条边框素材 (UI Asset) */}
      <img 
        src="/ui/health-bar-frame.webp" 
        alt="frame" 
        className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] pointer-events-none z-20 opacity-80 mix-blend-overlay"
        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
      />

      {/* 数值显示与图标 - 移出Bar体，更清晰 */}
      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
        <span className={`
          text-white text-sm font-bold drop-shadow-md tracking-wider flex items-center gap-1.5
          ${isCritical ? 'animate-pulse text-red-100' : ''}
          ${isHurt ? 'scale-110' : ''}
          transition-transform duration-200
        `}>
          <img 
            src="/icons/icon-health.webp" 
            alt="HP" 
            className="w-4 h-4 object-contain drop-shadow-sm" 
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
          <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {current}/{max}
          </span>
        </span>
      </div>
    </div>
  );
};

// ======== 子组件：法力水晶（使用图标素材） ========
interface ManaCrystalsProps {
  current: number;
  max: number;
}

export const ManaCrystals: React.FC<ManaCrystalsProps> = ({ current, max }) => (
  <div className="flex gap-1 items-center justify-center py-1">
    {Array.from({ length: max }).map((_, i) => (
      <div 
        key={i}
        className="relative w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-300 hover:scale-110"
      >
        <img 
            src={i < current ? "/ui/mana_crystal_active_v2.png" : "/ui/mana_crystal_inactive_v2.png"}
            alt={i < current ? "Full Mana" : "Empty Mana"} 
            className={`w-full h-full object-contain filter drop-shadow-md transition-all duration-500 ${i < current ? 'brightness-110 hover:brightness-125' : 'grayscale opacity-80'}`} 
        />
        {/* Active Crystal Glow */}
        {i < current && (
            <div className="absolute inset-2 bg-purple-500/30 rounded-full blur-[4px] animate-pulse -z-10" />
        )}
      </div>
    ))}
    {/* Text value for clarity */}
    <div className="ml-2 font-wizard font-bold text-lg text-purple-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center">
        <span>{current}</span>
        <span className="text-purple-500/80 mx-0.5 text-sm">/</span>
        <span className="text-sm text-purple-400">{max}</span>
    </div>
  </div>
);

// ======== 子组件：状态效果标签（使用效果素材） ========
interface StatusEffectBadgeProps {
  effect: StatusEffect;
}

const StatusEffectBadge: React.FC<StatusEffectBadgeProps> = ({ effect }) => {
  const getBadgeStyle = () => {
    switch (effect.type) {
      case 'burn': return 'bg-orange-950/80 border-orange-500/50 text-orange-200';
      case 'tangle': return 'bg-green-950/80 border-green-500/50 text-green-200';
      case 'frozen': return 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200';
      case 'charge': return 'bg-yellow-950/80 border-yellow-500/50 text-yellow-200';
      case 'fortify': return 'bg-stone-950/80 border-stone-500/50 text-stone-200';
      default: return 'bg-gray-900/80 border-gray-500/50 text-gray-200';
    }
  };

  const getEffectIcon = () => {
    switch (effect.type) {
      case 'burn': return '/effects/effect-burn.webp';
      case 'tangle': return '/effects/effect-tangle.webp';
      case 'frozen': return '/effects/effect-freeze.webp';
      case 'charge': return '/effects/effect-charge.webp';
      case 'fortify': return '/effects/effect-fortify.webp';
      default: return null;
    }
  };

  // 备用 emoji
  const getEmoji = () => {
    switch (effect.type) {
      case 'burn': return '🔥';
      case 'tangle': return '🌿';
      case 'frozen': return '❄️';
      default: return '✨';
    }
  };

  const iconSrc = getEffectIcon();

  return (
    <div 
      className={`
        px-3 py-1 rounded-full text-[10px] font-bold uppercase
        border shadow-lg flex items-center gap-1.5
        ${getBadgeStyle()}
        animate-float
      `}
    >
      {iconSrc ? (
        <img 
          src={iconSrc} 
          alt={effect.type} 
          className="w-4 h-4 object-contain"
          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
        />
      ) : (
        <span>{getEmoji()}</span>
      )}
      
      <span>{getMechanicName(effect.type)}</span>
      
      {effect.duration > 1 && (
        <span className="ml-0.5 w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[9px]">
          {effect.duration}
        </span>
      )}
    </div>
  );
};

// ======== 主组件：玩家信息框 ========
interface PlayerFrameProps {
  isPlayer: boolean;
  name: string;
  hp: number;
  armor?: number; // [P0] 新增护甲属性
  maxHp: number;
  mana: number;
  maxMana: number;
  effects: StatusEffect[];
  avatarSrc?: string;
  isShaking?: boolean;
}

export const PlayerFrame: React.FC<PlayerFrameProps> = ({
  isPlayer,
  name,
  hp,
  armor = 0,
  maxHp,
  mana,
  maxMana,
  effects,
  avatarSrc,
  isShaking = false,
}) => {
  // 确定资源路径
  const bgFrame = isPlayer ? "/ui/frames/player_hud_v4.png" : "/ui/frames/opponent_hud_v4.png";
  const defaultAvatar = isPlayer ? '🧙‍♂️' : '💀';
  const actualAvatarSrc = avatarSrc || (isPlayer ? '/avatars/player-wizard.webp' : '/avatars/opponent-sorcerer.webp');

  return (
    <div className={`relative group w-[380px] h-[120px] sm:w-[480px] sm:h-[140px] md:w-[580px] md:h-[170px] transition-all duration-300 ${isShaking ? 'animate-shake-strong' : ''}`}>
      
      {/* === Layer 0: Content Underlay (Avatar needs to be behind the frame) === */}
      {/* 调整：生成图的镂空可能不是透明的（通常是白底或黑底），所以策略改为：
          让元素浮在图片"之上"，手动对齐到视觉槽位中。 
          如果用户后续能提供透明底图更好，但现在我们假设需要覆盖。
      */}

      {/* --- HUD FRAME BACKGROUND --- */}
      <img 
        src={bgFrame}
        alt="HUD Frame"
        className="absolute inset-0 w-full h-full object-contain z-20 drop-shadow-xl select-none pointer-events-none mix-blend-screen brightness-110 contrast-125"
      />

      {/* === Layer 1: Avatar Slot === */}
      {/* 
         根据生成的图片结构 (左圆右长条)，大概位置：
         Left: ~2-5%, Top: ~10%, Height: ~80% (Circle)
      */}
      <div 
        className="absolute z-10 rounded-full overflow-hidden bg-slate-900 border-2 border-black/50 shadow-inner"
        style={{
            left: '3.5%', 
            top: '12%',
            height: '76%',
            aspectRatio: '1/1',
        }}
      >
         <img 
           src={actualAvatarSrc} 
           alt={name}
           className="w-full h-full object-cover"
           onError={(e) => {
               (e.target as HTMLImageElement).style.display = 'none';
               // Fallback logic could be added here
           }} 
         />
         {/* Inner Shadow to make it look recessed */}
         <div className="absolute inset-0 shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)] pointer-events-none" />
      </div>

      {/* === Layer 2: Info Content === */}
      <div className="absolute z-30 flex flex-col justify-center"
           style={{
               left: '26%', // Avatar takes up ~25% width
               right: '4%',
               top: '14%',
               bottom: '12%'
           }}
      >
         {/* Top Row: Name & HP */}
         <div className="flex items-center justify-between mb-1 px-2">
            <span className={`
                text-sm sm:text-base font-wizard font-bold tracking-widest uppercase truncate
                ${isPlayer ? 'text-amber-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-red-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]'}
            `}>
                {name}
            </span>
         </div>

         {/* Middle: Health Bar Slot */}
         <div className="relative w-full h-[30%] sm:h-[35%] rounded-md overflow-hidden shadow-inner bg-black/40 mb-1">
             <HealthBar current={hp} max={maxHp} isPlayer={isPlayer} />
         </div>

         {/* Bottom: Mana & Buffs */}
         <div className="flex items-center justify-between px-1 h-[30%] text-xs sm:text-sm">
             <div className="transform scale-90 sm:scale-100 origin-left">
                 <ManaCrystals current={mana} max={maxMana} />
             </div>
             
             {/* Status Badge Row */}
             <div className="flex gap-1 overflow-visible">
                 {effects.slice(0, 3).map((effect, i) => (
                    <div key={i} className="transform scale-75 origin-right">
                        <StatusEffectBadge effect={effect} />
                    </div>
                 ))}
             </div>
         </div>
      </div>

      {/* Armor Bubble - Float Outside */}
      {armor > 0 && (
        <div className="absolute top-0 left-[20%] z-40 animate-bounce-slight">
           <div className="relative w-8 h-8 flex items-center justify-center bg-slate-200 rounded-full border-2 border-slate-500 shadow-lg">
             <Shield className="w-5 h-5 text-slate-700" />
             <span className="absolute -bottom-1 -right-1 bg-black text-white text-[10px] px-1 rounded-full">{armor}</span>
           </div>
        </div>
      )}

    </div>
  );
};


export default PlayerFrame;
