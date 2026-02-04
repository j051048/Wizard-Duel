/**
 * Lobby - 游戏大厅组件
 * 
 * 包含法术预览、下注选择、开始对战等功能
 */

import React, { useState } from 'react';
import { Sparkles, Volume2, VolumeX, BookOpen, Settings, Crown, Zap, Shield } from 'lucide-react';
import { SPELLS, BET_OPTIONS } from '../constants';
import { TRANSLATIONS } from '../translations';
import { BattleRecord, Deck, GameMode, Rank, Language } from '../types';
import { RulesModal } from './RulesModal';
import { TutorialModal } from './TutorialModal';

interface LobbyProps {
  balance: number;
  userRank: Rank;
  rankScore: number;
  selectedBet: number;
  onSelectBet: (bet: number) => void;
  onStartDuel: () => void;
  history: BattleRecord[];
  isMuted: boolean;
  onToggleMute: () => void;
  isLoading?: boolean;
  decks: Deck[];
  selectedDeck: Deck | null;
  onOpenDeckBuilder: () => void;
  onSelectDeck: (deck: Deck) => void;
  onOpenTavernMode?: () => void;
  gameMode?: GameMode;
  onOpenModeSelect?: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  balance,
  userRank,
  rankScore,
  selectedBet,
  onSelectBet,
  onStartDuel,
  history,
  isMuted,
  onToggleMute,
  isLoading = false,
  decks,
  selectedDeck,
  onOpenDeckBuilder,
  onSelectDeck,
  onOpenTavernMode,
  gameMode = 'standard',
  onOpenModeSelect,
  language,
  onLanguageChange,
}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const canStart = balance >= selectedBet;

  const t = (key: string) => TRANSLATIONS[language][key] || key;

  // Deck cycling logic
  const currentDeckIndex = decks.findIndex(d => d.id === selectedDeck?.id);
  const nextDeck = () => {
    if (decks.length === 0) return;
    const nextIndex = (currentDeckIndex + 1) % decks.length;
    onSelectDeck(decks[nextIndex]);
  };
  const prevDeck = () => {
    if (decks.length === 0) return;
    const prevIndex = (currentDeckIndex - 1 + decks.length) % decks.length;
    onSelectDeck(decks[prevIndex]);
  };

  return (
    <div className="min-h-full relative no-select overflow-hidden flex flex-col">
      {/* Immersive Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none transform scale-105"
        style={{ backgroundImage: "url('/lobby-bg.webp')", willChange: 'opacity' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/90 via-purple-900/40 to-black" />
        {/* Floating Particles/Dust would go here */}
      </div>

      {/* --- TOP BAR: HUD --- */}
      <div className="relative z-10 flex justify-between items-start p-4 md:p-6">
        {/* Player Profile */}
        <div className="flex items-center gap-3 animate-slide-in-left">
           <div className="relative group">
              <div className="w-14 h-14 rounded-full border-2 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] overflow-hidden bg-black">
                 <img src="/pwa-192x192.png" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-slate-900 text-[10px] text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold">
                 LV.{Math.floor(rankScore / 100) + 1}
              </div>
           </div>
           
           <div className="flex flex-col">
             <div className="flex items-center gap-2">
                <span className={`text-xl font-wizard font-black drop-shadow-md ${
                  userRank === 'Legend' ? 'text-yellow-400' :
                  userRank === 'Diamond' ? 'text-cyan-400' :
                  'text-gray-200'
                }`}>{userRank}</span>
             </div>
             <div className="flex items-center gap-2 text-xs font-tech text-gray-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                <Crown size={12} className="text-amber-500" />
                <span>{rankScore} PTS</span>
             </div>
           </div>
        </div>

        {/* System & Mode Controls */}
        <div className="flex gap-3 animate-slide-in-right">
           <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-500/20 mr-2 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-gray-300">{t('Online')}</span>
           </div>
           
           <button 
             onClick={() => onLanguageChange(language === 'zh' ? 'en' : 'zh')}
             className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 hover:border-white/30 hover:bg-white/10 flex items-center justify-center transition-all bg-no-repeat bg-center bg-cover overflow-hidden"
             title={language === 'zh' ? 'Switch to English' : '切换到中文'}
           >
              <span className="text-xs font-bold text-gray-300">{language === 'zh' ? 'CN' : 'EN'}</span>
           </button>

           {onOpenModeSelect && (
             <button onClick={onOpenModeSelect} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 hover:border-white/30 hover:bg-white/10 flex items-center justify-center transition-all">
                {gameMode === 'standard' ? <Crown size={18} className="text-blue-400"/> : <Zap size={18} className="text-orange-400"/>}
             </button>
           )}
           <button onClick={() => setIsTutorialOpen(true)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 hover:border-white/30 hover:bg-white/10 flex items-center justify-center transition-all">
              <BookOpen size={18} className="text-gray-300"/>
           </button>
           <button onClick={onToggleMute} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 hover:border-white/30 hover:bg-white/10 flex items-center justify-center transition-all">
              {isMuted ? <VolumeX size={18} className="text-gray-500"/> : <Volume2 size={18} className="text-gray-300"/>}
           </button>
        </div>
      </div>


      {/* --- CENTER STAGE: DECK CAROUSEL --- */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-10">
         
         {/* Introduction / Season Text */}
         <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-wizard text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 drop-shadow-[0_5px_15px_rgba(168,85,247,0.4)]">
               {t('Wizard Duel')}
            </h1>
            <p className="text-purple-200/60 text-xs tracking-[0.5em] font-tech uppercase mt-2">{t('Season 1: Elemental Rising')}</p>
         </div>

         {/* The Deck Display */}
         <div className="relative w-full max-w-sm h-64 md:h-80 perspective-1000 flex items-center justify-center mb-8">
            {decks.length === 0 ? (
               <div className="text-center p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-dashed border-white/20 hover:border-purple-500/50 transition-colors cursor-pointer" onClick={onOpenDeckBuilder}>
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Settings size={32} className="text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{t('No Decks Found')}</h3>
                  <p className="text-gray-400 text-sm mb-4">{t('You need a deck to enter the arena.')}</p>
                  <button className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold transition-colors">
                     {t('Create Deck')}
                  </button>
               </div>
            ) : (
               <>
                  {/* Prev Button */}
                  <button onClick={prevDeck} className="absolute left-4 z-20 p-3 rounded-full bg-black/20 hover:bg-black/60 text-white/50 hover:text-white transition-all">
                     ◀
                  </button>
                  
                  {/* Active Deck Card - Simulated 3D */}
                  <div className="relative w-48 h-72 md:w-56 md:h-80 bg-slate-900 rounded-xl border-2 border-amber-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500 group">
                      {/* Cover Art */}
                      <div className="absolute inset-1 rounded-lg overflow-hidden bg-slate-800">
                         {selectedDeck?.cards[0] && SPELLS.find(s => s.id === selectedDeck.cards[0])?.artSrc ? (
                            <img src={SPELLS.find(s => s.id === selectedDeck.cards[0])?.artSrc} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                         ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-900 to-slate-900"></div>
                         )}
                      </div>
                      
                      {/* Deck Info Overlay */}
                      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
                         <div className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">{t('Current Deck')}</div>
                         <h3 className="text-xl font-bold text-white truncate">{selectedDeck?.name}</h3>
                         <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">{selectedDeck?.cards.length}/30 {t('Cards')}</span>
                            <button 
                               onClick={onOpenDeckBuilder}
                               className="p-2 bg-white/10 hover:bg-purple-600 rounded-lg transition-colors text-white"
                               title={t('Edit Deck')}
                            >
                               <Settings size={14} />
                            </button>
                         </div>
                      </div>
                  </div>

                  {/* Next Button */}
                  <button onClick={nextDeck} className="absolute right-4 z-20 p-3 rounded-full bg-black/20 hover:bg-black/60 text-white/50 hover:text-white transition-all">
                     ▶
                  </button>
               </>
            )}
         </div>

         {/* Bottom Controls Container */}
         <div className="w-full max-w-lg px-6 flex flex-col items-center gap-6">
            
            {/* Wager Selection - Chips */}
            <div className="flex flex-col items-center gap-2 w-full">
               <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">{t('Select Wager')}</span>
               <div className="flex gap-4 md:gap-8 justify-center w-full">
                  {BET_OPTIONS.map((amt) => {
                     const isSelected = selectedBet === amt;
                     const isDisabled = balance < amt;
                     return (
                        <button
                           key={amt}
                           onClick={() => onSelectBet(amt)}
                           disabled={isDisabled}
                           className={`
                              relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 group
                              ${isSelected 
                                 ? 'scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)] z-10' 
                                 : 'scale-95 grayscale-[0.5] hover:grayscale-0 hover:scale-100'
                              }
                              ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer'}
                           `}
                        >
                           {/* Chip Visual */}
                           <div className={`absolute inset-0 rounded-full border-4 ${isSelected ? 'border-amber-400 bg-purple-900' : 'border-slate-600 bg-slate-900'}`}></div>
                           <div className="absolute inset-1 rounded-full border border-dashed border-white/20"></div>
                           
                           <span className={`relative z-10 font-black text-lg md:text-xl font-mono ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                              {amt}
                           </span>
                           {isSelected && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_10px_orange]"></div>}
                        </button>
                     );
                  })}
               </div>
            </div>

            {/* MAIN PLAY BUTTON */}
            <div className="w-full mt-4">
              <button
                onClick={onStartDuel}
                disabled={!canStart || !selectedDeck}
                className={`
                  w-full relative group h-16 md:h-20 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500
                  ${canStart && selectedDeck
                    ? 'shadow-[0_0_40px_rgba(147,51,234,0.4)] hover:shadow-[0_0_60px_rgba(147,51,234,0.7)] hover:scale-[1.02]' 
                    : 'bg-gray-900 border border-white/5 cursor-not-allowed opacity-50'
                  }
                `}
              >
                  {canStart && selectedDeck ? (
                     <>
                        {/* Animated Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 animate-gradient-xy"></div>
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                        
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-full group-hover:animate-shimmer"></div>

                         {/* Text Content */}
                        <div className="relative z-10 flex items-center gap-3">
                           <Sparkles size={24} className="text-yellow-300 animate-pulse" />
                           <span className="text-2xl md:text-3xl font-wizard font-bold text-white tracking-[0.1em] drop-shadow-md">
                              {t('ENTER ARENA')}
                           </span>
                           <Sparkles size={24} className="text-yellow-300 animate-pulse" />
                        </div>
                     </>
                  ) : (
                     <span className="font-mono text-gray-500 tracking-widest uppercase text-xs">
                        {!selectedDeck ? t('Select a Deck') : t('Insufficient Funds')}
                     </span>
                  )}
              </button>
              <div className="text-center mt-3 h-4">
                 {canStart && selectedDeck && (
                    <span className="text-[10px] text-green-400 font-mono animate-pulse">
                       {t('ESTIMATED REWARD')}: +{Math.floor(selectedBet * 0.92)} {t('PTS')}
                    </span>
                 )}
              </div>
            </div>
         
         </div>

      </div>

      {/* FOOTER: EXTRA MODES */}
      <div className="relative z-10 p-4 flex justify-center pb-8 opacity-50 hover:opacity-100 transition-opacity">
         {onOpenTavernMode && (
            <button 
               onClick={onOpenTavernMode}
               className="flex items-center gap-2 text-xs text-amber-500/80 hover:text-amber-400 font-bold uppercase tracking-widest border border-amber-500/20 px-4 py-2 rounded-full hover:bg-amber-900/20 transition-all"
            >
               <span>🍺</span>
               <span>{t('Visit Tavern')}</span>
            </button>
         )}
      </div>

      {/* Global Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
};
export default Lobby;
