/**
 * HealthBar - 血条组件（带动画）
 */

import React, { useState, useEffect, useRef, memo } from 'react';

interface HealthBarProps {
  current: number;
  max: number;
  isPlayer: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = memo(({ current, max, isPlayer }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = percentage <= 30;
  const isCritical = percentage <= 15;
  
  const [displayPercentage, setDisplayPercentage] = useState(percentage);
  const [isHurt, setIsHurt] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const prevPercentage = useRef(percentage);
  const prevCurrent = useRef(current);
  
  useEffect(() => {
    // 数值弹跳动画：当 current 真正改变时触发
    if (current !== prevCurrent.current) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 200);
      prevCurrent.current = current;
      return () => clearTimeout(timer);
    }
    
    if (percentage < prevPercentage.current) {
      setIsHurt(true);
      setTimeout(() => setIsHurt(false), 300);
    }
    prevPercentage.current = percentage;
    
    if (Math.abs(percentage - displayPercentage) < 0.5) {
      setDisplayPercentage(percentage);
      return;
    }

    let rafId: number;
    const startTime = performance.now();
    const startValue = displayPercentage;
    const endValue = percentage;
    const duration = 400;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (endValue - startValue) * eased;
      setDisplayPercentage(nextValue);
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [percentage]);

  return (
    <div className={`relative w-full h-full flex items-center pr-2 ${isLow ? 'hp-low-pulse' : ''}`}>
      <div className={`w-full h-3 md:h-5 bg-black/80 rounded-full overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] backdrop-blur-md ${isLow ? 'border border-red-500/40' : 'border border-white/5'}`}>
        
        <div 
          className="absolute inset-y-0 left-0 bg-white/40 transition-all duration-300 ease-out z-0"
          style={{ width: `${Math.max(percentage, displayPercentage)}%` }}
        />

        <div 
          className={`
            h-full relative z-10 transition-all duration-500 rounded-r-md
            ${isCritical 
               ? 'bg-gradient-to-r from-red-900 via-red-500 to-red-900 animate-pulse' 
               : 'bg-gradient-to-r from-red-600 via-red-500 to-red-600'
            }
          `}
          style={{ width: `${displayPercentage}%` }}
        >
          <div className="absolute inset-0 bg-[url('/noise.webp')] opacity-20 mix-blend-overlay" />
          <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <div className="bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10 flex items-center gap-1">
           <span className="text-[red] text-[10px] drop-shadow-sm">❤️</span>
           <span className={`text-[10px] md:text-xs font-black drop-shadow-md transition-transform duration-[200ms] ease-out ${isHurt ? 'text-white scale-110' : 'text-gray-100'}`} style={{ transform: isBouncing ? 'scale(1.2)' : isHurt ? 'scale(1.1)' : 'scale(1)' }}>
             {current} <span className="text-gray-400 font-normal">/ {max}</span>
           </span>
        </div>
      </div>
    </div>
  );
});
HealthBar.displayName = 'HealthBar';
