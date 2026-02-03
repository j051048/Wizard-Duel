/**
 * usePreloader - 资源预加载 Hook
 * 
 * 在游戏开始前预加载所有图片和音效资源，
 * 避免战斗中出现资源闪烁和加载延迟
 */

import { useState, useEffect, useCallback } from 'react';

// 需要预加载的图片资源列表
const PRELOAD_IMAGES = [
  // 背景
  '/battle-bg.jpg',
  '/lobby-bg.jpg',
  
  // 头像
  '/avatars/player-wizard.png',
  '/avatars/opponent-sorcerer.png',
  
  // 卡牌
  '/cards/fire-pyroblast.png',
  '/cards/vine-entangling.png',
  '/cards/ice-frostnova.png',
  '/cards/thunder-chainlightning.png',
  '/cards/rock-bulwark.png',
  '/cards/card-back.png',
  
  // 特效
  '/effects/effect-burn.png',
  '/effects/effect-tangle.png',
  '/effects/effect-freeze.png',
  '/effects/effect-charge.png',
  '/effects/effect-fortify.png',
  '/effects/effect-critical.png',
  
  // UI
  '/ui/magic-circle.png',
  '/ui/corner-tl.png',
  '/ui/corner-tr.png',
  '/ui/corner-bl.png',
  '/ui/corner-br.png',
  '/ui/mana-crystal.png',
  '/ui/health-bar-frame.png',
  
  // 图标
  '/icons/icon-mana.png',
  '/icons/icon-health.png',
  '/icons/icon-coin.png',
];

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
    const allResources = [...PRELOAD_IMAGES];
    const total = allResources.length;
    const errors: string[] = [];
    
    setProgress({
      loaded: 0,
      total,
      percentage: 0,
      isComplete: false,
      currentItem: 'Initializing...',
      errors: [],
    });

    for (let i = 0; i < allResources.length; i++) {
      const resource = allResources[i];
      
      setProgress(prev => ({
        ...prev,
        currentItem: resource,
      }));

      try {
        if (resource.endsWith('.mp3') || resource.endsWith('.wav')) {
          await preloadAudio(resource);
        } else {
          await preloadImage(resource);
        }
      } catch (e) {
        errors.push(resource);
      }

      setProgress(prev => ({
        ...prev,
        loaded: i + 1,
        percentage: Math.floor(((i + 1) / total) * 100),
        errors,
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
