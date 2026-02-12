import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Star, Trophy,  Flame, Snowflake, Zap, Leaf, Scroll, Sword } from 'lucide-react';
import { Quest, QuestRarity, QuestType } from '../../types/quest';
import { RARITY_COLORS, RARITY_TEXT_COLORS } from '../../config/gameConfig';

interface QuestItemProps {
  quest: Quest;
  onClaim: (questId: string) => void;
  t: (key: string) => string;
}

const getIcon = (iconName: string, className: string) => {
  switch(iconName) {
    case 'trophy': return <Trophy className={className} />;
    case 'scroll': return <Scroll className={className} />;
    case 'sword': return <Sword className={className} />;
    case 'flame': return <Flame className={className} />;
    case 'snowflake': return <Snowflake className={className} />;
    case 'zap': return <Zap className={className} />;
    case 'leaf': return <Leaf className={className} />;
    default: return <Star className={className} />;
  }
};

const QuestItem: React.FC<QuestItemProps> = ({ quest, onClaim, t }) => {
  const progress = Math.min(100, Math.round((quest.current / quest.target) * 100));
  const isCompleted = quest.isCompleted;
  const isClaimed = quest.isClaimed;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-3 rounded-xl border ${RARITY_COLORS[quest.rarity]} shadow-lg overflow-hidden group transition-all duration-300 hover:shadow-xl`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className="relative flex items-center justify-between gap-4">
        {/* Icon & Info */}
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-2 rounded-lg bg-black/40 ${RARITY_TEXT_COLORS[quest.rarity]}`}>
            {getIcon(quest.icon, "w-6 h-6")}
          </div>
          <div>
            <h4 className="font-bold text-gray-100 text-sm md:text-base leading-tight">
              {t(quest.title)}
            </h4>
            <p className="text-xs text-gray-400 mt-1">{t(quest.description)}</p>
          </div>
        </div>

        {/* Progress & Reward */}
        <div className="flex flex-col items-end gap-2">
          {/* Reward Badge */}
          <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 text-xs font-mono font-bold border border-amber-500/30">
            <span>+{quest.rewardGold}</span>
            <span className="text-[10px]">{t('GOLD')}</span>
          </div>

          {/* Action Button or Status */}
          {isClaimed ? (
             <div className="flex items-center gap-1 text-xs text-gray-500 font-bold px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700">
                <Check size={12} />
                <span>{t('CLAIMED')}</span>
             </div>
          ) : isCompleted ? (
            <button
              onClick={() => onClaim(quest.id)}
              className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-amber-500/20 active:scale-95 transition-all animate-pulse"
            >
              <span>{t('CLAIM')}</span>
            </button>
          ) : (
            <div className="text-xs text-gray-500 font-mono">
              {quest.current} / {quest.target}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!isClaimed && (
        <div className="mt-3 h-1.5 bg-gray-900 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${isCompleted ? 'bg-amber-500' : 'bg-blue-500/70'}`}
          />
        </div>
      )}
    </motion.div>
  );
};

interface QuestListProps {
  quests: Quest[];
  onClaim: (questId: string) => void;
  t: (key: string) => string;
}

export const QuestList: React.FC<QuestListProps> = ({ quests, onClaim, t }) => {
  if (quests.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 bg-black/20 rounded-xl border border-gray-800">
        <p>{t('No active quests available.')}</p>
        <p className="text-sm mt-2">{t('Come back tomorrow for more!')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full max-w-md mx-auto">
      {quests.map(quest => (
        <QuestItem key={quest.id} quest={quest} onClaim={onClaim} t={t} />
      ))}
    </div>
  );
};


export default QuestList;
