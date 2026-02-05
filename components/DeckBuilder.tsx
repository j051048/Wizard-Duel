/**
 * DeckBuilder - 牌组构筑组件
 */

import React from 'react';
import { SpellType, Deck, GameMode } from '../types';
import { getSpellById } from '../services/gameLogic';
import CardDetailModal from './CardDetailModal';
import { PRESET_DECKS } from '../constants';

// Extracted Components
import ManaCurve from './deck/ManaCurve';
import CardPool from './deck/CardPool';
import DeckList from './deck/DeckList';

// Hook
import { useDeckBuilder } from '../hooks/useDeckBuilder';

interface DeckBuilderProps {
  onBack: () => void;
  onSaveDeck: (deck: Deck) => void;
  onSelectDeck: (deck: Deck | null) => void;
  existingDecks: Deck[];
  selectedDeck?: Deck | null;
  gameMode?: GameMode;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  onBack,
  onSaveDeck,
  onSelectDeck,
  existingDecks,
  selectedDeck: initialSelectedDeck,
  gameMode = 'standard' as GameMode
}) => {
  // 查找当前正在编辑哪个槽位
  const currentSlotIndex = existingDecks.findIndex(d => d.id === initialSelectedDeck?.id);
  const activeSlot = currentSlotIndex >= 0 ? currentSlotIndex : 0;

  const {
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
  } = useDeckBuilder(initialSelectedDeck, gameMode);

  const saveDeck = () => {
    if (!isValidDeck) return;
    
    const deck: Deck = {
      id: initialSelectedDeck?.id || `deck_slot_${activeSlot}`,
      name: deckName,
      cards: selectedCards,
      createdAt: initialSelectedDeck?.createdAt || Date.now(),
      lastUsed: Date.now()
    };
    
    onSaveDeck(deck);
  };

  return (
    <div className="min-h-screen bg-[#0f0518] relative overflow-hidden flex flex-col items-center py-6 px-4">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute inset-0 bg-[url('/ui/bg_arena.webp')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
         <div className="absolute inset-0 bg-gradient-to-b from-[#0f0518] via-transparent to-[#0f0518]"></div>
         <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-900/20 to-transparent"></div>
      </div>

      <div className="w-full max-w-7xl mx-auto z-10 flex flex-col h-[90vh]">
        
        {/* Slot Selection Tabs */}
        <div className="flex gap-2 mb-4">
          {[0, 1, 2].map((i) => {
            const d = existingDecks[i];
            const isActive = initialSelectedDeck?.id === d?.id || (i === 0 && !initialSelectedDeck && existingDecks.length === 0);
            return (
              <button
                key={i}
                onClick={() => {
                  if (d) {
                    onSelectDeck(d);
                  } else {
                    // 如果对应槽位为空，则清除选中，进入新建模式
                    onSelectDeck(null);
                  }
                }}
                className={`flex-1 max-w-[200px] h-12 rounded-t-xl border-t border-x transition-all flex items-center justify-center gap-2 font-bold text-sm
                  ${i === activeSlot 
                    ? 'bg-slate-900 border-white/20 text-amber-400 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]' 
                    : 'bg-black/40 border-white/5 text-gray-500 hover:text-gray-300'}
                `}
              >
                <span>🎴</span>
                <span className="truncate">{d ? d.name : `新卡组 ${i + 1}`}</span>
              </button>
            );
          })}
        </div>

        {/* Header & Stats Section */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
          
          <div className="flex flex-col xl:flex-row gap-8 items-start justify-between">
            {/* Left: Deck Info & Input */}
            <div className="flex-1 w-full space-y-4">
               <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-8">
                  <div className="flex-1">
                    <label className="text-xs font-serif text-amber-500 uppercase tracking-widest mb-1 block">卡组名称</label>
                    <input
                      type="text"
                      value={deckName}
                      onChange={(e) => setDeckName(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-white/20 text-3xl font-wizard text-white focus:outline-none focus:border-amber-500 transition-colors placeholder-white/20 pb-1"
                      placeholder="输入卡组名称..."
                    />
                  </div>
                  
                  {/* Preset Quick Actions */}
                  <div className="flex-shrink-0 space-y-2">
                    <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">一键导入预设方案</label>
                    <div className="flex gap-2">
                      {PRESET_DECKS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => loadPreset(preset)}
                          className="px-3 py-1.5 rounded-lg bg-purple-900/40 border border-purple-500/30 text-[11px] text-purple-200 hover:bg-purple-600 hover:text-white transition-all flex items-center gap-1.5 group/btn"
                          title={preset.description}
                        >
                          <span className="group-hover/btn:scale-125 transition-transform">
                            {preset.style === 'aggro' ? '🔥' : preset.style === 'control' ? '❄️' : '⚡'}
                          </span>
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="flex items-center gap-4 text-sm font-tech text-gray-400">
                  <div className={`flex items-center gap-2 ${isValidDeck ? 'text-green-400' : 'text-amber-500'}`}>
                    <span className="text-lg">
                      {isValidDeck ? '✅' : '⚠️'}
                    </span>
                    <span>
                      {totalCards} / 30 张卡牌
                    </span>
                  </div>
                  <div className="w-px h-4 bg-white/10"></div>
                  <div>
                    {isValidDeck ? '卡组已完成' : '需要20-30张卡牌'}
                  </div>
               </div>
            </div>

            {/* Right: Mana Curve Visualization */}
            <div className="w-full xl:w-auto flex justify-center xl:justify-end">
              <ManaCurve selectedCards={selectedCards} />
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          <CardPool 
            filteredCardPool={filteredCardPool}
            onAddCard={addCard}
            onRightClick={handleRightClick}
            onPressStart={handleCardPressStart}
            onPressEnd={handleCardPressEnd}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeCostFilter={activeCostFilter}
            onCostFilterChange={setActiveCostFilter}
          />

          <DeckList 
            cardCounts={cardCounts}
            onRemoveCard={removeCard}
            onBack={onBack}
            onSave={saveDeck}
            isValidDeck={isValidDeck}
            lastAddedId={lastAddedId}
          />
        </div>
      </div>

      {/* Card Detail Modal */}
      {detailSpell && (
          <CardDetailModal 
            spell={getSpellById(detailSpell)} 
            onClose={() => setDetailSpell(null)} 
          />
      )}
    </div>
  );
};

export default DeckBuilder;
