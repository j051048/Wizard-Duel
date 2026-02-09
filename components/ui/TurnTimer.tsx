/**
 * TurnTimer - 回合计时器组件
 * 
 * [P4 Fix #38] 回合倒计时绳子效果
 */

import React from 'react';

interface TurnTimerProps {
  /** 剩余时间(秒) */
  timeLeft: number;
  /** 最大时间(秒) */
  maxTime: number;
  /** 紧急时间阈值(秒) */
  urgentThreshold?: number;
  /** 是否显示 */
  visible?: boolean;
}

export const TurnTimer: React.FC<TurnTimerProps> = React.memo(({ 
  timeLeft, 
  maxTime, 
  urgentThreshold = 10,
  visible = true 
}) => {
  if (!visible || maxTime <= 0) return null;
  
  const percentage = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));
  const isUrgent = timeLeft <= urgentThreshold && timeLeft > 0;
  
  return (
    <div className={`turn-timer ${isUrgent ? 'urgent' : ''}`}>
      <div 
        className="rope" 
        style={{ width: `${percentage}%` }}
      />
      {isUrgent && (
        <span className="burning-fuse">🔥</span>
      )}
    </div>
  );
});

TurnTimer.displayName = 'TurnTimer';

export default TurnTimer;
