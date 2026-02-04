/**
 * DeckBuilder - 牌组构筑组件
 */

import React from 'react';
import { SpellType, Deck, GameMode } from '../types';
import { getSpellById } from '../services/gameLogic';
import CardDetailModal from './CardDetailModal';

// Extracted Components
import ManaCurve from './deck/ManaCurve';
import CardPool from './deck/CardPool';
import DeckList from './deck/DeckList';

// Hook
import { useDeckBuilder } from '../hooks/useDeckBuilder';

interface DeckBuilderProps {
  onBack: () => void;
  onSaveDeck: (deck: Deck) => void;
  existingDecks: Deck[];
  selectedDeck?: Deck | null;
  gameMode?: GameMode;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  onBack,
  onSaveDeck,
  existingDecks,
  selectedDeck,
  gameMode = 'standard' as GameMode
}) => {
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
    removeCard
  } = useDeckBuilder(selectedDeck, gameMode);

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
    <div className="min-h-screen bg-[#0f0518] relative overflow-hidden flex flex-col items-center py-6 px-4">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute inset-0 bg-[url('/ui/bg_arena.webp')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
         <div className="absolute inset-0 bg-gradient-to-b from-[#0f0518] via-transparent to-[#0f0518]"></div>
         <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-900/20 to-transparent"></div>
      </div>

      <div className="w-full max-w-7xl mx-auto z-10 flex flex-col h-[90vh]">
        {/* Header & Stats Section */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
          
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            {/* Left: Deck Info & Input */}
            <div className="flex-1 space-y-4">
               <div>
                  <label className="text-xs font-serif text-amber-500 uppercase tracking-widest mb-1 block">Deck Name</label>
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-white/20 text-3xl font-wizard text-white focus:outline-none focus:border-amber-500 transition-colors placeholder-white/20 pb-1"
                    placeholder="Warlock's Grimoire"
                  />
               </div>
               <div className="flex items-center gap-4 text-sm font-tech text-gray-400">
                  <div className={`flex items-center gap-2 ${isValidDeck ? 'text-green-400' : 'text-amber-500'}`}>
                    <span className="text-lg">
                      {isValidDeck ? '✅' : '⚠️'}
                    </span>
                    <span>
                      {totalCards} / 30 Cards
                    </span>
                  </div>
                  <div className="w-px h-4 bg-white/10"></div>
                  <div>
                    {isValidDeck ? 'Deck Ready' : 'Must have 20-30 cards'}
                  </div>
               </div>
            </div>

            {/* Right: Mana Curve Visualization */}
            <ManaCurve selectedCards={selectedCards} />
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
