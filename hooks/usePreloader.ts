/**
 * usePreloader - 资源预加载 Hook
 * 
 * 在游戏开始前预加载所有图片和音效资源，
 * 避免战斗中出现资源闪烁和加载延迟
 */

import { useState, useEffect, useCallback } from 'react';

// 需要预加载的图片资源列表
import { SPELLS } from '../constants';

// 需要预加载的静态 UI 资源
const STATIC_UI = [
  '/battle-bg.webp',
  '/lobby-bg.webp',
  '/avatars/player-wizard.webp',
  '/avatars/opponent-sorcerer.webp',
  '/ui/bg_arena.webp',
  '/ui/card_back.webp',
  '/ui/frame_fire.webp',
  '/ui/frame_water.webp',
  '/ui/frame_wind.webp',
  '/ui/frame_earth.webp',
  '/ui/magic-circle.webp',
  '/ui/health-bar-frame.webp',
  '/pwa-512x512.png'
];

// 动态生成所有卡牌的图片路径
const CARD_IMAGES = SPELLS
  .map(s => s.artSrc)
  .filter((src): src is string => !!src);

const PRELOAD_IMAGES = [...new Set([...STATIC_UI, ...CARD_IMAGES])];

// 需要预加载的音效资源列表
const PRELOAD_AUDIO = [
  '/audio/bgm-lobby.mp3',
  '/audio/bgm-battle.mp3',
  '/audio/sfx-card-play.mp3',
  '/audio/sfx-spell-fire.mp3',
  '/audio/sfx-spell-ice.mp3',
  '/audio/sfx-spell-thunder.mp3',
  '/audio/sfx-spell-vine.mp3',
  '/audio/sfx-spell-rock.mp3',
  '/audio/sfx-hit.mp3',
  '/audio/sfx-block.mp3',
  '/audio/sfx-victory.mp3',
  '/audio/sfx-defeat.mp3',
];

export interface PreloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  currentItem: string;
  errors: string[];
}

export function usePreloader() {
  const [progress, setProgress] = useState<PreloadProgress>({
    loaded: 0,
    total: PRELOAD_IMAGES.length,
    percentage: 0,
    isComplete: false,
    currentItem: '',
    errors: [],
  });

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        // 图片加载失败不阻塞，只记录错误
        console.warn(`Failed to preload image: ${src}`);
        resolve();
      };
      img.src = src;
    });
  }, []);

  const preloadAudio = useCallback((src: string): Promise<void> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => resolve();
      audio.onerror = () => {
        // 音效加载失败不阻塞
        console.warn(`Failed to preload audio: ${src}`);
        resolve();
      };
      audio.src = src;
      audio.load();
    });
  }, []);

  const startPreloading = useCallback(async () => {
    const allResources = [...PRELOAD_IMAGES, ...PRELOAD_AUDIO];
    const total = allResources.length;
    let loadedCount = 0;
    const errors: string[] = [];
    
    setProgress({
      loaded: 0,
      total,
      percentage: 0,
      isComplete: false,
      currentItem: 'Initializing...',
      errors: [],
    });

    // 分离图片和音频，优先加载关键图片
    const BATCH_SIZE = 6;
    for (let i = 0; i < allResources.length; i += BATCH_SIZE) {
      const batch = allResources.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (resource) => {
        try {
          if (resource.endsWith('.mp3') || resource.endsWith('.wav')) {
            // 给音频加载加一个 2s 超时，防止因网络问题卡死
            await Promise.race([
              preloadAudio(resource),
              new Promise((resolve) => setTimeout(resolve, 2000))
            ]);
          } else {
            await preloadImage(resource);
          }
        } catch (e) {
          errors.push(resource);
        } finally {
          loadedCount++;
          setProgress(prev => ({
            ...prev,
            loaded: loadedCount,
            percentage: Math.floor((loadedCount / total) * 100),
            currentItem: resource,
            errors,
          }));
        }
      }));
    }

    setProgress(prev => ({
      ...prev,
      isComplete: true,
      currentItem: 'Complete!',
    }));
  }, [preloadImage, preloadAudio]);

  return {
    progress,
    startPreloading,
  };
}

export default usePreloader;
