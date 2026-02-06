/**
 * Lobby - 游戏大厅组件
 * 
 * 包含法术预览、下注选择、开始对战等功能
 */

import React, { useState, useEffect } from 'react';
import { BattleRecord, Deck, GameMode, Rank, Language } from '../types';
import { Quest } from '../types/quest';
import { TRANSLATIONS } from '../translations';
import { RulesModal } from './RulesModal';
import { TutorialModal } from './TutorialModal';
import { QuestModal } from './lobby/QuestModal';
import { ShoppingBag } from 'lucide-react';
import { QuestManager } from '../services/QuestManager';
import { HapticService } from '../services/haptic';
import { SoundManager } from '../services/SoundManager';
import { useIsMobile } from '../hooks/useIsMobile';

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
  onOpenShop?: () => void;
  onClaimQuestReward?: (amount: number) => void; // 新增：领取奖励回调
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
  onOpenShop,
  onClaimQuestReward,
  gameMode = 'standard',
  onOpenModeSelect,
  language,
  onLanguageChange,
}) => {
  const isMobile = useIsMobile();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  
  const canStart = balance >= selectedBet;

  const t = (key: string) => TRANSLATIONS[language][key] || key;
  
  // 初始化任务
  useEffect(() => {
    setQuests(QuestManager.init());
  }, []);
  
  // 领取任务奖励
  const handleClaimQuest = (questId: string) => {
      const result = QuestManager.claimReward(questId);
      if (result.success) {
          setQuests(result.quests);
          if (result.reward && onClaimQuestReward) {
              onClaimQuestReward(result.reward);
          }
          HapticService.success();
          try { SoundManager.play('victory', 0.5); } catch(e) {}
      }
  };
  
  const hasPendingQuests = quests.some(q => q.isCompleted && !q.isClaimed);

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
        onOpenQuests={() => setIsQuestModalOpen(true)}
        hasPendingQuests={hasPendingQuests}
        t={t}
      />

      {/* CENTER STAGE: DECK CAROUSEL */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center ${isMobile ? 'mt-0' : '-mt-10'}`}>
         
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
           isLoading={isLoading}
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
      <div className="relative z-10 p-4 flex justify-center gap-4 pb-8">
         {/* 商店入口 */}
         {onOpenShop && (
            <button 
               onClick={onOpenShop}
               className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-bold uppercase tracking-widest border border-purple-500/30 px-4 py-2 rounded-full hover:bg-purple-900/20 transition-all bg-purple-500/10"
            >
               <ShoppingBag size={14} />
               <span>商店</span>
            </button>
         )}
         
         {/* 酒馆入口 */}
         {onOpenTavernMode && (
            <button 
               onClick={onOpenTavernMode}
               className="flex items-center gap-2 text-xs text-amber-500/80 hover:text-amber-400 font-bold uppercase tracking-widest border border-amber-500/20 px-4 py-2 rounded-full hover:bg-amber-900/20 transition-all opacity-70 hover:opacity-100"
            >
               <span>🍺</span>
               <span>{t('Visit Tavern')}</span>
            </button>
         )}
      </div>

            {/* Global Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      <QuestModal 
        isOpen={isQuestModalOpen} 
        onClose={() => setIsQuestModalOpen(false)} 
        quests={quests}
        onClaim={handleClaimQuest}
        t={t}
      />
    </div>
  );
};
export default Lobby;
