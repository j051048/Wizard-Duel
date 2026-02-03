/**
 * SpellCard - 法术卡牌组件
 * 
 * 专业游戏级设计：
 * - 增强悬停效果（发光、放大、倾斜）
 * - 卡牌边框发光效果
 * - 更大的费用/伤害图标
 * - 3D 透视悬停效果
 */

import React, { useState } from 'react';
import { Spell } from '../types';
import { getMechanicName } from '../constants';
import { Zap, Shield, Flame, Snowflake, Leaf } from 'lucide-react';

interface SpellCardProps {
  spell?: Spell; 
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isSmall?: boolean;
  isFaceDown?: boolean;
  isAffordable?: boolean;
  showMechanic?: boolean;
}

// 获取机制图标
const getMechanicIcon = (mechanic?: string) => {
  switch (mechanic) {
    case 'burn': return <Flame size={12} className="text-orange-400" />;
    case 'freeze': return <Snowflake size={12} className="text-cyan-300" />;
    case 'charge': return <Zap size={12} className="text-yellow-400" />;
    case 'fortify': return <Shield size={12} className="text-stone-300" />;
    case 'tangle': return <Leaf size={12} className="text-green-400" />;
    default: return null;
  }
};

export const SpellCard: React.FC<SpellCardProps> = ({ 
  spell, 
  isSelected, 
  onClick, 
  disabled, 
  isSmall, 
  isFaceDown,
  isAffordable = true,
  showMechanic = true
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // FACE DOWN CARD (Card Back)
  if (isFaceDown) {
    return (
      <div className={`
        relative rounded-xl border-2 border-slate-600 bg-slate-900 overflow-hidden shadow-xl
        ${isSmall ? 'w-16 h-24' : 'w-24 h-36 sm:w-28 sm:h-40'}
        flex items-center justify-center
        hover:border-slate-500 transition-colors duration-300
      `}>
        {/* 神秘图案 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black" />
        <div className="absolute inset-2 border border-slate-500/30 rounded-lg flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-slate-500/50 flex items-center justify-center">
            <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-purple-900 rotate-45 animate-pulse" />
          </div>
        </div>
        {/* 角落装饰 */}
        <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-slate-500/40 rounded-tl" />
        <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-slate-500/40 rounded-tr" />
        <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-slate-500/40 rounded-bl" />
        <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-slate-500/40 rounded-br" />
      </div>
    );
  }

  if (!spell) return null;

  const canPlay = isAffordable && !disabled;
  const mechanicIcon = getMechanicIcon(spell.mechanic);

  return (
    <button
      onClick={canPlay ? onClick : undefined}
      disabled={!canPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        boxShadow: isSelected 
          ? `0 0 30px ${spell.shadowColor}, 0 0 60px ${spell.shadowColor}40` 
          : isHovered && canPlay 
            ? `0 0 20px ${spell.shadowColor}80, 0 8px 25px rgba(0,0,0,0.5)` 
            : '0 4px 15px rgba(0,0,0,0.3)',
        transform: isHovered && canPlay ? 'translateY(-8px) scale(1.05)' : 'none',
      }}
      className={`
        relative group flex flex-col items-center justify-between rounded-xl transition-all duration-300
        border-2 overflow-hidden
        ${isSmall ? 'w-20 h-28 p-2' : 'w-32 h-48 p-2.5 sm:w-36 sm:h-52'}
        ${!canPlay ? 'opacity-50 cursor-not-allowed grayscale-[0.7]' : 'cursor-pointer'}
        ${isSelected 
          ? `bg-slate-900 ${spell.borderColor} scale-105 z-20` 
          : `bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600 ${canPlay ? 'hover:border-white/60' : ''}`}
      `}
    >
      {/* 卡牌发光边框（悬停时） */}
      {canPlay && (
        <div 
          className={`
            absolute -inset-0.5 rounded-xl opacity-0 blur-sm -z-10 transition-opacity duration-300
            ${isHovered ? 'opacity-60' : ''}
          `}
          style={{ background: spell.shadowColor }}
        />
      )}

      {/* Mana Cost - 左上角（增大） */}
      <div className={`
        absolute top-1.5 left-1.5 w-8 h-8 rounded-full flex items-center justify-center 
        text-sm font-black text-white shadow-lg z-10
        ${spell.manaCost >= 3 ? 'bg-gradient-to-br from-purple-500 to-purple-800 border-2 border-purple-300' : 
          spell.manaCost === 2 ? 'bg-gradient-to-br from-blue-500 to-blue-800 border-2 border-blue-300' : 
          'bg-gradient-to-br from-slate-500 to-slate-800 border-2 border-slate-300'}
        ${isHovered && canPlay ? 'scale-110' : ''}
        transition-transform duration-300
      `}>
        {spell.manaCost}
      </div>

      {/* Damage - 右上角（增大） */}
      <div className={`
        absolute top-1.5 right-1.5 w-8 h-8 rounded-full 
        bg-gradient-to-br from-red-600 to-red-900 border-2 border-red-400
        flex items-center justify-center text-sm font-bold text-white shadow-lg z-10
        ${isHovered && canPlay ? 'scale-110' : ''}
        transition-transform duration-300
      `}>
        {spell.damage}
      </div>

      {/* Card Art */}
      <div className={`
        w-full aspect-square rounded-lg bg-gradient-to-br from-slate-700 to-black 
        flex items-center justify-center mt-5
        border border-white/10 relative overflow-hidden 
        transition-all duration-300
        ${isHovered && canPlay ? 'border-white/30' : ''}
      `}>
        {/* Background glow based on element */}
        <div 
          className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? 'opacity-50' : 'opacity-25'}`}
          style={{
            background: `radial-gradient(circle at center, ${spell.shadowColor} 0%, transparent 70%)`
          }}
        />
        
        {/* Emoji */}
        <div className={`
          text-5xl sm:text-6xl drop-shadow-2xl transition-all duration-300 relative z-10
          ${isSelected ? 'scale-110' : ''} 
          ${isHovered && canPlay ? 'scale-125 animate-pulse' : ''}
        `}>
          {spell.emoji}
        </div>
        
        {/* 悬停时的粒子效果 */}
        {isHovered && canPlay && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-1 h-1 bg-white rounded-full animate-ping top-1/4 left-1/4 opacity-60" />
            <div className="absolute w-1 h-1 bg-white rounded-full animate-ping top-3/4 right-1/4 opacity-60 delay-100" />
            <div className="absolute w-1 h-1 bg-white rounded-full animate-ping top-1/2 right-1/3 opacity-60 delay-200" />
          </div>
        )}
      </div>

      {/* Card Text Area */}
      <div className="text-center w-full z-10 space-y-1.5 mt-2">
        {/* Card Name */}
        <h3 className={`
          font-wizard font-bold uppercase tracking-wider truncate leading-tight
          ${isSmall ? 'text-[9px]' : 'text-[11px] sm:text-xs'}
          ${spell.color}
          ${isHovered && canPlay ? 'text-white' : ''}
          transition-colors duration-300
        `}>
          {spell.name}
        </h3>
        
        {/* Mechanic Badge */}
        {!isSmall && showMechanic && (
          <div className={`
            flex items-center justify-center gap-1.5 
            text-[9px] font-bold uppercase tracking-wide
            px-2.5 py-1 rounded-full bg-black/50 border border-white/15
            ${spell.color}
            ${isHovered && canPlay ? 'bg-black/70 border-white/30' : ''}
            transition-all duration-300
          `}>
            {mechanicIcon}
            <span>{getMechanicName(spell.mechanic)}</span>
          </div>
        )}
        
        {/* Short Description */}
        {!isSmall && (
          <div className={`
            text-[8px] font-tech leading-tight px-1.5 pt-1.5
            border-t border-white/10
            ${isHovered && canPlay ? 'text-gray-300' : 'text-gray-500'}
            transition-colors duration-300
          `}>
            {spell.shortDesc}
          </div>
        )}
      </div>
      
      {/* Active Glow Effect */}
      {isSelected && (
        <>
          <div className="absolute inset-0 rounded-xl border-2 border-white/40 animate-pulse pointer-events-none" />
          <div className="absolute -inset-1 rounded-xl border border-white/20 animate-ping pointer-events-none" />
        </>
      )}
      
      {/* Unaffordable Overlay */}
      {!isAffordable && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-xl backdrop-blur-[2px]">
          <span className="text-red-400 text-sm font-bold">⚡</span>
          <span className="text-red-400 text-xs font-bold mt-1">法力不足</span>
        </div>
      )}
      
      {/* 卡牌角落装饰 */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/10 rounded-tl-xl" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/10 rounded-tr-xl" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/10 rounded-bl-xl" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/10 rounded-br-xl" />
    </button>
  );
};

export default SpellCard;
