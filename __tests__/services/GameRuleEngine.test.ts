import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameRuleEngine } from '../../services/GameRuleEngine';
import { DuelState } from '../../types';

// Mock gameLogic - use `as any` to allow flexible return types in tests
const mockExecuteSpell = vi.fn() as any;
const mockExecuteSpellWithTarget = vi.fn() as any;
const mockCheckGameOver = vi.fn(() => null) as any;
const mockExecuteAITurn = vi.fn() as any;

vi.mock('../../services/gameLogic', () => ({
  executeSpell: (...args: any[]) => mockExecuteSpell(...args),
  executeSpellWithTarget: (...args: any[]) => mockExecuteSpellWithTarget(...args),
  checkGameOver: (...args: any[]) => mockCheckGameOver(...args),
  executeAITurn: (...args: any[]) => mockExecuteAITurn(...args),
}));

vi.mock('../../services/sequence', () => ({
  GameSequenceExecutor: {
    applyAction: vi.fn((state: any, _action: any) => ({ state, log: null })),
    resolveDeathFrame: vi.fn((state: any) => ({ state, logs: [] })),
    resolveTriggers: vi.fn((state: any) => state),
  },
}));

vi.mock('../../utils/seededRandom', () => ({
  getGameRNG: () => ({ serialize: () => ({ seed: 1 }) }),
}));

vi.mock('../../config/timing', () => ({
  MINION_ATTACK_DELAY: 200,
  MINION_COMBAT_START_DELAY: 400,
}));

const createMockState = (overrides: Partial<DuelState> = {}): DuelState => ({
  playerHP: 30, playerArmor: 0,
  opponentHP: 30, opponentArmor: 0,
  playerMana: 5, playerMaxMana: 5,
  opponentMana: 5, opponentMaxMana: 5,
  playerHand: ['fire' as any, 'ice' as any], playerDeck: ['thunder' as any],
  opponentHand: ['ice' as any], opponentHandSize: 1,
  opponentDeck: ['rock' as any],
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

describe('GameRuleEngine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckGameOver.mockReturnValue(null);
  });

  describe('castSpell', () => {
    it('returns newState and commands for a valid cast', () => {
      const state = createMockState();
      mockExecuteSpell.mockReturnValue({
        newState: { ...state, opponentHP: 25 },
        logs: ['🔥 Fire hits for 5 damage'],
        command: {
          type: 'SPELL_CAST',
          actions: [{ type: 'DAMAGE', target: 'opponent', value: 5 }],
        },
      });

      const result = GameRuleEngine.castSpell(state, 'fire' as any, 'player');
      expect(result.newState).toBeDefined();
      expect(result.commands.length).toBeGreaterThan(0);
    });

    it('issues SET_PHASE + UPDATE_UI when game over is detected', () => {
      const state = createMockState();
      mockExecuteSpell.mockReturnValue({
        newState: { ...state, opponentHP: 0 },
        logs: ['💀 Fatal blow!'],
        command: { type: 'SPELL_CAST', actions: [{ type: 'DAMAGE', target: 'opponent', value: 30 }] },
      });
      mockCheckGameOver.mockReturnValue('WIN');

      const result = GameRuleEngine.castSpell(state, 'fire' as any, 'player');
      const cmdTypes = result.commands.map(c => c.type);
      expect(cmdTypes).toContain('SET_PHASE');
      expect(cmdTypes).toContain('UPDATE_UI');

      const uiCmd = result.commands.find(c => c.type === 'UPDATE_UI');
      expect(uiCmd?.payload).toMatchObject({
        isGameOver: true,
        gameResult: 'WIN',
      });
    });

    it('passes target option to executeSpellWithTarget', () => {
      const state = createMockState();
      mockExecuteSpellWithTarget.mockReturnValue({
        newState: state,
        logs: [],
        command: { type: 'SPELL_CAST', actions: [] },
      });

      GameRuleEngine.castSpell(state, 'fire' as any, 'player', {
        target: { type: 'minion', id: 'm1' },
      });
      expect(mockExecuteSpellWithTarget).toHaveBeenCalled();
      expect(mockExecuteSpell).not.toHaveBeenCalled();
    });

    it('preserves hand removal from postCastState', () => {
      const state = createMockState({ playerHand: ['fire' as any, 'ice' as any] });
      mockExecuteSpell.mockReturnValue({
        newState: { ...state, playerHand: ['ice' as any], playerLastSpell: 'fire' as any },
        logs: [],
        command: { type: 'SPELL_CAST', actions: [] },
      });

      const result = GameRuleEngine.castSpell(state, 'fire' as any, 'player');
      expect(result.newState.playerHand).toEqual(['ice' as any]);
      expect(result.newState.playerLastSpell).toBe('fire');
    });
  });

  describe('resolveMinionCombat', () => {
    it('returns early when no minions exist', () => {
      const state = createMockState();
      const result = GameRuleEngine.resolveMinionCombat(state);
      expect(result.finalState).toEqual(state);
      expect(result.commands).toHaveLength(0);
    });

    it('skips exhausted minions', () => {
      const state = createMockState({
        playerMinions: [{ instanceId: 'm1', exhausted: true } as any],
        opponentMinions: [{ instanceId: 'm2', exhausted: true } as any],
      });
      const result = GameRuleEngine.resolveMinionCombat(state);
      expect(result.commands).toHaveLength(0);
    });

    it('emits combat start message when active minions exist', () => {
      const state = createMockState({
        playerMinions: [{ instanceId: 'm1', exhausted: false, attack: 3, hp: 2 } as any],
      });
      const result = GameRuleEngine.resolveMinionCombat(state);
      expect(result.commands.some(c =>
        c.type === 'ADD_MESSAGE' && c.payload?.includes('随从进攻')
      )).toBe(true);
    });

    it('issues game over commands when checkGameOver triggers', () => {
      const state = createMockState({
        playerMinions: [{ instanceId: 'm1', exhausted: false, attack: 50, hp: 2 } as any],
      });
      mockCheckGameOver
        .mockReturnValueOnce(null)
        .mockReturnValueOnce('WIN');

      const result = GameRuleEngine.resolveMinionCombat(state);
      expect(result.commands.some(c =>
        c.type === 'UPDATE_UI' && c.payload?.isGameOver === true
      )).toBe(true);
      expect(result.commands.some(c =>
        c.type === 'SET_PHASE' && c.payload === 'ROUND_RESET'
      )).toBe(true);
    });
  });
});
