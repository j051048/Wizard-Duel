import { useState, useRef, useEffect, useCallback } from 'react';
import { HapticService } from '../services/haptic';

interface DamageNumber {
  id: number;
  value: number;
  x: number;
  y: number;
  isPlayer: boolean;
  isCrit?: boolean;
}

export const useBattleAnimations = (isLowQuality: boolean) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const [showCritEffect, setShowCritEffect] = useState(false);
  const [showBloodFlash, setShowBloodFlash] = useState(false);
  const [projectiles, setProjectiles] = useState<{id: number, type: string, x: number, y: number}[]>([]);

  const addDamageNumber = useCallback((damage: number, isPlayer: boolean, isCrit: boolean = false) => {
    HapticService.medium();
    if (isCrit) HapticService.heavy();

    if (isPlayer) {
       setShowBloodFlash(true);
       setTimeout(() => setShowBloodFlash(false), 400);
    }

    const x = 50 + (Math.random() - 0.5) * 20; 
    const y = isPlayer ? 65 : 25;
    damageNumbersRef.current.push({ id: Date.now(), value: damage, x, y, isPlayer, isCrit });
  }, []);

  const triggerCrit = useCallback(() => {
    setShowCritEffect(true);
    setTimeout(() => setShowCritEffect(false), 800);
  }, []);

  const spawnProjectile = useCallback((type: 'player' | 'opp') => {
    if (isLowQuality) return;
    const id = Date.now();
    setProjectiles(prev => [...prev, { id, type, x: 50, y: type === 'player' ? 80 : 15 }]);
    setTimeout(() => {
      setProjectiles(prev => prev.filter(p => p.id !== id));
    }, 600);
  }, [isLowQuality]);

  useEffect(() => {
    if (isLowQuality) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const now = Date.now();
        
        damageNumbersRef.current = damageNumbersRef.current.filter(d => {
            const age = now - d.id;
            if (age > 1200) return false;
            
            const opacity = 1 - age / 1200;
            const yOffset = (age / 1200) * 100;
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = d.isPlayer ? '#ef4444' : '#60a5fa';
            ctx.font = `italic black ${d.isCrit ? '48px' : '36px'} WizardFont, sans-serif`;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            
            const drawX = (d.x / 100) * canvas.width;
            const drawY = (d.y / 100) * canvas.height - yOffset;
            
            ctx.strokeText(`-${d.value}`, drawX, drawY);
            ctx.fillText(`-${d.value}`, drawX, drawY);
            ctx.restore();
            return true;
        });
        
        animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [isLowQuality]);

  return {
    canvasRef,
    showCritEffect,
    showBloodFlash,
    projectiles,
    addDamageNumber,
    triggerCrit,
    spawnProjectile
  };
};
