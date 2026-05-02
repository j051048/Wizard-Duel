/**
 * HeroSkillSelection - Skill selection overlay at match start
 * [P3-2] Choose 1 of 3 hero skills before the battle begins
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSkill } from '../../types/card';
import { getSkillChoices } from '../../data/heroSkills';

interface HeroSkillSelectionProps {
  isActive: boolean;
  mainElement?: string;
  onSelect: (skillId: string) => void;
  isMobile: boolean;
}

export const HeroSkillSelection: React.FC<HeroSkillSelectionProps> = ({
  isActive,
  mainElement,
  onSelect,
  isMobile,
}) => {
  const skillChoices = useMemo(() => getSkillChoices(mainElement), [mainElement]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-wizard font-black text-amber-300 mb-2`}>
            ⚔️ 选择你的英雄技能
          </h2>
          <p className="text-gray-400 text-sm mb-8">每回合可使用一次（2 费）</p>

          <div className="flex gap-4 justify-center flex-wrap px-4">
            {skillChoices.map((skill, i) => (
              <motion.button
                key={skill.id}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.08, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(skill.id)}
                className={`
                  ${isMobile ? 'w-40' : 'w-48'}
                  bg-gradient-to-br from-slate-800 to-slate-900
                  border-2 border-amber-500/40 rounded-xl
                  p-4 text-left cursor-pointer
                  shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_15px_rgba(251,191,36,0.15)]
                  hover:border-amber-400 hover:shadow-[0_0_25px_rgba(251,191,36,0.3)]
                  transition-all duration-200
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{skill.emoji}</span>
                  <div>
                    <div className="font-bold text-white text-sm">{skill.name}</div>
                    <div className="text-[10px] text-amber-400/70 uppercase">{skill.element}</div>
                  </div>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {skill.description}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-purple-300">
                  <span>💎 {skill.manaCost} 费</span>
                  {skill.damage && <span>⚔️ {skill.damage} 伤</span>}
                  {skill.armorGain && <span>🛡️ +{skill.armorGain} 甲</span>}
                  {skill.heal && <span>💚 +{skill.heal} HP</span>}
                  {skill.draw && <span>🃏 抽{skill.draw}牌</span>}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HeroSkillSelection;
