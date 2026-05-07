/**
 * EndlessTowerScreen — 无尽塔模式 UI
 *
 * Roguelike 爬塔，选择遗物，逐层挑战
 */

import React, { useState, useCallback, useEffect } from 'react';
import { TowerControl, Heart, Coins, ChevronRight, Trophy } from 'lucide-react';
import { EndlessTowerService, TowerRun } from '../services/EndlessTowerService';
import type { Artifact } from '../types/dungeon';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { useToastStore } from '../stores/useToastStore';

interface EndlessTowerScreenProps {
  onBack: () => void;
}

export const EndlessTowerScreen: React.FC<EndlessTowerScreenProps> = ({ onBack }) => {
  const [run, setRun] = useState<TowerRun | null>(() => EndlessTowerService.load());
  const [showArtifactChoice, setShowArtifactChoice] = useState(false);
  const [artifactOptions, setArtifactOptions] = useState<Artifact[]>([]);
  const selectedDeck = useUserStore(s => s.selectedDeck);
  const adjustBalance = useUserStore(s => s.adjustUserBalance);
  const setGameState = useUIStore(s => s.setGameState);
  const setGameMode = useUIStore(s => s.setGameMode);
  const toast = useToastStore();

  // 检查是否需要显示遗物选择
  useEffect(() => {
    if (!run || run.status !== 'active') return;
    const floor = run.floors[run.currentFloor];
    if (floor?.cleared && floor.reward.artifactChoices && floor.reward.artifactChoices.length > 0) {
      setArtifactOptions(floor.reward.artifactChoices);
      setShowArtifactChoice(true);
    }
  }, [run?.currentFloor, run?.floors, run?.status]);

  const handleStartRun = useCallback(() => {
    if (!selectedDeck) {
      toast.warning('需要牌组', '请先选择一个牌组！');
      return;
    }
    const newRun = EndlessTowerService.startRun('local', selectedDeck.cards);
    setRun(newRun);
    EndlessTowerService.save(newRun);
    toast.info('无尽塔', '冒险开始！');
  }, [selectedDeck, toast]);

  const handleStartFloorBattle = useCallback(() => {
    if (!run) return;
    setGameMode('endless_tower');
    setGameState('MATCHMAKING');
  }, [run, setGameMode, setGameState]);

  const handlePickArtifact = useCallback((artifact: Artifact) => {
    if (!run) return;
    const updated = EndlessTowerService.pickArtifact(run, artifact);
    setRun(updated);
    EndlessTowerService.save(updated);
    setShowArtifactChoice(false);
    toast.success('获得遗物', artifact.name);
  }, [run, toast]);

  const handleRest = useCallback(() => {
    if (!run) return;
    const updated = EndlessTowerService.rest(run);
    setRun(updated);
    EndlessTowerService.save(updated);
    toast.success('休息', '恢复了 30% 生命值');
  }, [run, toast]);

  const handleClaimRewards = useCallback(async () => {
    if (!run) return;
    const rewards = EndlessTowerService.calculateFinalRewards(run);
    if (rewards.gold > 0) {
      await adjustBalance(rewards.gold, 'tower_reward');
    }
    toast.success('冒险结算', `获得 ${rewards.gold} 法力，${rewards.packs} 卡包`);
    EndlessTowerService.clear();
    setRun(null);
  }, [run, adjustBalance, toast]);

  // 没有进行中的冒险
  if (!run || run.status === 'defeated' || run.status === 'completed') {
    const showRewards = run && (run.status === 'defeated' || run.status === 'completed');
    const rewards = run ? EndlessTowerService.calculateFinalRewards(run) : null;
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🗼</div>
          <h1 className="text-3xl font-bold text-violet-400 font-wizard mb-2">无尽之塔</h1>
          <p className="text-gray-400">挑战无穷无尽的敌人，收集遗物强化自己！</p>
        </div>

        {showRewards && rewards && (
          <div className="bg-slate-900/80 border border-violet-500/30 rounded-xl p-6 mb-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-violet-400 mb-2 text-center">
              {run.status === 'completed' ? '🎉 通关！' : '💀 冒险结束'}
            </h2>
            <p className="text-center text-gray-400 mb-4">到达第 {run.maxFloor} 层</p>
            <div className="text-center text-3xl font-bold mb-4">
              积分：{run.score}
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm bg-slate-800/50 rounded px-3 py-2">
                <span>💰 法力</span>
                <span className="text-amber-400">+{rewards.gold}</span>
              </div>
              <div className="flex justify-between text-sm bg-slate-800/50 rounded px-3 py-2">
                <span>📦 卡包</span>
                <span className="text-amber-400">+{rewards.packs}</span>
              </div>
            </div>
            <button
              onClick={handleClaimRewards}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-bold transition-colors"
            >
              领取奖励
            </button>
          </div>
        )}

        <div className="bg-slate-900/60 border border-violet-500/20 rounded-xl p-4 mb-6 max-w-md w-full">
          <h3 className="text-sm text-violet-400 mb-3">规则说明</h3>
          <ul className="text-xs text-gray-400 space-y-1.5">
            <li>• 逐层挑战敌人，难度递增</li>
            <li>• 每 5 层挑战 BOSS</li>
            <li>• 击败精英/BOSS 可选择遗物增益</li>
            <li>• 休息层恢复 30% 生命值</li>
            <li>• 初始生命值 80，失败即结束</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold border border-white/10">
            返回
          </button>
          <button
            onClick={handleStartRun}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <TowerControl size={18} />
            开始攀登
          </button>
        </div>
      </div>
    );
  }

  // 进行中
  const currentFloor = run.floors[run.currentFloor];
  const enemy = currentFloor ? EndlessTowerService.getEnemy(currentFloor) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 pt-6">
      {/* 状态栏 */}
      <div className="w-full max-w-lg mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-violet-400">无尽之塔</h2>
          <span className="text-sm text-gray-400">第 {run.currentFloor + 1} 层</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-900/60 rounded-lg p-2 flex items-center justify-center gap-1">
            <Heart size={12} className="text-red-400" />
            <span className="text-red-300">{run.playerHp}/{run.maxHp}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-2 flex items-center justify-center gap-1">
            <Coins size={12} className="text-amber-400" />
            <span className="text-amber-300">{run.gold}</span>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-2 flex items-center justify-center gap-1">
            <Trophy size={12} className="text-violet-400" />
            <span className="text-violet-300">{run.score}</span>
          </div>
        </div>
        {/* HP条 */}
        <div className="w-full h-3 bg-slate-800 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${(run.playerHp / run.maxHp) * 100}%` }}
          />
        </div>
      </div>

      {/* 当前楼层 */}
      {currentFloor && (
        <div className="bg-slate-900/60 border border-violet-500/20 rounded-xl p-5 max-w-md w-full mb-4">
          <div className="text-center">
            <div className="text-3xl mb-2">
              {currentFloor.type === 'boss' ? '👹' : currentFloor.type === 'elite' ? '💀' : currentFloor.type === 'rest' ? '🏕️' : currentFloor.type === 'treasure' ? '💎' : '⚔️'}
            </div>
            <h3 className="text-lg font-bold text-violet-300 mb-1">
              {currentFloor.type === 'boss' ? 'BOSS 层' : currentFloor.type === 'elite' ? '精英层' : currentFloor.type === 'rest' ? '休息站' : currentFloor.type === 'treasure' ? '宝藏层' : `战斗层 ${currentFloor.floor}`}
            </h3>
            {enemy && (
              <div className="text-sm text-gray-400 mb-2">
                {enemy.name} · HP: {enemy.hp} · ATK: {enemy.atk}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 遗物选择 */}
      {showArtifactChoice && artifactOptions && artifactOptions.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-violet-500/30 rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold text-violet-400 mb-4 text-center">选择一个遗物</h3>
            <div className="grid grid-cols-1 gap-3">
              {artifactOptions.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => handlePickArtifact(artifact)}
                  className="bg-slate-800/50 hover:bg-slate-800 border border-violet-500/20 hover:border-violet-400/50 rounded-lg p-3 text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{artifact.icon}</span>
                    <div>
                      <div className="font-bold text-violet-300 text-sm">{artifact.name}</div>
                      <div className="text-xs text-gray-400">{artifact.description}</div>
                    </div>
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded ${
                      artifact.rarity === 'LEGENDARY' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {artifact.rarity === 'LEGENDARY' ? '传说' : '稀有'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 遗物栏 */}
      {run.artifacts.length > 0 && (
        <div className="max-w-md w-full mb-4">
          <p className="text-xs text-gray-500 mb-1">遗物</p>
          <div className="flex flex-wrap gap-1">
            {run.artifacts.map((a) => (
              <span key={a.id} className="text-sm bg-violet-900/30 rounded px-2 py-0.5 text-violet-300" title={a.description}>
                {a.icon} {a.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3 mt-auto mb-4">
        {currentFloor?.type === 'rest' ? (
          <button
            onClick={handleRest}
            className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold transition-colors"
          >
            🏕️ 休息（恢复 30% HP）
          </button>
        ) : (
          <button
            onClick={handleStartFloorBattle}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <ChevronRight size={18} />
            挑战
          </button>
        )}
      </div>
    </div>
  );
};
