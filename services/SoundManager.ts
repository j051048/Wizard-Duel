/**
 * SoundManager - 游戏音效管理服务
 * 
 * 提供游戏中的音效播放功能
 */

type SoundKey = 
  | 'turn_start'
  | 'card_play'
  | 'card_draw'
  | 'damage'
  | 'heal'
  | 'victory'
  | 'defeat'
  | 'button_click';

// 音效文件映射
const SOUND_MAP: Record<SoundKey, string> = {
  turn_start: '/sounds/turn_start.mp3',
  card_play: '/sounds/card_play.mp3',
  card_draw: '/sounds/card_draw.mp3',
  damage: '/sounds/damage.mp3',
  heal: '/sounds/heal.mp3',
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
  button_click: '/sounds/button_click.mp3'
};

// 音效缓存
const audioCache: Map<string, HTMLAudioElement> = new Map();

// 全局静音状态
let isMuted = false;

// 全局音量 (0-1)
let globalVolume = 0.5;

export const SoundManager = {
  /**
   * 播放指定音效
   */
  play(key: SoundKey, volume: number = 1): void {
    if (isMuted) return;
    
    const path = SOUND_MAP[key];
    if (!path) {
      console.warn(`[SoundManager] Unknown sound key: ${key}`);
      return;
    }
    
    try {
      // 尝试从缓存获取或创建新的 Audio 实例
      let audio = audioCache.get(path);
      
      if (!audio) {
        audio = new Audio(path);
        audio.preload = 'auto';
        audioCache.set(path, audio);
      }
      
      // 克隆以支持重叠播放
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = Math.min(1, Math.max(0, volume * globalVolume));
      
      // 播放并在结束后清理
      clone.play().catch(e => {
        // 用户未交互时可能无法自动播放，静默处理
        console.debug(`[SoundManager] Cannot play sound: ${e.message}`);
      });
      
      clone.onended = () => {
        clone.remove();
      };
    } catch (e) {
      console.debug(`[SoundManager] Error playing sound: ${key}`, e);
    }
  },
  
  /**
   * 预加载音效
   */
  preload(keys: SoundKey[]): void {
    keys.forEach(key => {
      const path = SOUND_MAP[key];
      if (path && !audioCache.has(path)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audioCache.set(path, audio);
      }
    });
  },
  
  /**
   * 预加载所有音效
   */
  preloadAll(): void {
    this.preload(Object.keys(SOUND_MAP) as SoundKey[]);
  },
  
  /**
   * 设置静音状态
   */
  setMuted(muted: boolean): void {
    isMuted = muted;
  },
  
  /**
   * 获取静音状态
   */
  getMuted(): boolean {
    return isMuted;
  },
  
  /**
   * 设置全局音量
   */
  setVolume(volume: number): void {
    globalVolume = Math.min(1, Math.max(0, volume));
  },
  
  /**
   * 获取全局音量
   */
  getVolume(): number {
    return globalVolume;
  }
};
