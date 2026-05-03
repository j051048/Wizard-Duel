import { create } from 'zustand';
import { GameState, GameMode, Language, SpellType, Rank, AIProfile } from '../types';
import { DungeonRunState } from '../types/dungeon';
import { audioBridge } from '../hooks/useAudioManager';

// 确认弹窗配置
interface ConfirmDialogConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm?: () => void;
}

interface FinalResult {
  result: 'WIN' | 'LOSS' | 'DRAW';
  player: SpellType;
  opponent: SpellType;
  payout: number;
  isCrit: boolean;
  rankUpdates?: {
    newScore: number;
    newRank: Rank;
    scoreDelta: number;
  };
}

interface UIState {
  gameState: GameState;
  gameMode: GameMode;
  selectedBet: number;
  language: Language;
  showSettings: boolean;
  isResourcesLoaded: boolean;
  isLoggedIn: boolean;
  isGuest: boolean;
  dungeonRun: DungeonRunState | null;
  pendingTavernDuel: AIProfile | null;
  finalResult: FinalResult | null;
  isPlayerShaking: boolean;
  isOpponentShaking: boolean;
  confirmDialog: ConfirmDialogConfig;
  pvpRoomId: string | null; // [P1] PVP 匹配成功后的房间 ID
  pvpRole: 'player1' | 'player2' | null; // [PVP修复] 记录先手/后手角色
  pvpSeed: number | null; // [PVP修复] 记录随机种子

    // Actions
  setGameState: (state: GameState) => void;
  setGameMode: (mode: GameMode) => void;
  setSelectedBet: (bet: number) => void;
  setLanguage: (lang: Language) => void;
  setPvpRoomId: (id: string | null) => void;
  setPvpRole: (role: 'player1' | 'player2' | null) => void;
  setPvpSeed: (seed: number | null) => void;
  setShowSettings: (show: boolean) => void;
  setIsResourcesLoaded: (loaded: boolean) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
  setIsGuest: (guest: boolean) => void;
  setDungeonRun: (run: DungeonRunState | null | ((prev: DungeonRunState | null) => DungeonRunState | null)) => void;
  setPendingTavernDuel: (duel: AIProfile | null) => void;
  setFinalResult: (result: FinalResult | null) => void;
  setIsPlayerShaking: (shaking: boolean) => void;
  setIsOpponentShaking: (shaking: boolean) => void;

  // Confirm Dialog
  showConfirmDialog: (config: Omit<ConfirmDialogConfig, 'isOpen'>) => void;
  hideConfirmDialog: () => void;

  // Helper actions
  resetResult: () => void;
}

const defaultConfirmDialog: ConfirmDialogConfig = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  type: 'warning',
  onConfirm: undefined
};

export const useUIStore = create<UIState>((set) => ({
  gameState: 'LOGIN',
  gameMode: 'standard',
  selectedBet: 10,
  language: 'zh',
  showSettings: false,
  isResourcesLoaded: false,
  isLoggedIn: false,
  isGuest: false,
  dungeonRun: null,
  pendingTavernDuel: null,
  finalResult: null,
  isPlayerShaking: false,
  isOpponentShaking: false,
  confirmDialog: defaultConfirmDialog,
  pvpRoomId: null,
  pvpRole: null,
  pvpSeed: null,

  setGameState: (gameState) => {
    set((state) => {
      if (state.gameState !== gameState) {
        audioBridge.playSfx('page_transition');
      }
      return { gameState };
    });
  },
  setGameMode: (gameMode) => set({ gameMode }),
  setSelectedBet: (selectedBet) => set({ selectedBet }),
  setLanguage: (language) => set({ language }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setIsResourcesLoaded: (isResourcesLoaded) => set({ isResourcesLoaded }),
  setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
  setIsGuest: (isGuest) => set({ isGuest }),
  setDungeonRun: (updater) => set((state) => ({ 
    dungeonRun: typeof updater === 'function' ? updater(state.dungeonRun) : updater 
  })),
  setPendingTavernDuel: (pendingTavernDuel) => set({ pendingTavernDuel }),
  setFinalResult: (finalResult) => set({ finalResult }),
  setIsPlayerShaking: (isPlayerShaking) => set({ isPlayerShaking }),
  setIsOpponentShaking: (isOpponentShaking) => set({ isOpponentShaking }),
  setPvpRoomId: (pvpRoomId) => set({ pvpRoomId }),
  setPvpRole: (pvpRole) => set({ pvpRole }),
  setPvpSeed: (pvpSeed) => set({ pvpSeed }),

  showConfirmDialog: (config) => {
    audioBridge.playSfx('modal_open');
    set({ confirmDialog: { ...defaultConfirmDialog, ...config, isOpen: true } });
  },
  hideConfirmDialog: () => {
    audioBridge.playSfx('modal_close');
    set({ confirmDialog: defaultConfirmDialog });
  },

  resetResult: () => set({ finalResult: null })
}));
