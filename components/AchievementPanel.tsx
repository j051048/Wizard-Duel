import React, { useState } from 'react';
import { ArrowLeft, Trophy, Swords, BookOpen, Mountain, Star, Gift } from 'lucide-react';
import { Achievement, AchievementProgress, AchievementCategory } from '../types/achievement';
import { ACHIEVEMENTS, AchievementService } from '../services/AchievementService';
import { useToastStore } from '../stores/useToastStore';

interface AchievementPanelProps {
  onBack: () => void;
}

const CATEGORY_CONFIG: Record<AchievementCategory, { label: string; icon: React.ReactNode; color: string }> = {
  battle:    { label: '战斗', icon: <Swords size={16} />,   color: 'red' },
  collection:{ label: '收藏', icon: <BookOpen size={16} />, color: 'blue' },
  dungeon:   { label: '地牢', icon: <Mountain size={16} />, color: 'amber' },
  social:    { label: '社交', icon: <Star size={16} />,     color: 'green' },
  special:   { label: '特殊', icon: <Star size={16} />,     color: 'purple' },
};

export const AchievementPanel: React.FC<AchievementPanelProps> = ({ onBack }) => {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');
  const [progress, setProgress] = useState<Record<string, AchievementProgress>>(() => AchievementService.loadProgress());
  const toast = useToastStore();

  const summary = AchievementService.getSummary();

  const filteredAchievements = ACHIEVEMENTS.filter(a => {
    if (activeCategory !== 'all' && a.category !== activeCategory) return false;
    if (a.isHidden && !progress[a.id]?.unlockedAt) return false;
    return true;
  });

  const handleClaim = (ach: Achievement) => {
    const result = AchievementService.claim(ach.id);
    if (result.success && result.reward) {
      setProgress(prev => ({ ...prev, [ach.id]: { ...prev[ach.id], claimed: true } }));
      toast.success('奖励已领取', `${ach.name}: ${result.reward.amount} ${result.reward.type === 'mana' ? '法力值' : result.reward.type === 'pack' ? '卡包' : '粉尘'}`);
    }
  };

  return (
    <div className="min-h-full bg-slate-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-400" /> 成就
          </h1>
          <p className="text-sm text-gray-400">已解锁 {summary.unlocked}/{summary.total}</p>
        </div>
        {summary.unclaimed > 0 && (
          <span className="ml-auto bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            {summary.unclaimed} 个奖励待领取
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6 bg-slate-800/50 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${(summary.unlocked / summary.total) * 100}%` }}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
            activeCategory === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          全部
        </button>
        {(Object.keys(CATEGORY_CONFIG) as AchievementCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === cat ? `bg-${CATEGORY_CONFIG[cat].color}-600 text-white` : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map(ach => {
          const p = progress[ach.id];
          const isUnlocked = !!p?.unlockedAt;
          const isClaimed = p?.claimed;
          const pct = Math.min(100, ((p?.current || 0) / ach.condition.target) * 100);

          return (
            <div
              key={ach.id}
              className={`relative rounded-xl border p-4 transition-all ${
                isUnlocked
                  ? 'bg-slate-800/80 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                  : 'bg-slate-900/50 border-white/5 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{ach.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{ach.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{ach.description}</p>
                  {/* Progress bar */}
                  {!isUnlocked && (
                    <div className="mt-2 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {isUnlocked ? '✅ 已解锁' : `${p?.current || 0}/${ach.condition.target}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {ach.reward.type === 'mana' ? `💎 ${ach.reward.amount}` :
                       ach.reward.type === 'pack' ? `📦 ×${ach.reward.amount}` :
                       ach.reward.type === 'dust' ? `✨ ${ach.reward.amount}` : ''}
                    </span>
                  </div>
                  {/* Claim button */}
                  {isUnlocked && !isClaimed && (
                    <button
                      onClick={() => handleClaim(ach)}
                      className="mt-2 w-full py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <Gift size={14} /> 领取奖励
                    </button>
                  )}
                  {isClaimed && (
                    <span className="mt-2 inline-block text-xs text-green-400">已领取</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementPanel;
