-- ============================================================
-- P0 Security Fixes: 金币、开包、战斗结算
-- ============================================================
-- ============ 0. Schema Update: Add rank_score column & Migrate Data ============
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'rank_score'
) THEN
ALTER TABLE profiles
ADD COLUMN rank_score INTEGER DEFAULT 1000;
-- [Migration] Data Migration:
-- 历史数据中 'xp' 字段被用作积分 (Rank Score)，所以将其迁移到新的 rank_score 字段
UPDATE profiles
SET rank_score = COALESCE(xp, 1000);
END IF;
END $$;
-- ============ 1. 金币交易日志表 ============
CREATE TABLE IF NOT EXISTS gold_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL DEFAULT 'game',
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gold_transactions_user_id ON gold_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gold_transactions_created_at ON gold_transactions(created_at);
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON gold_transactions;
CREATE POLICY "Users can view own transactions" ON gold_transactions FOR
SELECT USING (auth.uid() = user_id);
-- ============ 2. 保底计数器表 ============
CREATE TABLE IF NOT EXISTS pity_counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rare_pity INTEGER DEFAULT 0,
    mythic_pity INTEGER DEFAULT 0,
    legendary_pity INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
ALTER TABLE pity_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own pity" ON pity_counters;
CREATE POLICY "Users can view own pity" ON pity_counters FOR
SELECT USING (auth.uid() = user_id);
-- ============ 3. 开包记录表 ============
CREATE TABLE IF NOT EXISTS pack_openings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pack_type TEXT NOT NULL,
    results JSONB NOT NULL,
    pity_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pack_openings_user_id ON pack_openings(user_id);
ALTER TABLE pack_openings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own pack openings" ON pack_openings;
CREATE POLICY "Users can view own pack openings" ON pack_openings FOR
SELECT USING (auth.uid() = user_id);
-- ============ 4. 金币原子操作 RPC (Secure) ============
CREATE OR REPLACE FUNCTION adjust_gold_secure(
        p_user_id UUID,
        p_delta INTEGER,
        p_reason TEXT DEFAULT 'game'
    ) RETURNS TABLE(
        new_balance INTEGER,
        success BOOLEAN,
        error_message TEXT
    ) AS $$
DECLARE v_current_gold INTEGER;
v_new_gold INTEGER;
BEGIN
SELECT gold INTO v_current_gold
FROM profiles
WHERE id = p_user_id FOR
UPDATE;
IF NOT FOUND THEN RETURN QUERY
SELECT 0::INTEGER,
    FALSE,
    'User not found'::TEXT;
RETURN;
END IF;
v_new_gold := GREATEST(0, v_current_gold + p_delta);
IF p_delta < 0
AND v_current_gold < ABS(p_delta) THEN RETURN QUERY
SELECT v_current_gold,
    FALSE,
    'Insufficient gold'::TEXT;
RETURN;
END IF;
UPDATE profiles
SET gold = v_new_gold
WHERE id = p_user_id;
INSERT INTO gold_transactions (
        user_id,
        delta,
        reason,
        balance_before,
        balance_after
    )
VALUES (
        p_user_id,
        p_delta,
        p_reason,
        v_current_gold,
        v_new_gold
    );
RETURN QUERY
SELECT v_new_gold,
    TRUE,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============ 5. 开包 RPC（服务端概率计算） ============
CREATE OR REPLACE FUNCTION open_pack_secure(
        p_user_id UUID,
        p_pack_id TEXT,
        p_pack_type TEXT DEFAULT 'standard'
    ) RETURNS TABLE(
        success BOOLEAN,
        cards JSONB,
        pity_triggered BOOLEAN,
        error_message TEXT
    ) AS $$
