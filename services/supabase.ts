import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import type { SpellType, Deck } from '../types/card';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** Supabase 是否已正确配置 */
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing. Running in offline/mock mode.');
}

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'wizard-duel-auth',
      }
    })
  : null as any;

// ============ 辅助：获取当前登录用户 ID ============

/** 获取当前 Supabase session 的 user id，未登录返回 null */
export const getCurrentUserId = async (): Promise<string | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
};

// ============ 认证 ============

/**
 * 钱包签名登录流程
 * 1. 检查或创建 profile
 * 2. 使用钱包地址作为主标识
 */
export const signInWithWallet = async (address: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data: { user }, error: authError } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        wallet_address: address.toLowerCase(),
      },
    }
  });

  if (authError) throw authError;
  if (!user) throw new Error('Failed to create anonymous user');

  // 检查/更新 Profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code === 'PGRST116') {
    // 创建新 Profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: `Wizard_${address.slice(0, 6)}`,
        gold: 100,
        level: 1,
      });
    
    if (insertError) console.error('Error creating profile:', insertError);
  }

  return { user, profile };
};

// ============ Profile（金币、经验、胜负） ============

export const getProfile = async (userId: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

/** 更新 profile 中的金币 */
export const updateGold = async (userId: string, gold: number) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('profiles')
    .update({ gold })
    .eq('id', userId);
  if (error) throw error;
};

/** 增减金币（原子操作风格：先读后写） */
export const adjustGold = async (userId: string, delta: number) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data: profile } = await supabase
    .from('profiles')
    .select('gold')
    .eq('id', userId)
    .single();
  const currentGold = profile?.gold ?? 0;
  const newGold = Math.max(0, currentGold + delta);
  await updateGold(userId, newGold);
  return newGold;
};

// ============ 战斗记录 ============

export const saveBattleResult = async (result: {
  user_id: string;
  opponent_name: string;
  result: 'win' | 'loss' | 'draw';
  turns: number;
  gold_earned: number;
  xp_earned: number;
}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { error: logError } = await supabase
    .from('battle_logs')
    .insert(result);

  if (logError) throw logError;

  // 更新 Profile (增加金币和经验)
  const { data: profile } = await supabase
    .from('profiles')
    .select('gold, xp, level, win_count, loss_count')
    .eq('id', result.user_id)
    .single();

  if (profile) {
    const newGold = (profile.gold || 0) + result.gold_earned;
    const newXp = (profile.xp || 0) + result.xp_earned;
    const isWin = result.result === 'win';
    
    await supabase.from('profiles').update({
      gold: newGold,
      xp: newXp,
      win_count: (profile.win_count || 0) + (isWin ? 1 : 0),
      loss_count: (profile.loss_count || 0) + (isWin ? 0 : 1),
    }).eq('id', result.user_id);
  }
};

/** 获取用户战斗记录 */
export const getBattleLogs = async (userId: string, limit = 50) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('battle_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

// ============ 卡牌收藏（user_cards 表） ============

/**
 * 获取用户的所有卡牌收藏
 * 返回 SpellType[] 数组（按 quantity 展开）
 */
export const getUserCards = async (userId: string): Promise<SpellType[]> => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('user_cards')
    .select('card_id, quantity')
    .eq('user_id', userId);
  
  if (error) throw error;
  if (!data) return [];

  // 将 { card_id, quantity } 展开为 SpellType[]
  const cards: SpellType[] = [];
  for (const row of data) {
    const qty = row.quantity ?? 1;
    for (let i = 0; i < qty; i++) {
      cards.push(row.card_id as SpellType);
    }
  }
  return cards;
};

/**
 * 添加卡牌到用户收藏（增量）
 * 如果已有该卡，quantity += count；否则插入新行
 */
export const addUserCards = async (userId: string, cardIds: SpellType[]) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  
  // 统计每种卡牌的数量
  const cardCounts: Record<string, number> = {};
  for (const id of cardIds) {
    cardCounts[id] = (cardCounts[id] || 0) + 1;
  }

  for (const [cardId, count] of Object.entries(cardCounts)) {
    // 检查是否已有这张卡
    const { data: existing } = await supabase
      .from('user_cards')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .single();
    
    if (existing) {
      // 已有 → 更新数量
      await supabase
        .from('user_cards')
        .update({ quantity: (existing.quantity ?? 1) + count })
        .eq('id', existing.id);
    } else {
      // 新增
      await supabase
        .from('user_cards')
        .insert({ user_id: userId, card_id: cardId, quantity: count });
    }
  }
};

