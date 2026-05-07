/**
 * CardRotationService — 卡牌轮换系统
 *
 * 管理标准/狂野模式的卡牌池轮换
 * 每赛季可轮换出/入特定卡牌
 */

import { CardSet, SpellType } from '../types/card';
import { SPELLS, STANDARD_SETS } from '../constants';

// ============ 类型 ============

export interface RotationSeason {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  /** 被轮换出标准模式的卡牌集合 */
  rotatedOutSets: CardSet[];
  /** 被轮换进标准模式的特殊卡牌 */
  rotatedInCards: SpellType[];
  /** 本赛季新增卡牌集合 */
  newSets: CardSet[];
}

export interface RotationConfig {
  currentSeason: RotationSeason;
  standardPool: SpellType[];
  wildPool: SpellType[];
}

// ============ 当前赛季配置 ============

const CURRENT_SEASON: RotationSeason = {
  id: 'season_2',
  name: '幻境之门',
  startDate: '2026-04-01',
  endDate: '2026-06-30',
  rotatedOutSets: [], // 目前不轮换任何旧系列
  rotatedInCards: [],
  newSets: ['expansion_4'],
};

// ============ Service ============

export class CardRotationService {

  /** 获取当前赛季 */
  static getCurrentSeason(): RotationSeason {
    return CURRENT_SEASON;
  }

  /** 获取标准模式可用卡牌池 */
  static getStandardPool(): SpellType[] {
    const season = this.getCurrentSeason();
    const activeSets = STANDARD_SETS.filter(s => !season.rotatedOutSets.includes(s));
    const pool: SpellType[] = [];

    for (const spell of SPELLS) {
      if (spell.id === 'skip' || spell.id === 'luck_coin') continue;
      // 属于活跃系列
      if (spell.cardSet && activeSets.includes(spell.cardSet)) {
        pool.push(spell.id);
      }
      // 被特别轮换进来的卡牌
      if (season.rotatedInCards.includes(spell.id)) {
        pool.push(spell.id);
      }
    }

    return [...new Set(pool)];
  }

  /** 获取狂野模式可用卡牌池 */
  static getWildPool(): SpellType[] {
    return SPELLS
      .filter(s => s.id !== 'skip' && s.id !== 'luck_coin')
      .map(s => s.id);
  }

  /** 检查卡牌是否在标准模式可用 */
  static isStandardLegal(spellId: SpellType): boolean {
    return this.getStandardPool().includes(spellId);
  }

  /** 获取牌组中不合法的卡牌 */
  static getIllegalCards(deck: SpellType[], mode: 'standard' | 'wild'): SpellType[] {
    const pool = mode === 'standard' ? this.getStandardPool() : this.getWildPool();
    return deck.filter(id => !pool.includes(id));
  }

  /** 获取赛季剩余天数 */
  static getDaysRemaining(): number {
    const season = this.getCurrentSeason();
    const end = new Date(season.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }

  /** 获取赛季进度百分比 */
  static getSeasonProgress(): number {
    const season = this.getCurrentSeason();
    const start = new Date(season.startDate).getTime();
    const end = new Date(season.endDate).getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  }

  /** 获取每个系列的卡牌数量统计 */
  static getSetStatistics(): { set: CardSet; count: number; isStandard: boolean }[] {
    const standardPool = this.getStandardPool();
    const stats: Record<string, { count: number; isStandard: boolean }> = {};

    for (const spell of SPELLS) {
      if (!spell.cardSet) continue;
      if (!stats[spell.cardSet]) {
        stats[spell.cardSet] = { count: 0, isStandard: false };
      }
      stats[spell.cardSet].count++;
      if (standardPool.includes(spell.id)) {
        stats[spell.cardSet].isStandard = true;
      }
    }

    return Object.entries(stats).map(([set, data]) => ({
      set: set as CardSet,
      count: data.count,
      isStandard: data.isStandard,
    }));
  }

  /** 获取新赛季预告 */
  static getNextSeasonPreview(): { name: string; startsIn: number; changes: string[] } | null {
    const daysLeft = this.getDaysRemaining();
    if (daysLeft > 30) return null; // 只在赛季末尾显示

    return {
      name: '新纪元',
      startsIn: daysLeft,
      changes: [
        '新赛季卡牌扩展',
        '新职业专属卡牌',
        '平衡性调整',
        '限时活动',
      ],
    };
  }
}
