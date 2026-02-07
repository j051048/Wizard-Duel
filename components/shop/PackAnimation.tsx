/**
 * PackAnimation - 开包动画组件
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface PackAnimationProps {
  packName: string;
  hasRare: boolean;
  onAnimationComplete: () => void;
}

export const PackAnimation: React.FC<PackAnimationProps> = ({ 
  packName, 
  hasRare, 
  onAnimationComplete 
}) => {
  const [shakeCount, setShakeCount] = React.useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setShakeCount(1), 500);
    const timer2 = setTimeout(() => setShakeCount(2), 1500);
    const timer3 = setTimeout(() => {
      onAnimationComplete();
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onAnimationComplete]);

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ 
        scale: 1, 
        rotate: 0, 
        opacity: 1,
        y: shakeCount > 0 ? [0, -10, 0] : 0,
        x: shakeCount > 0 ? [0, -5, 5, -5, 5, 0] : 0
      }}
      exit={{ 
        scale: 2, 
        opacity: 0, 
        filter: 'brightness(2)',
        transition: { duration: 0.5 }
      }}
      transition={{
        type: 'spring',
        damping: 10,
        stiffness: 100
      }}
      className="relative cursor-pointer"
    >
      <div className={`
        w-48 h-64 md:w-64 md:h-80 rounded-2xl shadow-2xl
        bg-gradient-to-br ${hasRare ? 'from-yellow-600 via-amber-500 to-orange-600' : 'from-purple-600 via-indigo-600 to-blue-600'}
        border-4 ${hasRare ? 'border-yellow-400' : 'border-purple-400'}
        flex flex-col items-center justify-center
        relative overflow-hidden
      `}>
        {/* 光泽效果 */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50" />
        
        {/* 包装图案 */}
        <div className="relative z-10 text-center space-y-4">
          <div className="text-6xl">🎁</div>
          <div className="font-wizard font-black text-white text-2xl drop-shadow-lg">
            {packName}
          </div>
          <div className="text-white/80 text-sm">点击打开</div>
        </div>

        {/* 闪光动画 */}
        {hasRare && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
          />
        )}
      </div>
    </motion.div>
  );
};
