# Wizard Duel 审计修复方案 (39条)

> 生成时间: 2026-02-09

---

## 🔴 致命问题 (必须修)

### #1 gameLogic.ts 使用 require() 加载ESM模块 [5分钟]

**问题**: 第393行使用 `require('./combat/elementSystem')`

**修复**:
```typescript
// 在文件顶部添加 import
import { getElementType, doesElementBeat } from './combat/elementSystem';

// 删除 determineWinner 中的 require 调用
export const determineWinner = (p: SpellType, o: SpellType): 'WIN' | 'LOSS' | 'DRAW' => {
  const playerSpell = getSpellById(p);
  const opponentSpell = getSpellById(o);
  
  // 直接使用导入的函数
  const playerElement = getElementType(p);
  const opponentElement = getElementType(o);
  // ...
};
```

---

### #2 AI手牌暴露在前端 [1-2天]

**状态**: ✅ 已完成 (前端隐藏)
**问题**: `DuelState.opponentHand` 完整暴露给前端

**修复方案**:

1. 创建 `services/AIBrain.ts`:
```typescript
// 隔离AI决策逻辑，手牌数据不离开此模块
class AIBrain {
  private hand: SpellType[] = [];
  private deck: SpellType[] = [];
  
  // 外部只能获取手牌数量
  getHandSize(): number { return this.hand.length; }
  
  // AI决策在内部完成
  async decide(visibleState: PublicDuelState): Promise<SpellType> {
    // 决策逻辑
  }
}
```

2. 修改 `types/duel.ts`:
```typescript
interface DuelState {
  // 删除 opponentHand，只保留 opponentHandSize
  opponentHandSize: number;
  // 新增 AI 引用（仅在客户端PvE模式使用）
  aiBrain?: AIBrain;
}
```

---

### #3 金币存储改为Supabase RPC [2-3天]

**问题**: 金币存 localStorage 可篡改

**状态**: ✅ 已完成
**修复**: 创建 Supabase RPC 函数 (settle_battle, adjust_gold)

```sql
-- supabase/migrations/add_gold_rpc.sql
CREATE OR REPLACE FUNCTION adjust_gold(
  p_user_id UUID,
  p_delta INTEGER,
  p_reason TEXT DEFAULT 'game'
) RETURNS INTEGER AS $$
DECLARE
  v_new_gold INTEGER;
BEGIN
  UPDATE profiles 
  SET gold = GREATEST(0, gold + p_delta)
  WHERE id = p_user_id
  RETURNING gold INTO v_new_gold;
  
  -- 记录交易日志
  INSERT INTO gold_transactions (user_id, delta, reason, created_at)
  VALUES (p_user_id, p_delta, p_reason, NOW());
  
  RETURN v_new_gold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// services/supabase.ts
export const adjustGoldSecure = async (userId: string, delta: number, reason: string) => {
  const { data, error } = await supabase.rpc('adjust_gold', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason
  });
  if (error) throw error;
  return data;
};
```

---

### #4 开包概率改为Supabase RPC [同#3]

**修复**: 创建服务端开包函数

```sql
CREATE OR REPLACE FUNCTION open_pack(
  p_user_id UUID,
  p_pack_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_cards JSONB;
  v_pity INTEGER;
BEGIN
  -- 检查库存
  -- 计算概率（含保底）
  -- 生成卡牌
  -- 更新库存和收藏
  RETURN v_cards;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### #5 战斗逻辑服务端化 [长期]

**短期方案**: 结算时服务端验证
```typescript
// 战斗结束时，发送完整战斗日志到服务端验证
const validateBattle = async (battleLog: BattleLog) => {
  const { data } = await supabase.rpc('validate_battle', { log: battleLog });
  return data.valid;
};
```

**长期方案**: 使用 Supabase Edge Functions 或 Cloudflare Workers 处理核心逻辑

---

### #6 关闭 antiCheat MOCK_MODE [随对接]

**修复**: 
```typescript
// services/validation/antiCheat.ts
const MOCK_MODE = import.meta.env.PROD ? false : true;
```

---

## 🟠 高优先问题

### #7 添加每回合出牌上限 [2小时]

```typescript
// constants.ts
export const MAX_CARDS_PER_TURN = 8;

// hooks/useGameLoop.ts - playCard 函数
const [cardsPlayedThisTurn, setCardsPlayedThisTurn] = useState(0);

const playCard = (spellId: SpellType) => {
  if (cardsPlayedThisTurn >= MAX_CARDS_PER_TURN) {
    toast.error('本回合已达到出牌上限！');
    return;
  }
  // ...existing logic
  setCardsPlayedThisTurn(prev => prev + 1);
};

