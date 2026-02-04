import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TurnIndicatorProps {
  isPlayerTurn: boolean;
  roundNumber: number;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({ isPlayerTurn, roundNumber }) => {
  const [show, setShow] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    // 当回合数变化或回合归属变化时触发
    if (roundNumber > 0) {
      setText(isPlayerTurn ? "YOUR TURN" : "ENEMY TURN");
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, roundNumber]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* 背景遮罩条 */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.8 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-x-0 h-32 ${isPlayerTurn ? 'bg-indigo-900/80' : 'bg-red-900/80'} shadow-lg border-y ${isPlayerTurn ? 'border-indigo-400' : 'border-red-400'}`}
          />
          
          {/* 文字内容 */}
          <motion.div
            initial={{ scale: 2, opacity: 0, letterSpacing: '20px' }}
            animate={{ scale: 1, opacity: 1, letterSpacing: '8px' }}
            exit={{ scale: 1.5, opacity: 0, letterSpacing: '12px' }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative z-10 flex flex-col items-center"
          >
            <h1 className={`text-6xl md:text-8xl font-black italic tracking-widest drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] ${
              isPlayerTurn 
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-300 stroke-text-indigo' 
                : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-red-300 stroke-text-red'
            }`}>
              {text}
            </h1>
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className={`mt-4 text-xl font-mono uppercase tracking-[1em] ${isPlayerTurn ? 'text-indigo-200' : 'text-red-200'}`}
            >
              Round {roundNumber}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
