/**
 * Elo/MMR Matchmaking System
 * 
 * [P2 Fix #23] 真实的 Elo 匹配算法
 * 
 * 设计：
 * - 新玩家初始 MMR = 1000
 * - K 系数根据段位动态调整（低段高 K，高段低 K）
 * - 匹配优先积分接近 + 网络延迟相似
 * - 等待时间越长，匹配范围越宽
 */

export interface PlayerMMR {
  id: string;
  username: string;
  mmr: number;
  gamesPlayed: number;
  winStreak: number;
  lossStreak: number;
  lastMatchTime: number;
  region?: string;
}

export interface MatchCandidate {
  player: PlayerMMR;
  latency?: number; // 网络延迟 ms
  waitingSince: number; // 开始等待匹配的时间
}

/** MMR 配置 */
const MMR_CONFIG = {
  /** 初始 MMR */
  initialMMR: 1000,
  /** 最低 MMR (不会低于此值) */
  minMMR: 0,
  /** 最高 MMR */
  maxMMR: 3000,
  /** 基础匹配范围 (MMR 差值) */
  baseMatchRange: 100,
  /** 每等待10秒扩大匹配范围 */
  rangeExpansionPerInterval: 50,
  /** 扩大匹配范围的间隔 (ms) */
  rangeExpansionInterval: 10000,
  /** 最大匹配范围 */
  maxMatchRange: 500,
  /** 延迟权重 (延迟差异 ms 转换为 MMR 差异的系数) */
  latencyWeight: 0.5,
};

/**
 * 根据段位获取 K 系数
 * 低分段 K 大（波动大，快速定位），高分段 K 小（稳定）
 */
export function getKFactor(mmr: number, gamesPlayed: number): number {
  // 新玩家：前 30 场 K=40（快速定位）
  if (gamesPlayed < 30) return 40;
  
  // 根据 MMR 分段
  if (mmr < 800) return 32;       // 青铜
  if (mmr < 1200) return 28;      // 白银
  if (mmr < 1600) return 24;      // 黄金
  if (mmr < 2000) return 20;      // 钻石
  return 16;                       // 大师/传说
}

/**
 * 计算 Elo 期望胜率
 */
export function expectedWinRate(playerMMR: number, opponentMMR: number): number {
  return 1 / (1 + Math.pow(10, (opponentMMR - playerMMR) / 400));
}

/**
 * 计算 MMR 变化
 * 
 * @param playerMMR 玩家当前 MMR
 * @param opponentMMR 对手 MMR
 * @param result 1=胜 0=负 0.5=平
 * @param gamesPlayed 玩家总场数
 * @param winStreak 连胜次数
 * @param lossStreak 连败次数
 * @returns MMR 变化值（可正可负）
 */
export function calculateMMRDelta(
  playerMMR: number,
  opponentMMR: number,
  result: 0 | 0.5 | 1,
  gamesPlayed: number,
  winStreak: number = 0,
  lossStreak: number = 0
): number {
  const K = getKFactor(playerMMR, gamesPlayed);
  const expected = expectedWinRate(playerMMR, opponentMMR);
  
  let delta = Math.round(K * (result - expected));
  
  // [P1 Fix] 连胜加分（低段位专用，高段不加）
  if (result === 1 && winStreak >= 3 && playerMMR < 1500) {
    const streakBonus = Math.min(winStreak - 2, 5) * 3; // 最多 +15
    delta += streakBonus;
  }
  
  // [P1 Fix] 降级保护：低段位输了最少扣 5 分（不会断崖式下跌）
  if (result === 0 && playerMMR < 800 && delta < -10) {
    delta = -10; // 青铜段位最多扣 10
  }
  
  // 保证不会低于最低 MMR
  const newMMR = playerMMR + delta;
  if (newMMR < MMR_CONFIG.minMMR) {
    delta = MMR_CONFIG.minMMR - playerMMR;
  }
  
  return delta;
}

/**
 * 从候选池中找到最佳匹配对手
 * 
 * 评分公式：score = mmrDiff * 1.0 + latencyDiff * latencyWeight
 * 分数越低越好
 */
export function findBestMatch(
  seeker: MatchCandidate,
  candidates: MatchCandidate[]
): MatchCandidate | null {
  if (candidates.length === 0) return null;
  
  const now = Date.now();
  const waitingSeconds = (now - seeker.waitingSince) / 1000;
  
  // 动态匹配范围：等待越久范围越大
  const expansionSteps = Math.floor(waitingSeconds / (MMR_CONFIG.rangeExpansionInterval / 1000));
  const currentRange = Math.min(
    MMR_CONFIG.baseMatchRange + expansionSteps * MMR_CONFIG.rangeExpansionPerInterval,
    MMR_CONFIG.maxMatchRange
  );
  
  let bestCandidate: MatchCandidate | null = null;
  let bestScore = Infinity;
  
  for (const candidate of candidates) {
    // 不和自己匹配
    if (candidate.player.id === seeker.player.id) continue;
    
    const mmrDiff = Math.abs(seeker.player.mmr - candidate.player.mmr);
    
    // 超出当前范围则跳过
    if (mmrDiff > currentRange) continue;
    
    // 延迟差异评分
    const latencyDiff = (seeker.latency && candidate.latency)
      ? Math.abs(seeker.latency - candidate.latency)
      : 0;
    
    const score = mmrDiff * 1.0 + latencyDiff * MMR_CONFIG.latencyWeight;
    
    if (score < bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }
  
  return bestCandidate;
}

/**
 * MMR 对应的段位名称
 */
export function getRankFromMMR(mmr: number): string {
  if (mmr >= 2500) return 'Legend';
  if (mmr >= 2000) return 'Master';
  if (mmr >= 1600) return 'Diamond';
  if (mmr >= 1200) return 'Gold';
  if (mmr >= 800) return 'Silver';
  return 'Iron';
}

/**
 * 获取段位内的进度百分比
 */
export function getRankProgress(mmr: number): number {
  const thresholds = [0, 800, 1200, 1600, 2000, 2500, 3000];
  for (let i = thresholds.length - 1; i > 0; i--) {
    if (mmr >= thresholds[i - 1]) {
      const range = thresholds[i] - thresholds[i - 1];
      const progress = mmr - thresholds[i - 1];
      return Math.min(100, Math.round((progress / range) * 100));
    }
  }
  return 0;
}