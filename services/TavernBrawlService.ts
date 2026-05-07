/**
 * TavernBrawlService — 乱斗模式
 *
 * 每周特殊规则对战，首胜奖励卡包
 */

import { SpellType } from '../types/card';
import { SPELLS } from '../constants';

const STORAGE_KEY = 'wizard_tavern_brawl_v1';

// ============ 类型 ============

export type BrawlRuleType =
  | 'cost_reduction'    // 所有卡牌费用减半
  | 'double_damage'     // 伤害翻倍
  | 'random_deck'       // 随机组牌
  | 'element_boost'     // 单元素增强
  | 'highlander'        // 每卡限1张
  | 'mana_surge'        // 法力翻倍
  | 'treasure_cards'    // 加入宝藏牌
  | 'minion_madness'    // 召唤随从费用-2
  | 'spell_chaos'       // 法术随机目标
  | 'fatigue_war';      // 每回合自动掉血

export interface TavernBrawlRule {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: BrawlRuleType;
  config: Record<string, number | string>;
  weekNumber: number;
}

export interface TavernBrawlState {
  ruleId: string;
  wins: number;
  losses: number;
  hasClaimedFirstWin: boolean;
  totalRuns: number;
  weekNumber: number;
}

// ============ 规则池 ============

const BRAWL_RULES: TavernBrawlRule[] = [
  {
    id: 'cost_slash',
    name: '大减价',
    description: '所有法术费用降低 2 点（最低 0）',
    icon: '💰',
    type: 'cost_reduction',
    config: { reduction: 2 },
    weekNumber: 0,
  },
  {
    id: 'double_power',
    name: '狂暴之力',
    description: '所有伤害和治疗效果翻倍',
    icon: '💪',
    type: 'double_damage',
    config: { multiplier: 2 },
    weekNumber: 0,
  },
  {
    id: 'random_chaos',
    name: '混沌之局',
    description: '使用随机生成的牌组进行对战',
    icon: '🎲',
    type: 'random_deck',
    config: { deckSize: 20 },
    weekNumber: 0,
  },
  {
    id: 'fire_festival',
    name: '火焰节',
    description: '火系法术伤害 +3，火系法术费用 -1',
    icon: '🔥',
    type: 'element_boost',
    config: { element: 'fire', bonusDamage: 3, costReduction: 1 },
    weekNumber: 0,
  },
  {
    id: 'ice_carnival',
    name: '冰霜狂欢',
    description: '冰系法术冻结回合 +1，冰系法术费用 -1',
    icon: '❄️',
    type: 'element_boost',
    config: { element: 'ice', bonusDamage: 0, costReduction: 1, freezeBonus: 1 },
    weekNumber: 0,
  },
  {
    id: 'highlander',
    name: '独一无二',
    description: '牌组中每张卡牌最多只能携带 1 张',
    icon: '☝️',
    type: 'highlander',
    config: {},
    weekNumber: 0,
  },
  {
    id: 'mana_tide',
    name: '法力潮汐',
    description: '起始法力上限为 5，每回合 +2 法力',
    icon: '🌊',
    type: 'mana_surge',
    config: { startMana: 5, manaPerTurn: 2 },
    weekNumber: 0,
  },
  {
    id: 'minion_party',
    name: '随从盛宴',
    description: '召唤随从的法术费用 -2',
    icon: '🐾',
    type: 'minion_madness',
    config: { reduction: 2 },
    weekNumber: 0,
  },
  {
    id: 'thunder_strike',
    name: '雷霆周',
    description: '雷系法术伤害 +3，雷系法术费用 -1',
    icon: '⚡',
    type: 'element_boost',
    config: { element: 'thunder', bonusDamage: 3, costReduction: 1 },
    weekNumber: 0,
  },
  {
    id: 'nature_bloom',
    name: '自然绽放',
    description: '治疗效果 +5，藤系法术费用 -1',
    icon: '🌿',
    type: 'element_boost',
    config: { element: 'vine', bonusDamage: 0, costReduction: 1, healBonus: 5 },
    weekNumber: 0,
  },
  {
    id: 'rock_fortress',
    name: '岩石要塞',
    description: '护甲效果翻倍，岩石系法术费用 -1',
    icon: '🪨',
    type: 'element_boost',
    config: { element: 'rock', bonusDamage: 0, costReduction: 1, armorMultiplier: 2 },
    weekNumber: 0,
  },
  {
    id: 'fatigue_battle',
    name: '疲劳之战',
    description: '每回合双方自动受到递增的疲劳伤害',
    icon: '💀',
    type: 'fatigue_war',
    config: { baseDamage: 1, increment: 1 },
    weekNumber: 0,
  },
];

// ============ Service ============

export class TavernBrawlService {

  /** 根据周数获取本周规则 */
  static getCurrentRule(): TavernBrawlRule {
    const weekNum = this.getWeekNumber();
    const index = weekNum % BRAWL_RULES.length;
    return { ...BRAWL_RULES[index], weekNumber: weekNum };
  }

  /** 获取所有规则（展示用） */
  static getAllRules(): TavernBrawlRule[] {
    return BRAWL_RULES;
  }

  /** 获取本周状态 */
  static getState(): TavernBrawlState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state: TavernBrawlState = JSON.parse(raw);
        const currentWeek = this.getWeekNumber();
        // 新的一周重置状态
        if (state.weekNumber !== currentWeek) {
          return this.createFreshState(currentWeek);
        }
        return state;
      }
    } catch { /* ignore */ }
    return this.createFreshState(this.getWeekNumber());
  }

  /** 记录战斗结果 */
  static recordBattle(won: boolean): TavernBrawlState {
    const state = this.getState();
    if (won) {
      state.wins++;
      if (!state.hasClaimedFirstWin) {
        state.hasClaimedFirstWin = true;
      }
    } else {
      state.losses++;
    }
    state.totalRuns++;
    this.saveState(state);
    return state;
  }

  /** 领取首胜奖励 */
  static claimFirstWinReward(): { gold: number; pack: boolean } | null {
    const state = this.getState();
    if (state.hasClaimedFirstWin && state.wins > 0) {
      return { gold: 50, pack: true };
    }
    return null;
  }

  /** 生成随机牌组 */
  static generateRandomDeck(size: number = 20): SpellType[] {
    const available = SPELLS.filter(s =>
      s.id !== 'skip' && s.id !== 'luck_coin' && !s.id.startsWith('hero_')
    );
    const deck: SpellType[] = [];
    for (let i = 0; i < size; i++) {
      const idx = Math.floor(Math.random() * available.length);
      deck.push(available[idx].id);
    }
    return deck;
  }

  /** 获取当前周数（基于日期） */
  private static getWeekNumber(): number {
    const now = new Date();
    const start = new Date(2026, 0, 1); // 2026-01-01
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  }

  private static createFreshState(weekNum: number): TavernBrawlState {
    return {
      ruleId: '',
      wins: 0,
      losses: 0,
      hasClaimedFirstWin: false,
      totalRuns: 0,
      weekNumber: weekNum,
    };
  }

  private static saveState(state: TavernBrawlState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }
}
