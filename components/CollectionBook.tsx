import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Filter, Search, Grid, LayoutList } from 'lucide-react';
import { ALL_SPELLS } from '../data/spells';
import { SpellType, Spell } from '../types';
import { useUserStore } from '../stores/useUserStore';
import { SpellCard } from './SpellCard';
import { HapticService } from '../services/haptic';

interface CollectionBookProps {
  onBack: () => void;
}

export const CollectionBook: React.FC<CollectionBookProps> = ({ onBack }) => {
  const { inventory } = useUserStore();
  const [filterMana, setFilterMana] = useState<number | null>(null);
  const [filterElement, setFilterElement] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  // Group spells by ownership logic (simplified: all valid spells are 'obtainable')
  const spells = useMemo(() => Object.values(ALL_SPELLS), []);

  const filteredSpells = useMemo(() => {
    return spells.filter(spell => {
      // Search
      if (searchQuery && !spell.name.toLowerCase().includes(searchQuery.toLowerCase()) && !spell.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Mana
      if (filterMana !== null && spell.manaCost !== filterMana) {
        return false;
      }
      // Element (infer from ID prefix or emoji logic if needed, simplify to manual tags if we had them)
      // For now, let's use ID prefix logic from defineSpell in data/spells.ts
      // Element
      if (filterElement) {
          if (filterElement === 'arcane') {
              const arcaneIds = ['healing', 'aoe', 'draw', 'silence', 'skip'];
              if (!arcaneIds.includes(spell.id) && !spell.name.includes('奥术')) return false;
          } else {
              if (!spell.id.startsWith(filterElement)) return false;
          }
      }

      return true;
    });
  }, [spells, searchQuery, filterMana, filterElement]);

  const ownedCount = filteredSpells.filter(s => inventory.includes(s.id)).length;
  const totalCount = filteredSpells.length;

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="relative z-10 bg-slate-900/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { HapticService.light(); onBack(); }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-wizard text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
            法术典籍
          </h1>
          <div className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs font-mono text-slate-400">
            收集进度: <span className="text-amber-400">{ownedCount}</span> / {totalCount}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Filters - Desktop (could be collapsible on mobile) */}
        <div className="w-64 bg-slate-900 border-r border-white/5 p-4 hidden md:flex flex-col gap-6 overflow-y-auto">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="搜索法术..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
            </div>

            {/* Mana Filter */}
            <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Filter size={12} /> 法力消耗
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(cost => (
                        <button
                          key={cost}
                          onClick={() => setFilterMana(filterMana === cost ? null : cost)}
                          className={`
                            h-10 rounded-lg font-bold font-mono transition-all
                            ${filterMana === cost 
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }
                          `}
                        >
                            {cost}
                        </button>
                    ))}
                </div>
            </div>

            {/* Element Filter */}
            <div>
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    元素派系
                </h3>
                <div className="space-y-2">
                    {[
                        { id: 'fire', label: '火焰', emoji: '🔥', color: 'text-red-400 hover:bg-red-900/20' },
                        { id: 'ice', label: '寒冰', emoji: '❄️', color: 'text-blue-400 hover:bg-blue-900/20' },
                        { id: 'thunder', label: '雷电', emoji: '⚡', color: 'text-yellow-400 hover:bg-yellow-900/20' },
                        { id: 'vine', label: '自然', emoji: '🌿', color: 'text-green-400 hover:bg-green-900/20' },
                        { id: 'rock', label: '岩石', emoji: '🪨', color: 'text-stone-400 hover:bg-stone-900/20' },
                        { id: 'arcane', label: '奥术', emoji: '🔮', color: 'text-purple-400 hover:bg-purple-900/20' },
                    ].map(el => (
                        <button
                            key={el.id}
                            onClick={() => setFilterElement(filterElement === el.id ? null : el.id)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-bold
                                ${filterElement === el.id 
                                    ? 'bg-slate-700 text-white shadow-md' 
                                    : `text-slate-400 ${el.color}`
                                }
                            `}
                        >
                            <span>{el.emoji}</span>
                            <span>{el.label}</span>
                            {filterElement === el.id && <motion.div layoutId="active-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950 relative">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8 pb-20">
                {filteredSpells.map(spell => {
                    const isOwned = inventory.includes(spell.id);
                    return (
                        <motion.div 
                          key={spell.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: isOwned ? 1 : 0.5, scale: 1 }}
                          whileHover={{ scale: 1.05, opacity: isOwned ? 1 : 0.7, zIndex: 10 }}
                          className={`relative cursor-pointer group ${!isOwned ? 'grayscale' : ''}`}
                          onClick={() => {
                              setSelectedSpell(spell);
                              HapticService.light();
                          }}
                        >
                            <div className="transform transition-transform duration-300">
                                <SpellCard spell={spell} />
                            </div>
                            
                            {!isOwned && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                                    <div className="px-3 py-1 bg-black/80 backdrop-blur rounded border border-white/20 text-xs text-gray-400 font-mono">
                                        未拥有
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
            
            {filteredSpells.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <Search size={48} className="mb-4 opacity-50" />
                    <p>没有找到相关法术</p>
                </div>
            )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
          {selectedSpell && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    onClick={() => setSelectedSpell(null)}
                  />
                  <motion.div
                    layoutId={`spell-${selectedSpell.id}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="relative z-10 flex flex-col items-center pointer-events-none" 
                  >
                      {/* Using pointer-events-none on wrapper to allow clicking bg, but enable on card if needed */}
                      <div className="pointer-events-auto scale-150">
                          <SpellCard spell={selectedSpell} />
                      </div>
                      
                      <div className="mt-12 text-center pointer-events-auto">
                           <h2 className="text-3xl font-bold text-white mb-2">{selectedSpell.name}</h2>
                           <p className="text-slate-300 max-w-md mx-auto">{selectedSpell.description}</p>
                           <div className="mt-4 flex gap-4 justify-center">
                               {inventory.includes(selectedSpell.id) ? (
                                   <span className="text-green-400 font-bold flex items-center gap-2">
                                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                       已收藏
                                   </span>
                               ) : (
                                   <span className="text-slate-500 font-bold">未解锁</span>
                               )}
                           </div>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default CollectionBook;
