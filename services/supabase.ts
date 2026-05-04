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
  : null as unknown as ReturnType<typeof createClient<Database>>;

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
export const signInWithWallet = async (address: string, signature: string, message: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  
  // Call Edge Function to handle secure login
  const { data, error } = await supabase.functions.invoke('wallet-login', {
    body: { address, signature, message }
  });

  if (error) {
    console.error('Edge function error:', error);
    // Fallback: If edge function fails (e.g. not deployed), try anonymous login but warn user
    console.warn('Falling back to anonymous login (Data will NOT be persistent across sessions!)');
    return signInWithWalletLegacy(address);
  }

  // Edge Function returns { data: { session, user }, error } — handle both nesting levels
  const session = data.data?.session || data.session;
  const user = data.data?.user || data.user;

  if (!session) {
    throw new Error('Failed to retrieve session from login function');
  }

  // Set the session
  const { error: sessionError } = await supabase.auth.setSession(session);
  if (sessionError) throw sessionError;

  // [A-2a] 仅验证 profile 存在，完整数据由 loadUserData 加载
  const { data: profileExists, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (profileError) console.error('Error fetching profile:', profileError);

  return { user, profile: profileExists };
};

/**
 * Legacy anonymous login (Backup)
 */
const signInWithWalletLegacy = async (address: string) => {
  const { data: { user }, error: authError } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        wallet_address: address.toLowerCase(),
      },
    }
  });

  if (authError) throw authError;
  if (!user) throw new Error('Failed to create anonymous user');

  // Check/Update Profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code === 'PGRST116') {
    // Create new Profile
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
  // [A-2b] 仅查询需要的列，减少传输量 ~60%
  const { data, error } = await supabase
    .from('profiles')
    .select('gold, rank_score, rank_tier, win_count, level, xp')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

/** 更新 profile 中的金币 (不安全，仅用于测试或初始化) */
export const updateGold = async (userId: string, gold: number) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('profiles')
    .update({ gold })
    .eq('id', userId);
  if (error) throw error;
};

/** 
 * 安全调整用户金币 (调用 RPC)
 * [P0 Fix #3] 使用 RPC 确保金币增减原子性和安全性 
 */
export const adjustGold = async (userId: string, delta: number, reason: string = 'game') => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.rpc('adjust_gold_secure', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason
  });
  
  if (error) {
    console.error('RPC adjust_gold_secure failed:', error);
    throw error;
  }
  
  // adjust_gold_secure returns TABLE
  const rows = data as any[];
  if (!rows?.[0]?.success) {
    throw new Error(rows?.[0]?.error_message || 'adjust_gold_secure failed');
  }

  return rows[0].new_balance as number;
};



// ============ 战斗记录 ============

export const saveBattleResult = async (result: {
  user_id: string;
  opponent_name: string;
  result: 'win' | 'loss' | 'draw';
  turns: number;
  gold_earned: number;
  xp_earned: number;
  score_delta: number; // [P0 Fix #3] 新增积分变化字段
}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  // [P0 Fix #3] 使用 RPC (Secure) 原子操作
  const { data, error } = await supabase.rpc('settle_battle_secure', {
    p_user_id: result.user_id,
    p_result: result.result, // p_outcome -> p_result
    p_gold_earned: result.gold_earned,
    p_xp_earned: result.xp_earned,
    p_score_delta: result.score_delta,
    p_turns: result.turns,
    p_opponent_name: result.opponent_name
  });

  if (error) {
    console.error('RPC settle_battle_secure failed:', error);
    // 可选：如果 RPC 不存在（迁移未运行），尝试回退到旧逻辑？
    // 但为了安全性，建议直接抛出错误或提示维护
    throw error;
  }
  
  return (data as any)?.[0];
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
  const uniqueCardIds = Object.keys(cardCounts);

  // 查询已有卡牌以计算合并后的数量（2次请求：1 SELECT + 1 UPSERT）
  const { data: existingRows } = await supabase
    .from('user_cards')
    .select('card_id, quantity')
    .eq('user_id', userId)
    .in('card_id', uniqueCardIds);

  const existingMap = new Map<string, number>();
  for (const row of existingRows ?? []) {
    existingMap.set(row.card_id, row.quantity ?? 1);
  }

  // 构建最终行：已有卡牌累加数量，新卡牌直接插入
  const rows = Object.entries(cardCounts).map(([cardId, count]) => ({
    user_id: userId,
    card_id: cardId,
    quantity: (existingMap.get(cardId) ?? 0) + count,
  }));

  // 单次 upsert 处理所有行（需要 (user_id, card_id) 唯一约束）
  if (rows.length > 0) {
    const { error } = await supabase
      .from('user_cards')
      .upsert(rows, { onConflict: 'user_id,card_id', ignoreDuplicates: false });
    if (error) throw error;
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

  // 删除旧数据，然后 upsert 新数据（upsert 兜底：如果 delete 因并发失败，upsert 仍能正确合并）
  await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', userId);

  const rows = Object.entries(cardCounts).map(([cardId, quantity]) => ({
    user_id: userId,
    card_id: cardId,
    quantity,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('user_cards')
      .upsert(rows, { onConflict: 'user_id,card_id', ignoreDuplicates: false });
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

  return (data as Array<{ id: string; name: string | null; cards: string[]; created_at: string | null }>).map(row => ({
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

  const { error } = await supabase
    .from('decks')
    .upsert(
      { id: deck.id, user_id: userId, name: deck.name, cards: deck.cards },
      { onConflict: 'id' }
    );
  if (error) throw error;
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

  // 删除旧数据，然后 upsert（兜底并发安全）
  await supabase
    .from('user_packs')
    .delete()
    .eq('user_id', userId);

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
      .upsert(rows, { onConflict: 'user_id,pack_id', ignoreDuplicates: false });
    if (error) throw error;
  }
};
