/**
 * ManaDisplay - 法力水晶显示组件
 * [P1 Fix #8] 充能填充动画
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ManaDisplayProps {
  current: number;
  max: number;
}

export const ManaDisplay: React.FC<ManaDisplayProps> = memo(({ current, max }) => {
  const prevMaxRef = useRef(max);
  const [isNewTurn, setIsNewTurn] = useState(false);
  
  // [P1 Fix #8] 检测新回合法力恢复 → 触发充能动画
  useEffect(() => {
    if (max > prevMaxRef.current || current === max) {
      setIsNewTurn(true);
      const timer = setTimeout(() => setIsNewTurn(false), 1200);
      return () => clearTimeout(timer);
    }
    prevMaxRef.current = max;
  }, [current, max]);

  const isAllFull = current === max && max > 0;

  return (
    <div className={`flex gap-1 items-center justify-center py-1 ${isAllFull ? 'mana-full-glow' : ''}`}>
      {Array.from({ length: max }).map((_, i) => {
        const isFull = i < current;
        // 充能动画延迟：逐颗从左到右点亮
        const fillDelay = isNewTurn ? i * 0.08 : 0;
        
        return (
          <motion.div 
            key={i}
            className="relative w-6 h-6 sm:w-8 sm:h-8"
            animate={isNewTurn && isFull ? {
              scale: [1, 1.3, 1],
              transition: { delay: fillDelay, duration: 0.3, ease: 'easeOut' }
            } : {}}
          >
            {/* 水晶基底（始终显示灰色） */}
            <img 
              src="/ui/mana_crystal_inactive_v2.webp"
              alt="Empty Mana"
              className="w-full h-full object-contain absolute inset-0 grayscale opacity-80"
            />
            
            {/* 充能填充层 — 带动画 */}
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ 
                opacity: isFull ? 1 : 0,
                scale: isFull ? 1 : 0.6,
              }}
              transition={{ 
                delay: fillDelay,
                duration: 0.35,
                ease: 'easeOut'
              }}
            >
              <img 
                src="/ui/mana_crystal_active_v2.webp"
                alt="Full Mana" 
                className="w-full h-full object-contain filter drop-shadow-md brightness-110"
              />
            </motion.div>
            
            {/* 充能闪光效果 */}
            {isFull && isNewTurn && (
              <motion.div
                className="absolute inset-0 bg-purple-400 rounded-full blur-md"
                initial={{ opacity: 0.8, scale: 1.5 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{ delay: fillDelay, duration: 0.5 }}
              />
            )}
            
            {/* 常驻脉冲光晕 */}
            {isFull && (
              <div className="absolute inset-2 bg-purple-500/30 rounded-full blur-[4px] animate-pulse -z-10" />
            )}
          </motion.div>
        );
      })}
      <div className="ml-2 font-wizard font-bold text-lg text-purple-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center">
        <motion.span
          key={current}
          initial={{ scale: 1.4, color: '#c084fc' }}
          animate={{ scale: 1, color: '#e9d5ff' }}
          transition={{ duration: 0.3 }}
        >
          {current}
        </motion.span>
        <span className="text-purple-500/80 mx-0.5 text-sm">/</span>
        <span className="text-sm text-purple-400">{max}</span>
      </div>
    </div>
  );
});
ManaDisplay.displayName = 'ManaDisplay';
