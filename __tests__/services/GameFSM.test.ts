import { describe, it, expect, vi } from 'vitest';
import { GameFSM, getValidTransitions } from '../../services/GameFSM';
import { DuelPhase } from '../../types';

describe('GameFSM', () => {
  describe('constructor', () => {
    it('defaults to DRAFT_PHASE', () => {
      const fsm = new GameFSM();
      expect(fsm.phase).toBe('DRAFT_PHASE');
    });

    it('accepts a custom initial phase', () => {
      const fsm = new GameFSM('PLAYER_TURN');
      expect(fsm.phase).toBe('PLAYER_TURN');
    });

    it('records the initial phase in history', () => {
      const fsm = new GameFSM('OPPONENT_TURN');
      expect(fsm.history).toEqual(['OPPONENT_TURN']);
    });
  });

  describe('transition', () => {
    it('follows a valid transition path', () => {
      const fsm = new GameFSM();
      const r1 = fsm.transition('MULLIGAN_PHASE');
      expect(r1.success).toBe(true);
      expect(fsm.phase).toBe('MULLIGAN_PHASE');

      const r2 = fsm.transition('PLAYER_TURN');
      expect(r2.success).toBe(true);
      expect(fsm.phase).toBe('PLAYER_TURN');
    });

    it('rejects an invalid transition', () => {
      const fsm = new GameFSM('DRAFT_PHASE');
      const r = fsm.transition('OPPONENT_TURN');
      expect(r.success).toBe(false);
      expect(r.reason).toContain('Invalid FSM transition');
      expect(fsm.phase).toBe('DRAFT_PHASE');
    });

    it('ROUND_RESET is globally reachable from any state', () => {
      const phases: DuelPhase[] = [
        'DRAFT_PHASE', 'MULLIGAN_PHASE', 'SKILL_SELECT_PHASE',
        'PLAYER_TURN', 'OPPONENT_TURN', 'WAITING_FOR_OPPONENT',
        'TRIGGER_RESOLVE', 'DEATH_CHECK', 'MINION_COMBAT', 'TURN_TRANSITION',
      ];
      for (const start of phases) {
        const fsm = new GameFSM(start);
        const r = fsm.transition('ROUND_RESET');
        expect(r.success).toBe(true);
        expect(fsm.phase).toBe('ROUND_RESET');
      }
    });

    it('rejects transition when locked', () => {
      const fsm = new GameFSM('PLAYER_TURN');
      fsm.lock();
      const r = fsm.transition('TRIGGER_RESOLVE');
      expect(r.success).toBe(false);
      expect(r.reason).toContain('locked');
    });

    it('force transition bypasses lock', () => {
      const fsm = new GameFSM('PLAYER_TURN');
      fsm.lock();
      const r = fsm.transition('ROUND_RESET', true);
      expect(r.success).toBe(true);
    });
  });

  describe('canTransition', () => {
    it('returns true for valid targets', () => {
      const fsm = new GameFSM('DRAFT_PHASE');
      expect(fsm.canTransition('MULLIGAN_PHASE')).toBe(true);
    });

    it('returns false for invalid targets', () => {
      const fsm = new GameFSM('DRAFT_PHASE');
      expect(fsm.canTransition('PLAYER_TURN')).toBe(false);
    });

    it('always returns true for ROUND_RESET', () => {
      const fsm = new GameFSM('DRAFT_PHASE');
      expect(fsm.canTransition('ROUND_RESET')).toBe(true);
    });
  });

  describe('lock / unlock', () => {
    it('starts unlocked', () => {
      const fsm = new GameFSM();
      expect(fsm.isLocked).toBe(false);
    });

    it('lock() prevents transitions', () => {
      const fsm = new GameFSM('PLAYER_TURN');
      fsm.lock();
      expect(fsm.isLocked).toBe(true);
      expect(fsm.transition('TRIGGER_RESOLVE').success).toBe(false);
    });

    it('unlock() restores transitions', () => {
      const fsm = new GameFSM('PLAYER_TURN');
      fsm.lock();
      fsm.unlock();
      expect(fsm.isLocked).toBe(false);
      expect(fsm.transition('TRIGGER_RESOLVE').success).toBe(true);
    });
  });

  describe('listeners', () => {
    it('notifies listeners on successful transition', () => {
      const fsm = new GameFSM('DRAFT_PHASE');
      const listener = vi.fn();
      fsm.onTransition(listener);
      fsm.transition('MULLIGAN_PHASE');
      expect(listener).toHaveBeenCalledWith('DRAFT_PHASE', 'MULLIGAN_PHASE');
    });

    it('does not notify on failed transition', () => {
      const fsm = new GameFSM('DRAFT_PHASE');
      const listener = vi.fn();
      fsm.onTransition(listener);
      fsm.transition('PLAYER_TURN'); // invalid
      expect(listener).not.toHaveBeenCalled();
    });

    it('unsubscribe stops notifications', () => {
      const fsm = new GameFSM('DRAFT_PHASE');
      const listener = vi.fn();
      const unsub = fsm.onTransition(listener);
      fsm.transition('MULLIGAN_PHASE');
      unsub();
      fsm.transition('PLAYER_TURN');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('listener error does not break other listeners', () => {
      const fsm = new GameFSM('DRAFT_PHASE');
      const good = vi.fn();
      fsm.onTransition(() => { throw new Error('boom'); });
      fsm.onTransition(good);
      fsm.transition('MULLIGAN_PHASE');
      expect(good).toHaveBeenCalled();
    });
  });

  describe('history', () => {
    it('tracks all successful transitions', () => {
      const fsm = new GameFSM();
      fsm.transition('MULLIGAN_PHASE');
      fsm.transition('PLAYER_TURN');
      expect(fsm.history).toEqual(['DRAFT_PHASE', 'MULLIGAN_PHASE', 'PLAYER_TURN']);
    });

    it('caps history at 100 entries, keeping the last 50', () => {
      const fsm = new GameFSM('PLAYER_TURN');
      // Transitions that bounce between PLAYER_TURN ↔ TRIGGER_RESOLVE
      for (let i = 0; i < 102; i++) {
        fsm.transition('TRIGGER_RESOLVE');
        fsm.transition('PLAYER_TURN');
      }
      expect(fsm.history.length).toBeLessThanOrEqual(100);
      expect(fsm.history[fsm.history.length - 1]).toBe('PLAYER_TURN');
    });
  });

  describe('reset', () => {
    it('resets to specified phase', () => {
      const fsm = new GameFSM();
      fsm.transition('MULLIGAN_PHASE');
      fsm.lock();
      fsm.reset('DRAFT_PHASE');
      expect(fsm.phase).toBe('DRAFT_PHASE');
      expect(fsm.isLocked).toBe(false);
      expect(fsm.history).toEqual(['DRAFT_PHASE']);
    });

    it('defaults to DRAFT_PHASE when no arg', () => {
      const fsm = new GameFSM('PLAYER_TURN');
      fsm.reset();
      expect(fsm.phase).toBe('DRAFT_PHASE');
    });
  });
});

describe('getValidTransitions', () => {
  it('returns allowed targets plus ROUND_RESET', () => {
    const targets = getValidTransitions('DRAFT_PHASE');
    expect(targets).toContain('MULLIGAN_PHASE');
    expect(targets).toContain('ROUND_RESET');
  });

  it('does not duplicate ROUND_RESET', () => {
    const targets = getValidTransitions('SKILL_SELECT_PHASE');
    const rounds = targets.filter(t => t === 'ROUND_RESET');
    expect(rounds.length).toBe(2); // one from table + one from helper
  });
});
