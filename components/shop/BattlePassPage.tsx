/**
 * BattlePassPage - 战斗通行证页面
 * 
 * [P0 商业化] 展示通行证进度、任务、奖励
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gift, Star, Crown, ChevronRight, Clock, CheckCircle, Lock } from 'lucide-react';
import { BattlePassService } from '../../services/BattlePassService';
import { BattlePassSeason, PlayerBattlePass, BattlePassTask, BattlePassLevel } from '../../types/battlepass';

interface BattlePassPageProps {
  onBack: () => void;
  onPurchasePremium: () => void;
  balance: number;
}

export const BattlePassPage: React.FC<BattlePassPageProps> = ({ onBack, onPurchasePremium, balance }) => {
  const [season, setSeason] = useState<BattlePassSeason | null>(null);
  const [playerPass, setPlayerPass] = useState<PlayerBattlePass | null>(null);
  const [tasks, setTasks] = useState<BattlePassTask[]>([]);
  const [activeTab, setActiveTab] = useState<'rewards' | 'tasks'>('rewards');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  useEffect(() => {
    const { pass, tasks: loadedTasks } = BattlePassService.init();
    setSeason(BattlePassService.getSeason());
    setPlayerPass(pass);
    setTasks(loadedTasks);
  }, []);

  const handleClaimTaskReward = (taskId: string) => {
    const result = BattlePassService.claimTaskReward(taskId);
    if (result.success) {
      setPlayerPass(BattlePassService.getPlayerPass());
      setTasks(BattlePassService.getTasks());
    }
  };

  const handleClaimLevelReward = (level: number, isPremium: boolean) => {
    const result = BattlePassService.claimLevelReward(level, isPremium);
    if (result.success) {
      setPlayerPass(BattlePassService.getPlayerPass());
      // Planned: reward animation (low priority polish)
    }
  };

  if (!season || !playerPass) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
    </div>;
  }

  const levelProgress = BattlePassService.getLevelProgress();
  const dailyTasks = tasks.filter(t => t.type === 'daily');
  const weeklyTasks = tasks.filter(t => t.type === 'weekly');

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-300 hover:text-white">
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
            {season.name}
          </h1>
          <div className="flex items-center gap-2 text-amber-400">
            <Crown size={18} />
            <span className="font-mono">{balance}</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="bg-slate-900/50 rounded-2xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-2xl font-bold">
                {playerPass.currentLevel}
              </div>
              <div>
                <p className="text-sm text-slate-400">当前等级</p>
                <p className="text-lg font-bold">{playerPass.currentLevel} / {season.maxLevel}</p>
              </div>
            </div>
            
            {!playerPass.isPremium && (
              <button
                onClick={onPurchasePremium}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-lg font-bold text-black text-sm hover:scale-105 transition-transform shadow-lg"
              >
                升级高级版 ¥{season.premiumPrice / 10}
              </button>
            )}
            
            {playerPass.isPremium && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-full border border-amber-500/50">
                <Crown size={16} className="text-amber-400" />
                <span className="text-amber-400 text-sm font-bold">高级版</span>
              </div>
            )}
          </div>

          {/* XP Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>经验值</span>
              <span>{levelProgress.current} / {levelProgress.required}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress.percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 max-w-4xl mx-auto">
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl">
          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'rewards' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift size={16} className="inline mr-2" />
            等级奖励
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'tasks' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Star size={16} className="inline mr-2" />
            任务
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'rewards' ? (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {season.levels.map((level) => (
                <LevelRewardRow
                  key={level.level}
                  level={level}
                  currentLevel={playerPass.currentLevel}
                  isPremium={playerPass.isPremium}
                  claimedFree={playerPass.claimedFreeRewards.includes(level.level)}
                  claimedPremium={playerPass.claimedPremiumRewards.includes(level.level)}
                  onClaimFree={() => handleClaimLevelReward(level.level, false)}
                  onClaimPremium={() => handleClaimLevelReward(level.level, true)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Daily Tasks */}
              <TaskSection
                title="每日任务"
                icon={<Clock size={18} className="text-blue-400" />}
                tasks={dailyTasks}
                onClaim={handleClaimTaskReward}
              />

              {/* Weekly Tasks */}
              <TaskSection
                title="周常任务"
                icon={<Star size={18} className="text-amber-400" />}
                tasks={weeklyTasks}
                onClaim={handleClaimTaskReward}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============ Sub-Components ============

