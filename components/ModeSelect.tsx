import React from 'react';
import { Crown, Zap, Sparkles, Skull } from 'lucide-react';
import { GameMode } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTranslation } from '../i18n';

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onBackToLobby: () => void;
}

export const ModeSelect: React.FC<ModeSelectProps> = ({ onSelectMode, onBackToLobby }) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  return (
    <div className={`min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950`}>
      <div className={`text-center ${isMobile ? 'mb-6 mt-4' : 'mb-12'}`}>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-wizard font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-widest`}>
          {t('Select Game Mode')}
        </h1>
        <p className={`${isMobile ? 'text-xs' : 'text-lg'} text-gray-400 uppercase tracking-tighter`}>
          {t('Choose the experience for you')}
        </p>
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-4 md:gap-6 max-w-6xl w-full mb-8 overflow-y-auto no-scrollbar`}>
        <div
          onClick={() => onSelectMode('standard')}
          className="group relative bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-4 md:p-6 cursor-pointer hover:border-blue-400/50 transition-all duration-300 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Crown size={isMobile ? 20 : 24} className="text-white" />
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-center mb-2 md:mb-3 text-blue-400 font-wizard">
              {t('Standard Mode')}
            </h3>
            <p className="text-gray-400 text-center mb-4 text-xs md:text-sm leading-relaxed flex-1 line-clamp-2">
              {t('Primary competitive experience. Balanced card pool.')}
            </p>
            <div className={`space-y-1.5 text-[10px] md:text-[11px] text-gray-500 ${isMobile ? 'flex flex-row justify-center gap-4 space-y-0' : ''}`}>
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-green-400" />
                <span>{t('Core Balanced Mode')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-green-400" />
                <span>{t('Fair Match')}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => onSelectMode('dungeon')}
          className="group relative bg-gradient-to-br from-purple-600/30 to-indigo-900/40 border border-purple-500/50 rounded-2xl p-4 md:p-6 cursor-pointer hover:border-purple-400 transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-800 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse">
                <Skull size={isMobile ? 24 : 28} className="text-white" />
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-center mb-2 md:mb-3 text-purple-300 font-wizard">
              {t('Dungeon Adventure')}
            </h3>
            <p className="text-gray-300 text-center mb-4 text-[10px] md:text-xs italic font-medium leading-tight">
              "{t('Dungeon Flavor Text')}"
            </p>
            <div className={`space-y-1 md:space-y-1.5 text-[9px] md:text-[11px] text-purple-200/70 ${isMobile ? 'grid grid-cols-2 gap-2 space-y-0' : ''}`}>
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-purple-400" />
                <span>{t('Roguelike Exploration')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-purple-400" />
                <span>{t('Acquire Legendary Artifacts')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-purple-400" />
                <span>{t('Build Relics Progressively')}</span>
              </div>
            </div>
            <div className="mt-4 py-1.5 bg-purple-500/20 rounded-lg text-center border border-purple-500/30">
                <span className="text-[10px] font-black text-purple-200 uppercase tracking-widest">{t('Solo Challenge')}</span>
            </div>
          </div>
        </div>

        <div
          onClick={() => onSelectMode('wild')}
          className="group relative bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-4 md:p-6 cursor-pointer hover:border-orange-400/50 transition-all duration-300 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-red-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <Zap size={isMobile ? 20 : 24} className="text-white" />
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-center mb-2 md:mb-3 text-orange-400 font-wizard">
              {t('Wild Mode')}
            </h3>
            <p className="text-gray-400 text-center mb-4 text-xs md:text-sm leading-relaxed flex-1 line-clamp-2">
              {t('Wild Mode Desc')}
            </p>
            <div className={`space-y-1.5 text-[10px] md:text-[11px] text-gray-500 ${isMobile ? 'flex flex-row justify-center gap-4 space-y-0' : ''}`}>
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-yellow-400" />
                <span>{t('All Cards Unlocked')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-yellow-400" />
                <span>{t('Fun Builds')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onBackToLobby}
        className={`${isMobile ? 'w-full py-4' : 'px-8 py-3'} bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10 active:scale-95`}
      >
        {t('Return to Magic Hall')}
      </button>

      {isMobile && <div className="h-6 w-full" />}
    </div>
  );
};