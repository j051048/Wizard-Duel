import { useState, useRef, useEffect, useCallback } from 'react';
import { HapticService } from '../services/haptic';
import { globalFPSMonitor } from '../services/performance';
import { FloatingTextItem, FloatingTextType } from '../components/battle/feedback/FloatingText';

/**
 * useBattleAnimations Hook (v2.2)
 * 
 * [P0 UX] 增强打击反馈系统 
 * [P0 Performance] 离屏渲染与坐标预计算
 * [Audit Fix] 优化加载卡顿：改为 Lazy Creation 模式
 */

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

const MAX_PARTICLES = 200;

interface PooledParticle extends Particle {
    active: boolean;
}

// [Audit Fix] 移除启动时的昂贵循环计算
const createEmptyParticle = (): PooledParticle => ({
    x: 0, y: 0, vx: 0, vy: 0, size: 2, color: '#ffffff', 
    life: 0, maxLife: 1, type: 'default' as ParticleType, 
    gravity: 0, drag: 0.95, active: false
});

const HIT_STOP_DURATION = {
    light: 30,
    medium: 50,
    heavy: 80,
    ultra: 120
};

const gradientCache = new Map<string, CanvasGradient>();

export const useBattleAnimations = (isLowQuality: boolean) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlePoolRef = useRef<PooledParticle[]>([]); // 初始为空，解决加载卡顿
  
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [isHitStopped, setIsHitStopped] = useState(false);
  const [showCritEffect, setShowCritEffect] = useState(false);
  const [showBloodFlash, setShowBloodFlash] = useState(false);
  const [counterFlashElement, setCounterFlashElement] = useState<string | null>(null);
  const [shakeClass, setShakeClass] = useState('');
  const shakeTimer = useRef<NodeJS.Timeout | null>(null);

  const triggerShake = useCallback((type: ParticleType) => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      let className = 'animate-shake-strong';
      let duration = 600;
      if (type === 'rock' || type === 'ice') { className = 'animate-shake-heavy'; duration = 500; }
      else if (type === 'thunder') { className = 'animate-shake-electric'; duration = 300; }
      else if (type === 'poison') { className = 'animate-shake-tremor'; duration = 500; }
      else if (type === 'default' ) { className = 'animate-shake-gentle'; duration = 400; } 
      setShakeClass(className);
      shakeTimer.current = setTimeout(() => setShakeClass(''), duration);
  }, []);

  /**
   * 按需激活/创建粒子
   */
  const spawnParticles = useCallback((pctX: number, pctY: number, count: number, type: ParticleType = 'default') => {
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
      const w = window.innerWidth;
      const h = window.innerHeight;
      let spawned = 0;

      // 1. 尝试复用空闲粒子
      for (let i = 0; i < pool.length && spawned < count; i++) {
          const p = pool[i];
          if (!p.active) {
            activateParticle(p, pctX, pctY, type, colors, w, h);
            spawned++;
          }
      }

      // 2. 如果池子没满且不够用，则即时创建 (Lazy Creation)
      while (spawned < count && pool.length < MAX_PARTICLES) {
          const newP = createEmptyParticle();
          pool.push(newP);
          activateParticle(newP, pctX, pctY, type, colors, w, h);
          spawned++;
      }
  }, []);

  const activateParticle = (p: PooledParticle, pctX: number, pctY: number, type: ParticleType, colors: any, w: number, h: number) => {
    const colorList = colors[type] || colors.default;
    p.color = colorList[Math.floor(Math.random() * colorList.length)];
    p.x = (pctX / 100) * w;
    p.y = (pctY / 100) * h;
    p.type = type;
    p.vx = (Math.random() - 0.5) * 10;
    p.vy = (Math.random() - 0.5) * 10;
    p.gravity = 0.2;
    p.drag = 0.95;
    p.life = 600 + Math.random() * 400;
    p.size = 2 + Math.random() * 3;
    p.maxLife = p.life;
    p.active = true;
  };

  const addFloatingText = useCallback((text: string, type: FloatingTextType, isPlayer: boolean, xOffset: number = 0, tier?: 'light' | 'medium' | 'heavy') => {
    const jitterX = (Math.random() - 0.5) * 80;
    const jitterY = (Math.random() - 0.5) * 40;
    const baseX = window.innerWidth * 0.5 + xOffset + jitterX;
    const baseY = isPlayer ? window.innerHeight * 0.70 : window.innerHeight * 0.20;
    const id = Date.now().toString() + Math.random();
    setFloatingTexts(prev => [...prev, { id, text, type, x: baseX, y: baseY + jitterY, duration: (type === 'crit' || type === 'combo') ? 2.0 : 1.5, tier }]);
    setTimeout(() => { setFloatingTexts(prev => prev.filter(item => item.id !== id)); }, (type === 'crit' || type === 'combo') ? 2100 : 1600);
    if (type === 'crit' || type === 'combo') {
      triggerShake('default');
    }
  }, [triggerShake]);

  const triggerHitStop = useCallback((intensity: 'light' | 'medium' | 'heavy' | 'ultra' = 'medium') => {
    const duration = HIT_STOP_DURATION[intensity];
    setIsHitStopped(true);
    if (canvasRef.current) canvasRef.current.style.filter = 'contrast(1.2) brightness(1.1)';
    setTimeout(() => {
      setIsHitStopped(false);
      if (canvasRef.current) canvasRef.current.style.filter = 'none';
    }, duration);
  }, []);

  const addDamageNumber = useCallback((damage: number, isPlayer: boolean, isCrit: boolean = false, type: ParticleType = 'default') => {
    let hitStopIntensity: 'light' | 'medium' | 'heavy' | 'ultra' = 'light';
    let tier: 'light' | 'medium' | 'heavy' = 'light';
    if (damage >= 10 || isCrit) { hitStopIntensity = 'ultra'; tier = 'heavy'; }
    else if (damage >= 6) { hitStopIntensity = 'heavy'; tier = 'heavy'; }
    else if (damage >= 3) { hitStopIntensity = 'medium'; tier = 'medium'; }

    triggerHitStop(hitStopIntensity);
    HapticService.medium();
    if (isCrit) HapticService.heavy();
    if (isPlayer) { setShowBloodFlash(true); setTimeout(() => setShowBloodFlash(false), 400); }
    addFloatingText(`-${damage}`, isCrit ? 'crit' : 'damage', isPlayer, 0, tier);
    const x = 50 + (Math.random() - 0.5) * 15;
    const y = isPlayer ? 70 : 30;
    spawnParticles(x, y, isCrit ? 40 : (tier === 'heavy' ? 30 : 20), type);
  }, [addFloatingText, spawnParticles, triggerHitStop]);

  const addComboText = useCallback((comboCount: number, element: ParticleType = 'arcane') => {
    addFloatingText(`COMBO x${comboCount}!`, 'combo', false);
    spawnParticles(50, 50, 30, element);
    triggerHitStop('medium');
    HapticService.heavy();
  }, [addFloatingText, spawnParticles, triggerHitStop]);

  const triggerCrit = useCallback(() => {
    setShowCritEffect(true);
    setTimeout(() => setShowCritEffect(false), 800);
  }, []);

  const triggerCounterFlash = useCallback((element: string) => {
    setCounterFlashElement(element);
    setTimeout(() => setCounterFlashElement(null), 400);
  }, []);

  const spawnProjectile = useCallback((type: 'player' | 'opp') => {
    if (isLowQuality) return;
    const startY = type === 'player' ? 90 : 10;
    projectilesRef.current.push({ id: Math.random(), type, startX: 50, startY, x: 50, y: startY, progress: 0 });
  }, [isLowQuality]);

  const updateDragTrail = useCallback((x: number, y: number) => {
      if (isLowQuality) return;
      spawnParticles((x/window.innerWidth)*100, (y/window.innerHeight)*100, 2, 'arcane');
  }, [isLowQuality, spawnParticles]);

  useEffect(() => {
    if (isLowQuality) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const handleResize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        gradientCache.clear(); 
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let animationId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
        if (isHitStopped) { 
            animationId = requestAnimationFrame(render);
            return; 
        }
        
        globalFPSMonitor.tick();
        const deltaTime = time - lastTime;
        lastTime = time;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const pool = particlePoolRef.current;
        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (!p.active) continue;
            p.life -= deltaTime;
            if (p.life <= 0) { p.active = false; continue; }
            p.vx *= p.drag; p.vy *= p.drag; p.vy += p.gravity;
            p.x += p.vx * (deltaTime / 16);
            p.y += p.vy * (deltaTime / 16);
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color; ctx.globalAlpha = alpha;
            ctx.beginPath();
            if (p.type === 'ice' || p.type === 'rock') {
                const s = p.size * (alpha + 0.2);
                ctx.rect(p.x - s/2, p.y - s/2, s, s);
            } else {
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            }
            ctx.fill();
        }

        const w = window.innerWidth;
        const h = window.innerHeight;
        projectilesRef.current = projectilesRef.current.filter(p => {
            p.progress += deltaTime / 600; 
            if (p.progress >= 1) { spawnParticles(50, p.type === 'player' ? 30 : 70, 25, 'default'); triggerShake(p.type === 'player' ? 'default' : 'rock'); return false; }
            const t = p.progress; const invT = 1 - t;
            const targetX = 50; const targetY = p.type === 'player' ? 30 : 70; 
            const arcIntensity = 30 + (p.id * 100 % 20); const side = (p.id * 100 % 2) > 1 ? 1 : -1; 
            const controlX = p.startX + (side * arcIntensity);
            const controlY = p.startY + (targetY - p.startY) / 2; 
            const nextX = (invT * invT * p.startX) + (2 * invT * t * controlX) + (t * t * targetX);
            const nextY = (invT * invT * p.startY) + (2 * invT * t * controlY) + (t * t * targetY);
            const dx = nextX - p.x; const dy = nextY - p.y;
            const angle = Math.atan2(dy, dx);
            p.x = nextX; p.y = nextY;
            
            ctx.save();
            ctx.translate((p.x/100)*w, (p.y/100)*h);
            ctx.rotate(angle);
            
            const orbKey = p.type;
            let grad = gradientCache.get(orbKey);
            if (!grad) {
                const orbColor = p.type === 'player' ? '255, 200, 0' : '168, 85, 247'; 
                grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
                grad.addColorStop(0, `rgba(${orbColor}, 1)`);
                grad.addColorStop(1, `rgba(${orbColor}, 0)`);
                gradientCache.set(orbKey, grad);
            }
            
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
  }, [isLowQuality, isHitStopped, spawnParticles, triggerShake]);

  return {
    canvasRef,
    showCritEffect,
    showBloodFlash,
    counterFlashElement,
    shakeClass,
    floatingTexts,
    addFloatingText,
    addDamageNumber,
    addComboText,
    triggerCrit,
    triggerCounterFlash,
    triggerShake,
    spawnProjectile,
    updateDragTrail
  };
};
