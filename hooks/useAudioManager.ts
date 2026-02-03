/**
 * useAudioManager - 音效管理 Hook
 * 
 * 管理游戏BGM和音效播放，支持静音/音量控制
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SpellType } from '../types';

// 音效配置
const AUDIO_CONFIG = {
  bgm: {
    lobby: '/audio/bgm-lobby.mp3',
    battle: '/audio/bgm-battle.mp3',
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
    },
  },
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
  const [bgmVolume, setBgmVolume] = useState(0.3);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // 创建或获取音效实例
  const getAudioInstance = useCallback((src: string): HTMLAudioElement | null => {
    // 如果资源不存在，静默失败
    if (!src) return null;

    if (!sfxPoolRef.current.has(src)) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = src;
      sfxPoolRef.current.set(src, audio);
    }
    return sfxPoolRef.current.get(src) || null;
  }, []);

  // 播放 BGM
  const playBgm = useCallback((track: 'lobby' | 'battle') => {
    const src = AUDIO_CONFIG.bgm[track];
    if (!src) return;

    try {
      if (bgmRef.current) {
        bgmRef.current.pause();
      }

      bgmRef.current = new Audio(src);
      bgmRef.current.loop = true;
      bgmRef.current.volume = isMuted ? 0 : bgmVolume;
      
      // 用户交互后才能播放音频
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

  // 播放音效
  const playSfx = useCallback((effect: string) => {
    if (isMuted) return;

    const src = (AUDIO_CONFIG.sfx as any)[effect];
    if (!src) return;

    try {
      const audio = getAudioInstance(src);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = sfxVolume;
        audio.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to play SFX:', e);
    }
  }, [isMuted, sfxVolume, getAudioInstance]);

  // 播放法术音效
  const playSpellSfx = useCallback((spellType: SpellType) => {
    if (isMuted) return;

    const src = AUDIO_CONFIG.sfx.spell[spellType];
    if (!src) return;

    try {
      const audio = getAudioInstance(src);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = sfxVolume;
        audio.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to play spell SFX:', e);
    }
  }, [isMuted, sfxVolume, getAudioInstance]);

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
