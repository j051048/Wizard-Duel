import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spell } from '../../types';
import { SpellCard } from '../SpellCard';
import { HapticService } from '../../services/haptic';
import { Sparkles, Check, CheckCircle, X, Zap } from 'lucide-react';

interface PackOpenerProps {
  packName: string;
  cards: Spell[];
  onClose: () => void;
  bgGradient?: string;
}

const variants = {
  enter: { scale: 0, opacity: 0, y: 300 },
  idle: { 
     scale: 1, 
     opacity: 1, 
     y: 0,
     transition: { type: 'spring', damping: 12 }
  },
  shake: {
      x: [0, -5, 5, -5, 5, 0],
      scale: [1, 1.1, 1, 1.1, 1],
      transition: { duration: 0.5 }
  },
  exit: { scale: 1.5, opacity: 0 }
};

const cardVariants = {
  hidden: { scale: 0, x: 0, y: 0, rotate: 0 },
  delt: (i: number) => ({
    scale: 1,
    x: (i - 2) * 140, // 扇形展开或者横排
    y: 0,
    rotate: (i - 2) * 5,
    transition: { type: 'spring', damping: 15, delay: i * 0.1 }
  }),
  grid: (i: number) => {
    // 适配移动端：如果是移动端可能需要两行。这里假设宽屏单行，竖屏需要媒体查询
    // 简单起见，这里做响应式计算有点麻烦，先用横排。
    // 实际项目中应该检测屏幕宽度。
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        return {
            scale: 0.9,
            x: (i % 2 === 0 ? -80 : 80),
            y: (Math.floor(i / 2) - 1) * 160,
            rotate: 0,
            transition: { type: 'spring', bounce: 0.5, duration: 0.8 }
        };
    }
    return {
        scale: 1.1,
        x: (i - 2) * 160,
        y: 0,
        rotate: 0,
        transition: { type: 'spring', bounce: 0.5, duration: 0.8 }
    };
  }
};

