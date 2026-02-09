# 部署钱包登录功能指南

为了解决“登录后数据丢失”的问题，你需要部署一个新的 Supabase Edge Function，它会将钱包地址绑定到一个固定的用户账户上。

## 步骤 1: 准备 SQL

在 Supabase Dashboard 的 **SQL Editor** 中执行以下语句（如果还没有执行过）：

```sql
-- 确保 profiles 表有 wallet_address 字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);
```

## 步骤 2: 部署 Edge Function

在你的本地终端（VS Code Terminal）中运行以下命令：

```bash
# 登录 Supabase（如果未登录）
npx supabase login

# 部署函数
npx supabase functions deploy wallet-login --no-verify-jwt
```

注意：确保你的项目 ID 已正确链接（`npx supabase link --project-ref <your-project-id>`）。

## 步骤 3: 设置环境变量

你需要确保 Edge Function 可以访问 Supabase Service Role Key。
通常 Supabase 自动注入 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`，但如果遇到权限问题，请在 Dashboard -> Edge Functions -> Secrets 中检查。

## 原理说明

现在，当你点击“连接钱包”并签名时：
1. 前端发送签名和地址给 `wallet-login` 函数。
2. 函数验证签名。
3. 函数根据地址查找 `profiles` 表中的用户。
   - 如果找到：重置密码并登录该用户。
   - 如果没找到：创建一个新用户（邮箱为 `<钱包地址>@wizardduel.game`）。
4. 返回 Session 给前端。

这样，无论你何时何地登录，只要钱包地址相同，就会登录到同一个账户，积分和卡牌数据都不会丢失。
