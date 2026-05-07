/**
 * 卡牌相关类型定义
 * [Phase B-5] 从 types.ts 拆分
 * [Balance v2.0] 新增低费卡牌类型
 * [A-1] SpellType 改为 string 以支持数据驱动扩展
 */

// [A-1] 数据驱动：不再手动维护联合类型，新卡只需在 data/spells.ts 中添加 defineSpell()
export type SpellType = string;

export type Rarity = "common" | "rare" | "mythic" | "legendary";

// [A-3] 新增 charge/divine_shield/deathrattle/aura/summon
export type Mechanic = "burn" | "tangle" | "freeze" | "charge" | "fortify" | "heal" | "aoe" | "draw" | "silence" | "skip" | "divine_shield" | "deathrattle" | "aura" | "summon" | "poison" | "secret" | "lifesteal" | "discover" | "transform" | "cleave" | "extra_turn" | "copy_spell" | "mana_ramp";

export type CardSet = "core" | "classic" | "tournament" | "legacy" | "expansion_1" | "expansion_2" | "expansion_3" | "expansion_4";

export type GameMode = "standard" | "wild" | "dungeon" | "arena" | "tavern_brawl" | "endless_tower";

// [P1-1] Target selection system
export type TargetMode = 'auto' | 'hero_or_minion' | 'minion_only' | 'hero_only';

export interface SpellTarget {
  type: 'hero' | 'minion';
  id?: string; // minion instanceId when targeting a minion
}

export interface Spell {
  id: SpellType;
  name: string;
  emoji: string;
  icon?: string;
  artSrc?: string;
  color: string;
  borderColor: string;
  shadowColor: string;
  manaCost: number;
  damage: number;
  armorGain?: number;
  rarity: Rarity;
  mechanic: Mechanic;
  cardSet?: CardSet;
  description: string;
  shortDesc: string;
  summonId?: string;
  effectDuration?: number;
  value?: number;
  // [A-1] 新增：随从相关扩展
  /** 召唤的随从是否具有突袭（不设exhausted） */
  rushSummon?: boolean;
  /** 亡语效果类型 */
  deathrattleEffect?: DeathrattleEffect;
  /** 对所有敌方随从造成伤害 */
  aoeMinionDamage?: number;
  /** [P1-1] 目标选择模式 */
  targetMode?: TargetMode;
}

// [A-2] 随从关键词系统
export type MinionKeyword = 'taunt' | 'divine_shield' | 'rush' | 'poison' | 'lifesteal' | 'windfury' | 'cleave' | 'discover';

// [A-2] 亡语效果
export interface DeathrattleEffect {
  type: 'damage' | 'summon' | 'heal' | 'draw';
  value: number;
  summonId?: string; // type='summon' 时使用
}

// [A-2] 光环效果
export interface AuraEffect {
  type: 'atk_boost' | 'hp_boost' | 'cost_reduce';
  value: number;
  target: 'self' | 'all_friendly' | 'all_enemy';
}

// [A-2] 运行时增益
export interface MinionBuff {
  atk: number;
  hp: number;
  source: string;
  duration: number; // -1 = 永久
}

// [A-2] 增强 Minion 类型
export interface Minion {
  id: string;
  instanceId: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  baseAtk: number;   // [A-2] 原始攻击力（用于光环重算）
  baseHp: number;    // [A-2] 原始生命值
  exhausted: boolean;
  type: string;
  /** [A-2] 随从关键词 */
  keywords: MinionKeyword[];
  /** [A-2] 光环效果 */
  aura?: AuraEffect;
  /** [A-2] 亡语效果 */
  onDeath?: DeathrattleEffect;
  /** [A-2] 运行时增益 */
  buffs: MinionBuff[];
  /** [A-2] 圣盾状态 */
  hasShield?: boolean;
  /** [P0 Fix #3] 濒死标记：HP<=0 但尚未执行死亡帧处理 */
  isDying?: boolean;
  /** [P0 Fix #3] 亡语效果ID（未来扩展） */
  deathrattle?: string;
  /** 是否具有嘲讽（兼容旧代码） */
  taunt?: boolean;
}

// [A-2] 随从数据模板（定义在 data/spells.ts 的 MINION_DATA 中）
export interface MinionTemplate {
  id?: string; // 可选：通常由 Record 的 key 提供
  name: string;
  atk: number;
  hp: number;
  type: string;
  keywords?: MinionKeyword[];
  aura?: AuraEffect;
  onDeath?: DeathrattleEffect;
}

export interface Deck {
  id: string;
  name: string;
  cards: SpellType[];
  createdAt: number;
  lastUsed: number;
}

// [P3-2] 英雄技能树
export interface HeroSkill {
  id: string;
  name: string;
  description: string;
  emoji: string;
  manaCost: number;
  mechanic: Mechanic;
  damage?: number;
  armorGain?: number;
  heal?: number;
  draw?: number;
  manaRestore?: number;
  element: string;
}
