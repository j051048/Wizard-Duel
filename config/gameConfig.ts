import { GameConfig } from '../types';

export const API_BASE_URL = ''; // 默认为空，由 ApiService 处理环境变量或 Mock

// ============ 暴雪级游戏配置 (Patch 2.0) ============

export const GAME_CONFIG: GameConfig = {
  maxHP: 30,             // [P0] 提升至标准卡牌游戏血量 (30点)
  startingMana: 1,       // [P0] 1费起手，经典成长曲线
  maxMana: 10,           // [P0] 10费上限
  handSize: 5,           // [P1] 手牌上限提升至5，增加策略选择
  deckSize: 20,          // [P1] 牌库厚度增加
  cardsDrawnPerTurn: 1,  // [P3] 改为每回合抽1张，控制过牌节奏（如果为了快节奏可保持2）
  manaPerTurn: 0,        // (逻辑控制自然增长)
};

export const MAX_HP = GAME_CONFIG.maxHP;

// ============ 下注选项 ============

export const BET_OPTIONS = [10, 50, 100];

// ============ 胜负倍率 ============

export const WIN_MULTIPLIER = 0.95;   // 胜利赔率
export const CRIT_CHANCE = 0.0;       // [P0] 移除随机暴击
export const CRIT_MULTIPLIER = 1.0;   // 失效

/**
 * 开包系统 - 保底机制
 * 5包保底稀有，10包保底史诗，20包保底传说
 */
export const PACK_CONFIG = {
  cost: 100, // 每个卡包价格
  cardsPerPack: 5,
  pitySystem: {
    rare: { threshold: 5, guaranteed: false },
    mythic: { threshold: 12, guaranteed: false },
    legendary: { threshold: 25, guaranteed: false }
  },
  // 基础概率：Common 75%, Rare 18%, Mythic 5%, Legendary 2%
  dropRates: {
    common: 0.75,
    rare: 0.18,
    mythic: 0.05,
    legendary: 0.02
  }
};
