/**
 * ElementIndicator - 元素克制关系 UI 指示器
 * 
 * [P1] 显示当前战场上的元素克制提示
 * 在对手上一回合使用法术时，提示玩家哪种元素可以克制
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpellType } from '../../types';

interface ElementIndicatorProps {
  opponentLastSpell: SpellType | null;
  isPlayerTurn: boolean;
}

const ELEMENT_DATA: Record<string, { emoji: string; name: string; beatenBy: string; beatenByEmoji: string; beatenByName: string }> = {
  fire: { emoji: '🔥', name: '火', beatenBy: 'ice', beatenByEmoji: '❄️', beatenByName: '冰' },
  vine: { emoji: '🌿', name: '藤', beatenBy: 'fire', beatenByEmoji: '🔥', beatenByName: '火' },
  ice: { emoji: '❄️', name: '冰', beatenBy: 'thunder', beatenByEmoji: '⚡', beatenByName: '雷' },
  thunder: { emoji: '⚡', name: '雷', beatenBy: 'rock', beatenByEmoji: '🪨', beatenByName: '石' },
  rock: { emoji: '🪨', name: '石', beatenBy: 'vine', beatenByEmoji: '🌿', beatenByName: '藤' },
};

const getElementFromSpell = (id: string): string | null => {
  if (id.startsWith('fire') || id.startsWith('hero_fire')) return 'fire';
  if (id.startsWith('vine') || id.startsWith('hero_vine')) return 'vine';
  if (id.startsWith('ice') || id.startsWith('hero_ice')) return 'ice';
  if (id.startsWith('thunder') || id.startsWith('hero_thunder')) return 'thunder';
  if (id.startsWith('rock') || id.startsWith('hero_rock')) return 'rock';
  return null;
};

export const ElementIndicator: React.FC<ElementIndicatorProps> = ({ opponentLastSpell, isPlayerTurn }) => {
  if (!opponentLastSpell || !isPlayerTurn) return null;

  const element = getElementFromSpell(opponentLastSpell);
  if (!element || !ELEMENT_DATA[element]) return null;

  const data = ELEMENT_DATA[element];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        className="fixed top-1/2 right-3 -translate-y-1/2 z-30 pointer-events-none"
      >
        <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/20 p-2.5 shadow-2xl text-center max-w-[100px]">
          {/* Element chain visual */}
          <div className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
            克制提示
          </div>
          
          {/* Current opponent element */}
          <div className="flex flex-col items-center gap-1 mb-2">
            <span className="text-2xl">{data.emoji}</span>
            <span className="text-xs text-slate-300">{data.name}系</span>
          </div>
          
          {/* Arrow */}
          <div className="text-amber-400 text-xs font-bold mb-1">
            ⬇️ 被克制
          </div>
          
          {/* Counter element */}
          <div className="flex flex-col items-center gap-1 bg-amber-500/20 rounded-lg py-1.5 px-2 border border-amber-500/40">
            <span className="text-2xl animate-pulse">{data.beatenByEmoji}</span>
            <span className="text-xs text-amber-300 font-bold">{data.beatenByName}系</span>
          </div>
          
          {/* Full chain mini */}
          <div className="mt-2 text-[8px] text-slate-500 leading-tight">
            🔥→🌿→❄️→⚡→🪨→🔥
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ElementIndicator;
