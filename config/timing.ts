/**
 * Wizard Duel - 动画与时间常量
 * 
 * 所有 UI 动画延迟、超时时间统一管理
 * 消除魔法数字，便于全局调优
 */

// ============ 回合横幅 ============
/** 玩家回合横幅显示持续时间 (ms) */
export const TURN_BANNER_PLAYER_DURATION = 2500;
/** 对手回合横幅显示持续时间 (ms) */
export const TURN_BANNER_OPPONENT_DURATION = 1800;
/** TurnManager 内部横幅显示时间 (ms) */
export const TURN_BANNER_DEFAULT_DURATION = 1500;

// ============ AI 节奏 ============
/** AI 思考初始等待时间 (ms) */
export const AI_THINK_DELAY = 1500;
/** AI 每张牌之间的间隔 (ms) */
export const AI_CARD_PLAY_DELAY = 1500;
/** AI 思考气泡切换延迟 (ms) */
export const AI_EMOTE_DELAY = 1000;

// ============ 动画队列 ============
/** 默认动作间隔 (ms) */
export const QUEUE_DEFAULT_DELAY = 450;
/** UPDATE_STATE 类型动作的推荐延迟 (ms) */
export const QUEUE_STATE_DELAY = 200;
/** ADD_MESSAGE 类型动作的推荐延迟 (ms) */
export const QUEUE_MESSAGE_DELAY = 600;
/** 回合结束后到新回合开始的等待 (ms) */
export const ROUND_TRANSITION_DELAY = 1000;

// ============ 交互 ============
/** 长按触发详情弹窗的时间 (ms) */
export const LONG_PRESS_THRESHOLD = 600;
/** 随从攻击之间的间隔 (ms) */
export const MINION_ATTACK_DELAY = 300;
/** 随从战斗阶段开始前的等待 (ms) */
export const MINION_COMBAT_START_DELAY = 500;

// ============ 回合与阶段 ============
/** showTurnBanner 后到切换 phase 的等待 (ms) */
export const PHASE_TRANSITION_DELAY = 200;
/** 横幅动画后到实际开始的等待 (ms) */
export const BANNER_WAIT_DELAY = 1500;

// ============ 回合计时器 ============
/** 玩家回合时限 (秒) */
export const TURN_DURATION_SECONDS = 60;
/** 换牌阶段时限 (秒) */
export const MULLIGAN_DURATION_SECONDS = 30;