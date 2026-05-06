/**
 * [P3-2] Hero Skills - 15 skills (3 per element)
 * Each player selects 1 skill at the start of the match
 */

import type { HeroSkill } from '../types/card';
import { getGameRNG } from '../utils/seededRandom';

export const HERO_SKILLS: HeroSkill[] = [
  // === FIRE ===
  {
    id: 'skill_burn_shot',
    name: '灼烧弹',
    description: '造成 2 点伤害并附加 1 回合灼烧',
    emoji: '🔥',
    manaCost: 2,
    mechanic: 'burn',
    damage: 2,
    element: 'fire',
  },
  {
    id: 'skill_fire_strike',
    name: '火焰冲击',
    description: '造成 4 点伤害',
    emoji: '💥',
    manaCost: 2,
    mechanic: 'burn',
    damage: 4,
    element: 'fire',
  },
  {
    id: 'skill_lava_shield',
    name: '熔岩护盾',
    description: '获得 3 点护甲并附加灼烧',
    emoji: '🛡️',
    manaCost: 2,
    mechanic: 'burn',
    armorGain: 3,
    element: 'fire',
  },

  // === ICE ===
  {
    id: 'skill_frost_ray',
    name: '冰冻射线',
    description: '造成 2 点伤害并冻结 1 回合',
    emoji: '❄️',
    manaCost: 2,
    mechanic: 'freeze',
    damage: 2,
    element: 'ice',
  },
  {
    id: 'skill_ice_armor',
    name: '寒冰甲',
    description: '获得 2 点护甲并抽 1 张牌',
    emoji: '🧊',
    manaCost: 2,
    mechanic: 'freeze',
    armorGain: 2,
    draw: 1,
    element: 'ice',
  },
  {
    id: 'skill_blizzard',
    name: '暴风雪',
    description: '对所有敌方随从造成 1 点伤害',
    emoji: '🌨️',
    manaCost: 2,
    mechanic: 'aoe',
    damage: 1,
    element: 'ice',
  },

  // === THUNDER ===
  {
    id: 'skill_lightning_bolt',
    name: '闪电箭',
    description: '造成 1 点伤害（突袭）',
    emoji: '⚡',
    manaCost: 2,
    mechanic: 'charge',
    damage: 1,
    element: 'thunder',
  },
  {
    id: 'skill_mana_surge',
    name: '雷霆充能',
    description: '消耗 1 法力，恢复 2 法力',
    emoji: '💎',
    manaCost: 1,
    manaRestore: 2,
    mechanic: 'charge',
    element: 'thunder',
  },
  {
    id: 'skill_chain_lightning',
    name: '连锁闪电',
    description: '造成 3 点伤害',
    emoji: '🌩️',
    manaCost: 2,
    mechanic: 'charge',
    damage: 3,
    element: 'thunder',
  },

  // === VINE ===
  {
    id: 'skill_entangle',
    name: '缠绕',
    description: '造成 1 点伤害并缠绕（法力消耗 +1）',
    emoji: '🌿',
    manaCost: 2,
    mechanic: 'tangle',
    damage: 1,
    element: 'vine',
  },
  {
    id: 'skill_life_seed',
    name: '生命之种',
    description: '恢复 3 点生命值',
    emoji: '🌱',
    manaCost: 2,
    mechanic: 'heal',
    heal: 3,
    element: 'vine',
  },
  {
    id: 'skill_nature_blessing',
    name: '自然祝福',
    description: '抽 2 张牌',
    emoji: '🍀',
    manaCost: 2,
    mechanic: 'draw',
    draw: 2,
    element: 'vine',
  },

  // === ROCK ===
  {
    id: 'skill_stone_fist',
    name: '石拳',
    description: '造成 2 点伤害并获得 2 护甲',
    emoji: '🪨',
    manaCost: 2,
    mechanic: 'fortify',
    damage: 2,
    armorGain: 2,
    element: 'rock',
  },
  {
    id: 'skill_rock_wall',
    name: '岩石壁垒',
    description: '获得 5 点护甲',
    emoji: '🏔️',
    manaCost: 2,
    mechanic: 'fortify',
    armorGain: 5,
    element: 'rock',
  },
  {
    id: 'skill_earth_tremor',
    name: '大地震颤',
    description: '对所有敌方随从造成 1 点伤害并获得 2 护甲',
    emoji: '🌋',
    manaCost: 2,
    mechanic: 'aoe',
    damage: 1,
    armorGain: 2,
    element: 'rock',
  },
];

/** Get skills for a specific element */
export const getSkillsForElement = (element: string): HeroSkill[] => {
  return HERO_SKILLS.filter(s => s.element === element);
};

/** Get 3 random skills (one per element, prioritizing the player's main element) */
export const getSkillChoices = (mainElement?: string): HeroSkill[] => {
  const choices: HeroSkill[] = [];

  // Always include the main element's skills
  const rng = getGameRNG();

  if (mainElement) {
    const mainSkills = getSkillsForElement(mainElement);
    if (mainSkills.length > 0) {
      choices.push(rng.pick(mainSkills));
    }
  }

  // Fill remaining slots with random other element skills
  const otherElements = rng.shuffle(['fire', 'ice', 'thunder', 'vine', 'rock'].filter(e => e !== mainElement));

  for (const el of otherElements) {
    if (choices.length >= 3) break;
    const skills = getSkillsForElement(el);
    if (skills.length > 0) {
      choices.push(rng.pick(skills));
    }
  }

  // Ensure we have at least 3
  while (choices.length < 3) {
    const remaining = HERO_SKILLS.filter(s => !choices.some(c => c.id === s.id));
    if (remaining.length === 0) break;
    choices.push(rng.pick(remaining));
  }

  return choices.slice(0, 3);
};

/** Get a hero skill by ID */
export const getHeroSkillById = (id: string): HeroSkill | undefined => {
  return HERO_SKILLS.find(s => s.id === id);
};
