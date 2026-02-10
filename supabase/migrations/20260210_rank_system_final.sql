-- ============================================================
-- 修复段位积分系统 Final Fix
-- 1. 修正 rank_score 默认值
-- 2. 补全 profiles 表缺失字段
-- 3. 重置现有用户分数
-- 4. 修复 settle_battle_secure RPC
-- ============================================================
-- 1. 修正 profiles 表结构
ALTER TABLE public.profiles
ALTER COLUMN rank_score
SET DEFAULT 0;
-- 2. 补全 games_played 字段
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'games_played'
) THEN
ALTER TABLE public.profiles
ADD COLUMN games_played INTEGER DEFAULT 0;
END IF;
END $$;
-- 3. 补全 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END $$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- 4. 重置所有用户分数为 0
UPDATE public.profiles
SET rank_score = 0,
    rank_tier = 'Iron';
-- 5. 重新定义结算 RPC (清理旧版本并提供最终版)
DROP FUNCTION IF EXISTS public.settle_battle_secure(uuid, integer, text, text, text);
DROP FUNCTION IF EXISTS public.settle_battle_secure(uuid, integer, text, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION public.settle_battle_secure(
        p_user_id UUID,
        p_bet_amount INTEGER,
        p_result TEXT,
        -- 'WIN', 'LOSS', 'DRAW'
        p_player_spell JSONB,
        p_opponent_spell JSONB,
        p_meta JSONB DEFAULT '{}'::jsonb
    ) RETURNS JSONB SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE v_old_rank_score INTEGER;
v_new_rank_score INTEGER;
v_old_balance INTEGER;
v_new_balance INTEGER;
v_win_streak INTEGER;
v_payout INTEGER := 0;
v_is_win BOOLEAN;
v_score_delta INTEGER := 0;
BEGIN -- 1. 获取当前状态
SELECT rank_score,
    gold,
    COALESCE(win_count, 0) INTO v_old_rank_score,
    v_old_balance,
    v_win_streak
FROM profiles
WHERE id = p_user_id;
IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'User not found');
END IF;
v_is_win := (p_result = 'WIN');
-- 2. 计算积分变动 (简单逻辑)
IF p_result = 'WIN' THEN v_score_delta := 25 + LEAST(v_win_streak * 5, 30);
v_payout := p_bet_amount * 2;
ELSIF p_result = 'LOSS' THEN IF v_old_rank_score < 1000 THEN -- Iron 段位保护
v_score_delta := 0;
ELSE v_score_delta := -15;
END IF;
v_payout := 0;
ELSE -- DRAW
v_score_delta := 5;
v_payout := p_bet_amount;
END IF;
v_new_rank_score := GREATEST(0, v_old_rank_score + v_score_delta);
v_new_balance := v_old_balance + v_payout;
-- 3. 更新用户数据
UPDATE profiles
SET rank_score = v_new_rank_score,
    gold = v_new_balance,
    games_played = COALESCE(games_played, 0) + 1,
    win_count = CASE
        WHEN v_is_win THEN win_count + 1
        ELSE win_count
    END,
    loss_count = CASE
        WHEN p_result = 'LOSS' THEN loss_count + 1
        ELSE loss_count
    END,
    rank_tier = CASE
        WHEN v_new_rank_score < 1000 THEN 'Iron'
        WHEN v_new_rank_score < 2500 THEN 'Silver'
        WHEN v_new_rank_score < 4500 THEN 'Gold'
        WHEN v_new_rank_score < 7000 THEN 'Platinum'
        WHEN v_new_rank_score < 10000 THEN 'Diamond'
        WHEN v_new_rank_score < 14000 THEN 'Epic'
        WHEN v_new_rank_score < 19000 THEN 'Master'
        WHEN v_new_rank_score < 25000 THEN 'Mythic'
        ELSE 'Legend'
    END,
    updated_at = now()
WHERE id = p_user_id;
-- 4. 记录日志
INSERT INTO battle_logs (
        user_id,
        result,
        bet_amount,
        payout,
        score_before,
        score_after,
        metadata
    )
VALUES (
        p_user_id,
        p_result,
        p_bet_amount,
        v_payout,
        v_old_rank_score,
        v_new_rank_score,
        p_meta
    );
RETURN jsonb_build_object(
    'success',
    true,
    'new_score',
    v_new_rank_score,
    'new_balance',
    v_new_balance,
    'score_delta',
    v_score_delta,
    'new_rank',
    (
        SELECT rank_tier
        FROM profiles
        WHERE id = p_user_id
    )
);
END;
$$;