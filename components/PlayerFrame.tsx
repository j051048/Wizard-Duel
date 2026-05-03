/**
 * PlayerFrame - 玩家/对手信息框组件 (Refactored)
 * 
 * 重构为thin wrapper，使用分解的子组件
 */

import React from 'react';
import { Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusEffect } from '../types';
import { HealthBar } from './battle/HealthBar';
import { ManaDisplay } from './battle/ManaDisplay';
import { StatusEffectBadge } from './battle/StatusEffectBadge';
import { AvatarFrame } from './battle/AvatarFrame';

interface PlayerFrameProps {
  isPlayer: boolean;
  name: string;
  hp: number;
  armor?: number; 
  maxHp: number;
  mana: number;
  maxMana: number;
  effects: StatusEffect[];
  avatarSrc?: string;
  isShaking?: boolean;
  isThinking?: boolean;
  projection?: {
    hpChange: number;
    armorChange: number;
  } | null;
}

export const PlayerFrame: React.FC<PlayerFrameProps> = ({
  isPlayer,
  name,
  hp,
  armor = 0,
  maxHp,
  mana,
  maxMana,
  effects,
  avatarSrc,
  isShaking = false,
  isThinking = false,
  projection
}) => {
  const actualAvatarSrc = avatarSrc || (isPlayer ? '/avatars/player-wizard.webp' : '/avatars/opponent-sorcerer.webp');

  const projectedHp = Math.max(0, Math.min(maxHp, hp + (projection?.hpChange || 0)));
  const projectedArmor = Math.max(0, armor + (projection?.armorChange || 0));
  
  const showDamage = projection && projection.hpChange < 0;
  const showHeal = projection && projection.hpChange > 0;
  const showArmorGain = projection && projection.armorChange > 0;
  const showArmorLoss = projection && projection.armorChange < 0;

  const hpPercentage = hp / maxHp;
  const borderColor = hpPercentage <= 0.25 ? '#ef4444' : hpPercentage <= 0.5 ? '#f59e0b' : (isPlayer ? '#3b82f6' : '#dc2626');

  return (
    <div className={`relative group transition-all duration-300 ${isShaking ? 'hero-damaged' : ''} ${showHeal ? 'hero-healed' : ''}`}>

      <div className={`
        relative flex items-center gap-3 p-2 pr-4
        bg-gradient-to-r ${isPlayer ? 'from-slate-900/95 via-slate-800/90 to-slate-900/80' : 'from-red-950/95 via-slate-900/90 to-slate-900/80'}
        backdrop-blur-xl rounded-2xl
        border-2 transition-colors duration-500
        shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)]
      `}
      style={{ borderColor }}
      >
        
        {/* 头像区域 */}
        <AvatarFrame
          avatarSrc={actualAvatarSrc}
          name={name}
          borderColor={borderColor}
          isThinking={isThinking}
          showDamage={showDamage || false}
          showHeal={showHeal || false}
          projection={projection}
        />
        
        {/* 信息区域 */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          
          {/* 顶部：玩家名 + 护甲 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={`font-wizard font-black text-sm md:text-base tracking-wide ${isPlayer ? 'text-blue-300' : 'text-red-400'} drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate`}>
                {name}
              </span>
            </div>
            
            {/* 护甲显示 */}
            {armor > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 bg-gradient-to-r from-slate-700/80 to-slate-600/80 px-2 py-1 rounded-lg border border-slate-400/30 shadow-[0_0_10px_rgba(148,163,184,0.3)]"
              >
                <Shield size={14} className="text-slate-300" />
                <span className="font-mono font-black text-xs text-slate-100 drop-shadow-sm">
                  {projection ? projectedArmor : armor}
                </span>
                {showArmorGain && (
                  <span className="text-[10px] text-green-400 ml-0.5">+{projection!.armorChange}</span>
                )}
                {showArmorLoss && (
                  <span className="text-[10px] text-red-400 ml-0.5">{projection!.armorChange}</span>
                )}
              </motion.div>
            )}
          </div>
          
          {/* 血条 */}
          <HealthBar current={hp} max={maxHp} isPlayer={isPlayer} />
          
          {/* 法力水晶 */}
          <ManaDisplay current={mana} max={maxMana} />
          
          {/* 状态效果 */}
          {effects.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <AnimatePresence mode="popLayout">
                {effects.map((effect, idx) => (
                  <motion.div
                    key={`${effect.type}-${idx}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <StatusEffectBadge effect={effect} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      
      {/* 伤害/治疗投影效果 */}
      <AnimatePresence>
        {showDamage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 z-50"
          >
            <div className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-black text-lg shadow-[0_0_20px_rgba(239,68,68,0.8)] border-2 border-red-400">
              {projection!.hpChange}
            </div>
          </motion.div>
        )}
        {showHeal && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 z-50"
          >
            <div className="bg-green-500 text-white px-3 py-1.5 rounded-lg font-black text-lg shadow-[0_0_20px_rgba(34,197,94,0.8)] border-2 border-green-300">
              +{projection!.hpChange}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayerFrame;
