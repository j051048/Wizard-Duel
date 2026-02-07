import React from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const OrientationWarning: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center text-center p-8 backdrop-blur-xl">
      <div className="relative mb-8">
        <Smartphone size={64} className="text-white/20" />
        <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
            <RotateCw size={32} className="text-purple-400" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-4 tracking-wider">请旋转设备</h2>
      <p className="text-gray-400 max-w-xs leading-relaxed">
        为了获得最佳的游戏体验，请将您的设备旋转至<span className="text-purple-300 font-bold mx-1">竖屏模式</span>。
      </p>

      <div className="mt-12 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};
