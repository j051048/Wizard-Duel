import React from 'react';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { SpellType, Deck } from '../../types';
import { getSpellById } from '../../services/gameLogic';

interface DeckListProps {
  cardCounts: Record<SpellType, number>;
  onRemoveCard: (spellId: SpellType) => void;
  onBack: () => void;
  onSave: () => void;
  isValidDeck: boolean;
  lastAddedId: string | null;
}

const DeckList: React.FC<DeckListProps> = ({
  cardCounts,
  onRemoveCard,
  onBack,
  onSave,
  isValidDeck,
  lastAddedId
}) => {
  return (
    <div className="lg:col-span-5 flex flex-col bg-[#13111a] rounded-xl border border-[#4a4060] shadow-2xl relative overflow-hidden">
       {/* Decorative Top */}
       <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-amber-500/50 to-transparent"></div>

       <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
          <h3 className="text-xl font-wizard text-blue-100 flex items-center gap-2">
             <span className="text-2xl">📜</span> Current Deck
          </h3>
          <div className="flex gap-2">
             <button onClick={onBack} className="p-2 text-gray-400 hover:text-white transition-colors" title="Back">
                <ArrowLeft size={20} />
             </button>
             <button 
                onClick={onSave} 
                disabled={!isValidDeck}
                className={`p-2 rounded-lg transition-all ${isValidDeck ? 'text-green-400 hover:text-green-300 hover:bg-green-900/30' : 'text-gray-600 cursor-not-allowed'}`}
                title="Save Deck"
             >
                <Save size={20} />
             </button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
          {Object.entries(cardCounts).sort((a,b) => {
             const spellA = getSpellById(a[0] as SpellType);
             const spellB = getSpellById(b[0] as SpellType);
             return spellA.manaCost - spellB.manaCost;
          }).map(([spellId, count]) => {
            const spell = getSpellById(spellId as SpellType);
            const isJustAdded = lastAddedId === spellId;
            
            return (
              <div 
                 key={spellId} 
                 className={`
                    group flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer relative overflow-hidden select-none
                    ${isJustAdded ? 'bg-amber-500/20 border-amber-500/50 scale-[1.02]' : 'bg-white/5 hover:bg-white/10 border-transparent hover:border-white/10'}
                 `}
                 onClick={() => onRemoveCard(spellId as SpellType)}
              >  
                 {/* Mana Cost Gem */}
                 <div className="w-8 h-8 rounded-full bg-blue-900 ring-1 ring-blue-500 flex items-center justify-center font-black text-blue-100 text-sm shadow-inner z-10 shrink-0">
                    {spell.manaCost}
                 </div>

                 {/* Name & Count */}
                 <div className="flex-1 min-w-0 z-10">
                    <div className={`font-bold text-sm truncate ${spell.color}`}>{spell.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{spell.shortDesc}</div>
                 </div>
                 
                 {/* Count Badge */}
                 <div className="text-xl font-wizard text-amber-500 z-10 mr-2">x{count}</div>

                 {/* Background Art Strip (Subtle) */}
                 <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 mask-linear-fade">
                    {spell.artSrc && <img src={spell.artSrc} className="w-full h-full object-cover" alt="" />}
                 </div>

                 {/* Hover Remove Icon */}
                 <div className="absolute right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/80 p-1 rounded">
                    <Trash2 size={16} />
                 </div>
              </div>
            );
          })}
       </div>
    </div>
  );
};

export default DeckList;
