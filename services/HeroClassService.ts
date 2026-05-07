/**
 * HeroClassService — 职业系统
 *
 * 5 个职业，每个职业有专属技能和卡牌加成
 */

// ============ 类型 ============

export type HeroClassId = 'pyromancer' | 'frostweaver' | 'stormcaller' | 'earthwarden' | 'lifeshaper';

export interface HeroClass {
  id: HeroClassId;
  name: string;
  title: string;
  description: string;
  icon: string;
  element: string;
  color: string;
  borderColor: string;
  shadowColor: string;
  /** 职业被动效果 */
  passive: {
    name: string;
    description: string;
    type: 'element_damage_boost' | 'element_cost_reduce' | 'armor_bonus' | 'heal_bonus' | 'draw_bonus';
    value: number;
    element?: string;
  };
  /** 职业专属技能 */
  skill: {
    name: string;
    description: string;
    emoji: string;
    manaCost: number;
    effect: string;
    value: number;
  };
  /** 推荐牌组风格 */
  recommendedStyle: 'aggro' | 'control' | 'combo' | 'midrange';
}

export interface PlayerClassData {
  selectedClass: HeroClassId | null;
  classExp: Record<HeroClassId, number>;
  classLevel: Record<HeroClassId, number>;
  classWins: Record<HeroClassId, number>;
}

// ============ 职业定义 ============

export const HERO_CLASSES: HeroClass[] = [
  {
    id: 'pyromancer',
    name: '炎术士',
    title: '烈焰掌控者',
    description: '精通火焰法术的大师，擅长高额伤害和持续灼烧。',
    icon: '🔥',
    element: 'fire',
    color: 'text-red-400',
    borderColor: 'border-red-500',
    shadowColor: 'rgba(239,68,68,0.5)',
    passive: {
      name: '烈焰之心',
      description: '火系法术伤害 +1',
      type: 'element_damage_boost',
      value: 1,
      element: 'fire',
    },
    skill: {
      name: '火焰风暴',
      description: '对所有敌人造成 2 点伤害并灼烧',
      emoji: '🌋',
      manaCost: 3,
      effect: 'aoe_damage_burn',
      value: 2,
    },
    recommendedStyle: 'aggro',
  },
  {
    id: 'frostweaver',
    name: '织霜者',
    title: '寒冰编织者',
    description: '操控冰霜的大师，擅长控制和防御。',
    icon: '❄️',
    element: 'ice',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500',
    shadowColor: 'rgba(34,211,238,0.5)',
    passive: {
      name: '极寒领域',
      description: '冰系法术冻结回合 +1',
      type: 'element_damage_boost',
      value: 1,
      element: 'ice',
    },
    skill: {
      name: '冰封结界',
      description: '获得 4 护甲并冻结对手 1 回合',
      emoji: '🧊',
      manaCost: 2,
      effect: 'armor_freeze',
      value: 4,
    },
    recommendedStyle: 'control',
  },
  {
    id: 'stormcaller',
    name: '唤雷者',
    title: '风暴召唤师',
    description: '驾驭雷电的大师，擅长连击和爆发伤害。',
    icon: '⚡',
    element: 'thunder',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500',
    shadowColor: 'rgba(250,204,21,0.5)',
    passive: {
      name: '雷电涌流',
      description: '雷系法术连击伤害额外 +25%',
      type: 'element_damage_boost',
      value: 25,
      element: 'thunder',
    },
    skill: {
      name: '雷神降临',
      description: '造成 3 点伤害，如果连击则翻倍',
      emoji: '⛈️',
      manaCost: 2,
      effect: 'damage_combo_double',
      value: 3,
    },
    recommendedStyle: 'combo',
  },
  {
    id: 'earthwarden',
    name: '大地守卫',
    title: '磐石守护者',
    description: '掌控岩石的大师，擅长护甲和防御。',
    icon: '🪨',
    element: 'rock',
    color: 'text-stone-400',
    borderColor: 'border-stone-500',
    shadowColor: 'rgba(168,162,158,0.5)',
    passive: {
      name: '大地之铠',
      description: '每回合开始获得 1 护甲',
      type: 'armor_bonus',
      value: 1,
    },
    skill: {
      name: '岩石堡垒',
      description: '获得 6 护甲',
      emoji: '🛡️',
      manaCost: 2,
      effect: 'gain_armor',
      value: 6,
    },
    recommendedStyle: 'control',
  },
  {
    id: 'lifeshaper',
    name: '生命塑者',
    title: '自然治愈师',
    description: '掌握自然之力的大师，擅长治疗和随从。',
    icon: '🌿',
    element: 'vine',
    color: 'text-green-400',
    borderColor: 'border-green-500',
    shadowColor: 'rgba(34,197,94,0.5)',
    passive: {
      name: '生命源泉',
      description: '治疗效果 +2',
      type: 'heal_bonus',
      value: 2,
    },
    skill: {
      name: '自然恩赐',
      description: '恢复 4 点生命值并抽 1 张牌',
      emoji: '🌸',
      manaCost: 2,
      effect: 'heal_draw',
      value: 4,
    },
    recommendedStyle: 'midrange',
  },
];

// ============ Service ============

const STORAGE_KEY = 'wizard_hero_class_v1';

export class HeroClassService {

  /** 获取所有职业 */
  static getAll(): HeroClass[] {
    return HERO_CLASSES;
  }

  /** 根据 ID 获取职业 */
  static getById(id: HeroClassId): HeroClass | undefined {
    return HERO_CLASSES.find(c => c.id === id);
  }

  /** 获取玩家职业数据 */
  static getPlayerData(): PlayerClassData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }

    const defaultData: PlayerClassData = {
      selectedClass: null,
      classExp: { pyromancer: 0, frostweaver: 0, stormcaller: 0, earthwarden: 0, lifeshaper: 0 },
      classLevel: { pyromancer: 1, frostweaver: 1, stormcaller: 1, earthwarden: 1, lifeshaper: 1 },
      classWins: { pyromancer: 0, frostweaver: 0, stormcaller: 0, earthwarden: 0, lifeshaper: 0 },
    };
    return defaultData;
  }

  /** 选择职业 */
  static selectClass(classId: HeroClassId): void {
    const data = this.getPlayerData();
    data.selectedClass = classId;
    this.save(data);
  }

  /** 获取当前选中的职业 */
  static getSelectedClass(): HeroClass | null {
    const data = this.getPlayerData();
    if (!data.selectedClass) return null;
    return this.getById(data.selectedClass) || null;
  }

  /** 增加职业经验（战斗胜利后调用） */
  static addExp(classId: HeroClassId, amount: number): { leveled: boolean; newLevel: number } {
    const data = this.getPlayerData();
    data.classExp[classId] = (data.classExp[classId] || 0) + amount;
    data.classWins[classId] = (data.classWins[classId] || 0) + 1;

    const expPerLevel = 100;
    let leveled = false;
    while (data.classExp[classId] >= expPerLevel) {
      data.classExp[classId] -= expPerLevel;
      data.classLevel[classId] = (data.classLevel[classId] || 1) + 1;
      leveled = true;
    }

    this.save(data);
    return { leveled, newLevel: data.classLevel[classId] };
  }

  /** 获取职业被动效果数值 */
  static getPassiveValue(classId: HeroClassId | null): { type: string; value: number; element?: string } | null {
    if (!classId) return null;
    const cls = this.getById(classId);
    return cls ? cls.passive : null;
  }

  private static save(data: PlayerClassData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }
}
