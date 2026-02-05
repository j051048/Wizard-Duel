import { SpellType, GameMode, Rarity, Spell } from '../types';
import { SPELLS, STANDARD_SETS, WILD_SETS } from '../data/spells';
import { PACK_CONFIG } from '../config/gameConfig';

export const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * 创建初始牌组：每种元素各4张，共20张
 */
export const createDeck = (baseCards?: SpellType[]): SpellType[] => {
  let deck: SpellType[] = [];
  const elements: SpellType[] = baseCards || ['fire', 'vine', 'ice', 'thunder', 'rock'];
  
  if (baseCards) {
    // 如果提供了基础卡池，随机选择填充到20张
    for (let i = 0; i < 20; i++) {
        deck.push(elements[Math.floor(Math.random() * elements.length)]);
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
  return SPELLS.filter(spell => allowedSets.includes(spell.cardSet));
}

/**
 * 检查卡牌是否在指定模式中可用
 */
export function isCardAvailableInMode(cardId: SpellType, gameMode: GameMode): boolean {
  const card = SPELLS.find(s => s.id === cardId);
  if (!card) return false;
  
  const allowedSets = gameMode === 'standard' ? STANDARD_SETS : WILD_SETS;
  return allowedSets.includes(card.cardSet);
}

/**
 * 开包逻辑
 */
export const openPack = (currentPity: { rare: number, mythic: number, legendary: number }): { cards: Spell[], newPity: typeof currentPity } => {
  const cards: Spell[] = [];
  let newPity = { ...currentPity };
  
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
  
  return { cards, newPity };
};
