/**
 * pvpStateSync - PvP 状态同步工具
 * 
 * P1 权威模型：
 * - P1 是游戏状态的权威源
 * - P1 计算所有结算，然后通过 swapPerspective 发送给 P2
 * - P2 接收后通过 applyPvpSync 合并状态（保留自己的手牌/牌组）
 */

import { DuelState } from '../types';

/**
 * 交换视角：将状态中所有 player/opponent 字段互换
 * 用于 P1 向 P2 广播状态时，将 P1 视角转为 P2 视角
 */
export function swapPerspective(state: DuelState): DuelState {
  return {
    ...state,
    // HP & Armor
    playerHP: state.opponentHP,
    opponentHP: state.playerHP,
    playerArmor: state.opponentArmor,
    opponentArmor: state.playerArmor,
    // Mana
    playerMana: state.opponentMana,
    opponentMana: state.playerMana,
    playerMaxMana: state.opponentMaxMana,
    opponentMaxMana: state.playerMaxMana,
    // Hand & Deck
    playerHand: state.opponentHand,
    opponentHand: state.playerHand,
    opponentHandSize: state.playerHand.length,
    playerDeck: state.opponentDeck,
    opponentDeck: state.playerDeck,
    // Effects
    playerEffects: [...state.opponentEffects],
    opponentEffects: [...state.playerEffects],
    // Minions
    playerMinions: [...state.opponentMinions],
    opponentMinions: [...state.playerMinions],
    // Last spell & cost mod
    playerLastSpell: state.opponentLastSpell,
    opponentLastSpell: state.playerLastSpell,
    playerCostMod: state.opponentCostMod,
    opponentCostMod: state.playerCostMod,
    // Consecutive thunder
    playerConsecutiveThunder: state.opponentConsecutiveThunder,
    opponentConsecutiveThunder: state.playerConsecutiveThunder,
    // Fatigue
    playerFatigue: state.opponentFatigue,
    opponentFatigue: state.playerFatigue,
    // Hero skills
    heroSkillsUsed: state.opponentHeroSkillUsed,
    opponentHeroSkillUsed: state.heroSkillsUsed,
    // Triggers
    playerTriggers: [...state.opponentTriggers],
    opponentTriggers: [...state.playerTriggers],
    // Shared fields (不需要交换)
    roundNumber: state.roundNumber,
    triggerOrderCounter: state.triggerOrderCounter,
    rngState: state.rngState,
    isTutorial: state.isTutorial,
  };
}

/**
 * 合并 PvP 权威状态
 * P2 收到 P1 广播的（已交换视角的）状态后，
 * 保留自己的手牌和牌组（因为 P1 不知道 P2 的准确手牌），
 * 其余字段使用权威值。
 */
export function applyPvpSync(localState: DuelState, syncedState: DuelState): DuelState {
  return {
    ...syncedState,
    // P2 保留自己的手牌/牌组（P1 不了解 P2 换牌后的精确手牌）
    playerHand: localState.playerHand,
    playerDeck: localState.playerDeck,
    playerFatigue: localState.playerFatigue,
  };
}

/**
 * 序列化 DuelState 用于网络传输
 * 移除不可序列化的字段（如 trigger 中的函数）
 */
export function serializeState(state: DuelState): object {
  return {
    ...state,
    // triggers 含函数不可序列化，只传 ID 和 timing
    playerTriggers: state.playerTriggers.map(t => ({
      id: t.id,
      timing: t.timing,
      createdAt: t.createdAt,
      owner: t.owner,
      isOnce: t.isOnce,
    })),
    opponentTriggers: state.opponentTriggers.map(t => ({
      id: t.id,
      timing: t.timing,
      createdAt: t.createdAt,
      owner: t.owner,
      isOnce: t.isOnce,
    })),
  };
}

/**
 * 反序列化接收到的状态
 * triggers 中的函数丢失了，设为空数组（P1 权威模型下 P2 不需要执行 trigger 逻辑）
 */
export function deserializeState(data: any): DuelState {
  return {
    ...data,
    playerTriggers: [],
    opponentTriggers: [],
    playerEffects: data.playerEffects || [],
    opponentEffects: data.opponentEffects || [],
    playerMinions: data.playerMinions || [],
    opponentMinions: data.opponentMinions || [],
  };
}
