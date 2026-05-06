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
import CheckInPanel from './CheckInPanel';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { useToastStore } from '../stores/useToastStore';
import { useShallow } from 'zustand/react/shallow';
import { ShoppingBag, Book, Swords, MessageCircle, Trophy, TrendingUp, Users, CalendarCheck } from 'lucide-react';
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
  /** Tier 2 preload progress (card images, background loaded) */
  tier2Progress?: { percentage: number; isComplete: boolean };
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartDuel,
  onPvpStart,
  isMuted,
  onToggleMute,
  tier2Progress,
}) => {
  const isMobile = useIsMobile();

  // Read directly from stores — no prop drilling
  const { balance, userRank, rankScore, decks, selectedDeck, setSelectedDeck, setBalance, isLoading } = useUserStore(
    useShallow(s => ({ balance: s.balance, userRank: s.userRank, rankScore: s.rankScore, decks: s.decks, selectedDeck: s.selectedDeck, setSelectedDeck: s.setSelectedDeck, setBalance: s.setBalance, isLoading: s.isLoading }))
  );
  const { selectedBet, setSelectedBet, gameMode, language, setLanguage, setGameState, showSettings, setShowSettings } = useUIStore(
    useShallow(s => ({ selectedBet: s.selectedBet, setSelectedBet: s.setSelectedBet, gameMode: s.gameMode, language: s.language, setLanguage: s.setLanguage, setGameState: s.setGameState, showSettings: s.showSettings, setShowSettings: s.setShowSettings }))
  );
  const { quality, setQuality, isLowQuality } = useSettingsStore();
  const toast = useToastStore(useShallow(s => ({ success: s.success })));

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);

  // First-time onboarding
  const [onboardingStep, setOnboardingStep] = useState<number | null>(() => {
    try {
      return localStorage.getItem('wizard_lobby_onboarding_v1') ? null : 0;
    } catch { return null; }
  });
  const dismissOnboarding = () => {
    try { localStorage.setItem('wizard_lobby_onboarding_v1', '1'); } catch {}
    setOnboardingStep(null);
  };

  const canStart = balance >= selectedBet;

  const t = (key: string) => TRANSLATIONS[language][key] || key;
  const activeAddress = useUserStore(state => state.activeAddress);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
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
              setBalance(balance + result.reward);
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
        balance={isLoading ? undefined : balance}
        isLowQuality={isLowQuality}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
        quality={quality}
        onSetQuality={setQuality}
      />

      {/* Click-outside overlay for settings dropdown */}
      {showSettings && (
        <div className="fixed inset-0 z-[55]" onClick={() => setShowSettings(false)} />
      )}

      {/* CENTER STAGE: DECK CAROUSEL */}
      <div className={`relative z-10 flex-auto min-h-fit flex flex-col items-center justify-center py-4 ${isMobile ? 'mt-0' : '-mt-10'}`}>

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

      {/* [P4-5] Tier 2 后台加载进度条 — 仅在加载中显示 */}
      {tier2Progress && !tier2Progress.isComplete && (
        <div className="relative z-10 px-6 pb-2">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <div className="w-2 h-2 border border-gray-500 border-t-purple-400 rounded-full animate-spin" />
            <span>Loading cards {tier2Progress.percentage}%</span>
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500/60 rounded-full transition-all duration-500" style={{ width: `${tier2Progress.percentage}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* FOOTER: EXTRA MODES — B-5: 依次滑入 */}
      <div className="relative z-10 p-4 flex justify-center gap-4 pb-8 flex-wrap lobby-section-enter" style={{ animationDelay: '0.6s' }}>
         {/* 商店入口 */}
            <button
               onClick={() => setGameState('SHOP')}
               aria-label="商店"
               className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-bold uppercase tracking-widest border border-purple-500/30 px-4 py-2 rounded-full hover:bg-purple-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-purple-500/10"
            >
               <ShoppingBag size={14} />
               <span>{t('Shop')}</span>
            </button>

         {/* 收藏入口 */}
            <button
               onClick={() => setGameState('COLLECTION')}
               aria-label="卡牌收藏"
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
            aria-label="PvP 对战"
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-widest border border-red-500/30 px-4 py-2 rounded-full hover:bg-red-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
         >
            <Swords size={14} />
            <span>{t('PvP Mode')}</span>
         </button>

         {/* 排位入口 */}
            <button
               onClick={() => setGameState('RANKED')}
               className="flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300 font-bold uppercase tracking-widest border border-orange-500/30 px-4 py-2 rounded-full hover:bg-orange-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-orange-500/10"
            >
               <TrendingUp size={14} />
               <span>{t('Ranked') || '排位赛'}</span>
            </button>

         {/* 成就入口 */}
            <button
               onClick={() => setGameState('ACHIEVEMENTS')}
               className="flex items-center gap-2 text-xs text-yellow-400 hover:text-yellow-300 font-bold uppercase tracking-widest border border-yellow-500/30 px-4 py-2 rounded-full hover:bg-yellow-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-yellow-500/10"
            >
               <Trophy size={14} />
               <span>{t('Achievements') || '成就'}</span>
            </button>

         {/* 签到入口 */}
         <button
            onClick={() => setIsCheckInOpen(true)}
            aria-label="每日签到"
            className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest border border-emerald-500/30 px-4 py-2 rounded-full hover:bg-emerald-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-emerald-500/10"
         >
            <CalendarCheck size={14} />
            <span>{t('Check In') || '签到'}</span>
         </button>

         {/* 好友入口 */}
         <button
            onClick={() => setGameState('FRIENDS')}
            aria-label="好友系统"
            className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest border border-cyan-500/30 px-4 py-2 rounded-full hover:bg-cyan-900/20 hover:scale-105 active:scale-95 transition-all duration-150 bg-cyan-500/10"
         >
            <Users size={14} />
            <span>{t('Friends') || '好友'}</span>
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

      {/* 每日签到面板 */}
      <CheckInPanel
        isOpen={isCheckInOpen}
        onClose={() => { setIsCheckInOpen(false); audioBridge.playSfx('modal_close'); }}
        onClaim={(gems) => {
          const currentBalance = useUserStore.getState().balance || 0;
          useUserStore.getState().setBalance(currentBalance + gems);
          toast.success('签到成功', `获得 ${gems} 宝石！`);
        }}
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

      {/* First-time Onboarding Overlay */}
      {onboardingStep !== null && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center pb-32 px-6 pointer-events-none">
          <div className="pointer-events-auto max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-5 shadow-2xl shadow-amber-500/10 animate-in fade-in slide-in-from-bottom-4">
            {onboardingStep === 0 && (
              <>
                <div className="text-2xl mb-2">🏰</div>
                <h3 className="text-lg font-wizard text-amber-200 mb-1">欢迎来到魔法竞技场</h3>
                <p className="text-sm text-slate-300 mb-4">在这里与其他法师一决高下。首先，你需要一套卡组！</p>
                <button onClick={() => setOnboardingStep(1)} className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-transform">
                  继续 →
                </button>
              </>
            )}
            {onboardingStep === 1 && (
              <>
                <div className="text-2xl mb-2">📖</div>
                <h3 className="text-lg font-wizard text-amber-200 mb-1">组建你的卡组</h3>
                <p className="text-sm text-slate-300 mb-4">点击底部的「收藏」按钮可以浏览和组卡。至少需要 20 张卡才能上场。</p>
                <div className="flex gap-2">
                  <button onClick={() => setOnboardingStep(0)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm">← 返回</button>
                  <button onClick={() => setOnboardingStep(2)} className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-transform">
                    继续 →
                  </button>
                </div>
              </>
            )}
            {onboardingStep === 2 && (
              <>
                <div className="text-2xl mb-2">⚔️</div>
                <h3 className="text-lg font-wizard text-amber-200 mb-1">开始对战</h3>
                <p className="text-sm text-slate-300 mb-4">选好卡组后，选择下注金额，点击「进入竞技场」即可开始！胜利获得钻石，用于购买更多卡包。</p>
                <button onClick={dismissOnboarding} className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-transform">
                  开始冒险 ✨
                </button>
              </>
            )}
            <button onClick={dismissOnboarding} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Lobby;
