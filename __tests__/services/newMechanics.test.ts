/**
 * [Phase 3] 新机制测试 — extra_turn / copy_spell / mana_ramp
 */

import { describe, it, expect } from 'vitest';
import { DuelState } from '../../types';
import { GameSequenceExecutor } from '../../services/sequence';
import { getMechanicHandler } from '../../services/mechanics';
import { getSpellById } from '../../services/gameLogic';

const createMockState = (overrides: Partial<DuelState> = {}): DuelState => ({
  playerHP: 30,
  playerArmor: 0,
  opponentHP: 30,
  opponentArmor: 0,
  playerMana: 8,
  playerMaxMana: 8,
  opponentMana: 8,
  opponentMaxMana: 8,
  playerHand: ['fire', 'ice'],
  playerDeck: ['rock', 'vine'],
  opponentHand: ['fire', 'ice', 'thunder'],
  opponentHandSize: 3,
  opponentDeck: ['rock', 'vine'],
  playerEffects: [],
  opponentEffects: [],
  playerMinions: [],
  opponentMinions: [],
  playerLastSpell: null,
  opponentLastSpell: 'fire',
  playerCostMod: 0,
  opponentCostMod: 0,
  playerConsecutiveThunder: 0,
  opponentConsecutiveThunder: 0,
  playerFatigue: 0,
  opponentFatigue: 0,
  roundNumber: 5,
  playerTriggers: [],
  opponentTriggers: [],
  triggerOrderCounter: 0,
  ...overrides,
});

describe('Extra Turn Mechanic', () => {
  it('应该有 extra_turn 机制处理器', () => {
    const handler = getMechanicHandler('extra_turn');
    expect(handler).toBeDefined();
  });

  it('extra_turn action 应设置 extraTurnPlayer', () => {
    const state = createMockState();
    const result = GameSequenceExecutor.applyAction(state, {
      type: 'EXTRA_TURN',
      target: 'player',
    });
    expect(result.state.extraTurnPlayer).toBe('player');
  });

  it('extra_turn 可以设置给对手', () => {
    const state = createMockState();
    const result = GameSequenceExecutor.applyAction(state, {
      type: 'EXTRA_TURN',
      target: 'opponent',
    });
    expect(result.state.extraTurnPlayer).toBe('opponent');
  });

  it('extra_turn 被反制时不应生效', () => {
    const handler = getMechanicHandler('extra_turn')!;
    const state = createMockState();
    const spell = getSpellById('time_warp');
    const actions = handler(state, 'player', spell, true, false);
    expect(actions).toHaveLength(0);
  });
});

describe('Copy Spell Mechanic', () => {
  it('应该有 copy_spell 机制处理器', () => {
    const handler = getMechanicHandler('copy_spell');
    expect(handler).toBeDefined();
  });

  it('copy_spell 应将对手上一个法术加入手牌', () => {
    const state = createMockState({ opponentLastSpell: 'fire' });
    const result = GameSequenceExecutor.applyAction(state, {
      type: 'COPY_SPELL',
      target: 'player',
      value: 'fire',
    });
    expect(result.state.playerHand).toContain('fire');
  });

  it('没有上一个法术时给出提示', () => {
    const handler = getMechanicHandler('copy_spell')!;
    const state = createMockState({ opponentLastSpell: null });
    const spell = getSpellById('mirror_image');
    const actions = handler(state, 'player', spell, false, false);
    expect(actions).toHaveLength(1);
    expect(actions[0].description).toContain('失败');
  });

  it('对手的 lastSpell 是 skip 时也应失败', () => {
    const handler = getMechanicHandler('copy_spell')!;
    const state = createMockState({ opponentLastSpell: 'skip' });
    const spell = getSpellById('mirror_image');
    const actions = handler(state, 'player', spell, false, false);
    expect(actions).toHaveLength(1);
    expect(actions[0].description).toContain('失败');
  });
});

describe('Mana Ramp Mechanic', () => {
  it('应该有 mana_ramp 机制处理器', () => {
    const handler = getMechanicHandler('mana_ramp');
    expect(handler).toBeDefined();
  });

  it('mana_ramp 应增加玩家最大法力值', () => {
    const state = createMockState({ playerMaxMana: 5, playerMana: 5 });
    const result = GameSequenceExecutor.applyAction(state, {
      type: 'MANA_RAMP',
      target: 'player',
      value: 1,
    });
    expect(result.state.playerMaxMana).toBe(6);
    expect(result.state.playerMana).toBe(6);
  });

  it('最大法力值不应超过 10', () => {
    const state = createMockState({ playerMaxMana: 10, playerMana: 10 });
    const result = GameSequenceExecutor.applyAction(state, {
      type: 'MANA_RAMP',
      target: 'player',
      value: 1,
    });
    expect(result.state.playerMaxMana).toBe(10);
  });

  it('对手也可以获得法力加速', () => {
    const state = createMockState({ opponentMaxMana: 4, opponentMana: 4 });
    const result = GameSequenceExecutor.applyAction(state, {
      type: 'MANA_RAMP',
      target: 'opponent',
      value: 1,
    });
    expect(result.state.opponentMaxMana).toBe(5);
    expect(result.state.opponentMana).toBe(5);
  });

  it('mana_ramp 被反制时不应生效', () => {
    const handler = getMechanicHandler('mana_ramp')!;
    const state = createMockState();
    const spell = getSpellById('mana_battery');
    const actions = handler(state, 'player', spell, true, false);
    expect(actions).toHaveLength(0);
  });
});
