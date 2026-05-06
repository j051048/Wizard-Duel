/**
 * useAudioManager - 专业级音效管理 Hook
 * 
 * 特性：
 * - BGM 背景音乐管理
 * - SFX 音效播放（带冷却机制）
 * - 音量控制
 * - 音效队列（防止重叠）
 * - 优先级系统
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { SpellType } from '../types';
import { SFX_DEFS, LEGACY_SFX_MAP, randRange } from '../config/sfxRegistry';

// 音效配置
// 使用单例管理 AudioContext 以防止 iOS 崩溃
let globalAudioCtx: AudioContext | null = null;
const getAudioContext = () => {
    if (!globalAudioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            globalAudioCtx = new AudioContextClass();
        }
    }
    return globalAudioCtx;
};

// ─── WebM/Opus format detection (checked once at first hook render) ───
let _webmSupported: boolean | null = null;
const isWebmSupported = (): boolean => {
  if (_webmSupported === null) {
    const a = document.createElement('audio');
    _webmSupported = !!a.canPlayType && a.canPlayType('audio/webm; codecs="opus"') !== '';
  }
  return _webmSupported;
};

/**
 * Resolve an MP3 path to WebM if supported, falling back to the original.
 * Only transforms paths that end in '.mp3' and whose .webm counterpart exists.
 */
const RESOLVABLE_PATHS = new Set([
  '/audio/bgm-lobby.webm',
  '/audio/bgm-battle_tavern.webm',
  '/audio/sfx-hit.webm',
]);

const resolveSrc = (src: string): string => {
  if (!src.endsWith('.mp3') || !isWebmSupported()) return src;
  const webmSrc = src.replace(/\.mp3$/, '.webm');
  return RESOLVABLE_PATHS.has(webmSrc) ? webmSrc : src;
};

// SFX mapping with optional rate/volume overrides for pitch-variant reuse
interface SfxMapping {
  src: string;
  rate?: number;   // playbackRate (1.0 = normal)
  volume?: number; // volume multiplier (1.0 = use global sfxVolume)
}

const sfxFile = (src: string, rate?: number, volume?: number): SfxMapping => ({ src, rate, volume });

