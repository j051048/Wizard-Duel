import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialBubbleProps {
  isVisible: boolean;
  text: string;
  targetRef?: React.RefObject<HTMLElement>;
  position?: 'top' | 'bottom';
}

export const TutorialBubble: React.FC<TutorialBubbleProps> = ({ isVisible, text, position = 'top' }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3, type: 'spring' }}
          className={`
            absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none w-max
            ${position === 'top' ? '-top-16 mb-2' : '-bottom-16 mt-2'}
          `}
        >
          <div className="relative">
            {/* Bubble Body */}
            <div className="bg-amber-500 text-black font-bold px-4 py-2 rounded-xl shadow-lg border-2 border-amber-300 animate-bounce">
              {text}
            </div>
            
            {/* Triangle Pointer */}
            <div className={`
              absolute left-1/2 -translate-x-1/2 w-0 h-0 
              border-l-[8px] border-l-transparent
              border-r-[8px] border-r-transparent
              ${position === 'top' 
                ? 'bottom-[-8px] border-t-[8px] border-t-amber-500' 
                : 'top-[-8px] border-b-[8px] border-b-amber-500'
              }
            `} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
