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
    if (percentage < prevPercentage.current) {
      setIsHurt(true);
      setTimeout(() => setIsHurt(false), 300);
    }
    prevPercentage.current = percentage;
    
    if (Math.abs(percentage - displayPercentage) < 0.5) {
      setDisplayPercentage(percentage);
      return;
    }

    let rafId: number;
    const startTime = performance.now();
    const startValue = displayPercentage;
    const endValue = percentage;
    const duration = 400;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (endValue - startValue) * eased;
      setDisplayPercentage(nextValue);
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [percentage]);

  return (
    <div className="relative w-full h-full flex items-center">
      {/* 纯粹的血条容器 (无边框，只负责填充) */}
      <div className="w-full h-2.5 md:h-3.5 bg-black/60 rounded-full overflow-hidden shadow-inner backdrop-blur-sm">
        
        {/* 伤害残留层 (白/红闪烁) */}
        <div 
          className="absolute inset-y-0 left-0 bg-white/50 transition-all duration-300 ease-out"
          style={{ width: `${Math.max(percentage, displayPercentage)}%` }}
        />

        {/* 主血量条 */}
        <div 
          className={`
            h-full relative z-10 transition-all duration-300 rounded-r-sm
            ${isCritical 
               ? 'bg-gradient-to-r from-red-900 via-red-600 to-red-900 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]' 
               : 'bg-gradient-to-b from-red-500 via-red-600 to-red-800'
            }
          `}
          style={{ width: `${displayPercentage}%` }}
        >
          {/* 高光反射 - 增加玻璃感 */}
          <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </div>

      {/* 数值浮动在血条上方 (不盖住血条，而是位于其上方或正中) */}
      <div className="absolute -top-5 right-0 text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] flex items-center gap-1 opacity-90">
         <span className={isHurt ? 'text-red-300 scale-110 duration-100' : 'text-gray-200'}>
           {current}/{max}
         </span>
         {isCritical && <span className="animate-ping w-1.5 h-1.5 bg-red-500 rounded-full" />}
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
  const actualAvatarSrc = avatarSrc || (isPlayer ? '/avatars/player-wizard.webp' : '/avatars/opponent-sorcerer.webp');

  return (
    <div className={`relative group w-[380px] h-[120px] sm:w-[480px] sm:h-[140px] md:w-[600px] md:h-[160px] transition-all duration-300 ${isShaking ? 'animate-shake-strong' : ''}`}>
      
      {/* 
         HUD 层级结构重构 (Blizzard Style):
         Layer 1 (Bottom): 阴影/装饰
         Layer 2: HUD Frame (v4 Image) - 作为定锚
         Layer 3: Avatar (需要盖住左侧可能存在的任何瑕疵)
         Layer 4: Health Bar (嵌入右侧卡槽)
      */}

      {/* === Layer 2: HUD Frame === */}
      {/* 暂时移除 blending，因为在暗色背景下会让金属框体消失。我们让它作为实体遮挡。 */}
      <img 
        src={bgFrame}
        alt="HUD Frame"
        className="absolute inset-0 w-full h-full object-contain z-10 drop-shadow-2xl select-none pointer-events-none"
      />

      {/* === Layer 3: Avatar === */}
      {/* 
         位于左侧，圆形。增加一个厚重的边框来掩盖图层交界处。
         位置：根据 v4 图片结构微调。通常左侧 5%-25% 区域。
      */}
      <div 
        className="absolute z-20 rounded-full overflow-hidden bg-slate-900 shadow-2xl"
        style={{
            left: '2%', 
            top: '8%',
            height: '84%',
            aspectRatio: '1/1',
            boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(0,0,0,0.8)',
            border: '3px solid #1a1a1a' // 深色内衬圈
        }}
      >
         <img 
           src={actualAvatarSrc} 
           alt={name}
           className="w-full h-full object-cover"
         />
         {/* 精致的金属外环 (CSS 模拟) */}
         <div className="absolute inset-0 rounded-full border-[3px] border-[#c5a059] opacity-80 mix-blend-overlay" />
         <div className="absolute inset-0 rounded-full border border-white/20" />
         <div className="absolute inset-0 shadow-[inset_0_4px_15px_rgba(0,0,0,0.6)] pointer-events-none" />
      </div>

      {/* === Layer 4: Info Content === */}
      <div className="absolute z-30 flex flex-col justify-center pl-2"
           style={{
               left: '28%', // 头像右侧开始
               right: '5%',
               top: '18%',
               bottom: '15%'
           }}
      >
         {/* Top Row: Name */}
         <div className="flex items-end justify-between mb-1 px-1 h-[25%]">
            <span className={`
                text-base sm:text-lg font-wizard font-bold tracking-widest uppercase truncate
                ${isPlayer ? 'text-[#f0e6d2] drop-shadow-[0_2px_2px_rgba(0,0,0,1)]' : 'text-[#e2b8b8] drop-shadow-[0_2px_2px_rgba(0,0,0,1)]'}
            `}>
                {name}
            </span>
         </div>

         {/* Middle: Health Bar Slot */}
         <div className="relative w-full h-[20%] flex items-center pr-4">
             <HealthBar current={hp} max={maxHp} isPlayer={isPlayer} />
         </div>

         {/* Bottom: Mana & Buffs (Resources) */}
         <div className="flex items-center gap-4 mt-2 h-[35%] px-1">
             <div className="transform scale-90 origin-left">
                 <ManaCrystals current={mana} max={maxMana} />
             </div>
             
             {/* Status Badge Row */}
             <div className="flex gap-1 overflow-visible ml-auto">
                 {effects.slice(0, 4).map((effect, i) => (
                    <div key={i} className="transform scale-75 origin-right transition-all hover:scale-100">
                        <StatusEffectBadge effect={effect} />
                    </div>
                 ))}
             </div>
         </div>
      </div>

      {/* Armor Bubble - 独立悬浮，不再被框体限制 */}
      {armor > 0 && (
        <div className="absolute -top-2 left-[20%] z-40 animate-bounce-slight">
           <div className="relative w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full border-2 border-slate-500 shadow-[0_0_10px_rgba(0,0,0,0.8)] ring-1 ring-white/20">
             <Shield className="w-4 h-4 text-slate-300" />
             <span className="absolute -bottom-1 -right-1 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-700 shadow-sm">{armor}</span>
           </div>
        </div>
      )}

    </div>
  );
};


export default PlayerFrame;
