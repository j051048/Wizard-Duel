/**
 * SFX Registry - 统一音效定义
 *
 * 所有音效在此注册，useAudioManager 通过此表查找。
 * 新增音效只需在 SFX_DEFS 中添加一行。
 */

// ─── 类型 ───────────────────────────────────────────────────────────────────

export type SfxCategory = 'combat' | 'spell' | 'ui' | 'ambient' | 'feedback';

export interface SfxDef {
  /** 可选变体文件列表，播放时随机选一个（减少重复感） */
  variants: string[];
  /** 回放速率（1.0 = 正常） */
  rate: [number, number]; // [min, max]，播放时随机
  /** 音量乘数（相对于全局 sfxVolume） */
  volume: [number, number];
  /** 冷却时间 ms */
  cooldown: number;
  /** 优先级 1-10，越高越不会被跳过 */
  priority: number;
  /** 分类，用于 UI 设置分组 */
  category: SfxCategory;
}

// ─── 基础音频文件池 ─────────────────────────────────────────────────────────
// 游戏实际拥有的音频资产（均为 /audio/ 下的文件）
const BASE = {
  cardPlay: '/audio/sfx-card-play.mp3',
  hit: '/audio/sfx-hit.mp3',
  block: '/audio/sfx-block.mp3',
  victory: '/audio/sfx-victory.mp3',
  defeat: '/audio/sfx-defeat.mp3',
  fire: '/audio/sfx-spell-fire.mp3',
  vine: '/audio/sfx-spell-vine.mp3',
  ice: '/audio/sfx-spell-ice.mp3',
  thunder: '/audio/sfx-spell-thunder.mp3',
  rock: '/audio/sfx-spell-rock.mp3',
};

// 辅助：固定速率和音量
const fixed = (rate: number, vol: number): [number, number] => [rate, rate];
const range = (min: number, max: number): [number, number] => [min, max];

// ─── SFX 定义表 ─────────────────────────────────────────────────────────────

