# 🔌 Wizard Duel 后端 API 接口规范

> **版本**: 1.0.0  
> **最后更新**: 2026-02-03

本文档定义了 Wizard Duel 游戏与后端 API 的通信规范，用于：
- Zeabur 托管的自定义后端
- Supabase 积分系统
- 与其他应用的集成

---

## 📋 概述

### 基础配置

```
Base URL: ${VITE_API_BASE_URL}
Content-Type: application/json
```

### 认证方式

所有需要认证的接口通过 Header 传递：
```
Authorization: Bearer <token>
```

---

## 🔐 用户接口

### 1. 获取用户余额

```
GET /api/users/{userId}/balance
```

**响应**:
```json
{
  "balance": 1000,
  "lastUpdated": "2026-02-03T12:00:00Z"
}
```

### 2. 同步用户信息

```
POST /api/users/sync
```

**请求体**:
```json
{
  "userId": "user_123",
  "walletAddress": "0x1234...5678",
  "metadata": {
    "source": "desktop_app"
  }
}
```

**响应**:
```json
{
  "success": true,
  "isNewUser": false
}
```

---

## 🎮 游戏接口

### 3. 创建游戏会话（可选，用于防作弊）

```
POST /api/games/create
```

**请求体**:
```json
{
  "userId": "user_123",
  "bet": 100
}
```

**响应**:
```json
{
  "gameId": "game_abc123",
  "seed": "random_seed_for_ai",
  "createdAt": "2026-02-03T12:00:00Z"
}
```

### 4. ⭐ 游戏结算（核心接口）

```
POST /api/games/settle
```

**请求体**:
```json
{
  "userId": "user_123",
  "gameId": "game_abc123",
  "bet": 100,
  "result": "WIN",
  "payout": 192,
  "playerSpell": "fire",
  "opponentSpell": "vine",
  "isCrit": true,
  "roundNumber": 5,
  "finalPlayerHP": 3,
  "finalOpponentHP": 0
}
```

**响应**:
```json
{
  "newBalance": 1092,
  "verified": true,
  "serverResult": "WIN",
  "serverPayout": 192
}
```

**后端验证逻辑**:
```python
# 1. 验证游戏会话有效性
# 2. 使用服务端逻辑重新计算结果
# 3. 如果客户端结果与服务端不符，使用服务端结果
# 4. 更新用户余额
# 5. 记录游戏历史
```

---

## 💰 积分接口

### 5. 通用积分变更

```
POST /api/points/change
```

**请求体**:
```json
{
  "userId": "user_123",
  "amount": 50,
  "reason": "daily_bonus",
  "metadata": {
    "day": 7,
    "streak": true
  }
}
```

**允许的 reason 值**:
- `game_bet` - 游戏下注扣除
- `game_win` - 游戏胜利奖励
- `game_loss` - 游戏失败（无积分变更）
- `daily_bonus` - 每日签到奖励
- `achievement` - 成就奖励
- `admin_adjust` - 管理员调整

**响应**:
```json
{
  "newBalance": 1050,
  "transactionId": "tx_xyz789"
}
```

### 6. 领取每日奖励

```
POST /api/users/{userId}/daily-bonus
```

**响应（成功）**:
```json
{
  "amount": 50,
  "newBalance": 1050,
  "streak": 7,
  "nextBonus": "2026-02-04T00:00:00Z"
}
```

**响应（已领取）**:
```json
{
  "error": "already_claimed",
  "nextBonus": "2026-02-04T00:00:00Z"
}
```

---

## 📊 历史与排行榜

### 7. 获取游戏历史

```
GET /api/users/{userId}/history?limit=20
```

**响应**:
```json
{
  "records": [
    {
      "id": "record_001",
      "playerSpell": "fire",
      "opponentSpell": "vine",
      "result": "WIN",
      "amount": 92,
      "timestamp": 1706947200000,
      "isCrit": true
    }
  ],
  "total": 150
}
```

### 8. 获取排行榜

```
GET /api/leaderboard?type=weekly&limit=10
```

**type 参数**:
- `daily` - 今日排行
- `weekly` - 本周排行
- `all` - 总排行

**响应**:
```json
{
  "leaderboard": [
    {
      "address": "0x1234...5678",
      "wins": 45,
      "losses": 12,
      "draws": 5,
      "totalEarnings": 9500
    }
  ]
}
```

---

## 🔗 外部集成接口

### 9. 接收外部积分

用于从父应用接收初始积分：

```
POST /api/integration/receive-points
```

**请求体**:
```json
{
  "source": "parent_app",
  "userId": "user_123",
  "points": 500,
  "token": "integration_secret_token"
}
```

### 10. 健康检查

```
GET /api/health
```

**响应**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected"
}
```

---

## 📡 前端集成 (PostMessage)

当游戏嵌入其他应用时，通过 `postMessage` 通信：

### 游戏 → 父应用

```javascript
// 余额变更
{ type: "wizard_duel_balance_change", balance: 900, change: -100 }

// 游戏结束
{ type: "wizard_duel_game_end", result: "WIN", payout: 192 }

// 游戏就绪
{ type: "wizard_duel_ready" }
```

### 父应用 → 游戏

```javascript
// 设置初始积分
{ type: "wizard_duel_init", userId: "user_123", points: 500 }

// 请求退出
{ type: "wizard_duel_exit" }
```

---

## 🗄️ Supabase 表结构参考

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT,
  balance INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 游戏记录表
CREATE TABLE game_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(user_id),
  game_id TEXT,
  player_spell TEXT NOT NULL,
  opponent_spell TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('WIN', 'LOSS', 'DRAW')),
  bet INTEGER NOT NULL,
  payout INTEGER NOT NULL,
  is_crit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 积分变更记录表
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(user_id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  game_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 排行榜视图
CREATE VIEW leaderboard AS
SELECT 
  u.user_id,
  u.wallet_address as address,
  COUNT(CASE WHEN g.result = 'WIN' THEN 1 END) as wins,
  COUNT(CASE WHEN g.result = 'LOSS' THEN 1 END) as losses,
  COUNT(CASE WHEN g.result = 'DRAW' THEN 1 END) as draws,
  COALESCE(SUM(g.payout - g.bet), 0) as total_earnings
FROM users u
LEFT JOIN game_records g ON u.user_id = g.user_id
GROUP BY u.user_id, u.wallet_address
ORDER BY total_earnings DESC;
```

---

## ✅ 集成检查清单

- [ ] 配置 `VITE_API_BASE_URL` 环境变量
- [ ] 实现 `/api/games/settle` 核心结算接口
- [ ] 实现 `/api/users/{userId}/balance` 余额查询
- [ ] 设置 CORS 允许游戏域名
- [ ] 测试 Mock → 真实 API 切换
- [ ] 验证积分同步正确性

---

**Made with ❤️ for seamless integration**
