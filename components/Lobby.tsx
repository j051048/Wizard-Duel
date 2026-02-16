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
import { HapticService } from '../services/haptic';
import { SoundManager } from '../services/SoundManager';
import { useIsMobile } from '../hooks/useIsMobile';
import { GlobalChat } from './GlobalChat';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { ShoppingBag, Book, Swords, MessageCircle } from 'lucide-react';
import { MatchmakingOverlay } from './MatchmakingOverlay';
import { QuestManager } from '../services/QuestManager';
import { pvpService } from '../services/pvpService';

// Extracted Components
import TopBar from './lobby/TopBar';
import DeckCarousel from './lobby/DeckCarousel';
import WagerSelector from './lobby/WagerSelector';
import PlayButton from './lobby/PlayButton';
import { DailyGoalWidget } from './lobby/DailyGoalWidget';

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
  onOpenCollection?: () => void;
    onClaimQuestReward?: (amount: number) => void; // 新增：领取奖励回调
  onOpenProfile?: () => void;
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
  onOpenCollection,
    onClaimQuestReward,
  onOpenProfile,
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
  const { activeAddress } = useUserStore();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  
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
          try { SoundManager.play('victory', 0.5); } catch {}
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
        onOpenProfile={onOpenProfile}
        hasPendingQuests={hasPendingQuests}
        t={t}
      />

      {/* CENTER STAGE: DECK CAROUSEL */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center ${isMobile ? 'mt-0' : '-mt-10'}`}>
         
         {/* Introduction / Season Text */}
         <div className="text-center mb-6 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-wizard text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 drop-shadow-[0_5px_15px_rgba(168,85,247,0.4)]">
               {t('Wizard Duel')}
            </h1>
            <p className="text-purple-200/60 text-xs tracking-[0.5em] font-tech uppercase mt-2">{t('Season 1: Elemental Rising')}</p>
         </div>

         {/* Daily Goal Widget */}
         <div className="w-full max-w-md px-4 mb-4 z-20">
             <DailyGoalWidget 
                quests={quests}
                onClaim={handleClaimQuest}
                t={t}
             />
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
      <div className="relative z-10 p-4 flex justify-center gap-4 pb-8 flex-wrap">
         {/* 商店入口 */}
         {onOpenShop && (
            <button 
               onClick={onOpenShop}
               className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-bold uppercase tracking-widest border border-purple-500/30 px-4 py-2 rounded-full hover:bg-purple-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-purple-500/10"
            >
               <ShoppingBag size={14} />
               <span>商店</span>
            </button>
         )}

         {/* 收藏入口 */}
         {onOpenCollection && (
            <button 
               onClick={onOpenCollection}
               className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest border border-blue-500/30 px-4 py-2 rounded-full hover:bg-blue-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-blue-500/10"
            >
               <Book size={14} />
               <span>图鉴</span>
            </button>
         )}
         
         {/* 酒馆入口 */}
         {onOpenTavernMode && (
            <button 
               onClick={onOpenTavernMode}
               className="flex items-center gap-2 text-xs text-amber-500/80 hover:text-amber-400 font-bold uppercase tracking-widest border border-amber-500/20 px-4 py-2 rounded-full hover:bg-amber-900/20 hover:scale-105 active:scale-95 transition-all duration-150 opacity-70 hover:opacity-100"
            >
               <span>🍺</span>
               <span>{t('Visit Tavern')}</span>
            </button>
         )}

         {/* PvP 对战入口 */}
         <button 
            onClick={() => setIsMatchmaking(true)}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-widest border border-red-500/30 px-4 py-2 rounded-full hover:bg-red-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
         >
            <Swords size={14} />
            <span>{t('PvP Mode')}</span>
         </button>

         {/* 聊天按钮 */}
         <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="flex items-center gap-2 text-xs text-green-400 hover:text-green-300 font-bold uppercase tracking-widest border border-green-500/30 px-4 py-2 rounded-full hover:bg-green-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-green-500/10"
         >
            <MessageCircle size={14} />
            <span>聊天</span>
         </button>
      </div>

      {/* 实时聊天组件 */}
      <GlobalChat 
        userId={activeAddress || 'guest'} 
        username={activeAddress?.slice(0, 8) || 'Guest'} 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />

      {/* 匹配遮罩层 */}
      <MatchmakingOverlay 
        userId={activeAddress || 'guest'}
        username={activeAddress?.slice(0, 8) || 'Guest'}
        isOpen={isMatchmaking}
        onClose={() => setIsMatchmaking(false)}
        onMatchFound={(roomId, opponent) => {
          console.log('Match Found!', roomId, opponent);
          setIsMatchmaking(false);
          // [P1] 将匹配成功的房间 ID 存入全局 store，供 BattleArena 使用
          useUIStore.getState().setPvpRoomId(roomId);
          // [PVP 强制放行] 所有的匹配成功现在都导向对战场景
          onStartDuel();
        }}
      />

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
