/**
 * PlayerFrame - 玩家/对手信息框组件
 * 
 * 专业游戏级设计：
 * - 增大头像尺寸（80px）
 * - 血条带平滑动画过渡
 * - 法力水晶更大更清晰
 * - 震动效果更强烈
 * - 增加受伤闪红效果
 */

import React, { useState, useEffect, useRef } from 'react';
import { StatusEffect } from '../types';
import { getMechanicName } from '../constants';
import { Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ======== 子组件：血条（带动画） ========
interface HealthBarProps {
  current: number;
  max: number;
  isPlayer: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = ({ current, max, isPlayer }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = percentage <= 30;
  const isCritical = percentage <= 15;
  
  // 动画状态 - 血条平滑过渡
  const [displayPercentage, setDisplayPercentage] = useState(percentage);
  const [isHurt, setIsHurt] = useState(false);
  const prevPercentage = useRef(percentage);
  
  useEffect(() => {
    if (percentage < prevPercentage.current) {
      setIsHurt(true);
      setTimeout(() => setIsHurt(false), 300);
    }
    prevPercentage.current = percentage;
    
    if (Math.abs(percentage - displayPercentage) < 0.5) {
      setDisplayPercentage(percentage);
      return;
    }

    let rafId: number;
    const startTime = performance.now();
    const startValue = displayPercentage;
    const endValue = percentage;
    const duration = 400;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (endValue - startValue) * eased;
      setDisplayPercentage(nextValue);
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [percentage]);

  return (
    <div className="relative w-full h-full flex items-center pr-2">
      {/* 纯粹的血条容器 - 增加一点高度和更加明显的凹陷感 */}
      <div className="w-full h-3 md:h-5 bg-black/80 rounded-full overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] border border-white/5 backdrop-blur-md">
        
        {/* 伤害残留层 (白/红闪烁) */}
        <div 
          className="absolute inset-y-0 left-0 bg-white/40 transition-all duration-300 ease-out z-0"
          style={{ width: `${Math.max(percentage, displayPercentage)}%` }}
        />

        {/* 主血量条 */}
        <div 
          className={`
            h-full relative z-10 transition-all duration-500 rounded-r-md
            ${isCritical 
               ? 'bg-gradient-to-r from-red-900 via-red-500 to-red-900 animate-pulse' 
               : 'bg-gradient-to-r from-red-600 via-red-500 to-red-600'
            }
          `}
          style={{ width: `${displayPercentage}%` }}
        >
          {/* 魔法纹理或高光 */}
          <div className="absolute inset-0 bg-[url('/ui/textures/magic_noise.png')] opacity-20 mix-blend-overlay" />
          <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </div>

      {/* 数值直接放在血条中心，提升可读性 */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <div className="bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10 flex items-center gap-1">
           <span className="text-[red] text-[10px] drop-shadow-sm">❤️</span>
           <span className={`text-[10px] md:text-xs font-black drop-shadow-md ${isHurt ? 'text-white scale-110' : 'text-gray-100'}`}>
             {current} <span className="text-gray-400 font-normal">/ {max}</span>
           </span>
        </div>
      </div>
    </div>
  );
};

// ======== 子组件：法力水晶（使用图标素材） ========
interface ManaCrystalsProps {
  current: number;
  max: number;
}

export const ManaCrystals: React.FC<ManaCrystalsProps> = ({ current, max }) => (
  <div className="flex gap-1 items-center justify-center py-1">
    {Array.from({ length: max }).map((_, i) => (
      <div 
        key={i}
        className="relative w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-300 hover:scale-110"
      >
        <img 
            src={i < current ? "/ui/mana_crystal_active_v2.png" : "/ui/mana_crystal_inactive_v2.png"}
            alt={i < current ? "Full Mana" : "Empty Mana"} 
            className={`w-full h-full object-contain filter drop-shadow-md transition-all duration-500 ${i < current ? 'brightness-110 hover:brightness-125' : 'grayscale opacity-80'}`} 
        />
        {/* Active Crystal Glow */}
        {i < current && (
            <div className="absolute inset-2 bg-purple-500/30 rounded-full blur-[4px] animate-pulse -z-10" />
        )}
      </div>
    ))}
    {/* Text value for clarity */}
    <div className="ml-2 font-wizard font-bold text-lg text-purple-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center">
        <span>{current}</span>
        <span className="text-purple-500/80 mx-0.5 text-sm">/</span>
        <span className="text-sm text-purple-400">{max}</span>
    </div>
  </div>
);

// ======== 子组件：状态效果标签（使用效果素材） ========
interface StatusEffectBadgeProps {
  effect: StatusEffect;
}

const EFFECT_DESCRIPTIONS: Record<string, string> = {
  burn: '每回合结束时受到伤害',
  tangle: '下一张法术的法力消耗增加',
  frozen: '无法打出任何法术',
  thawed: '免疫冻结效果（刚解除冻结）',
  charge: '下一次同属性法术伤害翻倍', // If added later
  fortify: '获得额外护甲', // If added later
};

const StatusEffectBadge: React.FC<StatusEffectBadgeProps> = ({ effect }) => {
  const getBadgeStyle = () => {
    switch (effect.type) {
      case 'burn': return 'bg-orange-950/80 border-orange-500/50 text-orange-200';
      case 'tangle': return 'bg-green-950/80 border-green-500/50 text-green-200';
      case 'frozen': return 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200';
      case 'thawed': return 'bg-blue-900/80 border-blue-400/50 text-blue-200';
      default: return 'bg-gray-900/80 border-gray-500/50 text-gray-200';
    }
  };

  const getEffectIcon = () => {
    switch (effect.type) {
      case 'burn': return '/effects/effect-burn.webp';
      case 'tangle': return '/effects/effect-tangle.webp';
      case 'frozen': return '/effects/effect-freeze.webp';
      case 'thawed': return '/effects/effect-thawed.webp'; // Assuming existence or fallback
      default: return null;
    }
  };

  // 备用 emoji
  const getEmoji = () => {
    switch (effect.type) {
      case 'burn': return '🔥';
      case 'tangle': return '🌿';
      case 'frozen': return '❄️';
      case 'thawed': return '💧';
      default: return '✨';
    }
  };

  const iconSrc = getEffectIcon();

  return (
    <div 
      className={`
        relative group cursor-help
        px-3 py-1 rounded-full text-[10px] font-bold uppercase
        border shadow-lg flex items-center gap-1.5
        ${getBadgeStyle()}
        animate-float
      `}
    >
      {iconSrc ? (
        <img 
          src={iconSrc} 
          alt={effect.type} 
          className="w-4 h-4 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : (
        <span>{getEmoji()}</span>
      )}
      
      {/* Fallback emoji if image fails (requires structure tweak, simplified here) */}
      
      <span>{getMechanicName(effect.type)}</span>
      
      {effect.duration > 1 && (
        <span className="ml-0.5 w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[9px]">
          {effect.duration}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-32 bg-black/90 text-white text-[10px] p-2 rounded border border-white/20 z-50 pointer-events-none whitespace-normal text-center shadow-xl backdrop-blur-md">
        <div className="font-bold mb-0.5 text-yellow-300">{getMechanicName(effect.type)}</div>
        <div className="text-gray-300 leading-tight">{EFFECT_DESCRIPTIONS[effect.type] || '未知效果'}</div>
        <div className="mt-1 text-gray-500 text-[9px]">持续 {effect.duration} 回合</div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90"></div>
      </div>
    </div>
  );
};

// ======== 主组件：玩家信息框 (Patch 3.0: Projection) ========
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
  isThinking?: boolean; // [UX] AI 思考状态
  projection?: {
    hpChange: number; // Net HP Change (Negative = Damage)
    armorChange: number; // Net Armor Change
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
  
  // Projection Visuals
  const showDamage = projection && projection.hpChange < 0;
  const showHeal = projection && projection.hpChange > 0;
  const showArmorGain = projection && projection.armorChange > 0;
  const showArmorLoss = projection && projection.armorChange < 0;

  // 根据血量百分比确定边框颜色
  const hpPercentage = hp / maxHp;
  const borderColor = hpPercentage <= 0.25 ? '#ef4444' : hpPercentage <= 0.5 ? '#f59e0b' : (isPlayer ? '#3b82f6' : '#dc2626');

  return (
    <div className={`relative group transition-all duration-300 ${isShaking ? 'animate-shake-strong' : ''}`}>
      
      {/* === 全新设计：紧凑型玩家信息框 === */}
      <div className={`
        relative flex items-center gap-3 p-2 pr-4
        bg-gradient-to-r ${isPlayer ? 'from-slate-900/95 via-slate-800/90 to-slate-900/80' : 'from-red-950/95 via-slate-900/90 to-slate-900/80'}
        backdrop-blur-xl rounded-2xl
        border-2 transition-colors duration-500
        shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)]
      `}
      style={{ borderColor }}
      >
        
        {/* 1. 头像区域 - 圆形带光环 */}
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
              ringColor: borderColor,
              boxShadow: `0 0 20px ${borderColor}40, inset 0 0 20px rgba(0,0,0,0.5)`
            }}
          >
            <img 
              src={actualAvatarSrc} 
              alt={name}
              className="w-full h-full object-cover scale-110 transition-transform duration-300 group-hover:scale-125"
            />
            
            {/* [UX] AI 思考动画 */}
            {isThinking && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                {/* 旋转光环 */}
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
              {projection.hpChange > 0 ? '+' : ''}{projection.hpChange}
            </motion.div>
          )}
          
          {/* 护甲徽章 */}
          {(armor > 0 || (projection && projection.armorChange !== 0)) && (
            <div className="absolute -bottom-1 -right-1 z-50">
              <div className={`
                relative w-7 h-7 rounded-lg flex items-center justify-center
                bg-gradient-to-br from-slate-600 to-slate-800
                border border-slate-500 shadow-lg
                ${showArmorGain ? 'ring-2 ring-green-400 animate-pulse' : ''}
                ${showArmorLoss ? 'ring-2 ring-red-400 animate-pulse' : ''}
              `}>
                <Shield className="w-4 h-4 text-slate-300" />
                <span className="absolute -bottom-1 -right-1 bg-black text-white text-[9px] font-bold px-1 rounded">
                  {armor}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. 信息区域 */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          
          {/* 名字行 */}
          <div className="flex items-center justify-between">
            <span 
              className={`text-sm md:text-base font-wizard font-bold truncate ${isPlayer ? 'text-blue-100' : 'text-red-200'}`}
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
            >
              {name || (isPlayer ? '你' : '对手')}
            </span>
            
            {/* HP 数值 */}
            <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full">
              <span className={`text-xs font-mono font-bold ${hpPercentage <= 0.25 ? 'text-red-400' : 'text-white'}`}>
                {hp}
              </span>
              <span className="text-[10px] text-gray-500">/</span>
              <span className="text-[10px] text-gray-400">{maxHp}</span>
            </div>
          </div>
          
          {/* 血条 */}
          <div className="relative w-full h-3 md:h-4 bg-black/60 rounded-full overflow-hidden border border-white/10">
            {/* 伤害残留层 */}
            <div 
              className="absolute inset-y-0 left-0 bg-red-900/50 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(hpPercentage * 100, (projectedHp / maxHp) * 100)}%` }}
            />
            
            {/* 主血条 */}
            <motion.div 
              className={`
                h-full relative
                ${hpPercentage <= 0.25 
                  ? 'bg-gradient-to-r from-red-700 via-red-500 to-red-600' 
                  : hpPercentage <= 0.5
                    ? 'bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600'
                    : 'bg-gradient-to-r from-green-600 via-emerald-500 to-green-600'
                }
              `}
              initial={false}
              animate={{ width: `${hpPercentage * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {/* 高光 */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
              
              {/* 扫光 */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
            
            {/* 预览伤害条纹 */}
            {showDamage && (
              <div 
                className="absolute inset-y-0 animate-pulse"
                style={{
                  left: `${(projectedHp / maxHp) * 100}%`,
                  width: `${(Math.abs(projection!.hpChange) / maxHp) * 100}%`,
                  background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,0,0,0.6) 2px, rgba(255,0,0,0.6) 4px)'
                }}
              />
            )}
          </div>
          
          {/* 法力水晶行 */}
          <div className="flex items-center gap-1" id={isPlayer ? "player-mana-bar" : undefined}>
            {Array.from({ length: maxMana }).map((_, i) => {
              const isActive = i < mana;
              return (
                <motion.div 
                  key={i}
                  animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  className={`
                    w-4 h-4 md:w-5 md:h-5 rounded-full border transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-600 border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.6)]' 
                      : 'bg-slate-800 border-slate-600 opacity-40'
                    }
                  `}
                >
                  {isActive && (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-white/40 to-transparent" />
                  )}
                </motion.div>
              );
            })}
            
            {/* 法力数值 */}
            <div className="ml-2 px-2 py-0.5 bg-blue-900/50 rounded-full border border-blue-500/30">
              <span className="text-xs font-mono font-bold text-cyan-300">{mana}</span>
              <span className="text-[10px] text-blue-400">/{maxMana}</span>
            </div>
          </div>
        </div>

        {/* 3. 状态效果区域 */}
        {effects.length > 0 && (
          <div className="flex flex-col gap-1 ml-2">
            {effects.slice(0, 3).map((effect, i) => (
              <motion.div 
                key={i}
                initial={{ scale: 0, x: 20 }}
                animate={{ scale: 1, x: 0 }}
                className="transform origin-right"
              >
                <StatusEffectBadge effect={effect} />
              </motion.div>
            ))}
            {effects.length > 3 && (
              <div className="text-[10px] text-gray-500 text-right">+{effects.length - 3}</div>
            )}
          </div>
        )}

        {/* 边角装饰 */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor }} />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor }} />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor }} />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor }} />
      </div>
    </div>
  );
};


export default PlayerFrame;
