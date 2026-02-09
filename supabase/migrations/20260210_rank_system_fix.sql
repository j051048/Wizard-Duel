-- Fix Rank System: Add rank_score and update RPC
-- 1. Check and Add Columns
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'rank_score'
) THEN
ALTER TABLE public.profiles
ADD COLUMN rank_score INTEGER DEFAULT 0 NOT NULL;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'rank_tier'
) THEN
ALTER TABLE public.profiles
ADD COLUMN rank_tier TEXT CHECK (
        rank_tier IN (
            'Iron',
            'Silver',
            'Gold',
            'Platinum',
            'Diamond',
            'Epic',
            'Master',
            'Mythic',
            'Legend'
        )
    ) DEFAULT 'Iron';
END IF;
END $$;
-- 2. Update/Create Battle Log Table if needed (assuming it exists based on code usage, but ensuring columns)
CREATE TABLE IF NOT EXISTS public.battle_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    opponent_name TEXT,
    result TEXT,
    turns INTEGER,
    gold_change INTEGER,
    xp_change INTEGER,
    score_change INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Ensure score_change column exists in battle_logs
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'battle_logs'
        AND column_name = 'score_change'
) THEN
ALTER TABLE public.battle_logs
ADD COLUMN score_change INTEGER DEFAULT 0;
END IF;
END $$;
-- 3. Update RPC Function
CREATE OR REPLACE FUNCTION public.settle_battle_secure(
        p_user_id UUID,
        p_opponent_name TEXT,
        p_result TEXT,
        p_turns INTEGER,
        p_gold_earned INTEGER,
        p_xp_earned INTEGER,
        p_score_delta INTEGER DEFAULT 0
    ) RETURNS TABLE (
        success BOOLEAN,
        new_balance INTEGER,
        new_xp INTEGER,
        new_score INTEGER,
        new_rank TEXT,
        error_message TEXT
    ) LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_old_balance INTEGER;
v_old_xp INTEGER;
v_old_score INTEGER;
v_new_balance INTEGER;
v_new_xp INTEGER;
v_new_score INTEGER;
v_new_rank TEXT;
BEGIN -- Check user existence and lock row
SELECT gold,
    xp,
    rank_score INTO v_old_balance,
    v_old_xp,
    v_old_score
FROM public.profiles
WHERE id = p_user_id FOR
UPDATE;
IF NOT FOUND THEN RETURN QUERY
SELECT FALSE,
    0,
    0,
    0,
    'Iron'::TEXT,
    'User not found'::TEXT;
RETURN;
END IF;
-- Calculate new values
v_new_balance := v_old_balance + p_gold_earned;
v_new_xp := COALESCE(v_old_xp, 0) + p_xp_earned;
v_new_score := GREATEST(0, COALESCE(v_old_score, 0) + p_score_delta);
-- Prevent negative score
-- Determine new rank based on score
IF v_new_score >= 25000 THEN v_new_rank := 'Legend';
ELSIF v_new_score >= 19000 THEN v_new_rank := 'Mythic';
ELSIF v_new_score >= 14000 THEN v_new_rank := 'Master';
ELSIF v_new_score >= 10000 THEN v_new_rank := 'Epic';
ELSIF v_new_score >= 7000 THEN v_new_rank := 'Diamond';
ELSIF v_new_score >= 4500 THEN v_new_rank := 'Platinum';
ELSIF v_new_score >= 2500 THEN v_new_rank := 'Gold';
ELSIF v_new_score >= 1000 THEN v_new_rank := 'Silver';
ELSE v_new_rank := 'Iron';
END IF;
-- Update profile
UPDATE public.profiles
SET gold = v_new_balance,
    xp = v_new_xp,
    rank_score = v_new_score,
    rank_tier = v_new_rank,
    win_count = CASE
        WHEN p_result = 'win' THEN win_count + 1
        ELSE win_count
    END,
    loss_count = CASE
        WHEN p_result = 'loss' THEN loss_count + 1
        ELSE loss_count
    END,
    games_played = games_played + 1,
    updated_at = NOW()
WHERE id = p_user_id;
-- Insert battle log
INSERT INTO public.battle_logs (
        user_id,
        opponent_name,
        result,
        turns,
        gold_change,
        xp_change,
        score_change,
        created_at
    )
VALUES (
        p_user_id,
        p_opponent_name,
        p_result,
        p_turns,
        p_gold_earned,
        p_xp_earned,
        p_score_delta,
        NOW()
    );
RETURN QUERY
SELECT TRUE,
    v_new_balance,
    v_new_xp,
    v_new_score,
    v_new_rank,
    NULL::TEXT;
END;
$function$;