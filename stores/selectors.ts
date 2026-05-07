/**
 * Zustand 选择器工具
 * 
 * [P3 Fix #33] 使用浅比较选择器优化渲染性能
 * 
 * 使用 useShallow hook 包装选择器以实现浅比较
 */

import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from './useUserStore';
import type { SpellType } from '../types/card';
import type { StatusEffect } from '../types/duel';

/** 模块级空引用常量 — 避免每次 selector 调用时创建新数组/对象 */
const EMPTY_SPELLS: SpellType[] = [];
const EMPTY_EFFECTS: StatusEffect[] = [];

// ============ 常用选择器 ============

/**
 * 选择用户基础信息（浅比较）
 * 只有当 address, balance, rank 发生变化时才重新渲染
 */
export const useUserBasicInfo = () => {
  return useUserStore(
    useShallow((state) => ({
      address: state.activeAddress,
      balance: state.balance,
      rank: state.userRank,
      rankScore: state.rankScore,
    }))
  );
};

/**
 * 选择卡组相关信息（浅比较）
 */
export const useUserDecks = () => {
  return useUserStore(
    useShallow((state) => ({
      decks: state.decks,
      selectedDeck: state.selectedDeck,
      setSelectedDeck: state.setSelectedDeck,
    }))
  );
};

/**
 * 选择收藏卡牌（浅比较）
 */
export const useUserInventory = () => {
  return useUserStore(
    useShallow((state) => ({
      inventory: state.inventory,
      addCards: state.addCardsToInventory,
    }))
  );
};

/**
 * 选择卡包库存（浅比较）
 */
export const useUserPacks = () => {
  return useUserStore(
    useShallow((state) => ({
      packInventory: state.packInventory,
      addPacks: state.addPacks,
      consumePack: state.consumePack,
    }))
  );
};

/**
 * 选择购买记录（浅比较）
 */
export const useUserPurchases = () => {
  return useUserStore(
    useShallow((state) => ({
      purchasedBundles: state.purchasedBundles,
      purchaseBundle: state.purchaseBundle,
    }))
  );
};

/**
 * 选择加载状态
 */
export const useUserLoading = () => {
  return useUserStore((state) => state.isLoading);
};

/**
 * 选择登录相关
 */
export const useUserAuth = () => {
  return useUserStore(
    useShallow((state) => ({
      address: state.activeAddress,
      supabaseUserId: state.supabaseUserId,
      login: state.login,
      setActiveAddress: state.setActiveAddress,
    }))
  );
};

// ============ 派生选择器 ============

/**
 * 是否已登录
 */
export const useIsLoggedIn = () => {
  return useUserStore((state) => !!state.activeAddress);
};

/**
 * 是否有可用卡组
 */
export const useHasDecks = () => {
  return useUserStore((state) => state.decks.length > 0);
};

/**
 * 获取特定卡包数量
 */
export const usePackCount = (packId: string) => {
  return useUserStore((state) => state.packInventory[packId] || 0);
};

/**
 * 是否拥有特定卡牌
 */
export const useHasCard = (cardId: string) => {
  return useUserStore((state) => state.inventory.includes(cardId as never));
};

// ============ Battle Store Selectors ============

import { useBattleStore } from './useBattleStore';

/**
 * 对手状态（浅比较）
 * 只有当对手 HP / 护甲 / 法力 / 手牌数 / 状态效果 / AI 头像变化时才重新渲染
 */
export const useOpponentStatus = () => {
  return useBattleStore(
    useShallow((s) => ({
      opponentHP:        s.duelState?.opponentHP ?? 0,
      opponentArmor:     s.duelState?.opponentArmor ?? 0,
      opponentMana:      s.duelState?.opponentMana ?? 0,
      opponentMaxMana:   s.duelState?.opponentMaxMana ?? 0,
      opponentHandSize:  s.duelState?.opponentHandSize ?? 0,
      opponentEffects:   s.duelState?.opponentEffects ?? EMPTY_EFFECTS,
      aiProfile:         s.duelState?.aiProfile,
    }))
  );
};

/**
 * 玩家状态（浅比较）
 */
export const usePlayerStatus = () => {
  return useBattleStore(
    useShallow((s) => ({
      playerHP:          s.duelState?.playerHP ?? 0,
      playerArmor:       s.duelState?.playerArmor ?? 0,
      playerMana:        s.duelState?.playerMana ?? 0,
      playerMaxMana:     s.duelState?.playerMaxMana ?? 0,
      playerEffects:     s.duelState?.playerEffects ?? EMPTY_EFFECTS,
      heroSkillsUsed:    s.duelState?.heroSkillsUsed ?? false,
      selectedHeroSkill: s.duelState?.selectedHeroSkill,
    }))
  );
};

/**
 * 玩家手牌（浅比较 — 手牌内容相同时不触发重渲染）
 */
export const usePlayerHand = () => {
  return useBattleStore(
    useShallow((s) => s.duelState?.playerHand ?? EMPTY_SPELLS)
  );
};

/**
 * 战斗阶段 + 是否在处理中（浅比较）
 */
export const useBattlePhase = () => {
  return useBattleStore(
    useShallow((s) => ({
      phase:        s.phase,
      isProcessing: s.isProcessing,
    }))
  );
};

/**
 * 战斗消息（引用比较）
 */
export const useEffectMessages = () => {
  return useBattleStore((s) => s.effectMessages);
};

/**
 * 游戏结束状态（浅比较）
 */
export const useGameOver = () => {
  return useBattleStore(
    useShallow((s) => ({
      isGameOver: s.isGameOver,
      gameResult: s.gameResult,
    }))
  );
};