// 回合结束时重置
const endTurn = () => {
  setCardsPlayedThisTurn(0);
  // ...
};
```

---

### #8 统一缠绕(Tangle)到RuleArbiter [半天] - ✅ 已完成 (确认一致性)

```typescript
// services/RuleArbiter.ts - tickEffects 中处理
// 删除 gameLogic.ts 中的 duration <= 2 硬编码判断
// 让 tangle 和其他效果一样自然递减
```

---

### #9 删除冻结硬限制 [半天]

```typescript
// 查找并删除任何 frozen duration 硬编码为1的逻辑
// 让卡牌数据 spell.effectDuration 控制冻结时长
```

---

### #10 改为元素固有克制 [半天]

```typescript
// services/combat/elementSystem.ts
export const evaluateElementInteraction = (
  attackerId: SpellType,
  _targetLastSpell: SpellType | null // 不再使用
): { countered: boolean; crit: boolean } => {
  // 改为基于双方当前出牌的元素类型判定
  // 而非依赖"上一张牌"
};
```

---

### #11 通用连击框架 [1天]

```typescript
// services/combat/comboSystem.ts
interface ComboConfig {
  element: ElementType;
  maxStack: number;
  bonusPerStack: number;
}

const COMBO_CONFIGS: ComboConfig[] = [
  { element: 'thunder', maxStack: 2, bonusPerStack: 0.5 },
  { element: 'fire', maxStack: 3, bonusPerStack: 0.3 },
  // ...可扩展
];

// 重构 calculateComboBonus 支持多元素
```

---

### #12 随从AI威胁度评估 [半天]

```typescript
// services/ai.ts
const evaluateThreat = (minion: Minion, gameState: DuelState): number => {
  let threat = minion.attack * 2 + minion.health;
  if (minion.abilities?.includes('taunt')) threat += 10;
  if (minion.abilities?.includes('poison')) threat += 15;
  return threat;
};

const selectMinionTarget = (attacker: Minion, targets: Minion[]): Minion => {
  return targets.sort((a, b) => evaluateThreat(b, state) - evaluateThreat(a, state))[0];
};
```

---

### #13 统一到Action系统 [2-3天]

```typescript
// 所有状态修改都通过 GameCommand.actions
// 删除 mutableState 直接修改的代码

// gameLogic.ts executeSpell 中
actions.push({ type: 'REMOVE_CARD_FROM_HAND', target: caster, value: spellId });
// 而不是直接修改 mutableState.playerHand
```

---

## 🟡 中优先问题

### #14 引入轻量路由 [1天]

```typescript
// 使用 zustand 管理路由状态，支持浏览器历史
import { useEffect } from 'react';

const useGameRouter = create((set) => ({
  screen: 'menu',
  setScreen: (screen) => {
    window.history.pushState({ screen }, '', `#${screen}`);
    set({ screen });
  }
}));

// App.tsx
useEffect(() => {
  window.onpopstate = (e) => setScreen(e.state?.screen || 'menu');
}, []);
```

---

### #15 统一到Zustand store [2天]

```typescript
// stores/useBattleStore.ts
// 将 useGameLoop 中的 useState 迁移到 Zustand
```

---

### #16 引入Immer [1天]

```typescript
import { produce } from 'immer';

// services/stateUtils.ts
export const updateState = (state: DuelState, updater: (draft: DuelState) => void) => {
  return produce(state, updater);
};
```

---

### #17 Supabase重试机制 [半天]

```typescript
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
};
```

---

### #18 adjustGold原子操作 [随#3]

已在 #3 中通过 RPC 解决 ✅

---

### #19 概率统一 [随#4]

已在 #4 中通过服务端统一实现

---

### #20 标记或删除Spell.beats [30分钟]

```typescript
// types/card.ts
interface Spell {
  /** @deprecated 不再使用，克制由 elementSystem 处理 */
  beats?: SpellType;
}

// 或直接从类型定义中删除
```

---

### #21 治疗溢出提示 [30分钟]

```typescript
// services/sequence.ts - HEAL action 处理
if (targetHP >= GAME_CONFIG.maxHP) {
  logs.push('❤️ 生命值已满！');
}
```

---

### #22 localStorage节流 [30分钟]

```typescript
// hooks/useGameLoop.ts
import { throttle } from 'lodash-es';

