import React from 'react';
import { X, Calendar, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quest } from '../../types/quest';
import { QuestList } from './QuestList';

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  quests: Quest[];
  onClaim: (questId: string) => void;
  t: (key: string) => string;
}

export const QuestModal: React.FC<QuestModalProps> = ({ 
  isOpen, 
  onClose, 
  quests, 
  onClaim,
  t
}) => {
  // 计算可领取的任务数用于显示徽章（如果需要）
  const claimableCount = quests.filter(q => q.isCompleted && !q.isClaimed).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-slate-950 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800/50 bg-gradient-to-r from-slate-900 to-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <Calendar className="text-amber-500" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold bg-gradient-to-r from-amber-100 to-amber-400 bg-clip-text text-transparent font-wizard tracking-wide">
                        {t('Daily Contracts')}
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">{t('Completed')}: {quests.filter(q => q.isCompleted).length}/{quests.length}</p>
                    </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                
                {/* Banner / Info */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Gift className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-indigo-200">{t('New Contracts Available')}</h3>
                    <p className="text-xs text-indigo-300/70 mt-1 leading-relaxed">
                      {t('Complete daily contracts to earn Gold. Contracts reset every 24 hours.')}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">{t("Today's Targets")}</h3>
                   <QuestList quests={quests} onClaim={onClaim} t={t} />
                </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-800/50 bg-slate-900/30 text-center">
              <p className="text-[10px] text-slate-600 font-mono">{t('Contracts reset in')}: --:--:--</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
