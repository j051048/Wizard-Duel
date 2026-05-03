/**
 * SpellCastEffect - 法术施放视觉特效
 *
 * [B-1] 5种元素专属粒子行为：
 * - fire: 火焰锥形喷射 + 火星粒子上升
 * - ice: 冰晶碎片飞溅 + 旋转 + 透明度渐变
 * - thunder: 闪电锯齿路径 + 亮度闪烁
 * - vine: 藤蔓螺旋上升 + 缩放脉冲
 * - rock: 碎石抛物线下落 + 重力
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpellType } from '../../types';

interface SpellCastEffectProps {
  spellId: SpellType | null;
  caster: 'player' | 'opponent';
}

const getElementFromSpell = (id: string): string => {
  if (id.startsWith('fire') || id.startsWith('hero_fire')) return 'fire';
  if (id.startsWith('vine') || id.startsWith('hero_vine')) return 'vine';
  if (id.startsWith('ice') || id.startsWith('hero_ice')) return 'ice';
  if (id.startsWith('thunder') || id.startsWith('hero_thunder')) return 'thunder';
  if (id.startsWith('rock') || id.startsWith('hero_rock')) return 'rock';
  return 'neutral';
};

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: '🔥',
  ice: '❄️',
  thunder: '⚡',
  vine: '🌿',
  rock: '🪨',
  neutral: '✨',
};

const ELEMENT_COLORS: Record<string, string[]> = {
  fire: ['#ef4444', '#f97316', '#fbbf24'],
  ice: ['#a5f3fc', '#22d3ee', '#ffffff'],
  thunder: ['#fde047', '#eab308', '#ffffff'],
  vine: ['#84cc16', '#22c55e', '#ecfccb'],
  rock: ['#78716c', '#d6d3d1', '#44403c'],
  neutral: ['#d8b4fe', '#a855f7', '#ffffff'],
};

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

function generateParticles(element: string, colors: string[]): Particle[] {
  const count = element === 'thunder' ? 8 : element === 'fire' ? 14 : element === 'vine' ? 10 : element === 'rock' ? 12 : 10;
  const duration = element === 'vine' ? 1.0 : element === 'thunder' ? 0.5 : 0.8;

  return Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i + (Math.random() - 0.5) * 30;
    const rad = (angle * Math.PI) / 180;
    const color = colors[i % colors.length];

    switch (element) {
      case 'fire': {
        const spreadX = (Math.random() - 0.5) * 50;
        const upDist = 50 + Math.random() * 70;
        return {
          id: i, x: spreadX, y: -upDist,
          scale: 0.1 + Math.random() * 0.3, rotate: (Math.random() - 0.5) * 60,
          opacity: 0, color, delay: Math.random() * 0.15,
          duration: duration * (0.6 + Math.random() * 0.4),
          size: 6 + Math.random() * 6,
        };
      }
      case 'ice': {
        const radius = 60 + Math.random() * 50;
        return {
          id: i, x: Math.cos(rad) * radius, y: Math.sin(rad) * radius,
          scale: 0.2, rotate: (Math.random() - 0.5) * 180,
          opacity: 0, color, delay: Math.random() * 0.1,
          duration: duration,
          size: 5 + Math.random() * 4,
        };
      }
      case 'thunder': {
        const zigzagX = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 60);
        const zigzagY = (Math.random() - 0.5) * 80;
        return {
          id: i, x: zigzagX, y: zigzagY,
          scale: 0.5, rotate: 0,
          opacity: 0, color, delay: Math.random() * 0.08,
          duration: duration,
          size: 3 + Math.random() * 5,
        };
      }
      case 'vine': {
        const spiralR = 30 + i * 5;
        const spiralAngle = i * 72;
        const spiralRad = (spiralAngle * Math.PI) / 180;
        return {
          id: i, x: Math.cos(spiralRad) * spiralR, y: -40 - i * 8,
          scale: 1.2 + Math.sin(i) * 0.4, rotate: (Math.random() - 0.5) * 45,
          opacity: 0, color, delay: i * 0.06,
          duration: duration,
          size: 5 + Math.random() * 5,
        };
      }
      case 'rock': {
        const debrisX = (Math.random() - 0.5) * 100;
        const maxUp = -20 - Math.random() * 40;
        return {
          id: i, x: debrisX, y: maxUp,
          scale: 0.3, rotate: (Math.random() - 0.5) * 90,
          opacity: 0, color, delay: Math.random() * 0.12,
          duration: duration,
          size: 6 + Math.random() * 8,
        };
      }
      default: {
        const r = 50 + Math.random() * 30;
        return {
          id: i, x: Math.cos(rad) * r, y: Math.sin(rad) * r,
          scale: 0.3, rotate: 0,
          opacity: 0, color, delay: Math.random() * 0.1,
          duration: duration,
          size: 6,
        };
      }
    }
  });
}

function getAnimate(p: Particle, element: string) {
  switch (element) {
    case 'fire':
      return { x: p.x, y: p.y, scale: p.scale, opacity: 0, rotate: p.rotate };
    case 'ice':
      return { x: p.x, y: p.y, scale: p.scale, opacity: 0, rotate: p.rotate };
    case 'thunder':
      return { x: p.x, y: p.y, scale: 0, opacity: 0 };
    case 'vine':
      return { x: p.x, y: p.y, scale: p.scale, opacity: 0, rotate: p.rotate };
    case 'rock': {
      const gravityY = p.y + 80 + Math.random() * 40;
      return { x: p.x * 1.3, y: gravityY, scale: 0.1, opacity: 0, rotate: p.rotate * 2 };
    }
    default:
      return { x: p.x, y: p.y, scale: p.scale, opacity: 0 };
  }
}

export const SpellCastEffect: React.FC<SpellCastEffectProps> = ({ spellId, caster }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [key, setKey] = useState(0);

  const element = spellId ? getElementFromSpell(spellId) : 'neutral';
  const config = {
    emoji: ELEMENT_EMOJIS[element] || ELEMENT_EMOJIS.neutral,
    colors: ELEMENT_COLORS[element] || ELEMENT_COLORS.neutral,
    duration: element === 'vine' ? 1000 : element === 'thunder' ? 500 : 800,
  };

  const particles = useMemo(
    () => (spellId ? generateParticles(element, config.colors) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spellId, element]
  );

  useEffect(() => {
    if (spellId) {
      setKey(prev => prev + 1);
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), config.duration);
      return () => clearTimeout(timer);
    }
  }, [spellId, config.duration]);

  if (!spellId || !isVisible) return null;

  const isPlayer = caster === 'player';
  const thunderFlash = element === 'thunder';

  return (
    <AnimatePresence>
      <motion.div
        key={`effect-${key}`}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.5 }}
        transition={{ duration: config.duration / 1000, ease: 'easeOut' }}
        className="fixed z-[60] pointer-events-none"
        style={{
          left: '50%',
          top: isPlayer ? '65%' : '25%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Central emoji burst */}
        <motion.div
          initial={{ scale: 0.5, rotate: -15 }}
          animate={{ scale: [0.5, 1.5, 1], rotate: [0, 15, 0] }}
          transition={{ duration: 0.4 }}
          className="text-5xl drop-shadow-2xl"
        >
          {config.emoji}
        </motion.div>

        {/* Element-specific particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={getAnimate(p, element)}
            transition={{
              duration: p.duration,
              ease: element === 'rock' ? [0.55, 0, 1, 0.45] : element === 'thunder' ? 'linear' : 'easeOut',
              delay: p.delay,
            }}
            className={element === 'thunder' ? 'absolute rounded-sm' : 'absolute rounded-full'}
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 ${element === 'thunder' ? 12 : 8}px ${p.color}`,
              left: '50%',
              top: '50%',
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
          />
        ))}

        {/* Thunder: screen flash */}
        {thunderFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-white pointer-events-none z-[65]"
          />
        )}

        {/* Ice: frost ring */}
        {element === 'ice' && (
          <motion.div
            initial={{ opacity: 0.6, scale: 0.5 }}
            animate={{ opacity: 0, scale: 2.5 }}
            transition={{ duration: 0.8 }}
            className="absolute rounded-full border-2"
            style={{
              borderColor: 'rgba(165,243,252,0.4)',
              width: 80,
              height: 80,
              left: '50%',
              top: '50%',
              marginLeft: -40,
              marginTop: -40,
            }}
          />
        )}

        {/* Vine: spiral glow */}
        {element === 'vine' && (
          <motion.div
            initial={{ opacity: 0.5, scale: 0.3, rotate: 0 }}
            animate={{ opacity: 0, scale: 2, rotate: 180 }}
            transition={{ duration: 1.0 }}
            className="absolute rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(132,204,38,0.3), transparent 70%)',
              width: 100,
              height: 100,
              left: '50%',
              top: '50%',
              marginLeft: -50,
              marginTop: -50,
            }}
          />
        )}

        {/* Rock: impact dust cloud */}
        {element === 'rock' && (
          <motion.div
            initial={{ opacity: 0.7, scale: 0.3 }}
            animate={{ opacity: 0, scale: 2.5 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="absolute rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(120,113,108,0.5), transparent 60%)',
              width: 90,
              height: 50,
              left: '50%',
              top: '50%',
              marginLeft: -45,
              marginTop: -10,
              borderRadius: '50%',
            }}
          />
        )}

        {/* Generic glow (non-element-specific) */}
        {!['ice', 'vine', 'rock'].includes(element) && (
          <motion.div
            initial={{ opacity: 0.8, scale: 0.5 }}
            animate={{ opacity: 0, scale: 3 }}
            transition={{ duration: config.duration / 1000 }}
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${config.colors[0]}40, transparent 70%)`,
              width: 120,
              height: 120,
              left: '50%',
              top: '50%',
              marginLeft: -60,
              marginTop: -60,
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default React.memo(SpellCastEffect);
