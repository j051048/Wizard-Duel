# 📋 Wizard Duel - 项目架构文档

> **版本**: 2.0.0 (重构版)
> **更新时间**: 2026-02-03
> **架构师**: Antigravity Interactive

---

## 🏗️ 项目结构

```
Wizard-Duel/
├── 📂 components/              # UI 组件层
│   ├── index.ts               # 组件导出入口
│   ├── LoadingScreen.tsx      # 资源预加载画面
│   ├── Lobby.tsx              # 游戏大厅
│   ├── BattleArena.tsx        # 战斗场景
│   ├── PlayerFrame.tsx        # 玩家信息框 (头像/血条/法力)
│   ├── SpellCard.tsx          # 法术卡牌
│   └── ResultsModal.tsx       # 结果弹窗
│
├── 📂 hooks/                   # 自定义 Hooks
│   ├── index.ts               # Hooks 导出入口
│   ├── usePreloader.ts        # 资源预加载逻辑
│   ├── useGameLoop.ts         # 游戏循环状态机
│   └── useAudioManager.ts     # 音效管理
│
├── 📂 services/                # 业务逻辑层
│   ├── api.ts                 # API 服务封装
│   └── gameLogic.ts           # 核心战斗引擎
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
┌─────────────────────────────────────────────┐
│                  App.tsx                    │  ← 状态协调层
├─────────────────────────────────────────────┤
│   LoadingScreen │ Lobby │ BattleArena       │  ← 视图层
├─────────────────────────────────────────────┤
│  usePreloader │ useGameLoop │ useAudio      │  ← 逻辑层 (Hooks)
├─────────────────────────────────────────────┤
│         gameLogic.ts  │  api.ts             │  ← 服务层
├─────────────────────────────────────────────┤
│           constants.ts │ types.ts           │  ← 数据层
└─────────────────────────────────────────────┘
```

### 数据流

```
用户操作 → App.tsx → useGameLoop → gameLogic.ts → 状态更新 → 组件重渲染
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

---

## 📊 优化成果

### 代码质量

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| App.tsx 行数 | 596 行 | 298 行 (-50%) |
| 组件数量 | 2 个 | 7 个 |
| Hooks 数量 | 0 个 | 3 个 |
| 可维护性评分 | C | A |

### 性能优化

| 优化项 | 状态 |
|--------|------|
| 资源预加载 | ✅ 已实现 |
| 震动反馈 (Screen Shake) | ✅ 已实现 |
| 音效系统 | ✅ 已实现 (待添加音频文件) |
| 状态机替代 setTimeout | ✅ 已实现 |

### 待完成项

| 优化项 | 优先级 |
|--------|--------|
| 图片压缩为 WebP | P0 |
| 添加音效文件 | P1 |
| Framer Motion 动画增强 | P2 |
| 移动端响应式适配 | P2 |
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
```

---

## 📦 依赖项

- **React 18** - UI 框架
- **Vite** - 构建工具
- **TypeScript** - 类型系统
- **Wagmi** - Web3 连接
- **Lucide React** - 图标库
- **Tailwind CSS** - 样式框架 (可选)

---

## 🎯 下一步计划

1. **P0**: 使用 Squoosh/ImageOptim 压缩美术资源
2. **P1**: 添加音效文件到 `public/audio/`
3. **P2**: 集成 Framer Motion 增强卡牌动画
4. **P3**: 添加新手引导和卡牌 Tooltip

---

**Made with ❤️ by Antigravity Interactive**
