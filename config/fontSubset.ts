/**
 * Font Subsetting Configuration
 * 
 * [P3 Fix #29] 字体子集化
 * 
 * 游戏内只使用有限的字符集，通过子集化减小字体文件体积：
 * - Cinzel (巫师标题字体): 只需英文大写 + 数字 + 少量符号
 * - Space Grotesk (科技字体): 英文 + 数字 + 常用符号
 * 
 * 使用方式：
 * 1. 安装 glyphhanger: npm i -g glyphhanger
 * 2. 运行: glyphhanger --whitelist="$(cat font-whitelist.txt)" --subset=fonts/Cinzel.woff2
 * 3. 或在 Google Fonts URL 中使用 &text= 参数
 */

/** Cinzel 字体需要的字符 (标题、排名、UI) */
export const CINZEL_CHARSET = [
  // 英文大写
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  // 英文小写
  'abcdefghijklmnopqrstuvwxyz',
  // 数字
  '0123456789',
  // 常用符号
  '!?.:/-+×#',
  // 游戏专用词汇
  'VICTORY DEFEAT DRAW ROUND COMBO CRITICAL',
].join('');

/** Space Grotesk 字体需要的字符 (数据、统计) */
export const SPACE_GROTESK_CHARSET = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  '0123456789',
  '+-×÷=<>()[]{}',
  '.:,;!?@#$%&*/',
  'HP MP ATK DEF MMR ELO PTS',
].join('');

/** 去重并排序字符集 */
function uniqueChars(str: string): string {
  return [...new Set(str.replace(/\s/g, ''))].sort().join('');
}

/** 
 * 生成 Google Fonts 子集化 URL
 * 使用 &text= 参数只加载需要的字形
 */
export function getSubsetFontURL(): string {
  const cinzelChars = encodeURIComponent(uniqueChars(CINZEL_CHARSET));
  const spaceChars = encodeURIComponent(uniqueChars(SPACE_GROTESK_CHARSET));
  
  return `https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Space+Grotesk:wght@300;400;600&text=${cinzelChars}${spaceChars}&display=swap`;
}

/**
 * 获取完整字体 URL（开发模式或需要中文时）
 */
export function getFullFontURL(): string {
  return 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Space+Grotesk:wght@300;400;600&display=swap';
}

/**
 * 根据环境选择字体加载策略
 */
export function getFontURL(useSubset: boolean = true): string {
  if (!useSubset) return getFullFontURL();
  
  // 生产环境使用子集化
  return typeof import.meta?.env?.PROD === 'boolean' && import.meta.env.PROD
    ? getSubsetFontURL()
    : getFullFontURL();
}