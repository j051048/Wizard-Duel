/**
 * [Phase 4] 留存系统测试 — 每周任务 + 月度签到里程碑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

import { QuestManager } from '../../services/QuestManager';

describe('QuestManager Weekly Quests', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('initWeekly 应该生成每周任务', () => {
    const quests = QuestManager.initWeekly();
    expect(quests.length).toBeGreaterThan(0);
    quests.forEach(q => {
      expect(q.isCompleted).toBe(false);
      expect(q.isClaimed).toBe(false);
      expect(q.current).toBe(0);
    });
  });

  it('updateWeeklyProgress 应该更新每周任务进度', () => {
    QuestManager.initWeekly();
    const updated = QuestManager.updateWeeklyProgress('weekly_wins', 1);
    const winQuest = updated.find(q => q.type === 'weekly_wins');
    if (winQuest) {
      expect(winQuest.current).toBe(1);
    }
  });

  it('claimWeeklyReward 应该领取已完成的任务', () => {
    QuestManager.initWeekly();
    // Simulate completing the first quest
    const quests = QuestManager.loadWeeklyQuests();
    if (quests.length > 0) {
      quests[0].isCompleted = true;
      (QuestManager as any).saveWeeklyQuests(quests);

      const result = QuestManager.claimWeeklyReward(quests[0].id);
      expect(result.success).toBe(true);
      expect(result.reward).toBeGreaterThan(0);
    }
  });

  it('未完成的任务不能领取', () => {
    QuestManager.initWeekly();
    const quests = QuestManager.loadWeeklyQuests();
    if (quests.length > 0) {
      const result = QuestManager.claimWeeklyReward(quests[0].id);
      expect(result.success).toBe(false);
    }
  });
});
