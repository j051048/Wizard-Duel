/**
 * Zustand 选择器工具
 * 
 * [P3 Fix #33] 使用浅比较选择器优化渲染性能
 */

import { shallow } from 'zustand/shallow';
import { useUserStore } from './useUserStore';

// ============ 常用选择器 ============

/**
 * 选择用户基础信息（浅比较）
 * 只有当 address, balance, rank 发生变化时才重新渲染
 */
export const useUserBasicInfo = () => {
  return useUserStore(
    (state) => ({
      address: state.activeAddress,
      balance: state.balance,
      rank: state.userRank,
      rankScore: state.rankScore,
    }),
    shallow
  );
};

/**
 * 选择卡组相关信息（浅比较）
 */
export const useUserDecks = () => {
  return useUserStore(
    (state) => ({
      decks: state.decks,
      selectedDeck: state.selectedDeck,
      setSelectedDeck: state.setSelectedDeck,
    }),
    shallow
  );
};

/**
 * 选择收藏卡牌（浅比较）
 */
export const useUserInventory = () => {
  return useUserStore(
    (state) => ({
      inventory: state.inventory,
      addCards: state.addCardsToInventory,
    }),
    shallow
  );
};

/**
 * 选择卡包库存（浅比较）
 */
export const useUserPacks = () => {
  return useUserStore(
    (state) => ({
      packInventory: state.packInventory,
      addPacks: state.addPacks,
      consumePack: state.consumePack,
    }),
    shallow
  );
};

/**
 * 选择购买记录（浅比较）
 */
export const useUserPurchases = () => {
  return useUserStore(
    (state) => ({
      purchasedBundles: state.purchasedBundles,
      purchaseBundle: state.purchaseBundle,
    }),
    shallow
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
    (state) => ({
      address: state.activeAddress,
      supabaseUserId: state.supabaseUserId,
      login: state.login,
      setActiveAddress: state.setActiveAddress,
    }),
    shallow
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