DECLARE v_pack_quantity INTEGER;
v_pity RECORD;
v_results JSONB := '[]'::JSONB;
v_card_count INTEGER := 5;
v_roll FLOAT;
v_rarity TEXT;
v_pity_triggered BOOLEAN := FALSE;
v_legendary_rate FLOAT := 0.01;
v_mythic_rate FLOAT := 0.05;
v_rare_rate FLOAT := 0.20;
v_legendary_pity_threshold INTEGER := 40;
v_mythic_pity_threshold INTEGER := 20;
v_rare_pity_threshold INTEGER := 5;
BEGIN -- 检查卡包库存
SELECT quantity INTO v_pack_quantity
FROM user_packs
WHERE user_id = p_user_id
    AND pack_id = p_pack_id FOR
UPDATE;
IF NOT FOUND
OR v_pack_quantity <= 0 THEN RETURN QUERY
SELECT FALSE,
    NULL::JSONB,
    FALSE,
    'No packs available'::TEXT;
RETURN;
END IF;
-- 获取或创建保底计数器
INSERT INTO pity_counters (user_id)
VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
SELECT * INTO v_pity
FROM pity_counters
WHERE user_id = p_user_id FOR
UPDATE;
-- Pack type 概率调整
IF p_pack_type = 'premium' THEN v_rare_rate := v_rare_rate + 0.05;
v_mythic_rate := v_mythic_rate + 0.02;
ELSIF p_pack_type = 'legendary' THEN v_rare_rate := v_rare_rate + 0.10;
v_mythic_rate := v_mythic_rate + 0.05;
v_legendary_rate := v_legendary_rate + 0.03;
END IF;
-- 生成卡牌
FOR i IN 1..v_card_count LOOP v_roll := random();
IF v_pity.legendary_pity >= v_legendary_pity_threshold THEN v_rarity := 'legendary';
v_pity.legendary_pity := 0;
v_pity.mythic_pity := 0;
v_pity.rare_pity := 0;
v_pity_triggered := TRUE;
ELSIF v_pity.mythic_pity >= v_mythic_pity_threshold THEN v_rarity := 'mythic';
v_pity.mythic_pity := 0;
v_pity.rare_pity := 0;
v_pity.legendary_pity := v_pity.legendary_pity + 1;
v_pity_triggered := TRUE;
ELSIF v_pity.rare_pity >= v_rare_pity_threshold THEN v_rarity := 'rare';
v_pity.rare_pity := 0;
v_pity.mythic_pity := v_pity.mythic_pity + 1;
v_pity.legendary_pity := v_pity.legendary_pity + 1;
v_pity_triggered := TRUE;
ELSIF v_roll < v_legendary_rate THEN v_rarity := 'legendary';
v_pity.legendary_pity := 0;
v_pity.mythic_pity := 0;
v_pity.rare_pity := 0;
ELSIF v_roll < v_legendary_rate + v_mythic_rate THEN v_rarity := 'mythic';
v_pity.mythic_pity := 0;
v_pity.rare_pity := 0;
v_pity.legendary_pity := v_pity.legendary_pity + 1;
ELSIF v_roll < v_legendary_rate + v_mythic_rate + v_rare_rate THEN v_rarity := 'rare';
v_pity.rare_pity := 0;
v_pity.mythic_pity := v_pity.mythic_pity + 1;
v_pity.legendary_pity := v_pity.legendary_pity + 1;
ELSE v_rarity := 'common';
v_pity.rare_pity := v_pity.rare_pity + 1;
v_pity.mythic_pity := v_pity.mythic_pity + 1;
v_pity.legendary_pity := v_pity.legendary_pity + 1;
END IF;
v_results := v_results || jsonb_build_object('rarity', v_rarity, 'index', i);
END LOOP;
-- 更新保底计数器
UPDATE pity_counters
SET rare_pity = v_pity.rare_pity,
    mythic_pity = v_pity.mythic_pity,
    legendary_pity = v_pity.legendary_pity,
    updated_at = NOW()
WHERE user_id = p_user_id;
-- 扣除卡包
UPDATE user_packs
SET quantity = quantity - 1,
    updated_at = NOW()
WHERE user_id = p_user_id
    AND pack_id = p_pack_id;