interface LevelRewardRowProps {
  level: BattlePassLevel;
  currentLevel: number;
  isPremium: boolean;
  claimedFree: boolean;
  claimedPremium: boolean;
  onClaimFree: () => void;
  onClaimPremium: () => void;
}

const LevelRewardRow: React.FC<LevelRewardRowProps> = ({
  level,
  currentLevel,
  isPremium,
  claimedFree,
  claimedPremium,
  onClaimFree,
  onClaimPremium
}) => {
  const isUnlocked = currentLevel >= level.level;
  const canClaimFree = isUnlocked && level.freeReward && !claimedFree;
  const canClaimPremium = isUnlocked && isPremium && level.premiumReward && !claimedPremium;

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-xl border transition-all
      ${isUnlocked 
        ? 'bg-slate-900/50 border-purple-500/30' 
        : 'bg-slate-900/20 border-slate-700/30 opacity-60'
      }
    `}>
      {/* Level Number */}
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm
        ${isUnlocked ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}
      `}>
        {level.level}
      </div>

      {/* Free Reward */}
      <div className="flex-1 flex items-center gap-2">
        {level.freeReward ? (
          <RewardBadge
            reward={level.freeReward}
            claimed={claimedFree}
            locked={!isUnlocked}
            onClaim={canClaimFree ? onClaimFree : undefined}
          />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-600">
            —
          </div>
        )}
      </div>

      {/* Premium Reward */}
      <div className="flex items-center gap-2">
        {level.premiumReward && (
          <RewardBadge
            reward={level.premiumReward}
            claimed={claimedPremium}
            locked={!isUnlocked || !isPremium}
            isPremium
            onClaim={canClaimPremium ? onClaimPremium : undefined}
          />
        )}
        {!isPremium && (
          <Lock size={14} className="text-slate-600" />
        )}
      </div>
    </div>
  );
};

interface RewardBadgeProps {
  reward: any;
  claimed: boolean;
  locked: boolean;
  isPremium?: boolean;
  onClaim?: () => void;
}

const RewardBadge: React.FC<RewardBadgeProps> = ({ reward, claimed, locked, isPremium, onClaim }) => {
  return (
    <button
      onClick={onClaim}
      disabled={!onClaim}
      className={`
        relative px-3 py-2 rounded-lg flex items-center gap-2 transition-all
        ${claimed 
          ? 'bg-green-900/30 border border-green-500/30' 
          : locked 
            ? 'bg-slate-800/50 border border-slate-700/30' 
            : isPremium
              ? 'bg-amber-900/30 border border-amber-500/50 hover:bg-amber-900/50'
              : 'bg-purple-900/30 border border-purple-500/50 hover:bg-purple-900/50'
        }
        ${onClaim ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <span className="text-lg">{reward.icon}</span>
      <span className="text-xs font-medium">{reward.name}</span>
      
      {claimed && (
        <CheckCircle size={14} className="text-green-400 absolute -top-1 -right-1" />
      )}
    </button>
  );
};

interface TaskSectionProps {
  title: string;
  icon: React.ReactNode;
  tasks: BattlePassTask[];
  onClaim: (taskId: string) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({ title, icon, tasks, onClaim }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onClaim={() => onClaim(task.id)} />
        ))}
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: BattlePassTask;
  onClaim: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClaim }) => {
  const progress = Math.min(task.current / task.target, 1);
  const canClaim = task.isCompleted && !task.isClaimed;

  return (
    <div className={`
      p-4 rounded-xl border transition-all
      ${task.isClaimed 
        ? 'bg-green-900/20 border-green-500/30' 
        : task.isCompleted 
          ? 'bg-amber-900/20 border-amber-500/50 animate-pulse' 
          : 'bg-slate-900/50 border-slate-700/30'
      }
    `}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-bold">{task.name}</h4>
          <p className="text-sm text-slate-400">{task.description}</p>
        </div>
        
        <div className="flex items-center gap-1 text-purple-400 font-bold text-sm">
          <Star size={14} />
          {task.xpReward} XP
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              task.isCompleted ? 'bg-green-500' : 'bg-purple-500'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 min-w-[50px] text-right">
          {task.current}/{task.target}
        </span>
        
        {canClaim && (
          <button
            onClick={onClaim}
            className="px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors"
          >
            领取
          </button>
        )}
        
        {task.isClaimed && (
          <CheckCircle size={16} className="text-green-400" />
        )}
      </div>
    </div>
  );
};

export default BattlePassPage;
