import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialBubbleProps {
  isVisible: boolean;
  text: string;
  targetRef?: React.RefObject<HTMLElement>;
  position?: 'top' | 'bottom';
  /** 是否使用增强版样式（用于首次关键引导） */
  variant?: 'default' | 'prominent';
}

export const TutorialBubble: React.FC<TutorialBubbleProps> = ({ 
  isVisible, 
  text, 
  position = 'top',
  variant = 'prominent' 
}) => {
  const isProminent = variant === 'prominent';
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? 20 : -20, scale: 0.6 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
          }}
          exit={{ opacity: 0, scale: 0.5, y: position === 'top' ? 10 : -10 }}
          transition={{ duration: 0.4, type: 'spring', bounce: 0.5 }}
          className={`
            absolute left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-max
            ${position === 'top' ? '-top-20 mb-2' : '-bottom-20 mt-2'}
          `}
        >
          <div className="relative">
            {/* [P0 增强] 外层呼吸光晕 */}
            {isProminent && (
              <motion.div 
                className="absolute -inset-3 bg-amber-400/30 rounded-2xl blur-xl"
                animate={{ 
                  scale: [1, 1.15, 1],
                  opacity: [0.4, 0.7, 0.4]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
            
            {/* Bubble Body */}
            <motion.div 
              className={`
                relative px-5 py-3 rounded-xl font-bold text-base
                shadow-[0_4px_20px_rgba(251,191,36,0.5)]
                ${isProminent 
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 text-amber-900 border-2 border-yellow-300'
                  : 'bg-amber-500 text-black border-2 border-amber-300'
                }
              `}
              animate={isProminent ? { 
                y: [0, -6, 0],
              } : {}}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* 文字内容 */}
              <span className="flex items-center gap-2 whitespace-nowrap">
                {text}
              </span>
              
              {/* [P0 增强] 边框闪光效果 */}
              {isProminent && (
                <motion.div 
                  className="absolute inset-0 rounded-xl border-2 border-white/60"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>
            
            {/* Triangle Pointer - 增强版 */}
            <div className={`
              absolute left-1/2 -translate-x-1/2 w-0 h-0 
              border-l-[10px] border-l-transparent
              border-r-[10px] border-r-transparent
              ${position === 'top' 
                ? 'bottom-[-10px] border-t-[10px] border-t-amber-400' 
                : 'top-[-10px] border-b-[10px] border-b-amber-400'
              }
            `} />
            
            {/* [P0 增强] 手指指引动画 */}
            {isProminent && position === 'top' && (
              <motion.div
                className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-3xl"
                animate={{ 
                  y: [0, 8, 0],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                👇
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