-- 记录开包记录
INSERT INTO pack_openings (user_id, pack_type, results, pity_triggered)
VALUES (
        p_user_id,
        p_pack_type,
        v_results,
        v_pity_triggered
    );
RETURN QUERY
SELECT TRUE,
    v_results,
    v_pity_triggered,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============ 6. 战斗结算验证 RPC (Secure + Rank Score) ============
CREATE OR REPLACE FUNCTION settle_battle_secure(
        p_user_id UUID,
        p_result TEXT,
        -- 'win', 'loss', 'draw'
        p_gold_earned INTEGER,
        p_xp_earned INTEGER,
        p_score_delta INTEGER,
        -- Rank Score (ELO) delta
        p_opponent_name TEXT,
        p_turns INTEGER,
        p_battle_hash TEXT DEFAULT NULL
    ) RETURNS TABLE(
        success BOOLEAN,
        new_gold INTEGER,
        new_xp INTEGER,
        new_rank_score INTEGER,
        error_message TEXT
    ) AS $$
DECLARE v_profile RECORD;
v_new_gold INTEGER;
v_new_xp INTEGER;
v_new_score INTEGER;
BEGIN -- 获取玩家资料（加锁）
SELECT * INTO v_profile
FROM profiles
WHERE id = p_user_id FOR
UPDATE;
IF NOT FOUND THEN RETURN QUERY
SELECT FALSE,
    0,
    0,
    0,
    'User not found'::TEXT;
RETURN;
END IF;
-- 简单验证金币奖励合理性
IF p_result = 'win'
AND p_gold_earned > 1000 THEN RETURN QUERY
SELECT FALSE,
    v_profile.gold::INTEGER,
    v_profile.xp::INTEGER,
    v_profile.rank_score::INTEGER,
    'Invalid gold amount'::TEXT;
RETURN;
END IF;
-- 计算更新值
v_new_gold := v_profile.gold + p_gold_earned;
v_new_xp := COALESCE(v_profile.xp, 0) + p_xp_earned;
v_new_score := GREATEST(
    0,
    COALESCE(v_profile.rank_score, v_profile.xp, 1000) + p_score_delta
);
-- 更新资料
UPDATE profiles
SET gold = v_new_gold,
    xp = v_new_xp,
    rank_score = v_new_score,
    win_count = win_count + CASE
        WHEN p_result = 'win' THEN 1
        ELSE 0
    END,
    loss_count = loss_count + CASE
        WHEN p_result = 'loss' THEN 1
        ELSE 0
    END,
    updated_at = NOW()
WHERE id = p_user_id;
-- 记录金币日志
INSERT INTO gold_transactions (
        user_id,
        delta,
        reason,
        balance_before,
        balance_after
    )
VALUES (
        p_user_id,
        p_gold_earned,
        'battle_' || p_result,
        v_profile.gold,
        v_new_gold
    );
-- 记录战斗日志 (如果表存在)
BEGIN
INSERT INTO battle_logs (
        user_id,
        opponent_name,
        result,
        turns,
        gold_earned,
        xp_earned
    )
VALUES (
        p_user_id,
        p_opponent_name,
        p_result,
        p_turns,
        p_gold_earned,
        p_xp_earned
    );
EXCEPTION
WHEN OTHERS THEN NULL;
-- 忽略兼容性问题
END;
RETURN QUERY
SELECT TRUE,
    v_new_gold,
    v_new_xp,
    v_new_score,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============ 授权 ============
GRANT EXECUTE ON FUNCTION adjust_gold_secure(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_gold_secure(UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION open_pack_secure(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION open_pack_secure(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION settle_battle_secure(
        UUID,
        TEXT,
        INTEGER,
        INTEGER,
        INTEGER,
        TEXT,
        INTEGER,
        TEXT
    ) TO authenticated;
GRANT EXECUTE ON FUNCTION settle_battle_secure(
        UUID,
        TEXT,
        INTEGER,
        INTEGER,
        INTEGER,
        TEXT,
        INTEGER,
        TEXT
    ) TO service_role;