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

// Hooks
import { useDeckBuilder } from '../hooks/useDeckBuilder';
import { useIsMobile } from '../hooks/useIsMobile';

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
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = React.useState<'POOL' | 'DECK'>('POOL');

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
    <div className="min-h-screen bg-[#0f0518] relative overflow-hidden flex flex-col items-center pt-1 md:py-6 px-1 md:px-4">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute inset-0 bg-[url('/ui/bg_arena.webp')] opacity-20 bg-cover bg-center mix-blend-overlay shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>
         <div className="absolute inset-0 bg-gradient-to-b from-[#0f0518] via-transparent to-[#0f0518]"></div>
      </div>

      <div className={`w-full max-w-7xl mx-auto z-10 flex flex-col ${isMobile ? 'h-[100vh]' : 'h-[90vh]'}`}>
        
        {/* Slot Selection Tabs */}
        <div className={`flex gap-1 md:gap-2 ${isMobile ? 'mb-2' : 'mb-4'} safe-area-top`}>
          {[0, 1, 2].map((i) => {
            const d = existingDecks[i];
            return (
              <button
                key={i}
                onClick={() => onSelectDeck(d || null)}
                className={`flex-1 h-9 md:h-12 rounded-t-lg md:rounded-t-xl border-t border-x transition-all flex items-center justify-center gap-1 md:gap-2 font-bold text-[10px] md:text-sm
                  ${activeSlot === i 
                    ? 'bg-slate-900 border-white/20 text-amber-400 shadow-[0_-5px_15px_rgba(0,0,0,0.4)] z-10' 
                    : 'bg-black/60 border-white/5 text-gray-500 hover:text-gray-300'}
                `}
              >
                <span className={isMobile ? 'text-[10px]' : ''}>🎴</span>
                <span className="truncate">{d ? d.name : (isMobile ? `槽${i + 1}` : `新卡组 ${i + 1}`)}</span>
              </button>
            );
          })}
        </div>

        {/* Header & Stats Section */}
        <div className={`bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 ${isMobile ? 'p-3 mb-2' : 'p-6 mb-6'} shadow-2xl relative overflow-hidden group`}>
          <div className="flex flex-col xl:flex-row gap-4 xl:gap-8 items-start justify-between">
            <div className="flex-1 w-full space-y-3">
               <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-8">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={deckName}
                      onChange={(e) => setDeckName(e.target.value)}
                      className={`w-full bg-transparent border-b border-white/10 text-white focus:outline-none focus:border-amber-500 transition-colors placeholder-white/20 pb-1
                        ${isMobile ? 'text-lg' : 'text-3xl font-wizard'}
                      `}
                      placeholder="输入卡组名称..."
                    />
                  </div>
                  
                  {!isMobile && (
                    <div className="flex-shrink-0 space-y-2">
                      <div className="flex gap-2">
                        {PRESET_DECKS.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => loadPreset(preset)}
                            className="px-3 py-1.5 rounded-lg bg-purple-900/40 border border-purple-500/30 text-[11px] text-purple-200 hover:bg-purple-600 hover:text-white transition-all flex items-center gap-1.5"
                          >
                            <span>{preset.style === 'aggro' ? '🔥' : preset.style === 'control' ? '❄️' : '⚡'}</span>
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
               </div>

               <div className="flex items-center gap-3 text-[10px] md:text-sm font-tech text-gray-400">
                  <div className={`flex items-center gap-1.5 ${isValidDeck ? 'text-green-400' : 'text-amber-500'}`}>
                    <span className="text-base">{isValidDeck ? '✅' : '⚠️'}</span>
                    <span>{totalCards} / 30 张卡牌</span>
                  </div>
                  {isMobile && <div className="ml-auto flex bg-black/60 rounded-full p-0.5 border border-white/10 scale-90 origin-right">
                    <button 
                      onClick={() => setMobileTab('POOL')}
                      className={`px-4 py-1.5 rounded-full transition-all text-xs ${mobileTab === 'POOL' ? 'bg-amber-500 text-black font-bold shadow-lg' : 'text-gray-400'}`}
                    >浏览卡池</button>
                    <button 
                      onClick={() => setMobileTab('DECK')}
                      className={`px-4 py-1.5 rounded-full transition-all text-xs ${mobileTab === 'DECK' ? 'bg-amber-500 text-black font-bold shadow-lg' : 'text-gray-400'}`}
                    >我的卡组</button>
                  </div>}
               </div>
            </div>

            {!isMobile && (
              <div className="w-full xl:w-auto flex justify-center xl:justify-end">
                <ManaCurve selectedCards={selectedCards} />
              </div>
            )}
          </div>
        </div>

        <div className={`flex-1 min-h-0 ${isMobile ? 'flex flex-col' : 'grid grid-cols-12 gap-8'}`}>
          {(!isMobile || mobileTab === 'POOL') && (
            <div className={isMobile ? 'flex-1 overflow-hidden' : 'lg:col-span-8 h-full min-h-0'}>
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
            </div>
          )}

          {(!isMobile || mobileTab === 'DECK') && (
            <div className={isMobile ? 'flex-1 overflow-hidden' : 'lg:col-span-4 h-full min-h-0'}>
              <DeckList 
                cardCounts={cardCounts}
                onRemoveCard={removeCard}
                onBack={onBack}
                onSave={saveDeck}
                isValidDeck={isValidDeck}
                lastAddedId={lastAddedId}
                isMobile={isMobile}
              />
            </div>
          )}
        </div>
      </div>

      {/* Card Detail Modal (Z-index ensure it's on top) */}
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
