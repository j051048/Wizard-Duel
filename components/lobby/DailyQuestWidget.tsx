/**
 * DailyQuestWidget — 大厅每日/每周任务组件
 *
 * 显示任务进度，可领取奖励
 */

import React, { useState, useCallback } from 'react';
import { Gift, RefreshCw, Check } from 'lucide-react';
import { DailyQuestService, DailyQuest } from '../../services/DailyQuestService';
import { useUserStore } from '../../stores/useUserStore';
import { useToastStore } from '../../stores/useToastStore';

export const DailyQuestWidget: React.FC = () => {
  const [state, setState] = useState(() => DailyQuestService.getState());
  const adjustBalance = useUserStore(s => s.adjustUserBalance);
  const balance = useUserStore(s => s.balance);
  const toast = useToastStore();

  const handleClaim = useCallback(async (questId: string) => {
    const reward = DailyQuestService.claimReward(questId);
    if (reward) {
      await adjustBalance(reward.gold, 'daily_quest');
      toast.success('任务完成', `获得 ${reward.gold} 法力`);
      setState(DailyQuestService.getState());
    }
  }, [adjustBalance, toast]);

  const handleRefresh = useCallback((questId: string) => {
    if (balance < 10) {
      toast.error('法力不足', '刷新任务需要 10 法力');
      return;
    }
    const result = DailyQuestService.refreshQuest(questId);
    if (result.newQuest) {
      adjustBalance(-result.cost, 'quest_refresh');
      setState(DailyQuestService.getState());
      toast.info('任务已刷新', '');
    }
  }, [balance, adjustBalance, toast]);

  const stats = DailyQuestService.getStats();

  return (
    <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1">
          <Gift size={14} /> 每日任务
        </h3>
        <span className="text-[10px] text-gray-500">
          连续天数: {stats.streak}
        </span>
      </div>

      {/* 每日任务 */}
      <div className="space-y-2 mb-3">
        {state.quests.map(quest => (
          <QuestItem
            key={quest.id}
            quest={quest}
            onClaim={() => handleClaim(quest.id)}
            onRefresh={() => handleRefresh(quest.id)}
          />
        ))}
      </div>

      {/* 每周任务 */}
      <div className="border-t border-slate-700/30 pt-2">
        <h4 className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">每周任务</h4>
        <div className="space-y-2">
          {state.weeklyQuests.map(quest => (
            <QuestItem
              key={quest.id}
              quest={quest}
              onClaim={() => handleClaim(quest.id)}
              onRefresh={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const QuestItem: React.FC<{
  quest: DailyQuest;
  onClaim: () => void;
  onRefresh: () => void;
}> = ({ quest, onClaim, onRefresh }) => {
  const progressPct = Math.min(100, (quest.progress / quest.target) * 100);

  return (
    <div className={`rounded-lg p-2 transition-all ${
      quest.isClaimed ? 'bg-green-900/10 border border-green-500/10' :
      quest.isCompleted ? 'bg-amber-900/10 border border-amber-500/20' :
      'bg-slate-800/30 border border-slate-700/20'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{quest.icon}</span>
          <span className={`text-xs font-bold ${quest.isClaimed ? 'text-green-400 line-through' : 'text-white'}`}>
            {quest.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-amber-400">+{quest.rewardGold}</span>
          {quest.isCompleted && !quest.isClaimed && (
            <button onClick={onClaim} className="text-green-400 hover:text-green-300">
              <Check size={14} />
            </button>
          )}
          {quest.isClaimed && <span className="text-green-400 text-xs">✓</span>}
          {!quest.isCompleted && !quest.isClaimed && quest.refreshable && quest.progress === 0 && (
            <button onClick={onRefresh} className="text-gray-500 hover:text-gray-400">
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mb-1">{quest.description}</p>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            quest.isCompleted ? 'bg-green-500' : 'bg-amber-500'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="text-[9px] text-gray-500 mt-0.5 text-right">
        {quest.progress}/{quest.target}
      </div>
    </div>
  );
};
