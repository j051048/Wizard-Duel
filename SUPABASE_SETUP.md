# Supabase 操作指南 — 创建 `user_packs` 表

## 步骤

1. 打开 Supabase Dashboard → 你的项目 → **SQL Editor**
2. 新建一个 Query，粘贴下面的 SQL 并执行

---

## SQL（直接复制粘贴执行）

```sql
-- ============================================================
-- Wizard Duel: user_packs 卡包库存表
-- ============================================================

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

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_packs_user_id ON public.user_packs(user_id);

-- 开启 RLS
ALTER TABLE public.user_packs ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能操作自己的数据
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
```

## 执行完验证

跑完后在 SQL Editor 里执行这条确认表已创建：

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_packs' 
ORDER BY ordinal_position;
```

应该能看到 6 个字段：`id, user_id, pack_id, quantity, created_at, updated_at`

---

## 完成 ✅

建完表后前端代码已经全部对接好了，不需要再改任何代码。
