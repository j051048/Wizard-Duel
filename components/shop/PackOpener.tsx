import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Spell } from '../../types';
import { SpellCard } from '../SpellCard';
import { HapticService } from '../../services/haptic';
import { Sparkles, CheckCircle, X, Zap } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

interface PackOpenerProps {
  packName: string;
  cards: Spell[];
  onClose: () => void;
  bgGradient?: string;
}

const variants: Variants = {
  enter: { scale: 0, opacity: 0, y: 300 },
  idle: { 
     scale: 1, 
     opacity: 1, 
     y: 0,
     transition: { type: 'spring', damping: 12 }
  },
  shake: {
      x: [0, -5, 5, -5, 5, 0],
      transition: { duration: 0.4 }
  },
  exit: { scale: 2, opacity: 0, filter: 'brightness(2)', transition: { duration: 0.5 } }
};

export const PackOpener: React.FC<PackOpenerProps> = ({ 
    packName, 
    cards, 
    onClose,
    bgGradient = 'from-purple-600 to-indigo-700'
}) => {
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<'PACK' | 'OPENING' | 'REVEAL' | 'SUMMARY'>('PACK');
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [showParticles, setShowParticles] = useState(false);

  const cardVariants: Variants = {
    hidden: { scale: 0, x: 0, y: 0, rotate: 0 },
    delt: (i: number) => ({
      scale: 1,
      x: isMobile ? (i - 2) * 70 : (i - 2) * 140,
      y: 0,
      rotate: (i - 2) * 5,
      transition: { type: 'spring' as const, damping: 15, delay: i * 0.1 }
    }),
    grid: (i: number) => {
      if (isMobile) {
          // 移动端网格排列 (2x3 或 2x2)
          return {
              scale: 0.8,
              x: (i % 2 === 0 ? -70 : 70),
              y: (Math.floor(i / 2) - 1) * 140,
              rotate: 0,
              transition: { type: 'spring' as const, bounce: 0.5, duration: 0.8 }
          };
      }
      return {
          scale: 1.1,
          x: (i - 2) * 165,
          y: 0,
          rotate: 0,
          transition: { type: 'spring' as const, bounce: 0.5, duration: 0.8 }
      };
    }
  };

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
    cards.forEach((_, idx) => {
        setTimeout(() => {
             handleCardClick(idx);
        }, idx * 150);
    });
  };

  const isAllRevealed = revealedIndices.size === cards.length;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden safe-area-bottom">
        
        {/* Background Ambient Light */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br ${bgGradient} opacity-20 blur-[120px] rounded-full pointer-events-none`} />

        {/* Close Button */}
        {(phase === 'PACK' || phase === 'SUMMARY') && (
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-[110] safe-area-top">
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
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePackClick}
                    className="cursor-pointer relative z-20"
                >
                    <div className={`
                        w-56 md:w-64 h-72 md:h-80 rounded-2xl bg-gradient-to-br ${bgGradient}
                        border-4 border-white/20 shadow-[0_0_50px_rgba(124,58,237,0.5)]
                        flex items-center justify-center relative overflow-hidden
                    `}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        
                        <div className="relative z-10 text-center p-6">
                            <Sparkles className="w-12 md:w-16 h-12 md:h-16 text-yellow-300 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest drop-shadow-md">{packName}</h2>
                            <p className="text-white/60 text-xs md:text-sm mt-2">点击开启</p>
                        </div>
                    </div>
                    
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-full left-0 right-0 text-center text-white/50 text-xs font-mono tracking-widest mt-4"
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
                        animate={{ opacity: 1, y: isMobile ? -230 : -180 }}
                        className="absolute text-xl md:text-3xl font-bold text-white tracking-widest"
                    >
                        {isAllRevealed ? "获得奖励！" : "翻开你的卡牌"}
                    </motion.h2>

                    {/* Cards Container */}
                    <div className="relative w-full h-[350px] md:h-[400px] flex items-center justify-center perspective-1000">
                        {cards.map((card, idx) => {
                            const isRevealed = revealedIndices.has(idx);
                            const rarityColor = getRarityColor(card.rarity);
                            
                            return (
                                <motion.div
                                    key={card.id + '-' + idx}
                                    custom={idx}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="grid"
                                    className="absolute origin-center cursor-pointer"
                                    onClick={() => handleCardClick(idx)}
                                    style={{ zIndex: isRevealed ? 10 + idx : 30 - idx }}
                                >
                                    <div className={`${isMobile ? 'w-28 h-40' : 'w-40 h-56'} relative`}> 
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
                                                      relative
                                                    `}
                                                >
                                                    <img src="/ui/card_back.webp" className="w-full h-full object-cover" alt="Card Back" />
                                                    <div className={`absolute inset-0 bg-gradient-to-t ${rarityColor} opacity-0 hover:opacity-40 transition-opacity duration-500`} />
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>
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
                            <button
                                onClick={onClose}
                                className="px-10 md:px-12 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-bold text-white shadow-lg shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all text-base md:text-lg flex items-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" /> 收下卡牌
                            </button>
                        )}
                    </div>

                </div>
            )}
        </AnimatePresence>

        {/* Animation Particles */}
        {showParticles && phase === 'OPENING' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 <div className="animate-ping w-96 h-96 bg-white/20 rounded-full blur-3xl absolute" />
                 <div className="animate-ping w-64 h-64 bg-purple-500/40 rounded-full blur-2xl absolute" />
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

export default PackOpener;
