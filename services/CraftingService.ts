/**
 * Card Crafting System - 卡牌分解/合成基础框架
 * 
 * [P1-24] 提供分解（Disenchant）和合成（Craft）的基础逻辑
 * 
 * 分解获得尘埃（Dust），合成消耗尘埃
 * 
 * 价值表：
 * - Common:    分解 5,   合成 40
 * - Rare:      分解 20,  合成 100
 * - Mythic:    分解 100, 合成 400
 * - Legendary: 分解 400, 合成 1600
 */

import { Rarity, SpellType } from '../types';

export interface CraftingConfig {
  disenchantValue: number;
  craftCost: number;
}

export const CRAFTING_TABLE: Record<Rarity, CraftingConfig> = {
  common:    { disenchantValue: 5,   craftCost: 40 },
  rare:      { disenchantValue: 20,  craftCost: 100 },
  mythic:    { disenchantValue: 100, craftCost: 400 },
  legendary: { disenchantValue: 400, craftCost: 1600 },
};

export interface CraftingState {
  dust: number;
}

export class CraftingService {
  /**
   * 计算分解一张卡牌获得的尘埃
   */
  static getDisenchantValue(rarity: Rarity): number {
    return CRAFTING_TABLE[rarity]?.disenchantValue || 0;
  }

  /**
   * 计算合成一张卡牌所需的尘埃
   */
  static getCraftCost(rarity: Rarity): number {
    return CRAFTING_TABLE[rarity]?.craftCost || Infinity;
  }

  /**
   * 分解卡牌
   * @returns 获得的尘埃数，或 null 表示失败
   */
  static disenchant(
    cardId: SpellType,
    rarity: Rarity,
    inventory: SpellType[]
  ): { success: boolean; dustGained: number; newInventory: SpellType[] } {
    const idx = inventory.indexOf(cardId);
    if (idx === -1) {
      return { success: false, dustGained: 0, newInventory: inventory };
    }

    const dustGained = this.getDisenchantValue(rarity);
    const newInventory = [...inventory];
    newInventory.splice(idx, 1);

    return { success: true, dustGained, newInventory };
  }

  /**
   * 合成卡牌
   * @returns 是否合成成功
   */
  static craft(
    cardId: SpellType,
    rarity: Rarity,
    currentDust: number,
    inventory: SpellType[]
  ): { success: boolean; dustCost: number; newInventory: SpellType[]; error?: string } {
    const cost = this.getCraftCost(rarity);
    
    if (currentDust < cost) {
      return {
        success: false,
        dustCost: 0,
        newInventory: inventory,
        error: `尘埃不足：需要 ${cost}，当前 ${currentDust}`,
      };
    }

    const newInventory = [...inventory, cardId];
    return { success: true, dustCost: cost, newInventory };
  }

  /**
   * 批量分解多张卡牌
   */
  static bulkDisenchant(
    cards: { id: SpellType; rarity: Rarity }[],
    inventory: SpellType[]
  ): { totalDust: number; newInventory: SpellType[] } {
    let totalDust = 0;
    let currentInventory = [...inventory];

    for (const card of cards) {
      const result = this.disenchant(card.id, card.rarity, currentInventory);
      if (result.success) {
        totalDust += result.dustGained;
        currentInventory = result.newInventory;
      }
    }

    return { totalDust, newInventory: currentInventory };
  }
}
