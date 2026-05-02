import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type FloatingTextType = 'damage' | 'heal' | 'armor' | 'crit' | 'mana' | 'status' | 'combo';

export interface FloatingTextItem {
  id: string;
  text: string;
  type: FloatingTextType;
  x: number;
  y: number;
  duration?: number;
}

interface FloatingTextProps {
  items: FloatingTextItem[];
}

/**
 * FloatingTextOverlay - 飘字效果组件
 * [P0 UX] 优化伤害数字显示时间和动画
 */
export const FloatingTextOverlay: React.FC<FloatingTextProps> = ({ items }) => {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {items.map((item) => (
          <FloatingText key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const FloatingText: React.FC<{ item: FloatingTextItem }> = ({ item }) => {
  const settings = useMemo(() => {
    switch (item.type) {
      case 'crit':
        return {
          color: 'text-yellow-400',
          shadow: 'drop-shadow-[0_0_12px_rgba(255,215,0,0.9)]',
          scale: [0.5, 1.8, 1.2],
          yOffset: -140,
          emoji: '💥',
          fontSize: 'text-5xl font-extrabold',
          shake: true
        };
      case 'combo':
        return {
          color: 'text-purple-400',
          shadow: 'drop-shadow-[0_0_15px_rgba(168,85,247,0.9)]',
          scale: [0.3, 2.0, 1.4],
          yOffset: -120,
          emoji: '⚡',
          fontSize: 'text-4xl font-extrabold',
          shake: true
        };
      case 'heal':
        return {
          color: 'text-green-400',
          shadow: 'drop-shadow-[0_0_5px_rgba(74,222,128,0.6)]',
          scale: [0.8, 1.2, 1],
          yOffset: -90,
          emoji: '💚',
          fontSize: 'text-3xl font-bold',
          shake: false
        };
      case 'armor':
        return {
          color: 'text-blue-300',
          shadow: 'drop-shadow-[0_0_5px_rgba(147,197,253,0.6)]',
          scale: [0.8, 1.2, 1],
          yOffset: -70,
          emoji: '🛡️',
          fontSize: 'text-3xl font-bold',
          shake: false
        };
      case 'mana':
        return {
          color: 'text-purple-300',
          shadow: 'drop-shadow-[0_0_5px_rgba(168,85,247,0.6)]',
          scale: [0.8, 1.1, 1],
          yOffset: -60,
          emoji: '💎',
          fontSize: 'text-xl font-bold',
          shake: false
        };
       case 'status':
        return {
          color: 'text-amber-300',
          shadow: 'drop-shadow-[0_0_5px_rgba(252,211,77,0.6)]',
          scale: [0.9, 1.1, 1],
          yOffset: -50,
          emoji: '',
          fontSize: 'text-lg font-bold',
          shake: false
        };
      case 'damage':
      default:
        return {
          color: 'text-white',
          shadow: 'drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]',
          scale: [0.8, 1.6, 1],  // 更大的弹跳
          yOffset: -110,
          emoji: '',
          fontSize: 'text-4xl font-bold',  // 更大字体
          shake: false
        };
    }
  }, [item.type]);

  // [P0 UX] 延长显示时间：暴击/combo 2.5s，普通 2s
  const duration = (item.type === 'crit' || item.type === 'combo') ? 2.5 : (item.duration || 2.0);

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        scale: settings.scale[0], 
        x: item.x, 
        y: item.y,
        rotate: settings.shake ? -5 : 0
      }}
      animate={{ 
        opacity: [0, 1, 1, 1, 0],  // 更长的显示时间
        scale: settings.scale, 
        y: item.y + settings.yOffset,
        rotate: settings.shake ? [0, -5, 5, -3, 3, 0] : 0,
        x: settings.shake ? [item.x, item.x - 5, item.x + 5, item.x - 3, item.x + 3, item.x] : item.x
      }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: duration, 
        ease: "easeOut",
        times: [0, 0.1, 0.4, 0.8, 1]  // 调整淡出时机
      }}
      className={`absolute flex items-center gap-1 ${settings.fontSize} ${settings.color} ${settings.shadow} font-wizard z-50`}
      style={{
          textShadow: '3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
          WebkitTextStroke: '1px rgba(0,0,0,0.5)'
      }}
    >
      {settings.emoji && <span className="text-[0.8em]">{settings.emoji}</span>}
      <span>{item.text}</span>
    </motion.div>
  );
};
