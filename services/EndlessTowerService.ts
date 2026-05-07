/**
 * EndlessTowerService — 无尽塔模式
 *
 * Roguelike 爬塔：逐层挑战，每层选择增益遗物
 */

import { SpellType } from '../types/card';
import { Artifact } from '../types/dungeon';

const STORAGE_KEY = 'wizard_endless_tower_v1';

// ============ 类型 ============

export interface TowerFloor {
  floor: number;
  type: 'battle' | 'elite' | 'boss' | 'rest' | 'treasure';
  enemyId?: string;
  enemyHpBonus: number;   // 敌方 HP 加成
  enemyAtkBonus: number;  // 敌方伤害加成
  reward: TowerReward;
  cleared: boolean;
}

export interface TowerReward {
  gold: number;
  artifactChoices?: Artifact[];
}

export interface TowerRun {
  id: string;
  userId: string;
  currentFloor: number;
  maxFloor: number;
  playerHp: number;
  maxHp: number;
  gold: number;
  deck: SpellType[];
  artifacts: Artifact[];
  floors: TowerFloor[];
  status: 'active' | 'completed' | 'defeated';
  score: number;
  startedAt: number;
  completedAt?: number;
}

// ============ 遗物池 ============

const TOWER_ARTIFACTS: Artifact[] = [
  { id: 'tower_flame_heart', name: '火焰之心', description: '火系卡牌伤害 +2', icon: '🔥', rarity: 'RARE', effectType: 'FIRE_BONUS', value: 2 },
  { id: 'tower_frost_core', name: '冰霜核心', description: '冰系卡牌费用 -1', icon: '❄️', rarity: 'RARE', effectType: 'ICE_BONUS', value: 1 },
  { id: 'tower_thunder_gem', name: '雷电宝石', description: '雷系卡牌伤害 +2', icon: '⚡', rarity: 'RARE', effectType: 'THUNDER_BONUS', value: 2 },
  { id: 'tower_rock_shield', name: '岩石之盾', description: '每回合开始获得 2 护甲', icon: '🪨', rarity: 'RARE', effectType: 'START_ARMOR', value: 2 },
  { id: 'tower_vine_seed', name: '藤蔓种子', description: '藤系治疗效果 +3', icon: '🌿', rarity: 'RARE', effectType: 'VINE_BONUS', value: 3 },
  { id: 'tower_mana_crystal', name: '法力水晶', description: '起始法力 +1', icon: '💎', rarity: 'RARE', effectType: 'START_MANA', value: 1 },
  { id: 'tower_vampire_fang', name: '吸血獠牙', description: '所有法术获得吸血效果', icon: '🧛', rarity: 'LEGENDARY', effectType: 'LIFESTEAL_ALL', value: 1 },
  { id: 'tower_time_hourglass', name: '时间沙漏', description: '每回合多抽 1 张牌', icon: '⏳', rarity: 'LEGENDARY', effectType: 'DRAW_CARD', value: 1 },
  { id: 'tower_gold_bag', name: '聚宝盆', description: '胜利获得双倍金币', icon: '💰', rarity: 'RARE', effectType: 'DOUBLE_GOLD', value: 2 },
  { id: 'tower_rebirth_phoenix', name: '涅槃凤凰', description: '首次死亡时复活（1次）', icon: '🦅', rarity: 'LEGENDARY', effectType: 'REBIRTH', value: 1 },
  { id: 'tower_iron_skin', name: '铁皮', description: '最大生命值 +15', icon: '🛡️', rarity: 'RARE', effectType: 'MAX_HP_UP', value: 15 },
  { id: 'tower_free_spell', name: '节俭之心', description: '每场战斗第一张卡费用为 0', icon: '🎯', rarity: 'RARE', effectType: 'FREE_SPELL', value: 1 },
  { id: 'tower_poison_dagger', name: '淬毒匕首', description: '所有攻击附带 1 点毒伤', icon: '🗡️', rarity: 'RARE', effectType: 'BUFF_DAMAGE', value: 1 },
  { id: 'tower_heal_scroll', name: '治愈卷轴', description: '每场战斗结束恢复 5 HP', icon: '📜', rarity: 'RARE', effectType: 'HEAL_BATTLE_END', value: 5 },
  { id: 'tower_discount', name: '法术折扣', description: '所有法术费用 -1', icon: '🏷️', rarity: 'LEGENDARY', effectType: 'DISCOUNT_SPELL', value: 1 },
];

// ============ 敌人模板 ============

const TOWER_ENEMIES = [
  { id: 'tower_goblin', name: '塔楼哥布林', baseHp: 20, baseAtk: 2 },
  { id: 'tower_skeleton', name: '骷髅战士', baseHp: 25, baseAtk: 3 },
  { id: 'tower_wraith', name: '幽灵', baseHp: 22, baseAtk: 4 },
  { id: 'tower_golem', name: '石像鬼', baseHp: 35, baseAtk: 2 },
  { id: 'tower_dragon_whelp', name: '幼龙', baseHp: 30, baseAtk: 5 },
];

const TOWER_ELITES = [
  { id: 'tower_lich', name: '巫妖王', baseHp: 45, baseAtk: 5 },
  { id: 'tower_demon', name: '恶魔领主', baseHp: 40, baseAtk: 7 },
  { id: 'tower_giant', name: '风暴巨人', baseHp: 50, baseAtk: 4 },
];

const TOWER_BOSSES = [
  { id: 'tower_fire_lord', name: '火焰领主', baseHp: 60, baseAtk: 6 },
  { id: 'tower_ice_queen', name: '冰霜女王', baseHp: 55, baseAtk: 7 },
  { id: 'tower_thunder_god', name: '雷神', baseHp: 65, baseAtk: 8 },
];

// ============ Service ============

