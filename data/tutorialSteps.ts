import { DuelPhase, GameState } from '../types';

export interface TutorialStepConfig {
  id: string;
  title: string;
  content: string;
  targetId?: string;
  position: 'top' | 'bottom' | 'center' | 'left' | 'right';
  gameState?: GameState; // 需要匹配的全局游戏状态
  triggerPhase?: DuelPhase; // 需要匹配的战斗阶段 (仅当 gameState=DUEL 时有效)
  requireAction?: 'PLAY_CARD' | 'MULLIGAN' | 'END_TURN'; 
  isBlocking?: boolean;
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  // 1. 开场欢迎 (MULLIGAN screen)
  {
    id: 'welcome',
    title: '欢迎来到巫师对决',
    content: '在这个魔法竞技场中，你的目标是将对手的生命值归零。',
    position: 'center',
    gameState: 'MULLIGAN',
    isBlocking: true
  },
  // 2. 起手换牌引导 (MULLIGAN screen)
  {
    id: 'mulligan_explain',
    title: '起手调度',
    content: '点击你不想要的卡牌进行替换，寻找低费法术来建立前期优势。选好后点击"确认"。',
    targetId: 'mulligan-container', 
    position: 'bottom',
    gameState: 'MULLIGAN',
    requireAction: 'MULLIGAN' 
    // 注意：MulliganScreen 组件负责渲染确认按钮，点击确认后会切换 State，从而完成此步
  },
  // 3. 战斗开始 - 手牌介绍
  {
    id: 'hand_intro',
    title: '你的手牌',
    content: '这里是你的法术书。每张卡牌左上角的数字代表消耗的法力值。',
    targetId: 'player-hand-container',
    position: 'top',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    isBlocking: true
  },
  // 4. 法力值介绍
  {
    id: 'mana_intro',
    title: '法力水晶',
    content: '越强大的法术消耗越多。法力值每回合会自动恢复并增加上限。',
    targetId: 'header-mana-display', // App Header
    position: 'bottom',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    isBlocking: true
  },
  // 5. 出牌引导
  {
    id: 'play_card_guide',
    title: '释放魔法！',
    content: '拖拽一张亮起的卡牌到战场中央，或者双击它来攻击对手！',
    targetId: 'battle-board-area',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    requireAction: 'PLAY_CARD'
  },
  // 6. 回合结束引导
  {
    id: 'end_turn_guide',
    title: '结束回合',
    content: '当你没有法力值或不想再出牌时，点击这里把行动权交给对手。',
    targetId: 'end-turn-btn',
    position: 'left',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    requireAction: 'END_TURN'
  },
  // 7. 胜利条件 (第二回合)
  {
    id: 'win_condition',
    title: '属性克制',
    content: '记住：水克火，火克草，草克水。利用属性克制可以造成双倍伤害！',
    position: 'center',
    gameState: 'DUEL',
    triggerPhase: 'PLAYER_TURN',
    isBlocking: true
  }
];
