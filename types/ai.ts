/**
 * AI 相关类型定义
 * [Phase B-5] 从 types.ts 拆分
 */

export interface AIProfile {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  avatar: string;
  strategy: 'aggressive' | 'defensive' | 'balanced';
}

export type AIEmoteType = 'thinking' | 'thinking_fast' | 'laugh' | 'angry' | 'surprised' | 'taunt';

export interface AIStatus {
  emote: AIEmoteType | null;
  message: string | null;
}