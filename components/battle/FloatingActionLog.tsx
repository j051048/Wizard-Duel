/**
 * FloatingActionLog - 浮动行动日志
 * 
 * [P2 Fix #19] 像炉石一样，常驻显示最近5条出牌/攻击记录
 * 位于画面左侧，半透明浮动。
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingActionLogProps {
  messages: string[];
  maxVisible?: number;
}

export const FloatingActionLog: React.FC<FloatingActionLogProps> = ({ 
  messages, 
  maxVisible = 5 
}) => {
  // 只取最新的 N 条
  const visibleMessages = useMemo(() => {
    return messages.slice(-maxVisible);
  }, [messages, maxVisible]);

  if (visibleMessages.length === 0) return null;

  return (
    <div className="fixed left-3 top-1/3 z-30 pointer-events-none max-w-[200px] md:max-w-[260px]">
      <AnimatePresence mode="popLayout">
        {visibleMessages.map((msg, i) => {
          const globalIdx = messages.length - maxVisible + i;
          const isNew = i === visibleMessages.length - 1;
          
          // 颜色编码
          let textColor = 'text-gray-400';
          if (msg.includes('🔥') || msg.includes('伤害')) textColor = 'text-red-300';
          else if (msg.includes('❄️')) textColor = 'text-cyan-300';
          else if (msg.includes('⚡')) textColor = 'text-yellow-300';
          else if (msg.includes('💙') || msg.includes('恢复')) textColor = 'text-green-300';
          else if (msg.includes('🛡️') || msg.includes('护甲')) textColor = 'text-stone-300';
          else if (msg.includes('💀')) textColor = 'text-red-400';
          else if (msg.includes('⚔️')) textColor = 'text-amber-300';
          
          return (
            <motion.div
              key={`${globalIdx}-${msg.slice(0, 20)}`}
              initial={{ opacity: 0, x: -30, height: 0 }}
              animate={{ 
                opacity: isNew ? 0.9 : 0.5 - (visibleMessages.length - 1 - i) * 0.08,
                x: 0, 
                height: 'auto' 
              }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mb-1"
            >
              <div className={`
                text-[10px] md:text-xs leading-snug px-2 py-1 
                bg-black/40 backdrop-blur-sm rounded-md border border-white/5
                ${textColor}
                ${isNew ? 'border-white/15 bg-black/60' : ''}
              `}>
                {msg}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default FloatingActionLog;