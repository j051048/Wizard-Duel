import React from 'react';
import { Settings } from 'lucide-react';
import { Deck, Spell } from '../../types';
import { SPELLS } from '../../constants';

interface DeckCarouselProps {
  decks: Deck[];
  selectedDeck: Deck | null;
  onOpenDeckBuilder: () => void;
  onSelectDeck: (deck: Deck) => void;
  t: (key: string) => string;
}

const DeckCarousel: React.FC<DeckCarouselProps> = ({
  decks,
  selectedDeck,
  onOpenDeckBuilder,
  onSelectDeck,
  t
}) => {
  const currentDeckIndex = decks.findIndex(d => d.id === selectedDeck?.id);
  
  const nextDeck = () => {
    if (decks.length === 0) return;
    const nextIndex = (currentDeckIndex + 1) % decks.length;
    onSelectDeck(decks[nextIndex]);
  };
  
  const prevDeck = () => {
    if (decks.length === 0) return;
    const prevIndex = (currentDeckIndex - 1 + decks.length) % decks.length;
    onSelectDeck(decks[prevIndex]);
  };

  return (
    <div className="relative w-full max-w-sm h-64 md:h-80 perspective-1000 flex items-center justify-center mb-8">
       {decks.length === 0 ? (
          <div className="text-center p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-dashed border-white/20 hover:border-purple-500/50 transition-colors cursor-pointer" onClick={onOpenDeckBuilder}>
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings size={32} className="text-purple-400" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">{t('No Decks Found')}</h3>
             <p className="text-gray-400 text-sm mb-4">{t('You need a deck to enter the arena.')}</p>
             <button className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold transition-colors">
                {t('Create Deck')}
             </button>
          </div>
       ) : (
          <>
             {/* Prev Button */}
             <button onClick={prevDeck} className="absolute left-4 z-20 p-3 rounded-full bg-black/20 hover:bg-black/60 text-white/50 hover:text-white transition-all">
                ◀
             </button>
             
             {/* Active Deck Card - Simulated 3D */}
             <div className="relative w-48 h-72 md:w-56 md:h-80 bg-slate-900 rounded-xl border-2 border-amber-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500 group">
                 {/* Cover Art */}
                 <div className="absolute inset-1 rounded-lg overflow-hidden bg-slate-800">
                    {selectedDeck?.cards[0] && SPELLS.find(s => s.id === selectedDeck.cards[0])?.artSrc ? (
                       <img src={SPELLS.find(s => s.id === selectedDeck.cards[0])?.artSrc} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    ) : (
                       <div className="w-full h-full bg-gradient-to-br from-purple-900 to-slate-900"></div>
                    )}
                 </div>
                 
                 {/* Deck Info Overlay */}
                 <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
                    <div className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">{t('Current Deck')}</div>
                    <h3 className="text-xl font-bold text-white truncate">{selectedDeck?.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                       <span className="text-xs text-gray-400">{selectedDeck?.cards.length}/30 {t('Cards')}</span>
                       <button 
                          onClick={onOpenDeckBuilder}
                          className="p-2 bg-white/10 hover:bg-purple-600 rounded-lg transition-colors text-white"
                          title={t('Edit Deck')}
                       >
                          <Settings size={14} />
                       </button>
                    </div>
                 </div>
             </div>

             {/* Next Button */}
             <button onClick={nextDeck} className="absolute right-4 z-20 p-3 rounded-full bg-black/20 hover:bg-black/60 text-white/50 hover:text-white transition-all">
                ▶
             </button>
          </>
       )}
    </div>
  );
};

export default DeckCarousel;
