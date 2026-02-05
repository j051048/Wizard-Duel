/**
 * TurnBanner - 回合开始/结束横幅动画
 * 炉石传说风格的 "YOUR TURN" / "ENEMY TURN" 大字动画
 */

import React, { useEffect, useState } from 'react';
import { HapticService } from '../../services/haptic';

interface TurnBannerProps {
  type: 'player' | 'opponent' | null;
  onAnimationComplete?: () => void;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({ type, onAnimationComplete }) => {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit' | 'hidden'>('hidden');
  const [currentType, setCurrentType] = useState<'player' | 'opponent' | null>(null);

  useEffect(() => {
    if (type) {
      setCurrentType(type);
      setPhase('enter');
      
      if (type === 'player') {
        HapticService.medium();
      }

      // 动画序列 (总时长约 2.5秒)
      const enterTimer = setTimeout(() => setPhase('hold'), 300);
      const holdTimer = setTimeout(() => setPhase('exit'), 1800); // 保持约 1.5 秒
      const exitTimer = setTimeout(() => {
        setPhase('hidden');
        onAnimationComplete?.();
      }, 2500); // 2.5 秒后彻底隐藏

      return () => {
        clearTimeout(enterTimer);
        clearTimeout(holdTimer);
        clearTimeout(exitTimer);
      };
    }
  }, [type, onAnimationComplete]);

  if (phase === 'hidden' || !currentType) return null;

  const isPlayer = currentType === 'player';
  const text = isPlayer ? '你的回合' : '对手回合';
  const subText = isPlayer ? 'YOUR TURN' : 'ENEMY TURN';

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
      {/* 背景遮罩 */}
      <div 
        className={`
          absolute inset-0 transition-opacity duration-500
          ${phase === 'enter' || phase === 'hold' ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ backgroundColor: isPlayer ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}
      />

      {/* 横线装饰 - 上 */}
      <div 
        className={`
          absolute top-1/2 -mt-20 h-px w-full transition-all duration-500
          ${isPlayer ? 'bg-gradient-to-r from-transparent via-yellow-500 to-transparent' : 'bg-gradient-to-r from-transparent via-red-500 to-transparent'}
          ${phase === 'enter' ? 'scale-x-0 opacity-0' : phase === 'hold' ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}
        `}
      />

      {/* 横线装饰 - 下 */}
      <div 
        className={`
          absolute top-1/2 mt-20 h-px w-full transition-all duration-500
          ${isPlayer ? 'bg-gradient-to-r from-transparent via-yellow-500 to-transparent' : 'bg-gradient-to-r from-transparent via-red-500 to-transparent'}
          ${phase === 'enter' ? 'scale-x-0 opacity-0' : phase === 'hold' ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}
        `}
      />

      {/* 主文字容器 */}
      <div 
        className={`
          relative transition-all duration-700 ease-out
          ${phase === 'enter' ? 'scale-150 opacity-0' : ''}
          ${phase === 'hold' ? 'scale-100 opacity-100' : ''}
          ${phase === 'exit' ? 'scale-95 opacity-0 -translate-y-2' : ''}
        `}
      >
        {/* 光晕背景 */}
        <div 
          className={`
            absolute inset-0 blur-3xl -z-10 transition-opacity duration-300
            ${isPlayer ? 'bg-yellow-500/30' : 'bg-red-500/30'}
            ${phase === 'hold' ? 'opacity-100 scale-150' : 'opacity-0 scale-100'}
          `}
        />

        {/* 英文副标题 */}
        <div 
          className={`
            text-center text-sm tracking-[0.5em] uppercase font-tech mb-2
            ${isPlayer ? 'text-yellow-400/80' : 'text-red-400/80'}
          `}
        >
          {subText}
        </div>

        {/* 中文主标题 */}
        <h1 
          className={`
            text-5xl md:text-7xl font-wizard font-black text-center
            drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]
            ${isPlayer 
              ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-600' 
              : 'text-transparent bg-clip-text bg-gradient-to-b from-red-300 via-red-500 to-red-800'
            }
          `}
        >
          {text}
        </h1>

        {/* 底部装饰线 */}
        <div className="flex justify-center mt-4">
          <div 
            className={`
              h-1 rounded-full transition-all duration-500 delay-200
              ${isPlayer ? 'bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600' : 'bg-gradient-to-r from-red-600 via-red-400 to-red-600'}
              ${phase === 'hold' ? 'w-48' : 'w-0'}
            `}
          />
        </div>
      </div>

      {/* 粒子效果 */}
      {phase === 'hold' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`
                absolute w-2 h-2 rounded-full animate-ping
                ${isPlayer ? 'bg-yellow-400' : 'bg-red-400'}
              `}
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${30 + Math.random() * 40}%`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '1s',
                opacity: 0.6
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TurnBanner;