/**
 * Sprite Atlas Configuration
 * 
 * [P1 Fix #14] 图集优化配置
 * 
 * 将频繁使用的小图标打包到 CSS sprite sheet 中，
 * 减少 WebGL Draw Call 和 HTTP 请求数。
 * 
 * 使用方式：
 * 1. 运行 `npm run build:sprites` 生成图集
 * 2. 组件中使用 getSpriteStyle() 获取背景定位
 */

/** UI 图标在图集中的位置映射 */
export const UI_SPRITE_MAP: Record<string, { x: number; y: number; w: number; h: number }> = {
  'mana_active': { x: 0, y: 0, w: 64, h: 64 },
  'mana_inactive': { x: 64, y: 0, w: 64, h: 64 },
  'armor_icon': { x: 128, y: 0, w: 48, h: 48 },
  'hp_icon': { x: 176, y: 0, w: 48, h: 48 },
  'attack_icon': { x: 224, y: 0, w: 48, h: 48 },
  'card_back_mini': { x: 0, y: 64, w: 64, h: 96 },
  'coin_icon': { x: 64, y: 64, w: 48, h: 48 },
  'fatigue_icon': { x: 112, y: 64, w: 48, h: 48 },
};

const ATLAS_PATH = '/ui/sprite_atlas.webp';

/**
 * 获取精灵图的 CSS 背景样式
 */
export function getSpriteStyle(name: string): React.CSSProperties | null {
  const sprite = UI_SPRITE_MAP[name];
  if (!sprite) return null;
  
  return {
    backgroundImage: `url(${ATLAS_PATH})`,
    backgroundPosition: `-${sprite.x}px -${sprite.y}px`,
    backgroundSize: 'auto',
    backgroundRepeat: 'no-repeat',
    width: `${sprite.w}px`,
    height: `${sprite.h}px`,
    display: 'inline-block',
  };
}

/**
 * 预加载图集
 */
export function preloadSpriteAtlas(): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      console.warn('[SpriteAtlas] Atlas not found, falling back to individual images');
      resolve(); // Don't fail - graceful fallback
    };
    img.src = ATLAS_PATH;
  });
}