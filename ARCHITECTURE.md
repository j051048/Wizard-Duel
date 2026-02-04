# 📋 Wizard Duel - 项目架构文档

> **版本**: 3.0.0 (重构版)
> **更新时间**: 2026-02-04
> **架构师**: Antigravity Interactive

---

## 🏗️ 项目结构

```
Wizard-Duel/
├── 📂 components/              # UI 组件层
│   ├── index.ts               # 组件导出入口
│   ├── LoadingScreen.tsx      # 资源预加载画面
│   ├── Lobby.tsx              # 游戏大厅 (已模块化)
│   ├── BattleArena.tsx        # 战斗场景 (已模块化)
│   ├── DeckBuilder.tsx        # 牌组编辑器 (已模块化)
│   ├── PlayerFrame.tsx        # 玩家信息框 (头像/血条/法力)
│   ├── SpellCard.tsx          # 法术卡牌
│   ├── ResultsModal.tsx       # 结果弹窗
│   │
│   ├── 📂 battle/             # 战斗子组件 (新增)
│   │   ├── AIEmoteBubble.tsx  # AI 表情气泡
│   │   ├── TargetingArrow.tsx # 瞄准箭头
│   │   ├── CombatLog.tsx      # 战斗日志
│   │   ├── BattleBoard.tsx    # 战场中央区域
│   │   ├── BattleHand.tsx     # 玩家手牌
│   │   └── BattleEffects.tsx  # 视觉特效 (暴击/血溅)
│   │
│   ├── 📂 deck/               # 牌组编辑子组件 (新增)
│   │   ├── ManaCurve.tsx      # 法力曲线可视化
│   │   ├── CardPool.tsx       # 卡牌收藏库
│   │   └── DeckList.tsx       # 当前牌组列表
│   │
│   └── 📂 lobby/              # 大厅子组件 (新增)
│       ├── TopBar.tsx         # 顶部 HUD
│       ├── DeckCarousel.tsx   # 牌组轮播
│       ├── WagerSelector.tsx  # 下注选择
│       └── PlayButton.tsx     # 开始按钮
│
├── 📂 hooks/                   # 自定义 Hooks
│   ├── index.ts               # Hooks 导出入口
│   ├── usePreloader.ts        # 资源预加载逻辑
│   ├── useGameLoop.ts         # 游戏循环状态机
│   ├── useAudioManager.ts     # 音效管理
│   ├── useDragToPlay.ts       # 卡牌拖拽逻辑 (新增)
│   ├── useBattleAnimations.ts # 战斗动画管理 (新增)
│   └── useDeckBuilder.ts      # 牌组编辑逻辑 (新增)
│
├── 📂 stores/                  # Zustand 状态管理 (新增)
│   ├── useUserStore.ts        # 用户数据状态
│   └── useUIStore.ts          # UI 状态
│
├── 📂 services/                # 业务逻辑层
│   ├── api.ts                 # API 服务封装
│   ├── gameLogic.ts           # 核心战斗引擎
│   ├── sequence.ts            # 游戏序列执行器
│   ├── dungeon_v2.ts          # 地牢冒险服务
│   ├── haptic.ts              # 触感反馈服务
│   └── projection.ts          # 投影计算
│
├── 📂 context/                 # React Context
│   └── SettingsContext.tsx    # 画质设置上下文
│
├── 📂 public/                  # 静态资源
│   ├── avatars/               # 角色头像
│   ├── cards/                 # 卡牌插画
│   ├── effects/               # 状态特效
│   ├── ui/                    # UI 装饰
│   ├── icons/                 # 游戏图标
│   ├── audio/                 # 音效资源
│   ├── battle-bg.jpg          # 战斗背景
│   └── lobby-bg.jpg           # 大厅背景
│
├── 📂 tools/                   # 开发工具
│   └── card-validations.ts    # 卡牌平衡检测
│
├── App.tsx                    # 主应用组件
├── constants.ts               # 游戏常量配置
├── types.ts                   # TypeScript 类型定义
└── index.tsx                  # 应用入口
```

---

