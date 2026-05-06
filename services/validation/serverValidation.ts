/**
 * Server-side Validation Stubs
 * 
 * 用于未来与 Supabase 后端集成的验证接口
 * 当前为 mock 模式，仅记录日志
 * 
 * [P1-16] 开包概率安全性改进：
 * - 概率计算逻辑封装，不直接暴露配置
 * - 添加哈希校验接口
 * - 保底机制服务端验证
 */

import { DuelState, SpellType, Rarity } from '../../types';
import { PACK_CONFIG } from '../../config/gameConfig';

// Mock 模式标志 - 生产环境应为 false
// [P0 Fix #6] 生产环境自动关闭 MOCK_MODE
const MOCK_MODE = import.meta.env.DEV || import.meta.env.VITE_FORCE_MOCK === 'true';

const serverValidationUnavailable = (operation: string) => ({
  valid: false,
  reason: `Server validation unavailable for ${operation}`,
});

// ============ 开包概率安全性 ============

/**
 * 服务端开包结果计算（安全版）
 * 概率计算在此处集中处理，前端不直接使用 dropRates
 * 
 * [P1-16] 保底机制 + 概率计算封装
 */
export const calculatePackResult = (
  packType: 'standard' | 'premium' | 'legendary',
  pityCounters: { rare: number; mythic: number; legendary: number }
): { rarity: Rarity; pityUpdates: typeof pityCounters } => {
  const { dropRates, pitySystem } = PACK_CONFIG;
  const updatedPity = { ...pityCounters };
  
  // 保底检查（优先级：传说 > 史诗 > 稀有）
  if (updatedPity.legendary >= pitySystem.legendary.threshold) {
    updatedPity.legendary = 0;
    updatedPity.mythic = 0;
    updatedPity.rare = 0;
    return { rarity: 'legendary', pityUpdates: updatedPity };
  }
  
  if (updatedPity.mythic >= pitySystem.mythic.threshold) {
    updatedPity.mythic = 0;
    updatedPity.rare = 0;
    updatedPity.legendary += 1;
    return { rarity: 'mythic', pityUpdates: updatedPity };
  }
  
  if (updatedPity.rare >= pitySystem.rare.threshold) {
    updatedPity.rare = 0;
    updatedPity.mythic += 1;
    updatedPity.legendary += 1;
    return { rarity: 'rare', pityUpdates: updatedPity };
  }
  
  // 正常概率抽取
  // Pack type modifiers
  let rates = { ...dropRates };
  if (packType === 'premium') {
    rates.rare += 0.05;
    rates.mythic += 0.02;
    rates.common -= 0.07;
  } else if (packType === 'legendary') {
    rates.rare += 0.10;
    rates.mythic += 0.05;
    rates.legendary += 0.03;
    rates.common -= 0.18;
  }
  
  // Ensure non-negative
  rates.common = Math.max(0, rates.common);
  
  const roll = Math.random();
  let rarity: Rarity;
  
  if (roll < rates.legendary) {
    rarity = 'legendary';
    updatedPity.legendary = 0;
    updatedPity.mythic = 0;
    updatedPity.rare = 0;
  } else if (roll < rates.legendary + rates.mythic) {
    rarity = 'mythic';
    updatedPity.mythic = 0;
    updatedPity.rare = 0;
    updatedPity.legendary += 1;
  } else if (roll < rates.legendary + rates.mythic + rates.rare) {
    rarity = 'rare';
    updatedPity.rare = 0;
    updatedPity.mythic += 1;
    updatedPity.legendary += 1;
  } else {
    rarity = 'common';
    updatedPity.rare += 1;
    updatedPity.mythic += 1;
    updatedPity.legendary += 1;
  }
  
  return { rarity, pityUpdates: updatedPity };
};

/**
 * 生成开包结果摘要哈希（未来用于服务端校验）
 */
export const generatePackResultHash = (
  userId: string,
  packId: string,
  results: Rarity[],
  timestamp: number
): string => {
  // Simple hash for now; in production, use HMAC with server secret
  const data = `${userId}:${packId}:${results.join(',')}:${timestamp}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// ============ 原有验证接口 ============

/**
 * 验证卡牌出牌合法性
 */
export const validateCardPlay = async (
  gameState: DuelState,
  cardId: SpellType,
  playerId: string
): Promise<{ valid: boolean; reason?: string }> => {
  if (MOCK_MODE) {
    console.log(`[Mock] validateCardPlay: player=${playerId}, card=${cardId}`);
    
    const isPlayerTurn = playerId === 'player';
    const hand = isPlayerTurn ? gameState.playerHand : gameState.opponentHand;
    
    if (!hand.includes(cardId) && cardId !== 'skip') {
      console.warn(`[Validation] Card ${cardId} not in hand for ${playerId}`);
      return { valid: false, reason: 'Card not in hand' };
    }
    
    return { valid: true };
  }
  
  return serverValidationUnavailable('card play');
};

/**
 * 验证伤害计算正确性
 */
export const validateDamageCalculation = async (
  state: DuelState,
  expectedDamage: number
): Promise<{ valid: boolean; calculatedDamage?: number; reason?: string }> => {
  if (MOCK_MODE) {
    console.log(`[Mock] validateDamageCalculation: expected=${expectedDamage}`);
    
    if (expectedDamage < 0) {
      return { valid: false, reason: 'Negative damage not allowed' };
    }
    
    if (expectedDamage > 999) {
      return { valid: false, reason: 'Damage too high' };
    }
    
    return { valid: true, calculatedDamage: expectedDamage };
  }
  
  return serverValidationUnavailable('damage calculation');
};

/**
 * 验证游戏结果
 */
export const validateGameResult = async (
  state: DuelState
): Promise<{ valid: boolean; result?: 'WIN' | 'LOSS' | 'DRAW'; reason?: string }> => {
  if (MOCK_MODE) {
    const playerDead = state.playerHP <= 0;
    const opponentDead = state.opponentHP <= 0;
    
    let result: 'WIN' | 'LOSS' | 'DRAW' | undefined;
    
    if (playerDead && opponentDead) {
      result = 'DRAW';
    } else if (playerDead) {
      result = 'LOSS';
    } else if (opponentDead) {
      result = 'WIN';
    }
    
    if (!result) {
      return { valid: false, reason: 'Game not finished' };
    }
    
    return { valid: true, result };
  }
  
  return serverValidationUnavailable('game result');
};
