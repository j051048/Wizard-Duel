/**
 * AI 卡组模板
 * [Phase C-4] 每个 AI 角色有固定的卡组模板（不随机生成）
 * 卡组大小 20 张，与玩家一致
 */

import { SpellType } from '../types';

export interface AIDeckTemplate {
  id: string;
  name: string;
  description: string;
  cards: SpellType[];
}

/**
 * AI 固定卡组模板
 * 每个模板 20 张牌，代表一种战术风格
 */
export const AI_DECK_TEMPLATES: Record<string, AIDeckTemplate> = {
  // --- 低级 AI 卡组 (beginner/normal) ---
  balanced_apprentice: {
    id: 'balanced_apprentice',
    name: '学徒之牌',
    description: '均衡的新手牌组，每元素各4张',
    cards: [
      'fire', 'fire', 'ice', 'ice', 'thunder', 'thunder',
      'rock', 'rock', 'vine', 'vine', 'fire2', 'ice2',
      'thunder2', 'rock2', 'vine2', 'fire3', 'ice3',
      'thunder3', 'rock3', 'vine3',
    ],
  },

  aggressive_battle_mage: {
    id: 'aggressive_battle_mage',
    name: '战斗法师之牌',
    description: '以火系和雷系为主的高爆发牌组',
    cards: [
      'fire', 'fire', 'fire2', 'fire2', 'fire3', 'fire4',
      'fire5', 'fire8', 'thunder', 'thunder', 'thunder2',
      'thunder3', 'thunder7', 'thunder8', 'fire6',
      'thunder4', 'thunder5', 'thunder6', 'ice', 'rock',
    ],
  },

  defensive_merlin: {
    id: 'defensive_merlin',
    name: '大法师之牌',
    description: '岩石和冰系防御牌组，辅以治疗和护甲',
    cards: [
      'rock', 'rock', 'rock2', 'rock2', 'rock3', 'rock4',
      'rock5', 'rock6', 'ice', 'ice', 'ice2', 'ice3',
      'ice4', 'ice5', 'ice6', 'rock8', 'rock9',
      'vine4', 'vine5', 'neutral2',
    ],
  },

  // --- 中级 AI 卡组 (medium/expert) ---
  combo_thunder: {
    id: 'combo_thunder',
    name: '雷电连击之牌',
    description: '雷系 combo 向牌组，追求连续雷系法术伤害增幅',
    cards: [
      'thunder', 'thunder', 'thunder2', 'thunder2', 'thunder3',
      'thunder4', 'thunder5', 'thunder6', 'thunder7', 'thunder8',
      'thunder9', 'thunder10', 'thunder11', 'thunder12',
      'storm_summon', 'fire', 'fire2', 'ice', 'rock', 'vine',
    ],
  },

  summoner_nature: {
    id: 'summoner_nature',
    name: '自然召唤之牌',
    description: '以随从召唤为核心的自然牌组',
    cards: [
      'vine', 'vine', 'vine2', 'vine3', 'vine4', 'vine5',
      'vine6', 'vine7', 'vine8', 'vine9', 'vine10', 'vine11',
      'vine12', 'vine13', 'vine14', 'ice', 'ice7', 'ice8',
      'rock', 'rock4',
    ],
  },

  // --- 高级 AI 卡组 (hard/expert) ---
  control_ice: {
    id: 'control_ice',
    name: '绝对零度之牌',
    description: '控制型冰系牌组，大量冻结和AOE',
    cards: [
      'ice', 'ice', 'ice2', 'ice2', 'ice3', 'ice4', 'ice5',
      'ice6', 'ice7', 'ice8', 'ice9', 'ice10', 'ice11', 'ice12',
      'neutral4', 'rock', 'rock4', 'rock5', 'vine', 'vine4',
    ],
  },

  // --- Boss 专属卡组 ---
  boss_fire_lord: {
    id: 'boss_fire_lord',
    name: '烈焰领主',
    description: '火系终极牌组，高伤灼烧 + 凤凰召唤',
    cards: [
      'fire', 'fire', 'fire2', 'fire2', 'fire3', 'fire4',
      'fire5', 'fire6', 'fire8', 'fire9', 'fire10', 'fire11',
      'fire12', 'fire13', 'fire14', 'fire_ultimate',
      'thunder', 'thunder4', 'thunder10', 'thunder12',
    ],
  },

  boss_frost_witch: {
    id: 'boss_frost_witch',
    name: '冰霜女巫',
    description: '冰系控制牌组，大量冻结 + 圣盾随从',
    cards: [
      'ice', 'ice', 'ice2', 'ice2', 'ice3', 'ice4', 'ice5',
      'ice6', 'ice7', 'ice8', 'ice9', 'ice10', 'ice11', 'ice12',
      'ice_ultimate', 'rock12', 'neutral4', 'silence', 'vine4', 'vine5',
    ],
  },

  boss_rock_guardian: {
    id: 'boss_rock_guardian',
    name: '岩石守护者',
    description: '岩石防御牌组，极限护甲 + 嘲讽随从',
    cards: [
      'rock', 'rock', 'rock2', 'rock2', 'rock3', 'rock4',
      'rock5', 'rock6', 'rock8', 'rock9', 'rock10', 'rock11',
      'rock12', 'rock13', 'rock_ultimate', 'ice', 'ice4', 'vine4', 'vine5', 'neutral2',
    ],
  },

  // --- 新增 AI 卡组模板 ---
  healer_vine: {
    id: 'healer_vine',
    name: '治愈藤蔓之牌',
    description: '藤蔓系治愈续航牌组，大量治疗和持续恢复',
    cards: [
      'vine', 'vine2', 'vine3', 'vine4', 'vine5', 'vine6',
      'vine7', 'vine8', 'vine9', 'vine10', 'vine11', 'vine12',
      'vine13', 'vine14', 'ice', 'ice3', 'rock', 'rock4',
      'healing', 'neutral5',
    ],
  },

  disruption_poison: {
    id: 'disruption_poison',
    name: '剧毒干扰之牌',
    description: '藤蔓+毒系控制牌组，缠绕与持续伤害',
    cards: [
      'vine', 'vine2', 'vine4', 'vine9', 'vine13', 'poison_dart',
      'ice', 'ice2', 'ice3', 'ice4', 'ice5', 'ice6', 'ice7',
      'rock', 'rock2', 'rock4', 'rock5', 'silence', 'neutral4', 'neutral2',
    ],
  },

  mill_ice: {
    id: 'mill_ice',
    name: '时空疲劳之牌',
    description: '冰系沉默疲劳牌组，大量控制和牌库消耗',
    cards: [
      'ice', 'ice', 'ice2', 'ice2', 'ice3', 'ice4', 'ice5',
      'ice6', 'ice7', 'ice8', 'ice9', 'ice10', 'ice11', 'ice12',
      'silence', 'rock', 'rock4', 'rock5', 'vine4', 'vine5',
    ],
  },

  assassin_thunder: {
    id: 'assassin_thunder',
    name: '暗影雷击之牌',
    description: '雷系+岩石爆发牌组，高伤瞬间击杀',
    cards: [
      'thunder', 'thunder', 'thunder2', 'thunder2', 'thunder3',
      'thunder4', 'thunder5', 'thunder6', 'thunder7', 'thunder8',
      'rock', 'rock', 'rock2', 'rock3', 'rock4', 'rock5', 'rock8',
      'fire', 'fire2', 'ice',
    ],
  },
};

/**
 * 根据 AIProfile 推断难度配置 key
 */
export function resolveDifficultyKey(difficulty: string): string {
  switch (difficulty) {
    case 'easy':   return 'beginner';
    case 'medium': return 'normal';
    case 'hard':   return 'expert';
    case 'expert': return 'master';
    default:       return 'normal';
  }
}
