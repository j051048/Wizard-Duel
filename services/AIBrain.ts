/**
 * AIBrain - AI 决策逻辑隔离层
 * 
 * [P0 Fix #2] 解决 AI 手牌暴露问题
 * 
 * 设计原则：
 * - AI 手牌数据完全封装在此类内部
 * - 外部只能获取手牌数量（opponentHandSize）
 * - 决策逻辑在内部完成，返回决策结果
 * - 前端无法通过 DevTools 查看 AI 真实手牌
 */

import { DuelState, SpellType, StatusEffect, AIProfile } from '../types';
import { getSpellById, calculateSpellCost } from './combat';
import { shuffleArray, getCardsForMode, GAME_CONFIG } from '../constants';
import { drawCard } from './gameLogic';

// 公开给前端的状态（不包含敏感信息）
export interface PublicDuelState {
  playerHP: number;
  playerArmor: number;
  opponentHP: number;
  opponentArmor: number;
  playerMana: number;
  opponentMana: number;
  opponentMaxMana: number;
  playerLastSpell: SpellType | null;
  opponentLastSpell: SpellType | null;
  playerEffects: StatusEffect[];
  opponentEffects: StatusEffect[];
  roundNumber: number;
  opponentHandSize: number; // 只暴露数量，不暴露具体卡牌
  opponentHeroSkillUsed: boolean;
}

// AI 决策结果
export interface AIDecision {
  spellId: SpellType;
  reasoning?: string; // 可选的决策原因（调试用）
}

/**
 * AI 大脑类 - 封装 AI 决策逻辑和手牌状态
 */
export class AIBrain {
  private hand: SpellType[] = [];
  private deck: SpellType[] = [];
  private fatigue: number = 0;
  private profile: AIProfile;
  private heroSkillUsed: boolean = false;
  
  constructor(profile: AIProfile, gameMode: string = 'standard') {
    this.profile = profile;
    this.initializeDeck(gameMode);
    this.drawInitialHand();
  }
  
  // ============ 公开接口 ============
  
  /** 获取手牌数量（唯一暴露给前端的信息） */
  getHandSize(): number {
    return this.hand.length;
  }
  
  /** 获取疲劳值 */
  getFatigue(): number {
    return this.fatigue;
  }
  
  /** 重置英雄技能使用状态（每回合开始调用） */
  resetHeroSkill(): void {
    this.heroSkillUsed = false;
  }
  
  /** 回合开始抽牌 */
  drawCardForTurn(): { drawnCard: SpellType | null; fatigueDamage: number } {
    const result = drawCard(this.deck, this.hand, this.fatigue);
    this.deck = result.newDeck;
    this.hand = result.newHand;
    this.fatigue = result.newFatigue;
    return {
      drawnCard: result.drawnCard,
      fatigueDamage: result.fatigueDamage
    };
  }
  
  /**
   * AI 做出决策
   * @param publicState - 公开的游戏状态（不包含AI手牌）
   * @returns 决策结果
   */
  decide(publicState: PublicDuelState): AIDecision {
    const { opponentMana, opponentEffects } = publicState;
    
    // 冻结检查
    const isFrozen = opponentEffects.some(e => e.type === 'frozen');
    if (isFrozen) {
      return { spellId: 'skip', reasoning: '被冻结，跳过回合' };
    }
    
    // 获取可用卡牌
    const playableCards = this.getPlayableCards(opponentMana, opponentEffects);
    
    if (playableCards.length === 0) {
      return { spellId: 'skip', reasoning: '没有可用卡牌' };
    }
    
    // 根据难度选择策略
    const decision = this.selectCard(playableCards, publicState);
    
    return decision;
  }
  
  /**
   * 执行出牌（从手牌移除卡牌）
   * @param spellId - 要打出的卡牌
   * @returns 是否成功
   */
  playCard(spellId: SpellType): boolean {
    if (spellId === 'skip') return true;
    
    if (spellId.startsWith('hero_')) {
      if (this.heroSkillUsed) return false;
      this.heroSkillUsed = true;
      return true;
    }
    
    const index = this.hand.indexOf(spellId);
    if (index === -1) return false;
    
    this.hand.splice(index, 1);
    return true;
  }
  
  // ============ 私有方法 ============
  
