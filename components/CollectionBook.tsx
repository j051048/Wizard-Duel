import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Filter, Search, Grid, LayoutList, Gift, Trophy } from 'lucide-react';
import { ALL_SPELLS } from '../data/spells';
import { SpellType, Spell } from '../types';
import { useUserStore } from '../stores/useUserStore';
import { SpellCard } from './SpellCard';
import { HapticService } from '../services/haptic';

interface CollectionBookProps {
  onBack: () => void;
}

interface CollectionMilestone {
  id: string;
  threshold: number;
  label: string;
  reward: string;
  rewardType: 'mana' | 'pack' | 'dust' | 'legendary_pack';
  rewardAmount: number;
  emoji: string;
  claimed: boolean;
}

const MILESTONES_STORAGE_KEY = 'wizard_collection_milestones_v1';

export const CollectionBook: React.FC<CollectionBookProps> = ({ onBack }) => {
  const { inventory, addPacks, setBalance, balance } = useUserStore();
  const [filterMana, setFilterMana] = useState<number | null>(null);
  const [filterElement, setFilterElement] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [claimingMilestone, setClaimingMilestone] = useState<CollectionMilestone | null>(null);

  // Milestone state
  const totalUniqueCards = useMemo(() => Object.keys(ALL_SPELLS).length, []);
  const ownedUniqueCards = useMemo(() => {
    return Object.keys(ALL_SPELLS).filter(id => inventory.includes(id)).length;
  }, [inventory]);
  const collectionPercent = totalUniqueCards > 0 ? ownedUniqueCards / totalUniqueCards : 0;

  const milestones = useMemo<CollectionMilestone[]>(() => {
    const saved: Record<string, boolean> = (() => {
      try {
        const raw = localStorage.getItem(MILESTONES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch { return {}; }
    })();
    return [
      { id: 'm25', threshold: 0.25, label: '25% 收集', reward: '+100 法力', rewardType: 'mana' as const, rewardAmount: 100, emoji: '🌟', claimed: !!saved['m25'] },
      { id: 'm50', threshold: 0.50, label: '50% 收集', reward: '1 卡包', rewardType: 'pack' as const, rewardAmount: 1, emoji: '📦', claimed: !!saved['m50'] },
      { id: 'm75', threshold: 0.75, label: '75% 收集', reward: '+200 法力', rewardType: 'dust' as const, rewardAmount: 200, emoji: '✨', claimed: !!saved['m75'] },
      { id: 'm100', threshold: 1.00, label: '100% 收集', reward: '1 传说卡包', rewardType: 'legendary_pack' as const, rewardAmount: 1, emoji: '👑', claimed: !!saved['m100'] },
    ];
  }, []);

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

  const claimMilestone = (m: CollectionMilestone) => {
    HapticService.medium();
    // Update localStorage
    try {
      const raw = localStorage.getItem(MILESTONES_STORAGE_KEY);
      const saved: Record<string, boolean> = raw ? JSON.parse(raw) : {};
      saved[m.id] = true;
      localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(saved));
    } catch { /* ignore */ }
    // Grant reward
    switch (m.rewardType) {
      case 'mana':
      case 'dust':
        useUserStore.getState().setBalance(useUserStore.getState().balance + m.rewardAmount);
        break;
      case 'pack':
        addPacks('standard', m.rewardAmount);
        break;
      case 'legendary_pack':
        addPacks('legendary', m.rewardAmount);
        break;
    }
    setClaimingMilestone(null);
    HapticService.success();
  };

  const nextMilestone = milestones.find(m => !m.claimed);
  const prevMilestone = [...milestones].reverse().find(m => m.claimed || collectionPercent >= m.threshold);
  const progressPercent = nextMilestone
    ? Math.min(1, (collectionPercent - (prevMilestone?.threshold ?? 0)) / (nextMilestone.threshold - (prevMilestone?.threshold ?? 0)))
    : 1;

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="relative z-10 bg-slate-900/80 backdrop-blur-md border-b border-white/10 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { HapticService.light(); onBack(); }}
              aria-label="返回大厅"
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
        {/* Milestone Progress Bar */}
        <div className="mt-3 flex items-center gap-2">
          {milestones.map((m) => {
            const isAchieved = collectionPercent >= m.threshold;
            const isNext = !m.claimed && isAchieved;
            return (
              <button
                key={m.id}
                onClick={() => { if (isNext) setClaimingMilestone(m); }}
                disabled={!isNext}
                className={`
                  px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5
                  ${m.claimed ? 'bg-green-900/50 text-green-300 opacity-70' :
                    isAchieved ? 'bg-amber-600/50 text-amber-200 animate-pulse cursor-pointer hover:bg-amber-600' :
                    'bg-slate-800 text-slate-500'}
                `}
                title={m.claimed ? `已领取: ${m.reward}` : `${m.label} - ${m.reward}`}
              >
                <span>{m.emoji}</span>
                <span className="hidden sm:inline">{m.label}</span>
                {m.claimed && <span className="text-green-400">✓</span>}
              </button>
            );
          })}
          <div className="flex-1" />
          <span className="text-xs font-mono text-slate-500">{(collectionPercent * 100).toFixed(0)}%</span>
        </div>
        <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${collectionPercent * 100}%`,
              background: collectionPercent >= 1 ? '#fbbf24' : collectionPercent >= 0.75 ? '#a855f7' : collectionPercent >= 0.5 ? '#3b82f6' : '#6b7280',
            }}
          />
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
            {/* Mobile Filters - collapsible strip */}
            <div className="md:hidden mb-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                <input
                  type="text"
                  placeholder="搜索法术..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[1,2,3,4,5,6,7,8].map(cost => (
                  <button
                    key={cost}
                    onClick={() => setFilterMana(filterMana === cost ? null : cost)}
                    className={`shrink-0 w-8 h-8 rounded-full text-xs font-bold transition-all border
                      ${filterMana === cost ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}
                    `}
                  >{cost}</button>
                ))}
                <span className="shrink-0 w-px h-8 bg-slate-700 mx-0.5" />
                {[
                  { id: 'fire', emoji: '🔥' }, { id: 'ice', emoji: '❄️' }, { id: 'thunder', emoji: '⚡' },
                  { id: 'vine', emoji: '🌿' }, { id: 'rock', emoji: '🪨' }, { id: 'arcane', emoji: '🔮' },
                ].map(el => (
                  <button
                    key={el.id}
                    onClick={() => setFilterElement(filterElement === el.id ? null : el.id)}
                    className={`shrink-0 w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all border
                      ${filterElement === el.id ? 'bg-slate-700 border-white/30' : 'bg-slate-800/50 border-slate-700/50'}
                    `}
                  >{el.emoji}</button>
                ))}
                {(filterMana !== null || filterElement !== null) && (
                  <button
                    onClick={() => { setFilterMana(null); setFilterElement(null); }}
                    className="shrink-0 px-2 h-8 rounded-full text-[10px] text-slate-400 bg-slate-800 border border-slate-700"
                  >清除</button>
                )}
              </div>
            </div>
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

      {/* Milestone Claim Modal */}
      <AnimatePresence>
        {claimingMilestone && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setClaimingMilestone(null)}
            />
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className="relative z-10 bg-slate-900 border border-amber-500/30 rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full"
            >
              <div className="text-5xl">{claimingMilestone.emoji}</div>
              <h2 className="text-2xl font-bold text-amber-300">{claimingMilestone.label} 达成！</h2>
              <p className="text-slate-300 text-center">{claimingMilestone.reward}</p>
              <button
                onClick={() => claimMilestone(claimingMilestone)}
                className="w-full py-3 mt-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all"
              >
                领取奖励
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollectionBook;
