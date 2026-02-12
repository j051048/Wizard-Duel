/**
 * CardReveal - 卡牌翻转展示组件
 * 
 * 性能优化：使用 React.memo 防止不必要的重渲染
 */

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Spell } from '../../types';
import { SpellCard } from '../SpellCard';

interface CardRevealProps {
  card: Spell;
  index: number;
  isRevealed: boolean;
  isMobile: boolean;
  onCardClick: (index: number) => void;
}

/**
 * 稀有度颜色映射 - 提取到组件外部避免重复创建
 */
const RARITY_COLOR_MAP: Record<string, string> = {
  legendary: 'from-yellow-500/50 to-amber-600/50',
  mythic: 'from-purple-500/50 to-pink-600/50',
  epic: 'from-purple-600/50 to-indigo-700/50',
  rare: 'from-blue-500/50 to-cyan-600/50',
  common: 'from-gray-500/50 to-slate-600/50',
};

const CardRevealComponent: React.FC<CardRevealProps> = ({
  card,
  index,
  isRevealed,
  isMobile,
  onCardClick
}) => {
  // 使用 useMemo 缓存计算结果
  const isHighRarity = useMemo(
    () => card.rarity === 'legendary' || card.rarity === 'mythic',
    [card.rarity]
  );
  
  // 使用 useMemo 缓存稀有度颜色
  const rarityColor = useMemo(
    () => RARITY_COLOR_MAP[card.rarity] || RARITY_COLOR_MAP.common,
    [card.rarity]
  );
  
  // 使用 useCallback 创建稳定的点击处理函数
  const handleClick = useCallback(() => {
    onCardClick(index);
  }, [onCardClick, index]);

  return (
    <div className={`${isMobile ? 'w-28 h-40' : 'w-40 h-56'} relative`}> 
      {/* 稀有卡光环 */}
      {isHighRarity && isRevealed && (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute -inset-4 bg-yellow-400/30 blur-2xl rounded-full animate-pulse pointer-events-none z-0" 
        />
      )}
      
      {/* Flipper Container */}
      <div className="w-full h-full relative" style={{ perspective: '1000px' }}>
        {/* FRONT (The actual card) */}
        <motion.div 
          className="absolute inset-0"
          initial={{ rotateY: -180 }}
          animate={{ 
            rotateY: isRevealed ? 0 : -180,
            zIndex: isRevealed ? 10 : 0 
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <SpellCard spell={card} isSmall={isMobile} />
        </motion.div>

        {/* BACK (Card back) */}
        <motion.div 
          className="absolute inset-0"
          initial={{ rotateY: 0 }}
          animate={{ 
            rotateY: isRevealed ? 180 : 0,
            zIndex: isRevealed ? 0 : 10
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div 
            className={`
              w-full h-full rounded-xl shadow-xl overflow-hidden border-2
              ${isRevealed ? 'border-transparent' : 'border-slate-700 hover:border-purple-500'}
              relative transition-colors duration-300 cursor-pointer
            `}
            onClick={handleClick}
          >
            <img src="/ui/card_back.webp" className="w-full h-full object-cover" alt="Card Back" />
            <div className={`absolute inset-0 bg-gradient-to-t ${rarityColor} opacity-0 hover:opacity-40 transition-opacity duration-500`} />
            
            {/* 悬停提示 */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">点击翻开</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/**
 * 使用 React.memo 包装组件，配合自定义比较函数
 * 只有当 props 真正变化时才重新渲染
 */
export const CardReveal = React.memo(CardRevealComponent, (prevProps, nextProps) => {
  // 自定义比较：只有这些属性变化时才重新渲染
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.rarity === nextProps.card.rarity &&
    prevProps.isRevealed === nextProps.isRevealed &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.index === nextProps.index
    // onCardClick 是稳定的 useCallback 引用，不需要比较
  );
});
