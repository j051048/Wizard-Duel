/**
 * TargetSelector - Target selection overlay
 * [P1-1] Allows player to choose between hero or minion targets
 */

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minion, SpellTarget, SpellType } from '../../types';
import { getSpellById } from '../../services/gameLogic';

interface TargetSelectorProps {
  isActive: boolean;
  spellId: SpellType | null;
  opponentMinions: Minion[];
  onSelectTarget: (target: SpellTarget) => void;
  onCancel: () => void;
  isMobile: boolean;
}

export const TargetSelector: React.FC<TargetSelectorProps> = ({
  isActive,
  spellId,
  opponentMinions,
  onSelectTarget,
  onCancel,
  isMobile,
}) => {
  const spell = spellId ? getSpellById(spellId) : null;
  const targetMode = spell?.targetMode || 'auto';

  const handleHeroClick = useCallback(() => {
    onSelectTarget({ type: 'hero' });
  }, [onSelectTarget]);

  const handleMinionClick = useCallback((minion: Minion) => {
    onSelectTarget({ type: 'minion', id: minion.instanceId });
  }, [onSelectTarget]);

  if (!isActive || !spell) return null;

  const canTargetHero = targetMode === 'hero_or_minion' || targetMode === 'hero_only';
  const canTargetMinion = (targetMode === 'hero_or_minion' || targetMode === 'minion_only') && opponentMinions.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] pointer-events-auto"
        onClick={onCancel}
      >
        {/* Dimmed background */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Cancel hint */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-800/90 px-4 py-2 rounded-xl text-white text-sm font-bold"
          >
            🎯 选择目标 — {spell.name}
            <span className="ml-3 text-gray-400 text-xs">点击背景取消</span>
          </motion.div>
        </div>

        {/* Target: Hero */}
        {canTargetHero && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="absolute top-[15%] left-1/2 -translate-x-1/2 z-10 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); handleHeroClick(); }}
          >
            <div className="relative group">
              <div className={`
                ${isMobile ? 'w-20 h-20' : 'w-28 h-28'}
                bg-gradient-to-br from-red-900/80 to-red-700/60
                border-3 border-red-500 rounded-full
                flex items-center justify-center
                shadow-[0_0_20px_rgba(239,68,68,0.5)]
                transition-all duration-200
                group-hover:shadow-[0_0_30px_rgba(239,68,68,0.8)]
                group-hover:scale-110
                group-hover:border-red-400
              `}>
                <span className={isMobile ? 'text-3xl' : 'text-5xl'}>👹</span>
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold whitespace-nowrap bg-red-900/60 px-2 py-0.5 rounded">
                英雄
              </div>
            </div>
          </motion.div>
        )}

        {/* Target: Minions */}
        {canTargetMinion && (
          <div className="absolute top-[30%] left-1/2 -translate-x-1/2 flex gap-4 z-10">
            {opponentMinions.map((minion, i) => (
              <motion.div
                key={minion.instanceId}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="cursor-pointer group"
                onClick={(e) => { e.stopPropagation(); handleMinionClick(minion); }}
              >
                <div className={`
                  ${isMobile ? 'w-16 h-22' : 'w-20 h-28'}
                  bg-gradient-to-br from-orange-900/80 to-orange-700/60
                  border-2 border-orange-500 rounded-lg
                  flex flex-col items-center justify-center
                  shadow-[0_0_15px_rgba(249,115,22,0.4)]
                  transition-all duration-200
                  group-hover:shadow-[0_0_25px_rgba(249,115,22,0.7)]
                  group-hover:scale-110
                  group-hover:border-orange-400
                `}>
                  <span className="text-lg">👾</span>
                  <div className="text-[10px] text-white/70 mt-1 truncate w-full text-center px-1">
                    {minion.name}
                  </div>
                  <div className="flex gap-2 mt-1 text-[10px]">
                    <span className="text-yellow-400 font-bold">⚔️{minion.atk}</span>
                    <span className="text-green-400 font-bold">❤️{minion.hp}</span>
                  </div>
                  {minion.hasShield && (
                    <span className="text-[10px]">🛡️</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* No valid targets */}
        {!canTargetHero && !canTargetMinion && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-slate-800/90 px-6 py-4 rounded-xl text-white text-center">
              <p className="text-lg font-bold mb-2">没有可选目标</p>
              <p className="text-sm text-gray-400">点击任意处取消</p>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default TargetSelector;
