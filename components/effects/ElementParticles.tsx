/**
 * ElementParticles - 元素粒子效果组件
 * 
 * [P4 Fix #35] 各元素特效粒子
 */

import React, { useEffect, useMemo, useRef } from 'react';

type ElementType = 'fire' | 'ice' | 'thunder' | 'nature' | 'rock' | 'neutral';

interface ParticleConfig {
  color: string;
  emoji: string;
  count: number;
  speed: number;
  size: number;
}

const PARTICLE_CONFIGS: Record<ElementType, ParticleConfig> = {
  fire: { color: '#ff6b35', emoji: '🔥', count: 8, speed: 1.5, size: 16 },
  ice: { color: '#60a5fa', emoji: '❄️', count: 6, speed: 0.8, size: 14 },
  thunder: { color: '#fbbf24', emoji: '⚡', count: 5, speed: 2, size: 18 },
  nature: { color: '#4ade80', emoji: '🍃', count: 7, speed: 1, size: 14 },
  rock: { color: '#a78bfa', emoji: '🪨', count: 4, speed: 0.5, size: 20 },
  neutral: { color: '#94a3b8', emoji: '✨', count: 5, speed: 1, size: 12 },
};

interface ElementParticlesProps {
  /** 元素类型 */
  element: ElementType;
  /** 是否激活 */
  active?: boolean;
  /** 容器类名 */
  className?: string;
  /** 持续时间(ms) */
  duration?: number;
  /** 完成回调 */
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export const ElementParticles: React.FC<ElementParticlesProps> = React.memo(({ 
  element,
  active = true,
  className = '',
  duration = 1000,
  onComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  
  const config = useMemo(() => PARTICLE_CONFIGS[element] || PARTICLE_CONFIGS.neutral, [element]);
  
  useEffect(() => {
    if (!active) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 初始化粒子
    particlesRef.current = Array.from({ length: config.count }, (_, i) => ({
      id: i,
      x: canvas.width / 2 + (Math.random() - 0.5) * 40,
      y: canvas.height / 2 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * config.speed * 3,
      vy: (Math.random() - 0.5) * config.speed * 3 - 1,
      life: 1,
      maxLife: 1,
      size: config.size * (0.8 + Math.random() * 0.4)
    }));
    
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach(particle => {
        // 更新位置
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05; // 重力
        particle.life -= 0.02;
        
        if (particle.life <= 0) return;
        
        // 绘制粒子
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.font = `${particle.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 发光效果
        ctx.shadowColor = config.color;
        ctx.shadowBlur = 10;
        
        ctx.fillText(config.emoji, particle.x, particle.y);
        ctx.restore();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, config, duration, onComplete]);
  
  if (!active) return null;
  
  return (
    <canvas 
      ref={canvasRef}
      width={200}
      height={200}
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ mixBlendMode: 'screen' }}
    />
  );
});

ElementParticles.displayName = 'ElementParticles';

export default ElementParticles;
