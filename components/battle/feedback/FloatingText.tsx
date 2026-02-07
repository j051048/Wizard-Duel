import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type FloatingTextType = 'damage' | 'heal' | 'armor' | 'crit' | 'mana' | 'status';

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
          color: 'text-red-500',
          shadow: 'drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]',
          scale: [0.5, 1.5, 1],
          yOffset: -120,
          emoji: '💥',
          fontSize: 'text-4xl font-extrabold'
        };
      case 'heal':
        return {
          color: 'text-green-400',
          shadow: 'drop-shadow-[0_0_5px_rgba(74,222,128,0.6)]',
          scale: [0.8, 1.1, 1],
          yOffset: -80,
          emoji: '💚',
          fontSize: 'text-2xl font-bold'
        };
      case 'armor':
        return {
          color: 'text-blue-300',
          shadow: 'drop-shadow-[0_0_5px_rgba(147,197,253,0.6)]',
          scale: [0.8, 1.1, 1],
          yOffset: -60,
          emoji: '🛡️',
          fontSize: 'text-2xl font-bold'
        };
      case 'mana':
        return {
          color: 'text-purple-300',
          shadow: 'drop-shadow-[0_0_5px_rgba(168,85,247,0.6)]',
          scale: [0.8, 1.1, 1],
          yOffset: -60,
          emoji: '💎',
          fontSize: 'text-xl font-bold'
        };
       case 'status':
        return {
          color: 'text-amber-300',
          shadow: 'drop-shadow-[0_0_5px_rgba(252,211,77,0.6)]',
          scale: [0.9, 1.1, 1],
          yOffset: -50,
          emoji: '',
          fontSize: 'text-lg font-bold'
        };
      case 'damage':
      default:
        return {
          color: 'text-white',
          shadow: 'drop-shadow-[0_0_2px_black]',
          scale: [1, 1.5, 0.8],
          yOffset: -100,
          emoji: '',
          fontSize: 'text-3xl font-bold'
        };
    }
  }, [item.type]);

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        scale: settings.scale[0], 
        x: item.x, 
        y: item.y 
      }}
      animate={{ 
        opacity: [0, 1, 1, 0], 
        scale: settings.scale, 
        y: item.y + settings.yOffset 
      }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: item.duration || 1.5, 
        ease: "easeOut",
        times: [0, 0.1, 0.7, 1] 
      }}
      className={`absolute flex items-center gap-1 ${settings.fontSize} ${settings.color} ${settings.shadow} font-wizard z-50`}
      style={{
          textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
      }}
    >
      {settings.emoji && <span className="text-[0.8em]">{settings.emoji}</span>}
      <span>{item.text}</span>
    </motion.div>
  );
};
