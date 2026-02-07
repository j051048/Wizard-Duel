# Wizard Duel: Arcane Bet — 优化实施路线图 (Updated)

基于《全面优化审查报告》，本项目将后续优化工作划分为四个阶段。执行顺序遵循：**核心稳定性 (P0) > 架构性能 (P1) > 代码质量 (P2/P4) > 体验打磨 (P3)**。

---

## 📅 阶段一：核心修复与稳定性 (Critical Fixes)

**目标**：修复数据污染、潜在的运行时 Bug 和严重的安全隐患，确保游戏逻辑正确运行。

- [x] **#1: 修复数据污染 (Data Integrity)** [Priority: P0]
  - 确保 `data/spells.ts` 中没有重复定义的 Spell ID。
  - **状态**：已完成。已清理冲突 ID。
- [x] **#2: 强化类型安全基础 (Type Hardening)** [Priority: P0]
  - 在 `tsconfig.json` 中启用 `"strictNullChecks": true` 和 `"noImplicitAny": true`。
  - **状态**：已完成。已安装 `@types/react` 并修复 `App.tsx` 中的类型错误。
- [x] **#3: App.tsx 架构整理 (App Architecture Clean-up)** [Priority: P0]
  - 重新排列 `useEffect` 和 `useCallback` 顺序，解决 init-before-declaration 问题。
  - 统一处理 `handleGameEnd` 的参数传递 (SpellType 强转)。
  - **状态**：已完成。代码结构已优化。
- [x] **#4: 加固结算安全 (Authoritative Settlement)** [Priority: P0]
  - `ApiService.settleGame` 改为在"后端"计算 payout 和 crit，不再信任前端传参。
  - **状态**：已完成。结算逻辑已移入 Service 层。

---

## 📅 阶段二：架构重构与性能优化 (Architecture & Performance)

**目标**：降低代码耦合度，解决性能瓶颈，优化包体积。

- [x] **#5: App.tsx 瘦身 (App Decoupling)** [Priority: P1]
  - 提取 `useAppRouting` 处理视图切换。
  - 提取 `useGameFeedback` 处理音效和震动。
  - 提取 `useGameEndHandler` 处理游戏结束逻辑。
  - 提取 `LobbyHeader` 为独立组件。
  - **状态**：已完成。App.tsx 从 ~500 行精简，逻辑分离到 3 个新 Hook。
- [x] **#6: 优化游戏循环与动画 (Game Loop Optimization)** [Priority: P1]
  - 细化 `isProcessing` 锁机制，使用 ref 而非 state 追踪。
  - 添加 `processingLockRef` 和 `actionInProgressRef` 防止重复触发。
  - 使用 `safeEnqueue` 包装防止同一动作重复入队。
  - 使用 `requestIdleCallback` 延迟 localStorage 保存。
  - 限制 effectMessages 数量防止内存泄漏。
  - **状态**：已完成。
- [ ] **#9: 构建优化 (Build Optimization)** [Priority: P1]
  - 优化 `manualChunks` 配置，分离大库。

---

## 📅 阶段三：工程化与代码质量 (Code Quality & Engineering)

**目标**：统一编码规范，清除技术债，建立测试体系。

- [ ] **#11: 清理技术债 (Tech Debt Cleanup)** [Priority: P2/P4]
  - 将 `SettingsContext` 迁移至 Zustand Store。
  - 建立 `config/env.ts` 统一管理环境变量。
- [ ] **#22: 引入测试框架 (Testing Infrastructure)** [Priority: P4]
  - 为 `GameRuleEngine` 和 `calculatePayout` 添加单元测试。

---

## 📅 阶段四：体验打磨 (Experience Polish)

**目标**：提升产品的完整度和沉浸感。

- [ ] **#17: 游戏流程优化 (Flow & UX)** [Priority: P3]
  - 实现断线重连提示。
- [ ] **#19: 视听细节 (Audio & Visuals)** [Priority: P3]
  - 实现画质选项。
  - 完善 BGM/SFX 逻辑。
