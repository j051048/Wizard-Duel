/**
 * TurnTimer - 回合计时器组件
 * 炉石传说风格的绳子燃烧倒计时
 */

import React, { useEffect, useState, useRef } from 'react';
import { HapticService } from '../../services/haptic';

interface TurnTimerProps {
  isActive: boolean; // 是否是玩家回合
  duration?: number; // 回合时长（秒）
  warningTime?: number; // 开始警告的剩余时间
  onTimeUp?: () => void; // 时间耗尽回调
  onWarning?: () => void; // 进入警告时间回调
}

export const TurnTimer: React.FC<TurnTimerProps> = ({
  isActive,
  duration = 60,
  warningTime = 15,
  onTimeUp,
  onWarning
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isBurning, setIsBurning] = useState(false);
  const hasWarned = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 重置计时器当回合变化
  useEffect(() => {
    setTimeLeft(duration);
    setIsBurning(false);
    hasWarned.current = false;
  }, [isActive, duration]);

  // 倒计时逻辑
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 0.1;
        
        // 进入警告时间
        if (newTime <= warningTime && !hasWarned.current) {
          hasWarned.current = true;
          setIsBurning(true);
          onWarning?.();
        }
        
        // 最后5秒震动提示
        if (newTime <= 5 && newTime > 0 && Math.floor(newTime) !== Math.floor(newTime + 0.1)) {
          HapticService.light();
        }
        
        // 时间耗尽
        if (newTime <= 0) {
          HapticService.heavy();
          onTimeUp?.();
          return 0;
        }
        
        return newTime;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, warningTime, onTimeUp, onWarning]);

  const percentage = (timeLeft / duration) * 100;
  const isLowTime = timeLeft <= warningTime;
  const isCriticalTime = timeLeft <= 5;

  if (!isActive) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* 主绳子容器 */}
      <div className="relative h-3 bg-slate-900/80 backdrop-blur-sm border-t border-white/10">
        {/* 进度条 */}
        <div 
          className={`
            absolute top-0 left-0 h-full transition-all duration-100 ease-linear
            ${isCriticalTime 
              ? 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600' 
              : isLowTime 
                ? 'bg-gradient-to-r from-yellow-500 via-orange-400 to-yellow-500' 
                : 'bg-gradient-to-r from-green-500 via-emerald-400 to-green-500'
            }
          `}
          style={{ width: `${percentage}%` }}
        >
          {/* 光泽效果 */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
        </div>

        {/* 燃烧端点 */}
        {isBurning && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 transition-all duration-100"
            style={{ left: `${percentage}%`, marginLeft: '-12px' }}
          >
            {/* 火焰动画 */}
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-orange-500 rounded-full blur-md animate-pulse" />
              <div className="absolute inset-1 bg-yellow-400 rounded-full blur-sm animate-ping" />
              <div className="absolute inset-2 bg-white rounded-full" />
            </div>
            
            {/* 火花粒子 */}
            {isCriticalTime && (
              <>
                <div className="absolute -top-2 left-1/2 w-1 h-1 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="absolute -top-3 left-1/3 w-1 h-1 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                <div className="absolute -top-2 left-2/3 w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              </>
            )}
          </div>
        )}

        {/* 刻度标记 */}
        <div className="absolute inset-0 flex justify-between px-2 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-px h-full bg-white/10" />
          ))}
        </div>
      </div>

      {/* 时间数字显示 */}
      <div className={`
        absolute bottom-full right-4 mb-2 px-3 py-1 rounded-lg
        transition-all duration-300
        ${isCriticalTime 
          ? 'bg-red-500/90 text-white animate-pulse scale-110' 
          : isLowTime 
            ? 'bg-yellow-500/90 text-black' 
            : 'bg-black/60 text-white'
        }
      `}>
        <span className="font-mono font-bold text-lg">
          {Math.ceil(timeLeft)}
        </span>
      </div>

      {/* 警告闪烁边框 */}
      {isCriticalTime && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 border-4 border-red-500/50 animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default TurnTimer;