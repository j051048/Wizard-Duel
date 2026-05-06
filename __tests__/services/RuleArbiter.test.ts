import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuleArbiter } from '../../services/RuleArbiter';
import { DuelState, StatusEffect } from '../../types';

// Mock dependencies
vi.mock('../../services/gameLogic', () => ({
  checkGameOver: vi.fn(() => null),
  drawCard: vi.fn((deck, hand, fatigue) => ({
    newDeck: deck.slice(1),
    newHand: [...hand, deck[0]],
    drawnCard: deck[0] ?? null,
    newFatigue: deck.length === 0 ? fatigue + 1 : fatigue,
    fatigueDamage: deck.length === 0 ? fatigue + 1 : 0,
  })),
}));

vi.mock('../../services/sequence', () => ({
  GameSequenceExecutor: {
    resolveTriggers: vi.fn((state) => state),
    resolveDeathFrame: vi.fn((state) => ({ state, logs: [] })),
  },
}));

vi.mock('../../utils/seededRandom', () => ({
  getGameRNG: () => ({ serialize: () => ({ seed: 1 }) }),
}));

const createMockState = (overrides: Partial<DuelState> = {}): DuelState => ({
  playerHP: 30, playerArmor: 0,
  opponentHP: 30, opponentArmor: 0,
  playerMana: 5, playerMaxMana: 5,
  opponentMana: 5, opponentMaxMana: 5,
  playerHand: ['fire' as any], playerDeck: ['ice' as any, 'thunder' as any],
  opponentHand: ['ice' as any], opponentHandSize: 1,
  opponentDeck: ['rock' as any, 'wind' as any],
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
  ...overrides,
});

describe('RuleArbiter', () => {
  describe('resolveRoundStart', () => {
    it('increments round number', () => {
      const state = createMockState({ roundNumber: 3 });
      const result = RuleArbiter.resolveRoundStart(state);
      expect(result.newState.roundNumber).toBe(4);
    });

    it('restores mana to max (capped at 10)', () => {
      const state = createMockState({ playerMaxMana: 9, opponentMaxMana: 10 });
      const result = RuleArbiter.resolveRoundStart(state);
      expect(result.newState.playerMaxMana).toBe(10);
      expect(result.newState.playerMana).toBe(10);
      expect(result.newState.opponentMaxMana).toBe(10);
      expect(result.newState.opponentMana).toBe(10);
    });

    it('resets hero skill flags', () => {
      const state = createMockState({ heroSkillsUsed: true, opponentHeroSkillUsed: true });
      const result = RuleArbiter.resolveRoundStart(state);
      expect(result.newState.heroSkillsUsed).toBe(false);
      expect(result.newState.opponentHeroSkillUsed).toBe(false);
    });

    it('unexhausts minions', () => {
      const state = createMockState({
        playerMinions: [{ instanceId: 'm1', exhausted: true } as any],
        opponentMinions: [{ instanceId: 'm2', exhausted: true } as any],
      });
      const result = RuleArbiter.resolveRoundStart(state);
      expect(result.newState.playerMinions[0].exhausted).toBe(false);
      expect(result.newState.opponentMinions[0].exhausted).toBe(false);
    });

    it('returns no gameOver when both players alive', () => {
      const result = RuleArbiter.resolveRoundStart(createMockState());
      expect(result.gameOver).toBeNull();
    });

    it('emits ROUND_START and MANA_RESTORE events', () => {
      const result = RuleArbiter.resolveRoundStart(createMockState());
      const types = result.events.map(e => e.type);
      expect(types).toContain('ROUND_START');
      expect(types).toContain('MANA_RESTORE');
    });

    it('does not mutate the original state', () => {
      const state = createMockState({ roundNumber: 1, playerMaxMana: 5 });
      RuleArbiter.resolveRoundStart(state);
      expect(state.roundNumber).toBe(1);
      expect(state.playerMaxMana).toBe(5);
    });
  });

  describe('resolveRoundEnd', () => {
    it('applies burn damage to player', () => {
      const state = createMockState({
        playerHP: 20,
        playerEffects: [{ type: 'burn', duration: 2, value: 3 }],
      });
      const result = RuleArbiter.resolveRoundEnd(state);
      expect(result.newState.playerHP).toBe(17);
      expect(result.events.some(e => e.type === 'DAMAGE' && e.target === 'player' && e.value === 3)).toBe(true);
    });

    it('applies burn damage to opponent', () => {
      const state = createMockState({
        opponentHP: 15,
        opponentEffects: [{ type: 'burn', duration: 1, value: 5 }],
      });
      const result = RuleArbiter.resolveRoundEnd(state);
      expect(result.newState.opponentHP).toBe(10);
    });

    it('decrements effect duration and removes expired effects', () => {
      const state = createMockState({
        playerEffects: [
          { type: 'burn', duration: 2, value: 1 },
          { type: 'frozen', duration: 1 },
        ],
      });
      const result = RuleArbiter.resolveRoundEnd(state);
      // burn: duration 2→1 (kept), frozen: duration 1→0 (removed)
      expect(result.newState.playerEffects).toHaveLength(2); // burn + thawed from frozen expiry
      expect(result.newState.playerEffects[0]).toMatchObject({ type: 'burn', duration: 1 });
    });

    it('adds thawed effect when frozen expires (and no existing thawed)', () => {
      const state = createMockState({
        opponentEffects: [{ type: 'frozen', duration: 1 }],
      });
      const result = RuleArbiter.resolveRoundEnd(state);
      const thawed = result.newState.opponentEffects.find(e => e.type === 'thawed');
      expect(thawed).toBeDefined();
      expect(thawed!.duration).toBe(2);
    });

    it('does not add duplicate thawed if one already exists', () => {
      const state = createMockState({
        playerEffects: [
          { type: 'frozen', duration: 1 },
          { type: 'thawed', duration: 1 },
        ],
      });
      const result = RuleArbiter.resolveRoundEnd(state);
      const thaweds = result.newState.playerEffects.filter(e => e.type === 'thawed');
      // frozen expires → thawed check: some existing thawed? yes → no new thawed added
      // existing thawed expires (duration 1→0) → removed
      // So total thawed count should be 0
      expect(thaweds).toHaveLength(0);
    });

    it('returns no gameOver when no one dies from burn', () => {
      const result = RuleArbiter.resolveRoundEnd(createMockState({
        playerEffects: [{ type: 'burn', duration: 1, value: 2 }],
      }));
      expect(result.gameOver).toBeNull();
    });

    it('returns early with no events when no effects exist', () => {
      const result = RuleArbiter.resolveRoundEnd(createMockState());
      expect(result.events).toHaveLength(0);
      expect(result.gameOver).toBeNull();
    });

    it('does not reduce HP below 0 from burn', () => {
      const state = createMockState({
        playerHP: 2,
        playerEffects: [{ type: 'burn', duration: 1, value: 10 }],
      });
      const result = RuleArbiter.resolveRoundEnd(state);
      expect(result.newState.playerHP).toBe(0);
    });

    it('emits EFFECT_EXPIRE event when an effect expires', () => {
      const state = createMockState({
        playerEffects: [{ type: 'tangle', duration: 1, value: 1 }],
      });
      const result = RuleArbiter.resolveRoundEnd(state);
      expect(result.events.some(e => e.type === 'EFFECT_EXPIRE')).toBe(true);
    });
  });
});
