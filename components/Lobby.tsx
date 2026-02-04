/**
 * Lobby - 游戏大厅组件
 * 
 * 包含法术预览、下注选择、开始对战等功能
 */

import React, { useState } from 'react';
import { BattleRecord, Deck, GameMode, Rank, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { RulesModal } from './RulesModal';
import { TutorialModal } from './TutorialModal';

// Extracted Components
import TopBar from './lobby/TopBar';
import DeckCarousel from './lobby/DeckCarousel';
import WagerSelector from './lobby/WagerSelector';
import PlayButton from './lobby/PlayButton';

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

  return (
    <div className="min-h-full relative no-select overflow-hidden flex flex-col">
      {/* Immersive Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none transform scale-105"
        style={{ backgroundImage: "url('/lobby-bg.webp')", willChange: 'opacity' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/90 via-purple-900/40 to-black" />
      </div>

      {/* TOP BAR: HUD */}
      <TopBar
        userRank={userRank}
        rankScore={rankScore}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        language={language}
        onLanguageChange={onLanguageChange}
        gameMode={gameMode}
        onOpenModeSelect={onOpenModeSelect}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        t={t}
      />

      {/* CENTER STAGE: DECK CAROUSEL */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-10">
         
         {/* Introduction / Season Text */}
         <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-wizard text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 drop-shadow-[0_5px_15px_rgba(168,85,247,0.4)]">
               {t('Wizard Duel')}
            </h1>
            <p className="text-purple-200/60 text-xs tracking-[0.5em] font-tech uppercase mt-2">{t('Season 1: Elemental Rising')}</p>
         </div>

         {/* The Deck Display */}
         <DeckCarousel
           decks={decks}
           selectedDeck={selectedDeck}
           onOpenDeckBuilder={onOpenDeckBuilder}
           onSelectDeck={onSelectDeck}
           t={t}
         />

         {/* Bottom Controls Container */}
         <div className="w-full max-w-lg px-6 flex flex-col items-center gap-6">
            <WagerSelector
              selectedBet={selectedBet}
              balance={balance}
              onSelectBet={onSelectBet}
              t={t}
            />

            <PlayButton
              canStart={canStart}
              selectedDeck={selectedDeck}
              selectedBet={selectedBet}
              onStartDuel={onStartDuel}
              t={t}
            />
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
