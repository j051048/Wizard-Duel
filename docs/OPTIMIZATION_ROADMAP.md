# 🚀 Wizard Duel 全面优化路线图

## 📅 优化时间线

### Phase 1: 核心体验优化（1-2周）

#### 1.1 游戏平衡性调优 ⚖️
**目标：** 确保所有卡牌胜率在 45%-55% 区间

**数据收集：**
- [ ] 部署 AnalyticsService 到生产环境
- [ ] 收集 1000+ 场对局数据（预计 1 周）
- [ ] 生成平衡报告：`AnalyticsService.generateBalanceReport()`

**分析维度：**
- 卡牌使用率 vs 胜率散点图
- 元素分布（是否某元素过强）
- 跨元素联动触发率（目标：15-25%）
- 平均游戏时长（目标：3-5 分钟）

**调整方案：**
```typescript
// 通过 RemoteConfig 热更新
{
  "cardDamageOverrides": {
    "fire": 8,  // 原 10，降低火系爆发
    "thunder2": 12  // 原 10，提升雷系后期
  },
  "elementMultipliers": {
    "rock": 1.1  // 岩系整体提升 10%
  }
}
```

**验证：**
- [ ] A/B 测试（50% 用户使用新数值）
- [ ] 监控 3 天数据
- [ ] 全量发布或回滚

---

#### 1.2 AI 智能度提升 🤖
**当前问题：**
- AI 出牌策略较简单（基于启发式评分）
- 缺少长期规划（只看当前回合）
- 不会针对玩家策略调整

**优化方案：**

**短期（1 周）：**
```typescript
// services/ai.ts 增强
export const improvedAIStrategy = {
  // 1. 记忆系统：追踪玩家偏好
  playerProfile: {
    preferredElements: ['fire', 'thunder'],  // 玩家常用元素
    avgManaCurve: 4.2,  // 平均出牌费用
    aggressiveness: 0.7  // 激进度 0-1
  },
  
  // 2. 多步预测（蒙特卡洛树搜索简化版）
  evaluateMove(state, depth = 2) {
    // 模拟未来 2 回合
    // 评估胜率而非单回合收益
  },
  
  // 3. 针对性策略
  counterStrategy: {
    'fire_rush': 'prioritize_armor',  // 对抗火系快攻
    'control': 'apply_pressure'  // 对抗控制流
  }
};
```

**中期（2-4 周）：**
- 集成轻量级 ML 模型（TensorFlow.js）
- 训练数据：top 10% 玩家的对局
- 模型大小：< 500KB
- 推理时间：< 50ms

---

#### 1.3 新手引导优化 📚
**当前问题：**
- 教程覆盖不全（缺少跨元素联动讲解）
- 缺少进阶教程
- 没有交互式练习

**改进方案：**
```typescript
// components/tutorial/InteractiveTutorial.tsx
const tutorialSteps = [
  // 基础教程（已有）
  { id: 'basic_1', type: 'combat', ... },
  
  // 新增：进阶教程
  {
    id: 'advanced_1',
    type: 'synergy',
    title: '跨元素联动',
    scenario: {
      playerHand: ['ice', 'rock'],  // 预设手牌
      hint: '先出冰系，再出岩系触发"碎裂"',
      successCondition: (state) => state.synergyTriggered === 'shatter'
    }
  },
  {
    id: 'advanced_2',
    type: 'deck_building',
    title: '构筑思路',
    interactive: true,  // 让玩家自己构筑
    goal: '构建一套法力曲线合理的牌组'
  }
];
```

**成就系统引导：**
- "首次触发联动" → 奖励 50 金币
- "连胜 3 场" → 解锁新卡包
- "收集 20 张卡" → 解锁排位赛

---

### Phase 2: 性能与稳定性（2-3周）

#### 2.1 性能优化 ⚡

**Bundle 优化：**
```typescript
// vite.config.ts 进一步优化
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 当前已优化，进一步细化
          if (id.includes('data/spells')) {
            return 'game-data';  // 卡牌数据单独 chunk
          }
          if (id.includes('components/shop')) {
            return 'shop-lazy';  // 商店懒加载
          }
        }
      }
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 压缩优化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 生产环境移除 console
        pure_funcs: ['console.log', 'console.info']
      }
    }
  }
});
```

