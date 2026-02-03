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
    <div className={`
      relative w-full h-7 bg-gray-900 rounded-lg overflow-hidden 
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
      
      {/* 数值显示 */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <span className={`
          text-white text-sm font-bold drop-shadow-lg tracking-wider
          ${isCritical ? 'animate-pulse text-red-200' : ''}
          ${isHurt ? 'scale-110' : ''}
          transition-transform duration-200
        `}>
          {current}/{max}
        </span>
      </div>
      
      {/* 顶部高光 */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent z-10" />
      
      {/* 底部阴影 */}
      <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/30 to-transparent z-10" />
    </div>
  );
};

// ======== 子组件：法力水晶（增大尺寸） ========
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
          ${i < current ? 'opacity-100 scale-100' : 'opacity-40 scale-90'}
        `}
        style={{ width: '22px', height: '28px' }}
      >
        {/* 水晶形状 */}
        <div 
          className={`
            absolute inset-0 
            ${i < current 
              ? 'bg-gradient-to-b from-blue-300 via-blue-500 to-blue-800 shadow-[0_0_12px_rgba(59,130,246,0.9)]' 
              : 'bg-gradient-to-b from-gray-500 to-gray-700'
            }
          `} 
          style={{ clipPath: 'polygon(50% 0%, 100% 30%, 85% 100%, 15% 100%, 0% 30%)' }}
        >
          {/* 水晶高光 */}
          {i < current && (
            <>
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/70 rounded-full blur-[2px]" />
              <div className="absolute top-3 left-1 w-1 h-3 bg-white/30 rounded-full blur-[1px] rotate-12" />
            </>
          )}
        </div>
        
        {/* 充能动画 */}
        {i < current && (
          <div className="absolute inset-0 animate-pulse opacity-50">
            <div 
              className="absolute inset-0 bg-gradient-to-t from-blue-400/50 to-transparent"
              style={{ clipPath: 'polygon(50% 0%, 100% 30%, 85% 100%, 15% 100%, 0% 30%)' }}
            />
          </div>
        )}
      </div>
    ))}
    
    {/* 数值提示 */}
    <span className="ml-2 text-xs font-bold text-blue-300 drop-shadow-md">
      {current}/{max}
    </span>
  </div>
);

// ======== 子组件：状态效果标签 ========
interface StatusEffectBadgeProps {
  effect: StatusEffect;
}

const StatusEffectBadge: React.FC<StatusEffectBadgeProps> = ({ effect }) => {
  const getBadgeStyle = () => {
    switch (effect.type) {
      case 'burn':
        return 'bg-gradient-to-r from-orange-600 to-red-600 text-orange-100 border-orange-400/60 shadow-orange-500/50';
      case 'tangle':
        return 'bg-gradient-to-r from-green-600 to-emerald-600 text-green-100 border-green-400/60 shadow-green-500/50';
      case 'frozen':
        return 'bg-gradient-to-r from-cyan-500 to-blue-500 text-cyan-100 border-cyan-400/60 shadow-cyan-500/50';
      default:
        return 'bg-gradient-to-r from-gray-600 to-gray-500 text-gray-100 border-gray-400/60 shadow-gray-500/50';
    }
  };

  const getEmoji = () => {
    switch (effect.type) {
      case 'burn': return '🔥';
      case 'tangle': return '🌿';
      case 'frozen': return '❄️';
      default: return '✨';
    }
  };

  return (
    <div 
      className={`
        px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase
        border backdrop-blur-sm shadow-lg
        ${getBadgeStyle()}
        animate-float
      `}
    >
      <span className="mr-1">{getEmoji()}</span>
      {getMechanicName(effect.type)}
      {effect.duration > 1 && <span className="ml-1 opacity-80">×{effect.duration}</span>}
    </div>
  );
};

// ======== 主组件：玩家信息框 ========
interface PlayerFrameProps {
  isPlayer: boolean;
  name: string;
  hp: number;
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
        relative p-4 rounded-2xl backdrop-blur-md transition-all duration-300
        ${isPlayer 
          ? 'bg-gradient-to-br from-purple-900/90 to-indigo-900/90 border-2 border-purple-400/60' 
          : 'bg-gradient-to-br from-red-900/90 to-rose-900/90 border-2 border-red-400/60'
        }
        shadow-2xl
        ${isShaking ? 'animate-shake-strong' : ''}
      `}
    >
      {/* 发光边框效果 */}
      <div className={`
        absolute -inset-0.5 rounded-2xl opacity-50 blur-sm -z-10
        ${isPlayer ? 'bg-purple-500' : 'bg-red-500'}
      `} />

      {/* 装饰角标 */}
      <div className={`absolute -top-1.5 -left-1.5 w-5 h-5 ${isPlayer ? 'bg-purple-400' : 'bg-red-400'} rotate-45 shadow-lg`} />
      <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 ${isPlayer ? 'bg-purple-400' : 'bg-red-400'} rotate-45 shadow-lg`} />

      <div className="flex items-center gap-4">
        {/* 头像 - 增大到 80px */}
        <div 
          className={`
            relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0
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
