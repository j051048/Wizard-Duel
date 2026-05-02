/**
 * StatusEffectBadge - 状态效果标签组件
 */

import React from 'react';
import { StatusEffect } from '../../types';
import { getMechanicName } from '../../constants';

interface StatusEffectBadgeProps {
  effect: StatusEffect;
}

const EFFECT_DESCRIPTIONS: Record<string, string> = {
  burn: '每回合结束时受到伤害',
  tangle: '下一张法术的法力消耗增加',
  frozen: '无法打出任何法术',
  thawed: '免疫冻结效果（刚解除冻结）',
  charge: '下一次同属性法术伤害翻倍',
  fortify: '获得额外护甲',
  poisoned: '每回合受到毒素伤害',
  shielded: '护盾保护，免疫一次伤害',
  empowered: '法术伤害增强',
};

export const StatusEffectBadge: React.FC<StatusEffectBadgeProps> = ({ effect }) => {
  const getBadgeStyle = () => {
    switch (effect.type) {
      case 'burn': return 'bg-orange-950/80 border-orange-500/50 text-orange-200';
      case 'tangle': return 'bg-green-950/80 border-green-500/50 text-green-200';
      case 'frozen': return 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200';
      case 'thawed': return 'bg-blue-900/80 border-blue-400/50 text-blue-200';
      case 'poisoned': return 'bg-lime-950/80 border-lime-500/50 text-lime-200';
      case 'shielded': return 'bg-blue-950/80 border-blue-400/50 text-blue-200';
      case 'empowered': return 'bg-amber-950/80 border-amber-400/50 text-amber-200';
      default: return 'bg-gray-900/80 border-gray-500/50 text-gray-200';
    }
  };

  const getEffectIcon = () => {
    switch (effect.type) {
      case 'burn': return '/effects/effect-burn.webp';
      case 'tangle': return '/effects/effect-tangle.webp';
      case 'frozen': return '/effects/effect-freeze.webp';
      case 'thawed': return '/effects/effect-thawed.webp';
      default: return null;
    }
  };

  const getEmoji = () => {
    switch (effect.type) {
      case 'burn': return '🔥';
      case 'tangle': return '🌿';
      case 'frozen': return '❄️';
      case 'thawed': return '💧';
      case 'poisoned': return '☠️';
      case 'shielded': return '🛡️';
      case 'empowered': return '✨';
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
          }}
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

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-32 bg-black/90 text-white text-[10px] p-2 rounded border border-white/20 z-50 pointer-events-none whitespace-normal text-center shadow-xl backdrop-blur-md">
        <div className="font-bold mb-0.5 text-yellow-300">{getMechanicName(effect.type)}</div>
        <div className="text-gray-300 leading-tight">{EFFECT_DESCRIPTIONS[effect.type] || '未知效果'}</div>
        <div className="mt-1 text-gray-500 text-[9px]">持续 {effect.duration} 回合</div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90"></div>
      </div>
    </div>
  );
};
