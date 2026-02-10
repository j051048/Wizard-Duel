/**
 * OptimisticUpdate - 弱网预判渲染
 * 
 * [P3 Fix #30] 在网络波动时，先播放 UI 确认动画，
 * 后台再同步完成结算，消除"卡顿感"。
 * 
 * 设计模式：
 * 1. 用户操作 -> 立即显示 UI 反馈（乐观更新）
 * 2. 后台异步发送操作到引擎/服务端
 * 3. 收到确认 -> 对比状态是否一致
 * 4. 如果不一致 -> 回滚到服务端状态并播放修正动画
 */

import { DuelState, SpellType } from '../types';
import { cloneDuelState } from './stateUtils';

export interface OptimisticAction {
  id: string;
  type: 'PLAY_CARD' | 'END_TURN' | 'HERO_SKILL';
  payload: any;
  timestamp: number;
  /** 乐观预测的状态 */
  predictedState: DuelState;
  /** 操作前的状态（用于回滚） */
  rollbackState: DuelState;
  /** 是否已被服务端确认 */
  confirmed: boolean;
}

class OptimisticUpdateManager {
  private _pendingActions: OptimisticAction[] = [];
  private _isOnline: boolean = true;
  private _latency: number = 0;
  private _onRollback: ((state: DuelState) => void) | null = null;

  /** 当前是否有未确认的操作 */
  get hasPending(): boolean {
    return this._pendingActions.length > 0;
  }

  /** 未确认操作数量 */
  get pendingCount(): number {
    return this._pendingActions.length;
  }

  /** 当前网络延迟估计 */
  get latency(): number {
    return this._latency;
  }

  /** 是否处于弱网状态（延迟 > 500ms 或有 3+ 未确认操作） */
  get isWeakNetwork(): boolean {
    return this._latency > 500 || this._pendingActions.length >= 3;
  }

  /**
   * 初始化：监听网络状态
   */
  init(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this._isOnline = true;
      console.log('[OptimisticUpdate] Network: online');
    });

    window.addEventListener('offline', () => {
      this._isOnline = false;
      console.warn('[OptimisticUpdate] Network: offline');
    });

    this._isOnline = navigator.onLine;
  }

  /**
   * 设置回滚回调
   */
  onRollback(callback: (state: DuelState) => void): void {
    this._onRollback = callback;
  }

  /**
   * 更新网络延迟估计
   */
  updateLatency(ms: number): void {
    // 指数移动平均
    this._latency = this._latency * 0.7 + ms * 0.3;
  }

  /**
   * 提交一个乐观操作
   */
  submit(
    currentState: DuelState,
    predictedState: DuelState,
    type: OptimisticAction['type'],
    payload: any
  ): string {
    const id = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    this._pendingActions.push({
      id,
      type,
      payload,
      timestamp: Date.now(),
      predictedState: cloneDuelState(predictedState),
      rollbackState: cloneDuelState(currentState),
      confirmed: false,
    });

    this._cleanupStale();
    return id;
  }

  /**
   * 服务端确认操作
   */
  confirm(actionId: string, serverState: DuelState): { needsCorrection: boolean } {
    const actionIdx = this._pendingActions.findIndex(a => a.id === actionId);
    if (actionIdx === -1) {
      return { needsCorrection: false };
    }

    const action = this._pendingActions[actionIdx];
    action.confirmed = true;

    const needsCorrection = !this._statesMatch(action.predictedState, serverState);

    if (needsCorrection) {
      console.warn('[OptimisticUpdate] State mismatch, correcting...', {
        predicted: { hp: action.predictedState.playerHP, mana: action.predictedState.playerMana },
        server: { hp: serverState.playerHP, mana: serverState.playerMana },
      });

      if (this._onRollback) {
        this._onRollback(serverState);
      }
    }

    this._pendingActions.splice(actionIdx, 1);
    return { needsCorrection };
  }

  /**
   * 回滚最近的未确认操作
   */
  rollbackLast(): DuelState | null {
    if (this._pendingActions.length === 0) return null;
    const last = this._pendingActions.pop()!;
    console.warn('[OptimisticUpdate] Rolling back:', last.id);
    return last.rollbackState;
  }

  /**
   * 清除所有待处理操作
   */
  clear(): void {
    this._pendingActions = [];
  }

  // ============ 内部方法 ============

  private _statesMatch(a: DuelState, b: DuelState): boolean {
    return (
      a.playerHP === b.playerHP &&
      a.opponentHP === b.opponentHP &&
      a.playerMana === b.playerMana &&
      a.opponentMana === b.opponentMana &&
      a.playerArmor === b.playerArmor &&
      a.opponentArmor === b.opponentArmor &&
      a.playerHand.length === b.playerHand.length &&
      a.roundNumber === b.roundNumber
    );
  }

  private _cleanupStale(): void {
    const now = Date.now();
    const STALE_THRESHOLD = 30000;
    this._pendingActions = this._pendingActions.filter(a => {
      if (now - a.timestamp > STALE_THRESHOLD && !a.confirmed) {
        console.warn('[OptimisticUpdate] Stale action removed:', a.id);
        return false;
      }
      return true;
    });
  }
}

export const optimisticUpdater = new OptimisticUpdateManager();
export default optimisticUpdater;