/**
 * TurnBanner - 回合开始/结束横幅动画
 * 炉石传说风格的 "YOUR TURN" / "ENEMY TURN" 大字动画
 */

import React, { useEffect, useState } from 'react';
import { HapticService } from '../../services/haptic';

interface TurnBannerProps {
  type: 'player' | 'opponent' | null;
  roundNumber?: number;
  onAnimationComplete?: () => void;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({ type, roundNumber = 0, onAnimationComplete }) => {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit' | 'hidden'>('hidden');
  const [currentType, setCurrentType] = useState<'player' | 'opponent' | null>(null);
  const [displayRound, setDisplayRound] = useState(0);

  useEffect(() => {
    // 只有在 type 从 null 变为有效值时才启动主序列
    if (type && type !== currentType) {
      setCurrentType(type);
      setDisplayRound(roundNumber);
      setPhase('enter');
      
      if (type === 'player') {
        HapticService.medium();
      }

      // 明确的定时器序列
      const t1 = setTimeout(() => {
        setPhase('hold');
      }, 300);

      const t2 = setTimeout(() => {
        setPhase('exit');
      }, 1800);

      const t3 = setTimeout(() => {
        setPhase('hidden');
        setCurrentType(null);
        onAnimationComplete?.();
      }, 2500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else if (!type && currentType && phase !== 'hidden') {
      // 外部强制重置为 null 时的处理
      const t = setTimeout(() => {
        setPhase('hidden');
        setCurrentType(null);
        onAnimationComplete?.();
      }, 500);
      return () => clearTimeout(t);
    }
    // 注意：绝对不能依赖 phase，否则每一步状态更新都会重置定时器导致卡死在 enter 阶段(透明度0)
  }, [type, roundNumber, onAnimationComplete]);

  if (phase === 'hidden' && !currentType) return null;

  const isPlayer = (currentType || type) === 'player';
  const text = isPlayer ? '你的回合' : '对手回合';
  const subText = isPlayer ? 'YOUR TURN' : 'ENEMY TURN';

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
      {/* 局部背景条 - 代替全屏遮罩，减少视觉阻挡 */}
      <div 
        className={`
          absolute w-full h-40 transition-all duration-700 ease-in-out
          ${isPlayer ? 'bg-gradient-to-r from-transparent via-yellow-950/40 to-transparent' : 'bg-gradient-to-r from-transparent via-red-950/40 to-transparent'}
          ${phase === 'enter' || phase === 'hold' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}
        `}
      />

      {/* 顶部装饰线 */}
      <div 
        className={`
          absolute top-1/2 -translate-y-24 h-[2px] w-full transition-all duration-700 delay-100
          ${isPlayer ? 'bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent' : 'bg-gradient-to-r from-transparent via-red-500/50 to-transparent'}
          ${phase === 'hold' ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}
        `}
      />

      {/* 底部装饰线 */}
      <div 
        className={`
          absolute top-1/2 translate-y-24 h-[2px] w-full transition-all duration-700 delay-100
          ${isPlayer ? 'bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent' : 'bg-gradient-to-r from-transparent via-red-500/50 to-transparent'}
          ${phase === 'hold' ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}
        `}
      />

      {/* 主文字内容 */}
      <div 
        className={`
          relative flex flex-col items-center transition-all duration-700
          ${phase === 'enter' ? 'scale-150 opacity-0 blur-lg' : ''}
          ${phase === 'hold' ? 'scale-100 opacity-100 blur-0' : ''}
          ${phase === 'exit' ? 'scale-110 opacity-0 blur-md translate-y-4' : ''}
        `}
      >
        {/* 文字背景辉光 */}
        <div 
          className={`
            absolute inset-0 -z-10 blur-3xl rounded-full transition-all duration-1000
            ${isPlayer ? 'bg-yellow-400/20' : 'bg-red-500/20'}
            ${phase === 'hold' ? 'scale-[3] opacity-100' : 'scale-100 opacity-0'}
          `}
        />

        {/* 英文副标题 - 增加间距感 */}
        <div className={`
          text-xs md:text-sm tracking-[0.8em] font-sans font-bold mb-3
          ${isPlayer ? 'text-yellow-400' : 'text-red-400'}
          drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]
        `}>
          {subText}
        </div>

        {/* 中文标题 - 优化渐变和边缘 */}
        <h1 className={`
          text-6xl md:text-8xl font-wizard font-black italic tracking-wider
          ${isPlayer ? 'text-yellow-400' : 'text-red-500'}
          drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]
          bg-clip-text text-transparent bg-gradient-to-b
          ${isPlayer 
            ? 'from-yellow-100 via-amber-400 to-yellow-600' 
            : 'from-red-200 via-red-500 to-red-900'
          }
        `}>
          {text}
        </h1>

        {/* 回合数显示 - 恢复被移除的信息 */}
        <div className={`
          mt-4 text-sm md:text-base font-mono tracking-[0.4em] uppercase
          ${isPlayer ? 'text-yellow-500/80' : 'text-red-500/80'}
        `}>
          — 第 {displayRound} 回合 —
        </div>

        {/* 底部短装饰线 */}
        <div 
          className={`
            h-1 rounded-full mt-4 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-500 delay-300
            ${isPlayer ? 'bg-gradient-to-r from-transparent via-yellow-400 to-transparent' : 'bg-gradient-to-r from-transparent via-red-500 to-transparent'}
            ${phase === 'hold' ? 'w-64' : 'w-0'}
          `}
        />
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