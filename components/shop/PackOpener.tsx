/**
 * PackOpener - 开包动画组件 (Refactored)
 * 
 * 重构为thin wrapper，使用分解的子组件
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Spell } from '../../types';
import { HapticService } from '../../services/haptic';
import { CheckCircle, Zap } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { PackAnimation } from './PackAnimation';
import { CardReveal } from './CardReveal';
import { ParticleCanvas } from './ParticleCanvas';

interface PackOpenerProps {
  packName: string;
  cards: Spell[];
  onClose: () => void;
  bgGradient?: string;
}

const cardVariants: Variants = {
  hidden: { scale: 0, x: 0, y: 0, rotate: 0 },
  delt: (i: number) => ({
    scale: 1,
    x: (i - 2) * 140,
    y: 0,
    rotate: (i - 2) * 5,
    transition: { type: 'spring', damping: 15, delay: i * 0.1 }
  }),
  gridDesktop: (i: number) => ({
    scale: 1.1,
    x: (i - 2) * 165,
    y: 0,
    rotate: 0,
    transition: { type: 'spring', bounce: 0.5, duration: 0.8 }
  }),
  gridMobile: (i: number) => ({
    scale: 0.8,
    x: (i % 2 === 0 ? -70 : 70),
    y: (Math.floor(i / 2) - 1) * 140,
    rotate: 0,
    transition: { type: 'spring', bounce: 0.5, duration: 0.8 }
  })
};

export const PackOpener: React.FC<PackOpenerProps> = ({ 
  packName, 
  cards, 
  onClose,
  bgGradient = 'from-purple-600 to-indigo-700'
}) => {
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<'PACK' | 'BURST' | 'REVEAL'>('PACK');
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  
  const hasRare = useMemo(
    () => cards.some(c => c.rarity === 'legendary' || c.rarity === 'mythic'),
    [cards]
  );
  
  const isAllRevealed = revealedIndices.size === cards.length;

  const handlePackClick = useCallback(() => {
    HapticService.medium();
    setPhase('BURST');
    setTimeout(() => setPhase('REVEAL'), 800);
  }, []);

  // 使用 useCallback 创建稳定的点击处理函数
  // 使用函数式更新避免依赖 revealedIndices
  const handleCardClick = useCallback((idx: number) => {
    setRevealedIndices(prev => {
      if (prev.has(idx)) return prev;
      HapticService.light();
      return new Set([...prev, idx]);
    });
  }, []);

  const handleRevealAll = useCallback(() => {
    HapticService.heavy();
    setRevealedIndices(new Set(cards.map((_, i) => i)));
  }, [cards]);

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-br ${bgGradient} flex items-center justify-center overflow-hidden`}>
      
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)] animate-pulse" />
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
        aria-label="Close"
      >
        ✕
      </button>

      <AnimatePresence mode="wait">
        {/* Phase 1: Pack */}
        {phase === 'PACK' && (
          <div onClick={handlePackClick}>
            <PackAnimation
              packName={packName}
              hasRare={hasRare}
              onAnimationComplete={() => {}}
            />
          </div>
        )}

        {/* Phase 2: Burst */}
        {phase === 'BURST' && (
          <ParticleCanvas hasRare={hasRare} />
        )}

        {/* Phase 3: Reveal */}
        {phase === 'REVEAL' && (
          <div className="relative flex flex-col items-center justify-center w-full h-full">
            
            {/* Cards Grid */}
            <div className="relative flex items-center justify-center" style={{ height: isMobile ? '400px' : '300px' }}>
              {cards.map((card, idx) => {
                const isRevealed = revealedIndices.has(idx);
                
                return (
                  <motion.div
                    key={card.id + '-' + idx}
                    custom={idx}
                    variants={cardVariants}
                    initial="hidden"
                    animate={isMobile ? 'gridMobile' : 'gridDesktop'}
                    className="absolute origin-center"
                    style={{ zIndex: isRevealed ? 10 + idx : 30 - idx }}
                  >
                    <CardReveal
                      card={card}
                      index={idx}
                      isRevealed={isRevealed}
                      isMobile={isMobile}
                      onCardClick={handleCardClick}
                    />
                  </motion.div>
                );
              })}
            </div>

            {/* Controls */}
            <div className={`absolute ${isMobile ? 'bottom-16' : 'bottom-20'} flex gap-4`}>
              {!isAllRevealed ? (
                <button
                  onClick={handleRevealAll}
                  className="px-6 md:px-8 py-2 md:py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-bold text-white transition-colors flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" /> 全部翻开
                </button>
              ) : (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={onClose}
                  className={`px-10 md:px-12 py-3 md:py-4 rounded-full font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition-all text-base md:text-lg flex items-center gap-2 ${
                    hasRare 
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-600 shadow-yellow-500/40' 
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-600/40'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" /> 收下卡牌
                </motion.button>
              )}
            </div>

          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
