/**
 * Lobby - 游戏大厅组件
 * 
 * 包含法术预览、下注选择、开始对战等功能
 */

import React, { useState, useEffect } from 'react';
import { Deck, GameMode, Language } from '../types';
import { Quest } from '../types/quest';
import { TRANSLATIONS } from '../translations';
import { RulesModal } from './RulesModal';
import { TutorialModal } from './TutorialModal';
import { QuestModal } from './lobby/QuestModal';
import { HapticService } from '../services/haptic';
import { audioBridge } from '../hooks/useAudioManager';
import { useIsMobile } from '../hooks/useIsMobile';
import { GlobalChat } from './GlobalChat';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { useToastStore } from '../stores/useToastStore';
import { useShallow } from 'zustand/react/shallow';
import { ShoppingBag, Book, Swords, MessageCircle, Settings, CheckCircle, Sparkles } from 'lucide-react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { MatchmakingOverlay } from './MatchmakingOverlay';
import { QuestManager } from '../services/QuestManager';
import { BattlePassService } from '../services/BattlePassService';


// Extracted Components
import TopBar from './lobby/TopBar';
import DeckCarousel from './lobby/DeckCarousel';
import WagerSelector from './lobby/WagerSelector';
import PlayButton from './lobby/PlayButton';
import { DailyGoalWidget } from './lobby/DailyGoalWidget';

