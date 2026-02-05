import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SpellType, Deck, GameMode } from '../types';
import { getCardsForMode } from '../constants';
import { HapticService } from '../services/haptic';

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

  const rawCardPool = getCardsForMode(gameMode).filter(s => s.id !== 'skip');

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
    if (selectedCards.length < 30) {
      setSelectedCards(prev => [...prev, spellId]);
      setLastAddedId(spellId);
      setTimeout(() => setLastAddedId(null), 500);
    }
  }, [selectedCards.length]);

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
