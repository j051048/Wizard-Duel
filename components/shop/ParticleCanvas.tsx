/**
 * ParticleCanvas - 粒子爆发效果画布
 */

import React, { useEffect, useRef } from 'react';

interface ParticleCanvasProps {
  hasRare: boolean;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ hasRare }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; life: number; maxLife: number;
      type: 'spark' | 'star' | 'glow';
    }> = [];
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const colors = hasRare 
      ? ['#ffd700', '#ffec4d', '#fff5b3', '#ffffff', '#fbbf24', '#f59e0b']
      : ['#a855f7', '#c084fc', '#e879f9', '#f0abfc', '#ffffff'];
    
    // 星星粒子
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 8 + Math.random() * 12;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1000 + Math.random() * 500,
        maxLife: 1500,
        type: 'star'
      });
    }
    
    // 火花粒子
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: centerX + (Math.random() - 0.5) * 100,
        y: centerY + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 600 + Math.random() * 400,
        maxLife: 1000,
        type: 'spark'
      });
    }
    
    // 光晕粒子
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 1,
        size: 20 + Math.random() * 30,
        color: hasRare ? 'rgba(255, 215, 0, 0.3)' : 'rgba(168, 85, 247, 0.3)',
        life: 800 + Math.random() * 400,
        maxLife: 1200,
        type: 'glow'
      });
    }
    
    let animationId: number;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 中心爆发光
      const burstProgress = Math.min(elapsed / 500, 1);
      const burstSize = 50 + burstProgress * 300;
      const burstOpacity = (1 - burstProgress) * 0.8;
      
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, burstSize);
      gradient.addColorStop(0, hasRare ? `rgba(255, 215, 0, ${burstOpacity})` : `rgba(168, 85, 247, ${burstOpacity})`);
      gradient.addColorStop(0.5, hasRare ? `rgba(255, 200, 0, ${burstOpacity * 0.5})` : `rgba(192, 132, 252, ${burstOpacity * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制粒子
      particles.forEach((p) => {
        p.life -= 16;
        if (p.life <= 0) return;
        
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // 重力
        p.vx *= 0.98;
        
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        
        if (p.type === 'star') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          const spikes = 4;
          const outerRadius = p.size;
          const innerRadius = p.size / 2;
          
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = p.x + Math.cos(angle) * radius;
            const y = p.y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        } else if (p.type === 'spark') {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        } else if (p.type === 'glow') {
          const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          glowGradient.addColorStop(0, p.color);
          glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glowGradient;
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        }
      });
      
      ctx.globalAlpha = 1;
      
      if (elapsed < 2000) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [hasRare]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-30"
    />
  );
};
