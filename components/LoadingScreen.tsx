import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { PreloadProgress } from '../hooks/usePreloader';

interface LoadingScreenProps {
  progress: PreloadProgress;
  onComplete?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, onComplete }) => {
  // 预生成背景粒子位置（解决性能与抖动问题）
  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    opacity: 0.3 + Math.random() * 0.5,
  })), []);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center z-50">
      {/* 背景魔法粒子 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* Logo Image */}
      <div className="relative mb-6">
        <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden border-4 border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.4)] animate-float">
          <img 
            src="/pwa-512x512.png" 
            alt="Wizard Duel Logo" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Logo Text */}
      <div className="relative mb-12">
        <h1 className="text-5xl md:text-6xl font-wizard font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400">
          WIZARD DUEL
        </h1>
        <div className="absolute -inset-4 bg-purple-500/20 blur-2xl rounded-full -z-10 animate-pulse" />
      </div>

      {/* 加载图标 */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-4 border-purple-500/30 flex items-center justify-center">
          <Sparkles size={40} className="text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
      </div>

      {/* 进度条 */}
      <div className="w-64 md:w-80 space-y-3">
        <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden border border-purple-500/30">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 transition-all duration-300 ease-out"
            style={{ width: `${progress.percentage}%` }}
          >
            {/* 进度条光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* 进度文字 */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-purple-300 font-tech uppercase tracking-wider">
            Loading...
          </span>
          <span className="text-purple-400 font-mono font-bold">
            {progress.percentage}%
          </span>
        </div>

        {/* 当前加载项 */}
        <div className="text-center">
          <p className="text-gray-500 text-[10px] font-tech truncate max-w-full">
            {progress.currentItem || 'Preparing magical resources...'}
          </p>
        </div>
      </div>

      {/* 加载完成提示 */}
      {progress.isComplete && (
        <button
          onClick={onComplete}
          className="mt-8 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-wizard font-bold text-white hover:scale-105 transition-transform border border-purple-400/50 shadow-lg shadow-purple-500/30 animate-bounce"
        >
          进入游戏
        </button>
      )}

      {/* 版本号 */}
      <p className="absolute bottom-4 text-gray-600 text-xs font-tech">
        v1.0.0 | Antigravity Interactive
      </p>
    </div>
  );
};

export default LoadingScreen;
