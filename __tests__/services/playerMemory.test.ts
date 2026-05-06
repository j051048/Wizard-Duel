/**
 * PlayerMemoryTracker 测试
 * [Phase 1] 覆盖出牌记录、画像生成、策略检测
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerMemoryTracker, COUNTER_STRATEGIES } from '../../services/ai';

describe('PlayerMemoryTracker', () => {
  let tracker: PlayerMemoryTracker;

  beforeEach(() => {
    tracker = new PlayerMemoryTracker();
  });

  describe('recordCardPlayed', () => {
    it('应该记录出牌信息', () => {
      tracker.recordCardPlayed('fire', 4, 1);
      const profile = tracker.getProfile();
      expect(profile.totalCardsPlayed).toBe(1);
      expect(profile.avgManaCurve).toBe(4);
    });

    it('应该追踪多张牌', () => {
      tracker.recordCardPlayed('fire', 4, 1);
      tracker.recordCardPlayed('ice', 3, 1);
      tracker.recordCardPlayed('thunder', 2, 2);
      const profile = tracker.getProfile();
      expect(profile.totalCardsPlayed).toBe(3);
      expect(profile.avgManaCurve).toBeCloseTo(3);
    });
  });

  describe('getProfile', () => {
    it('没有出牌时返回默认值', () => {
      const profile = tracker.getProfile();
      expect(profile.totalCardsPlayed).toBe(0);
      expect(profile.avgManaCurve).toBe(0);
      expect(profile.aggressiveness).toBe(0);
    });

    it('应该计算元素频率', () => {
      tracker.recordCardPlayed('fire', 4, 1);
      tracker.recordCardPlayed('fire2', 3, 1);
      tracker.recordCardPlayed('ice', 2, 2);
      const profile = tracker.getProfile();
      expect(profile.elementFrequency['fire']).toBe(2);
      expect(profile.elementFrequency['ice']).toBe(1);
    });

    it('应该计算激进度（高费牌比例）', () => {
      // 5+ mana = aggressive
      tracker.recordCardPlayed('fire', 1, 1);
      tracker.recordCardPlayed('fire2', 6, 1);
      tracker.recordCardPlayed('fire3', 8, 2);
      const profile = tracker.getProfile();
      expect(profile.aggressiveness).toBeCloseTo(2 / 3);
    });

    it('应该计算防御出牌率', () => {
      tracker.recordCardPlayed('healing', 3, 1);
      tracker.recordCardPlayed('fire', 4, 1);
      tracker.recordCardPlayed('shield', 2, 2);
      const profile = tracker.getProfile();
      expect(profile.defensivePlayRate).toBeCloseTo(2 / 3);
    });
  });

  describe('detectStrategy', () => {
    it('出牌少于3张时返回 unknown', () => {
      tracker.recordCardPlayed('fire', 4, 1);
      tracker.recordCardPlayed('fire2', 3, 1);
      expect(tracker.detectStrategy()).toBe('unknown');
    });

    it('火系占多数 + 高费 → fire_rush', () => {
      for (let i = 0; i < 5; i++) {
        tracker.recordCardPlayed(`fire${i}`, 5, 1);
      }
      tracker.recordCardPlayed('ice', 2, 1);
      expect(tracker.detectStrategy()).toBe('fire_rush');
    });

    it('冰系占多数 → ice_control', () => {
      for (let i = 0; i < 5; i++) {
        tracker.recordCardPlayed(`ice${i}`, 3, 1);
      }
      tracker.recordCardPlayed('fire', 4, 1);
      expect(tracker.detectStrategy()).toBe('ice_control');
    });

    it('雷系占多数 + 高combo → thunder_combo', () => {
      for (let i = 0; i < 5; i++) {
        tracker.recordCardPlayed(`thunder${i}`, 3, 1);
      }
      tracker.recordCardPlayed('fire', 4, 1);
      expect(tracker.detectStrategy()).toBe('thunder_combo');
    });

    it('岩系占多数 + 防御牌多 → rock_defense', () => {
      for (let i = 0; i < 4; i++) {
        tracker.recordCardPlayed(`rock${i}`, 3, 1);
      }
      // 需要足够多的防御牌使 defensivePlayRate > 0.3
      tracker.recordCardPlayed('shield', 2, 1);
      tracker.recordCardPlayed('armor', 2, 1);
      expect(tracker.detectStrategy()).toBe('rock_defense');
    });

    it('多种元素平衡使用 → balanced', () => {
      tracker.recordCardPlayed('fire', 4, 1);
      tracker.recordCardPlayed('ice', 3, 1);
      tracker.recordCardPlayed('thunder', 2, 1);
      tracker.recordCardPlayed('vine', 3, 1);
      tracker.recordCardPlayed('rock', 2, 1);
      expect(tracker.detectStrategy()).toBe('balanced');
    });
  });

  describe('reset', () => {
    it('重置后清空所有数据', () => {
      tracker.recordCardPlayed('fire', 4, 1);
      tracker.recordCardPlayed('ice', 3, 2);
      tracker.reset();
      const profile = tracker.getProfile();
      expect(profile.totalCardsPlayed).toBe(0);
      expect(tracker.detectStrategy()).toBe('unknown');
    });
  });
});

describe('COUNTER_STRATEGIES', () => {
  it('每种策略都有对应的反制配置', () => {
    const strategies = ['fire_rush', 'ice_control', 'thunder_combo', 'rock_defense', 'vine_sustain', 'balanced', 'unknown'] as const;
    for (const s of strategies) {
      expect(COUNTER_STRATEGIES[s]).toBeDefined();
      expect(COUNTER_STRATEGIES[s].bonusScore).toBeGreaterThanOrEqual(0);
    }
  });

  it('fire_rush 反制应偏好 ice/rock + 治疗/护甲', () => {
    const counter = COUNTER_STRATEGIES['fire_rush'];
    expect(counter.preferredElements).toContain('ice');
    expect(counter.preferredElements).toContain('rock');
    expect(counter.preferredMechanics).toContain('heal');
  });

  it('balanced 和 unknown 的 bonusScore 应为 0', () => {
    expect(COUNTER_STRATEGIES['balanced'].bonusScore).toBe(0);
    expect(COUNTER_STRATEGIES['unknown'].bonusScore).toBe(0);
  });
});
