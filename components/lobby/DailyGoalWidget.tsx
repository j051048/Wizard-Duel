import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Trophy, Scroll, Sword, Flame, Snowflake, Crown, Skull } from 'lucide-react';
import { Quest } from '../../types/quest';

interface DailyGoalWidgetProps {
  quests: Quest[];
  onClaim: (questId: string) => void;
  t: (key: string) => string;
}

export const DailyGoalWidget: React.FC<DailyGoalWidgetProps> = ({ quests, onClaim, t }) => {
  const [expanded, setExpanded] = useState(false);

  const getIcon = (iconName: string, className: string = "w-5 h-5") => {
      switch (iconName) {
          case 'trophy': return <Trophy className={className} />;
          case 'scroll': return <Scroll className={className} />;
          case 'sword': return <Sword className={className} />;
          case 'flame': return <Flame className={className} />;
          case 'snowflake': return <Snowflake className={className} />;
          case 'crown': return <Crown className={className} />;
          case 'skull': return <Skull className={className} />;
          default: return <CheckCircle className={className} />;
      }
  };

  const completedCount = quests.filter(q => q.isCompleted && !q.isClaimed).length;
  // Prevent division by zero
  const progressRatio = quests.length > 0 
    ? quests.reduce((acc, q) => acc + (Math.min(q.current, q.target) / q.target), 0) / quests.length
    : 0;

  if (quests.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mb-6 px-4">
      <div 
        className={`bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 ${expanded ? 'shadow-2xl shadow-purple-900/30' : 'hover:bg-slate-900/80 cursor-pointer'}`}
        onClick={() => !expanded && setExpanded(true)}
      >
        {/* Header / Summary View */}
        <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white border border-purple-400/30">
                        <Scroll size={20} />
                    </div>
                    {completedCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-slate-900 animate-bounce">
                            {completedCount}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">{t('Daily Contracts')}</h3>
                    <div className="flex items-center gap-2">
                         <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                             <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${progressRatio * 100}%` }} />
                         </div>
                         <span className="text-[10px] text-gray-400">
                             {quests.filter(q => q.isCompleted).length}/{quests.length}
                         </span>
                    </div>
                </div>
            </div>
            
            {expanded && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                  className="p-2 text-gray-400 hover:text-white"
                >
                    <span className="text-xs">{t('CLOSE_WIDGET') || '收起'}</span>
                </button>
            )}
        </div>

        {/* Expanded List */}
        <AnimatePresence>
            {expanded && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/5 bg-black/20"
                >
                    <div className="p-4 pt-2 space-y-3">
                        {quests.map(quest => {
                            const isDone = quest.isCompleted;
                            const isClaimed = quest.isClaimed;
                            const percent = Math.min(100, (quest.current / quest.target) * 100);
                            
                            return (
                                <div key={quest.id} className={`relative p-3 rounded-xl border ${isClaimed ? 'border-transparent bg-white/5 opacity-50' : 'border-white/10 bg-slate-800/50'} flex items-center gap-3`}>
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDone ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-gray-400'}`}>
                                       {getIcon(quest.icon, "w-4 h-4")}
                                   </div>
                                   
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-center mb-1">
                                           <h4 className={`font-bold text-xs ${isClaimed ? 'text-gray-500' : 'text-gray-200'}`}>{t(quest.description)}</h4>
                                           <span className={`text-[10px] ${isDone ? 'text-green-400' : 'text-gray-500'}`}>
                                               {quest.current}/{quest.target}
                                           </span>
                                       </div>
                                       {/* Progress Bar */}
                                       <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                                           <motion.div 
                                             initial={{ width: 0 }}
                                             animate={{ width: `${percent}%` }}
                                             className={`h-full ${isDone ? 'bg-green-500' : 'bg-blue-500'}`}
                                           />
                                       </div>
                                   </div>

                                   <div className="shrink-0 ml-2">
                                       {isClaimed ? (
                                           <CheckCircle size={18} className="text-gray-600" />
                                       ) : isDone ? (
                                           <button 
                                             onClick={(e) => { e.stopPropagation(); onClaim(quest.id); }}
                                             className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-green-600/30 animate-pulse"
                                           >
                                               {t('CLAIM')} {quest.rewardGold} 💎
                                           </button>
                                       ) : (
                                           <div className="px-2 py-1 bg-white/5 text-[10px] text-gray-500 rounded border border-white/5">
                                               {quest.rewardGold} 💎
                                           </div>
                                       )}
                                   </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};
