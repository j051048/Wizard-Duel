import { SpellType, Deck } from '../types';

export type NodeType = 'BATTLE' | 'ELITE' | 'BOSS' | 'REST' | 'EVENT' | 'SHOP';

export interface DungeonNode {
  id: string;
  type: NodeType;
  depth: number;
  name: string;
  description?: string;
  isCleared: boolean;
  // Specific data
  enemyProfileId?: string;
  eventId?: string;
  /** 分支节点：属于哪一层 */
  layer?: number;
  /** 分支节点：属于哪条分支 */
  branch?: number;
  /** 分支节点：子节点 ID 列表 */
  children?: string[];
  /** 分支节点：父节点 ID 列表 */
  parents?: string[];
}

export interface Artifact {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  effectType: ArtifactEffectType;
  value: number;
}

export type ArtifactEffectType =
  | 'BUFF_DAMAGE'
  | 'HEAL_BATTLE_END'
  | 'DISCOUNT_SPELL'
  | 'MAX_HP_UP'
  | 'START_ARMOR'
  | 'START_MANA'
  | 'DRAW_CARD'
  | 'HEAL_PER_TURN'
  | 'FIRE_BONUS'
  | 'ICE_BONUS'
  | 'THUNDER_BONUS'
  | 'ROCK_BONUS'
  | 'VINE_BONUS'
  | 'GOLD_PER_KILL'
  | 'IMMUNE_FREEZE'
  | 'FREE_SPELL'
  | 'LIFESTEAL_ALL'
  | 'AOE_DAMAGE'
  | 'DOUBLE_GOLD'
  | 'REBIRTH';

// [Phase D-3] 事件系统
export interface DungeonEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  choices: EventChoice[];
}

export interface EventChoice {
  text: string;
  effect: EventEffect;
  risk?: string;
}

export interface EventEffect {
  type: 'heal' | 'damage' | 'gold' | 'artifact' | 'maxhp' | 'card';
  value: number | string;
}

// [Phase D-4] 商店物品
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  type: 'artifact' | 'heal' | 'card';
  artifactId?: string;
  healAmount?: number;
  cardId?: SpellType;
}

export interface DungeonRunState {
  runId: string;
  seed: string;
  currentDepth: number;
  playerHP: number;
  maxHP: number;
  gold: number;

  deck: Deck;
  artifacts: Artifact[];

  map: DungeonNode[];
  currentNodeIndex: number;

  isGameOver: boolean;
  isVictory: boolean;
  /** 当前层 (0-based) */
  currentLayer?: number;
  /** 是否正在选择遗物 */
  isChoosingArtifact?: boolean;
  /** 可选遗物列表 */
  artifactOptions?: Artifact[];
  /** 当前事件 */
  currentEvent?: DungeonEvent;
  /** 当前商店物品 */
  shopItems?: ShopItem[];
  /** 击杀计数 (用于奖励计算) */
  killCount?: number;
}

export const INITIAL_PLAYER_HP = 100;
