import React from 'react';
import { Crown, Zap, Sparkles, Skull } from 'lucide-react';
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
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full mb-8">
        {/* 标准模式 */}
        <div
          onClick={() => onSelectMode('standard')}
          className="group relative bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 cursor-pointer hover:border-blue-400/50 transition-all duration-300 hover:scale-105"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Crown size={24} className="text-white" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-3 text-blue-400">
              标准模式
            </h3>
            
            <p className="text-gray-400 text-center mb-4 text-sm leading-relaxed flex-1">
              竞技体验的首选。包含最平衡的卡牌。
            </p>
            
            <div className="space-y-1.5 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-green-400" />
                <span>核心 + 经典卡牌</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-green-400" />
                <span>公平对战</span>
              </div>
            </div>
          </div>
        </div>

        {/* 冒险模式 (新) */}
        <div
          onClick={() => onSelectMode('wild' as any)} // For now reuse wild or better yet, change the GameMode type
          className="group relative bg-gradient-to-br from-purple-600/30 to-indigo-900/40 border border-purple-500/50 rounded-2xl p-6 cursor-pointer hover:border-purple-400 transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-800 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse">
                <Skull size={28} className="text-white" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-3 text-purple-300">
              地牢冒险
            </h3>
            
            <p className="text-gray-300 text-center mb-4 text-xs italic font-medium">
              "在这片被遗忘的地牢中，只有最强者才能生存..."
            </p>
            
            <div className="space-y-1.5 text-[11px] text-purple-200/70">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-purple-400" />
                <span>肉鸽关卡探索</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-purple-400" />
                <span>获得传奇神器</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-purple-400" />
                <span>逐步构筑遗物</span>
              </div>
            </div>

            <div className="mt-4 py-1.5 bg-purple-500/20 rounded-lg text-center border border-purple-500/30">
                <span className="text-[10px] font-black text-purple-200 uppercase tracking-widest">单人挑战</span>
            </div>
          </div>
        </div>

        {/* 狂野模式 */}
        <div
          onClick={() => onSelectMode('wild')}
          className="group relative bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-6 cursor-pointer hover:border-orange-400/50 transition-all duration-300 hover:scale-105"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-red-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <Zap size={24} className="text-white" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-3 text-orange-400">
              狂野模式
            </h3>
            
            <p className="text-gray-400 text-center mb-4 text-sm leading-relaxed flex-1">
              包含所有卡牌，释放最终创造力。
            </p>
            
            <div className="space-y-1.5 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-yellow-400" />
                <span>所有卡牌可用</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-yellow-400" />
                <span>适合搞怪构筑</span>
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