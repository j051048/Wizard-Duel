/**
 * ReplayValidator — 赛后回放验证引擎
 *
 * 利用确定性 RNG 架构，用相同的 seed + actionLog 回放一局对战，
 * 对比最终 stateHash 来检测客户端篡改。
 *
 * 流程：
 * 1. 客户端出牌时记录 actionLog（每一步的 actor + action + spellId）
 * 2. 战斗结束后，双方提交 actionLog + seed + finalHash
 * 3. 服务端用 ReplayValidator.replay() 重放，对比 hash
 *
 * 前端集成点：useGameLoop 中记录 actionLog，游戏结束时提交
 */

import { DuelState, SpellType } from '../types';
import { getSpellById, executeSpell } from './gameLogic';
import { createInitialDuelState } from './gameLogic';

// ============ Types ============

export interface ReplayAction {
  turn: number;
  actor: 'player1' | 'player2';
  action: 'PLAY_CARD' | 'END_TURN' | 'MULLIGAN' | 'SELECT_SKILL' | 'HERO_SKILL';
  spellId?: SpellType;
  targetIndex?: number;
  mulliganIndices?: number[];
  skillId?: string;
}

export interface ReplayLog {
  actions: ReplayAction[];
  seed: number;
  player1Deck: SpellType[];
  player2Deck: SpellType[];
  player1HeroSkill?: string;
  player2HeroSkill?: string;
}

export interface ReplayResult {
  valid: boolean;
  finalStateHash: string;
  expectedHash?: string;
  mismatchAt?: number; // Turn where hashes diverged
  error?: string;
}

// ============ Hash Utility ============

/**
 * Generate a deterministic hash of the duel state.
 * Uses only gameplay-relevant fields (not UI state).
 */
export const hashDuelState = (state: DuelState): string => {
  const relevantData = [
    state.playerHP,
    state.opponentHP,
    state.playerArmor,
    state.opponentArmor,
    state.playerMana,
    state.opponentMana,
    state.playerMaxMana,
    state.opponentMaxMana,
    state.playerHand.length,
    state.opponentHand.length,
    state.roundNumber,
    state.playerMinions.map(m => `${m.id}:${m.hp}`).join(','),
    state.opponentMinions.map(m => `${m.id}:${m.hp}`).join(','),
    state.playerEffects.map(e => `${e.type}:${e.duration}`).join(','),
    state.opponentEffects.map(e => `${e.type}:${e.duration}`).join(','),
  ].join('|');

  // Simple deterministic hash (djb2)
  let hash = 5381;
  for (let i = 0; i < relevantData.length; i++) {
    hash = ((hash << 5) + hash + relevantData.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
};

// ============ Replay Engine ============

/**
 * Replay a match from scratch using the provided log.
 * Returns the final state hash for comparison.
 */
export const replayMatch = (log: ReplayLog): ReplayResult => {
  try {
    // Create initial state with the same seed
    let state = createInitialDuelState(
      log.player1Deck,
      'standard',
      log.seed
    );

    if (log.player1HeroSkill) {
      state = { ...state, selectedHeroSkill: log.player1HeroSkill };
    }
    if (log.player2HeroSkill) {
      state = { ...state, opponentSelectedHeroSkill: log.player2HeroSkill };
    }

    // Process mulligan phase
    const mulliganActions = log.actions.filter(a => a.action === 'MULLIGAN');
    for (const mulligan of mulliganActions) {
      // Mulligan logic would be applied here
      // For now, we just skip mulligan in replay (deck order is pre-determined by seed)
    }

    // Replay each action
    let currentTurn = 1;
    let currentActor: 'player1' | 'player2' = 'player1';

    for (let i = 0; i < log.actions.length; i++) {
      const action = log.actions[i];

      if (action.action === 'MULLIGAN') continue; // Already handled

      if (action.action === 'END_TURN') {
        currentActor = currentActor === 'player1' ? 'player2' : 'player1';
        if (currentActor === 'player1') {
          currentTurn++;
        }
        continue;
      }

      if (action.action === 'PLAY_CARD' && action.spellId) {
        const caster = action.actor === 'player1' ? 'player' : 'opponent';
        const result = executeSpell(state, caster, action.spellId);
        state = result.newState;
      }

      // Check for game over after each action
      if (state.playerHP <= 0 || state.opponentHP <= 0) {
        break;
      }
    }

    const finalHash = hashDuelState(state);

    return {
      valid: true,
      finalStateHash: finalHash,
    };
  } catch (err) {
    return {
      valid: false,
      finalStateHash: '',
      error: err instanceof Error ? err.message : 'Unknown replay error',
    };
  }
};

/**
 * Validate a match result by replaying and comparing hashes.
 */
export const validateMatch = (
  log: ReplayLog,
  expectedHash: string
): ReplayResult => {
  const result = replayMatch(log);

  if (!result.valid) {
    return result;
  }

  if (result.finalStateHash !== expectedHash) {
    return {
      valid: false,
      finalStateHash: result.finalStateHash,
      expectedHash,
      error: 'State hash mismatch — possible client tampering',
    };
  }

  return {
    valid: true,
    finalStateHash: result.finalStateHash,
  };
};

// ============ Action Log Builder ============

/**
 * Helper to build action log entries during gameplay.
 * Used by useGameLoop to record each player action.
 */
export class ActionLogBuilder {
  private actions: ReplayAction[] = [];
  private currentTurn = 1;

  logPlayCard(actor: 'player1' | 'player2', spellId: SpellType, targetIndex?: number) {
    this.actions.push({
      turn: this.currentTurn,
      actor,
      action: 'PLAY_CARD',
      spellId,
      targetIndex,
    });
  }

  logEndTurn(actor: 'player1' | 'player2') {
    this.actions.push({
      turn: this.currentTurn,
      actor,
      action: 'END_TURN',
    });
    if (actor === 'player2') {
      this.currentTurn++;
    }
  }

  logMulligan(actor: 'player1' | 'player2', indices: number[]) {
    this.actions.push({
      turn: 0,
      actor,
      action: 'MULLIGAN',
      mulliganIndices: indices,
    });
  }

  logHeroSkill(actor: 'player1' | 'player2', skillId: string) {
    this.actions.push({
      turn: this.currentTurn,
      actor,
      action: 'HERO_SKILL',
      skillId,
    });
  }

  getActions(): ReplayAction[] {
    return [...this.actions];
  }

  reset() {
    this.actions = [];
    this.currentTurn = 1;
  }
}
