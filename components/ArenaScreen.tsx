/**
 * ArenaScreen — 竞技场模式 UI
 *
 * Draft 选牌 → 战斗 → 结算
 */

import React, { useState, useCallback } from 'react';
import { Swords, Trophy, ChevronRight } from 'lucide-react';
import { ArenaService, ArenaRun, ARENA_CONFIG } from '../services/ArenaService';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { useToastStore } from '../stores/useToastStore';
import { SPELLS } from '../constants';
import { SpellType } from '../types';
import { SpellCard } from './SpellCard';

interface ArenaScreenProps {
  onBack: () => void;
}

export const ArenaScreen: React.FC<ArenaScreenProps> = ({ onBack }) => {
  const [run, setRun] = useState<ArenaRun | null>(() => ArenaService.load());
  const balance = useUserStore(s => s.balance);
  const adjustBalance = useUserStore(s => s.adjustUserBalance);
  const setGameState = useUIStore(s => s.setGameState);
  const setGameMode = useUIStore(s => s.setGameMode);
  const toast = useToastStore();

  const handleStartRun = useCallback(async () => {
    if (balance < ARENA_CONFIG.ENTRY_FEE) {
      toast.error('法力不足', `竞技场入场需要 ${ARENA_CONFIG.ENTRY_FEE} 法力`);
      return;
    }
    await adjustBalance(-ARENA_CONFIG.ENTRY_FEE, 'arena_entry');
    const newRun = ArenaService.startRun('local');
    setRun(newRun);
    ArenaService.save(newRun);
    toast.info('竞技场开始', '选择你的卡牌来构筑牌组！');
  }, [balance, adjustBalance, toast]);

  const handlePick = useCallback((cardId: SpellType) => {
    if (!run) return;
    const updated = ArenaService.makePick(run, cardId);
    setRun(updated);
    ArenaService.save(updated);

    if (updated.status === 'active') {
      toast.success('选牌完成', `${updated.deck.length} 张卡牌已选择！准备战斗！`);
    }
  }, [run]);

  const handleStartBattle = useCallback(() => {
    if (!run) return;
    setGameMode('arena');
    setGameState('MATCHMAKING');
  }, [run, setGameMode, setGameState]);

  const handleClaimRewards = useCallback(async () => {
    if (!run) return;
    const totalGold = run.rewards.reduce((sum, r) => r.type === 'gold' ? sum + r.amount : sum, 0);
    if (totalGold > 0) {
      await adjustBalance(totalGold, 'arena_reward');
    }
    toast.success('奖励已领取', `获得 ${totalGold} 法力`);
    ArenaService.clear();
    setRun(null);
  }, [run, adjustBalance, toast]);

  const handleRetire = useCallback(() => {
    if (!run) return;
    const rewards = ArenaService.calculateRewards(run.wins);
    const updatedRun = { ...run, status: 'completed' as const, rewards, completedAt: Date.now() };
    setRun(updatedRun);
    ArenaService.save(updatedRun);
    toast.info('已退役', `最终战绩：${run.wins}胜 ${run.losses}负`);
  }, [run, toast]);

  // 没有进行中的竞技场
  if (!run || run.status === 'completed') {
    const showRewards = run?.status === 'completed';
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏟️</div>
          <h1 className="text-3xl font-bold text-amber-400 font-wizard mb-2">竞技场</h1>
          <p className="text-gray-400">随机选牌构筑牌组，追求12胜荣耀！</p>
        </div>

        {showRewards && run && (
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-6 mb-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-amber-400 mb-4 text-center">
              <Trophy className="inline mr-2" size={20} />
              竞技场结算
            </h2>
            <div className="text-center text-2xl font-bold mb-4">
              {run.wins}胜 {run.losses}负
            </div>
            <div className="space-y-2 mb-4">
              {run.rewards.map((r, i) => (
                <div key={i} className="flex justify-between text-sm bg-slate-800/50 rounded px-3 py-2">
                  <span>{r.type === 'gold' ? '💰 法力' : r.type === 'pack' ? '📦 卡包' : '🃏 卡牌'}</span>
                  <span className="text-amber-400">+{r.amount}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleClaimRewards}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold transition-colors"
            >
              领取奖励
            </button>
          </div>
        )}

        <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4 mb-6 max-w-md w-full text-center">
          <p className="text-sm text-gray-300 mb-2">入场费：<span className="text-amber-400 font-bold">{ARENA_CONFIG.ENTRY_FEE} 法力</span></p>
          <p className="text-xs text-gray-500">当前法力：{balance}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold border border-white/10"
          >
            返回
          </button>
          <button
            onClick={handleStartRun}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <Swords size={18} />
            开始竞技场
          </button>
        </div>
      </div>
    );
  }

  // 选牌阶段
  if (run.status === 'drafting') {
    const currentChoices = run.draftChoices[run.currentDraftPick] || [];
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-amber-400">
            选牌阶段 ({run.deck.length}/{ARENA_CONFIG.DECK_SIZE})
          </h2>
          <p className="text-sm text-gray-400">选择第 {run.deck.length + 1} 张卡牌</p>
          {/* 进度条 */}
          <div className="w-48 h-2 bg-slate-800 rounded-full mt-2 mx-auto overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(run.deck.length / ARENA_CONFIG.DECK_SIZE) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex gap-4 justify-center flex-wrap my-6">
          {currentChoices.map((cardId) => {
            const spell = SPELLS.find(s => s.id === cardId);
            if (!spell) return null;
            return (
              <div key={cardId} className="cursor-pointer transform hover:scale-105 transition-transform">
                <SpellCard
                  spell={spell}
                  onClick={() => handlePick(cardId)}
                />
              </div>
            );
          })}
        </div>

        {/* 已选牌组预览 */}
        {run.deck.length > 0 && (
          <div className="mt-auto w-full max-w-lg">
            <p className="text-xs text-gray-500 mb-2 text-center">已选卡牌</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {run.deck.map((id, i) => {
                const spell = SPELLS.find(s => s.id === id);
                return (
                  <span key={i} className="text-[10px] bg-slate-800 rounded px-1.5 py-0.5 text-gray-400">
                    {spell?.name || id}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 战斗阶段
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">⚔️</div>
        <h2 className="text-2xl font-bold text-amber-400 mb-2">竞技场对战</h2>
        <p className="text-lg text-gray-300">
          {run.wins}胜 {run.losses}负
        </p>
        <div className="flex gap-1 justify-center mt-2">
          {Array.from({ length: ARENA_CONFIG.MAX_WINS }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ${i < run.wins ? 'bg-amber-400' : 'bg-slate-700'}`}
            />
          ))}
        </div>
        <div className="flex gap-1 justify-center mt-1">
          {Array.from({ length: ARENA_CONFIG.MAX_LOSSES }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ${i < run.losses ? 'bg-red-500' : 'bg-slate-700'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRetire}
          className="px-6 py-3 bg-red-600/20 hover:bg-red-600/30 rounded-xl font-bold border border-red-500/30 text-red-400"
        >
          退役
        </button>
        <button
          onClick={handleStartBattle}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors flex items-center gap-2"
        >
          <ChevronRight size={18} />
          开始战斗
        </button>
      </div>
    </div>
  );
};
