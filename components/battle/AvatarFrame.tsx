/**
 * AvatarFrame - 头像框组件
 */

import React from 'react';
import { motion } from 'framer-motion';

interface AvatarFrameProps {
  avatarSrc: string;
  name: string;
  borderColor: string;
  isThinking?: boolean;
  showDamage?: boolean;
  showHeal?: boolean;
  projection?: {
    hpChange: number;
  } | null;
}

export const AvatarFrame: React.FC<AvatarFrameProps> = ({
  avatarSrc,
  name,
  borderColor,
  isThinking = false,
  showDamage = false,
  showHeal = false,
  projection
}) => {
  return (
    <div className="relative flex-shrink-0">
      {/* 外圈光环 */}
      <div 
        className="absolute -inset-1 rounded-full opacity-60 blur-sm animate-pulse"
        style={{ background: `conic-gradient(from 0deg, ${borderColor}, transparent, ${borderColor})` }}
      />
      
      {/* 头像主体 */}
      <div 
        className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-slate-900 transition-all duration-300"
        style={{ 
          boxShadow: `0 0 0 2px ${borderColor}, 0 0 20px ${borderColor}40, inset 0 0 20px rgba(0,0,0,0.5)`
        }}
      >
        <img 
          src={avatarSrc} 
          alt={name}
          className="w-full h-full object-cover scale-110 transition-transform duration-300 group-hover:scale-125"
        />
        
        {/* AI 思考动画 */}
        {isThinking && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="absolute w-full h-full border-4 border-t-purple-400 border-r-transparent border-b-purple-600 border-l-transparent rounded-full animate-spin" />
            <div className="absolute w-3/4 h-3/4 border-2 border-t-transparent border-r-cyan-400 border-b-transparent border-l-cyan-600 rounded-full animate-spin-reverse" />
          </div>
        )}

        {/* 伤害/治疗叠加层 */}
        {showDamage && (
          <div className="absolute inset-0 bg-red-500/50 animate-pulse mix-blend-overlay" />
        )}
        {showHeal && (
          <div className="absolute inset-0 bg-green-500/40 animate-pulse mix-blend-screen" />
        )}
        
        {/* 内部阴影 */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)]" />
      </div>
      
      {/* 伤害预览数字 */}
      {projection && projection.hpChange !== 0 && (
        <motion.div 
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          className={`
            absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center
            font-black text-sm z-50
            ${projection.hpChange < 0 
              ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.8)]' 
              : 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.8)]'
            }
          `}
        >
          {projection.hpChange > 0 ? `+${projection.hpChange}` : projection.hpChange}
        </motion.div>
      )}
    </div>
  );
};
