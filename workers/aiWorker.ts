/**
 * AI 决策 Web Worker
 * 
 * [P3 Fix #32] 将 AI 计算移到 Web Worker 避免阻塞主线程
 * 
 * 使用方式:
 * const aiWorker = new Worker(new URL('./aiWorker.ts', import.meta.url), { type: 'module' });
 * aiWorker.postMessage({ type: 'PICK_SPELL', state: gameState });
 * aiWorker.onmessage = (e) => { console.log(e.data.result); };
 */

import type { DuelState, SpellType } from '../types';

// Worker 消息类型
interface WorkerMessage {
  type: 'PICK_SPELL' | 'EVALUATE_BOARD';
  state: DuelState;
  excludeSpells?: string[];
  requestId?: string;
}

interface WorkerResponse {
  type: 'RESULT' | 'ERROR';
  result?: SpellType | null;
  evaluation?: number;
  requestId?: string;
  error?: string;
}

// 简化版 AI 决策逻辑（在 Worker 中独立运行）
const evaluateSpellValue = (spellId: string, state: DuelState): number => {
  let score = 50; // 基础分
  
  // 解析卡牌信息（简化版，实际应从共享数据获取）
  const isHealSpell = spellId.includes('heal') || spellId === 'healing';
  const isAttackSpell = spellId.includes('fire') || spellId.includes('thunder') || spellId.includes('ice');
  const isDefenseSpell = spellId.includes('rock') || spellId.includes('vine');
  
  // 根据血量调整策略
  const healthRatio = state.opponentHP / 30;
  const enemyHealthRatio = state.playerHP / 30;
  
  // 低血量时优先治疗/防御
  if (healthRatio < 0.3) {
    if (isHealSpell) score += 30;
    if (isDefenseSpell) score += 20;
  }
  
  // 敌方低血量时优先攻击
  if (enemyHealthRatio < 0.3) {
    if (isAttackSpell) score += 40;
  }
  
  // 随机因素(±10)
  score += Math.random() * 20 - 10;
  
  return score;
};

const pickBestSpell = (state: DuelState, excludeSpells: Set<string>): SpellType | null => {
  const available = state.opponentHand.filter(s => !excludeSpells.has(s));
  
  if (available.length === 0) return null;
  
  // 评估每张牌
  const scored = available.map(spellId => ({
    id: spellId,
    score: evaluateSpellValue(spellId, state)
  }));
  
  // 按分数排序
  scored.sort((a, b) => b.score - a.score);
  
  // 返回最高分的牌
  return scored[0]?.id as SpellType || null;
};

// Worker 消息处理
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, state, excludeSpells, requestId } = event.data;
  
  try {
    let response: WorkerResponse;
    
    switch (type) {
      case 'PICK_SPELL': {
        const excludeSet = new Set(excludeSpells || []);
        const result = pickBestSpell(state, excludeSet);
        response = { type: 'RESULT', result, requestId };
        break;
      }
      
      case 'EVALUATE_BOARD': {
        // 评估当前局势（正数对AI有利）
        const hpDiff = state.opponentHP - state.playerHP;
        const handDiff = state.opponentHand.length - state.playerHand.length;
        const evaluation = hpDiff * 2 + handDiff * 5;
        response = { type: 'RESULT', evaluation, requestId };
        break;
      }
      
      default:
        response = { type: 'ERROR', error: `Unknown message type: ${type}`, requestId };
    }
    
    self.postMessage(response);
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      requestId
    });
  }
};

// 导出类型供主线程使用
export type { WorkerMessage, WorkerResponse };
