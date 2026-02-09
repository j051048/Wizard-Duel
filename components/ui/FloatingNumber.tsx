/**
 * FloatingNumber - 伤害/治疗飘字组件
 * 
 * [P4 Fix #36] 英雄受伤显示
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingNumberProps {
  /** 数值 */
  value: number;
  /** 类型: 伤害/治疗 */
  type: 'damage' | 'heal' | 'armor';
  /** 是否暴击 */
  isCrit?: boolean;
  /** 坐标 */
  x?: number;
  y?: number;
  /** 唯一ID */
  id: string;
  /** 动画结束回调 */
  onComplete?: () => void;
}

export const FloatingNumber: React.FC<FloatingNumberProps> = React.memo(({ 
  value, 
  type, 
  isCrit = false,
  x = 50,
  y = 50,
  id,
  onComplete 
}) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  const getColor = () => {
    switch (type) {
      case 'damage': return isCrit ? '#fbbf24' : '#ef4444';
      case 'heal': return '#4ade80';
      case 'armor': return '#94a3b8';
    }
  };
  
  const getPrefix = () => {
    switch (type) {
      case 'damage': return '-';
      case 'heal': return '+';
      case 'armor': return '+';
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case 'damage': return isCrit ? '💥' : '⚔️';
      case 'heal': return '💚';
      case 'armor': return '🛡️';
    }
  };
  
  if (!visible) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        key={id}
        initial={{ 
          opacity: 0, 
          scale: 0.5, 
          y: 0,
          x: '-50%'
        }}
        animate={{ 
          opacity: [0, 1, 1, 0], 
          scale: [0.5, isCrit ? 1.4 : 1.1, 1, 0.8],
          y: -60
        }}
        transition={{ 
          duration: 1,
          times: [0, 0.2, 0.8, 1],
          ease: 'easeOut'
        }}
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          color: getColor(),
          fontSize: isCrit ? '2rem' : '1.5rem',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap'
        }}
      >
        <span>{getIcon()}</span>
        <span>{getPrefix()}{Math.abs(value)}</span>
        {isCrit && <span className="ml-1 text-sm">暴击!</span>}
      </motion.div>
    </AnimatePresence>
  );
});

FloatingNumber.displayName = 'FloatingNumber';

export default FloatingNumber;