**运行时优化：**
```typescript
// 1. 虚拟滚动（已有 @tanstack/react-virtual）
// 2. 图片懒加载
<img 
  loading="lazy" 
  decoding="async"
  src={spell.image} 
/>

// 3. 动画性能
// 使用 will-change 提示浏览器
.card-animation {
  will-change: transform;
  transform: translateZ(0);  // 强制 GPU 加速
}

// 4. 状态更新批处理（Zustand 已支持）
// 确保所有 set() 调用合并
```

**目标指标：**
- FCP (First Contentful Paint): < 1.5s
- LCP (Largest Contentful Paint): < 2.5s
- TTI (Time to Interactive): < 3.5s
- FID (First Input Delay): < 100ms

---

#### 2.2 错误处理与监控 🔍

**Sentry 集成增强：**
```typescript
// index.tsx
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/game\.xwizard\.fun/],
    }),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 0.1,  // 10% 性能追踪
  replaysSessionSampleRate: 0.1,  // 10% 会话录制
  replaysOnErrorSampleRate: 1.0,  // 100% 错误录制
  
  // 自定义错误过滤
  beforeSend(event, hint) {
    // 过滤已知的无害错误
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
      return null;
    }
    return event;
  }
});
```

**自定义监控：**
```typescript
// services/monitoring.ts
export const trackGameMetrics = () => {
  // 游戏特定指标
  Sentry.setContext('game', {
    avgGameDuration: AnalyticsService.getStats().avgGameDuration,
    crashRate: getCrashRate(),
    p95Latency: getP95Latency()
  });
  
  // 自定义事件
  Sentry.addBreadcrumb({
    category: 'game',
    message: 'Player won match',
    level: 'info',
    data: { opponent: 'AI_HARD', duration: 180 }
  });
};
```

---

#### 2.3 离线支持增强 📴

**Service Worker 优化：**
```typescript
// vite.config.ts - VitePWA 配置
VitePWA({
  strategies: 'injectManifest',  // 自定义 SW
  injectManifest: {
    swSrc: 'src/sw.ts',
    swDest: 'dist/sw.js',
  },
  workbox: {
    // 缓存策略
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.xwizard\.fun\/.*/i,
        handler: 'NetworkFirst',  // API 优先网络
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60  // 5 分钟
          }
        }
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
        handler: 'CacheFirst',  // 图片优先缓存
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60  // 30 天
          }
        }
      }
    ]
  }
});
```

**离线游戏模式：**
```typescript
// 检测离线状态
const isOffline = !navigator.onLine;

if (isOffline) {
  // 1. 禁用 PvP
  // 2. 启用本地 AI 对战
  // 3. 缓存对局结果，联网后同步
  queueOfflineMatch({
    result: 'WIN',
    timestamp: Date.now(),
    syncStatus: 'pending'
  });
}
```

---

### Phase 3: 内容扩展（3-4周）

#### 3.1 新游戏模式 🎲

**已有框架（gameModes.ts），待实现：**

```typescript
// 1. 赛季模式（已有 SeasonService）
export const SEASON_MODES = [
  {
    id: 'season_ranked',
    name: '赛季排位',
    rewards: {
      legend: { gems: 1000, packs: 10 },
      mythic: { gems: 500, packs: 5 },
      // ...
    }
  }
];

// 2. 限时挑战
export const WEEKLY_CHALLENGE = {
  id: 'challenge_week_1',
  name: '纯元素挑战',
  rules: {
    deckRestriction: 'single_element',
    bannedCards: ['healing', 'shield']
  },
  rewards: { gems: 200, exclusive_card: 'phoenix_legendary' }
};

// 3. Boss 战
export const BOSS_ENCOUNTERS = [
  {
    id: 'boss_dragon',
    name: '远古巨龙',
    hp: 50,  // 高血量
    specialAbility: 'breath_fire',  // 每 3 回合全场 AOE
    rewards: { legendary_pack: 1 }
  }
];
```

---

#### 3.2 社交功能增强 👥

