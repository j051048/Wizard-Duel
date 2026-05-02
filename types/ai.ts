/**
 * AI 相关类型定义
 * [Phase B-5] 从 types.ts 拆分
 * [Phase C-1] 扩展 AIProfile 支持难度配置和卡组模板
 */

import type { SpellType } from './card';
import type { AIDifficultyConfig } from '../services/ai';

export interface AIProfile {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  description: string;
  avatar: string;
  strategy: 'aggressive' | 'defensive' | 'balanced' | 'combo' | 'summoner';
  /** [Phase C-1] AI 难度配置，不填则按 difficulty 自动推断 */
  difficultyConfig?: AIDifficultyConfig;
  /** [Phase C-4] 固定卡组模板（ID 列表，会按卡牌定义自动展开为完整牌组） */
  deckTemplate?: SpellType[];
}

export type AIEmoteType = 'thinking' | 'thinking_fast' | 'laugh' | 'angry' | 'surprised' | 'taunt';

export interface AIStatus {
  emote: AIEmoteType | null;
  message: string | null;
}