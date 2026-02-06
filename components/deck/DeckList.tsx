import React from 'react';
import { ArrowLeft, Save, Trash2, Check } from 'lucide-react';
import { SpellType, Deck } from '../../types';
import { getSpellById } from '../../services/gameLogic';

interface DeckListProps {
  cardCounts: Record<SpellType, number>;
  onRemoveCard: (spellId: SpellType) => void;
  onBack: () => void;
  onSave: () => void;
  isValidDeck: boolean;
  lastAddedId: string | null;
  isMobile?: boolean;
  saveStatus?: 'idle' | 'saved';
}

const DeckList: React.FC<DeckListProps> = ({
  cardCounts,
  onRemoveCard,
  onBack,
  onSave,
  isValidDeck,
  lastAddedId,
  isMobile = false,
  saveStatus = 'idle'
}) => {
  return (
    <div className={`flex flex-col bg-[#13111a] h-full ${isMobile ? '' : 'rounded-xl border border-[#4a4060] shadow-2xl'} relative overflow-hidden`}>
       {/* Decorative Top */}
       <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-amber-500/50 to-transparent"></div>

       {!isMobile && (
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h3 className="text-xl font-wizard text-blue-100 flex items-center gap-2">
               <span className="text-2xl">📜</span> 当前卡组
            </h3>
            <div className="flex gap-2">
               <button onClick={onBack} className="p-2 text-gray-400 hover:text-white transition-colors" title="返回">
                  <ArrowLeft size={20} />
               </button>
               <button 
                  onClick={onSave} 
                  disabled={!isValidDeck || saveStatus === 'saved'}
                  className={`
                     p-2 rounded-lg transition-all duration-300
                     ${saveStatus === 'saved' 
                        ? 'text-white bg-green-500 hover:bg-green-600 shadow-[0_0_10px_rgba(34,197,94,0.5)] scale-110' 
                        : (isValidDeck ? 'text-green-400 hover:text-green-300 hover:bg-green-900/30' : 'text-gray-600 cursor-not-allowed')
                     }
                  `}
                  title={saveStatus === 'saved' ? "已保存" : "保存卡组"}
               >
                  {saveStatus === 'saved' ? <Check size={20} /> : <Save size={20} />}
               </button>
            </div>
          </div>
       )}

       <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-1' : 'p-2'} custom-scrollbar space-y-1 md:space-y-2 pb-2 md:pb-2`}>
          {Object.keys(cardCounts).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
               <span className="text-4xl mb-2">📭</span>
               <span className="text-sm font-bold">卡组目前是空的</span>
               <span className="text-xs mt-1 text-gray-600">切换到“浏览卡池”添加卡牌</span>
            </div>
          ) : (
            Object.entries(cardCounts).sort((a,b) => {
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
                      group flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-lg border transition-all cursor-pointer relative overflow-hidden select-none
                      ${isJustAdded ? 'bg-amber-500/20 border-amber-500/50 scale-[1.01]' : 'bg-white/5 hover:bg-white/10 border-transparent hover:border-white/10'}
                      ${isMobile ? 'h-10' : ''} 
                   `}
                   onClick={() => onRemoveCard(spellId as SpellType)}
                >  
                   <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-900/80 ring-1 ring-blue-500 flex items-center justify-center font-black text-blue-100 text-xs md:text-sm shadow-inner z-10 shrink-0">
                      {spell.manaCost}
                   </div>

                   <div className="flex-1 min-w-0 z-10 flex flex-col justify-center">
                      <div className={`font-bold text-xs md:text-sm truncate ${spell.color} leading-tight`}>{spell.name}</div>
                      {!isMobile && <div className="text-[9px] md:text-[10px] text-gray-500 truncate">{spell.shortDesc}</div>}
                   </div>
                   
                   <div className="text-base md:text-xl font-wizard text-amber-500 z-10 mr-1 md:mr-2">x{count}</div>

                   <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15">
                      {spell.artSrc && <img src={spell.artSrc} className="w-full h-full object-cover" alt="" />}
                   </div>

                   <div className="absolute inset-0 bg-red-600/0 hover:bg-red-600/10 transition-colors z-[5]"></div>
                </div>
              );
            })
          )}
       </div>

       {/* Mobile Action Bar Removed - Moved to Parent Drawer */}
    </div>
  );
};

export default DeckList;