const AUDIO_CONFIG = {
  bgm: {
    lobby: '/audio/bgm-lobby.mp3',
    battle: '/audio/bgm-battle_tavern.mp3',
  },
  sfx: {
    cardPlay: sfxFile('/audio/sfx-card-play.mp3'),
    hit: sfxFile('/audio/sfx-hit.mp3'),
    block: sfxFile('/audio/sfx-block.mp3'),
    victory: sfxFile('/audio/sfx-victory.mp3'),
    defeat: sfxFile('/audio/sfx-defeat.mp3'),
    turn_start: sfxFile('/audio/sfx-card-play.mp3', 0.9, 0.6),
    turn_end: sfxFile('/audio/sfx-block.mp3', 0.8, 0.4),
    card_draw: sfxFile('/audio/sfx-card-play.mp3', 1.2, 0.5),
    button_click: sfxFile('/audio/sfx-card-play.mp3', 1.1, 0.3),
    damage: sfxFile('/audio/sfx-hit.mp3'),
    heal: sfxFile('/audio/sfx-block.mp3', 1.1, 0.7),
    freeze: sfxFile('/audio/sfx-block.mp3', 0.9, 0.8),
    burn: sfxFile('/audio/sfx-hit.mp3', 1.1, 0.7),
    crit: sfxFile('/audio/sfx-hit.mp3', 0.7, 1.0),
    combo: sfxFile('/audio/sfx-card-play.mp3', 1.5, 0.8),
    counter: sfxFile('/audio/sfx-block.mp3', 1.2, 0.8),
    projectile: sfxFile('/audio/sfx-hit.mp3'),
    shield: sfxFile('/audio/sfx-block.mp3'),
    level_up: sfxFile('/audio/sfx-victory.mp3'),
    pack_open: sfxFile('/audio/sfx-card-play.mp3'),
    card_reveal: sfxFile('/audio/sfx-card-play.mp3'),
    // [P0.3] UI interaction SFX
    page_transition: sfxFile('/audio/sfx-card-play.mp3', 0.7, 0.25),
    modal_open: sfxFile('/audio/sfx-block.mp3', 1.3, 0.3),
    modal_close: sfxFile('/audio/sfx-block.mp3', 0.9, 0.2),
    pack_hover: sfxFile('/audio/sfx-card-play.mp3', 1.6, 0.15),
    // [P0-3] New SFX mappings
    minion_attack: sfxFile('/audio/sfx-hit.mp3', 1.2, 0.8),
    minion_death: sfxFile('/audio/sfx-block.mp3', 0.8, 0.6),
    status_burn: sfxFile('/audio/sfx-spell-fire.mp3', 1.1, 0.6),
    status_freeze: sfxFile('/audio/sfx-spell-ice.mp3', 0.9, 0.6),
    status_poison: sfxFile('/audio/sfx-spell-vine.mp3', 1.0, 0.6),
    hero_skill: sfxFile('/audio/sfx-card-play.mp3', 0.7, 0.9),
    combo_streak: sfxFile('/audio/sfx-hit.mp3', 1.5, 0.8),
    shield_break: sfxFile('/audio/sfx-block.mp3', 1.3, 0.9),
    crit_hit: sfxFile('/audio/sfx-hit.mp3', 0.7, 1.0),
    secret_trigger: sfxFile('/audio/sfx-spell-thunder.mp3', 1.0, 1.0),
    secret_play: sfxFile('/audio/sfx-card-play.mp3', 0.8, 0.7),
    summon: sfxFile('/audio/sfx-spell-rock.mp3', 1.0, 0.8),
    deathrattle: sfxFile('/audio/sfx-spell-fire.mp3', 0.6, 0.9),
    silence_sfx: sfxFile('/audio/sfx-block.mp3', 1.4, 0.7),
    aoe_hit: sfxFile('/audio/sfx-spell-fire.mp3', 0.9, 1.0),
    divine_shield_block: sfxFile('/audio/sfx-block.mp3', 1.5, 0.9),
    tangle: sfxFile('/audio/sfx-spell-vine.mp3', 0.8, 0.7),
    // [P2.1] Audio SFX expansion
    card_hover: sfxFile('/audio/sfx-card-play.mp3', 1.4, 0.1),
    card_play_fire: sfxFile('/audio/sfx-spell-fire.mp3', 1.0, 0.9),
    card_play_vine: sfxFile('/audio/sfx-spell-vine.mp3', 1.0, 0.9),
    card_play_ice: sfxFile('/audio/sfx-spell-ice.mp3', 1.0, 0.9),
    card_play_thunder: sfxFile('/audio/sfx-spell-thunder.mp3', 1.0, 0.9),
    card_play_rock: sfxFile('/audio/sfx-spell-rock.mp3', 1.0, 0.9),
    pack_open_special: sfxFile('/audio/sfx-victory.mp3', 1.2, 1.0),
    achievement_unlock: sfxFile('/audio/sfx-victory.mp3', 0.8, 1.0),
    rank_up: sfxFile('/audio/sfx-victory.mp3', 1.0, 1.0),
    discover_select: sfxFile('/audio/sfx-card-play.mp3', 1.1, 0.7),
    combo_x5: sfxFile('/audio/sfx-hit.mp3', 2.0, 1.0),
    lifesteal: sfxFile('/audio/sfx-spell-vine.mp3', 0.7, 0.8),
    spell: {
      fire: '/audio/sfx-spell-fire.mp3',
      vine: '/audio/sfx-spell-vine.mp3',
      ice: '/audio/sfx-spell-ice.mp3',
      thunder: '/audio/sfx-spell-thunder.mp3',
      rock: '/audio/sfx-spell-rock.mp3',
      skip: '/audio/sfx-card-play.mp3',
      healing: '/audio/sfx-spell-ice.mp3',
      aoe: '/audio/sfx-spell-fire.mp3',
      draw: '/audio/sfx-card-play.mp3',
      silence: '/audio/sfx-spell-rock.mp3',
      hero_fire: '/audio/sfx-spell-fire.mp3',
      hero_vine: '/audio/sfx-spell-vine.mp3',
      hero_ice: '/audio/sfx-spell-ice.mp3',
      hero_thunder: '/audio/sfx-spell-thunder.mp3',
      hero_rock: '/audio/sfx-spell-rock.mp3',
    } as Record<string, string>,
  },
  cooldowns: {
    cardPlay: 500,
    hit: 600,
    block: 600,
    spell: 800,
    victory: 2000,
    defeat: 2000,
    minion_attack: 400,
    minion_death: 500,
    crit_hit: 800,
    combo_streak: 600,
    card_hover: 200,
    achievement_unlock: 2000,
    rank_up: 2000,
    pack_open_special: 2000,
    combo_x5: 800,
    discover_select: 400,
  } as Record<string, number>,
};

// 音效优先级（数字越大优先级越高）
const SFX_PRIORITY: Record<string, number> = {
  victory: 10,
  defeat: 10,
  hit: 5,
  block: 5,
  spell: 4,
  cardPlay: 2,
};

