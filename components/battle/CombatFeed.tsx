import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CombatFeedProps {
  messages: string[];
  isMobile?: boolean;
}

const CombatFeed: React.FC<CombatFeedProps> = React.memo(({ messages, isMobile = false }) => {
  // Only show the last 3 messages - memoize to prevent re-renders
  const displayMessages = useMemo(() => messages.slice(-3), [messages]);

  return (
    <div className={`
      ${isMobile 
        ? 'flex flex-col gap-1.5 max-w-[180px]'
        : 'fixed left-4 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col gap-2 max-w-[200px]'
      }
    `}>
      <AnimatePresence mode="popLayout">
        {displayMessages.map((msg, i) => (
          <motion.div
            key={`${msg}-${messages.length - displayMessages.length + i}`}
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            className={`
              px-2.5 py-1.5 rounded-lg border backdrop-blur-md shadow-lg font-bold leading-tight
              ${isMobile ? 'text-[11px]' : 'text-[10px]'}
              ${msg.includes('玩家') || msg.includes('你')
                ? 'bg-blue-900/40 border-blue-500/30 text-blue-200' 
                : msg.includes('对手')
                ? 'bg-red-900/40 border-red-500/30 text-red-200'
                : 'bg-slate-900/40 border-slate-500/30 text-slate-200'}
            `}
          >
            {msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

CombatFeed.displayName = 'CombatFeed';

export default CombatFeed;
