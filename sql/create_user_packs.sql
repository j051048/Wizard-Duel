-- ============================================================
-- Wizard Duel: user_packs 表创建脚本
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- 卡包库存表
CREATE TABLE IF NOT EXISTS public.user_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 同一用户同一种卡包只有一行
  UNIQUE(user_id, pack_id)
);

-- 索引：按用户快速查询
CREATE INDEX IF NOT EXISTS idx_user_packs_user_id ON public.user_packs(user_id);

-- RLS 策略（Row Level Security）
ALTER TABLE public.user_packs ENABLE ROW LEVEL SECURITY;

-- 用户只能读写自己的卡包数据
CREATE POLICY "Users can view own packs" ON public.user_packs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own packs" ON public.user_packs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packs" ON public.user_packs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own packs" ON public.user_packs
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 如果触发器已存在则跳过
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_user_packs'
  ) THEN
    CREATE TRIGGER set_updated_at_user_packs
      BEFORE UPDATE ON public.user_packs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;
