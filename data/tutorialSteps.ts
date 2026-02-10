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
    content: '屏幕下方是你的法术卡牌。\n\n蓝色数字 = 法力消耗\n红色数字 = 伤害值\n\n绿色边框的卡牌表示你现在能使用！',
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
    content: '每回合开始时法力完全恢复，上限+1（最高10）。\n\n第1回合你有 1 点法力，只能使用低费卡牌！',
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
    content: '📱 手机：点击卡牌选中，再点一次确认出牌\n💻 电脑：拖拽卡牌到战场，或双击出牌\n\n试试看吧！',
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
    content: '出完牌后，点击「结束回合」把行动权交给对手。\n\n💡 你也可以连续出多张牌（如果法力够的话）！',
    targetId: 'end-turn-btn',
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
    content: '记住克制链：\n\n🔥火 → 🌿藤 → ❄️冰 → ⚡雷 → 🪨石 → 🔥火\n\n克制对手上一张牌会造成 150% 暴击！\n\n💡 屏幕右侧会显示克制提示',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 2,
    isBlocking: true
  },
  {
    id: 'opponent_info',
    title: '👁️ 知己知彼',
    content: '顶部显示对手的血量、法力和手牌数。\n\n观察对手手牌数量，判断他的资源是否充裕！',
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
    content: '选一张能克制对手的卡牌，体验暴击快感！',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 2,
    requireAction: 'PLAY_CARD'
  },

  // ============ 阶段3: 第三回合 - 进阶机制 ============
  {
    id: 'mechanic_intro',
    title: '🔮 卡牌特殊效果',
    content: '每张卡都有独特机制：\n\n🔥 灼烧 - 回合末持续伤害\n❄️ 冻结 - 对手跳过行动\n🌿 缠绕 - 增加对手出牌费用\n⚡ 充能 - 连续出雷系伤害翻倍\n🪨 坚韧 - 获得护甲（先于血量承伤）',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    triggerRound: 3,
    isBlocking: true
  },
  {
    id: 'hero_skill_intro',
    title: '⭐ 英雄技能',
    content: '左下角有英雄技能，每回合可使用一次。\n\n花2法力获得额外效果，善用它们！',
    targetId: 'hero-skills-container',
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
    content: '你已经掌握了基本战斗技巧！\n\n记住：\n• 管理法力，合理出牌\n• 利用元素克制造成暴击\n• 善用英雄技能\n\n祝你好运，法师！🧙‍♂️',
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
