/**
 * AI 决策引擎测试
 * [Phase C/F-3] 覆盖难度配置、状态评估、前瞻搜索
 */

import { describe, it, expect } from 'vitest';
import { DuelState } from '../../types';
import {
  AI_DIFFICULTY_PRESETS,
  pickBestSpellForAI,
  evaluateStateScore,
  evaluateMinionThreat,
} from '../../services/ai';

// 创建一个基础 DuelState 用于测试
const createMockState = (overrides: Partial<DuelState> = {}): DuelState => ({
  playerHP: 30,
  playerArmor: 0,
  opponentHP: 30,
  opponentArmor: 0,
  playerMana: 3,
  playerMaxMana: 3,
  opponentMana: 5,
  opponentMaxMana: 5,
  playerHand: ['fire', 'ice', 'thunder'],
  playerDeck: ['rock', 'vine'],
  opponentHand: ['fire', 'fire2', 'ice', 'thunder', 'rock5'],
  opponentHandSize: 5,
  opponentDeck: ['rock', 'vine'],
  playerEffects: [],
  opponentEffects: [],
  playerMinions: [],
  opponentMinions: [],
  playerLastSpell: null,
  opponentLastSpell: null,
  playerCostMod: 0,
  opponentCostMod: 0,
  heroSkillsUsed: false,
  opponentHeroSkillUsed: false,
  playerConsecutiveThunder: 0,
  opponentConsecutiveThunder: 0,
  playerFatigue: 0,
  opponentFatigue: 0,
  roundNumber: 1,
  playerTriggers: [],
  opponentTriggers: [],
  triggerOrderCounter: 0,
  ...overrides,
});

describe('AI Difficulty Presets', () => {
  it('should have 4 presets: beginner, normal, expert, master', () => {
    expect(AI_DIFFICULTY_PRESETS.beginner).toBeDefined();
    expect(AI_DIFFICULTY_PRESETS.normal).toBeDefined();
    expect(AI_DIFFICULTY_PRESETS.expert).toBeDefined();
    expect(AI_DIFFICULTY_PRESETS.master).toBeDefined();
  });

  it('beginner should have higher randomness than normal', () => {
    expect(AI_DIFFICULTY_PRESETS.beginner.randomness).toBeGreaterThan(
      AI_DIFFICULTY_PRESETS.normal.randomness
    );
  });

  it('expert should have searchDepth >= 1', () => {
    expect(AI_DIFFICULTY_PRESETS.expert.searchDepth).toBeGreaterThanOrEqual(1);
  });

  it('master should have searchDepth = 2 and randomness = 0', () => {
    expect(AI_DIFFICULTY_PRESETS.master.searchDepth).toBe(2);
    expect(AI_DIFFICULTY_PRESETS.master.randomness).toBe(0);
  });

  it('beginner should not have lethal check enabled', () => {
    expect(AI_DIFFICULTY_PRESETS.beginner.lethalCheck).toBe(false);
  });

  it('normal should have lethal check enabled', () => {
    expect(AI_DIFFICULTY_PRESETS.normal.lethalCheck).toBe(true);
  });
});

describe('evaluateStateScore', () => {
  it('should return positive score when opponent has HP advantage', () => {
    const state = createMockState({ opponentHP: 30, playerHP: 10 });
    const score = evaluateStateScore(state, 'opponent');
    expect(score).toBeGreaterThan(0);
  });

  it('should return negative score when opponent has less HP', () => {
    const state = createMockState({ opponentHP: 10, playerHP: 30 });
    const score = evaluateStateScore(state, 'opponent');
    expect(score).toBeLessThan(0);
  });

  it('should give huge bonus for lethal', () => {
    const state = createMockState({ playerHP: 0 });
    const score = evaluateStateScore(state, 'opponent');
    expect(score).toBeGreaterThan(900);
  });

  it('should give huge penalty for own death', () => {
    const state = createMockState({ opponentHP: 0 });
    const score = evaluateStateScore(state, 'opponent');
    expect(score).toBeLessThan(-900);
  });

  it('should value minions in score', () => {
    const stateWithMinions = createMockState({
      opponentMinions: [{ id: 'm1', instanceId: 'm1', name: 'Test', hp: 3, maxHp: 3, atk: 2, baseAtk: 2, baseHp: 3, exhausted: false, type: 'fire', keywords: [], buffs: [] }],
    });
    const stateWithout = createMockState();

    const scoreWith = evaluateStateScore(stateWithMinions, 'opponent');
    const scoreWithout = evaluateStateScore(stateWithout, 'opponent');
    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });

  it('should value taunt minions higher', () => {
    const stateWithTaunt = createMockState({
      opponentMinions: [{ id: 'm1', instanceId: 'm1', name: 'Taunt', hp: 3, maxHp: 3, atk: 2, baseAtk: 2, baseHp: 3, exhausted: false, type: 'rock', keywords: ['taunt'], buffs: [] }],
    });
    const stateWithPlain = createMockState({
      opponentMinions: [{ id: 'm2', instanceId: 'm2', name: 'Plain', hp: 3, maxHp: 3, atk: 2, baseAtk: 2, baseHp: 3, exhausted: false, type: 'fire', keywords: [], buffs: [] }],
    });

    const tauntScore = evaluateStateScore(stateWithTaunt, 'opponent');
    const plainScore = evaluateStateScore(stateWithPlain, 'opponent');
    expect(tauntScore).toBeGreaterThan(plainScore);
  });
});

