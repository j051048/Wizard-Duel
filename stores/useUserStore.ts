import { create } from 'zustand';
import { Rank, Deck, BattleRecord, PlayerStats, SpellType } from '../types';
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
  inventory: SpellType[];
  leaderboard: PlayerStats[];
  isLoading: boolean;
  hasCompletedTutorial: boolean;

  purchasedBundles: string[];
  packInventory: Record<string, number>;

  // Actions
  setActiveAddress: (address: string | null) => void;
  setBalance: (balance: number) => void;
  setUserRank: (rank: Rank) => void;
  setRankScore: (score: number) => void;
  setWinStreak: (streak: number) => void;
  setDecks: (decks: Deck[]) => void;
  setPurchasedBundles: (ids: string[]) => void;
  addPacks: (packId: string, count: number) => void;
  consumePack: (packId: string) => boolean;
  purchaseBundle: (bundleId: string) => void;
  setSelectedDeck: (deck: Deck | null) => void;
  setHistory: (history: BattleRecord[]) => void;
  setInventory: (inventory: SpellType[]) => void;
  setLeaderboard: (leaderboard: PlayerStats[]) => void;
  setIsLoading: (loading: boolean) => void;
  setHasCompletedTutorial: (completed: boolean) => void;
  
  // Complex Actions
  loadUserData: (address: string) => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  saveDeck: (deck: Deck) => Promise<void>;
  updateBalance: (newBalance: number) => void;
  addCardsToInventory: (cards: SpellType[]) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  activeAddress: null,
  balance: 0,
  userRank: 'Iron',
  rankScore: 0,
  winStreak: 0,
  decks: [],
  purchasedBundles: [],
  packInventory: {},
  selectedDeck: null,
  history: [],
  inventory: [],
  leaderboard: [],
  isLoading: false,
  hasCompletedTutorial: false,

  setActiveAddress: (activeAddress) => set({ activeAddress }),
  setBalance: (balance) => set({ balance }),
  setUserRank: (userRank) => set({ userRank }),
  setRankScore: (rankScore) => set({ rankScore }),
  setWinStreak: (winStreak) => set({ winStreak }),
  setDecks: (decks) => set({ decks }),
  setPurchasedBundles: (purchasedBundles) => set({ purchasedBundles }),
  
  addPacks: (packId, count) => {
    const { packInventory } = get();
    const newInv = { ...packInventory, [packId]: (packInventory[packId] || 0) + count };
    set({ packInventory: newInv });
    try { localStorage.setItem('wizard_duel_packs', JSON.stringify(newInv)); } catch {}
  },
  
  consumePack: (packId) => {
    const { packInventory } = get();
    if (!packInventory[packId] || packInventory[packId] <= 0) return false;
    const newInv = { ...packInventory, [packId]: packInventory[packId] - 1 };
    set({ packInventory: newInv });
    try { localStorage.setItem('wizard_duel_packs', JSON.stringify(newInv)); } catch {}
    return true;
  },

  purchaseBundle: (bundleId) => {
    const { purchasedBundles } = get();
    if (!purchasedBundles.includes(bundleId)) {
      set({ purchasedBundles: [...purchasedBundles, bundleId] });
      // 这里可以添加 localStorage 持久化
      try {
        localStorage.setItem('wizard_duel_purchases', JSON.stringify([...purchasedBundles, bundleId]));
      } catch {}
    }
  },
  setSelectedDeck: (selectedDeck) => set({ selectedDeck }),
  setHistory: (history) => set({ history }),
  setInventory: (inventory) => set({ inventory }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setHasCompletedTutorial: (hasCompletedTutorial) => set({ hasCompletedTutorial }),

  loadUserData: async (address: string) => {
    set({ isLoading: true });
    try {
      // 1. 从 Supabase 获取 Profile (如果已登录)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          set({
            balance: profile.gold || 0,
            userRank: (profile.level && profile.level > 10 ? 'Gold' : 'Iron') as Rank, // 简化逻辑
            rankScore: profile.xp || 0,
            winStreak: profile.win_count || 0,
          });
        }
      } else {
        // 回退到 Mock 逻辑 (针对未登录游客)
        const profile = await ApiService.getProfile(address);
        set({
          balance: profile.balance,
          userRank: profile.userRank || 'Iron',
          rankScore: profile.rankScore || 0,
          winStreak: profile.stats?.winStreak || 0,
        });
      }

      // 获取当前用户的卡组
      const userDecks = await ApiService.getDecks(address);
      set({ decks: userDecks });
      if (userDecks.length > 0 && !get().selectedDeck) {
        set({ selectedDeck: userDecks[0] });
      }

      // 暂时保留本地存储逻辑用于 PWA 离线体验
      const savedPurchases = localStorage.getItem('wizard_duel_purchases');
      if (savedPurchases) {
        try { set({ purchasedBundles: JSON.parse(savedPurchases) }); } catch (e) {}
      }
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
    
    // 限制最多 3 套卡组
    let newDecks = [...decks];
    const existingIndex = decks.findIndex((d) => d.id === deck.id);
    
    if (existingIndex >= 0) {
      newDecks[existingIndex] = deck;
    } else {
      if (newDecks.length >= 3) {
        // 如果已经有 3 套，且是新增，则替换最久没用的或者提示错误。
        // 这里采用简单的 logic：如果满 3 套且试图新增，则不操作或返回。
        // 在 UI 层我们会控制用户只能编辑已有的槽位。
        return;
      }
      newDecks.push(deck);
    }

    if (activeAddress) {
      await ApiService.saveDeck(activeAddress, deck);
    }

    set({ decks: newDecks, selectedDeck: deck });
  },

  updateBalance: (newBalance) => set({ balance: newBalance }),

  addCardsToInventory: async (cards) => {
    const { activeAddress, inventory } = get();
    const newInventory = [...inventory, ...cards];
    
    set({ inventory: newInventory });
    
    if (activeAddress) {
      await ApiService.saveInventory(activeAddress, newInventory);
    }
  }
}));
