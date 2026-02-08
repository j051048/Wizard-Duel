import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SpellType, Deck, GameMode, Spell } from '../types';
import { getCardsForMode } from '../constants';
import { HapticService } from '../services/haptic';
import { useUserStore } from '../stores/useUserStore';
import { useToastStore } from '../stores/useToastStore';

// [P0 Fix] 统一卡牌复制数量限制
const MAX_COPIES_LEGENDARY = 1;
const MAX_COPIES_OTHER = 2;

export const useDeckBuilder = (selectedDeck: Deck | null | undefined, gameMode: GameMode = 'standard') => {
  const [deckName, setDeckName] = useState(selectedDeck?.name || '新牌组');
  const [selectedCards, setSelectedCards] = useState<SpellType[]>(selectedDeck?.cards || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCostFilter, setActiveCostFilter] = useState<number | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [detailSpell, setDetailSpell] = useState<SpellType | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 当外部选中的卡组发生变化（如切换槽位）时，重置内部编辑器状态
  useEffect(() => {
    setDeckName(selectedDeck?.name || `新卡组`);
    setSelectedCards(selectedDeck?.cards || []);
  }, [selectedDeck?.id]);

  const handleCardPressStart = useCallback((spellId: SpellType) => {
      longPressTimerRef.current = setTimeout(() => {
          setDetailSpell(spellId);
          HapticService.medium();
      }, 600);
  }, []);

  const handleCardPressEnd = useCallback(() => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  }, []);

  const handleRightClick = useCallback((e: React.MouseEvent, spellId: SpellType) => {
      e.preventDefault();
      setDetailSpell(spellId);
  }, []);

  const { inventory } = useUserStore();
  const toast = useToastStore();

  // 计算拥有的卡牌数量
  const ownedCounts = inventory.reduce((acc, spellId) => {
    acc[spellId] = (acc[spellId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 获取单张卡牌在牌组中的上限
  // [P0 Fix] 传说卡最多1张，其他最多2张，兼顾核心卡和收藏卡
  const getCardLimit = (spell: Spell): number => {
    // 传说卡最多1张
    if (spell.rarity === 'legendary') return MAX_COPIES_LEGENDARY;
    // 其他稀有度最多2张
    const baseLimit = MAX_COPIES_OTHER;
    // 核心卡牌默认解锁，上限为 baseLimit
    if (spell.cardSet === 'core') return baseLimit;
    // 非核心卡牌受拥有数量限制
    return Math.min(baseLimit, ownedCounts[spell.id] || 0);
  };

  const rawCardPool = getCardsForMode(gameMode).filter(s => {
    if (s.id === 'skip') return false;
    // 核心卡牌默认解锁，或者拥有至少 1 张
    return s.cardSet === 'core' || ownedCounts[s.id] > 0;
  });

  const filteredCardPool = rawCardPool.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          card.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCost = activeCostFilter === null || 
                        (activeCostFilter === 7 ? card.manaCost >= 7 : card.manaCost === activeCostFilter);
    return matchesSearch && matchesCost;
  });

  const cardCounts = selectedCards.reduce((acc, card) => {
    acc[card] = (acc[card] || 0) + 1;
    return acc;
  }, {} as Record<SpellType, number>);

  const totalCards = selectedCards.length;
  const isValidDeck = totalCards >= 20 && totalCards <= 30;

  const addCard = useCallback((spellId: SpellType, e?: React.MouseEvent) => {
    const spell = rawCardPool.find(s => s.id === spellId);
    if (!spell) return;

    const currentCount = selectedCards.filter(id => id === spellId).length;
    const limit = getCardLimit(spell);

    if (selectedCards.length >= 30) {
      toast.error('数量限制', '您的牌组已满（上限 30 张）');
      return;
    }

    if (currentCount >= limit) {
      if (spell.cardSet === 'core') {
        toast.warning('数量限制', `核心卡牌每种最多加入 ${limit} 张`);
      } else {
        toast.warning('收藏不足', `您的收藏中只有 ${limit} 张该卡牌，已全部加入牌组`);
      }
      return;
    }

    setSelectedCards(prev => [...prev, spellId]);
    setLastAddedId(spellId);
    setTimeout(() => setLastAddedId(null), 500);
  }, [selectedCards, rawCardPool, ownedCounts, toast]);

  const removeCard = useCallback((spellId: SpellType) => {
    const index = selectedCards.lastIndexOf(spellId);
    if (index > -1) {
      const newCards = [...selectedCards];
      newCards.splice(index, 1);
      setSelectedCards(newCards);
    }
  }, [selectedCards]);

  const loadPreset = useCallback((preset: { name: string, cards: SpellType[] }) => {
    setDeckName(preset.name);
    setSelectedCards(preset.cards);
    HapticService.light();
  }, []);

  return {
    deckName,
    setDeckName,
    selectedCards,
    searchTerm,
    setSearchTerm,
    activeCostFilter,
    setActiveCostFilter,
    lastAddedId,
    detailSpell,
    setDetailSpell,
    handleCardPressStart,
    handleCardPressEnd,
    handleRightClick,
    filteredCardPool,
    cardCounts,
    totalCards,
    isValidDeck,
    addCard,
    removeCard,
    loadPreset
  };
};
