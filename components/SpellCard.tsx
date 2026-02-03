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
  
  // FACE DOWN CARD (Card Back) - 使用真实素材
  if (isFaceDown) {
    return (
      <div className={`
        relative rounded-xl border-2 border-slate-600 bg-slate-900 overflow-hidden shadow-xl
        ${isSmall ? 'w-16 h-24' : 'w-24 h-36 sm:w-28 sm:h-40'}
        hover:border-slate-500 transition-all duration-300 hover:scale-105
      `}>
        {/* 卡背图片 */}
        <img 
          src="/cards/card-back.webp" 
          alt="Card Back"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // 图片加载失败时使用CSS备用方案
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* CSS 备用方案 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black -z-10" />
        <div className="absolute inset-2 border border-slate-500/30 rounded-lg flex items-center justify-center -z-10">
          <div className="w-10 h-10 rounded-full border-2 border-slate-500/50 flex items-center justify-center">
            <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-purple-900 rotate-45 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!spell) return null;

  const canPlay = isAffordable && !disabled;
  const mechanicIcon = getMechanicIcon(spell.mechanic);

  // 稀有度样式
  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'mythic':
        return {
          borderGlow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)',
          particleColor: 'rgba(255, 215, 0, 0.6)',
          borderClass: 'border-yellow-400',
          glowClass: 'shadow-yellow-400/50',
          backgroundGradient: 'bg-gradient-to-br from-yellow-900/20 to-orange-900/20',
          particles: true
        };
      case 'rare':
        return {
          borderGlow: '0 0 15px rgba(0, 191, 255, 0.6)',
          particleColor: 'rgba(0, 191, 255, 0.4)',
          borderClass: 'border-blue-400',
          glowClass: 'shadow-blue-400/40',
          backgroundGradient: 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20',
          particles: true
        };
      case 'uncommon':
        return {
          borderGlow: '0 0 10px rgba(34, 197, 94, 0.5)',
          particleColor: 'rgba(34, 197, 94, 0.3)',
          borderClass: 'border-green-400',
          glowClass: 'shadow-green-400/30',
          backgroundGradient: 'bg-gradient-to-br from-green-900/20 to-emerald-900/20',
          particles: false
        };
      default: // common
        return {
          borderGlow: 'none',
          particleColor: 'rgba(255, 255, 255, 0.2)',
          borderClass: 'border-gray-500',
          glowClass: 'shadow-gray-500/20',
          backgroundGradient: 'bg-gradient-to-br from-gray-900/10 to-slate-900/10',
          particles: false
        };
    }
  };

  const rarityStyles = getRarityStyles(spell.rarity);

  return (
    <button
      onClick={canPlay ? onClick : undefined}
      disabled={!canPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        boxShadow: isSelected 
          ? `${rarityStyles.borderGlow}, 0 0 60px ${spell.shadowColor}40` 
          : isHovered && canPlay 
            ? `${rarityStyles.borderGlow}, 0 8px 25px rgba(0,0,0,0.5)` 
            : `0 4px 15px rgba(0,0,0,0.3), ${rarityStyles.borderGlow}`,
        transform: isHovered && canPlay ? 'translateY(-8px) scale(1.05)' : 'none',
      }}
      className={`
        relative group flex flex-col items-center justify-between rounded-xl transition-all duration-300
        border-2 overflow-hidden touch-manipulation
        ${isSmall ? 'w-20 h-28 p-2 min-h-[44px]' : 'w-32 h-48 p-2.5 sm:w-36 sm:h-52 min-h-[44px]'}
        ${!canPlay ? 'opacity-50 cursor-not-allowed grayscale-[0.7]' : 'cursor-pointer'}
        ${isSelected 
          ? `bg-slate-900 ${rarityStyles.borderClass} scale-105 z-20 ${rarityStyles.glowClass}` 
          : `bg-gradient-to-b from-slate-800 to-slate-900 ${rarityStyles.borderClass} ${canPlay ? 'hover:border-white/60' : ''}`}
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

      {/* Rarity-based background gradient */}
      <div className={`absolute inset-0 ${rarityStyles.backgroundGradient} opacity-20`} />

      {/* Floating particles for rare+ cards */}
      {rarityStyles.particles && (
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 rounded-full animate-pulse`}
              style={{
                backgroundColor: rarityStyles.particleColor,
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: '2s',
              }}
            />
          ))}
        </div>
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

      {/* Card Art - 使用真实素材 */}
      <div className={`
        w-full aspect-square rounded-lg overflow-hidden
        flex items-center justify-center mt-5
        border border-white/10 relative
        transition-all duration-300
        ${isHovered && canPlay ? 'border-white/30' : ''}
      `}>
        {/* 卡牌插画 */}
        {spell.artSrc ? (
          <img 
            src={spell.artSrc} 
            alt={spell.name}
            className={`
              w-full h-full object-cover transition-all duration-300
              ${isSelected ? 'scale-110' : ''} 
              ${isHovered && canPlay ? 'scale-125' : ''}
            `}
            onError={(e) => {
              // 图片加载失败时隐藏图片，显示emoji
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Emoji 作为备用/覆盖层 */}
        <div className={`
          absolute inset-0 flex items-center justify-center
          ${spell.artSrc ? 'opacity-0' : 'opacity-100'}
        `}>
          {/* Background glow based on element */}
          <div 
            className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? 'opacity-50' : 'opacity-25'}`}
            style={{
              background: `radial-gradient(circle at center, ${spell.shadowColor} 0%, transparent 70%)`
            }}
          />
          <div className={`
            text-5xl sm:text-6xl drop-shadow-2xl transition-all duration-300 relative z-10
            ${isSelected ? 'scale-110' : ''} 
            ${isHovered && canPlay ? 'scale-125 animate-pulse' : ''}
          `}>
            {spell.emoji}
          </div>
        </div>
        
        {/* 图片上层光效 */}
        {spell.artSrc && (
          <div 
            className={`
              absolute inset-0 pointer-events-none transition-opacity duration-300
              bg-gradient-to-t from-black/60 via-transparent to-transparent
              ${isHovered && canPlay ? 'opacity-30' : 'opacity-50'}
            `}
          />
        )}
        
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
          ${spell.rarity === 'mythic' ? 'text-yellow-300' : 
            spell.rarity === 'rare' ? 'text-blue-300' : 
            spell.rarity === 'uncommon' ? 'text-green-300' : 
            'text-gray-300'}
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
            ${spell.rarity === 'mythic' ? 'text-yellow-300 border-yellow-400/30' : 
              spell.rarity === 'rare' ? 'text-blue-300 border-blue-400/30' : 
              spell.rarity === 'uncommon' ? 'text-green-300 border-green-400/30' : 
              'text-gray-300 border-gray-400/30'}
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

      {/* 详细描述覆盖层 (Hover Overlay) - 提供完整中文释义 */}
      <div className={`
        absolute inset-0 z-30 flex flex-col items-center justify-center p-3 text-center
        bg-slate-900/95 backdrop-blur-sm transition-all duration-300
        ${isHovered && !isSmall ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        <div className="mb-2 text-2xl animate-bounce">{spell.emoji}</div>
        <h4 className={`text-sm font-bold mb-2 ${spell.color} drop-shadow-md`}>
          {spell.name}
        </h4>
        <div className="w-full h-px bg-white/20 mb-2"></div>
        <p className="text-[10px] sm:text-xs text-slate-100 leading-relaxed font-medium">
          {spell.description}
        </p>
        
        {/* 底部提示 */}
        <div className="mt-3 text-[9px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
           {getMechanicName(spell.mechanic)}
        </div>
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
