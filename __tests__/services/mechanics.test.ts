/**
 * 机制处理器测试
 * [Phase A/F-3] 覆盖新增 mechanic handler
 */

import { describe, it, expect } from 'vitest';
import { DuelState, Spell } from '../../types';
import { MECHANIC_DEFINITIONS, getMechanicHandler } from '../../services/mechanics';

const createMockState = (): DuelState => ({
  playerHP: 30, playerArmor: 0,
  opponentHP: 30, opponentArmor: 0,
  playerMana: 5, playerMaxMana: 5,
  opponentMana: 5, opponentMaxMana: 5,
  playerHand: ['fire'], playerDeck: ['ice'],
  opponentHand: ['ice'], opponentHandSize: 1,
  opponentDeck: ['rock'],
  playerEffects: [], opponentEffects: [],
  playerMinions: [], opponentMinions: [],
  playerLastSpell: null, opponentLastSpell: null,
  playerCostMod: 0, opponentCostMod: 0,
  heroSkillsUsed: false, opponentHeroSkillUsed: false,
  playerConsecutiveThunder: 0, opponentConsecutiveThunder: 0,
  playerFatigue: 0, opponentFatigue: 0,
  roundNumber: 1,
  playerTriggers: [], opponentTriggers: [],
  triggerOrderCounter: 0,
});

const createMockSpell = (overrides: Partial<Spell> = {}): Spell => ({
  id: 'test_spell' as any,
  name: 'Test',
  emoji: '🧪',
  color: 'text-red-500',
  borderColor: 'border-red-500',
  shadowColor: 'rgba(255,0,0,0.5)',
  manaCost: 3,
  damage: 4,
  rarity: 'rare',
  mechanic: 'burn',
  description: 'test',
  shortDesc: 'test',
  beats: 'ice' as any,
  ...overrides,
});

describe('MECHANIC_DEFINITIONS', () => {
  it('should have all expected mechanic handlers', () => {
    const expected = ['burn', 'tangle', 'freeze', 'heal', 'aoe', 'draw', 'silence', 'luck_coin', 'charge', 'divine_shield', 'deathrattle', 'aura', 'poison', 'summon'];
    expected.forEach(key => {
      expect(MECHANIC_DEFINITIONS[key]).toBeDefined();
    });
  });

  it('getMechanicHandler should return handler for known mechanics', () => {
    expect(getMechanicHandler('burn')).toBeDefined();
    expect(getMechanicHandler('freeze')).toBeDefined();
    expect(getMechanicHandler('poison')).toBeDefined();
  });

  it('getMechanicHandler should return undefined for unknown mechanics', () => {
    expect(getMechanicHandler('nonexistent')).toBeUndefined();
  });
});

describe('burn handler', () => {
  it('should return ADD_EFFECT action when not countered', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'burn', value: 2, effectDuration: 2 });
    const actions = MECHANIC_DEFINITIONS.burn(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('ADD_EFFECT');
    expect(actions[0].target).toBe('opponent');
  });

  it('should return empty when countered', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'burn' });
    const actions = MECHANIC_DEFINITIONS.burn(state, 'player', spell, true, false);
    expect(actions.length).toBe(0);
  });
});

describe('freeze handler', () => {
  it('should return ADD_EFFECT frozen action', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'freeze', effectDuration: 1 });
    const actions = MECHANIC_DEFINITIONS.freeze(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('ADD_EFFECT');
  });

  it('should be blocked by thawed effect', () => {
    const state = createMockState();
    state.opponentEffects = [{ type: 'thawed', duration: 1 }];
    const spell = createMockSpell({ mechanic: 'freeze' });
    const actions = MECHANIC_DEFINITIONS.freeze(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('MESSAGE'); // immune message
  });
});

describe('heal handler', () => {
  it('should heal the caster', () => {
    const state = createMockState();
    state.playerHP = 20;
    const spell = createMockSpell({ mechanic: 'heal', value: 5 });
    const actions = MECHANIC_DEFINITIONS.heal(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('HP_CHANGE');
    expect(actions[0].target).toBe('player');
  });

  it('should not overheal beyond maxHP', () => {
    const state = createMockState();
    state.playerHP = 30;
    const spell = createMockSpell({ mechanic: 'heal', value: 10 });
    const actions = MECHANIC_DEFINITIONS.heal(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('MESSAGE'); // overflow message
  });
});

describe('poison handler', () => {
  it('should add poisoned effect to target', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'poison', value: 2, effectDuration: 3 });
    const actions = MECHANIC_DEFINITIONS.poison(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('ADD_EFFECT');
    expect(actions[0].target).toBe('opponent');
  });

  it('should return empty when countered', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'poison' });
    const actions = MECHANIC_DEFINITIONS.poison(state, 'player', spell, true, false);
    expect(actions.length).toBe(0);
  });
});

describe('silence handler', () => {
  it('should remove effects and draw card', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'silence' });
    const actions = MECHANIC_DEFINITIONS.silence(state, 'player', spell, false, false);
    expect(actions.length).toBe(2);
    expect(actions[0].type).toBe('REMOVE_EFFECT');
    expect(actions[1].type).toBe('DRAW_CARD');
  });

  it('should be nullified when countered', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'silence' });
    const actions = MECHANIC_DEFINITIONS.silence(state, 'player', spell, true, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('MESSAGE');
  });
});

describe('aoe handler', () => {
  it('should deal 1 pierce damage to target', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'aoe' });
    const actions = MECHANIC_DEFINITIONS.aoe(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('HP_CHANGE');
    expect(actions[0].target).toBe('opponent');
  });
});

describe('draw handler', () => {
  it('should draw cards when not countered', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'draw', value: 2 });
    const actions = MECHANIC_DEFINITIONS.draw(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('DRAW_CARD');
  });

  it('should be nullified when countered', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'draw', value: 2 });
    const actions = MECHANIC_DEFINITIONS.draw(state, 'player', spell, true, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('MESSAGE');
  });
});

describe('tangle handler', () => {
  it('should add tangle effect to opponent', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'tangle', value: 1, effectDuration: 2 });
    const actions = MECHANIC_DEFINITIONS.tangle(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('ADD_EFFECT');
    expect(actions[0].target).toBe('opponent');
  });

  it('should return empty when countered', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'tangle' });
    const actions = MECHANIC_DEFINITIONS.tangle(state, 'player', spell, true, false);
    expect(actions.length).toBe(0);
  });
});

describe('summon handler', () => {
  it('should summon a minion when summonId exists', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'summon', summonId: 'fire_spirit' });
    const actions = MECHANIC_DEFINITIONS.summon(state, 'player', spell, false, false);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe('SUMMON_MINION');
    expect(actions[0].target).toBe('player');
  });

  it('should return empty when countered', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'summon', summonId: 'fire_spirit' });
    const actions = MECHANIC_DEFINITIONS.summon(state, 'player', spell, true, false);
    expect(actions.length).toBe(0);
  });

  it('should return empty when no summonId', () => {
    const state = createMockState();
    const spell = createMockSpell({ mechanic: 'summon' });
    const actions = MECHANIC_DEFINITIONS.summon(state, 'player', spell, false, false);
    expect(actions.length).toBe(0);
  });
});
