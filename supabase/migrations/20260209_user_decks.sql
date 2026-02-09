-- ============================================================
-- User Decks Table: 云端存储用户卡组
-- ============================================================
-- ============ 1. 创建卡组表 ============
CREATE TABLE IF NOT EXISTS decks (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Unnamed Deck',
    cards JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, user_id)
);
-- ============ 2. 创建索引 ============
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
-- ============ 3. 启用 RLS ============
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
-- ============ 4. RLS 策略 ============
-- 用户只能查看自己的卡组
DROP POLICY IF EXISTS "Users can view own decks" ON decks;
CREATE POLICY "Users can view own decks" ON decks FOR
SELECT USING (auth.uid() = user_id);
-- 用户可以插入自己的卡组
DROP POLICY IF EXISTS "Users can insert own decks" ON decks;
CREATE POLICY "Users can insert own decks" ON decks FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- 用户可以更新自己的卡组
DROP POLICY IF EXISTS "Users can update own decks" ON decks;
CREATE POLICY "Users can update own decks" ON decks FOR
UPDATE USING (auth.uid() = user_id);
-- 用户可以删除自己的卡组
DROP POLICY IF EXISTS "Users can delete own decks" ON decks;
CREATE POLICY "Users can delete own decks" ON decks FOR DELETE USING (auth.uid() = user_id);
-- ============ 5. 更新时间触发器 ============
CREATE OR REPLACE FUNCTION update_deck_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_deck_updated_at ON decks;
CREATE TRIGGER trigger_update_deck_updated_at BEFORE
UPDATE ON decks FOR EACH ROW EXECUTE FUNCTION update_deck_updated_at();
-- ============ 6. 限制每个用户最多3套卡组 ============
CREATE OR REPLACE FUNCTION check_deck_limit() RETURNS TRIGGER AS $$
DECLARE deck_count INTEGER;
BEGIN
SELECT COUNT(*) INTO deck_count
FROM decks
WHERE user_id = NEW.user_id;
IF deck_count >= 3 THEN RAISE EXCEPTION 'Maximum 3 decks allowed per user';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_check_deck_limit ON decks;
CREATE TRIGGER trigger_check_deck_limit BEFORE
INSERT ON decks FOR EACH ROW EXECUTE FUNCTION check_deck_limit();