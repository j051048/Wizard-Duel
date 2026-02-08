import { create } from 'zustand';
import { Rank, Deck, BattleRecord, PlayerStats, SpellType } from '../types';
import { ApiService } from '../services/api';

interface UserState {
  activeAddress: string | null;
  /** Supabase user id (available after wallet login with Supabase) */
  supabaseUserId: string | null;
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
  setSupabaseUserId: (id: string | null) => void;
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
  login: (address: string, isGuest: boolean) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  activeAddress: null,
  supabaseUserId: null,
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
  setSupabaseUserId: (supabaseUserId) => set({ supabaseUserId }),
  setBalance: (balance) => {
    set({ balance });
    // 异步同步金币到 Supabase（fire-and-forget）
    const { supabaseUserId } = get();
    if (supabaseUserId) {
      import('../services/supabase').then(({ updateGold }) => {
        updateGold(supabaseUserId, balance).catch(err =>
          console.warn('Supabase gold sync failed:', err)
        );
      }).catch(() => {});
    }
  },
  setUserRank: (userRank) => set({ userRank }),
  setRankScore: (rankScore) => set({ rankScore }),
  setWinStreak: (winStreak) => set({ winStreak }),
  setDecks: (decks) => set({ decks }),
  setPurchasedBundles: (purchasedBundles) => set({ purchasedBundles }),
  
  addPacks: (packId, count) => {
    const { packInventory, supabaseUserId } = get();
    const newInv = { ...packInventory, [packId]: (packInventory[packId] || 0) + count };
    set({ packInventory: newInv });
    // 本地备份
    try { localStorage.setItem('wizard_duel_packs', JSON.stringify(newInv)); } catch {}
    // 同步到 Supabase
    if (supabaseUserId) {
      import('../services/supabase').then(({ addUserPacks }) => {
        addUserPacks(supabaseUserId, packId, count).catch(err =>
          console.warn('Supabase pack add failed:', err)
        );
      }).catch(() => {});
    }
  },
  
  consumePack: (packId) => {
    const { packInventory, supabaseUserId } = get();
    if (!packInventory[packId] || packInventory[packId] <= 0) return false;
    const newInv = { ...packInventory, [packId]: packInventory[packId] - 1 };
    set({ packInventory: newInv });
    // 本地备份
    try { localStorage.setItem('wizard_duel_packs', JSON.stringify(newInv)); } catch {}
    // 同步到 Supabase
    if (supabaseUserId) {
      import('../services/supabase').then(({ consumeUserPack }) => {
        consumeUserPack(supabaseUserId, packId).catch(err =>
          console.warn('Supabase pack consume failed:', err)
        );
      }).catch(() => {});
    }
    return true;
  },

