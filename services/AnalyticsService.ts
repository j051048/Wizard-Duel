/**
 * AnalyticsService — 客户端行为分析引擎
 *
 * 追踪玩家行为数据用于平衡调整和体验优化。
 * 数据存储在 localStorage，支持导出为 JSON 供服务端聚合。
 *
 * 核心指标：
 * - 卡牌使用率 / 胜率
 * - 元素偏好分布
 * - 回合时长分布
 * - 跨元素联动触发率
 * - 法力曲线效率
 */

import { SpellType } from '../types';

// ============ Event Types ============

export type AnalyticsEventType =
  | 'card_played'
  | 'card_won'         // 出这张牌后最终获胜
  | 'card_lost'        // 出这张牌后最终失败
  | 'synergy_triggered'
  | 'combo_triggered'
  | 'game_started'
  | 'game_ended'
  | 'turn_ended'
  | 'mulligan'
  | 'hero_skill_used';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface CardPlayEvent {
  spellId: SpellType;
  manaCost: number;
  roundNumber: number;
  wasCountered: boolean;
  damageDealt: number;
}

export interface GameEndEvent {
  result: 'WIN' | 'LOSS' | 'DRAW';
  totalRounds: number;
  durationMs: number;
  playerHP: number;
  opponentHP: number;
  deckElementDistribution: Record<string, number>;
}

export interface SynergyEvent {
  synergyId: string;
  fromElement: string;
  toElement: string;
  roundNumber: number;
}

// ============ Aggregated Stats ============

export interface CardStats {
  spellId: string;
  timesPlayed: number;
  timesWon: number;
  timesLost: number;
  totalDamageDealt: number;
  timesCountered: number;
  /** Win rate when this card is played (wins / total games where played) */
  winRate: number;
  /** Average damage per play */
  avgDamage: number;
  /** Counter rate (times countered / times played) */
  counterRate: number;
}

export interface SynergyStats {
  synergyId: string;
  triggerCount: number;
  /** Games where this synergy was available vs triggered */
  triggerRate: number;
}

export interface ElementDistribution {
  element: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

export interface BalanceReport {
  generatedAt: string;
  totalGames: number;
  overallWinRate: number;
  cardStats: CardStats[];
  synergyStats: SynergyStats[];
  elementDistribution: ElementDistribution[];
  overpoweredCards: string[];    // winRate > 60% and timesPlayed > 10
  underpoweredCards: string[];   // winRate < 35% and timesPlayed > 10
  avgGameDuration: number;
  avgRoundsPerGame: number;
}

// ============ Storage ============

const STORAGE_KEY = 'wizard_analytics';
const MAX_EVENTS = 2000; // Keep last N events

class AnalyticsServiceClass {
  private events: AnalyticsEvent[] = [];
  private loaded = false;

