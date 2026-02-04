import { useState, useRef, useEffect, useCallback } from 'react';
import { HapticService } from '../services/haptic';

interface DamageNumber {
  id: number;
  value: number;
  x: number;
  y: number;
  isPlayer: boolean;
  isCrit: boolean;
  opacity: number;
  age: number;
}

interface Projectile {
    id: number;
    type: 'player' | 'opp';
    startX: number;
    startY: number;
    x: number;
    y: number;
    progress: number;
}

export const useBattleAnimations = (isLowQuality: boolean) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs for high-performance animation (Avoiding Re-renders)
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<{x: number, y: number, vx: number, vy: number, age: number, color: string}[]>([]);
  
  const [showCritEffect, setShowCritEffect] = useState(false);
  const [showBloodFlash, setShowBloodFlash] = useState(false);

  // Helper: Create Particles
  const spawnParticles = useCallback((x: number, y: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
          particlesRef.current.push({
              x, y,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              age: 0,
              color
          });
      }
  }, []);

  const addDamageNumber = useCallback((damage: number, isPlayer: boolean, isCrit: boolean = false) => {
    HapticService.medium();
    if (isCrit) HapticService.heavy();

    if (isPlayer) {
       setShowBloodFlash(true);
       setTimeout(() => setShowBloodFlash(false), 400);
    }

    const x = 50 + (Math.random() - 0.5) * 15; 
    const y = isPlayer ? 70 : 30;
    
    damageNumbersRef.current.push({ 
        id: Date.now(), 
        value: damage, 
        x, y, 
        isPlayer, 
        isCrit,
        opacity: 1,
        age: 0
    });

    // Particle Burst on Hit
    spawnParticles(x, y, isCrit ? 20 : 10, isPlayer ? '#ff0000' : '#ffff00');
  }, [spawnParticles]);

  const triggerCrit = useCallback(() => {
    setShowCritEffect(true);
    setTimeout(() => setShowCritEffect(false), 800);
  }, []);

  const spawnProjectile = useCallback((type: 'player' | 'opp') => {
    if (isLowQuality) return;
    const startY = type === 'player' ? 90 : 10;
    const endY = type === 'player' ? 30 : 70;
    
    projectilesRef.current.push({
        id: Math.random(),
        type,
        startX: 50,
        startY,
        x: 50,
        y: startY,
        progress: 0
    });
  }, [isLowQuality]);

  useEffect(() => {
    if (isLowQuality) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let animationId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
        const deltaTime = time - lastTime;
        lastTime = time;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const w = canvas.width;
        const h = canvas.height;

        // 1. Update & Render Particles
        particlesRef.current = particlesRef.current.filter(p => {
            p.age += deltaTime;
            if (p.age > 1000) return false;
            
            p.x += p.vx * (deltaTime / 16);
            p.y += p.vy * (deltaTime / 16);
            p.vy += 0.2; // Gravity
            
            const alpha = 1 - p.age / 1000;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc((p.x/100)*w, (p.y/100)*h, 2, 0, Math.PI*2);
            ctx.fill();
            return true;
        });

        // 2. Update & Render Projectiles
        projectilesRef.current = projectilesRef.current.filter(p => {
            p.progress += deltaTime / 600; // 600ms duration
            if (p.progress >= 1) {
                // Impact!
                spawnParticles(50, p.type === 'player' ? 30 : 70, 15, p.type === 'player' ? '#a855f7' : '#ef4444');
                return false;
            }
            
            const ease = p.progress; // Linear for now
            const targetY = p.type === 'player' ? 30 : 70;
            p.y = p.startY + (targetY - p.startY) * ease;
            
            ctx.save();
            ctx.globalAlpha = 1;
            const grad = ctx.createRadialGradient((p.x/100)*w, (p.y/100)*h, 0, (p.x/100)*w, (p.y/100)*h, 20);
            grad.addColorStop(0, 'white');
            grad.addColorStop(1, p.type === 'player' ? 'rgba(168, 85, 247, 0)' : 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc((p.x/100)*w, (p.y/100)*h, 15, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
            return true;
        });

        // 3. Update & Render Damage Numbers
        damageNumbersRef.current = damageNumbersRef.current.filter(d => {
            d.age += deltaTime;
            if (d.age > 1200) return false;
            
            const opacity = 1 - d.age / 1200;
            const yOffset = (d.age / 1200) * 150;
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'black';
            ctx.fillStyle = d.isPlayer ? '#ff4d4d' : '#ffd700'; // Red for player hurt, Gold for enemy hurt
            ctx.font = `italic 900 ${d.isCrit ? '64px' : '48px'} Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            
            const drawX = (d.x / 100) * w;
            const drawY = (d.y / 100) * h - yOffset;
            
            ctx.lineWidth = 6;
            ctx.strokeStyle = 'black';
            ctx.strokeText(`-${d.value}`, drawX, drawY);
            ctx.fillText(`-${d.value}`, drawX, drawY);
            
            if (d.isCrit) {
                ctx.font = 'bold 24px Inter';
                ctx.fillStyle = '#ffaa00';
                ctx.fillText('CRITICAL!', drawX, drawY - 60);
            }
            
            ctx.restore();
            return true;
        });
        
        animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
    };
  }, [isLowQuality, spawnParticles]);

  return {
    canvasRef,
    showCritEffect,
    showBloodFlash,
    projectiles: [], // No longer used in DOM
    addDamageNumber,
    triggerCrit,
    spawnProjectile
  };
};
