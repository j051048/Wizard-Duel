import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { SpellType, Spell, GameMode } from '../../types';
import { SpellCard } from '../SpellCard';

interface CardPoolProps {
  filteredCardPool: Spell[];
  onAddCard: (spellId: SpellType, e?: React.MouseEvent) => void;
  onRightClick: (e: React.MouseEvent, spellId: SpellType) => void;
  onPressStart: (spellId: SpellType) => void;
  onPressEnd: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  activeCostFilter: number | null;
  onCostFilterChange: (cost: number | null) => void;
}

const CardPool: React.FC<CardPoolProps> = ({
  filteredCardPool,
  onAddCard,
  onRightClick,
  onPressStart,
  onPressEnd,
  searchTerm,
  onSearchChange,
  activeCostFilter,
  onCostFilterChange
}) => {
  return (
    <div className="lg:col-span-7 flex flex-col bg-[#1a1425] rounded-xl border border-[#3b304e] shadow-2xl relative overflow-hidden">
       {/* Decorative Corner */}
       <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-amber-600/30 rounded-tl-xl pointer-events-none"></div>
       
       {/* Filters Header */}
       <div className="p-4 border-b border-white/5 bg-black/20 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-wizard text-amber-100 flex items-center gap-2">
               <span className="text-2xl">📖</span> Card Collection
            </h3>
            {/* Search Input */}
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search spells..." 
                className="bg-black/40 border border-white/10 rounded-full px-4 py-1 text-sm text-white focus:outline-none focus:border-amber-500 w-48 transition-all"
              />
            </div>
          </div>

          {/* Mana Filter Gems */}
          <div className="flex gap-2">
             <button 
                onClick={() => onCostFilterChange(null)}
                className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all border ${activeCostFilter === null ? 'bg-amber-600 border-amber-400 text-white' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'}`}
             >
               ALL
             </button>
             {[0, 1, 2, 3, 4, 5, 6, 7].map(cost => (
               <button
                  key={cost}
                  onClick={() => onCostFilterChange(activeCostFilter === cost ? null : cost)}
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all border shadow-sm
                    ${activeCostFilter === cost 
                      ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-blue-500/50' 
                      : 'bg-[#1a233b] border-blue-900/50 text-blue-300 hover:bg-blue-900'}
                  `}
               >
                  {cost === 7 ? '7+' : cost}
               </button>
             ))}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-12">
             {filteredCardPool.map((spell) => (
                <div 
                  key={spell.id} 
                  className="relative group cursor-pointer touch-manipulation" 
                  onClick={(e) => onAddCard(spell.id, e)}
                  onContextMenu={(e) => onRightClick(e, spell.id)}
                  onPointerDown={() => onPressStart(spell.id)}
                  onPointerUp={onPressEnd}
                  onPointerLeave={onPressEnd}
                >
                  <div className="transform transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-2 pointer-events-none">
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
  );
};

export default CardPool;