  private load() {
    if (this.loaded) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.events = JSON.parse(raw);
      }
    } catch {
      this.events = [];
    }
    this.loaded = true;
  }

  private save() {
    try {
      // Trim to max size
      if (this.events.length > MAX_EVENTS) {
        this.events = this.events.slice(-MAX_EVENTS);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      // localStorage full — drop oldest half
      this.events = this.events.slice(Math.floor(this.events.length / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
      } catch {
        // Give up silently
      }
    }
  }

  private push(type: AnalyticsEventType, data: Record<string, unknown>) {
    this.load();
    this.events.push({ type, timestamp: Date.now(), data });
    this.save();
  }

  // ============ Event Trackers ============

  trackCardPlayed(event: CardPlayEvent) {
    this.push('card_played', event as unknown as Record<string, unknown>);
  }

  trackGameEnd(event: GameEndEvent) {
    this.push('game_ended', event as unknown as Record<string, unknown>);
  }

  trackSynergyTriggered(event: SynergyEvent) {
    this.push('synergy_triggered', event as unknown as Record<string, unknown>);
  }

  trackComboTriggered(element: string, stackCount: number, roundNumber: number) {
    this.push('combo_triggered', { element, stackCount, roundNumber });
  }

  trackGameStarted(mode: string, deckSize: number) {
    this.push('game_started', { mode, deckSize });
  }

  trackTurnEnded(roundNumber: number, manaSpent: number, cardsPlayed: number) {
    this.push('turn_ended', { roundNumber, manaSpent, cardsPlayed });
  }

  trackMulligan(cardsSwapped: number) {
    this.push('mulligan', { cardsSwapped });
  }

  trackHeroSkillUsed(element: string, roundNumber: number) {
    this.push('hero_skill_used', { element, roundNumber });
  }

  // ============ Analysis ============

  /**
   * Generate a balance report from collected data.
   * Called on-demand (not every frame).
   */
  generateBalanceReport(): BalanceReport {
    this.load();

    const cardPlays = this.events.filter(e => e.type === 'card_played');
    const gameEnds = this.events.filter(e => e.type === 'game_ended');
    const synergies = this.events.filter(e => e.type === 'synergy_triggered');

    // Card stats aggregation
    const cardMap = new Map<string, { played: number; won: number; lost: number; damage: number; countered: number }>();
    for (const e of cardPlays) {
      const d = e.data as unknown as CardPlayEvent;
      const entry = cardMap.get(d.spellId) || { played: 0, won: 0, lost: 0, damage: 0, countered: 0 };
      entry.played++;
      entry.damage += d.damageDealt || 0;
      if (d.wasCountered) entry.countered++;
      cardMap.set(d.spellId, entry);
    }

    // Attribute wins/losses to cards played in that game
    for (const e of gameEnds) {
      const d = e.data as unknown as GameEndEvent;
      const gameCards = cardPlays
        .filter(cp => Math.abs(cp.timestamp - e.timestamp) < (d.durationMs || 300000))
        .map(cp => (cp.data as unknown as CardPlayEvent).spellId);
      for (const spellId of new Set(gameCards)) {
        const entry = cardMap.get(spellId);
        if (entry) {
          if (d.result === 'WIN') entry.won++;
          else if (d.result === 'LOSS') entry.lost++;
        }
      }
    }

    const cardStats: CardStats[] = Array.from(cardMap.entries()).map(([spellId, s]) => ({
      spellId,
      timesPlayed: s.played,
      timesWon: s.won,
      timesLost: s.lost,
      totalDamageDealt: s.damage,
      timesCountered: s.countered,
      winRate: s.played > 0 ? s.won / (s.won + s.lost || 1) : 0,
      avgDamage: s.played > 0 ? s.damage / s.played : 0,
      counterRate: s.played > 0 ? s.countered / s.played : 0,
    })).sort((a, b) => b.timesPlayed - a.timesPlayed);

    // Synergy stats
    const synergyMap = new Map<string, number>();
    for (const e of synergies) {
      const id = (e.data as unknown as SynergyEvent).synergyId;
      synergyMap.set(id, (synergyMap.get(id) || 0) + 1);
    }
    const synergyStats: SynergyStats[] = Array.from(synergyMap.entries()).map(([id, count]) => ({
      synergyId: id,
      triggerCount: count,
      triggerRate: gameEnds.length > 0 ? count / gameEnds.length : 0,
    }));

    // Element distribution (from game starts)
    const gameStarts = this.events.filter(e => e.type === 'game_started');
    const elementMap = new Map<string, { played: number; won: number }>();
    for (const e of gameStarts) {
      const dist = (e.data as { deckElementDistribution?: Record<string, number> }).deckElementDistribution || {};
      for (const [elem, count] of Object.entries(dist)) {
        if (count > 0) {
          const entry = elementMap.get(elem) || { played: 0, won: 0 };
          entry.played++;
          elementMap.set(elem, entry);
        }
      }
    }

    const elementDistribution: ElementDistribution[] = Array.from(elementMap.entries()).map(([element, s]) => ({
      element,
      gamesPlayed: s.played,
      gamesWon: s.won,
      winRate: s.played > 0 ? s.won / s.played : 0,
    }));

    // Duration / rounds
    const durations = gameEnds.map(e => (e.data as unknown as GameEndEvent).durationMs || 0).filter(d => d > 0);
    const rounds = gameEnds.map(e => (e.data as unknown as GameEndEvent).totalRounds || 0);

    // Balance flags
    const overpoweredCards = cardStats
      .filter(c => c.winRate > 0.6 && c.timesPlayed >= 10)
      .map(c => c.spellId);
    const underpoweredCards = cardStats
      .filter(c => c.winRate < 0.35 && c.timesPlayed >= 10)
      .map(c => c.spellId);

    const totalWins = gameEnds.filter(e => (e.data as unknown as GameEndEvent).result === 'WIN').length;

    return {
      generatedAt: new Date().toISOString(),
      totalGames: gameEnds.length,
      overallWinRate: gameEnds.length > 0 ? totalWins / gameEnds.length : 0,
      cardStats,
      synergyStats,
      elementDistribution,
      overpoweredCards,
      underpoweredCards,
      avgGameDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      avgRoundsPerGame: rounds.length > 0 ? rounds.reduce((a, b) => a + b, 0) / rounds.length : 0,
    };
  }

  /**
   * Export all events as JSON string (for server upload).
   */
  exportEvents(): string {
    this.load();
    return JSON.stringify(this.events);
  }

  /**
   * Clear all stored events.
   */
  clearEvents() {
    this.events = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get total event count.
   */
  getEventCount(): number {
    this.load();
    return this.events.length;
  }
}

export const AnalyticsService = new AnalyticsServiceClass();
