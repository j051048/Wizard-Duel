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

const EFFECT_DESCRIPTIONS: Record<string, string> = {
  burn: '每回合结束时受到伤害',
  tangle: '下一张法术的法力消耗增加',
  frozen: '无法打出任何法术',
  thawed: '免疫冻结效果（刚解除冻结）',
  charge: '下一次同属性法术伤害翻倍', // If added later
  fortify: '获得额外护甲', // If added later
};

const StatusEffectBadge: React.FC<StatusEffectBadgeProps> = ({ effect }) => {
  const getBadgeStyle = () => {
    switch (effect.type) {
      case 'burn': return 'bg-orange-950/80 border-orange-500/50 text-orange-200';
      case 'tangle': return 'bg-green-950/80 border-green-500/50 text-green-200';
      case 'frozen': return 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200';
      case 'thawed': return 'bg-blue-900/80 border-blue-400/50 text-blue-200';
      default: return 'bg-gray-900/80 border-gray-500/50 text-gray-200';
    }
  };

  const getEffectIcon = () => {
    switch (effect.type) {
      case 'burn': return '/effects/effect-burn.webp';
      case 'tangle': return '/effects/effect-tangle.webp';
      case 'frozen': return '/effects/effect-freeze.webp';
      case 'thawed': return '/effects/effect-thawed.webp'; // Assuming existence or fallback
      default: return null;
    }
  };

  // 备用 emoji
  const getEmoji = () => {
    switch (effect.type) {
      case 'burn': return '🔥';
      case 'tangle': return '🌿';
      case 'frozen': return '❄️';
      case 'thawed': return '💧';
      default: return '✨';
    }
  };

  const iconSrc = getEffectIcon();

  return (
    <div 
      className={`
        relative group cursor-help
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
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : (
        <span>{getEmoji()}</span>
      )}
      
      {/* Fallback emoji if image fails (requires structure tweak, simplified here) */}
      
      <span>{getMechanicName(effect.type)}</span>
      
      {effect.duration > 1 && (
        <span className="ml-0.5 w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[9px]">
          {effect.duration}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-32 bg-black/90 text-white text-[10px] p-2 rounded border border-white/20 z-50 pointer-events-none whitespace-normal text-center shadow-xl backdrop-blur-md">
        <div className="font-bold mb-0.5 text-yellow-300">{getMechanicName(effect.type)}</div>
        <div className="text-gray-300 leading-tight">{EFFECT_DESCRIPTIONS[effect.type] || '未知效果'}</div>
        <div className="mt-1 text-gray-500 text-[9px]">持续 {effect.duration} 回合</div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90"></div>
      </div>
    </div>
  );
};

// ======== 主组件：玩家信息框 (Patch 3.0: Projection) ========
interface PlayerFrameProps {
  isPlayer: boolean;
  name: string;
  hp: number;
  armor?: number; 
  maxHp: number;
  mana: number;
  maxMana: number;
  effects: StatusEffect[];
  avatarSrc?: string;
  isShaking?: boolean;
  projection?: {
    hpChange: number; // Net HP Change (Negative = Damage)
    armorChange: number; // Net Armor Change
  } | null;
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
  projection
}) => {
  // 确定资源路径
  const bgFrame = isPlayer ? "/ui/frames/player_hud_v4.png" : "/ui/frames/opponent_hud_v4.png";
  const actualAvatarSrc = avatarSrc || (isPlayer ? '/avatars/player-wizard.webp' : '/avatars/opponent-sorcerer.webp');

  const projectedHp = Math.max(0, Math.min(maxHp, hp + (projection?.hpChange || 0)));
  const projectedArmor = Math.max(0, armor + (projection?.armorChange || 0));
  
  // Projection Visuals
  const showDamage = projection && projection.hpChange < 0;
  const showHeal = projection && projection.hpChange > 0;
  const showArmorGain = projection && projection.armorChange > 0;
  const showArmorLoss = projection && projection.armorChange < 0;

  return (
    <div className={`relative group w-[380px] h-[120px] sm:w-[480px] sm:h-[140px] md:w-[600px] md:h-[160px] transition-all duration-300 ${isShaking ? 'animate-shake-strong' : ''}`}>
      
      {/* HUD Frame */}
      <img 
        src={bgFrame}
        alt="HUD Frame"
        className="absolute inset-0 w-full h-full object-contain z-10 drop-shadow-2xl select-none pointer-events-none"
      />

      {/* Avatar Layer */}
      <div 
        className="absolute z-20 rounded-full overflow-hidden bg-slate-900 shadow-2xl transition-all duration-300"
        style={{
            left: '5.5%', 
            top: '16%',
            height: '68%',
            aspectRatio: '1/1',
            boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(0,0,0,0.8)',
            border: '2px solid #1a1a1a',
            filter: showDamage ? 'saturate(1.5) contrast(1.2)' : 'none' // Subtle effect on damage
        }}
      >
         <img 
           src={actualAvatarSrc} 
           alt={name}
           className="w-full h-full object-cover"
         />
         {/* Projection Overlay (Red Flash / Green Glow) */}
         {showDamage && <div className="absolute inset-0 bg-red-500/30 animate-pulse mix-blend-overlay" />}
         {showHeal && <div className="absolute inset-0 bg-green-500/20 animate-pulse mix-blend-overlay" />}

         <div className="absolute inset-0 rounded-full border-[2px] border-[#c5a059] opacity-90 mix-blend-overlay" />
         <div className="absolute inset-0 shadow-[inset_0_4px_15px_rgba(0,0,0,0.8)] pointer-events-none" />
         
         {/* Projection Text (Centred on Avatar) */}
         {projection && (projection.hpChange !== 0) && (
            <div className={`absolute inset-0 flex items-center justify-center font-black text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)] ${projection.hpChange < 0 ? 'text-red-500' : 'text-green-400'}`}>
                {projection.hpChange > 0 ? '+' : ''}{projection.hpChange}
            </div>
         )}
      </div>

      {/* Info Content */}
      <div className="absolute z-30 flex flex-col pl-4"
           style={{
               left: '26%', 
               right: '6%',
               top: '28%',
               bottom: '12%'
           }}
      >
         {/* Name */}
         <div className="absolute -top-6 left-1 text-sm sm:text-base font-wizard font-bold tracking-widest uppercase truncate flex items-center gap-2"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,1)' }}
         >
            <span className={isPlayer ? 'text-[#f0e6d2]' : 'text-[#e2b8b8]'}>{name}</span>
         </div>

         {/* Health Bar Slot */}
         <div className="relative w-[96%] h-[28%] flex items-center pr-1 mt-1">
             <div className="relative w-full h-full">
                <HealthBar current={hp} max={maxHp} isPlayer={isPlayer} />
                
                {/* Projection Ghost Bar */}
                {/* Using a simple overlay absolute positioned */}
                 {showDamage && (
                    <div 
                        className="absolute top-0 bottom-0 bg-white/50 animate-pulse"
                        style={{
                            left: `${(projectedHp / maxHp) * 100}%`,
                            width: `${(Math.abs(projection!.hpChange) / maxHp) * 100}%`,
                            background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,0,0,0.5) 4px, rgba(255,0,0,0.5) 8px)'
                        }}
                    />
                 )}
                 {showHeal && (
                    <div 
                        className="absolute top-0 bottom-0 bg-green-400/50 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                        style={{
                            left: `${(hp / maxHp) * 100}%`,
                            width: `${(Math.abs(projection!.hpChange) / maxHp) * 100}%`,
                        }}
                    />
                 )}
             </div>
         </div>

         {/* Bottom: Mana & Buffs */}
         <div className="flex items-center gap-3 mt-auto h-[40%] px-1">
             <div className="transform scale-90 origin-left flex items-center">
                 <ManaCrystals current={mana} max={maxMana} />
             </div>
             
             <div className="flex gap-1 overflow-visible ml-auto pb-1">
                 {effects.slice(0, 4).map((effect, i) => (
                    <div key={i} className="transform scale-75 origin-right hover:scale-100 transition-transform">
                        <StatusEffectBadge effect={effect} />
                    </div>
                 ))}
             </div>
         </div>
      </div>

      {/* Armor Bubble */}
      {(armor > 0 || (projection && projection.armorChange !== 0)) && (
        <div className="absolute -top-2 left-[20%] z-40 animate-bounce-slight">
           <div className={`relative w-8 h-8 flex items-center justify-center rounded-full border-2 shadow-[0_0_10px_rgba(0,0,0,0.8)] ring-1 ring-white/20 transition-colors duration-300
               ${(showArmorGain || showArmorLoss) ? 'bg-slate-700 border-white/50 scale-110' : 'bg-slate-800 border-slate-500'}
           `}>
             <Shield className={`w-4 h-4 ${showArmorLoss ? 'text-red-400' : showArmorGain ? 'text-green-300' : 'text-slate-300'}`} />
             
             {/* Base Value */}
             <span className="absolute -bottom-1 -right-1 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-700 shadow-sm">
                {armor}
             </span>

             {/* Change Value */}
             {projection && projection.armorChange !== 0 && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 font-bold text-xs drop-shadow-md whitespace-nowrap ${projection.armorChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {projection.armorChange > 0 ? '+' : ''}{projection.armorChange}
                </span>
             )}
           </div>
        </div>
      )}

    </div>
  );
};


export default PlayerFrame;
