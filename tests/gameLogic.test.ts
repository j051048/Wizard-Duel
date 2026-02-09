/**
 * 游戏逻辑单元测试
 * 
 * [P3 Fix #28] 添加核心逻辑单元测试
 */

import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from '../config/gameConfig';
import { getElementType, doesElementBeat } from '../services/combat/elementSystem';

// ============ 测试用例 ============

describe('GameConfig', () => {
  it('应该有正确的默认配置', () => {
    expect(GAME_CONFIG.maxHP).toBe(30);
    expect(GAME_CONFIG.maxMana).toBe(10);
    expect(GAME_CONFIG.handSize).toBe(5);
    expect(GAME_CONFIG.maxCardsPerTurn).toBeGreaterThan(0);
  });

  it('最大出牌数应该为 8', () => {
    expect(GAME_CONFIG.maxCardsPerTurn).toBe(8);
  });
});

describe('ElementSystem', () => {
  describe('getElementType', () => {
    it('应该正确识别火系法术', () => {
      expect(getElementType('fire')).toBe('fire');
      expect(getElementType('fire_bolt')).toBe('fire');
    });

    it('应该正确识别冰系法术', () => {
      expect(getElementType('ice')).toBe('ice');
      expect(getElementType('ice_shard')).toBe('ice');
    });

    it('应该正确识别雷系法术', () => {
      expect(getElementType('thunder')).toBe('thunder');
    });

    it('应该正确识别藤系法术', () => {
      expect(getElementType('vine')).toBe('vine');
    });

    it('应该正确识别岩系法术', () => {
      expect(getElementType('rock')).toBe('rock');
    });

    it('空值应返回中性', () => {
      expect(getElementType(null)).toBe('neutral');
    });
  });

  describe('doesElementBeat', () => {
    // 元素克制链: fire > vine > ice > thunder > rock > fire
    it('火克藤', () => {
      expect(doesElementBeat('fire', 'vine')).toBe(true);
      expect(doesElementBeat('vine', 'fire')).toBe(false);
    });

    it('藤克冰', () => {
      expect(doesElementBeat('vine', 'ice')).toBe(true);
      expect(doesElementBeat('ice', 'vine')).toBe(false);
    });

    it('冰克雷', () => {
      expect(doesElementBeat('ice', 'thunder')).toBe(true);
      expect(doesElementBeat('thunder', 'ice')).toBe(false);
    });

    it('雷克岩', () => {
      expect(doesElementBeat('thunder', 'rock')).toBe(true);
      expect(doesElementBeat('rock', 'thunder')).toBe(false);
    });

    it('岩克火', () => {
      expect(doesElementBeat('rock', 'fire')).toBe(true);
      expect(doesElementBeat('fire', 'rock')).toBe(false);
    });

    it('相同元素不克制', () => {
      expect(doesElementBeat('fire', 'fire')).toBe(false);
      expect(doesElementBeat('ice', 'ice')).toBe(false);
    });

    it('中性元素不参与克制', () => {
      expect(doesElementBeat('neutral', 'fire')).toBe(false);
      expect(doesElementBeat('fire', 'neutral')).toBe(false);
    });
  });
});

describe('Helpers', () => {
  it('throttle 应该限制调用频率', async () => {
    const { throttle } = await import('../utils/helpers');
    let callCount = 0;
    const fn = throttle(() => callCount++, 100);

    fn();
    fn();
    fn();

    // 立即调用只算一次
    expect(callCount).toBe(1);
  });

  it('withRetry 应该在失败后重试', async () => {
    const { withRetry } = await import('../utils/helpers');
    let attempts = 0;
    
    const failTwiceThenSucceed = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'success';
    };

    const result = await withRetry(failTwiceThenSucceed, 3, 10);
    
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