**好友系统扩展：**
```typescript
// services/FriendService.ts 已有基础，增强：

// 1. 好友对战
export const challengeFriend = async (friendId: string) => {
  const room = await createPrivateRoom({
    host: currentUserId,
    guest: friendId,
    mode: 'friendly',
    ranked: false
  });
  return room.id;
};

// 2. 观战系统（SpectateService 已有）
// 增加：实时弹幕、礼物打赏

// 3. 公会系统
export interface Guild {
  id: string;
  name: string;
  members: GuildMember[];
  level: number;
  perks: {
    xpBoost: number;  // 经验加成
    shopDiscount: number;  // 商店折扣
  };
}
```

---

#### 3.3 卡牌扩展 🃏

**新卡牌设计原则：**
```typescript
// 1. 填补空缺（当前 ~50 张卡，目标 100+）
// 2. 增加策略深度（不只是数值差异）
// 3. 支持多种构筑流派

// 示例：新机制卡牌
export const NEW_SPELLS: Spell[] = [
  {
    id: 'time_warp',
    name: '时间扭曲',
    element: 'neutral',
    manaCost: 8,
    rarity: 'legendary',
    effect: {
      type: 'extra_turn',  // 新机制：额外回合
      description: '获得一个额外回合，但下回合跳过抽牌'
    }
  },
  {
    id: 'mirror_image',
    name: '镜像',
    element: 'ice',
    manaCost: 3,
    effect: {
      type: 'copy_last_spell',  // 复制对手上回合的法术
      description: '复制对手上一个法术并施放'
    }
  },
  {
    id: 'mana_battery',
    name: '法力电池',
    element: 'neutral',
    manaCost: 2,
    effect: {
      type: 'mana_ramp',  // 法力加速
      description: '永久+1 最大法力值'
    }
  }
];
```

---

### Phase 4: 商业化与留存（4-6周）

#### 4.1 经济系统优化 💰

**当前问题：**
- 金币获取速度需要数据验证
- 付费点不够吸引
- 缺少"鲸鱼"玩家消费点

**优化方案：**

```typescript
// 1. 动态定价（基于玩家行为）
export const getDynamicPrice = (userId: string, item: ShopItem) => {
  const profile = getUserProfile(userId);
  
  if (profile.isNewPlayer && profile.daysActive < 3) {
    return item.price * 0.7;  // 新手 7 折
  }
  
  if (profile.lastPurchase > 30 * 24 * 60 * 60 * 1000) {
    return item.price * 0.8;  // 回流玩家 8 折
  }
  
  return item.price;
};

// 2. Battle Pass 增强（BattlePassService 已有）
export const BATTLE_PASS_V2 = {
  free: [
    { level: 1, reward: { gold: 100 } },
    { level: 5, reward: { pack: 'standard' } },
    // ...
  ],
  premium: [
    { level: 1, reward: { gold: 200, gems: 50 } },
    { level: 5, reward: { pack: 'premium', exclusive_skin: 'fire_dragon' } },
    { level: 50, reward: { legendary_card: 'time_warp' } }
  ],
  price: 980  // 9.8 USD
};

// 3. 限时优惠
export const FLASH_SALE = {
  item: 'mega_pack',
  originalPrice: 1980,
  salePrice: 980,
  discount: 0.5,
  endsAt: Date.now() + 24 * 60 * 60 * 1000,  // 24 小时
  stock: 100  // 限量
};
```

---

#### 4.2 留存机制 📈

**每日任务系统：**
```typescript
// services/QuestManager.ts 已有基础，增强：

export const DAILY_QUESTS_V2 = [
  // 简单任务（保证完成）
  { id: 'daily_1', task: 'win_1_game', reward: { gold: 50 } },
  { id: 'daily_2', task: 'play_3_games', reward: { gold: 30 } },
  
  // 中等任务（引导玩法）
  { id: 'daily_3', task: 'trigger_synergy_3_times', reward: { gold: 100 } },
  { id: 'daily_4', task: 'win_with_element_fire', reward: { pack: 'standard' } },
  
  // 困难任务（高价值）
  { id: 'daily_5', task: 'win_5_ranked_games', reward: { gems: 50 } }
];

// 每周任务（更高奖励）
export const WEEKLY_QUESTS = [
  { id: 'weekly_1', task: 'win_20_games', reward: { gems: 200, pack: 'premium' } },
  { id: 'weekly_2', task: 'reach_rank_gold', reward: { exclusive_card: 'weekly_special' } }
];
```

