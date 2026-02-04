import React from 'react';
import { Spell } from '../../types';
import { motion } from 'framer-motion';

interface HeroSkillButtonProps {
    skill: Spell;
    canUse: boolean;
    onClick: () => void;
    currentMana: number;
}

export const HeroSkillButton: React.FC<HeroSkillButtonProps> = ({ skill, canUse, onClick, currentMana }) => {
    const isAffordable = currentMana >= skill.manaCost;
    const isDisabled = !canUse || !isAffordable;

    return (
        <motion.button
            whileHover={!isDisabled ? { scale: 1.1, translateY: -2 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            onClick={onClick}
            disabled={isDisabled}
            className={`
                relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all shadow-lg
                ${isDisabled 
                    ? 'opacity-60 grayscale cursor-not-allowed border-gray-600 bg-gray-800' 
                    : `${skill.borderColor} bg-slate-900 hover:shadow-[0_0_15px_${skill.shadowColor}]`
                }
            `}
            title={`${skill.name}: ${skill.description}`}
        >
             {/* 技能图标 - 使用 emoji 或 图片 */}
             <div className="text-lg md:text-xl z-10 select-none transform transition-transform group-hover:scale-110">
                {skill.emoji ? skill.emoji.substring(0, 2) : '✨'}
             </div>

             {/* 光效背景 */}
             {!isDisabled && (
                 <div className={`absolute inset-0 opacity-20 ${skill.color.replace('text-', 'bg-')}`} />
             )}

             {/* 费用角标 */}
             <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-blue-600 border border-blue-400 text-white text-[10px] md:text-xs flex items-center justify-center font-bold z-20 shadow-sm">
                 {skill.manaCost}
             </div>

             {/* 禁用时的暗色遮罩 */}
             {isDisabled && <div className="absolute inset-0 bg-black/30 z-10" />}
        </motion.button>
    );
};
