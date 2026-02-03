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

import { useState, useCallback, useRef, useEffect } from 'react';
import { SpellType } from '../types';

// 音效配置
const AUDIO_CONFIG = {
  bgm: {
    lobby: '/audio/bgm-lobby.mp3',
    battle: '/audio/bgm-battle.mp3?v=2',
  },
  sfx: {
    cardPlay: '/audio/sfx-card-play.mp3',
    hit: '/audio/sfx-hit.mp3',
    block: '/audio/sfx-block.mp3',
    victory: '/audio/sfx-victory.mp3',
    defeat: '/audio/sfx-defeat.mp3',
    spell: {
      fire: '/audio/sfx-spell-fire.mp3',
      vine: '/audio/sfx-spell-vine.mp3',
      ice: '/audio/sfx-spell-ice.mp3',
      thunder: '/audio/sfx-spell-thunder.mp3',
      rock: '/audio/sfx-spell-rock.mp3',
      skip: '/audio/sfx-card-play.mp3', // Placeholder for skip
    },
  },
  // 音效冷却时间配置（毫秒）- 已调整以减少噪音
  cooldowns: {
    cardPlay: 500,    // 出牌音效冷却 (原200)
    hit: 600,         // 命中音效冷却 (原300)
    block: 600,       // 格挡音效冷却 (原300)
    spell: 800,       // 法术音效冷却 (原400)
    victory: 2000,    // 胜利音效冷却
    defeat: 2000,     // 失败音效冷却
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

export interface AudioManagerActions {
  toggleMute: () => void;
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  playBgm: (track: 'lobby' | 'battle') => void;
  stopBgm: () => void;
  playSfx: (effect: string) => void;
  playSpellSfx: (spellType: SpellType) => void;
}

export function useAudioManager(): [AudioManagerState, AudioManagerActions] {
  const [isMuted, setIsMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.2); // 默认 BGM 音量降低
  const [sfxVolume, setSfxVolume] = useState(0.4); // 默认 SFX 音量降低
  const [isPlaying, setIsPlaying] = useState(false);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  
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

  // 创建或获取音效实例
  const getAudioInstance = useCallback((src: string): HTMLAudioElement | null => {
    if (!src) return null;

    if (!sfxPoolRef.current.has(src)) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = src;
      
      // 音效结束时减少计数
      audio.addEventListener('ended', () => {
        activeSfxCountRef.current = Math.max(0, activeSfxCountRef.current - 1);
      });
      
      sfxPoolRef.current.set(src, audio);
    }
    return sfxPoolRef.current.get(src) || null;
  }, []);

  // 播放 BGM
  const playBgm = useCallback((track: 'lobby' | 'battle') => {
    const src = AUDIO_CONFIG.bgm[track];
    if (!src) return;

    try {
      // 淡出当前BGM
      if (bgmRef.current) {
        const oldBgm = bgmRef.current;
        // 简单淡出
        let fadeVolume = oldBgm.volume;
        const fadeOut = setInterval(() => {
          fadeVolume -= 0.05;
          if (fadeVolume <= 0) {
            oldBgm.pause();
            clearInterval(fadeOut);
          } else {
            oldBgm.volume = fadeVolume;
          }
        }, 50);
      }

      // 创建新BGM
      bgmRef.current = new Audio(src);
      bgmRef.current.loop = true;
      bgmRef.current.volume = isMuted ? 0 : bgmVolume;
      
      bgmRef.current.play().catch(() => {
        console.log('BGM autoplay blocked, waiting for user interaction');
      });
      
      setIsPlaying(true);
    } catch (e) {
      console.warn('Failed to play BGM:', e);
    }
  }, [isMuted, bgmVolume]);

  // 停止 BGM
  const stopBgm = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // 播放音效（带冷却和优先级）
  const playSfx = useCallback((effect: string) => {
    if (isMuted) return;

    // 检查冷却
    if (isOnCooldown(effect)) {
      return; // 静默忽略，防止音效重叠
    }

    // 检查同时播放数量限制
    const priority = SFX_PRIORITY[effect] || 1;
    if (activeSfxCountRef.current >= MAX_CONCURRENT_SFX && priority < 5) {
      return; // 低优先级音效被跳过
    }

    const src = (AUDIO_CONFIG.sfx as any)[effect];
    if (!src) return;

    try {
      const audio = getAudioInstance(src);
      if (audio) {
        // 如果音效正在播放，创建新实例（高优先级音效除外）
        if (!audio.paused && priority < 5) {
          return;
        }
        
        audio.currentTime = 0;
        audio.volume = sfxVolume;
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

    const src = AUDIO_CONFIG.sfx.spell[spellType];
    if (!src) return;

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
      sfxPoolRef.current.forEach(audio => audio.pause());
      sfxPoolRef.current.clear();
    };
  }, []);

  const state: AudioManagerState = {
    isMuted,
    bgmVolume,
    sfxVolume,
    isPlaying,
  };

  const actions: AudioManagerActions = {
    toggleMute,
    setBgmVolume,
    setSfxVolume,
    playBgm,
    stopBgm,
    playSfx,
    playSpellSfx,
  };

  return [state, actions];
}

export default useAudioManager;