const saveToLocalStorage = throttle((data) => {
  localStorage.setItem('wizard_duel_save', JSON.stringify(data));
}, 3000);
```

---

### #23 postMessage指定origin [10分钟]

```typescript
// services/api.ts 第528行
const ALLOWED_ORIGIN = import.meta.env.VITE_PARENT_ORIGIN || '*';
window.parent.postMessage({ ... }, ALLOWED_ORIGIN);
```

---

## 🟢 低优先问题

### #24 补齐音效 [1天]

在 `public/sounds/` 目录添加:
- `card_play.mp3`
- `damage.mp3`
- `victory.mp3`
- `turn_start.mp3`

---

### #25 清理@deprecated函数 [1小时]

删除以下函数:
- `gameLogic.ts: getRandomSpell`
- `combat/turnManager.ts: prepareNextTurn` (旧版)
- `ai.ts: 旧版AI函数`

---

### #26 WebSocket重连 [半天]

```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  
  connect() {
    this.ws = new WebSocket(url);
    this.ws.onclose = () => this.scheduleReconnect();
  }
  
  private scheduleReconnect() {
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts++));
    setTimeout(() => this.connect(), delay);
  }
}
```

---

### #27 图片转WebP [2小时]

```bash
# 添加构建脚本
npx sharp-cli --input "public/cards/*.png" --output "public/cards/" --format webp
```

---

### #28 补充测试 [2-3天]

优先补充:
- `__tests__/services/gameLogic.test.ts` - 边界条件
- `__tests__/services/RuleArbiter.test.ts` - 回合结算
- `__tests__/services/combat/*.test.ts` - 战斗系统

---

### #29 图片优化 [2小时]

```typescript
// vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

export default {
  plugins: [
    viteImagemin({
      webp: { quality: 80 }
    })
  ]
};
```

---

## ⚡ 性能专项

### #30 添加React.memo [1小时]

```typescript
// components/cards/SpellCard.tsx
export const SpellCard = React.memo(({ spell, onClick }) => {
  // ...
}, (prev, next) => prev.spell.id === next.spell.id);
```

---

### #31 Canvas对象池 [半天]

```typescript
class ParticlePool {
  private pool: Particle[] = [];
  
  acquire(): Particle {
    return this.pool.pop() || new Particle();
  }
  
  release(p: Particle) {
    p.reset();
    this.pool.push(p);
  }
}
```

---

### #32 AI移入Web Worker [1天]

```typescript
// workers/ai.worker.ts
self.onmessage = (e: MessageEvent<DuelState>) => {
  const decision = pickBestSpellForAI(e.data);
  self.postMessage(decision);
};

// hooks/useAITurn.ts
const worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url));
```

---

### #33 Zustand shallow选择器 [1小时]

```typescript
import { shallow } from 'zustand/shallow';

const { hp, mana } = useGameStore(
  (s) => ({ hp: s.playerHP, mana: s.playerMana }),
  shallow
);
```

---

## 🎨 体验打磨

### #34 卡牌入手动画 [半天]

```css
@keyframes cardDraw {
  from { transform: translateX(-100px) translateY(-50px) scale(0.5); opacity: 0; }
  to { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
}
.card-entering { animation: cardDraw 0.4s ease-out; }
```

---

### #35 元素粒子特效 [1-2天]

使用 `tsparticles` 或自定义 Canvas 为每个元素添加特征粒子

---

### #36 英雄受伤效果 [2小时]

```css
@keyframes heroShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
.hero-damaged { animation: heroShake 0.3s; }
.hero-damaged::after { 
  content: ''; 
  position: absolute; 
  inset: 0; 
  background: red; 
  opacity: 0.3; 
  animation: fadeOut 0.5s; 
}
```

---

### #37 随从攻击动画 [半天]

```typescript
const animateMinionAttack = (attacker: Element, target: Element) => {
  const start = attacker.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  // 使用 GSAP 或 CSS transition 实现冲撞效果
};
```

---

### #38 回合倒计时绳子 [半天]

```tsx
<div className="turn-timer">
  <div className="rope" style={{ width: `${timeLeft / maxTime * 100}%` }} />
  {timeLeft < 10 && <span className="burning">🔥</span>}
</div>
```

---

### #39 对手出牌翻牌效果 [2小时]

```css
@keyframes cardFlip {
  0% { transform: rotateY(180deg); }
  100% { transform: rotateY(0); }
}
.opponent-card-reveal { animation: cardFlip 0.5s ease-out; }
```

---

## 📅 建议优先级排序

| 阶段 | 任务 | 预估时间 |
|------|------|----------|
| **P0** | #1 require→import | 5分钟 |
| **P0** | #6 关闭MOCK_MODE | 10分钟 |
| **P0** | #7 出牌上限 | 2小时 |
| **P0** | #23 postMessage安全 | 10分钟 |
| **P1** | #3+#4+#18+#19 金币/开包RPC | 3天 |
| **P1** | #2 AI手牌隔离 | 2天 |
| **P2** | #8-#13 游戏机制优化 | 1周 |
| **P3** | 性能优化 #30-#33 | 3天 |
| **P4** | 体验打磨 #34-#39 | 1周 |

---

*总预估工作量: 3-4周（单人全职）*