export const SFX_DEFS: Record<string, SfxDef> = {
  // ── 战斗核心 ─────────────────────────────────────────
  card_play: {
    variants: [BASE.cardPlay],
    rate: [1.0, 1.0], volume: [0.8, 1.0], cooldown: 400, priority: 3, category: 'combat',
  },
  card_hover: {
    variants: [BASE.cardPlay],
    rate: [1.3, 1.6], volume: [0.08, 0.15], cooldown: 150, priority: 1, category: 'ui',
  },
  card_draw: {
    variants: [BASE.cardPlay],
    rate: [1.1, 1.3], volume: [0.4, 0.6], cooldown: 300, priority: 2, category: 'combat',
  },
  card_burn: {
    variants: [BASE.fire, BASE.hit],
    rate: [0.8, 1.0], volume: [0.6, 0.8], cooldown: 500, priority: 4, category: 'combat',
  },

  // ── 法术施放（按元素） ──────────────────────────────
  spell_fire: {
    variants: [BASE.fire], rate: [0.95, 1.05], volume: [0.8, 1.0], cooldown: 600, priority: 5, category: 'spell',
  },
  spell_ice: {
    variants: [BASE.ice], rate: [0.95, 1.05], volume: [0.8, 1.0], cooldown: 600, priority: 5, category: 'spell',
  },
  spell_thunder: {
    variants: [BASE.thunder], rate: [0.95, 1.05], volume: [0.8, 1.0], cooldown: 600, priority: 5, category: 'spell',
  },
  spell_vine: {
    variants: [BASE.vine], rate: [0.95, 1.05], volume: [0.8, 1.0], cooldown: 600, priority: 5, category: 'spell',
  },
  spell_rock: {
    variants: [BASE.rock], rate: [0.95, 1.05], volume: [0.8, 1.0], cooldown: 600, priority: 5, category: 'spell',
  },

  // ── 伤害 / 治疗 / 护甲 ────────────────────────────
  hit_light: {
    variants: [BASE.hit], rate: [1.2, 1.4], volume: [0.3, 0.5], cooldown: 300, priority: 3, category: 'combat',
  },
  hit_medium: {
    variants: [BASE.hit], rate: [0.9, 1.1], volume: [0.6, 0.8], cooldown: 400, priority: 5, category: 'combat',
  },
  hit_heavy: {
    variants: [BASE.hit, BASE.block], rate: [0.6, 0.8], volume: [0.9, 1.0], cooldown: 600, priority: 7, category: 'combat',
  },
  heal: {
    variants: [BASE.ice], rate: [1.0, 1.2], volume: [0.6, 0.8], cooldown: 500, priority: 4, category: 'feedback',
  },
  armor_hit: {
    variants: [BASE.block], rate: [1.0, 1.2], volume: [0.5, 0.7], cooldown: 400, priority: 4, category: 'combat',
  },

  // ── Buff / Debuff 状态 ─────────────────────────────
  effect_burn: {
    variants: [BASE.fire], rate: [1.0, 1.2], volume: [0.5, 0.7], cooldown: 600, priority: 3, category: 'feedback',
  },
  effect_freeze: {
    variants: [BASE.ice], rate: [0.8, 1.0], volume: [0.6, 0.8], cooldown: 600, priority: 4, category: 'feedback',
  },
  effect_poison: {
    variants: [BASE.vine], rate: [0.9, 1.1], volume: [0.5, 0.7], cooldown: 600, priority: 3, category: 'feedback',
  },
  effect_tangle: {
    variants: [BASE.vine], rate: [0.7, 0.9], volume: [0.5, 0.7], cooldown: 600, priority: 3, category: 'feedback',
  },
  effect_shield: {
    variants: [BASE.block], rate: [1.2, 1.5], volume: [0.5, 0.7], cooldown: 500, priority: 3, category: 'feedback',
  },
  effect_silence: {
    variants: [BASE.block], rate: [1.3, 1.5], volume: [0.6, 0.8], cooldown: 500, priority: 4, category: 'feedback',
  },

  // ── 随从 ──────────────────────────────────────────
  minion_summon: {
    variants: [BASE.rock], rate: [0.9, 1.1], volume: [0.7, 0.9], cooldown: 500, priority: 4, category: 'combat',
  },
  minion_attack: {
    variants: [BASE.hit], rate: [1.1, 1.3], volume: [0.7, 0.9], cooldown: 300, priority: 5, category: 'combat',
  },
  minion_death: {
    variants: [BASE.block], rate: [0.7, 0.9], volume: [0.6, 0.8], cooldown: 500, priority: 4, category: 'combat',
  },
  minion_charge: {
    variants: [BASE.hit, BASE.cardPlay], rate: [1.0, 1.2], volume: [0.7, 0.9], cooldown: 400, priority: 5, category: 'combat',
  },

  // ── 关键时刻 ──────────────────────────────────────
  crit: {
    variants: [BASE.hit], rate: [0.6, 0.75], volume: [0.9, 1.0], cooldown: 800, priority: 8, category: 'combat',
  },
  combo_streak: {
    variants: [BASE.hit, BASE.cardPlay], rate: [1.3, 1.6], volume: [0.8, 1.0], cooldown: 600, priority: 6, category: 'combat',
  },
  combo_x5: {
    variants: [BASE.hit], rate: [1.8, 2.0], volume: [1.0, 1.0], cooldown: 800, priority: 8, category: 'combat',
  },
  counter_element: {
    variants: [BASE.block], rate: [1.1, 1.3], volume: [0.7, 0.9], cooldown: 500, priority: 6, category: 'combat',
  },
  lethal: {
    variants: [BASE.hit, BASE.victory], rate: [0.5, 0.7], volume: [1.0, 1.0], cooldown: 1500, priority: 10, category: 'combat',
  },

  // ── 秘密/陷阱 ────────────────────────────────────
  secret_play: {
    variants: [BASE.cardPlay], rate: [0.7, 0.9], volume: [0.6, 0.8], cooldown: 600, priority: 4, category: 'combat',
  },
  secret_trigger: {
    variants: [BASE.thunder], rate: [0.9, 1.1], volume: [0.9, 1.0], cooldown: 800, priority: 7, category: 'combat',
  },

  // ── 回合 ──────────────────────────────────────────
  turn_start: {
    variants: [BASE.cardPlay], rate: [0.85, 0.95], volume: [0.5, 0.7], cooldown: 1000, priority: 6, category: 'ui',
  },
  turn_end: {
    variants: [BASE.block], rate: [0.75, 0.85], volume: [0.3, 0.5], cooldown: 800, priority: 3, category: 'ui',
  },
  turn_warning: {
    variants: [BASE.cardPlay], rate: [1.5, 1.7], volume: [0.4, 0.6], cooldown: 2000, priority: 2, category: 'ui',
  },

  // ── 游戏结束 ──────────────────────────────────────
  victory: {
    variants: [BASE.victory], rate: [0.95, 1.05], volume: [0.9, 1.0], cooldown: 3000, priority: 10, category: 'feedback',
  },
  defeat: {
    variants: [BASE.defeat], rate: [0.95, 1.05], volume: [0.9, 1.0], cooldown: 3000, priority: 10, category: 'feedback',
  },
  game_over_stinger: {
    variants: [BASE.victory, BASE.defeat], rate: [0.8, 1.0], volume: [0.8, 1.0], cooldown: 2000, priority: 9, category: 'feedback',
  },

  // ── UI ────────────────────────────────────────────
  button_click: {
    variants: [BASE.cardPlay], rate: [1.1, 1.3], volume: [0.2, 0.35], cooldown: 100, priority: 1, category: 'ui',
  },
  page_transition: {
    variants: [BASE.cardPlay], rate: [0.6, 0.8], volume: [0.2, 0.3], cooldown: 300, priority: 1, category: 'ui',
  },
  modal_open: {
    variants: [BASE.block], rate: [1.2, 1.4], volume: [0.25, 0.35], cooldown: 200, priority: 2, category: 'ui',
  },
  modal_close: {
    variants: [BASE.block], rate: [0.8, 1.0], volume: [0.15, 0.25], cooldown: 200, priority: 1, category: 'ui',
  },

  // ── 进度/奖励 ────────────────────────────────────
  achievement_unlock: {
    variants: [BASE.victory], rate: [0.7, 0.9], volume: [0.9, 1.0], cooldown: 2000, priority: 9, category: 'feedback',
  },
  rank_up: {
    variants: [BASE.victory], rate: [0.9, 1.1], volume: [0.9, 1.0], cooldown: 2000, priority: 9, category: 'feedback',
  },
  level_up: {
    variants: [BASE.victory], rate: [1.0, 1.2], volume: [0.8, 1.0], cooldown: 1500, priority: 8, category: 'feedback',
  },
  pack_open: {
    variants: [BASE.cardPlay], rate: [0.8, 1.0], volume: [0.7, 0.9], cooldown: 800, priority: 5, category: 'ui',
  },
  pack_open_legendary: {
    variants: [BASE.victory], rate: [1.1, 1.3], volume: [0.9, 1.0], cooldown: 1500, priority: 8, category: 'ui',
  },
  card_reveal: {
    variants: [BASE.cardPlay], rate: [1.0, 1.2], volume: [0.6, 0.8], cooldown: 400, priority: 3, category: 'ui',
  },
  discover_select: {
    variants: [BASE.cardPlay], rate: [1.0, 1.2], volume: [0.6, 0.8], cooldown: 400, priority: 4, category: 'ui',
  },

  // ── 英雄技能 ──────────────────────────────────────
  hero_skill: {
    variants: [BASE.cardPlay], rate: [0.6, 0.8], volume: [0.8, 1.0], cooldown: 800, priority: 5, category: 'spell',
  },
  hero_skill_fire: { variants: [BASE.fire], rate: [0.7, 0.9], volume: [0.8, 1.0], cooldown: 800, priority: 5, category: 'spell' },
  hero_skill_ice: { variants: [BASE.ice], rate: [0.7, 0.9], volume: [0.8, 1.0], cooldown: 800, priority: 5, category: 'spell' },
  hero_skill_thunder: { variants: [BASE.thunder], rate: [0.7, 0.9], volume: [0.8, 1.0], cooldown: 800, priority: 5, category: 'spell' },
  hero_skill_vine: { variants: [BASE.vine], rate: [0.7, 0.9], volume: [0.8, 1.0], cooldown: 800, priority: 5, category: 'spell' },
  hero_skill_rock: { variants: [BASE.rock], rate: [0.7, 0.9], volume: [0.8, 1.0], cooldown: 800, priority: 5, category: 'spell' },

  // ── 特殊机制 ──────────────────────────────────────
  transform: {
    variants: [BASE.ice, BASE.block], rate: [1.0, 1.3], volume: [0.7, 0.9], cooldown: 600, priority: 5, category: 'spell',
  },
  lifesteal: {
    variants: [BASE.vine], rate: [0.6, 0.8], volume: [0.6, 0.8], cooldown: 500, priority: 4, category: 'spell',
  },
  windfury: {
    variants: [BASE.hit, BASE.cardPlay], rate: [1.4, 1.7], volume: [0.8, 1.0], cooldown: 300, priority: 5, category: 'combat',
  },
  deathrattle: {
    variants: [BASE.fire], rate: [0.5, 0.7], volume: [0.8, 1.0], cooldown: 800, priority: 6, category: 'combat',
  },
};

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

