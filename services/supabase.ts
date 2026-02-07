import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'wizard-duel-auth',
  }
});

/**
 * 钱包签名登录流程
 * 1. 检查或创建 profile
 * 2. 使用钱包地址作为主标识
 * 3. 注意：出于安全考虑，生产环境应在后端验证签名。
 * 这里我们简化流程，将钱包地址作为用户标识。
 */
export const signInWithWallet = async (address: string) => {
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

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const saveBattleResult = async (result: {
  user_id: string;
  opponent_name: string;
  result: 'win' | 'loss' | 'draw';
  turns: number;
  gold_earned: number;
  xp_earned: number;
}) => {
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