## 🧩 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────┐
│                    App.tsx                      │  ← 状态协调层
├─────────────────────────────────────────────────┤
│  LoadingScreen │ Lobby │ BattleArena │ Dungeon  │  ← 视图层
├─────────────────────────────────────────────────┤
│      battle/*   │  deck/*   │   lobby/*         │  ← 子组件层
├─────────────────────────────────────────────────┤
│  usePreloader │ useGameLoop │ useDragToPlay ... │  ← 逻辑层 (Hooks)
├─────────────────────────────────────────────────┤
│        useUserStore   │   useUIStore            │  ← 状态层 (Zustand)
├─────────────────────────────────────────────────┤
│         gameLogic.ts  │  api.ts │ haptic.ts     │  ← 服务层
├─────────────────────────────────────────────────┤
│           constants.ts │ types.ts               │  ← 数据层
└─────────────────────────────────────────────────┘
```

### 数据流

```
用户操作 → App.tsx → Zustand Store → Hooks → Services → 状态更新 → 组件重渲染
```

---

## 🎮 核心 Hooks 说明

### 1. usePreloader
**职责**: 预加载图片和音效资源

```typescript
const { progress, startPreloading } = usePreloader();
// progress.percentage: 0-100
// progress.isComplete: 是否完成
```

### 2. useGameLoop
**职责**: 管理战斗状态机，替代脆弱的 setTimeout 链

```typescript
const [state, actions] = useGameLoop();
// state.duelState: 当前对战状态
// state.phase: 当前阶段 (PLAYER_TURN, REVEAL, DAMAGE_PHASE...)
// actions.startDuel(): 开始对战
// actions.playCard(spellId): 打出卡牌
```

### 3. useAudioManager
**职责**: 统一管理 BGM 和音效

```typescript
const [audioState, audioActions] = useAudioManager();
// audioActions.playBgm('lobby' | 'battle')
// audioActions.playSfx('hit' | 'victory' | ...)
// audioActions.toggleMute()
```

### 4. useDragToPlay (新增)
**职责**: 封装卡牌拖拽、瞄准逻辑

```typescript
const { dragState, startDrag } = useDragToPlay(onPlayCard, setTargeting, ...);
// dragState: 当前拖拽状态
// startDrag(spellId, index, x, y): 开始拖拽
```

### 5. useBattleAnimations (新增)
**职责**: 管理 Canvas 动画渲染

```typescript
const { canvasRef, addDamageNumber, triggerCrit, ... } = useBattleAnimations(isLowQuality);
// canvasRef: Canvas 引用
// addDamageNumber: 显示伤害数字
// triggerCrit: 触发暴击特效
```

### 6. useDeckBuilder (新增)
**职责**: 牌组编辑器状态管理

```typescript
const { deckName, selectedCards, addCard, removeCard, ... } = useDeckBuilder(selectedDeck, gameMode);
```

---

## 📊 优化成果

### 代码质量

| 指标 | 重构前 | 重构后 (v3.0) |
|------|--------|---------------|
| BattleArena.tsx 行数 | 674 行 | ~200 行 (-70%) |
| DeckBuilder.tsx 行数 | 416 行 | ~145 行 (-65%) |
| Lobby.tsx 行数 | 321 行 | ~145 行 (-55%) |
| 组件数量 | 12 个 | 25 个 |
| Hooks 数量 | 3 个 | 8 个 |
| 可维护性评分 | B | A+ |

### 性能优化

| 优化项 | 状态 |
|--------|------|
| 资源预加载 | ✅ 已实现 |
| 震动反馈 (Screen Shake) | ✅ 已实现 |
| 音效系统 | ✅ 已实现 |
| 状态机替代 setTimeout | ✅ 已实现 |
| Zustand 状态管理 | ✅ 已实现 |
| Canvas 动画分离 | ✅ 已实现 |

### 待完成项

| 优化项 | 优先级 |
|--------|--------|
| 图片压缩为 WebP | P0 |
| 添加更多音效文件 | P1 |
| Framer Motion 动画增强 | P2 |
| 移动端响应式优化 | P2 |
| 后端战斗校验 | P3 |

---

## 🔧 开发命令

```bash
# 启动开发服务器
npm run dev

# 类型检查
npx tsc --noEmit

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 卡牌验证
npm run validate-cards
```

---

## 📦 依赖项

- **React 18** - UI 框架
- **Vite** - 构建工具
- **TypeScript** - 类型系统
- **Zustand** - 状态管理
- **Wagmi** - Web3 连接
- **Lucide React** - 图标库
- **Tailwind CSS v4** - 样式框架

---

## 🎯 下一步计划

1. **P0**: 使用 Squoosh/ImageOptim 压缩美术资源
2. **P1**: 添加更多音效文件到 `public/audio/`
3. **P2**: 集成 Framer Motion 增强卡牌动画
4. **P3**: 添加新手引导和卡牌 Tooltip
5. **P3**: 完善地牢冒险模式

---

**Made with ❤️ by Antigravity Interactive**
