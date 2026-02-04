import { create } from 'zustand';
import { Rank, Deck, BattleRecord, PlayerStats } from '../types';
import { ApiService } from '../services/api';

interface UserState {
  activeAddress: string | null;
  balance: number;
  userRank: Rank;
  rankScore: number;
  winStreak: number;
  decks: Deck[];
  selectedDeck: Deck | null;
  history: BattleRecord[];
  leaderboard: PlayerStats[];
  isLoading: boolean;
  hasCompletedTutorial: boolean;

  // Actions
  setActiveAddress: (address: string | null) => void;
  setBalance: (balance: number) => void;
  setUserRank: (rank: Rank) => void;
  setRankScore: (score: number) => void;
  setWinStreak: (streak: number) => void;
  setDecks: (decks: Deck[]) => void;
  setSelectedDeck: (deck: Deck | null) => void;
  setHistory: (history: BattleRecord[]) => void;
  setLeaderboard: (leaderboard: PlayerStats[]) => void;
  setIsLoading: (loading: boolean) => void;
  setHasCompletedTutorial: (completed: boolean) => void;

  // Complex Actions
  loadUserData: (address: string) => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  saveDeck: (deck: Deck) => Promise<void>;
  updateBalance: (newBalance: number) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  activeAddress: null,
  balance: 0,
  userRank: 'Iron',
  rankScore: 0,
  winStreak: 0,
  decks: [],
  selectedDeck: null,
  history: [],
  leaderboard: [],
  isLoading: false,
  hasCompletedTutorial: false,

  setActiveAddress: (activeAddress) => set({ activeAddress }),
  setBalance: (balance) => set({ balance }),
  setUserRank: (userRank) => set({ userRank }),
  setRankScore: (rankScore) => set({ rankScore }),
  setWinStreak: (winStreak) => set({ winStreak }),
  setDecks: (decks) => set({ decks }),
  setSelectedDeck: (selectedDeck) => set({ selectedDeck }),
  setHistory: (history) => set({ history }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setHasCompletedTutorial: (hasCompletedTutorial) => set({ hasCompletedTutorial }),

  loadUserData: async (address: string) => {
    set({ isLoading: true });
    try {
      const profile = await ApiService.getProfile(address);
      set({
        balance: profile.balance,
        userRank: profile.userRank || 'Iron',
        rankScore: profile.rankScore || 0,
        winStreak: profile.stats?.winStreak || 0,
      });

      const userDecks = await ApiService.getDecks(address);
      set({ decks: userDecks });
      if (userDecks.length > 0 && !get().selectedDeck) {
        set({ selectedDeck: userDecks[0] });
      }

      const hist = await ApiService.getHistory(address);
      set({ history: hist });
    } catch (e) {
      console.error('Failed to load user data:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  loadLeaderboard: async () => {
    try {
      const lb = await ApiService.getLeaderboard();
      set({ leaderboard: lb });
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    }
  },

  saveDeck: async (deck: Deck) => {
    const { activeAddress, decks } = get();
    if (activeAddress) {
      await ApiService.saveDeck(activeAddress, deck);
    }

    const existingIndex = decks.findIndex((d) => d.id === deck.id);
    if (existingIndex >= 0) {
      const newDecks = [...decks];
      newDecks[existingIndex] = deck;
      set({ decks: newDecks });
    } else {
      set({ decks: [...decks, deck] });
    }
    set({ selectedDeck: deck });
  },

  updateBalance: (newBalance) => set({ balance: newBalance }),
}));
