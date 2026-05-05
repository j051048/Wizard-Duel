/**
 * useBattleStore - 战斗状态 Zustand Store
 *
 * 替代 useGameLoop 中的 useState(duelState) + useState(uiState)，
 * 使 BattleArena 子组件可通过 useShallow selector 粒度化订阅。
 */

import { create } from 'zustand';
import type { DuelState, DuelPhase } from '../types/duel';
import type { SpellType } from '../types/card';
import type { AIStatus } from '../types/ai';

// 从 GameLoopState 内联类型提取为独立类型
export interface TargetingData {
  isTargeting: boolean;
  sourceIndex?: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const initialAIStatus: AIStatus = { emote: null, message: null };

export interface BattleState {
  // ── 核心战斗状态 ──
  duelState: DuelState | null;

  // ── UI 状态 ──
  playerCard: SpellType | null;
  opponentCard: SpellType | null;
  resultText: string;
  effectMessages: string[];
  isGameOver: boolean;
  gameResult: 'WIN' | 'LOSS' | 'DRAW' | null;
  aiStatus: AIStatus;
  targetingData: TargetingData | null;
  isProcessing: boolean;

  // ── useTurnManager 镜像（由 useGameLoop 同步写入）──
  phase: DuelPhase;
  turnTimeLeft: number;
  turnBanner: 'player' | 'opponent' | null;

  // ── Actions: DuelState ──
  setDuelState: (state: DuelState | null) => void;
  updateDuelState: (partial: Partial<DuelState>) => void;

  // ── Actions: UI ──
  setPlayerCard: (card: SpellType | null) => void;
  setOpponentCard: (card: SpellType | null) => void;
  setResultText: (text: string) => void;
  addEffectMessage: (msg: string) => void;
  clearEffectMessages: () => void;
  setIsGameOver: (isOver: boolean) => void;
  setGameResult: (result: 'WIN' | 'LOSS' | 'DRAW' | null) => void;
  setAIStatus: (partial: Partial<AIStatus>) => void;
  setTargetingData: (data: TargetingData | null) => void;
  setIsProcessing: (v: boolean) => void;

  // ── Actions: Compound ──
  resetBattle: () => void;
}

export const useBattleStore = create<BattleState>((set, get) => ({
  // ── 初始状态 ──
  duelState: null,
  playerCard: null,
  opponentCard: null,
  resultText: '',
  effectMessages: [],
  isGameOver: false,
  gameResult: null,
  aiStatus: initialAIStatus,
  targetingData: null,
  isProcessing: false,

  phase: 'DRAFT_PHASE',
  turnTimeLeft: 0,
  turnBanner: null,

  // ── DuelState actions ──
  setDuelState: (state) => set({ duelState: state }),

  updateDuelState: (partial) => {
    const prev = get().duelState;
    if (!prev) return;
    set({ duelState: { ...prev, ...partial } });
  },

  // ── UI actions ──
  setPlayerCard: (card) => set({ playerCard: card }),
  setOpponentCard: (card) => set({ opponentCard: card }),
  setResultText: (text) => set({ resultText: text }),

  addEffectMessage: (msg) =>
    set((s) => ({
      effectMessages: [...s.effectMessages.slice(-30), msg],
    })),

  clearEffectMessages: () => set({ effectMessages: [] }),

  setIsGameOver: (isOver) => set({ isGameOver: isOver }),
  setGameResult: (result) => set({ gameResult: result }),

  setAIStatus: (partial) =>
    set((s) => ({ aiStatus: { ...s.aiStatus, ...partial } })),

  setTargetingData: (data) => {
    if (get().targetingData === data) return;
    set({ targetingData: data });
  },

  setIsProcessing: (v) => set({ isProcessing: v }),

  // ── Compound ──
  resetBattle: () =>
    set({
      duelState: null,
      playerCard: null,
      opponentCard: null,
      resultText: '',
      effectMessages: [],
      isGameOver: false,
      gameResult: null,
      aiStatus: initialAIStatus,
      targetingData: null,
      isProcessing: false,
      phase: 'DRAFT_PHASE',
      turnTimeLeft: 0,
      turnBanner: null,
    }),
}));
