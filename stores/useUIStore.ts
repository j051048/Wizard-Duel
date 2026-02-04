import { create } from 'zustand';
import { GameState, GameMode, Language, SpellType, Rank } from '../types';
import { DungeonRunState } from '../types/dungeon';

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
  dungeonRun: DungeonRunState | null;
  pendingTavernDuel: any | null;
  finalResult: FinalResult | null;
  isPlayerShaking: boolean;
  isOpponentShaking: boolean;

  // Actions
  setGameState: (state: GameState) => void;
  setGameMode: (mode: GameMode) => void;
  setSelectedBet: (bet: number) => void;
  setLanguage: (lang: Language) => void;
  setShowSettings: (show: boolean) => void;
  setIsResourcesLoaded: (loaded: boolean) => void;
  setDungeonRun: (run: DungeonRunState | null | ((prev: DungeonRunState | null) => DungeonRunState | null)) => void;
  setPendingTavernDuel: (duel: any | null) => void;
  setFinalResult: (result: FinalResult | null) => void;
  setIsPlayerShaking: (shaking: boolean) => void;
  setIsOpponentShaking: (shaking: boolean) => void;

  // Helper actions
  resetResult: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  gameState: 'LOBBY',
  gameMode: 'standard',
  selectedBet: 10,
  language: 'zh',
  showSettings: false,
  isResourcesLoaded: false,
  dungeonRun: null,
  pendingTavernDuel: null,
  finalResult: null,
  isPlayerShaking: false,
  isOpponentShaking: false,

  setGameState: (gameState) => set({ gameState }),
  setGameMode: (gameMode) => set({ gameMode }),
  setSelectedBet: (selectedBet) => set({ selectedBet }),
  setLanguage: (language) => set({ language }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setIsResourcesLoaded: (isResourcesLoaded) => set({ isResourcesLoaded }),
  setDungeonRun: (updater) => set((state) => ({ 
    dungeonRun: typeof updater === 'function' ? updater(state.dungeonRun) : updater 
  })),
  setPendingTavernDuel: (pendingTavernDuel) => set({ pendingTavernDuel }),
  setFinalResult: (finalResult) => set({ finalResult }),
  setIsPlayerShaking: (isPlayerShaking) => set({ isPlayerShaking }),
  setIsOpponentShaking: (isOpponentShaking) => set({ isOpponentShaking }),

  resetResult: () => set({ finalResult: null })
}));
