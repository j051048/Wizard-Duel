/**
 * SpellCard - 法术卡牌组件
 * 
 * 专业游戏级设计：
 * - 增强悬停效果（发光、放大、倾斜）
 * - 卡牌边框发光效果
 * - 更大的费用/伤害图标
 * - 3D 透视悬停效果
 * 
 * [P0 性能优化] - React.memo + 精准 Props 比较
 */

import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spell, SpellType } from '../types';
import { getMechanicName } from '../constants';
import { Zap, Shield, Flame, Snowflake, Leaf } from 'lucide-react';

interface SpellCardProps {
  spell?: Spell; 
  isSelected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: () => void;
  disabled?: boolean;
  isSmall?: boolean;
  isFaceDown?: boolean;
  isAffordable?: boolean;
  showMechanic?: boolean;
  showCost?: boolean;
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

// 根据卡牌ID推断元素类型
const getElementFromId = (id: string): string => {
  if (id.startsWith('fire') || id.startsWith('hero_fire')) return 'fire';
  if (id.startsWith('vine') || id.startsWith('hero_vine')) return 'nature';
  if (id.startsWith('ice') || id.startsWith('hero_ice')) return 'water';
  if (id.startsWith('thunder') || id.startsWith('hero_thunder')) return 'wind';
  if (id.startsWith('rock') || id.startsWith('hero_rock')) return 'earth';
  if (id === 'healing') return 'water';
  if (id === 'aoe' || id === 'draw') return 'wind';
  if (id === 'silence') return 'earth';
  return 'wind'; // 默认
};

// 映射元素属性到边框素材
const getFrameImage = (element: string) => {
  switch (element) {
    case 'fire': return '/ui/frame_fire.webp';
    case 'water': return '/ui/frame_water.webp';
    case 'wind': return '/ui/frame_wind.webp';
    case 'earth': 
    case 'nature': return '/ui/frame_earth.webp';
    default: return '/ui/frame_wind.webp'; // Fallback
  }
};

export const SpellCard = memo<SpellCardProps>(({ 
  spell, 
  isSelected, 
  onClick, 
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  disabled, 
  isSmall, 
  isFaceDown,
  isAffordable = true,
  showMechanic = true
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [imgError, setImgError] = useState(false);

  // [Phase 2] 卡牌切换时重置错误状态，避免旧卡牌的加载失败影响新卡牌
  useEffect(() => {
    setImgError(false);
  }, [spell?.id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || isFaceDown) return;
    const card = e.currentTarget.getBoundingClientRect();
    const xRelative = e.clientX - card.left - card.width / 2;
    const yRelative = e.clientY - card.top - card.height / 2;
    // Calculate rotation: max 10 degrees
    const rotateY = (xRelative / (card.width / 2)) * 10; 
    const rotateX = -(yRelative / (card.height / 2)) * 10;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeaveInternal = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    onMouseLeave?.();
  };

  const handleMouseEnterInternal = () => {
    if (!isFaceDown) {
        setIsHovered(true);
        onMouseEnter?.();
    }
  };

  // FACE DOWN CARD (Card Back)
  if (isFaceDown) {
    return (
      <div 
        className={`relative rounded-xl shadow-2xl transition-transform duration-500 hover:scale-105 ${isSmall ? 'w-16 h-24' : 'w-24 h-36 sm:w-32 sm:h-44'}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <img 
          src="/ui/card_back.webp" 
          alt="Card Back"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain drop-shadow-xl"
        />
      </div>
    );
  }

  if (!spell) return null;

  const canPlay = isAffordable && !disabled;
  const mechanicIcon = getMechanicIcon(spell.mechanic);
  const frameImage = getFrameImage(getElementFromId(spell.id));

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
  const { x, y } = rotate;
  const isDisabled = !canPlay;

  return (
    <motion.div
        layoutId={spell.id}
        id={`card-${spell.id}`}
        className={`
          relative select-none
          ${isSmall ? 'w-16 h-24' : 'w-24 h-36 sm:w-32 sm:h-44 md:w-40 md:h-56'}
          ${isDisabled ? 'opacity-80 grayscale-[0.3]' : 'cursor-pointer'}
          ${isSelected ? 'z-50' : 'z-10'}
          rounded-xl
        `}
        whileHover={!isDisabled ? { 
          scale: 1.05, 
          y: -10,
          rotateY: 5,
          transition: { type: 'spring', stiffness: 400, damping: 20 }
        } : {}}
        onMouseEnter={handleMouseEnterInternal}
        onMouseLeave={handleMouseLeaveInternal}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onMouseMove={handleMouseMove}
        onClick={!isDisabled ? onClick : undefined}
      >
        <div 
          className={`
            relative w-full h-full transition-transform duration-100 ease-out preserve-3d
            ${isSelected ? 'scale-110 z-20 aura-glow' : ''}
            ${isHovered && canPlay ? 'scale-110 z-20 aura-glow' : ''}
          `}
          style={{ 
            transform: `rotateX(${x}deg) rotateY(${y}deg)`,
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Layer 0: Shadow/Glow (Behind) */}
          <div 
             className={`absolute inset-4 bg-black/50 blur-xl transition-all duration-300 -z-20 ${isSelected || isHovered ? 'opacity-100 scale-110' : 'opacity-40'}`}
             style={{ background: isSelected || isHovered ? spell.shadowColor : undefined }}
          />
  
          {/* Layer 1: Base Card Background & Art (Middle) */}
          <div className={`
               absolute inset-0 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center 
               border-2 md:border-4 ${rarityStyles.borderClass} ${rarityStyles.glowClass}
               ${canPlay ? 'ring-2 ring-green-500/30 animate-pulse-gentle' : ''}
          `}>
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-b from-slate-800 to-black ${canPlay ? '' : 'opacity-50'}`} />
              
              {/* Element Glow */}
               <div 
                className="absolute inset-0 opacity-40 mix-blend-screen"
                style={{ background: `radial-gradient(circle at center, ${spell.shadowColor}, transparent 80%)` }}
              />
               {/* Main Art / Emoji */}
               <div className="absolute inset-0 z-0 transform transition-transform duration-500 group-hover:scale-110">
                  {!imgError && spell.artSrc ? (
                     <img
                      src={spell.artSrc}
                      alt={spell.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                     />
                  ) : spell.artSrc ? (
                     // artSrc 存在但图片未加载 — 用卡背占位
                     <img
                      src="/ui/card_back.webp"
                      alt=""
                      className="w-full h-full object-cover opacity-60"
                     />
                  ) : (
                     <div className="flex items-center justify-center h-full text-6xl drop-shadow-2xl grayscale-[0.2] group-hover:grayscale-0 transition-all">{spell.emoji}</div>
                  )}
               </div>
          </div>
  
  
          {/* Layer 3: Stats & Text (Overlay) */}
          <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-3" style={{ transform: 'translateZ(20px)' }}>
              {/* Top Row: Mana & Damage */}
              <div className="flex justify-between items-start -mx-1 -mt-1">
                 <div className="relative">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-900 to-blue-600 border border-blue-400 shadow-lg flex items-center justify-center text-white font-black text-sm relative z-10">
                      {spell.manaCost}
                   </div>
                   {/* Mana Glow */}
                   <div className="absolute inset-0 bg-blue-500 blur-md opacity-60" />
                 </div>
  
                 <div className="relative">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-900 to-red-600 border border-red-400 shadow-lg flex items-center justify-center text-white font-black text-sm relative z-10">
                      {spell.damage}
                   </div>
                    {/* Damage Glow */}
                   <div className="absolute inset-0 bg-red-500 blur-md opacity-60" />
                 </div>
              </div>
  
              {/* Bottom Row: Name & Mechanic */}
              <div className="mt-auto text-center">
                 <div className="relative inline-block">
                    <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded px-2 py-0.5 text-xs text-white/90 font-serif tracking-widest uppercase shadow-md truncate max-w-[90%] mx-auto">
                      {spell.name}
                    </div>
                 </div>
                 
                 {showMechanic && spell.mechanic && (
                   <div className="flex justify-center mt-1">
                     <div className="bg-slate-900/80 rounded-full px-2 py-0.5 flex items-center gap-1 border border-white/5 shadow-sm">
                        {mechanicIcon}
                        <span className="text-[10px] text-gray-300 uppercase font-bold">{getMechanicName(spell.mechanic)}</span>
                     </div>
                   </div>
                 )}
              </div>
          </div>
  
        {/* Unaffordable Overlay */}
        {!isAffordable && (
          <div className="absolute inset-0  flex flex-col items-center justify-center rounded-xl z-30 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-[2px] p-2 rounded-lg border border-red-500/50">
               <span className="text-red-400 text-sm font-bold block text-center">⚡</span>
               <span className="text-red-400 text-xs font-bold mt-1">法力不足</span>
            </div>
          </div>
        )}
  
              {/* Description Tooltip - 智能定位 */}
        {isHovered && !isFaceDown && !isSmall && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[105%] mb-2 w-52 z-50 pointer-events-none">
            <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs p-3 rounded-lg border border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
               <div className={`font-bold mb-1.5 text-sm ${spell.color || 'text-amber-400'}`}>{spell.name}</div>
               
               {/* 数值信息 */}
               <div className="flex items-center gap-2 mb-2 text-[10px]">
                 <span className="flex items-center gap-1">
                   <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{spell.manaCost}</span>
                   <span className="text-blue-300">费</span>
                 </span>
                 {spell.damage > 0 && (
                   <span className="flex items-center gap-1">
                     <span className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">{spell.damage}</span>
                     <span className="text-red-300">伤害</span>
                   </span>
                 )}
                 {(spell.armorGain || 0) > 0 && (
                   <span className="flex items-center gap-1">
                     <span className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold">{spell.armorGain}</span>
                     <span className="text-slate-300">护甲</span>
                   </span>
                 )}
               </div>
               
               <p className="leading-relaxed text-gray-200 font-sans">{spell.description}</p>
               
               {spell.mechanic && spell.mechanic !== 'skip' && (
                 <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-purple-900/50 rounded-full text-[10px] text-purple-300">
                   <span>🔮</span>
                   <span>{getMechanicName(spell.mechanic)}</span>
                 </div>
               )}
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-900 border-r border-b border-white/20 transform rotate-45"></div>
          </div>
        )}
  
        </div>
      </motion.div>
  );
}, (prevProps, nextProps) => {
    // 【性能优化】完整比较所有影响渲染的 props
    // 卡牌数据比较
    if (prevProps.spell?.id !== nextProps.spell?.id) return false;
    
    // 交互状态比较（高频变化）
    if (prevProps.isSelected !== nextProps.isSelected) return false;
    if (prevProps.isAffordable !== nextProps.isAffordable) return false;
    if (prevProps.disabled !== nextProps.disabled) return false;
    
    // 布局状态比较
    if (prevProps.isSmall !== nextProps.isSmall) return false;
    if (prevProps.isFaceDown !== nextProps.isFaceDown) return false;
    if (prevProps.showMechanic !== nextProps.showMechanic) return false;
    if (prevProps.showCost !== nextProps.showCost) return false;
    
    // 事件处理器引用稳定性由调用方保证（useCallback）
    // onClick, onMouseEnter, onMouseLeave, onPointerDown, onPointerUp 不参与比较
    
    return true;
});

export default SpellCard;
