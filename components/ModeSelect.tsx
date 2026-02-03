import React from 'react';
import { Crown, Zap, Sparkles } from 'lucide-react';
import { GameMode } from '../types';

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onBackToLobby: () => void;
}

export const ModeSelect: React.FC<ModeSelectProps> = ({ onSelectMode, onBackToLobby }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      {/* 标题 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          选择游戏模式
        </h1>
        <p className="text-gray-400 text-lg">
          选择适合你的游戏体验
        </p>
      </div>

      {/* 模式选择 */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full mb-8">
        {/* 标准模式 */}
        <div
          onClick={() => onSelectMode('standard')}
          className="group relative bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8 cursor-pointer hover:border-blue-400/50 transition-all duration-300 hover:scale-105"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Crown size={32} className="text-white" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-center mb-4 text-blue-400">
              标准模式
            </h3>
            
            <p className="text-gray-300 text-center mb-6 leading-relaxed">
              竞技体验的首选。包含当前最平衡的卡牌组合，为竞技玩家提供公平的竞争环境。
            </p>
            
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-green-400" />
                <span>核心 + 经典 + 竞技场卡牌</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-green-400" />
                <span>定期轮换，保持新鲜感</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-green-400" />
                <span>适合竞技对战</span>
              </div>
            </div>
          </div>
        </div>

        {/* 狂野模式 */}
        <div
          onClick={() => onSelectMode('wild')}
          className="group relative bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-8 cursor-pointer hover:border-orange-400/50 transition-all duration-300 hover:scale-105"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-red-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <Zap size={32} className="text-white" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-center mb-4 text-orange-400">
              狂野模式
            </h3>
            
            <p className="text-gray-300 text-center mb-6 leading-relaxed">
              释放你的创造力。包含所有扩展包的卡牌，为休闲玩家提供无限可能。
            </p>
            
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-400" />
                <span>所有扩展包卡牌</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-400" />
                <span>英雄技能可用</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-400" />
                <span>适合创意构筑</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 返回按钮 */}
      <button
        onClick={onBackToLobby}
        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors duration-200"
      >
        返回大厅
      </button>
    </div>
  );
};