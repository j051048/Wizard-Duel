/**
 * EmoteMenu - 玩家表情互动系统
 * 
 * [P2 Fix #18] 右键/长按英雄头像弹出快捷短语
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticService } from '../../services/haptic';

export interface Emote {
  id: string;
  text: string;
  emoji: string;
}

const EMOTES: Emote[] = [
  { id: 'greet', text: '你好！', emoji: '👋' },
  { id: 'thanks', text: '谢谢！', emoji: '🙏' },
  { id: 'wellplayed', text: '打得不错！', emoji: '👏' },
  { id: 'wow', text: '哇哦！', emoji: '😮' },
  { id: 'oops', text: '失误了...', emoji: '😅' },
  { id: 'threaten', text: '你的末日到了！', emoji: '😈' },
  { id: 'laugh', text: '哈哈！', emoji: '😂' },
  { id: 'cry', text: '太惨了...', emoji: '😢' },
  { id: 'angry', text: '可恶！', emoji: '😤' },
  { id: 'thinking', text: '让我想想...', emoji: '🤔' },
  { id: 'gg', text: 'Good Game!', emoji: '🤝' },
  { id: 'surprised', text: '什么！？', emoji: '🤯' },
];

interface EmoteMenuProps {
  onEmote: (emote: Emote) => void;
  disabled?: boolean;
  position?: 'top' | 'bottom';
}

export const EmoteMenu: React.FC<EmoteMenuProps> = ({ onEmote, disabled, position = 'top' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef(false);

  const handleOpen = useCallback(() => {
    if (disabled || cooldownRef.current) return;
    setIsOpen(true);
    HapticService.light();
  }, [disabled]);

  const handleEmote = useCallback((emote: Emote) => {
    if (cooldownRef.current) return;
    onEmote(emote);
    setIsOpen(false);
    HapticService.medium();
    // 3秒冷却防刷屏
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 3000);
  }, [onEmote]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleOpen();
  }, [handleOpen]);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(handleOpen, 500);
  }, [handleOpen]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div 
      className="relative"
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Trigger hint */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/30 whitespace-nowrap pointer-events-none">
        长按表情
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200]"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 z-[201]`}
            >
              <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl flex gap-1.5">
                {EMOTES.map((emote) => (
                  <motion.button
                    key={emote.id}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEmote(emote)}
                    className="flex flex-col items-center gap-0.5 p-2 rounded-xl hover:bg-white/10 transition-colors min-w-[48px]"
                    title={emote.text}
                  >
                    <span className="text-xl">{emote.emoji}</span>
                    <span className="text-[8px] text-white/60 whitespace-nowrap">{emote.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/** 表情气泡（显示在英雄头像上方） */
export const EmoteBubble: React.FC<{ emote: Emote | null; onDone: () => void }> = ({ emote, onDone }) => {
  if (!emote) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        key={emote.id + Date.now()}
        initial={{ opacity: 0, y: 20, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.5 }}
        onAnimationComplete={() => setTimeout(onDone, 2000)}
        className="absolute -top-16 left-1/2 -translate-x-1/2 z-[150] pointer-events-none"
      >
        <div className="bg-white/95 text-black text-sm font-bold px-4 py-2 rounded-2xl shadow-xl whitespace-nowrap">
          <span className="mr-1">{emote.emoji}</span>
          {emote.text}
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 rotate-45" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmoteMenu;