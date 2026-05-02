import React, { useState } from 'react';
import { HeroSkill } from '../../types/card';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroSkillButtonProps {
    skill: HeroSkill;
    canUse: boolean;
    onClick: () => void;
    currentMana: number;
    compact?: boolean;
}

const ELEMENT_STYLES: Record<string, { borderColor: string; color: string; shadowColor: string }> = {
  fire: { borderColor: 'border-orange-500', color: 'text-orange-400', shadowColor: 'rgba(249,115,22,0.4)' },
  ice: { borderColor: 'border-cyan-500', color: 'text-cyan-400', shadowColor: 'rgba(6,182,212,0.4)' },
  thunder: { borderColor: 'border-purple-500', color: 'text-purple-400', shadowColor: 'rgba(168,85,247,0.4)' },
  vine: { borderColor: 'border-green-500', color: 'text-green-400', shadowColor: 'rgba(34,197,94,0.4)' },
  rock: { borderColor: 'border-amber-600', color: 'text-amber-400', shadowColor: 'rgba(217,119,6,0.4)' },
};

export const HeroSkillButton: React.FC<HeroSkillButtonProps> = ({ skill, canUse, onClick, currentMana, compact }) => {
    const isAffordable = currentMana >= skill.manaCost;
    const isDisabled = !canUse || !isAffordable;
    const [isHovered, setIsHovered] = useState(false);
    const style = ELEMENT_STYLES[skill.element] || ELEMENT_STYLES.fire;

    return (
        <div className="relative">
            <motion.button
                whileHover={!isDisabled ? { scale: 1.15, translateY: -4 } : {}}
                whileTap={!isDisabled ? { scale: 0.95 } : {}}
                onClick={onClick}
                disabled={isDisabled}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    relative ${compact ? 'w-10 h-10 md:w-12 md:h-12' : 'w-12 h-12 md:w-14 md:h-14'} rounded-full border-2 flex items-center justify-center overflow-hidden transition-all shadow-lg group
                    ${isDisabled
                        ? 'opacity-60 grayscale cursor-not-allowed border-gray-600 bg-gray-800'
                        : `${style.borderColor} bg-gradient-to-br from-slate-800 to-slate-900 hover:shadow-[0_0_20px_${style.shadowColor}]`
                    }
                `}
            >
                <div className="text-xl md:text-2xl z-10 select-none transform transition-transform group-hover:scale-110">
                    {skill.emoji}
                </div>

                {!isDisabled && (
                    <>
                        <div className={`absolute inset-0 opacity-30 ${style.color.replace('text-', 'bg-')}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/20" />
                    </>
                )}

                <div className={`
                    absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full
                    ${isAffordable ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gradient-to-br from-red-600 to-red-800'}
                    border-2 ${isAffordable ? 'border-blue-300' : 'border-red-400'}
                    text-white text-xs md:text-sm flex items-center justify-center font-bold z-20
                    shadow-lg
                `}>
                    {skill.manaCost}
                </div>

                {isDisabled && <div className="absolute inset-0 bg-black/40 z-10" />}

                {!isDisabled && (
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400/30 to-yellow-500/30 blur-sm animate-pulse -z-10" />
                )}
            </motion.button>

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[100] pointer-events-none"
                    >
                        <div className="relative min-w-[200px] max-w-[280px]">
                            <div className={`
                                relative p-4 rounded-xl
                                bg-gradient-to-br from-slate-800/98 via-slate-900/98 to-slate-950/98
                                backdrop-blur-xl
                                border border-white/20
                                shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(0,0,0,0.5)]
                            `}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{skill.emoji}</span>
                                    <span className={`font-bold text-lg ${style.color}`}>
                                        {skill.name}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                                    <div className="flex items-center gap-1">
                                        <span className="text-blue-400 text-sm">💧</span>
                                        <span className={`text-sm font-bold ${isAffordable ? 'text-blue-300' : 'text-red-400'}`}>
                                            {skill.manaCost} 法力
                                        </span>
                                    </div>
                                    {skill.damage && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-red-400 text-sm">⚔️</span>
                                            <span className="text-sm text-red-300">{skill.damage} 伤害</span>
                                        </div>
                                    )}
                                    {skill.armorGain && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-blue-400 text-sm">🛡️</span>
                                            <span className="text-sm text-blue-300">+{skill.armorGain} 甲</span>
                                        </div>
                                    )}
                                    {skill.heal && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-green-400 text-sm">💚</span>
                                            <span className="text-sm text-green-300">+{skill.heal} HP</span>
                                        </div>
                                    )}
                                    {skill.draw && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-purple-400 text-sm">🃏</span>
                                            <span className="text-sm text-purple-300">抽{skill.draw}牌</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-gray-300 leading-relaxed">
                                    {skill.description}
                                </p>

                                <div className="mt-3 pt-2 border-t border-white/10">
                                    <span className={`text-xs ${isDisabled ? 'text-red-400' : 'text-green-400'}`}>
                                        {isDisabled
                                            ? (isAffordable ? '⚠️ 本回合无法使用' : '⚠️ 法力不足')
                                            : '✓ 点击释放技能'
                                        }
                                    </span>
                                </div>

                                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-500/50 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-500/50 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-500/50 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-500/50 rounded-br-lg" />
                            </div>

                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                                <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-800/98" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