**登录奖励：**
```typescript
// services/CheckInService.ts 已有，增强：
export const LOGIN_REWARDS_V2 = [
  { day: 1, reward: { gold: 100 } },
  { day: 2, reward: { gold: 150 } },
  { day: 3, reward: { pack: 'standard' } },
  { day: 7, reward: { gems: 100, pack: 'premium' } },  // 连续 7 天大奖
  { day: 30, reward: { legendary_card: 'login_exclusive' } }  // 月度奖励
];
```

---

### Phase 5: 技术债务清理（持续）

#### 5.1 代码质量提升 🧹

**当前问题：**
- 1 个 TODO 标记（gameLogic.ts）
- 部分组件过大（BattleArena.tsx ~800 行）
- 测试覆盖率未知

**改进计划：**

```bash
# 1. 测试覆盖率目标：70%+
npm run test:coverage

# 2. 代码复杂度检查
npx eslint . --ext .ts,.tsx --max-warnings 0

# 3. 类型安全增强
# 启用 strict mode
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

**重构优先级：**
1. BattleArena.tsx 拆分（800 行 → 3-4 个子组件）
2. gameLogic.ts 模块化（当前 900+ 行）
3. 统一错误处理（ErrorBoundary + Sentry）

---

#### 5.2 文档完善 📖

**当前缺失：**
- API 文档
- 架构设计文档
- 贡献指南

**补充计划：**

```markdown
# 新增文档
docs/
├── ARCHITECTURE.md       # 架构设计
├── API.md               # API 文档
├── CONTRIBUTING.md      # 贡献指南
├── GAME_DESIGN.md       # 游戏设计文档
├── PERFORMANCE.md       # 性能优化指南
└── DEPLOYMENT.md        # 部署指南
```

---

## 📊 优化效果预期

### 关键指标目标

| 指标 | 当前 | 目标 | 提升 |
|------|------|------|------|
| 首屏加载时间 | ~2.5s | <1.5s | 40% ↓ |
| 平均游戏时长 | 未知 | 3-5min | - |
| 次日留存率 | 未知 | 40%+ | - |
| 7日留存率 | 未知 | 20%+ | - |
| 付费转化率 | 未知 | 3-5% | - |
| 崩溃率 | 未知 | <0.1% | - |

### 开发效率提升

- 测试覆盖率：0% → 70%+
- 构建时间：~30s → <20s
- 热更新时间：~500ms → <200ms
- 代码审查时间：通过 ESLint/Prettier 自动化

---

## 🛠️ 实施建议

### 团队配置（建议）

- **前端开发** x2：UI/UX 优化、新功能开发
- **游戏设计** x1：平衡性调优、新内容设计
- **后端开发** x1：API 优化、数据分析
- **测试/QA** x1：自动化测试、性能测试

### 开发流程

1. **每周迭代**：选择 1-2 个优化项
2. **数据驱动**：每次改动都要 A/B 测试
3. **快速验证**：2-3 天完成开发 → 测试 → 上线
4. **持续监控**：Sentry + AnalyticsService 实时监控

### 风险控制

- **灰度发布**：新功能先给 10% 用户
- **回滚机制**：RemoteConfig 支持秒级回滚
- **备份策略**：Supabase 自动备份 + 本地备份

---

## 🎯 下一步行动

### 本周可立即执行（优先级 P0）

1. ✅ **部署 AnalyticsService**（已完成）
2. ⏳ **收集 1000+ 场对局数据**（进行中）
3. 📝 **编写性能测试脚本**
4. 🔍 **Sentry 错误监控配置**
5. 📚 **完善新手教程**（增加跨元素联动讲解）

### 本月目标（优先级 P1）

1. 🎮 **游戏平衡性调优**（基于数据）
2. ⚡ **性能优化**（FCP < 1.5s）
3. 🤖 **AI 智能度提升**（多步预测）
4. 🃏 **新增 20 张卡牌**
5. 💰 **Battle Pass V2 上线**

---

## 📈 成功指标

### 3 个月后

- DAU (日活): 1000+
- 次日留存: 40%+
- 付费用户: 50+
- 月收入: $1000+

### 6 个月后

- DAU: 5000+
- 次日留存: 50%+
- 付费用户: 200+
- 月收入: $5000+

---

**最后更新：** 2026-05-06
**维护者：** Wizard Duel Team
