import { useState, useRef, useEffect, useCallback } from 'react';
import { HapticService } from '../services/haptic';
import { globalFPSMonitor } from '../services/performance';
import { FloatingTextItem, FloatingTextType } from '../components/battle/feedback/FloatingText';

interface Projectile {
    id: number;
    type: 'player' | 'opp';
    startX: number;
    startY: number;
    x: number;
    y: number;
    progress: number;
}

export type ParticleType = 'fire' | 'ice' | 'thunder' | 'poison' | 'rock' | 'default' | 'heal' | 'arcane';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
    type: ParticleType;
    gravity: number;
    drag: number;
}

// --- Performance: Particle Pool ---
const MAX_PARTICLES = 200;

interface PooledParticle extends Particle {
    active: boolean;
}

const createParticlePool = (): PooledParticle[] => {
    return Array.from({ length: MAX_PARTICLES }, () => ({
        x: 0, y: 0, vx: 0, vy: 0, size: 2, color: '#ffffff', 
        life: 0, maxLife: 1, type: 'default' as ParticleType, 
        gravity: 0, drag: 0.95, active: false
    }));
};

export const useBattleAnimations = (isLowQuality: boolean) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs for high-performance animation
  const projectilesRef = useRef<Projectile[]>([]);
  const particlePoolRef = useRef<PooledParticle[]>(createParticlePool());
  const activeParticleCount = useRef(0);
  
  // React State for DOM-based animations (Floating Texts)
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [showCritEffect, setShowCritEffect] = useState(false);
  const [showBloodFlash, setShowBloodFlash] = useState(false);
  const [shakeClass, setShakeClass] = useState('');
  const shakeTimer = useRef<NodeJS.Timeout | null>(null);

  // Helper: Trigger Screen Shake
  const triggerShake = useCallback((type: ParticleType) => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      
      let className = 'animate-shake-strong'; // default
      let duration = 600;

      if (type === 'rock' || type === 'ice') {
          className = 'animate-shake-heavy';
          duration = 500;
      } else if (type === 'thunder') {
          className = 'animate-shake-electric';
          duration = 300;
      } else if (type === 'poison') {
          className = 'animate-shake-tremor';
          duration = 500;
      } else if (type === 'default' ) {
          className = 'animate-shake-gentle';
          duration = 400;
      } 
      
      setShakeClass(className);
      shakeTimer.current = setTimeout(() => setShakeClass(''), duration);
  }, []);

  // Helper: Create Particles with Physics (Object Pool Version)
  const spawnParticles = useCallback((x: number, y: number, count: number, type: ParticleType = 'default') => {
      const colors: Record<ParticleType, string[]> = {
          fire: ['#ef4444', '#f97316', '#fbbf24', '#7f1d1d'],
          ice: ['#a5f3fc', '#22d3ee', '#ecfeff', '#ffffff'],
          thunder: ['#fde047', '#eab308', '#ffffff', '#854d0e'],
          poison: ['#84cc16', '#3f6212', '#ecfccb', '#1a2e05'],
          rock: ['#78716c', '#44403c', '#d6d3d1', '#292524'],
          heal: ['#86efac', '#22c55e', '#ffffff'],
          arcane: ['#d8b4fe', '#a855f7', '#581c87'],
          default: ['#ffffff', '#fbbf24'] 
      };

      const pool = particlePoolRef.current;
      let spawned = 0;

      for (let i = 0; i < pool.length && spawned < count; i++) {
          const p = pool[i];
          if (p.active) continue; // Skip active particles
          
          // Reuse this particle
          const colorList = colors[type] || colors.default;
          p.color = colorList[Math.floor(Math.random() * colorList.length)];
          p.x = x;
          p.y = y;
          p.type = type;
          
          // Default physics
          p.vx = (Math.random() - 0.5) * 10;
          p.vy = (Math.random() - 0.5) * 10;
          p.gravity = 0.2;
          p.drag = 0.95;
          p.life = 600 + Math.random() * 400;
          p.size = 2 + Math.random() * 3;

          // Physics presets per type
          if (type === 'fire') {
              p.vx = (Math.random() - 0.5) * 6;
              p.vy = -Math.random() * 8;
              p.gravity = -0.05;
              p.drag = 0.96;
          } else if (type === 'ice') {
              p.gravity = 0.4;
              p.size = Math.random() * 4 + 2;
          } else if (type === 'thunder') {
              p.vx = (Math.random() - 0.5) * 20;
              p.vy = (Math.random() - 0.5) * 20;
              p.gravity = 0;
              p.drag = 0.85;
              p.life = 300 + Math.random() * 200;
          } else if (type === 'poison') {
              p.vx = (Math.random() - 0.5) * 2;
              p.vy = -Math.random() * 2;
              p.gravity = -0.01;
              p.size = Math.random() * 4 + 1;
              p.life = 1000 + Math.random() * 500;
          } else if (type === 'heal') {
              p.gravity = -0.05;
              p.vx = (Math.random() - 0.5) * 3;
              p.vy = -Math.random() * 3;
              p.size = Math.random() * 3 + 2;
          }

          p.maxLife = p.life;
          p.active = true;
          spawned++;
          activeParticleCount.current++;
      }
  }, []);

  // NEW: Add Floating Text (Replaces Canvas Damage Numbers)
  const addFloatingText = useCallback((text: string, type: FloatingTextType, isPlayer: boolean, xOffset: number = 0) => {
    // Determine screen coordinates (roughly)
    // isPlayer = true -> Player takes damage/heal -> Text appears in Player area (bottom)
    // BUT wait, isPlayer in `addDamageNumber` meant 'Target is Player'.
    // Here we make it explicit.
    
    // Position Logic:
    // Player Avatar Area: ~BottomCenter (50%, 75%)
    // Opponent Avatar Area: ~TopCenter (50%, 20%)
    
    // Random jitter
    const jitterX = (Math.random() - 0.5) * 60;
    const jitterY = (Math.random() - 0.5) * 30;

    const baseX = window.innerWidth * 0.5 + xOffset + jitterX;
    const baseY = isPlayer ? window.innerHeight * 0.70 : window.innerHeight * 0.20;

    const id = Date.now().toString() + Math.random();

    setFloatingTexts(prev => [...prev, {
        id,
        text,
        type,
        x: baseX,
        y: baseY + jitterY,
        duration: 1.5
    }]);

    // Auto-remove after duration (cleanup)
    setTimeout(() => {
        setFloatingTexts(prev => prev.filter(item => item.id !== id));
    }, 1600);
  }, []);

  const addDamageNumber = useCallback((damage: number, isPlayer: boolean, isCrit: boolean = false, type: ParticleType = 'default') => {
    HapticService.medium();
    if (isCrit) HapticService.heavy();

    if (isPlayer) {
       setShowBloodFlash(true);
       setTimeout(() => setShowBloodFlash(false), 400);
    }

    addFloatingText(
        `-${damage}`, 
        isCrit ? 'crit' : 'damage', 
        isPlayer
    );

    // Particle Burst on Hit (Still Canvas)
    const x = 50 + (Math.random() - 0.5) * 15; 
    const y = isPlayer ? 70 : 30;
    spawnParticles(x, y, isCrit ? 40 : 20, type);
  }, [addFloatingText, spawnParticles]);

  const triggerCrit = useCallback(() => {
    setShowCritEffect(true);
    setTimeout(() => setShowCritEffect(false), 800);
  }, []);

  const spawnProjectile = useCallback((type: 'player' | 'opp') => {
    if (isLowQuality) return;
    const startY = type === 'player' ? 90 : 10;
    
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

  // Helper: Drag Trail
  const updateDragTrail = useCallback((x: number, y: number) => {
      if (isLowQuality) return;
      // Convert pixel to percentage
      const percentX = (x / window.innerWidth) * 100;
      const percentY = (y / window.innerHeight) * 100;
      
      spawnParticles(percentX, percentY, 2, 'arcane');
  }, [isLowQuality, spawnParticles]);

  // Canvas Loop (Particles & Projectiles only)
  useEffect(() => {
    if (isLowQuality) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Performance: Use desynchronized context for smoother rendering
    const ctx = canvas.getContext('2d', { 
        alpha: true,
        desynchronized: true 
    });
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
    let lowFpsFrames = 0; 

    const render = (time: number) => {
        globalFPSMonitor.tick();
        const deltaTime = time - lastTime;
        lastTime = time;
        
        // Adaptive performance
        const isSlowFrame = deltaTime > 33; 
        if (isSlowFrame) {
            lowFpsFrames++;
        } else {
            lowFpsFrames = Math.max(0, lowFpsFrames - 1);
        }
        const performanceMode = lowFpsFrames > 5; 
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const w = canvas.width;
        const h = canvas.height;

        // 1. Update & Render Particles (Object Pool)
        const pool = particlePoolRef.current;
        const stride = performanceMode ? 2 : 1; 
        for (let i = 0; i < pool.length; i += stride) {
            const p = pool[i];
            if (!p.active) continue;
            
            p.life -= deltaTime;
            if (p.life <= 0) {
                p.active = false;
                activeParticleCount.current--;
                continue;
            }
            
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.vy += p.gravity;
            
            p.x += p.vx * (deltaTime / 16);
            p.y += p.vy * (deltaTime / 16);
            
            const alpha = p.life / p.maxLife;
            
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            
            if (p.type === 'ice' || p.type === 'rock') {
                const s = p.size * (alpha + 0.2);
                ctx.rect((p.x/100)*w - s/2, (p.y/100)*h - s/2, s, s);
            } else {
                ctx.arc((p.x/100)*w, (p.y/100)*h, p.size, 0, Math.PI*2);
            }
            ctx.fill();
        }

        // 2. Update & Render Projectiles (Quadratic Bezier)
        projectilesRef.current = projectilesRef.current.filter(p => {
            p.progress += deltaTime / 600; 
            
            if (p.progress >= 1) {
                // Impact!
                spawnParticles(50, p.type === 'player' ? 30 : 70, 25, 'default');
                triggerShake(p.type === 'player' ? 'default' : 'rock'); 
                return false;
            }
            
            const t = p.progress;
            const invT = 1 - t;
            
            const targetX = 50; 
            const targetY = p.type === 'player' ? 30 : 70; 
            
            const arcIntensity = 30 + (p.id * 100 % 20); 
            const side = (p.id * 100 % 2) > 1 ? 1 : -1; 
            
            const controlX = p.startX + (side * arcIntensity);
            const controlY = p.startY + (targetY - p.startY) / 2; 

            const nextX = (invT * invT * p.startX) + (2 * invT * t * controlX) + (t * t * targetX);
            const nextY = (invT * invT * p.startY) + (2 * invT * t * controlY) + (t * t * targetY);
            
            const dx = nextX - p.x;
            const dy = nextY - p.y;
            const angle = Math.atan2(dy, dx);
            
            p.x = nextX;
            p.y = nextY;
            
            // Draw
            ctx.save();
            ctx.translate((p.x/100)*w, (p.y/100)*h);
            ctx.rotate(angle);
            
            if (p.progress % 0.05 < 0.02) spawnParticles(p.x, p.y, 1, 'arcane');

            const orbColor = p.type === 'player' ? '255, 200, 0' : '168, 85, 247'; 
            
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
            grad.addColorStop(0, `rgba(${orbColor}, 1)`);
            grad.addColorStop(0.4, `rgba(${orbColor}, 0.8)`);
            grad.addColorStop(1, `rgba(${orbColor}, 0)`);
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
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
    shakeClass,
    floatingTexts, // New
    addFloatingText, // New
    addDamageNumber,
    triggerCrit,
    triggerShake,
    spawnProjectile,
    updateDragTrail
  };
};
