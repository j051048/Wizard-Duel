/**
 * 对象池工具类
 * 
 * [P3 Fix #31] 粒子系统对象池，减少 GC 压力
 */

export interface Poolable {
  reset(): void;
  active: boolean;
}

/**
 * 通用对象池
 */
export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;
  private maxSize: number;
  
  constructor(factory: () => T, initialSize: number = 10, maxSize: number = 100) {
    this.factory = factory;
    this.maxSize = maxSize;
    
    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }
  
  /**
   * 获取一个对象
   */
  acquire(): T {
    // 优先从池中获取非活跃对象
    const inactive = this.pool.find(obj => !obj.active);
    if (inactive) {
      inactive.reset();
      inactive.active = true;
      return inactive;
    }
    
    // 池中没有可用对象，创建新的（如果未达上限）
    if (this.pool.length < this.maxSize) {
      const newObj = this.factory();
      newObj.active = true;
      this.pool.push(newObj);
      return newObj;
    }
    
    // 达到上限，强制复用第一个
    const first = this.pool[0];
    first.reset();
    first.active = true;
    return first;
  }
  
  /**
   * 释放一个对象回池
   */
  release(obj: T): void {
    obj.active = false;
  }
  
  /**
   * 释放所有对象
   */
  releaseAll(): void {
    this.pool.forEach(obj => {
      obj.active = false;
    });
  }
  
  /**
   * 获取池中活跃对象数
   */
  getActiveCount(): number {
    return this.pool.filter(obj => obj.active).length;
  }
  
  /**
   * 获取池大小
   */
  getPoolSize(): number {
    return this.pool.length;
  }
}

// ============ 粒子专用池 ============

export interface PooledParticle extends Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: string;
  active: boolean;
  reset(): void;
}

const createParticle = (): PooledParticle => ({
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  life: 0,
  maxLife: 1,
  size: 10,
  color: '#ffffff',
  type: 'default',
  active: false,
  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 1;
    this.maxLife = 1;
    this.size = 10;
    this.color = '#ffffff';
    this.type = 'default';
  }
});

// 全局粒子池实例
export const particlePool = new ObjectPool<PooledParticle>(createParticle, 50, 200);

/**
 * 创建粒子效果
 */
export const createParticleEffect = (
  x: number,
  y: number,
  type: 'fire' | 'ice' | 'thunder' | 'heal' | 'damage' | 'default',
  count: number = 10
): PooledParticle[] => {
  const particles: PooledParticle[] = [];
  
  const configs: Record<string, { color: string; speed: number; size: number }> = {
    fire: { color: '#ff6b35', speed: 3, size: 8 },
    ice: { color: '#60a5fa', speed: 2, size: 6 },
    thunder: { color: '#fbbf24', speed: 4, size: 5 },
    heal: { color: '#4ade80', speed: 1.5, size: 7 },
    damage: { color: '#ef4444', speed: 2.5, size: 6 },
    default: { color: '#ffffff', speed: 2, size: 5 }
  };
  
  const config = configs[type] || configs.default;
  
  for (let i = 0; i < count; i++) {
    const particle = particlePool.acquire();
    particle.x = x;
    particle.y = y;
    particle.vx = (Math.random() - 0.5) * config.speed * 2;
    particle.vy = (Math.random() - 0.5) * config.speed * 2 - 1;
    particle.life = 1;
    particle.maxLife = 0.5 + Math.random() * 0.5;
    particle.size = config.size * (0.8 + Math.random() * 0.4);
    particle.color = config.color;
    particle.type = type;
    particles.push(particle);
  }
  
  return particles;
};

/**
 * 更新粒子
 */
export const updateParticles = (
  particles: PooledParticle[],
  deltaTime: number
): PooledParticle[] => {
  return particles.filter(p => {
    if (!p.active) return false;
    
    // 更新物理
    p.x += p.vx * deltaTime * 60;
    p.y += p.vy * deltaTime * 60;
    p.vy += 0.1 * deltaTime * 60; // 重力
    p.life -= deltaTime / p.maxLife;
    
    // 检查生命周期
    if (p.life <= 0) {
      particlePool.release(p);
      return false;
    }
    
    return true;
  });
};
