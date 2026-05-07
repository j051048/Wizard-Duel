-- ============================================================
-- 🔮 Wizard Duel 后端结算系统最终加固 (2026-05-07)
-- 1. 确保 battle_logs 字段完整性
-- 2. 重置并优化 settle_battle_secure RPC
-- 3. 段位积分逻辑标准化
-- ============================================================

-- 1. 检查并补全 battle_logs 表字段
DO $$ 
BEGIN 
    -- bet_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'battle_logs' AND column_name = 'bet_amount') THEN
        ALTER TABLE public.battle_logs ADD COLUMN bet_amount INTEGER DEFAULT 0;
    END IF;
    -- payout
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'battle_logs' AND column_name = 'payout') THEN
        ALTER TABLE public.battle_logs ADD COLUMN payout INTEGER DEFAULT 0;
    END IF;
    -- score_before
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'battle_logs' AND column_name = 'score_before') THEN
        ALTER TABLE public.battle_logs ADD COLUMN score_before INTEGER DEFAULT 0;
    END IF;
    -- score_after
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'battle_logs' AND column_name = 'score_after') THEN
        ALTER TABLE public.battle_logs ADD COLUMN score_after INTEGER DEFAULT 0;
    END IF;
    -- score_change
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'battle_logs' AND column_name = 'score_change') THEN
        ALTER TABLE public.battle_logs ADD COLUMN score_change INTEGER DEFAULT 0;
    END IF;
    -- metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'battle_logs' AND column_name = 'metadata') THEN
        ALTER TABLE public.battle_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. 补全 profiles 表 rank 系统支持
ALTER TABLE public.profiles ALTER COLUMN rank_score SET DEFAULT 0;
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'games_played') THEN
        ALTER TABLE public.profiles ADD COLUMN games_played INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. 核心结算 RPC：settle_battle_secure
-- 此函数使用 SECURITY DEFINER 以保证金币和积分更新的原子性与安全性
CREATE OR REPLACE FUNCTION public.settle_battle_secure(
    p_user_id UUID,
    p_bet_amount INTEGER,
    p_result TEXT, -- 'WIN', 'LOSS', 'DRAW'
    p_player_spell JSONB,
    p_opponent_spell JSONB,
    p_meta JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB SECURITY DEFINER
SET search_path = public 
LANGUAGE plpgsql AS $$
DECLARE
    v_old_rank_score INTEGER;
    v_new_rank_score INTEGER;
    v_old_balance INTEGER;
    v_new_balance INTEGER;
    v_win_streak INTEGER;
    v_payout INTEGER := 0;
    v_is_win BOOLEAN;
    v_score_delta INTEGER := 0;
    v_new_tier TEXT;
BEGIN
    -- 锁定用户行，防止并发竞态
    SELECT rank_score, gold, COALESCE(win_count, 0)
    INTO v_old_rank_score, v_old_balance, v_win_streak
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    v_is_win := (p_result = 'WIN');

    -- 积分计算逻辑 (Elo 简化版 + 连胜加成)
    IF p_result = 'WIN' THEN
        -- 基础分 25，连胜加成最高 30
        v_score_delta := 25 + LEAST(v_win_streak * 5, 30);
        v_payout := p_bet_amount * 2;
    ELSIF p_result = 'LOSS' THEN
        -- 段位保护逻辑
        IF v_old_rank_score < 1000 THEN
            -- Iron (0-999): 不扣分
            v_score_delta := 0;
        ELSIF v_old_rank_score < 2500 THEN
            -- Silver (1000-2499): 扣分减半
            v_score_delta := -10;
        ELSE
            -- Gold 及以上: 标准扣分
            v_score_delta := -20;
        END IF;
        v_payout := 0;
    ELSE
        -- DRAW (平局)
        v_score_delta := 5;
        v_payout := p_bet_amount; -- 退回本金
    END IF;

    v_new_rank_score := GREATEST(0, v_old_rank_score + v_score_delta);
    v_new_balance := v_old_balance + v_payout;

    -- 计算新段位
    v_new_tier := CASE
        WHEN v_new_rank_score < 1000 THEN 'Iron'
        WHEN v_new_rank_score < 2500 THEN 'Silver'
        WHEN v_new_rank_score < 4500 THEN 'Gold'
        WHEN v_new_rank_score < 7000 THEN 'Platinum'
        WHEN v_new_rank_score < 10000 THEN 'Diamond'
        WHEN v_new_rank_score < 14000 THEN 'Epic'
        WHEN v_new_rank_score < 19000 THEN 'Master'
        WHEN v_new_rank_score < 25000 THEN 'Mythic'
        ELSE 'Legend'
    END;

    -- 更新用户信息
    UPDATE profiles
    SET 
        rank_score = v_new_rank_score,
        rank_tier = v_new_tier,
        gold = v_new_balance,
        games_played = COALESCE(games_played, 0) + 1,
        win_count = CASE WHEN v_is_win THEN win_count + 1 ELSE win_count END,
        loss_count = CASE WHEN p_result = 'LOSS' THEN loss_count + 1 ELSE loss_count END,
        updated_at = now()
    WHERE id = p_user_id;

    -- 记录金币流水 (如果是赢了或平局)
    IF v_payout > 0 THEN
        INSERT INTO gold_transactions (user_id, delta, balance_before, balance_after, reason)
        VALUES (p_user_id, v_payout, v_old_balance, v_new_balance, 'battle_settlement');
    END IF;

    -- 记录战斗日志 (整合所有新字段)
    INSERT INTO battle_logs (
        user_id,
        result,
        bet_amount,
        payout,
        score_before,
        score_after,
        score_change,
        metadata
    )
    VALUES (
        p_user_id,
        LOWER(p_result),
        p_bet_amount,
        v_payout,
        v_old_rank_score,
        v_new_rank_score,
        v_score_delta,
        p_meta || jsonb_build_object(
            'player_spell', p_player_spell,
            'opponent_spell', p_opponent_spell,
            'win_streak', v_win_streak
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_score', v_new_rank_score,
        'new_balance', v_new_balance,
        'score_delta', v_score_delta,
        'new_rank', v_new_tier,
        'payout', v_payout
    );
END;
$$;
