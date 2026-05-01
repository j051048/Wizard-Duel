/**
 * SpellCastEffect - 法术施放视觉特效
 * 
 * [P1] 四种元素施放特效: fire/ice/thunder/vine
 */

import React, { useEffect, useState } from 'react';
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

const EFFECT_CONFIG: Record<string, { emoji: string; colors: string[]; particles: number; duration: number }> = {
  fire: {
    emoji: '🔥',
    colors: ['#ef4444', '#f97316', '#fbbf24'],
    particles: 12,
    duration: 800,
  },
  ice: {
    emoji: '❄️',
    colors: ['#a5f3fc', '#22d3ee', '#ffffff'],
    particles: 10,
    duration: 900,
  },
  thunder: {
    emoji: '⚡',
    colors: ['#fde047', '#eab308', '#ffffff'],
    particles: 15,
    duration: 600,
  },
  vine: {
    emoji: '🌿',
    colors: ['#84cc16', '#22c55e', '#ecfccb'],
    particles: 8,
    duration: 1000,
  },
  rock: {
    emoji: '🪨',
    colors: ['#78716c', '#d6d3d1', '#44403c'],
    particles: 6,
    duration: 700,
  },
  neutral: {
    emoji: '✨',
    colors: ['#d8b4fe', '#a855f7', '#ffffff'],
    particles: 5,
    duration: 600,
  },
};

export const SpellCastEffect: React.FC<SpellCastEffectProps> = ({ spellId, caster }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (spellId) {
      setKey(prev => prev + 1);
      setIsVisible(true);
      const element = getElementFromSpell(spellId);
      const config = EFFECT_CONFIG[element] || EFFECT_CONFIG.neutral;
      const timer = setTimeout(() => setIsVisible(false), config.duration);
      return () => clearTimeout(timer);
    }
  }, [spellId]);

  if (!spellId || !isVisible) return null;

  const element = getElementFromSpell(spellId);
  const config = EFFECT_CONFIG[element] || EFFECT_CONFIG.neutral;
  const isPlayer = caster === 'player';

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

        {/* Particle ring */}
        {Array.from({ length: config.particles }).map((_, i) => {
          const angle = (360 / config.particles) * i;
          const radius = 60 + Math.random() * 40;
          const color = config.colors[i % config.colors.length];
          
          return (
            <motion.div
              key={i}
              initial={{ 
                x: 0, y: 0, opacity: 1, scale: 1 
              }}
              animate={{ 
                x: Math.cos((angle * Math.PI) / 180) * radius,
                y: Math.sin((angle * Math.PI) / 180) * radius,
                opacity: 0,
                scale: 0.3,
              }}
              transition={{ 
                duration: config.duration / 1000 * 0.8,
                ease: 'easeOut',
                delay: Math.random() * 0.1,
              }}
              className="absolute w-3 h-3 rounded-full"
              style={{ 
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
                left: '50%',
                top: '50%',
                marginLeft: '-6px',
                marginTop: '-6px',
              }}
            />
          );
        })}

        {/* Element-specific glow */}
        <motion.div
          initial={{ opacity: 0.8, scale: 0.5 }}
          animate={{ opacity: 0, scale: 3 }}
          transition={{ duration: config.duration / 1000 }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${config.colors[0]}40, transparent 70%)`,
            width: '120px',
            height: '120px',
            left: '50%',
            top: '50%',
            marginLeft: '-60px',
            marginTop: '-60px',
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default React.memo(SpellCastEffect);
