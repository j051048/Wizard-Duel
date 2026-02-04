/**

 * DeckBuilder - 牌组构筑组件

 * 

 * 允许玩家从卡牌池中选择卡牌构筑牌组

 */



import React, { useState } from 'react';

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

  gameMode = 'standard' as GameMode

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
            <div className="flex items-end gap-3 h-24 pt-4 px-4 bg-black/20 rounded-lg border border-white/5">
                {[1,2,3,4,5,6].map(cost => {
                  const count = selectedCards.filter(card => getSpellById(card).manaCost === cost).length;
                  const height = Math.min(100, (count / 10) * 100); // Max height capped at 10 cards
                  return (
                    <div key={cost} className="flex flex-col items-center gap-1 group/bar relative w-6">
                       {/* Count Tooltip */}
                       <div className="absolute -top-6 text-xs font-bold text-white opacity-0 group-hover/bar:opacity-100 transition-opacity">
                         {count}
                       </div>
                       {/* Bar */}
                       <div 
                         className="w-full bg-gradient-to-t from-cyan-600 to-blue-400 rounded-sm relative transition-all duration-500"
                         style={{ height: `${Math.max(4, height)}%` }}
                       >
                         {/* Glow effect */}
                         <div className="absolute inset-0 bg-blue-400 blur-sm opacity-0 group-hover/bar:opacity-50 transition-opacity"></div>
                       </div>
                       {/* Label */}
                       <div className="text-[10px] font-bold text-gray-500 mt-1">{cost}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>



        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          
          {/* LEFT: Card Pool (Grimoire Page) */}
          <div className="lg:col-span-7 flex flex-col bg-[#1a1425] rounded-xl border border-[#3b304e] shadow-2xl relative overflow-hidden">
             {/* Decorative Corner */}
             <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-amber-600/30 rounded-tl-xl pointer-events-none"></div>
             
             <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h3 className="text-xl font-wizard text-amber-100 flex items-center gap-2">
                   <span className="text-2xl">📖</span> Card Collection
                </h3>
                <span className="text-xs text-gray-500 font-tech uppercase tracking-widest">Standard Mode</span>
             </div>

             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-4">
                   {cardPool.map((spell) => (
                      <div key={spell.id} className="relative group cursor-pointer" onClick={() => addCard(spell.id)}>
                        <div className="transform transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-2">
                           <SpellCard spell={spell} isSmall />
                        </div>
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg pointer-events-none">
                           <div className="bg-green-600 text-white rounded-full p-1 shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                              <Plus size={16} />
                           </div>
                        </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          {/* RIGHT: Current Deck (Scroll/List) */}
          <div className="lg:col-span-5 flex flex-col bg-[#13111a] rounded-xl border border-[#4a4060] shadow-2xl relative relative overflow-hidden">
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
                      onClick={saveDeck} 
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
                   // Sort by mana cost
                   const spellA = getSpellById(a[0] as SpellType);
                   const spellB = getSpellById(b[0] as SpellType);
                   return spellA.manaCost - spellB.manaCost;
                }).map(([spellId, count]) => {
                  const spell = getSpellById(spellId as SpellType);
                  return (
                    <div 
                       key={spellId} 
                       className="group flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer relative overflow-hidden"
                       onClick={() => removeCard(spellId as SpellType)}
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

        </div>

      </div>

    </div>

  );

};

export default DeckBuilder;
