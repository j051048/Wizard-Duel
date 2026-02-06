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
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // 使用本地状态跟踪当前激活的 Tab 索引，以支持选中空槽位
  const [activeTabIndex, setActiveTabIndex] = React.useState(() => {
    const idx = existingDecks.findIndex(d => d.id === initialSelectedDeck?.id);
    return idx >= 0 ? idx : 0;
  });

  // 当外部传入的 selectedDeck 变化且对应存在的卡组时，同步 Tab 索引
  React.useEffect(() => {
    if (initialSelectedDeck) {
      const idx = existingDecks.findIndex(d => d.id === initialSelectedDeck.id);
      if (idx >= 0) {
        setActiveTabIndex(idx);
      }
    }
  }, [initialSelectedDeck, existingDecks]);

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
    
    // 使用 activeTabIndex 来生成 ID，确保即使是新槽位也能正确命名
    const deck: Deck = {
      id: initialSelectedDeck?.id || `deck_slot_${activeTabIndex}`,
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
        
        {/* Slot Selection Tabs - Mobile Compact */}
        <div className={`flex gap-1 md:gap-2 ${isMobile ? 'mb-1 px-2' : 'mb-4'} safe-area-top`}>
          {[0, 1, 2].map((i) => {
            const d = existingDecks[i];
            return (
              <button
                key={i}
                onClick={() => {
                  setActiveTabIndex(i);
                  onSelectDeck(d || null);
                }}
                className={`flex-1 h-8 md:h-12 rounded-t-lg md:rounded-t-xl border-t border-x transition-all flex items-center justify-center gap-1 md:gap-2 font-bold text-[10px] md:text-sm
                  ${activeTabIndex === i 
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

        {/* Header Name Input */}
        <div className={`bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 ${isMobile ? 'rounded-b-none border-b-0 p-2 pb-0 mb-0' : 'p-6 mb-6'} shadow-2xl relative overflow-hidden z-20`}>
          <div className="flex flex-col xl:flex-row gap-4 xl:gap-8 items-start justify-between">
            <div className="flex-1 w-full space-y-3">
               <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-8">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={deckName}
                      onChange={(e) => setDeckName(e.target.value)}
                      className={`w-full bg-transparent border-white/10 text-white focus:outline-none focus:border-amber-500 transition-colors placeholder-white/20 pb-1
                        ${isMobile ? 'text-base border-b-0 text-center font-bold' : 'text-3xl font-wizard border-b'}
                      `}
                      placeholder="输入卡组名称..."
                    />
                  </div>
                  
                  {!isMobile && (
                    <div className="flex-shrink-0 space-y-2">
                       {/* Preset Decks Buttons */}
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

               {/* Desktop Stats */}
               {!isMobile && (
                <div className="flex items-center gap-3 text-sm font-tech text-gray-400">
                    <div className={`flex items-center gap-1.5 ${isValidDeck ? 'text-green-400' : 'text-amber-500'}`}>
                      <span className="text-base">{isValidDeck ? '✅' : '⚠️'}</span>
                      <span>{totalCards} / 30 张卡牌</span>
                    </div>
                </div>
               )}
            </div>

            {!isMobile && (
              <div className="w-full xl:w-auto flex justify-center xl:justify-end">
                <ManaCurve selectedCards={selectedCards} />
              </div>
            )}
          </div>
        </div>

        <div className={`flex-1 min-h-0 ${isMobile ? 'flex flex-col relative' : 'grid grid-cols-12 gap-8'}`}>
          {/* 1. Card Pool (Main View) */}
          <div className={isMobile ? 'flex-1 overflow-hidden absolute inset-0 pb-[80px]' : 'lg:col-span-8 h-full min-h-0'}>
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

          {/* 2. Deck List (Desktop: Side Panel, Mobile: Drawer) */}
          {!isMobile ? (
             <div className="lg:col-span-4 h-full min-h-0">
                <DeckList 
                  cardCounts={cardCounts}
                  onRemoveCard={removeCard}
                  onBack={onBack}
                  onSave={saveDeck}
                  isValidDeck={isValidDeck}
                  lastAddedId={lastAddedId}
                  isMobile={false}
                />
             </div>
          ) : (
            <>
               {/* Mobile Drawer Backdrop */}
               <div 
                 className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                 onClick={() => setIsDrawerOpen(false)}
               />

               {/* Mobile Drawer (Bottom Sheet) */}
               <div 
                 className={`
                    fixed left-0 right-0 z-40 bg-[#1a1625] border-t border-amber-500/30 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]
                    transition-all duration-300 cubic-bezier(0.32, 0.72, 0, 1)
                    flex flex-col safe-area-bottom
                 `}
                 style={{ 
                    bottom: 0,
                    height: isDrawerOpen ? '75vh' : 'calc(60px + env(safe-area-inset-bottom))',
                    borderRadius: isDrawerOpen ? '20px 20px 0 0' : '0'
                 }}
               >
                  {/* Drawer Header (Always Visible) */}
                  <div 
                    className="h-[60px] flex items-center justify-between px-4 border-b border-white/5 cursor-pointer bg-slate-900/50 backdrop-blur"
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  >
                     <div className="flex items-center gap-3">
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 shadow-inner
                            ${isValidDeck ? 'bg-green-900/40 border-green-500 text-green-400' : 'bg-amber-900/40 border-amber-500 text-amber-500'}
                        `}>
                           {totalCards}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">当前卡组</span>
                           <span className={`text-[10px] ${isValidDeck ? 'text-green-500' : 'text-amber-500'}`}>
                             {isValidDeck ? '准备就绪' : `${30 - totalCards} 张待选`}
                           </span>
                        </div>
                     </div>

                     {/* Mini Mana Curve Preview (Simple Bars) */}
                     <div className="flex items-end h-8 gap-1 ml-4 opacity-50">
                        {[0,1,2,3,4,5,6].map(cost => {
                           const count = Object.keys(cardCounts).filter(id => getSpellById(id as SpellType).manaCost === cost).reduce((a, b) => a + cardCounts[b as SpellType], 0);
                           return <div key={cost} className="w-1.5 bg-blue-400 rounded-t-sm" style={{ height: `${Math.min(100, count * 15)}%` }} />
                        })}
                     </div>

                     <div className={`p-2 transition-transform duration-300 ${isDrawerOpen ? 'rotate-180' : ''}`}>
                        <div className="text-amber-500">▲</div>
                     </div>
                  </div>

                  {/* Drawer Content */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#13111a]">
                     <div className="flex-1 overflow-hidden relative">
                        <DeckList 
                          cardCounts={cardCounts}
                          onRemoveCard={removeCard}
                          onBack={onBack}
                          onSave={saveDeck}
                          isValidDeck={isValidDeck}
                          lastAddedId={lastAddedId}
                          isMobile={true}
                        />
                     </div>
                     
                     {/* Action Buttons (Inside Drawer) */}
                     <div className="p-3 bg-black/40 border-t border-white/10 flex gap-3">
                         <button 
                            onClick={onBack}
                            className="flex-1 h-10 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold"
                         >
                            返回
                         </button>
                         <button 
                            onClick={saveDeck}
                            disabled={!isValidDeck}
                            className={`flex-[2] h-10 rounded-lg text-xs font-bold shadow-lg flex items-center justify-center gap-2
                               ${isValidDeck ? 'bg-amber-600 text-black' : 'bg-slate-700 text-slate-500'}
                            `}
                         >
                            保存配置
                         </button>
                     </div>
                  </div>
               </div>
            </>
          )}
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
