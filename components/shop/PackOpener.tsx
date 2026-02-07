import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Spell } from '../../types';
import { SpellCard } from '../SpellCard';
import { HapticService } from '../../services/haptic';
import { Sparkles, CheckCircle, X, Zap, Star } from 'lucide-react';
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

/**
 * PackOpener - 开包动画组件
 * [P0 商业化] 升级开包体验，增加金光特效和 3D 翻转动画
 */
export const PackOpener: React.FC<PackOpenerProps> = ({ 
    packName, 
    cards, 
    onClose,
    bgGradient = 'from-purple-600 to-indigo-700'
}) => {
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<'PACK' | 'BURST' | 'REVEAL' | 'SUMMARY'>('PACK');
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [showParticles, setShowParticles] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 检测是否有稀有卡
  const hasRare = cards.some(c => c.rarity === 'legendary' || c.rarity === 'mythic');

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

  // [P0 商业化] 金光粒子爆发效果
  useEffect(() => {
    if (phase !== 'BURST' || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; life: number; maxLife: number;
      type: 'spark' | 'star' | 'glow';
    }> = [];
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 生成爆发粒子
    const colors = hasRare 
      ? ['#ffd700', '#ffec4d', '#fff5b3', '#ffffff', '#fbbf24', '#f59e0b']
      : ['#a855f7', '#c084fc', '#e879f9', '#f0abfc', '#ffffff'];
    
    // 星星粒子
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 8 + Math.random() * 12;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1000 + Math.random() * 500,
        maxLife: 1500,
        type: 'star'
      });
    }
    
    // 火花粒子
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: centerX + (Math.random() - 0.5) * 100,
        y: centerY + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 600 + Math.random() * 400,
        maxLife: 1000,
        type: 'spark'
      });
    }
    
    // 光晕粒子
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 1,
        size: 20 + Math.random() * 30,
        color: hasRare ? 'rgba(255, 215, 0, 0.3)' : 'rgba(168, 85, 247, 0.3)',
        life: 800 + Math.random() * 400,
        maxLife: 1200,
        type: 'glow'
      });
    }
    
    let animationId: number;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 中心爆发光
      const burstProgress = Math.min(elapsed / 500, 1);
      const burstSize = 50 + burstProgress * 300;
      const burstOpacity = (1 - burstProgress) * 0.8;
      
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, burstSize);
      gradient.addColorStop(0, hasRare ? `rgba(255, 215, 0, ${burstOpacity})` : `rgba(168, 85, 247, ${burstOpacity})`);
      gradient.addColorStop(0.5, hasRare ? `rgba(255, 200, 0, ${burstOpacity * 0.5})` : `rgba(192, 132, 252, ${burstOpacity * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制粒子
      particles.forEach((p, idx) => {
        p.life -= 16;
        if (p.life <= 0) return;
        
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // 重力
        p.vx *= 0.98;
        
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        
        if (p.type === 'star') {
          // 绘制星星
          ctx.fillStyle = p.color;
          ctx.beginPath();
          const spikes = 4;
          const outerRadius = p.size;
          const innerRadius = p.size / 2;
          
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = p.x + Math.cos(angle) * radius;
            const y = p.y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        } else if (p.type === 'spark') {
          // 绘制火花
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'glow') {
          // 绘制光晕
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          glowGrad.addColorStop(0, p.color);
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      ctx.globalAlpha = 1;
      
      if (elapsed < 1200 && particles.some(p => p.life > 0)) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [phase, hasRare]);

  // Auto transition from BURST to REVEAL
  useEffect(() => {
    if (phase === 'BURST') {
        const timer = setTimeout(() => {
            setPhase('REVEAL');
            HapticService.heavy();
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const handlePackClick = () => {
      HapticService.medium();
      setPhase('BURST');
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
        
        {/* [P0 商业化] 金光粒子 Canvas */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-30"
        />
        
        {/* Background Ambient Light */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br ${hasRare ? 'from-yellow-600 to-amber-700' : bgGradient} opacity-20 blur-[120px] rounded-full pointer-events-none transition-all duration-1000`} />

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
                        hover:scale-105 transition-transform duration-300
                    `}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        
                        {/* 闪光效果 */}
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute -inset-full top-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-[shimmer_3s_infinite]" />
                        </div>
                        
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

            {/* STAGE 2: BURST ANIMATION */}
            {phase === 'BURST' && (
              <motion.div
                key="burst"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="relative z-20"
              >
                <div className={`w-56 md:w-64 h-72 md:h-80 rounded-2xl bg-gradient-to-br ${hasRare ? 'from-yellow-400 to-amber-600' : bgGradient} flex items-center justify-center`}>
                  <Star className="w-20 h-20 text-white animate-spin" />
                </div>
              </motion.div>
            )}

            {/* STAGE 3: CARDS REVEAL */}
            {phase === 'REVEAL' && (
                <div className="relative w-full h-full flex flex-col items-center justify-center z-20">
                    
                    {/* Title */}
                    <motion.h2 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: isMobile ? -230 : -180 }}
                        className={`absolute text-xl md:text-3xl font-bold tracking-widest ${hasRare ? 'text-yellow-300' : 'text-white'}`}
                    >
                        {isAllRevealed ? (hasRare ? "🌟 稀有发现！" : "获得奖励！") : "翻开你的卡牌"}
                    </motion.h2>

                    {/* Cards Container */}
                    <div className="relative w-full h-[350px] md:h-[400px] flex items-center justify-center perspective-1000">
                        {cards.map((card, idx) => {
                            const isRevealed = revealedIndices.has(idx);
                            const rarityColor = getRarityColor(card.rarity);
                            const isHighRarity = card.rarity === 'legendary' || card.rarity === 'mythic';
                            
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
                                        {/* [P0 商业化] 稀有卡光环 */}
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
                                                      relative transition-colors duration-300
                                                    `}
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

// Helper
function getRarityColor(rarity: string) {
    if (rarity === 'legendary' || rarity === 'mythic') return 'from-transparent via-yellow-500/50 to-yellow-500/80';
    if (rarity === 'rare') return 'from-transparent via-blue-500/50 to-blue-500/80';
    if (rarity === 'uncommon') return 'from-transparent via-green-500/50 to-green-500/80';
    return 'from-transparent via-black/50 to-black/80';
}

export default PackOpener;