/**
 * 完整覆盖用户卡牌收藏（用于全量同步）
 * 先删除旧数据，再批量插入
 */
export const setUserCards = async (userId: string, cardIds: SpellType[]) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  // 统计每种卡牌数量
  const cardCounts: Record<string, number> = {};
  for (const id of cardIds) {
    cardCounts[id] = (cardCounts[id] || 0) + 1;
  }

  // 删除旧数据
  await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', userId);

  // 批量插入
  const rows = Object.entries(cardCounts).map(([cardId, quantity]) => ({
    user_id: userId,
    card_id: cardId,
    quantity,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('user_cards')
      .insert(rows);
    if (error) throw error;
  }
};

// ============ 卡组（decks 表） ============

/**
 * 获取用户所有卡组
 */
export const getUserDecks = async (userId: string): Promise<Deck[]> => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  if (!data) return [];

  return data.map(row => ({
    id: row.id,
    name: row.name || 'Unnamed Deck',
    cards: (row.cards || []) as SpellType[],
    createdAt: new Date(row.created_at || Date.now()).getTime(),
    lastUsed: new Date(row.created_at || Date.now()).getTime(),
  }));
};

/**
 * 保存/更新一个卡组（upsert）
 */
export const saveUserDeck = async (userId: string, deck: Deck) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  // 尝试更新现有卡组
  const { data: existing } = await supabase
    .from('decks')
    .select('id')
    .eq('id', deck.id)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('decks')
      .update({
        name: deck.name,
        cards: deck.cards,
      })
      .eq('id', deck.id)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('decks')
      .insert({
        id: deck.id,
        user_id: userId,
        name: deck.name,
        cards: deck.cards,
      });
    if (error) throw error;
  }
};

/**
 * 删除一个卡组
 */
export const deleteUserDeck = async (userId: string, deckId: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId)
    .eq('user_id', userId);
  if (error) throw error;
};

// ============ 卡包库存（user_packs 表） ============

/**
 * 获取用户的所有卡包库存
 * 返回 Record<packId, quantity>
 */
export const getUserPacks = async (userId: string): Promise<Record<string, number>> => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('user_packs')
    .select('pack_id, quantity')
    .eq('user_id', userId);
  
  if (error) throw error;
  if (!data) return {};

  const result: Record<string, number> = {};
  for (const row of data) {
    if (row.quantity > 0) {
      result[row.pack_id] = row.quantity;
    }
  }
  return result;
};

/**
 * 增加卡包数量
 * 已有该种类 → quantity += count；否则插入新行
 */
export const addUserPacks = async (userId: string, packId: string, count: number) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  const { data: existing } = await supabase
    .from('user_packs')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('pack_id', packId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('user_packs')
      .update({ 
        quantity: existing.quantity + count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_packs')
      .insert({ 
        user_id: userId, 
        pack_id: packId, 
        quantity: count,
      });
    if (error) throw error;
  }
};

/**
 * 消耗一个卡包（quantity -= 1）
 * 返回是否成功（库存不足返回 false）
 */
export const consumeUserPack = async (userId: string, packId: string): Promise<boolean> => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  const { data: existing } = await supabase
    .from('user_packs')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('pack_id', packId)
    .single();

  if (!existing || existing.quantity <= 0) return false;

  const { error } = await supabase
    .from('user_packs')
    .update({ 
      quantity: existing.quantity - 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    console.error('Failed to consume pack:', error);
    return false;
  }
  return true;
};

/**
 * 全量覆盖卡包库存（用于数据迁移/同步）
 */
export const setUserPacks = async (userId: string, packs: Record<string, number>) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  // 删除旧数据
  await supabase
    .from('user_packs')
    .delete()
    .eq('user_id', userId);

  // 批量插入
  const rows = Object.entries(packs)
    .filter(([_, qty]) => qty > 0)
    .map(([packId, quantity]) => ({
      user_id: userId,
      pack_id: packId,
      quantity,
    }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('user_packs')
      .insert(rows);
    if (error) throw error;
  }
};