  purchaseBundle: (bundleId) => {
    const { purchasedBundles } = get();
    if (!purchasedBundles.includes(bundleId)) {
      const updated = [...purchasedBundles, bundleId];
      set({ purchasedBundles: updated });
      try { localStorage.setItem('wizard_duel_purchases', JSON.stringify(updated)); } catch {}
    }
  },
  setSelectedDeck: (selectedDeck) => set({ selectedDeck }),
  setHistory: (history) => set({ history }),
  setInventory: (inventory) => set({ inventory }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setHasCompletedTutorial: (hasCompletedTutorial) => set({ hasCompletedTutorial }),

  /**
   * 加载用户数据 — 优先从 Supabase，回退到 localStorage/Mock
   */
  loadUserData: async (address: string) => {
    set({ isLoading: true });
    try {
      // ========== 1. 尝试从 Supabase 加载全部数据 ==========
      let supabaseLoaded = false;
      try {
        const {
          supabase, isSupabaseConfigured, getProfile,
          getUserCards, getUserDecks, getUserPacks
        } = await import('../services/supabase');

        if (!isSupabaseConfigured) throw new Error('Supabase not configured');

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const userId = session.user.id;
          set({ supabaseUserId: userId });

          // -- Profile（金币、经验、胜负）
          const profile = await getProfile(userId);
          if (profile) {
            set({
              balance: profile.gold || 0,
              userRank: (profile.level && profile.level > 10 ? 'Gold' : 'Iron') as Rank,
              rankScore: profile.xp || 0,
              winStreak: profile.win_count || 0,
            });
          }

          // -- 卡牌收藏（从 user_cards 表）
          const cards = await getUserCards(userId);
          set({ inventory: cards });

          // -- 卡组（从 decks 表）
          const decks = await getUserDecks(userId);
          set({ decks });
          if (decks.length > 0 && !get().selectedDeck) {
            set({ selectedDeck: decks[0] });
          }

          // -- 卡包库存（从 user_packs 表）
          const packs = await getUserPacks(userId);
          set({ packInventory: packs });
          // 同步写入 localStorage 作为离线备份
          try { localStorage.setItem('wizard_duel_packs', JSON.stringify(packs)); } catch {}

          supabaseLoaded = true;
          console.log('[UserStore] Loaded all data from Supabase ✅');
        }
      } catch (supabaseErr) {
        console.warn('Supabase unavailable, falling back to local/mock:', supabaseErr);
      }

      // ========== 2. 回退到 Mock/本地逻辑 ==========
      if (!supabaseLoaded) {
        const profile = await ApiService.getProfile(address);
        set({
          balance: profile.balance,
          userRank: profile.userRank || 'Iron',
          rankScore: profile.rankScore || 0,
          winStreak: profile.stats?.winStreak || 0,
        });

        // 卡组（localStorage mock）
        const userDecks = await ApiService.getDecks(address);
        set({ decks: userDecks });
        if (userDecks.length > 0 && !get().selectedDeck) {
          set({ selectedDeck: userDecks[0] });
        }

        // 卡牌收藏（localStorage mock）
        const inventory = await ApiService.getInventory(address);
        set({ inventory });
      }

      // ========== 3. 本地补充数据（PWA 离线兼容） ==========
      const savedPurchases = localStorage.getItem('wizard_duel_purchases');
      if (savedPurchases) {
        try { set({ purchasedBundles: JSON.parse(savedPurchases) }); } catch {}
      }
      const savedPacks = localStorage.getItem('wizard_duel_packs');
      if (savedPacks) {
        try { set({ packInventory: JSON.parse(savedPacks) }); } catch {}
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

  /**
   * 保存卡组 — 同时写入 Supabase + localStorage
   */
  saveDeck: async (deck: Deck) => {
    const { activeAddress, decks, supabaseUserId } = get();
    
    // 限制最多 3 套卡组
    let newDecks = [...decks];
    const existingIndex = decks.findIndex((d) => d.id === deck.id);
    
    if (existingIndex >= 0) {
      newDecks[existingIndex] = deck;
    } else {
      if (newDecks.length >= 3) {
        return;
      }
      newDecks.push(deck);
    }

    set({ decks: newDecks, selectedDeck: deck });

    // 写入 Supabase（优先）
    if (supabaseUserId) {
      try {
        const { saveUserDeck } = await import('../services/supabase');
        await saveUserDeck(supabaseUserId, deck);
        console.log('[UserStore] Deck saved to Supabase ✅');
      } catch (err) {
        console.warn('Supabase deck save failed, falling back to local:', err);
      }
    }

    // 本地备份（始终执行）
    if (activeAddress) {
      await ApiService.saveDeck(activeAddress, deck);
    }
  },

  updateBalance: (newBalance) => set({ balance: newBalance }),

  /**
   * 添加卡牌到收藏 — 同时写入 Supabase + localStorage
   */
  addCardsToInventory: async (cards) => {
    const { activeAddress, inventory, supabaseUserId } = get();
    const newInventory = [...inventory, ...cards];
    
    set({ inventory: newInventory });
    
    // 写入 Supabase（优先）
    if (supabaseUserId) {
      try {
        const { addUserCards } = await import('../services/supabase');
        await addUserCards(supabaseUserId, cards);
        console.log('[UserStore] Cards saved to Supabase ✅');
      } catch (err) {
        console.warn('Supabase card save failed, falling back to local:', err);
      }
    }

    // 本地备份（始终执行）
    if (activeAddress) {
      await ApiService.saveInventory(activeAddress, newInventory);
    }
  },

  /**
   * 登录 — 设置地址并加载全部用户数据
   */
  login: async (address, isGuest) => {
    get().setActiveAddress(address);
    if (isGuest) {
      get().setSupabaseUserId(null);
    }
    await get().loadUserData(address);
  }
}));
