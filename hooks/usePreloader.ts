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
  '/battle-bg.webp',
  '/lobby-bg.webp',
  
  // 头像
  '/avatars/player-wizard.webp',
  '/avatars/opponent-sorcerer.webp',
  
  // 卡牌
  '/cards/fire-pyroblast.webp',
  '/cards/vine-entangling.webp',
  '/cards/ice-frostnova.webp',
  '/cards/thunder-chainlightning.webp',
  '/cards/rock-bulwark.webp',
  '/cards/card-back.webp',
  
  // 特效
  '/effects/effect-burn.webp',
  '/effects/effect-tangle.webp',
  '/effects/effect-freeze.webp',
  '/effects/effect-charge.webp',
  '/effects/effect-fortify.webp',
  '/effects/effect-critical.webp',
  
  // UI
  '/ui/bg_arena.webp',
  '/ui/card_back.webp',
  '/ui/frame_fire.webp',
  '/ui/frame_water.webp',
  '/ui/frame_wind.webp',
  '/ui/frame_earth.webp',
  '/ui/mana_full.webp',
  '/ui/mana_empty.webp',
  '/ui/rank_iron.webp',
  '/ui/rank_gold.webp',
  '/ui/rank_legend.webp',
  '/ui/magic-circle.webp',
  '/ui/corner-tl.webp',
  '/ui/corner-tr.webp',
  '/ui/corner-bl.webp',
  '/ui/corner-br.webp',
  '/ui/mana-crystal.webp',
  '/ui/health-bar-frame.webp',
  
  // 图标
  '/icons/icon-mana.webp',
  '/icons/icon-health.webp',
  '/icons/icon-coin.webp',
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
