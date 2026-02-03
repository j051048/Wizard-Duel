/**
 * PlayerFrame - 玩家/对手信息框组件
 * 
 * 炉石风格的头像框，包含头像、血条、法力水晶、状态效果
 */

import React from 'react';
import { StatusEffect } from '../types';
import { getMechanicName } from '../constants';

// ======== 子组件：血条 ========
interface HealthBarProps {
  current: number;
  max: number;
  isPlayer: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = ({ current, max, isPlayer }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = percentage <= 30;
  
  return (
    <div className="relative w-full h-6 bg-gray-900 rounded-full overflow-hidden border-2 border-gray-700 shadow-inner">
      {/* 血量填充 */}
      <div 
        className={`
          h-full transition-all duration-500 ease-out
          ${isLow 
            ? 'bg-gradient-to-r from-red-800 to-red-500 animate-pulse' 
            : isPlayer 
              ? 'bg-gradient-to-r from-red-700 to-red-500' 
              : 'bg-gradient-to-r from-red-800 to-red-600'
          }
        `}
        style={{ width: `${percentage}%` }}
      />
      
      {/* 数值显示 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-white text-xs font-bold drop-shadow-lg ${isLow ? 'animate-pulse' : ''}`}>
          {current}/{max}
        </span>
      </div>
      
      {/* 高光效果 */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent" />
    </div>
  );
};

// ======== 子组件：法力水晶 ========
interface ManaCrystalsProps {
  current: number;
  max: number;
}

export const ManaCrystals: React.FC<ManaCrystalsProps> = ({ current, max }) => (
  <div className="flex gap-1 items-center justify-center">
    {Array.from({ length: max }).map((_, i) => (
      <div 
        key={i}
        className={`
          w-5 h-6 relative transition-all duration-300
          ${i < current ? 'opacity-100 scale-100' : 'opacity-30 scale-90'}
        `}
      >
        {/* 水晶形状 */}
        <div 
          className={`
            absolute inset-0 
            ${i < current 
              ? 'bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900 shadow-[0_0_8px_rgba(59,130,246,0.8)]' 
              : 'bg-gradient-to-b from-gray-600 to-gray-800'
            }
          `} 
          style={{ clipPath: 'polygon(50% 0%, 100% 35%, 80% 100%, 20% 100%, 0% 35%)' }}
        >
          {/* 水晶高光 */}
          {i < current && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/60 rounded-full blur-[1px]" />
          )}
        </div>
      </div>
    ))}
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
        return 'bg-orange-600/80 text-orange-100 border-orange-400/50';
      case 'tangle':
        return 'bg-green-600/80 text-green-100 border-green-400/50';
      case 'frozen':
        return 'bg-cyan-600/80 text-cyan-100 border-cyan-400/50';
      default:
        return 'bg-gray-600/80 text-gray-100 border-gray-400/50';
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
        px-2 py-0.5 rounded text-[9px] font-bold uppercase
        border backdrop-blur-sm animate-pulse
        ${getBadgeStyle()}
      `}
    >
      <span className="mr-1">{getEmoji()}</span>
      {getMechanicName(effect.type)}
      {effect.duration > 1 && <span className="ml-1 opacity-70">({effect.duration})</span>}
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
        relative p-3 rounded-2xl backdrop-blur-md transition-all duration-300
        ${isPlayer 
          ? 'bg-gradient-to-br from-purple-900/80 to-indigo-900/80 border-2 border-purple-500/50' 
          : 'bg-gradient-to-br from-red-900/80 to-rose-900/80 border-2 border-red-500/50'
        }
        shadow-2xl
        ${isShaking ? 'animate-shake' : ''}
      `}
    >
      {/* 装饰角标 */}
      <div className={`absolute -top-1 -left-1 w-4 h-4 ${isPlayer ? 'bg-purple-400' : 'bg-red-400'} rotate-45`} />
      <div className={`absolute -top-1 -right-1 w-4 h-4 ${isPlayer ? 'bg-purple-400' : 'bg-red-400'} rotate-45`} />

      <div className="flex items-center gap-3">
        {/* 头像 */}
        <div 
          className={`
            relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0
            border-3 ${isPlayer ? 'border-purple-400' : 'border-red-400'}
            shadow-lg ${isPlayer ? 'shadow-purple-500/50' : 'shadow-red-500/50'}
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
                  <div class="w-full h-full flex items-center justify-center text-3xl ${isPlayer ? 'bg-purple-900' : 'bg-red-900'}">
                    ${defaultAvatar}
                  </div>
                `;
              }
            }}
          />
          {/* 头像边框光效 */}
          <div className={`absolute inset-0 rounded-full border-2 ${isPlayer ? 'border-purple-300/30' : 'border-red-300/30'} animate-pulse`} />
        </div>

        {/* 信息区 */}
        <div className="flex-1 space-y-2 min-w-0">
          {/* 名称 */}
          <div className={`text-sm font-wizard font-bold ${isPlayer ? 'text-purple-200' : 'text-red-200'} tracking-wider truncate`}>
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
        <div className="flex gap-1 mt-2 justify-center flex-wrap">
          {effects.map((effect, i) => (
            <StatusEffectBadge key={`${effect.type}-${i}`} effect={effect} />
          ))}
        </div>
      )}

      {/* 震动动画样式 */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default PlayerFrame;
