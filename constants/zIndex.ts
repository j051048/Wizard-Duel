/**
 * 战斗 UI 统一 z-index 层级常量
 *
 * 避免各组件散落定义导致的层级冲突
 */

export const Z_INDEX = {
  /** 背景图 / 环境粒子 */
  BACKGROUND: 0,
  /** 战斗棋盘（随从、中央区域） */
  BOARD: 10,
  /** 棋盘上的交互元素（彩蛋、标记） */
  BOARD_INTERACTIVE: 20,
  /** 手牌区域 */
  HAND: 30,
  /** 战斗信息流 / 特效层 */
  EFFECTS: 40,
  /** HUD（玩家/对手信息框） */
  HUD: 50,
  /** 回合横幅 / 全屏提示 */
  BANNER: 60,
  /** 弹窗 / 模态框 */
  MODAL: 70,
  /** 拖拽中的卡牌 */
  DRAGGING: 80,
  /** 最顶层（Toast、确认框） */
  TOP: 90,
} as const;
