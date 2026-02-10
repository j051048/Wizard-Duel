/**
 * OffscreenRenderer - 离屏渲染管理器
 * 
 * [P3 Fix #28] 复杂纹理在后台静默生成，主画布只负责贴图
 * 
 * 用途：
 * - 卡牌立绘预渲染（缩放+滤镜）
 * - 背景特效预合成
 * - 粒子轨迹预计算
 */

export class OffscreenRenderer {
  private _canvas: OffscreenCanvas | HTMLCanvasElement;
  private _ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  private _isOffscreen: boolean;

  constructor(width: number, height: number) {
    // 检测 OffscreenCanvas 支持
    this._isOffscreen = typeof OffscreenCanvas !== 'undefined';
    
    if (this._isOffscreen) {
      this._canvas = new OffscreenCanvas(width, height);
      this._ctx = this._canvas.getContext('2d')!;
    } else {
      // Fallback: 普通隐藏 Canvas
      this._canvas = document.createElement('canvas');
      this._canvas.width = width;
      this._canvas.height = height;
      this._ctx = this._canvas.getContext('2d')!;
    }
  }

  get ctx(): OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D {
    return this._ctx;
  }

  get width(): number {
    return this._canvas.width;
  }

  get height(): number {
    return this._canvas.height;
  }

  /**
   * 调整画布尺寸
   */
  resize(width: number, height: number): void {
    this._canvas.width = width;
    this._canvas.height = height;
  }

  /**
   * 清空画布
   */
  clear(): void {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }

  /**
   * 将离屏画布内容绘制到目标 Canvas
   */
  drawTo(
    targetCtx: CanvasRenderingContext2D,
    dx: number = 0,
    dy: number = 0,
    dw?: number,
    dh?: number
  ): void {
    if (dw !== undefined && dh !== undefined) {
      targetCtx.drawImage(this._canvas as any, dx, dy, dw, dh);
    } else {
      targetCtx.drawImage(this._canvas as any, dx, dy);
    }
  }

  /**
   * 导出为 ImageBitmap（高性能贴图）
   */
  async toImageBitmap(): Promise<ImageBitmap | null> {
    if (this._isOffscreen && 'transferToImageBitmap' in this._canvas) {
      return (this._canvas as OffscreenCanvas).transferToImageBitmap();
    }
    
    // Fallback
    if (typeof createImageBitmap !== 'undefined') {
      return createImageBitmap(this._canvas as HTMLCanvasElement);
    }
    
    return null;
  }

  /**
   * 预渲染卡牌立绘（缩放+应用滤镜）
   */
  async prerenderCardArt(
    imageSrc: string,
    targetWidth: number,
    targetHeight: number,
    filters?: {
      brightness?: number;
      saturate?: number;
      hueRotate?: number;
    }
  ): Promise<ImageBitmap | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        this.resize(targetWidth, targetHeight);
        this.clear();

        // 应用滤镜
        if (filters) {
          const filterParts: string[] = [];
          if (filters.brightness !== undefined) filterParts.push(`brightness(${filters.brightness})`);
          if (filters.saturate !== undefined) filterParts.push(`saturate(${filters.saturate})`);
          if (filters.hueRotate !== undefined) filterParts.push(`hue-rotate(${filters.hueRotate}deg)`);
          this._ctx.filter = filterParts.join(' ') || 'none';
        }

        this._ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        this._ctx.filter = 'none';

        const bitmap = await this.toImageBitmap();
        resolve(bitmap);
      };
      img.onerror = () => resolve(null);
      img.src = imageSrc;
    });
  }

  /**
   * 预渲染径向渐变背景
   */
  prerenderGradientBackground(
    colors: string[],
    width: number,
    height: number
  ): void {
    this.resize(width, height);
    this.clear();
    
    const gradient = this._ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
    
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });
    
    this._ctx.fillStyle = gradient;
    this._ctx.fillRect(0, 0, width, height);
  }
}

// 全局缓存：预渲染的纹理
const textureCache = new Map<string, ImageBitmap>();

/**
 * 获取或创建预渲染纹理
 */
export async function getOrCreateTexture(
  key: string,
  factory: () => Promise<ImageBitmap | null>
): Promise<ImageBitmap | null> {
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }
  
  const bitmap = await factory();
  if (bitmap) {
    textureCache.set(key, bitmap);
  }
  return bitmap;
}

/**
 * 清除纹理缓存
 */
export function clearTextureCache(): void {
  textureCache.forEach(bitmap => bitmap.close());
  textureCache.clear();
}