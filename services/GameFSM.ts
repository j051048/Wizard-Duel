/**
 * GameFSM - 有限状态机（Finite State Machine）
 * 
 * [P0 Fix #1] 用严格的状态转移表替代散乱的 setPhase 调用。
 * 
 * 状态转移图：
 * 
 *   DRAFT_PHASE ──► MULLIGAN_PHASE ──► PLAYER_TURN
 *                                         │
 *                    ┌────────────────────┘
 *                    ▼
 *   PLAYER_TURN ──► TRIGGER_RESOLVE ──► DEATH_CHECK ──► OPPONENT_TURN
 *                                                           │
 *                    ┌──────────────────────────────────────┘
 *                    ▼
 *   OPPONENT_TURN ──► TRIGGER_RESOLVE ──► DEATH_CHECK ──► MINION_COMBAT
 *                                                           │
 *                    ┌──────────────────────────────────────┘
 *                    ▼
 *   MINION_COMBAT ──► DEATH_CHECK ──► TURN_TRANSITION ──► PLAYER_TURN
 *                                          │
 *                                          ▼
 *                                     ROUND_RESET (game over)
 * 
 * Any state ──► ROUND_RESET (on game over)
 */

import { DuelPhase } from '../types';

/** 定义合法的状态转移 */
const VALID_TRANSITIONS: Record<DuelPhase, DuelPhase[]> = {
  'DRAFT_PHASE': ['MULLIGAN_PHASE'],
  'MULLIGAN_PHASE': ['PLAYER_TURN', 'TURN_TRANSITION'],
  'PLAYER_TURN': ['TRIGGER_RESOLVE', 'DEATH_CHECK', 'OPPONENT_TURN', 'ROUND_RESET', 'TURN_TRANSITION'],
  'OPPONENT_TURN': ['TRIGGER_RESOLVE', 'DEATH_CHECK', 'MINION_COMBAT', 'ROUND_RESET', 'TURN_TRANSITION'],
  'TRIGGER_RESOLVE': ['DEATH_CHECK', 'PLAYER_TURN', 'OPPONENT_TURN', 'MINION_COMBAT', 'ROUND_RESET'],
  'DEATH_CHECK': ['PLAYER_TURN', 'OPPONENT_TURN', 'MINION_COMBAT', 'TURN_TRANSITION', 'ROUND_RESET'],
  'MINION_COMBAT': ['DEATH_CHECK', 'TURN_TRANSITION', 'ROUND_RESET'],
  'TURN_TRANSITION': ['PLAYER_TURN', 'ROUND_RESET'],
  'ROUND_RESET': ['DRAFT_PHASE'], // 只有从结果界面返回时才能回到初始
};

export interface FSMTransitionResult {
  success: boolean;
  from: DuelPhase;
  to: DuelPhase;
  reason?: string;
}

export type FSMListener = (from: DuelPhase, to: DuelPhase) => void;

/**
 * GameFSM 实例
 * 
 * 用法：
 *   const fsm = new GameFSM('DRAFT_PHASE');
 *   const result = fsm.transition('MULLIGAN_PHASE');
 *   if (!result.success) console.error(result.reason);
 */
export class GameFSM {
  private _currentPhase: DuelPhase;
  private _listeners: FSMListener[] = [];
  private _history: DuelPhase[] = [];
  private _locked: boolean = false;

  constructor(initialPhase: DuelPhase = 'DRAFT_PHASE') {
    this._currentPhase = initialPhase;
    this._history = [initialPhase];
  }

  /** 获取当前阶段 */
  get phase(): DuelPhase {
    return this._currentPhase;
  }

  /** 获取状态历史 */
  get history(): readonly DuelPhase[] {
    return this._history;
  }

  /** 状态机是否被锁定（动画播放中） */
  get isLocked(): boolean {
    return this._locked;
  }

  /**
   * 尝试进行状态转移
   * @returns 转移结果，包含是否成功及原因
   */
  transition(to: DuelPhase, force: boolean = false): FSMTransitionResult {
    const from = this._currentPhase;

    // 锁定检查（除非强制）
    if (this._locked && !force) {
      return {
        success: false,
        from,
        to,
        reason: `FSM is locked (processing animation/logic). Current: ${from}, Attempted: ${to}`,
      };
    }

    // ROUND_RESET 是全局可达的（游戏结束）
    if (to === 'ROUND_RESET') {
      this._applyTransition(from, to);
      return { success: true, from, to };
    }

    // 合法性检查
    const allowedTargets = VALID_TRANSITIONS[from];
    if (!allowedTargets || !allowedTargets.includes(to)) {
      const msg = `Invalid FSM transition: ${from} → ${to}. Allowed: [${allowedTargets?.join(', ') || 'none'}]`;
      console.warn(`[GameFSM] ${msg}`);
      return { success: false, from, to, reason: msg };
    }

    this._applyTransition(from, to);
    return { success: true, from, to };
  }

  /**
   * 检查目标状态是否可达
   */
  canTransition(to: DuelPhase): boolean {
    if (to === 'ROUND_RESET') return true;
    const allowed = VALID_TRANSITIONS[this._currentPhase];
    return allowed?.includes(to) ?? false;
  }

  /**
   * 锁定状态机（防止动画播放时的非法转移）
   */
  lock(): void {
    this._locked = true;
  }

  /**
   * 解锁状态机
   */
  unlock(): void {
    this._locked = false;
  }

  /**
   * 注册状态转移监听器
   */
  onTransition(listener: FSMListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  /**
   * 强制重置到指定状态（仅用于初始化/恢复）
   */
  reset(phase: DuelPhase = 'DRAFT_PHASE'): void {
    this._currentPhase = phase;
    this._history = [phase];
    this._locked = false;
  }

  private _applyTransition(from: DuelPhase, to: DuelPhase): void {
    this._currentPhase = to;
    this._history.push(to);
    // 限制历史长度避免内存泄漏
    if (this._history.length > 100) {
      this._history = this._history.slice(-50);
    }
    // 通知监听器
    for (const listener of this._listeners) {
      try {
        listener(from, to);
      } catch (e) {
        console.error('[GameFSM] Listener error:', e);
      }
    }
  }
}

/**
 * 获取某个阶段的所有合法目标状态（用于调试/UI）
 */
export function getValidTransitions(from: DuelPhase): DuelPhase[] {
  return [...(VALID_TRANSITIONS[from] || []), 'ROUND_RESET'];
}