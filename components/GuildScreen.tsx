/**
 * GuildScreen — 公会系统 UI
 *
 * 公会管理、成员列表、公会任务、捐献
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Users, ChevronLeft } from 'lucide-react';
import { GuildService, Guild } from '../services/GuildService';
import { useUserStore } from '../stores/useUserStore';
import { useToastStore } from '../stores/useToastStore';

interface GuildScreenProps {
  onBack: () => void;
}

export const GuildScreen: React.FC<GuildScreenProps> = ({ onBack }) => {
  const [guild, setGuild] = useState<Guild | null>(() => GuildService.load());
  const [view, setView] = useState<'main' | 'create' | 'members' | 'quests'>('main');
  const [guildName, setGuildName] = useState('');
  const [guildDesc, setGuildDesc] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🏰');
  const [contributeAmount, setContributeAmount] = useState(50);
  const balance = useUserStore(s => s.balance);
  const adjustBalance = useUserStore(s => s.adjustUserBalance);
  const activeAddress = useUserStore(s => s.activeAddress);
  const toast = useToastStore();

  const icons = GuildService.getIcons();

  const handleCreateGuild = useCallback(async () => {
    if (!guildName.trim()) {
      toast.warning('请输入公会名称', '');
      return;
    }
    if (balance < GuildService.getConfig().CREATION_COST) {
      toast.error('法力不足', `创建公会需要 ${GuildService.getConfig().CREATION_COST} 法力`);
      return;
    }
    await adjustBalance(-GuildService.getConfig().CREATION_COST, 'guild_create');
    const newGuild = GuildService.createGuild(
      activeAddress || 'local',
      '法师',
      guildName.trim(),
      guildDesc.trim(),
      selectedIcon
    );
    GuildService.save(newGuild);
    setGuild(newGuild);
    setView('main');
    toast.success('公会创建成功！', guildName);
  }, [guildName, guildDesc, selectedIcon, balance, adjustBalance, activeAddress, toast]);

  const handleContribute = useCallback(async () => {
    if (!guild) return;
    if (balance < contributeAmount) {
      toast.error('法力不足', '');
      return;
    }
    await adjustBalance(-contributeAmount, 'guild_contribute');
    const updated = GuildService.contribute(guild, activeAddress || 'local', contributeAmount);
    GuildService.save(updated);
    setGuild(updated);
    toast.success('捐献成功', `贡献了 ${contributeAmount} 法力`);
  }, [guild, contributeAmount, balance, adjustBalance, activeAddress, toast]);

  // 生成每周任务
  useEffect(() => {
    if (guild && guild.quests.length === 0) {
      const quests = GuildService.generateWeeklyQuests();
      const updated = { ...guild, quests };
      GuildService.save(updated);
      setGuild(updated);
    }
  }, [guild]);

  // 没有公会
  if (!guild) {
    if (view === 'create') {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 pt-8">
          <div className="w-full max-w-md">
            <button onClick={() => setView('main')} className="text-gray-400 hover:text-white mb-4 flex items-center gap-1 text-sm">
              <ChevronLeft size={16} /> 返回
            </button>
            <h2 className="text-2xl font-bold text-blue-400 mb-6 text-center">创建公会</h2>

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">公会名称</label>
              <input
                value={guildName}
                onChange={e => setGuildName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="输入公会名称..."
                maxLength={20}
              />
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">公会描述</label>
              <textarea
                value={guildDesc}
                onChange={e => setGuildDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white h-20 resize-none"
                placeholder="介绍你的公会..."
                maxLength={100}
              />
            </div>

            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block">公会图标</label>
              <div className="flex flex-wrap gap-2">
                {icons.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                      selectedIcon === icon ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4 text-center">
              创建费用：{GuildService.getConfig().CREATION_COST} 法力 · 当前：{balance}
            </p>

            <button
              onClick={handleCreateGuild}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors"
            >
              创建公会
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏰</div>
          <h1 className="text-3xl font-bold text-blue-400 font-wizard mb-2">公会</h1>
          <p className="text-gray-400">加入或创建公会，与同伴并肩作战！</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold border border-white/10">
            返回
          </button>
          <button
            onClick={() => setView('create')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors"
          >
            创建公会
          </button>
        </div>
      </div>
    );
  }

  // 有公会 - 主界面
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 pt-6">
      {/* 公会信息 */}
      <div className="w-full max-w-lg mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-3 flex items-center gap-1 text-sm">
          <ChevronLeft size={16} /> 返回
        </button>

        <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{guild.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-blue-300">{guild.name}</h2>
              <p className="text-xs text-gray-400">Lv.{guild.level} · {guild.members.length}/{guild.maxMembers} 成员</p>
            </div>
          </div>
          {guild.motd && <p className="text-xs text-gray-400 bg-slate-900/50 rounded px-3 py-1.5">{guild.motd}</p>}

          {/* 经验条 */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>公会经验</span>
              <span>{guild.experience}/{GuildService.getConfig().EXP_PER_LEVEL}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${(guild.experience / GuildService.getConfig().EXP_PER_LEVEL) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 捐献 */}
      <div className="w-full max-w-lg mb-4 bg-slate-900/40 border border-slate-700/30 rounded-xl p-4">
        <h3 className="text-sm font-bold text-amber-400 mb-2">捐献法力</h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {[10, 50, 100, 200].map(amt => (
              <button
                key={amt}
                onClick={() => setContributeAmount(amt)}
                className={`px-3 py-1 rounded text-xs ${
                  contributeAmount === amt ? 'bg-amber-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
          <button
            onClick={handleContribute}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-sm font-bold transition-colors"
          >
            捐献
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">捐献获取公会经验，每 10 法力 = 1 经验</p>
      </div>

      {/* 公会任务 */}
      {guild.quests.length > 0 && (
        <div className="w-full max-w-lg mb-4">
          <h3 className="text-sm font-bold text-violet-400 mb-2">公会任务</h3>
          <div className="space-y-2">
            {guild.quests.map(quest => (
              <div key={quest.id} className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-white">{quest.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    quest.current >= quest.target ? 'bg-green-600/20 text-green-400' : 'bg-slate-700/50 text-gray-400'
                  }`}>
                    {quest.current}/{quest.target}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1">{quest.description}</p>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all"
                    style={{ width: `${Math.min(100, (quest.current / quest.target) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>奖励：{quest.reward.gold} 法力 + {quest.reward.pack} 卡包</span>
                  {quest.current >= quest.target && <span className="text-green-400">✓ 可领取</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 成员列表 */}
      <div className="w-full max-w-lg mb-4">
        <h3 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-1">
          <Users size={14} /> 成员 ({guild.members.length})
        </h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {GuildService.getLeaderboardData(guild).map(member => (
            <div key={member.userId} className="flex items-center justify-between bg-slate-900/30 rounded px-3 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className={member.role === 'leader' ? 'text-amber-400' : member.role === 'officer' ? 'text-blue-400' : 'text-gray-400'}>
                  {member.role === 'leader' ? '👑' : member.role === 'officer' ? '⭐' : '👤'}
                </span>
                <span className="text-gray-300">{member.username}</span>
              </div>
              <span className="text-gray-500">贡献: {member.contributions}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
