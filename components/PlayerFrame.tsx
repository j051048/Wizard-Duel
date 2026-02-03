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
    const diff = percentage - displayPercentage;
    if (Math.abs(diff) > 0.5) {
      const step = diff / 10;
      const timer = setInterval(() => {
        setDisplayPercentage(prev => {
          const next = prev + step;
          if ((step > 0 && next >= percentage) || (step < 0 && next <= percentage)) {
            clearInterval(timer);
            return percentage;
          }
          return next;
        });
      }, 30);
      return () => clearInterval(timer);
    } else {
      setDisplayPercentage(percentage);
    }
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

      {/* 数值显示与图标 - 移出Bar体，更清晰 */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
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
  <div className="flex gap-1.5 items-center justify-center py-1">
    {Array.from({ length: max }).map((_, i) => (
      <div 
        key={i}
        className={`
          relative transition-all duration-300
          ${i < current ? 'opacity-100 scale-100 brightness-110' : 'opacity-40 scale-90 grayscale'}
        `}
        style={{ width: '24px', height: '24px' }}
      >
        <img 
          src="/icons/icon-mana.webp" 
          alt="Mana" 
          className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
          onError={(e) => {
            // 图片加载失败时回退到CSS图形
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        
        {/* CSS 备用/充能动画 */}
        {i < current ? (
          <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-[4px] animate-pulse -z-10" />
        ) : (
          <div className="absolute inset-0 bg-gray-500/20 rounded-full -z-10" />
        )}
      </div>
    ))}
    
    {/* 数值提示 */}
    <span className="ml-2 text-xs font-bold text-blue-300 drop-shadow-md flex items-center gap-1">
      {current}/{max}
    </span>
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
  armor = 0, // 默认为 0
  maxHp,
  mana,
  maxMana,
  effects,
  avatarSrc,
  isShaking = false,
}) => {
  const defaultAvatar = isPlayer ? '🧙‍♂️' : '💀';
  const actualAvatarSrc = avatarSrc || (isPlayer ? '/avatars/player-wizard.webp' : '/avatars/opponent-sorcerer.webp');

  return (
    <div 
      className={`
        relative p-4 md:p-6 rounded-2xl backdrop-blur-md transition-all duration-300
        ${isPlayer 
          ? 'bg-gradient-to-br from-purple-900/90 to-indigo-900/90 border-2 border-purple-400/60' 
          : 'bg-gradient-to-br from-red-900/90 to-rose-900/90 border-2 border-red-400/60'
        }
        shadow-2xl
        ${isShaking ? 'animate-shake-strong' : ''}
      `}
    >
      {/* 护甲显示 (Armor Overlay) */}
      {armor > 0 && (
        <div className="absolute -top-4 right-8 z-40 transition-all duration-500 animate-in fade-in zoom-in spin-in-3">
          <div className="relative drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            {/* 盾牌背景 (CSS绘制或图片) */}
            <div className="w-10 h-12 md:w-12 md:h-14 bg-gradient-to-b from-gray-200 to-gray-400 rounded-b-full border-2 border-gray-100 shadow-inner flex items-center justify-center">
              <div className="absolute inset-1 border border-gray-500/30 rounded-b-full" />
              {/* 光泽 */}
              <div className="absolute top-0 right-0 w-1/2 h-full bg-white/20 rounded-tr-full rounded-br-full" />
            </div>
            
            {/* 护甲数值 */}
            <span className="absolute inset-0 flex items-center justify-center font-black text-gray-800 text-base md:text-lg font-mono">
              {armor}
            </span>
          </div>
        </div>
      )}
      {/* 发光边框效果 */}
      <div className={`
        absolute -inset-0.5 rounded-2xl opacity-50 blur-sm -z-10
        ${isPlayer ? 'bg-purple-500' : 'bg-red-500'}
      `} />

      {/* 装饰角标 */}
      <div className={`absolute -top-1.5 -left-1.5 w-5 h-5 ${isPlayer ? 'bg-purple-400' : 'bg-red-400'} rotate-45 shadow-lg`} />
      <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 ${isPlayer ? 'bg-purple-400' : 'bg-red-400'} rotate-45 shadow-lg`} />

      <div className="flex items-center gap-4">
        {/* 头像 - 增大到 80px -> 96px(md) */}
        <div 
          className={`
            relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0
            border-4 ${isPlayer ? 'border-purple-400' : 'border-red-400'}
            shadow-xl ${isPlayer ? 'shadow-purple-500/60' : 'shadow-red-500/60'}
          `}
        >
          <img 
            src={actualAvatarSrc}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.parentElement) {
                target.parentElement.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center text-4xl ${isPlayer ? 'bg-purple-900' : 'bg-red-900'}">
                    ${defaultAvatar}
                  </div>
                `;
              }
            }}
          />
          {/* 头像边框光效 */}
          <div className={`
            absolute inset-0 rounded-full 
            border-2 ${isPlayer ? 'border-purple-200/40' : 'border-red-200/40'} 
            animate-pulse
          `} />
          
          {/* 外圈发光 */}
          <div className={`
            absolute -inset-1 rounded-full opacity-40 blur-sm -z-10
            ${isPlayer ? 'bg-purple-400' : 'bg-red-400'}
          `} />
        </div>

        {/* 信息区 */}
        <div className="flex-1 space-y-2.5 min-w-0">
          {/* 名称 */}
          <div className={`
            text-base font-wizard font-bold tracking-widest truncate
            ${isPlayer ? 'text-purple-100' : 'text-red-100'}
            drop-shadow-lg
          `}>
            {name}
          </div>

          {/* 血条 */}
          <HealthBar current={hp} max={maxHp} isPlayer={isPlayer} />

          {/* 法力水晶 */}
          <ManaCrystals current={mana} max={maxMana} />
        </div>
      </div>

      {/* 状态效果 */}
      {effects.length > 0 && (
        <div className="flex gap-2 mt-3 justify-center flex-wrap">
          {effects.map((effect, i) => (
            <StatusEffectBadge key={`${effect.type}-${i}`} effect={effect} />
          ))}
        </div>
      )}

      {/* 动画样式 */}
      <style>{`
        @keyframes shake-strong {
          0%, 100% { transform: translateX(0) rotate(0); }
          10% { transform: translateX(-6px) rotate(-1deg); }
          20% { transform: translateX(6px) rotate(1deg); }
          30% { transform: translateX(-6px) rotate(-1deg); }
          40% { transform: translateX(6px) rotate(1deg); }
          50% { transform: translateX(-4px) rotate(0); }
          60% { transform: translateX(4px) rotate(0); }
          70% { transform: translateX(-2px) rotate(0); }
          80% { transform: translateX(2px) rotate(0); }
          90% { transform: translateX(-1px) rotate(0); }
        }
        .animate-shake-strong {
          animation: shake-strong 0.6s ease-in-out;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default PlayerFrame;
