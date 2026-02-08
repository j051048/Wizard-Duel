/**
 * CardSize Token - 统一卡牌尺寸标准
 * 
 * [P1-19] 所有卡牌组件应引用此配置，确保尺寸一致
 */

export const CARD_SIZES = {
  /** 迷你尺寸 - 对手手牌背面、内嵌展示 */
  mini: {
    width: 'w-12',
    height: 'h-18',
    widthPx: 48,
    heightPx: 72,
  },
  /** 小尺寸 - 移动端手牌、战场展示 */
  small: {
    width: 'w-16',
    height: 'h-24',
    widthPx: 64,
    heightPx: 96,
  },
  /** 中等尺寸 - 桌面端手牌 */
  medium: {
    width: 'w-24 sm:w-32',
    height: 'h-36 sm:h-44',
    widthPx: 96,
    heightPx: 144,
  },
  /** 大尺寸 - 桌面端详情、卡牌预览 */
  large: {
    width: 'w-32 sm:w-40',
    height: 'h-44 sm:h-56',
    widthPx: 128,
    heightPx: 176,
  },
  /** 特大 - 卡牌详情弹窗 */
  xlarge: {
    width: 'w-48 sm:w-56',
    height: 'h-64 sm:h-80',
    widthPx: 192,
    heightPx: 256,
  },
} as const;

export type CardSizeKey = keyof typeof CARD_SIZES;

/**
 * 获取卡牌尺寸 class 字符串
 */
export const getCardSizeClass = (size: CardSizeKey): string => {
  const s = CARD_SIZES[size];
  return `${s.width} ${s.height}`;
};

/**
 * 根据是否移动端自动选择尺寸
 */
export const getResponsiveCardSize = (isMobile: boolean, context: 'hand' | 'board' | 'preview'): CardSizeKey => {
  if (context === 'hand') {
    return isMobile ? 'small' : 'large';
  }
  if (context === 'board') {
    return isMobile ? 'small' : 'medium';
  }
  if (context === 'preview') {
    return isMobile ? 'medium' : 'xlarge';
  }
  return 'medium';
};