interface LobbyProps {
  onStartDuel: () => void;
  onPvpStart: (role: 'player1' | 'player2', seed?: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartDuel,
  onPvpStart,
  isMuted,
  onToggleMute,
}) => {
  const isMobile = useIsMobile();

  // Read directly from stores — no prop drilling
  const { balance, userRank, rankScore, decks, selectedDeck, setSelectedDeck, isLoading } = useUserStore(
    useShallow(s => ({ balance: s.balance, userRank: s.userRank, rankScore: s.rankScore, decks: s.decks, selectedDeck: s.selectedDeck, setSelectedDeck: s.setSelectedDeck, isLoading: s.isLoading }))
  );
  const { selectedBet, setSelectedBet, gameMode, language, setLanguage, setGameState, showSettings, setShowSettings } = useUIStore(
    useShallow(s => ({ selectedBet: s.selectedBet, setSelectedBet: s.setSelectedBet, gameMode: s.gameMode, language: s.language, setLanguage: s.setLanguage, setGameState: s.setGameState, showSettings: s.showSettings, setShowSettings: s.setShowSettings }))
  );
  const { quality, setQuality, isLowQuality } = useSettingsStore();
  const { setBalance, balance: currentBalance } = useUserStore(useShallow(s => ({ setBalance: s.setBalance, balance: s.balance })));
  const toast = useToastStore(s => ({ success: s.success }));

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);

  const canStart = balance >= selectedBet;

  const t = (key: string) => TRANSLATIONS[language][key] || key;
  const activeAddress = useUserStore(state => state.activeAddress);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMatchmaking, setIsMatchmaking] = useState(false);

  // 初始化任务
  useEffect(() => {
    setQuests(QuestManager.init());
  }, []);

  // 领取任务奖励 — 直接更新 store，不依赖回调 prop
  const handleClaimQuest = (questId: string) => {
      const result = QuestManager.claimReward(questId);
      if (result.success) {
          setQuests(result.quests);
          if (result.reward) {
              setBalance(currentBalance + result.reward);
              toast.success('奖励到账', `获得 ${result.reward} 法力值！`);
          }
          // [P1] 任务经验同步到战斗通行证
          if (result.rewardExp) {
              BattlePassService.addXP(result.rewardExp);
          }
          HapticService.success();
          try { audioBridge.playSfx('victory'); } catch {}
      }
  };
  
  const hasPendingQuests = quests.some(q => q.isCompleted && !q.isClaimed);

  return (
    <div className="min-h-full relative no-select overflow-hidden flex flex-col">
      {/* Lobby Header — moved from App.tsx to reduce prop drilling */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center safe-area-top">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles size={20} className="text-white" />
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70"
          >
            <Settings size={20} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {isLowQuality && (
            <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded border border-amber-500/30 font-bold uppercase">
              省电模式
            </span>
          )}
          <div className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-purple-400 text-xs uppercase font-bold text-nowrap">{TRANSLATIONS[language]?.['GOLD'] || '钻石'}</span>
            <span className="font-mono font-bold text-white">{isLoading ? '...' : balance}</span>
          </div>
        </div>
        {showSettings && (
          <div className="absolute top-full left-4 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2">
            <div className="text-[10px] text-gray-400 font-bold uppercase px-2 mb-1 tracking-wider">画面设置</div>
            <button onClick={() => { quality !== 'high' && setQuality('high'); setShowSettings(false); }} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${quality === 'high' ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-white/5'}`}>
              <span>高画质 (全特效)</span>
              {quality === 'high' && <CheckCircle size={14} />}
            </button>
            <button onClick={() => { quality !== 'low' && setQuality('low'); setShowSettings(false); }} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${quality === 'low' ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-white/5'}`}>
              <span>低画质 (更流畅)</span>
              {quality === 'low' && <CheckCircle size={14} />}
            </button>
          </div>
        )}
      </header>

      {/* Click-outside overlay for settings */}
      {showSettings && (
        <div className="fixed inset-0 z-[55]" onClick={() => setShowSettings(false)} />
      )}

      {/* Immersive Background — B-5: 微视差浮动 */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none lobby-bg-float"
        style={{ backgroundImage: "url('/lobby-bg.webp')", willChange: 'transform' }}
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
        onLanguageChange={setLanguage}
        gameMode={gameMode}
        onOpenModeSelect={() => setGameState('MODE_SELECT')}
        onOpenTutorial={() => { setIsTutorialOpen(true); audioBridge.playSfx('modal_open'); }}
                onOpenQuests={() => { setIsQuestModalOpen(true); audioBridge.playSfx('modal_open'); }}
        onOpenProfile={() => setGameState('PROFILE')}
        hasPendingQuests={hasPendingQuests}
        t={t}
      />

      {/* CENTER STAGE: DECK CAROUSEL */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center ${isMobile ? 'mt-0' : '-mt-10'}`}>

         {/* Introduction / Season Text — B-5: 标题模糊渐入 */}
         <div className="text-center mb-6 lobby-title-enter">
            <h1 className="text-4xl md:text-6xl font-wizard text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 drop-shadow-[0_5px_15px_rgba(168,85,247,0.4)]">
               {t('Wizard Duel')}
            </h1>
            <p className="text-purple-200/60 text-xs tracking-[0.5em] font-tech uppercase mt-2 lobby-subtitle-enter">{t('Season 1: Elemental Rising')}</p>
         </div>

         {/* Daily Goal Widget — B-5: 依次滑入 */}
         <div className="w-full max-w-md px-4 mb-4 z-20 lobby-section-enter" style={{ animationDelay: '0.15s' }}>
             <DailyGoalWidget
                quests={quests}
                onClaim={handleClaimQuest}
                t={t}
             />
         </div>

         {/* The Deck Display */}
         <div className="lobby-section-enter" style={{ animationDelay: '0.3s' }}>
           <DeckCarousel
             decks={decks}
             selectedDeck={selectedDeck}
             onOpenDeckBuilder={() => setGameState('DECK_BUILDER')}
             onSelectDeck={setSelectedDeck}
             isLoading={isLoading}
             t={t}
           />
         </div>

         {/* Bottom Controls Container */}
         <div className="w-full max-w-lg px-6 flex flex-col items-center gap-6 lobby-section-enter" style={{ animationDelay: '0.45s' }}>
            <WagerSelector
              selectedBet={selectedBet}
              balance={balance}
              onSelectBet={setSelectedBet}
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

      {/* FOOTER: EXTRA MODES — B-5: 依次滑入 */}
      <div className="relative z-10 p-4 flex justify-center gap-4 pb-8 flex-wrap lobby-section-enter" style={{ animationDelay: '0.6s' }}>
         {/* 商店入口 */}
            <button
               onClick={() => setGameState('SHOP')}
               className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-bold uppercase tracking-widest border border-purple-500/30 px-4 py-2 rounded-full hover:bg-purple-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-purple-500/10"
            >
               <ShoppingBag size={14} />
               <span>{t('Shop')}</span>
            </button>

         {/* 收藏入口 */}
            <button
               onClick={() => setGameState('COLLECTION')}
               className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest border border-blue-500/30 px-4 py-2 rounded-full hover:bg-blue-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-blue-500/10"
            >
               <Book size={14} />
               <span>{t('Collection')}</span>
            </button>

         {/* 酒馆入口 */}
            <button
               onClick={() => setGameState('TAVERN')}
               className="flex items-center gap-2 text-xs text-amber-500/80 hover:text-amber-400 font-bold uppercase tracking-widest border border-amber-500/20 px-4 py-2 rounded-full hover:bg-amber-900/20 hover:scale-105 active:scale-95 transition-all duration-150 opacity-70 hover:opacity-100"
            >
               <span>🍺</span>
               <span>{t('Visit Tavern')}</span>
            </button>

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
            <span>{t('Chat')}</span>
         </button>
      </div>

      {/* 实时聊天组件 */}
      <GlobalChat 
        userId={activeAddress || 'guest'} 
        username={activeAddress?.slice(0, 8) || 'Guest'} 
        isOpen={isChatOpen} 
        onClose={() => { setIsChatOpen(false); audioBridge.playSfx('modal_close'); }}
      />

      {/* 匹配遮罩层 */}
      <MatchmakingOverlay 
        userId={activeAddress || 'guest'}
        username={activeAddress?.slice(0, 8) || 'Guest'}
        isOpen={isMatchmaking}
        onClose={() => { setIsMatchmaking(false); audioBridge.playSfx('modal_close'); }}
        onMatchFound={(roomId, opponent, role, seed) => {
          console.log('Match Found!', roomId, opponent, role, seed);
          setIsMatchmaking(false);
          // [P1] 将匹配成功的房间 ID 存入全局 store，供 BattleArena 使用
          useUIStore.getState().setPvpRoomId(roomId);
          useUIStore.getState().setPvpRole(role);
          useUIStore.getState().setPvpSeed(seed ?? null);
          // [PVP 强制放行] 所有的匹配成功现在都导向对战场景
          onPvpStart(role, seed);
        }}
      />

            {/* Global Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => { setIsRulesOpen(false); audioBridge.playSfx('modal_close'); }} />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => { setIsTutorialOpen(false); audioBridge.playSfx('modal_close'); }} />
      <QuestModal
        isOpen={isQuestModalOpen}
        onClose={() => { setIsQuestModalOpen(false); audioBridge.playSfx('modal_close'); }}
        quests={quests}
        onClaim={handleClaimQuest}
        t={t}
      />
    </div>
  );
};
export default Lobby;
