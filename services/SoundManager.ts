/**
 * SoundManager - 游戏音效管理服务
 * 
 * 提供游戏中的音效播放功能
 * [P1-22] 新增回合结束音效
 * [P3 Fix #24] 添加更多音效类型
 */

type SoundKey = 
  | 'turn_start'
  | 'turn_end'
  | 'card_play'
  | 'card_draw'
  | 'damage'
  | 'heal'
  | 'victory'
  | 'defeat'
  | 'button_click'
  // [P3 Fix #24] 新增音效
  | 'freeze'
  | 'burn'
  | 'crit'
  | 'combo'
  | 'counter'
  | 'projectile'
  | 'shield'
  | 'level_up'
  | 'pack_open'
  | 'card_reveal';

// 音效文件映射 - 映射到实际存在的音频文件
// [P3 Fix #24] 新增音效映射（部分复用现有音效）
const SOUND_MAP: Record<SoundKey, string> = {
  turn_start: '/audio/sfx-card-play.mp3',
  turn_end: '/audio/sfx-block.mp3',
  card_play: '/audio/sfx-card-play.mp3',
  card_draw: '/audio/sfx-card-play.mp3',
  damage: '/audio/sfx-hit.mp3',
  heal: '/audio/sfx-block.mp3',
  victory: '/audio/sfx-victory.mp3',
  defeat: '/audio/sfx-defeat.mp3',
  button_click: '/audio/sfx-card-play.mp3',
  // 新增音效 - 暂时复用现有音效，未来可替换为专用音效
  freeze: '/audio/sfx-block.mp3',
  burn: '/audio/sfx-hit.mp3',
  crit: '/audio/sfx-hit.mp3',
  combo: '/audio/sfx-card-play.mp3',
  counter: '/audio/sfx-block.mp3',
  projectile: '/audio/sfx-hit.mp3',
  shield: '/audio/sfx-block.mp3',
  level_up: '/audio/sfx-victory.mp3',
  pack_open: '/audio/sfx-card-play.mp3',
  card_reveal: '/audio/sfx-card-play.mp3',
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
  },

  // ============ [P2 Fix #21] Dynamic BGM System ============
  
  /** 当前 BGM 状态 */
  _currentBGMState: 'neutral' as 'neutral' | 'advantage' | 'danger' | 'lethal',
  _bgmAudio: null as HTMLAudioElement | null,
  _bgmFadeInterval: null as NodeJS.Timeout | null,
  
  /**
   * [P2 Fix #21] 根据游戏局势动态切换 BGM 节奏
   * 每次状态更新时调用，会自动判断是否需要切换音乐
   */
  updateBattleBGM(playerHP: number, opponentHP: number, maxHP: number): void {
    if (isMuted) return;
    
    const playerRatio = playerHP / maxHP;
    const opponentRatio = opponentHP / maxHP;
    
    let newState: typeof this._currentBGMState = 'neutral';
    
    // 斩杀线：对手血量 <= 30%
    if (opponentRatio <= 0.3 && playerRatio > 0.3) {
      newState = 'lethal';
    }
    // 劣势：玩家血量 <= 30%
    else if (playerRatio <= 0.3) {
      newState = 'danger';
    }
    // 优势：玩家血量领先较多
    else if (playerRatio - opponentRatio > 0.3) {
      newState = 'advantage';
    }
    
    // 状态没变则不切换
    if (newState === this._currentBGMState) return;
    this._currentBGMState = newState;
    
    // 动态调整 BGM 参数（在没有多首 BGM 的情况下，调整音量和播放速率来模拟气氛变化）
    if (this._bgmAudio) {
      const audio = this._bgmAudio;
      switch (newState) {
        case 'danger':
          audio.playbackRate = 1.1;
          audio.volume = Math.min(1, globalVolume * 0.8);
          break;
        case 'lethal':
          audio.playbackRate = 1.2;
          audio.volume = Math.min(1, globalVolume * 1.0);
          break;
        case 'advantage':
          audio.playbackRate = 1.0;
          audio.volume = Math.min(1, globalVolume * 0.6);
          break;
        default:
          audio.playbackRate = 1.0;
          audio.volume = Math.min(1, globalVolume * 0.5);
          break;
      }
    }
  },

  /**
   * 开始播放战斗 BGM
   */
  startBattleBGM(): void {
    if (isMuted) return;
    try {
      if (this._bgmAudio) {
        this._bgmAudio.pause();
      }
      this._bgmAudio = new Audio('/audio/bgm-battle.mp3');
      this._bgmAudio.loop = true;
      this._bgmAudio.volume = globalVolume * 0.5;
      this._currentBGMState = 'neutral';
      this._bgmAudio.play().catch(() => {
        console.debug('[SoundManager] BGM autoplay blocked');
      });
    } catch (e) {
      console.debug('[SoundManager] BGM error:', e);
    }
  },

  /**
   * 停止战斗 BGM
   */
  stopBattleBGM(): void {
    if (this._bgmAudio) {
      this._bgmAudio.pause();
      this._bgmAudio.currentTime = 0;
      this._bgmAudio = null;
    }
    this._currentBGMState = 'neutral';
  }
};