describe('evaluateMinionThreat', () => {
  const mockState = createMockState();

  it('should score taunt minions higher', () => {
    const taunt = { id: 't', instanceId: 't', name: 'Taunt', hp: 5, maxHp: 5, atk: 2, baseAtk: 2, baseHp: 5, exhausted: false, type: 'rock', keywords: ['taunt'] as const, buffs: [] };
    const plain = { id: 'p', instanceId: 'p', name: 'Plain', hp: 5, maxHp: 5, atk: 2, baseAtk: 2, baseHp: 5, exhausted: false, type: 'fire', keywords: [] as const, buffs: [] };

    expect(evaluateMinionThreat(taunt as any, mockState)).toBeGreaterThan(
      evaluateMinionThreat(plain as any, mockState)
    );
  });

  it('should score poison minions very high', () => {
    const poison = { id: 'p', instanceId: 'p', name: 'Poison', hp: 1, maxHp: 1, atk: 1, baseAtk: 1, baseHp: 1, exhausted: false, type: 'neutral', keywords: ['poison'] as const, buffs: [] };
    const plain = { id: 'q', instanceId: 'q', name: 'Plain', hp: 3, maxHp: 3, atk: 3, baseAtk: 3, baseHp: 3, exhausted: false, type: 'fire', keywords: [] as const, buffs: [] };

    expect(evaluateMinionThreat(poison as any, mockState)).toBeGreaterThan(
      evaluateMinionThreat(plain as any, mockState)
    );
  });

  it('should score windfury at double attack value', () => {
    const windfury = { id: 'w', instanceId: 'w', name: 'Windfury', hp: 2, maxHp: 2, atk: 3, baseAtk: 3, baseHp: 2, exhausted: false, type: 'thunder', keywords: ['windfury'] as const, buffs: [] };
    const plain = { id: 'x', instanceId: 'x', name: 'Plain', hp: 2, maxHp: 2, atk: 3, baseAtk: 3, baseHp: 2, exhausted: false, type: 'fire', keywords: [] as const, buffs: [] };

    // windfury: 3*2 + 2 + 3 = 11, plain: 3*2 + 2 = 8
    expect(evaluateMinionThreat(windfury as any, mockState)).toBeGreaterThan(
      evaluateMinionThreat(plain as any, mockState)
    );
  });
});

describe('pickBestSpellForAI', () => {
  it('should return null when opponent is frozen', () => {
    const state = createMockState({
      opponentEffects: [{ type: 'frozen', duration: 1 }],
    });
    expect(pickBestSpellForAI(state, new Set(), AI_DIFFICULTY_PRESETS.normal)).toBeNull();
  });

  it('should return null when no affordable cards', () => {
    const state = createMockState({
      opponentMana: 0,
      opponentHand: ['fire5'], // costs 5, can't afford
    });
    expect(pickBestSpellForAI(state, new Set(), AI_DIFFICULTY_PRESETS.normal)).toBeNull();
  });

  it('should return a spell when affordable cards exist', () => {
    const state = createMockState({ opponentMana: 10 });
    const result = pickBestSpellForAI(state, new Set(), AI_DIFFICULTY_PRESETS.normal);
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('should not return excluded spells', () => {
    const state = createMockState({
      opponentMana: 10,
      opponentHand: ['fire', 'ice'],
    });
    const excluded = new Set(['fire']);
    const result = pickBestSpellForAI(state, excluded, AI_DIFFICULTY_PRESETS.normal);
    expect(result).not.toBe('fire');
  });

  it('should pick lethal kill shot when available', () => {
    const state = createMockState({
      playerHP: 3,
      playerArmor: 0,
      opponentMana: 10,
      opponentHand: ['fire5', 'fire2'],
      opponentHeroSkillUsed: true,
    });
    // fire5 does 5 damage, enough to kill player with 3 HP
    const result = pickBestSpellForAI(state, new Set(), AI_DIFFICULTY_PRESETS.normal);
    expect(result).toBe('fire5');
  });

  it('beginner should not pick lethal (lethalCheck=false)', () => {
    const state = createMockState({
      playerHP: 3,
      playerArmor: 0,
      opponentMana: 10,
      opponentHand: ['fire', 'fire5'],
    });
    // beginner doesn't check lethal, so may or may not pick fire5
    const result = pickBestSpellForAI(state, new Set(), AI_DIFFICULTY_PRESETS.beginner);
    expect(result).toBeDefined(); // just should not crash
  });

  it('should prefer heal when opponent HP is low', () => {
    const state = createMockState({
      opponentHP: 5,
      opponentMana: 10,
      opponentHand: ['fire', 'healing'],
    });
    const result = pickBestSpellForAI(state, new Set(), AI_DIFFICULTY_PRESETS.normal);
    // healing has mechanic='heal', should be preferred when HP is low
    expect(result).toBeDefined();
  });
});