export const PackOpener: React.FC<PackOpenerProps> = ({ 
    packName, 
    cards, 
    onClose,
    bgGradient = 'from-purple-600 to-indigo-700'
}) => {
  const [phase, setPhase] = useState<'PACK' | 'OPENING' | 'REVEAL' | 'SUMMARY'>('PACK');
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [showParticles, setShowParticles] = useState(false);

  // Auto transition from OPENING to REVEAL
  useEffect(() => {
    if (phase === 'OPENING') {
        const timer = setTimeout(() => {
            setPhase('REVEAL');
            HapticService.heavy();
        }, 800);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const handlePackClick = () => {
      HapticService.medium();
      setPhase('OPENING');
      setShowParticles(true);
  };

  const handleCardClick = (index: number) => {
      if (revealedIndices.has(index)) return;
      
      const card = cards[index];
      if (card.rarity === 'legendary' || card.rarity === 'mythic') {
          HapticService.heavy();
      } else if (card.rarity === 'rare') {
          HapticService.medium();
      } else {
          HapticService.light();
      }

      setRevealedIndices(prev => {
          const next = new Set(prev);
          next.add(index);
          return next;
      });
  };

  const handleRevealAll = () => {
    // 依次翻开
    cards.forEach((_, idx) => {
        setTimeout(() => {
             handleCardClick(idx);
        }, idx * 150);
    });
  };

  const isAllRevealed = revealedIndices.size === cards.length;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden">
        
        {/* Background Ambient Light */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br ${bgGradient} opacity-20 blur-[120px] rounded-full pointer-events-none`} />

        {/* Close Button (Only in Summary or beginning) */}
        {(phase === 'PACK' || phase === 'SUMMARY') && (
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-50">
                <X className="text-white" />
            </button>
        )}

        <AnimatePresence mode='wait'>
            {/* STAGE 1: THE PACK */}
            {phase === 'PACK' && (
                <motion.div
                    key="pack"
                    variants={variants}
                    initial="enter"
                    animate="idle"
                    exit="exit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95, rotate: [0, -2, 2, 0] }}
                    onClick={handlePackClick}
                    className="cursor-pointer relative z-20 group"
                >
                    <div className={`
                        w-64 h-80 rounded-2xl bg-gradient-to-br ${bgGradient}
                        border-4 border-white/20 shadow-[0_0_50px_rgba(124,58,237,0.5)]
                        flex items-center justify-center relative overflow-hidden
                    `}>
                        {/* Pack Details */}
                        <div className="absolute inset-0 bg-[url('/ui/texture_noise.png')] opacity-20 mix-blend-overlay" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        
                        <div className="relative z-10 text-center p-6">
                            <Sparkles className="w-16 h-16 text-yellow-300 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-md">{packName}</h2>
                            <p className="text-white/60 text-sm mt-2">点击开启</p>
                        </div>
                        
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                    </div>
                    
                    {/* Hover text */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 20 }}
                        className="absolute top-full left-0 right-0 text-center text-white/50 text-sm font-mono tracking-widest"
                    >
                        TAP TO OPEN
                    </motion.div>
                </motion.div>
            )}

            {/* STAGE 2: CARDS REVEAL */}
            {(phase === 'REVEAL' || phase === 'SUMMARY') && (
                <div className="relative w-full h-full flex flex-col items-center justify-center z-20">
                    
                    {/* Title */}
                    <motion.h2 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: -160 }} // Move up to make room
                        className="absolute text-3xl font-bold text-white tracking-widest"
                    >
                        {isAllRevealed ? "获得奖励！" : "翻开你的卡牌"}
                    </motion.h2>

                    {/* Cards Container */}
                    <div className="relative w-full h-[400px] flex items-center justify-center perspective-1000">
                        {cards.map((card, idx) => {
                            const isRevealed = revealedIndices.has(idx);
                            const rarityColor = getRarityColor(card.rarity);
                            
                            return (
                                <motion.div
                                    key={card.id + idx}
                                    custom={idx}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="grid"
                                    className="absolute origin-center cursor-pointer"
                                    onClick={() => handleCardClick(idx)}
                                    whileHover={{ scale: 1.15, zIndex: 50, transition: { duration: 0.2 } }}
                                    style={{ zIndex: isRevealed ? 10 + idx : 30 - idx }} // Unrevealed on top slightly if stacked, but here distributed
                                >
                                    <div className="relative w-32 h-48 sm:w-40 sm:h-56"> 
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
                                                <SpellCard spell={card} />
                                                {(card.rarity === 'legendary' || card.rarity === 'mythic') && isRevealed && (
                                                    <div className="absolute inset-0 bg-yellow-400/20 blur-xl animate-pulse pointer-events-none" />
                                                )}
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
                                                      ${isRevealed ? 'border-transparent' : 'border-slate-700'}
                                                      relative group
                                                    `}
                                                >
                                                    <img src="/ui/card_back.webp" className="w-full h-full object-cover" alt="Card Back" />
                                                    <div className={`absolute inset-0 bg-gradient-to-t ${rarityColor} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-20 flex gap-4">
                        {!isAllRevealed ? (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={handleRevealAll}
                                className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-bold text-white transition-colors flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4" /> 全部翻开
                            </motion.button>
                        ) : (
                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                onClick={onClose}
                                className="px-12 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-bold text-white shadow-lg shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all text-lg flex items-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" /> 收下卡牌
                            </motion.button>
                        )}
                    </div>

                </div>
            )}
        </AnimatePresence>

        {/* Particles Overlay (Simple) */}
        {showParticles && phase === 'OPENING' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 <div className="animate-ping w-96 h-96 bg-white/20 rounded-full blur-3xl absolute" />
                 <div className="animate-ping w-64 h-64 bg-purple-500/40 rounded-full blur-2xl absolute animation-delay-100" />
            </div>
        )}
    </div>
  );
};

// Helper
function getRarityColor(rarity: string) {
    if (rarity === 'legendary' || rarity === 'mythic') return 'from-transparent via-yellow-500/50 to-yellow-500/80';
    if (rarity === 'rare') return 'from-transparent via-blue-500/50 to-blue-500/80';
    if (rarity === 'uncommon') return 'from-transparent via-green-500/50 to-green-500/80';
    return 'from-transparent via-black/50 to-black/80';
}

function RarityGlow({ rarity }: { rarity: string }) {
    // Component logic moved inline for simplicity
    return null;
}
