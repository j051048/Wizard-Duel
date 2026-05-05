import React from 'react';
import { Volume2, VolumeX, BookOpen, Crown, Zap, Calendar, Settings, Sparkles } from 'lucide-react';
import { Language, GameMode, Rank } from '../../types';
import { getRankLevel } from '../../services/rankSystem';
import { QualityLevel } from '../../stores/useSettingsStore';

interface TopBarProps {
  userRank: string;
  rankScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  gameMode?: GameMode;
  onOpenModeSelect?: () => void;
  onOpenTutorial: () => void;
  onOpenQuests?: () => void;
  onOpenProfile?: () => void;
  hasPendingQuests?: boolean;
  t: (key: string) => string;
  balance?: number;
  isLowQuality?: boolean;
  showSettings?: boolean;
  onToggleSettings?: () => void;
  quality?: QualityLevel;
  onSetQuality?: (q: QualityLevel) => void;
}

import { useIsMobile } from '../../hooks/useIsMobile';

const TopBar: React.FC<TopBarProps> = ({
  userRank,
  rankScore,
  isMuted,
  onToggleMute,
  language,
  onLanguageChange,
  gameMode = 'standard',
  onOpenModeSelect,
  onOpenTutorial,
  onOpenQuests,
  onOpenProfile,
  hasPendingQuests,
  t,
  balance,
  isLowQuality,
  showSettings,
  onToggleSettings,
  quality,
  onSetQuality
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={`relative z-10 flex justify-between items-start ${isMobile ? 'p-3' : 'p-4 md:p-6'} safe-area-top`}>
            {/* Player Profile */}
      <div className="flex items-center gap-2 md:gap-3 animate-slide-in-left">
         <button onClick={onOpenProfile} className="relative group cursor-pointer active:scale-95 transition-transform">
            <div className={`${isMobile ? 'w-10 h-10' : 'w-14 h-14'} rounded-full border-2 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] overflow-hidden bg-black group-hover:border-amber-400 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all`}>
               <img src="/pwa-192x192.png" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className={`absolute -bottom-1 -right-1 bg-slate-900 ${isMobile ? 'text-[8px] px-1' : 'text-[10px] px-1.5'} text-amber-500 border border-amber-500/30 py-0.5 rounded-full font-bold`}>
               L.{getRankLevel(userRank as Rank)}
            </div>
         </button>
         
         <div className="flex flex-col">
           <div className="flex items-center gap-1">
              <span className={`${isMobile ? 'text-base' : 'text-xl'} font-wizard font-black drop-shadow-md ${
                userRank === 'Legend' ? 'text-amber-300' :
                userRank === 'Mythic' ? 'text-rose-400' :
                userRank === 'Master' ? 'text-orange-400' :
                userRank === 'Epic' ? 'text-purple-400' :
                userRank === 'Diamond' ? 'text-blue-400' :
                userRank === 'Platinum' ? 'text-cyan-300' :
                userRank === 'Gold' ? 'text-yellow-400' :
                userRank === 'Silver' ? 'text-slate-300' :
                'text-gray-400'
              }`}>{t(userRank)}</span>
           </div>
           <div className={`flex items-center gap-1 ${isMobile ? 'text-[9px]' : 'text-xs'} font-tech text-gray-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5`}>
              <Crown size={isMobile ? 10 : 12} className="text-amber-500" />
              <span>{rankScore} {t('PTS')}</span>
           </div>
         </div>
      </div>

      {/* System & Mode Controls */}
      <div className={`flex ${isMobile ? 'gap-1.5' : 'gap-3'} animate-slide-in-right items-start`}>
         {/* Balance Display */}
         {balance !== undefined && (
           <div className="bg-black/60 border border-purple-500/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
             <span className="text-purple-400 text-[10px] uppercase font-bold text-nowrap">💎</span>
             <span className="font-mono font-bold text-white text-sm">{balance}</span>
           </div>
         )}
         {/* Settings Gear */}
         {onToggleSettings && (
           <div className="relative">
             <button
               onClick={onToggleSettings}
               className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center transition-all hover:border-white/30`}
             >
               <Settings size={isMobile ? 14 : 18} className="text-gray-300" />
             </button>
             {showSettings && onSetQuality && (
               <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 z-[60]">
                 <div className="text-[10px] text-gray-400 font-bold uppercase px-2 mb-1 tracking-wider">画面设置</div>
                 <button onClick={() => { quality !== 'high' && onSetQuality('high'); onToggleSettings(); }} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${quality === 'high' ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-white/5'}`}>
                   <span>高画质</span>
                   {quality === 'high' && <span className="text-green-400 text-xs">✓</span>}
                 </button>
                 <button onClick={() => { quality !== 'low' && onSetQuality('low'); onToggleSettings(); }} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${quality === 'low' ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-white/5'}`}>
                   <span>低画质</span>
                   {quality === 'low' && <span className="text-green-400 text-xs">✓</span>}
                 </button>
               </div>
             )}
           </div>
         )}
         {!isMobile && (
           <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-500/20 mr-2 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-gray-300">{t('Online')}</span>
           </div>
         )}
         
         <button 
           onClick={() => onLanguageChange(language === 'zh' ? 'en' : 'zh')}
           className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center transition-all bg-no-repeat bg-center bg-cover overflow-hidden`}
           title={language === 'zh' ? 'Switch to English' : '切换到中文'}
         >
            <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-bold text-gray-300`}>{language === 'zh' ? 'CN' : 'EN'}</span>
         </button>

         {onOpenQuests && (
           <button 
             onClick={onOpenQuests} 
             className={`relative ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center transition-all group`}
             title="Daily Quests"
           >
              <Calendar size={isMobile ? 14 : 18} className="text-gray-300 group-hover:text-amber-400 transition-colors"/>
              {hasPendingQuests && (
                <span className={`absolute top-0 right-0 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'} bg-red-500 border-2 border-black rounded-full animate-pulse`} />
              )}
           </button>
         )}

         {onOpenModeSelect && (
           <button onClick={onOpenModeSelect} className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center transition-all`}>
              {gameMode === 'standard' ? <Crown size={isMobile ? 14 : 18} className="text-blue-400"/> : <Zap size={isMobile ? 14 : 18} className="text-orange-400"/>}
           </button>
         )}
         
         {/* 手机端隐藏教程和静音按钮以节省空间 */}
         {!isMobile && (
            <>
              <button onClick={onOpenTutorial} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 hover:border-white/30 hover:bg-white/10 flex items-center justify-center transition-all">
                  <BookOpen size={18} className="text-gray-300"/>
              </button>
              <button onClick={onToggleMute} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 hover:border-white/30 hover:bg-white/10 flex items-center justify-center transition-all">
                  {isMuted ? <VolumeX size={18} className="text-gray-500"/> : <Volume2 size={18} className="text-gray-300"/>}
              </button>
            </>
         )}
      </div>
    </div>
  );
};

export default TopBar;