export interface AudioManagerState {
  isMuted: boolean;
  bgmVolume: number;
  sfxVolume: number;
  isPlaying: boolean;
}

export interface SfxOverrides {
  rate?: number;
  volume?: number;
}

export interface AudioManagerActions {
  toggleMute: () => void;
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  playBgm: (track: 'lobby' | 'battle') => void;
  stopBgm: () => void;
  playSfx: (effect: string, overrides?: SfxOverrides) => void;
  playSpellSfx: (spellType: SpellType) => void;
  updateBattleBGM: (playerHP: number, opponentHP: number, maxHP: number) => void;
}

// Module-level bridge for non-hook consumers (TurnBanner, Lobby, etc.)
// Populated by the hook on first render
export const audioBridge = {
  playSfx: (_effect: string, _overrides?: SfxOverrides) => {},
  updateBattleBGM: (_playerHP: number, _opponentHP: number, _maxHP: number) => {},
};

export function useAudioManager(): [AudioManagerState, AudioManagerActions] {
  const [isMuted, setIsMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.2); // 默认 BGM 音量降低
  const [sfxVolume, setSfxVolume] = useState(0.4); // 默认 SFX 音量降低
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  // [P4-6] SFX ring buffer: 每个 src 维护最多 3 个 Audio 实例，轮询复用
  const SFX_RING_SIZE = 3;
  const sfxPoolRef = useRef<Map<string, HTMLAudioElement[]>>(new Map());
  const sfxRingIndexRef = useRef<Map<string, number>>(new Map());
  
  // 音效冷却追踪
  const cooldownsRef = useRef<Map<string, number>>(new Map());
  
  // 当前正在播放的音效数量（限制同时播放数）
  const activeSfxCountRef = useRef(0);
  const MAX_CONCURRENT_SFX = 3; // 最多同时播放3个音效

  // 检查音效是否在冷却中
  const isOnCooldown = useCallback((effectKey: string): boolean => {
    const lastPlayed = cooldownsRef.current.get(effectKey);
    if (!lastPlayed) return false;
    
    const cooldownTime = AUDIO_CONFIG.cooldowns[effectKey] || 200;
    return Date.now() - lastPlayed < cooldownTime;
  }, []);

  // 设置冷却
  const setCooldown = useCallback((effectKey: string) => {
    cooldownsRef.current.set(effectKey, Date.now());
  }, []);

  // [P4-6] 创建或获取音效实例 — 使用 ring buffer 支持同源音效重叠
  const getAudioInstance = useCallback((src: string): HTMLAudioElement | null => {
    if (!src) return null;
    const resolved = resolveSrc(src);

    let ring = sfxPoolRef.current.get(resolved);
    if (!ring) {
      ring = Array.from({ length: SFX_RING_SIZE }, () => {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = resolved;
        audio.addEventListener('ended', () => {
          activeSfxCountRef.current = Math.max(0, activeSfxCountRef.current - 1);
        });
        return audio;
      });
      sfxPoolRef.current.set(resolved, ring);
      sfxRingIndexRef.current.set(resolved, 0);
    }

    // 轮询：找到空闲实例，或用下一个实例（允许打断）
    const idx = sfxRingIndexRef.current.get(resolved) || 0;
    const audio = ring[idx % ring.length];
    sfxRingIndexRef.current.set(resolved, (idx + 1) % ring.length);
    return audio;
  }, []);

  // [P4-6] 平滑 BGM 淡出（RAF 驱动，500ms 曲线衰减）
  const fadeOutBgm = useCallback((audio: HTMLAudioElement, duration: number = 500) => {
    const startVol = audio.volume;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      audio.volume = startVol * (1 - t);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        audio.pause();
      }
    };
    requestAnimationFrame(tick);
  }, []);

  // 平滑 BGM 淡入（RAF 驱动）
  const fadeInBgm = useCallback((audio: HTMLAudioElement, targetVol: number, duration: number = 800) => {
    audio.volume = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // ease-out 曲线，开头快后面慢
      const eased = 1 - (1 - t) * (1 - t);
      audio.volume = targetVol * eased;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // 播放 BGM（支持平滑交叉淡入淡出）
  const playBgm = useCallback((track: 'lobby' | 'battle') => {
    const src = resolveSrc(AUDIO_CONFIG.bgm[track]);
    if (!src) return;

    const targetVol = isMuted ? 0 : bgmVolume;

    try {
      const prevBgm = bgmRef.current;

      // 创建新BGM
      const newBgm = new Audio(src);
      newBgm.preload = 'metadata';
      newBgm.loop = true;
      bgmRef.current = newBgm;

      newBgm.play().then(() => {
        // 新 BGM 淡入
        if (!isMuted) fadeInBgm(newBgm, targetVol, 800);
        // 旧 BGM 淡出
        if (prevBgm) fadeOutBgm(prevBgm, 600);
      }).catch(() => {
        setIsAudioBlocked(true);
        console.log('BGM autoplay blocked, waiting for user interaction');
      });

      setIsPlaying(true);
    } catch (e) {
      console.warn('Failed to play BGM:', e);
    }
  }, [isMuted, bgmVolume, fadeOutBgm, fadeInBgm]);

  // 停止 BGM（平滑淡出）
  const stopBgm = useCallback(() => {
    if (bgmRef.current) {
      fadeOutBgm(bgmRef.current, 300);
      setIsPlaying(false);
    }
  }, [fadeOutBgm]);

  // 播放音效（带冷却、优先级、rate/volume 覆盖、变体随机化）
  const playSfx = useCallback((effect: string, overrides?: SfxOverrides) => {
    if (isMuted) return;

    // 向后兼容：旧 key → 新 registry key
    const registryKey = LEGACY_SFX_MAP[effect] || effect;
    const def = SFX_DEFS[registryKey];

    if (def) {
      // ── 新注册表路径：变体随机化 + 范围随机 rate/volume ──
      if (isOnCooldown(registryKey)) return;
      if (activeSfxCountRef.current >= MAX_CONCURRENT_SFX && def.priority < 5) return;

      const variantIdx = Math.floor(Math.random() * def.variants.length);
      const src = def.variants[variantIdx];
      if (!src) return;

      try {
        const audio = getAudioInstance(src);
        if (audio) {
          audio.currentTime = 0;
          audio.volume = sfxVolume * (overrides?.volume ?? randRange(def.volume));
          audio.playbackRate = overrides?.rate ?? randRange(def.rate);
          audio.play().catch(() => {});
          activeSfxCountRef.current++;
          setCooldown(registryKey);
        }
      } catch (e) {
        console.warn('Failed to play SFX:', e);
      }
      return;
    }

    // ── 回退：旧 AUDIO_CONFIG 路径（保持向后兼容）──
    if (isOnCooldown(effect)) return;
    const priority = SFX_PRIORITY[effect] || 1;
    if (activeSfxCountRef.current >= MAX_CONCURRENT_SFX && priority < 5) return;

    const mapping: SfxMapping | undefined = (AUDIO_CONFIG.sfx as any)[effect];
    if (!mapping) return;

    const src = mapping.src;
    if (!src) return;

    try {
      const audio = getAudioInstance(src);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = sfxVolume * (overrides?.volume ?? mapping.volume ?? 1);
        audio.playbackRate = overrides?.rate ?? mapping.rate ?? 1;
        audio.play().catch(() => {});
        activeSfxCountRef.current++;
        setCooldown(effect);
      }
    } catch (e) {
      console.warn('Failed to play SFX:', e);
    }
  }, [isMuted, sfxVolume, getAudioInstance, isOnCooldown, setCooldown]);

    // 播放法术音效
  const playSpellSfx = useCallback((spellType: SpellType) => {
    if (isMuted) return;

    // 使用通用的 spell 冷却
    if (isOnCooldown('spell')) {
      return;
    }

    // 提取基础元素类型（处理 fire2, fire3, hero_fire 等变体）
    let baseElement = spellType;
    
    // 处理数字后缀 (fire2, ice3, etc.)
    const numericMatch = spellType.match(/^([a-z]+)\d+$/);
    if (numericMatch) {
      baseElement = numericMatch[1] as SpellType;
    }
    
    // 直接查找音效源，如果找不到则使用基础元素
    let src = AUDIO_CONFIG.sfx.spell[spellType];
    if (!src) {
      src = AUDIO_CONFIG.sfx.spell[baseElement];
    }
    if (!src) {
      // 最终回退到火焰音效
      src = AUDIO_CONFIG.sfx.spell.fire;
    }

    try {
      const audio = getAudioInstance(src);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = sfxVolume;
        audio.play().catch(() => {});
        
        activeSfxCountRef.current++;
        setCooldown('spell');
      }
    } catch (e) {
      console.warn('Failed to play spell SFX:', e);
    }
  }, [isMuted, sfxVolume, getAudioInstance, isOnCooldown, setCooldown]);

  // Dynamic BGM: RAF 平滑过渡 playbackRate/volume
  const currentBgmStateRef = useRef<'neutral' | 'advantage' | 'danger' | 'lethal'>('neutral');
  const bgmTransitionRef = useRef<{ startTime: number; duration: number; fromRate: number; toRate: number; fromVol: number; toVol: number } | null>(null);

  const animateBgmTransition = useCallback((targetRate: number, targetVol: number, duration: number = 1200) => {
    const audio = bgmRef.current;
    if (!audio) return;

    bgmTransitionRef.current = {
      startTime: performance.now(),
      duration,
      fromRate: audio.playbackRate,
      toRate: targetRate,
      fromVol: audio.volume,
      toVol: targetVol,
    };

    const tick = (now: number) => {
      const tRef = bgmTransitionRef.current;
      if (!tRef) return;
      const t = Math.min((now - tRef.startTime) / tRef.duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
      audio.playbackRate = tRef.fromRate + (tRef.toRate - tRef.fromRate) * eased;
      audio.volume = tRef.fromVol + (tRef.toVol - tRef.fromVol) * eased;
      if (t < 1) requestAnimationFrame(tick);
      else bgmTransitionRef.current = null;
    };
    requestAnimationFrame(tick);
  }, []);

  const updateBattleBGM = useCallback((playerHP: number, opponentHP: number, maxHP: number) => {
    if (isMuted || !bgmRef.current) return;

    const playerRatio = playerHP / maxHP;
    const opponentRatio = opponentHP / maxHP;

    let newState: typeof currentBgmStateRef.current = 'neutral';
    if (opponentRatio <= 0.3 && playerRatio > 0.3) {
      newState = 'lethal';
    } else if (playerRatio <= 0.3) {
      newState = 'danger';
    } else if (playerRatio - opponentRatio > 0.3) {
      newState = 'advantage';
    }

    if (newState === currentBgmStateRef.current) return;
    currentBgmStateRef.current = newState;

    switch (newState) {
      case 'danger':
        animateBgmTransition(1.08, Math.min(1, bgmVolume * 0.8), 1000);
        break;
      case 'lethal':
        animateBgmTransition(1.15, Math.min(1, bgmVolume), 800);
        break;
      case 'advantage':
        animateBgmTransition(1.0, Math.min(1, bgmVolume * 0.6), 1200);
        break;
      default:
        animateBgmTransition(1.0, Math.min(1, bgmVolume * 0.5), 1500);
        break;
    }
  }, [isMuted, bgmVolume, animateBgmTransition]);

  // Populate module-level bridge so non-hook consumers can access audio
  useEffect(() => {
    audioBridge.playSfx = playSfx;
    audioBridge.updateBattleBGM = updateBattleBGM;
    return () => {
      audioBridge.playSfx = () => {};
      audioBridge.updateBattleBGM = () => {};
    };
  }, [playSfx, updateBattleBGM]);

  // 切换静音
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (bgmRef.current) {
        bgmRef.current.volume = newMuted ? 0 : bgmVolume;
      }
      return newMuted;
    });
  }, [bgmVolume]);

  // 更新 BGM 音量
  useEffect(() => {
    if (bgmRef.current && !isMuted) {
      bgmRef.current.volume = bgmVolume;
    }
  }, [bgmVolume, isMuted]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
      }
      sfxPoolRef.current.forEach(ring => ring.forEach(a => a.pause()));
      sfxPoolRef.current.clear();
    };
  }, []);

  // 用户交互解锁音频逻辑 (修复 iOS AutoPlay Policy)
  useEffect(() => {
    const unlock = () => {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                // 播放静音 buffer 彻底激活
                const buffer = ctx.createBuffer(1, 1, 22050);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(0);
                
                setIsAudioBlocked(false);
                if (bgmRef.current && isPlaying) {
                   bgmRef.current.play().catch(() => {});
                }
            });
        }
    };

    if (isAudioBlocked || (getAudioContext()?.state === 'suspended')) {
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
    }
    
    return () => {
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
    };
  }, [isAudioBlocked, isPlaying]);

  const state: AudioManagerState = useMemo(() => ({
    isMuted,
    bgmVolume,
    sfxVolume,
    isPlaying,
  }), [isMuted, bgmVolume, sfxVolume, isPlaying]);

  const actions: AudioManagerActions = useMemo(() => ({
    toggleMute,
    setBgmVolume,
    setSfxVolume,
    playBgm,
    stopBgm,
    playSfx,
    playSpellSfx,
    updateBattleBGM,
  }), [toggleMute, setBgmVolume, setSfxVolume, playBgm, stopBgm, playSfx, playSpellSfx, updateBattleBGM]);

  return [state, actions];
}

export default useAudioManager;
