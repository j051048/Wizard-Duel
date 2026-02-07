import { DuelPhase, GameState } from '../types';

/**
 * 新手教程配置 (v2.0)
 * 
 * [P0 Balance] 完整的强制引导教程，覆盖前3回合核心玩法
 */

export interface TutorialStepConfig {
  id: string;
  title: string;
  content: string;
  targetId?: string;
  highlightSelector?: string; // CSS选择器，用于高亮特定元素
  position: 'top' | 'bottom' | 'center' | 'left' | 'right';
  gameState?: GameState;
  triggerPhase?: DuelPhase;
  triggerRound?: number; // 指定回合数触发
  requireAction?: 'PLAY_CARD' | 'MULLIGAN' | 'END_TURN' | 'ANY';
  isBlocking?: boolean;
  showArrow?: boolean;
  delay?: number; // 延迟显示(ms)
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  // ============ 阶段0: 换牌引导 ============
  {
    id: 'welcome',
    title: '🧙‍♂️ 欢迎，年轻的法师！',
    content: '你即将踏入魔法竞技场。你的目标是用元素法术将对手的生命值降至 0。准备好了吗？',
    position: 'center',
    gameState: 'MULLIGAN',
    isBlocking: true,
    delay: 500
  },
  {
    id: 'mulligan_explain',
    title: '📜 调度你的起手牌',
    content: '点击不想要的卡牌将其替换。\n\n💡 小贴士：优先保留 1-2 费的低费卡牌，确保前期能顺畅出牌！',
    targetId: 'mulligan-container',
    position: 'bottom',
    gameState: 'MULLIGAN',
    requireAction: 'MULLIGAN',
    showArrow: true
  },

  // ============ 阶段1: 第一回合 - 基础出牌 ============
  {
    id: 'battle_start',
    title: '⚔️ 战斗开始！',
    content: '这是你的首次对决。让我们一步步学习如何战斗。',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 1,
    isBlocking: true,
    delay: 300
  },
  {
    id: 'hand_intro',
    title: '🃏 你的手牌',
    content: '屏幕下方是你的法术卡牌。\n\n蓝色数字 = 法力消耗\n红色数字 = 伤害值\n\n亮起的卡牌表示你现在能使用！',
    targetId: 'player-hand-container',
    highlightSelector: '[id^="card-"]',
    position: 'top',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 1,
    isBlocking: true,
    showArrow: true
  },
  {
    id: 'mana_intro',
    title: '💎 法力水晶',
    content: '左下角显示你的法力值。\n\n每回合开始时，法力会完全恢复，并且上限+1（最高10）。\n\n第1回合你有 1 点法力，规划好你的出牌节奏！',
    targetId: 'player-mana-display',
    position: 'right',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 1,
    isBlocking: true,
    showArrow: true
  },
  {
    id: 'play_first_card',
    title: '✨ 释放你的第一个法术！',
    content: '拖拽一张亮起的卡牌到屏幕中央区域，或者直接点击它来使用。\n\n试试看吧！',
    targetId: 'battle-board-area',
    highlightSelector: '.card-playable',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 1,
    requireAction: 'PLAY_CARD',
    showArrow: true
  },
  {
    id: 'end_turn_intro',
    title: '⏭️ 结束回合',
    content: '打出卡牌后，点击「结束回合」按钮把行动权交给对手。\n\n或者你也可以继续出牌（如果法力足够的话）。',
    targetId: 'end-turn-btn-desktop',
    position: 'left',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 1,
    requireAction: 'END_TURN',
    showArrow: true
  },

  // ============ 阶段2: 第二回合 - 属性克制 ============
  {
    id: 'element_intro',
    title: '🔥❄️⚡ 五元素相克',
    content: '记住这个克制链：\n\n🔥火 → 🌿藤 → ❄️冰 → ⚡雷 → 🪨石 → 🔥火\n\n克制对手上一张牌的元素会造成 150% 暴击伤害！',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 2,
    isBlocking: true
  },
  {
    id: 'opponent_last_spell',
    title: '👁️ 观察对手',
    content: '屏幕上方显示对手上一回合使用的卡牌。\n\n思考一下：你手里有什么能克制它的法术吗？',
    targetId: 'opponent-last-spell',
    position: 'bottom',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 2,
    isBlocking: true,
    showArrow: true
  },
  {
    id: 'try_counter',
    title: '🎯 尝试克制！',
    content: '现在轮到你了。选择一张能克制对手的卡牌，体验暴击的快感！',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 2,
    requireAction: 'PLAY_CARD'
  },

  // ============ 阶段3: 第三回合 - 进阶机制 ============
  {
    id: 'mechanic_intro',
    title: '🔮 特殊机制',
    content: '每张卡牌都有独特的机制效果：\n\n🔥 灼烧 - 持续伤害\n❄️ 冻结 - 跳过行动\n🌿 缠绕 - 增加费用\n⚡ 充能 - 连击加成\n🪨 坚韧 - 获得护甲',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 3,
    isBlocking: true
  },
  {
    id: 'hp_armor_intro',
    title: '❤️ 生命与护甲',
    content: '注意你和对手的生命值！\n\n灰色数字是护甲 - 护甲会先于生命值承受伤害。\n\n当任意一方生命值归0时，游戏结束！',
    targetId: 'player-hp-display',
    position: 'right',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 3,
    isBlocking: true,
    showArrow: true
  },
  {
    id: 'tutorial_complete',
    title: '🎉 教程完成！',
    content: '你已经掌握了基本战斗技巧！\n\n接下来的战斗就靠你自己了。\n\n祝你好运，法师！🧙‍♂️',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 3,
    isBlocking: true
  }
];

/**
 * 获取当前应该显示的教程步骤
 */
export const getActiveTutorialStep = (
  steps: TutorialStepConfig[],
  completedSteps: Set<string>,
  currentState: GameState,
  currentPhase: DuelPhase | null,
  currentRound: number
): TutorialStepConfig | null => {
  for (const step of steps) {
    // 已完成的跳过
    if (completedSteps.has(step.id)) continue;
    
    // 检查游戏状态
    if (step.gameState && step.gameState !== currentState) continue;
    
    // 检查战斗阶段
    if (step.triggerPhase && step.triggerPhase !== currentPhase) continue;
    
    // 检查回合数
    if (step.triggerRound !== undefined && step.triggerRound !== currentRound) continue;
    
    return step;
  }
  return null;
};
