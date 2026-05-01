import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticService } from '../../services/haptic';
import { audioBridge } from '../../hooks/useAudioManager';

interface TurnBannerProps {
  type: 'player' | 'opponent' | null;
  roundNumber?: number;
  onAnimationComplete?: () => void;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({ type, roundNumber = 0 }) => {
  const isPlayer = type === 'player';
  
  // [P1 增强] 播放回合开始音效
  useEffect(() => {
    if (type === 'player') {
      HapticService.medium();
      // 尝试播放回合开始音效
      try {
        audioBridge.playSfx('turn_start');
      } catch (e) {
        // 音效文件可能不存在，静默处理
      }
    } else if (type === 'opponent') {
      HapticService.light();
    }
  }, [type]);
  
  // Theme configuration - [P1 增强] 更鲜艳的配色
  const theme = isPlayer ? {
     main: '#eab308', // yellow-500
     glow: 'rgba(234, 179, 8, 0.6)',
     bg: 'linear-gradient(90deg, transparent 0%, rgba(66, 32, 6, 0.95) 15%, rgba(66, 32, 6, 0.95) 85%, transparent 100%)',
     border: '#facc15', // yellow-400
     text: 'YOUR TURN',
     sub: 'PLAYER PHASE',
     edgeGlow: '0 0 100px 20px rgba(234, 179, 8, 0.4)'
  } : {
     main: '#ef4444', // red-500
     glow: 'rgba(239, 68, 68, 0.6)',
     bg: 'linear-gradient(90deg, transparent 0%, rgba(69, 10, 10, 0.95) 15%, rgba(69, 10, 10, 0.95) 85%, transparent 100%)',
     border: '#f87171', // red-400
     text: 'ENEMY TURN',
     sub: 'OPPONENT PHASE',
     edgeGlow: '0 0 100px 20px rgba(239, 68, 68, 0.4)'
  };

  return (
    <AnimatePresence>
      {type && (
        <motion.div
           key="banner-container"
           className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.3 }}
           onAnimationStart={() => {
              if (type === 'player') HapticService.medium();
           }}
        >
          {/* 1. Backdrop Blur Strip */}
          <motion.div
             className="absolute w-full h-32 md:h-40"
             style={{ background: theme.bg }}
             initial={{ scaleX: 0 }}
             animate={{ scaleX: 1 }}
             exit={{ scaleX: 0, opacity: 0 }}
             transition={{ duration: 0.4, ease: "easeOut" }}
          />

          {/* 2. Top & Bottom Border Rails (The "Scroll" rods) */}
          <motion.div className="absolute w-full flex flex-col items-center justify-center">
             {/* Top Rail */}
             <motion.div 
               className="h-[2px] w-full max-w-4xl opacity-80"
               style={{ 
                   background: `linear-gradient(90deg, transparent, ${theme.border}, transparent)`,
                   boxShadow: `0 0 10px ${theme.glow}`
               }}
               initial={{ translateY: 0, scaleX: 0 }}
               animate={{ translateY: -50, scaleX: 1 }}
               exit={{ translateY: 0, scaleX: 0, opacity: 0 }}
               transition={{ duration: 0.5, ease: "circOut" }}
             />
             
             {/* Bottom Rail */}
             <motion.div 
               className="h-[2px] w-full max-w-4xl opacity-80"
               style={{ 
                   background: `linear-gradient(90deg, transparent, ${theme.border}, transparent)`,
                   boxShadow: `0 0 10px ${theme.glow}`

               }}
               initial={{ translateY: 0, scaleX: 0 }}
               animate={{ translateY: 50, scaleX: 1 }}
               exit={{ translateY: 0, scaleX: 0, opacity: 0 }}
               transition={{ duration: 0.5, ease: "circOut" }}
             />
          </motion.div>

          {/* 3. Central Content */}
          <div className="relative z-10 flex flex-col items-center justify-center overflow-hidden h-32">
             
             {/* Main Title */}
             <motion.h1
               className="text-3xl md:text-7xl font-black italic tracking-tighter"
               style={{ 
                   fontFamily: '"Outfit", sans-serif',
                   color: 'transparent',
                   WebkitTextStroke: `1px ${theme.border}`,
                   backgroundImage: `linear-gradient(180deg, #fff 0%, ${theme.main} 100%)`,
                   backgroundClip: 'text',
                   WebkitBackgroundClip: 'text',
                   filter: `drop-shadow(0 4px 8px ${theme.glow})`
               }}
               initial={{ y: 20, opacity: 0, scale: 0.8 }}
               animate={{ y: 0, opacity: 1, scale: 1 }}
               exit={{ y: -20, opacity: 0, scale: 1.1 }}
               transition={{ delay: 0.2, duration: 0.4, type: "spring", bounce: 0.5 }}
             >
               {theme.text}
             </motion.h1>

              {/* Subtitle / Round Info */}
              <motion.div
                 className="flex items-center gap-3 mt-2"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 transition={{ delay: 0.4 }}
              >
                 <div className="h-[1px] w-8 md:w-12 bg-white/40" />
                 <span className="text-[10px] md:text-sm font-mono text-white/80 tracking-widest uppercase">
                    Round {roundNumber}
                 </span>
                 <div className="h-[1px] w-8 md:w-12 bg-white/40" />
              </motion.div>
          </div>

          {/* 4. Magical Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden h-full">
              {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full box-shadow"
                    style={{
                        left: '50%',
                        top: '50%',
                        boxShadow: `0 0 5px ${theme.main}`
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                    animate={{ 
                        x: (Math.random() - 0.5) * 600, 
                        y: (Math.random() - 0.5) * 100, 
                        opacity: 0,
                        scale: Math.random() * 2 + 1
                    }}
                    transition={{ 
                        duration: 0.8, 
                        delay: 0.2 + Math.random() * 0.2,
                        ease: "easeOut"
                    }}
                  />
              ))}
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TurnBanner;