/** 从 [min, max] 范围内随机取值 */
export const randRange = (range: [number, number]): number =>
  range[0] + Math.random() * (range[1] - range[0]);

/** 根据伤害量选择对应的 hit 音效 key */
export function getHitSfxByDamage(damage: number): string {
  if (damage >= 8) return 'hit_heavy';
  if (damage >= 4) return 'hit_medium';
  return 'hit_light';
}

/** 根据元素类型选择法术音效 key */
export function getSpellSfxByElement(element: string): string {
  const map: Record<string, string> = {
    fire: 'spell_fire', vine: 'spell_vine', ice: 'spell_ice',
    thunder: 'spell_thunder', rock: 'spell_rock',
  };
  return map[element] || 'spell_fire';
}

/** 获取英雄技能音效 key */
export function getHeroSkillSfx(element: string): string {
  const map: Record<string, string> = {
    fire: 'hero_skill_fire', vine: 'hero_skill_vine', ice: 'hero_skill_ice',
    thunder: 'hero_skill_thunder', rock: 'hero_skill_rock',
  };
  return map[element] || 'hero_skill';
}

/** 从旧 AUDIO_CONFIG.sfx key 映射到新的 registry key（向后兼容） */
export const LEGACY_SFX_MAP: Record<string, string> = {
  cardPlay: 'card_play',
  hit: 'hit_medium',
  block: 'armor_hit',
  victory: 'victory',
  defeat: 'defeat',
  turn_start: 'turn_start',
  turn_end: 'turn_end',
  card_draw: 'card_draw',
  button_click: 'button_click',
  damage: 'hit_medium',
  heal: 'heal',
  freeze: 'effect_freeze',
  burn: 'effect_burn',
  crit: 'crit',
  combo: 'combo_streak',
  counter: 'counter_element',
  projectile: 'hit_light',
  shield: 'effect_shield',
  level_up: 'level_up',
  pack_open: 'pack_open',
  card_reveal: 'card_reveal',
  page_transition: 'page_transition',
  modal_open: 'modal_open',
  modal_close: 'modal_close',
  pack_hover: 'card_hover',
  minion_attack: 'minion_attack',
  minion_death: 'minion_death',
  status_burn: 'effect_burn',
  status_freeze: 'effect_freeze',
  status_poison: 'effect_poison',
  hero_skill: 'hero_skill',
  combo_streak: 'combo_streak',
  shield_break: 'armor_hit',
  crit_hit: 'crit',
  secret_trigger: 'secret_trigger',
  secret_play: 'secret_play',
  summon: 'minion_summon',
  deathrattle: 'deathrattle',
  silence_sfx: 'effect_silence',
  aoe_hit: 'hit_heavy',
  divine_shield_block: 'effect_shield',
  tangle: 'effect_tangle',
  card_hover: 'card_hover',
  card_play_fire: 'spell_fire',
  card_play_vine: 'spell_vine',
  card_play_ice: 'spell_ice',
  card_play_thunder: 'spell_thunder',
  card_play_rock: 'spell_rock',
  pack_open_special: 'pack_open_legendary',
  achievement_unlock: 'achievement_unlock',
  rank_up: 'rank_up',
  discover_select: 'discover_select',
  combo_x5: 'combo_x5',
  lifesteal: 'lifesteal',
};