export class EndlessTowerService {

  static readonly MAX_FLOORS = 99;
  static readonly INITIAL_HP = 80;
  static readonly INITIAL_GOLD = 100;

  /** 创建新的塔楼冒险 */
  static startRun(userId: string, deck: SpellType[]): TowerRun {
    const floors = this.generateFloors(20); // 先生成前 20 层
    return {
      id: `tower_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      currentFloor: 0,
      maxFloor: 0,
      playerHp: this.INITIAL_HP,
      maxHp: this.INITIAL_HP,
      gold: this.INITIAL_GOLD,
      deck: [...deck],
      artifacts: [],
      floors,
      status: 'active',
      score: 0,
      startedAt: Date.now(),
    };
  }

  /** 生成楼层 */
  static generateFloors(count: number, startFloor: number = 0): TowerFloor[] {
    const floors: TowerFloor[] = [];
    for (let i = 0; i < count; i++) {
      const floorNum = startFloor + i;
      const type = this.getFloorType(floorNum);
      const difficulty = Math.floor(floorNum / 5);

      floors.push({
        floor: floorNum + 1,
        type,
        enemyHpBonus: difficulty * 5,
        enemyAtkBonus: Math.floor(difficulty * 1.5),
        reward: this.calculateFloorReward(type, floorNum),
        cleared: false,
      });
    }
    return floors;
  }

  /** 获取楼层类型 */
  private static getFloorType(floor: number): TowerFloor['type'] {
    // 每 5 层 Boss
    if ((floor + 1) % 5 === 0) return 'boss';
    // 每 3 层精英
    if ((floor + 1) % 3 === 0) return 'elite';
    // 随机休息/宝藏层
    if (floor > 0 && Math.random() < 0.15) return 'rest';
    if (floor > 0 && Math.random() < 0.1) return 'treasure';
    return 'battle';
  }

  /** 计算楼层奖励 */
  private static calculateFloorReward(type: TowerFloor['type'], floor: number): TowerReward {
    const baseGold = 10 + Math.floor(floor / 3) * 5;
    switch (type) {
      case 'battle':
        return { gold: baseGold };
      case 'elite':
        return { gold: baseGold * 2, artifactChoices: this.getRandomArtifacts(3) };
      case 'boss':
        return { gold: baseGold * 3, artifactChoices: this.getRandomArtifacts(3) };
      case 'rest':
        return { gold: 0 };
      case 'treasure':
        return { gold: baseGold * 2, artifactChoices: this.getRandomArtifacts(3) };
    }
  }

  /** 获取随机遗物选项 */
  static getRandomArtifacts(count: number): Artifact[] {
    const shuffled = [...TOWER_ARTIFACTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /** 获取当前楼层敌人 */
  static getEnemy(floor: TowerFloor): { name: string; hp: number; atk: number } {
    const pool = floor.type === 'boss' ? TOWER_BOSSES
      : floor.type === 'elite' ? TOWER_ELITES
      : TOWER_ENEMIES;
    const template = pool[Math.floor(Math.random() * pool.length)];
    return {
      name: template.name,
      hp: template.baseHp + floor.enemyHpBonus,
      atk: template.baseAtk + floor.enemyAtkBonus,
    };
  }

  /** 完成楼层 */
  static clearFloor(run: TowerRun, won: boolean): TowerRun {
    if (!won) {
      return { ...run, status: 'defeated', completedAt: Date.now() };
    }

    const floor = run.floors[run.currentFloor];
    if (!floor) return run;

    floor.cleared = true;
    const newGold = run.gold + floor.reward.gold;
    const scoreBonus = floor.type === 'boss' ? 100 : floor.type === 'elite' ? 50 : 20;
    const nextFloor = run.currentFloor + 1;

    // 每完成 5 层，生成更多楼层
    let newFloors = run.floors;
    if (nextFloor >= newFloors.length && nextFloor < this.MAX_FLOORS) {
      newFloors = [...run.floors, ...this.generateFloors(10, nextFloor)];
    }

    // 休息层恢复 HP
    let newHp = run.playerHp;
    if (floor.type === 'rest') {
      newHp = Math.min(run.maxHp, run.playerHp + Math.floor(run.maxHp * 0.3));
    }

    if (nextFloor >= this.MAX_FLOORS) {
      return {
        ...run,
        currentFloor: nextFloor,
        maxFloor: Math.max(run.maxFloor, nextFloor),
        gold: newGold,
        playerHp: newHp,
        floors: newFloors,
        score: run.score + scoreBonus,
        status: 'completed',
        completedAt: Date.now(),
      };
    }

    return {
      ...run,
      currentFloor: nextFloor,
      maxFloor: Math.max(run.maxFloor, nextFloor),
      gold: newGold,
      playerHp: newHp,
      floors: newFloors,
      score: run.score + scoreBonus,
    };
  }

  /** 选择遗物 */
  static pickArtifact(run: TowerRun, artifact: Artifact): TowerRun {
    return {
      ...run,
      artifacts: [...run.artifacts, artifact],
    };
  }

  /** 休息层：恢复 HP */
  static rest(run: TowerRun): TowerRun {
    const healAmount = Math.floor(run.maxHp * 0.3);
    return {
      ...run,
      playerHp: Math.min(run.maxHp, run.playerHp + healAmount),
    };
  }

  /** 持久化 */
  static save(run: TowerRun): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
    } catch { /* ignore */ }
  }

  static load(): TowerRun | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** 计算结算奖励 */
  static calculateFinalRewards(run: TowerRun): { gold: number; packs: number } {
    const floorBonus = Math.floor(run.maxFloor / 5) * 50;
    return {
      gold: run.gold + floorBonus,
      packs: Math.floor(run.maxFloor / 10) + 1,
    };
  }
}
