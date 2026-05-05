import { SpellType, GameMode, Rarity, Spell } from '../types';
import { SPELLS, STANDARD_SETS, WILD_SETS } from '../data/spells';
import { PACK_CONFIG } from '../config/gameConfig';
import { getGameRNG } from './seededRandom';

/**
 * 通用洗牌函数
 * [P0 Fix #2] 默认使用 SeededRNG 保证确定性
 * 传入 useNativeRandom=true 可使用 Math.random（仅用于非对战场景如开包）
 */
export const shuffleArray = <T>(array: T[], useNativeRandom: boolean = false): T[] => {
  if (useNativeRandom) {
    // 非对战场景：使用 Math.random
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  // [P0 Fix #2] 对战场景：使用 SeededRNG
  return getGameRNG().shuffle(array);
};

/**
 * 创建初始牌组：每种元素各4张，共20张
 */
export const createDeck = (baseCards?: SpellType[]): SpellType[] => {
  let deck: SpellType[] = [];
  const elements: SpellType[] = baseCards || ['fire', 'vine', 'ice', 'thunder', 'rock'];
  
    if (baseCards) {
    // [P0 Fix #2] 使用确定性 RNG 填充牌组
    const rng = getGameRNG();
    for (let i = 0; i < 20; i++) {
        deck.push(rng.pick(elements));
    }
  } else {
    // 默认平均分配
    for (const element of elements) {
        for (let i = 0; i < 4; i++) { 
          deck.push(element);
        }
    }
  }
  
  return shuffleArray(deck);
};

/**
 * 根据游戏模式过滤卡牌
 */
export function getCardsForMode(gameMode: GameMode): Spell[] {
  const allowedSets = gameMode === 'standard' ? STANDARD_SETS : WILD_SETS;
  return SPELLS.filter(spell => allowedSets.includes(spell.cardSet || 'core'));
}

/**
 * 检查卡牌是否在指定模式中可用
 */
export function isCardAvailableInMode(cardId: SpellType, gameMode: GameMode): boolean {
  const card = SPELLS.find(s => s.id === cardId);
  if (!card) return false;
  
  const allowedSets = gameMode === 'standard' ? STANDARD_SETS : WILD_SETS;
  return allowedSets.includes(card.cardSet || 'core');
}

/**
 * 开包逻辑
 */
/**
 * 卡组验证规则
 * [Phase B-3] 新增：每张卡最多2份，legendary最多1份
 */
export function validateDeck(deck: SpellType[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const counts: Record<string, number> = {};

  for (const cardId of deck) {
    counts[cardId] = (counts[cardId] || 0) + 1;
  }

  for (const [cardId, count] of Object.entries(counts)) {
    const card = SPELLS.find(s => s.id === cardId);
    if (!card) {
      errors.push(`未知卡牌: ${cardId}`);
      continue;
    }

    if (count > 2) {
      errors.push(`${card.name}(${cardId}) 重复 ${count} 次，最多2份`);
    }

    if (card.rarity === 'legendary' && count > 1) {
      errors.push(`${card.name}(${cardId}) 是传说卡，最多1份`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export const openPack = (currentPity: { rare: number, mythic: number, legendary: number }, packType: 'standard' | 'premium' | 'legendary' = 'standard'): { cards: Spell[], newPity: typeof currentPity } => {
  const cards: Spell[] = [];
  let newPity = { ...currentPity };
  const rarityOrder: Rarity[] = ['common', 'rare', 'mythic', 'legendary'];

  for (let i = 0; i < PACK_CONFIG.cardsPerPack; i++) {
    let rarity: Rarity = 'common';
    const rand = Math.random();

    // 保底检查
    if (newPity.legendary >= PACK_CONFIG.pitySystem.legendary.threshold - 1) {
      rarity = 'legendary';
      newPity.legendary = 0;
    } else if (newPity.mythic >= PACK_CONFIG.pitySystem.mythic.threshold - 1) {
      rarity = 'mythic';
      newPity.mythic = 0;
    } else if (newPity.rare >= PACK_CONFIG.pitySystem.rare.threshold - 1) {
      rarity = 'rare';
      newPity.rare = 0;
    } else {
      // 正常概率
      if (rand < PACK_CONFIG.dropRates.legendary) {
        rarity = 'legendary';
      } else if (rand < PACK_CONFIG.dropRates.legendary + PACK_CONFIG.dropRates.mythic) {
        rarity = 'mythic';
      } else if (rand < PACK_CONFIG.dropRates.legendary + PACK_CONFIG.dropRates.mythic + PACK_CONFIG.dropRates.rare) {
        rarity = 'rare';
      } else {
        rarity = 'common';
      }
    }

    // 选择该稀有度的随机卡牌 (排除英雄技能和空卡)
    const availableCards = SPELLS.filter(s =>
      s.rarity === rarity &&
      !s.id.startsWith('hero_') &&
      s.id !== 'skip'
    );

    // 降级保护：如果该稀有度没有卡（可能是扩展示例），向下寻找
    let finalCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    if (!finalCard) {
       const fallbackCards = SPELLS.filter(s => s.rarity === 'common' && s.id !== 'skip');
       finalCard = fallbackCards[Math.floor(Math.random() * fallbackCards.length)];
    }

    cards.push(finalCard);

    // 更新保底计数器
    if (rarity === 'common') {
      newPity.rare++;
      newPity.mythic++;
      newPity.legendary++;
    } else if (rarity === 'rare') {
      newPity.rare = 0;
      newPity.mythic++;
      newPity.legendary++;
    } else if (rarity === 'mythic') {
      newPity.rare = 0;
      newPity.mythic = 0;
      newPity.legendary++;
    } else if (rarity === 'legendary') {
      newPity.rare = 0;
      newPity.mythic = 0;
      newPity.legendary = 0;
    }
  }

  // 阶梯保底：高级卡包每包至少保证对应稀有度
  const guarantee = PACK_CONFIG.packGuarantees[packType];
  if (guarantee) {
    const guaranteeIdx = rarityOrder.indexOf(guarantee);
    const hasGuaranteed = cards.some(c => rarityOrder.indexOf(c.rarity as Rarity) >= guaranteeIdx);
    if (!hasGuaranteed) {
      // 随机选一张卡替换为目标稀有度
      const replaceIdx = Math.floor(Math.random() * cards.length);
      const pool = SPELLS.filter(s =>
        s.rarity === guarantee &&
        !s.id.startsWith('hero_') &&
        s.id !== 'skip'
      );
      if (pool.length > 0) {
        cards[replaceIdx] = pool[Math.floor(Math.random() * pool.length)];
      }
    }
  }

  return { cards, newPity };
};
