import React from 'react';
import { Volume2, VolumeX, BookOpen, Crown, Zap, Calendar } from 'lucide-react';
import { Language, GameMode } from '../../types';

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
  hasPendingQuests?: boolean;
  t: (key: string) => string;
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
  hasPendingQuests,
  t
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={`relative z-10 flex justify-between items-start ${isMobile ? 'p-3' : 'p-4 md:p-6'} safe-area-top`}>
      {/* Player Profile */}
      <div className="flex items-center gap-2 md:gap-3 animate-slide-in-left">
         <div className="relative group">
            <div className={`${isMobile ? 'w-10 h-10' : 'w-14 h-14'} rounded-full border-2 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] overflow-hidden bg-black`}>
               <img src="/pwa-192x192.png" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className={`absolute -bottom-1 -right-1 bg-slate-900 ${isMobile ? 'text-[8px] px-1' : 'text-[10px] px-1.5'} text-amber-500 border border-amber-500/30 py-0.5 rounded-full font-bold`}>
               L.{Math.floor(rankScore / 100) + 1}
            </div>
         </div>
         
         <div className="flex flex-col">
           <div className="flex items-center gap-1">
              <span className={`${isMobile ? 'text-base' : 'text-xl'} font-wizard font-black drop-shadow-md ${
                userRank === 'Legend' ? 'text-yellow-400' :
                userRank === 'Diamond' ? 'text-cyan-400' :
                'text-gray-200'
              }`}>{userRank}</span>
           </div>
           <div className={`flex items-center gap-1 ${isMobile ? 'text-[9px]' : 'text-xs'} font-tech text-gray-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5`}>
              <Crown size={isMobile ? 10 : 12} className="text-amber-500" />
              <span>{rankScore} PTS</span>
           </div>
         </div>
      </div>

      {/* System & Mode Controls */}
      <div className={`flex ${isMobile ? 'gap-1.5' : 'gap-3'} animate-slide-in-right`}>
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
