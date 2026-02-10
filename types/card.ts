/**
 * 卡牌相关类型定义
 * [Phase B-5] 从 types.ts 拆分
 * [Balance v2.0] 新增低费卡牌类型
 */

export type SpellType = "fire" | "vine" | "ice" | "thunder" | "rock" | "fire2" | "vine2" | "ice2" | "thunder2" | "rock2" | "fire3" | "vine3" | "ice3" | "thunder3" | "rock3" | "fire4" | "vine4" | "ice4" | "thunder4" | "rock4" | "fire5" | "vine5" | "ice5" | "thunder5" | "rock5" | "fire6" | "vine6" | "ice6" | "rock6" | "fire_ultimate" | "vine_ultimate" | "ice_ultimate" | "thunder_ultimate" | "rock_ultimate" | "healing" | "aoe" | "draw" | "silence" | "hero_fire" | "hero_vine" | "hero_ice" | "hero_thunder" | "hero_rock" | "skip" | "thunder6" | "vine7" | "rock7" | "fire7" | "luck_coin";

export type Rarity = "common" | "rare" | "mythic" | "legendary";

export type Mechanic = "burn" | "tangle" | "freeze" | "charge" | "fortify" | "heal" | "aoe" | "draw" | "silence" | "skip";

export type CardSet = "core" | "classic" | "tournament" | "legacy";

export type GameMode = "standard" | "wild" | "dungeon";

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
  /** 
   * @deprecated 不再使用，克制关系由 elementSystem 处理
   * @see services/combat/elementSystem.ts
   */
  beats: SpellType;
  rarity: Rarity;
  mechanic: Mechanic;
  cardSet?: CardSet;
  description: string;
  shortDesc: string;
  summonId?: string;
  effectDuration?: number; // C-2: For multi-turn effects like freeze
  value?: number;          // Generic value for heal, draw count, etc.
}

export interface Minion {
  id: string;
  instanceId: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  exhausted: boolean;
  type: string;
  /** [P0 Fix #3] 濒死标记：HP<=0 但尚未执行死亡帧处理 */
  isDying?: boolean;
  /** [P0 Fix #3] 亡语效果ID（未来扩展） */
  deathrattle?: string;
  /** 是否具有嘲讽 */
  taunt?: boolean;
}

export interface Deck {
  id: string;
  name: string;
  cards: SpellType[];
  createdAt: number;
  lastUsed: number;
}