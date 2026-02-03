/**
 * DeckBuilder - 牌组构筑组件
 * 
 * 允许玩家从卡牌池中选择卡牌构筑牌组
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react';
import { SpellType, Deck, Spell, GameMode } from '../types';
import { SPELLS, getCardsForMode } from '../constants';
import { getSpellById } from '../services/gameLogic';
import { SpellCard } from './SpellCard';

interface DeckBuilderProps {
  onBack: () => void;
  onSaveDeck: (deck: Deck) => void;
  existingDecks: Deck[];
  selectedDeck?: Deck | null;
  gameMode?: GameMode; // 新增：游戏模式
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  onBack,
  onSaveDeck,
  existingDecks,
  selectedDeck,
  gameMode = 'standard'
}) => {
  const [deckName, setDeckName] = useState(selectedDeck?.name || '新牌组');
  const [selectedCards, setSelectedCards] = useState<SpellType[]>(selectedDeck?.cards || []);
  const [cardPool, setCardPool] = useState<Spell[]>(getCardsForMode(gameMode).filter(s => s.id !== 'skip'));

  // 计算卡牌数量
  const cardCounts = selectedCards.reduce((acc, card) => {
    acc[card] = (acc[card] || 0) + 1;
    return acc;
  }, {} as Record<SpellType, number>);

  const totalCards = selectedCards.length;
  const isValidDeck = totalCards >= 20 && totalCards <= 30;

  const addCard = (spellId: SpellType) => {
    if (totalCards < 30) {
      setSelectedCards([...selectedCards, spellId]);
    }
  };

  const removeCard = (spellId: SpellType) => {
    const index = selectedCards.lastIndexOf(spellId);
    if (index > -1) {
      const newCards = [...selectedCards];
      newCards.splice(index, 1);
      setSelectedCards(newCards);
    }
  };

  const saveDeck = () => {
    if (!isValidDeck) return;
    
    const deck: Deck = {
      id: selectedDeck?.id || Date.now().toString(),
      name: deckName,
      cards: selectedCards,
      createdAt: selectedDeck?.createdAt || Date.now(),
      lastUsed: Date.now()
    };
    
    onSaveDeck(deck);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            返回大厅
          </button>
          
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
              placeholder="牌组名称"
            />
            
            <button
              onClick={saveDeck}
              disabled={!isValidDeck}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isValidDeck 
                  ? 'bg-green-600 hover:bg-green-500' 
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
            >
              <Save size={20} />
              保存牌组
            </button>
          </div>
        </div>

        {/* Deck Stats */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h3 className="text-lg font-bold">牌组信息</h3>
              <p>卡牌数量: {totalCards}/30 (需要20-30张)</p>
              <p className={isValidDeck ? 'text-green-400' : 'text-red-400'}>
                {isValidDeck ? '牌组有效' : '牌组无效'}
              </p>
            </div>
            
            <div className="text-white text-right">
              <p>费用分布:</p>
              {[1,2,3,4,5,6].map(cost => {
                const count = selectedCards.filter(card => getSpellById(card).manaCost === cost).length;
                return <p key={cost}>{cost}费: {count}</p>;
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Pool */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white text-lg font-bold mb-4">卡牌池</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {cardPool.map((spell) => (
                <div key={spell.id} className="relative">
                  <SpellCard
                    spell={spell}
                    onClick={() => addCard(spell.id)}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  />
                  <button
                    onClick={() => addCard(spell.id)}
                    className="absolute top-1 right-1 bg-green-600 hover:bg-green-500 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Current Deck */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white text-lg font-bold mb-4">当前牌组</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {Object.entries(cardCounts).map(([spellId, count]) => {
                const spell = getSpellById(spellId as SpellType);
                return (
                  <div key={spellId} className="relative">
                    <SpellCard
                      spell={spell}
                      className="opacity-75"
                    />
                    <div className="absolute top-1 left-1 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {count}
                    </div>
                    <button
                      onClick={() => removeCard(spellId as SpellType)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};