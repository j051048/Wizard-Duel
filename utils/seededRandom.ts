/**
 * Seed-based Deterministic RNG (确定性随机数生成器)
 * 
 * [P0 Fix #2] 使用 Mulberry32 算法，保证相同种子产生相同序列。
 * 用于：洗牌、AI 决策、所有战斗中的随机事件。
 * 
 * 设计：
 * - 每局对战开始时生成一个种子 (createGameSeed)
 * - 所有随机操作通过 SeededRNG 实例进行
 * - 支持序列化/反序列化，可用于回放和断线重连
 */

/**
 * Mulberry32 - 高质量 32-bit PRNG
 * 周期 2^32，统计质量通过 BigCrush 测试
 */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededRNG {
  private _seed: number;
  private _initialSeed: number;
  private _callCount: number;
  private _next: () => number;

  constructor(seed?: number) {
    this._initialSeed = seed ?? SeededRNG.createSeed();
    this._seed = this._initialSeed;
    this._callCount = 0;
    this._next = mulberry32(this._seed);
  }

  /** 生成 [0, 1) 范围的随机数 */
  random(): number {
    this._callCount++;
    return this._next();
  }

  /** 生成 [min, max) 范围的整数 */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /** 从数组中随机选择一个元素 */
  pick<T>(arr: readonly T[]): T {
    return arr[this.randomInt(0, arr.length)];
  }

  /** Fisher-Yates 洗牌（确定性） */
  shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /** 概率判定：返回 true 的概率为 probability */
  chance(probability: number): boolean {
    return this.random() < probability;
  }

  /** 获取初始种子 */
  get initialSeed(): number {
    return this._initialSeed;
  }

  /** 获取当前调用次数（用于断线重连定位） */
  get callCount(): number {
    return this._callCount;
  }

  /**
   * 序列化状态，用于保存/恢复
   */
  serialize(): RNGState {
    return {
      initialSeed: this._initialSeed,
      callCount: this._callCount,
    };
  }

  /**
   * 从序列化状态恢复
   * 通过重放相同次数的调用来恢复到完全相同的状态
   */
  static deserialize(state: RNGState): SeededRNG {
    const rng = new SeededRNG(state.initialSeed);
    // 快进到保存时的位置
    for (let i = 0; i < state.callCount; i++) {
      rng.random();
    }
    return rng;
  }

  /** 生成随机种子 */
  static createSeed(): number {
    return (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
  }
}

export interface RNGState {
  initialSeed: number;
  callCount: number;
}

/**
 * 全局游戏 RNG 实例
 * 每局对战开始时通过 resetGameRNG() 重置
 */
let _gameRNG: SeededRNG = new SeededRNG();

/** 获取当前游戏 RNG */
export function getGameRNG(): SeededRNG {
  return _gameRNG;
}

/** 用新种子重置游戏 RNG（对战开始时调用） */
export function resetGameRNG(seed?: number): SeededRNG {
  _gameRNG = new SeededRNG(seed);
  return _gameRNG;
}

/** 从序列化状态恢复游戏 RNG（断线重连时调用） */
export function restoreGameRNG(state: RNGState): SeededRNG {
  _gameRNG = SeededRNG.deserialize(state);
  return _gameRNG;
}