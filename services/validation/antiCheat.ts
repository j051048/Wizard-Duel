/**
 * Anti-Cheat System Stubs
 * 
 * 防作弊机制：状态哈希验证、时间验证、输入清理
 * 当前为 mock 模式，仅记录日志
 */

import { DuelState } from '../../types';

// [P0 Fix #6] 生产环境自动关闭 MOCK_MODE
const MOCK_MODE = import.meta.env.DEV || import.meta.env.VITE_FORCE_MOCK === 'true';

/**
 * 计算游戏状态哈希（简化版）
 * 用于检测客户端状态是否被篡改
 */
export const calculateStateHash = (state: DuelState): string => {
  // 简化的哈希计算 - 生产环境应使用加密哈希
  const criticalFields = [
    state.playerHP,
    state.opponentHP,
    state.playerMana,
    state.opponentMana,
    state.roundNumber,
    state.playerHand.join(','),
    state.opponentHandSize,
  ].join('|');
  
  // Mock: 简单字符串哈希
  let hash = 0;
  for (let i = 0; i < criticalFields.length; i++) {
    const char = criticalFields.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
};

/**
 * 验证状态哈希
 * @param state - 当前状态
 * @param expectedHash - 期望的哈希值
 * @returns 验证结果
 */
export const verifyStateHash = async (
  state: DuelState,
  expectedHash: string
): Promise<{ valid: boolean; reason?: string }> => {
  if (MOCK_MODE) {
    const actualHash = calculateStateHash(state);
    console.log(`[Mock] verifyStateHash: expected=${expectedHash}, actual=${actualHash}`);
    
    if (actualHash !== expectedHash) {
      console.warn('[AntiCheat] State hash mismatch - possible tampering');
      return { valid: false, reason: 'State hash mismatch' };
    }
    
    return { valid: true };
  }
  
  // TODO: Real server-side hash verification
  return { valid: true };
};

/**
 * 验证操作时间合理性
 * @param lastActionTime - 上次操作时间戳
 * @param currentTime - 当前时间戳
 * @returns 验证结果
 */
export const validateTiming = (
  lastActionTime: number,
  currentTime: number = Date.now()
): { valid: boolean; reason?: string } => {
  const MIN_ACTION_INTERVAL_MS = 100; // 最小操作间隔 100ms (防止脚本快速点击)
  const MAX_TURN_TIME_MS = 300000; // 最大回合时间 5分钟
  
  const elapsed = currentTime - lastActionTime;
  
  if (elapsed < MIN_ACTION_INTERVAL_MS) {
    console.warn(`[AntiCheat] Action too fast: ${elapsed}ms`);
    return { valid: false, reason: 'Action too fast - possible bot' };
  }
  
  if (elapsed > MAX_TURN_TIME_MS) {
    console.warn(`[AntiCheat] Action too slow: ${elapsed}ms`);
    return { valid: false, reason: 'Turn timeout' };
  }
  
  return { valid: true };
};

/**
 * 输入清理 - 防止注入攻击
 * @param input - 用户输入
 * @returns 清理后的输入
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // 移除潜在的危险字符
  return input
    .replace(/[<>]/g, '') // 移除 HTML 标签
    .replace(/['"]/g, '') // 移除引号
    .trim()
    .slice(0, 100); // 限制长度
};

/**
 * 验证玩家操作频率
 * 防止脚本自动化攻击
 */
export class RateLimiter {
  private actionTimestamps: number[] = [];
  private readonly maxActionsPerMinute = 60;
  
  checkRateLimit(): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // 清理1分钟前的记录
    this.actionTimestamps = this.actionTimestamps.filter(t => t > oneMinuteAgo);
    
    if (this.actionTimestamps.length >= this.maxActionsPerMinute) {
      console.warn('[AntiCheat] Rate limit exceeded');
      return { allowed: false, reason: 'Too many actions - rate limit exceeded' };
    }
    
    this.actionTimestamps.push(now);
    return { allowed: true };
  }
}
