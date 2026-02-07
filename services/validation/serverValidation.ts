/**
 * Server-side Validation Stubs
 * 
 * 用于未来与 Supabase 后端集成的验证接口
 * 当前为 mock 模式，仅记录日志
 */

import { DuelState, SpellType } from '../../types';

// Mock 模式标志 - 生产环境应为 false
const MOCK_MODE = true;

/**
 * 验证卡牌出牌合法性
 * @param gameState - 当前游戏状态
 * @param cardId - 要打出的卡牌ID
 * @param playerId - 玩家ID
 * @returns 验证结果
 */
export const validateCardPlay = async (
  gameState: DuelState,
  cardId: SpellType,
  playerId: string
): Promise<{ valid: boolean; reason?: string }> => {
  if (MOCK_MODE) {
    console.log(`[Mock] validateCardPlay: player=${playerId}, card=${cardId}`);
    
    // 基础检查：卡牌是否在手牌中
    const isPlayerTurn = playerId === 'player';
    const hand = isPlayerTurn ? gameState.playerHand : gameState.opponentHand;
    
    if (!hand.includes(cardId) && cardId !== 'skip') {
      console.warn(`[Validation] Card ${cardId} not in hand for ${playerId}`);
      return { valid: false, reason: 'Card not in hand' };
    }
    
    return { valid: true };
  }
  
  // TODO: Real Supabase RPC call
  // const { data, error } = await supabase.rpc('validate_card_play', {
  //   game_state: gameState,
  //   card_id: cardId,
  //   player_id: playerId
  // });
  // return data;
  
  return { valid: true };
};

/**
 * 验证伤害计算正确性
 * @param state - 游戏状态
 * @param expectedDamage - 期望的伤害值
 * @returns 验证结果
 */
export const validateDamageCalculation = async (
  state: DuelState,
  expectedDamage: number
): Promise<{ valid: boolean; calculatedDamage?: number; reason?: string }> => {
  if (MOCK_MODE) {
    console.log(`[Mock] validateDamageCalculation: expected=${expectedDamage}`);
    
    // 简单检查：伤害不应该为负数或超大值
    if (expectedDamage < 0) {
      console.warn(`[Validation] Negative damage detected: ${expectedDamage}`);
      return { valid: false, reason: 'Negative damage not allowed' };
    }
    
    if (expectedDamage > 999) {
      console.warn(`[Validation] Suspiciously high damage: ${expectedDamage}`);
      return { valid: false, reason: 'Damage too high' };
    }
    
    return { valid: true, calculatedDamage: expectedDamage };
  }
  
  // TODO: Real server-side damage calculation
  // const { data } = await supabase.rpc('validate_damage', {
  //   game_state: state,
  //   expected_damage: expectedDamage
  // });
  // return data;
  
  return { valid: true };
};

/**
 * 验证游戏结果
 * @param state - 最终游戏状态
 * @returns 验证结果
 */
export const validateGameResult = async (
  state: DuelState
): Promise<{ valid: boolean; result?: 'WIN' | 'LOSS' | 'DRAW'; reason?: string }> => {
  if (MOCK_MODE) {
    console.log(`[Mock] validateGameResult: playerHP=${state.playerHP}, opponentHP=${state.opponentHP}`);
    
    // 基础死亡检查
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
      console.warn('[Validation] Game not finished yet');
      return { valid: false, reason: 'Game not finished' };
    }
    
    return { valid: true, result };
  }
  
  // TODO: Real server-side result validation
  // const { data } = await supabase.rpc('validate_game_result', {
  //   game_state: state
  // });
  // return data;
  
  return { valid: true };
};