  private initializeDeck(gameMode: string): void {
    const availableSpells = getCardsForMode(gameMode as any);
    const baseCards = availableSpells.filter(s => 
      s.id !== 'skip' && !s.id.startsWith('hero_')
    );
    
    const deck: SpellType[] = [];
    const deckSize = 20;
    
    // 根据难度构建牌组
    const cardPool = this.filterCardsByDifficulty(baseCards);
    
    // 填充牌组
    while (deck.length < deckSize) {
      const card = cardPool[Math.floor(Math.random() * cardPool.length)];
      const count = deck.filter(id => id === card.id).length;
      const maxCopies = card.rarity === 'legendary' ? 1 : 2;
      if (count < maxCopies) {
        deck.push(card.id);
      }
    }
    
    this.deck = shuffleArray(deck);
  }
  
  private filterCardsByDifficulty(cards: any[]): any[] {
    switch (this.profile.difficulty) {
      case 'easy':
        return cards.filter(c => c.manaCost <= 4 && c.rarity !== 'legendary');
      case 'medium':
        return cards.filter(c => c.rarity !== 'legendary' || Math.random() < 0.3);
      case 'hard':
        return cards;
      default:
        return cards;
    }
  }
  
  private drawInitialHand(): void {
    this.hand = this.deck.slice(0, 5);
    this.deck = this.deck.slice(5);
  }
  
  private getPlayableCards(mana: number, effects: StatusEffect[]): SpellType[] {
    return this.hand.filter(cardId => {
      const spell = getSpellById(cardId);
      const cost = calculateSpellCost(cardId, 0);
      return cost <= mana;
    });
  }
  
  private selectCard(playableCards: SpellType[], state: PublicDuelState): AIDecision {
    switch (this.profile.difficulty) {
      case 'easy':
        return this.selectCardEasy(playableCards);
      case 'medium':
        return this.selectCardMedium(playableCards, state);
      case 'hard':
        return this.selectCardHard(playableCards, state);
      default:
        return this.selectCardEasy(playableCards);
    }
  }
  
  private selectCardEasy(playableCards: SpellType[]): AIDecision {
    // 简单AI：随机选择
    const card = playableCards[Math.floor(Math.random() * playableCards.length)];
    return { spellId: card, reasoning: '随机选择' };
  }
  
  private selectCardMedium(playableCards: SpellType[], state: PublicDuelState): AIDecision {
    // 中等AI：优先高伤害
    const sorted = playableCards
      .map(id => ({ id, spell: getSpellById(id) }))
      .sort((a, b) => b.spell.damage - a.spell.damage);
    
    // 70% 概率选最优，30% 随机
    if (Math.random() < 0.7 && sorted.length > 0) {
      return { spellId: sorted[0].id, reasoning: '选择高伤害卡牌' };
    }
    
    return this.selectCardEasy(playableCards);
  }
  
  private selectCardHard(playableCards: SpellType[], state: PublicDuelState): AIDecision {
    // 困难AI：考虑多种因素
    const scored = playableCards.map(id => {
      const spell = getSpellById(id);
      let score = spell.damage * 2;
      
      // 低血量时优先治疗
      if (state.opponentHP < 15 && spell.mechanic === 'heal') {
        score += 20;
      }
      
      // 考虑元素克制（如果知道玩家上回合出的牌）
      if (state.playerLastSpell) {
        // TODO: 元素克制评估
      }
      
      return { id, score };
    }).sort((a, b) => b.score - a.score);
    
    if (scored.length > 0) {
      return { spellId: scored[0].id, reasoning: '综合评估最优' };
    }
    
    return { spellId: 'skip', reasoning: '无可用卡牌' };
  }
}

/**
 * 从 DuelState 提取公开状态（隐藏 AI 手牌）
 */
export const extractPublicState = (state: DuelState): PublicDuelState => {
  return {
    playerHP: state.playerHP,
    playerArmor: state.playerArmor,
    opponentHP: state.opponentHP,
    opponentArmor: state.opponentArmor,
    playerMana: state.playerMana,
    opponentMana: state.opponentMana,
    opponentMaxMana: state.opponentMaxMana,
    playerLastSpell: state.playerLastSpell,
    opponentLastSpell: state.opponentLastSpell,
    playerEffects: state.playerEffects,
    opponentEffects: state.opponentEffects,
    roundNumber: state.roundNumber,
    opponentHandSize: state.opponentHandSize,
    opponentHeroSkillUsed: state.opponentHeroSkillUsed,
  };
};
