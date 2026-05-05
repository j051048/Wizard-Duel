/**
 * usePreloader - 分级资源预加载 Hook
 *
 * 三级加载策略：
 * Tier 1 (阻塞): STATIC_UI 图片 + lobby BGM  → 加载完才能进入大厅 (~5MB)
 * Tier 2 (后台):  卡牌图片                     → 进入大厅后静默加载 (~5MB)
 * Tier 3 (延迟):  战斗 BGM + SFX              → 战斗开始后流式播放 (~16MB)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SPELLS } from '../constants';

// ─── Tier 1: 必须阻塞加载的静态 UI 资源 ───
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
  '/pwa-512x512.png',
];

const TIER1_AUDIO = [
  '/audio/bgm-lobby.mp3',
  '/audio/sfx-card-play.mp3',
];

// ─── Tier 2: 后台加载的卡牌图片 ───
const CARD_IMAGES = SPELLS
  .map(s => s.artSrc)
  .filter((src): src is string => !!src);

// ─── Tier 3: 延迟加载的战斗音频 ───
const TIER3_AUDIO = [
  '/audio/bgm-battle_tavern.mp3',
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

// ─── 合并 Tier 1 资源列表 ───
const TIER1_RESOURCES = [...STATIC_UI, ...TIER1_AUDIO];

// ─── 导出类型 ───
export interface PreloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  currentItem: string;
  errors: string[];
}

export interface TieredPreloadState {
  /** Tier 1 完成 — 可以进入大厅 */
  tier1: PreloadProgress;
  /** Tier 2 完成 — 卡牌图片全部就绪 */
  tier2: PreloadProgress;
  /** Tier 3 完成 — 战斗音频就绪 */
  tier3: PreloadProgress;
}

// ─── 内部工具 ───

function loadOneImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      console.warn(`[Preloader] 图片加载失败: ${src}`);
      resolve();
    };
    img.src = src;
  });
}

function loadOneAudio(src: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.oncanplaythrough = () => resolve();
    audio.onerror = () => {
      console.warn(`[Preloader] 音频加载失败: ${src}`);
      resolve();
    };
    audio.src = src;
    audio.load();
  });
}

function loadWithTimeout(loader: () => Promise<void>, ms: number): Promise<void> {
  return Promise.race([loader(), new Promise<void>((r) => setTimeout(r, ms))]);
}

function makeProgress(loaded: number, total: number, current: string, errors: string[]): PreloadProgress {
  return {
    loaded,
    total,
    percentage: total > 0 ? Math.floor((loaded / total) * 100) : 100,
    isComplete: loaded >= total,
    currentItem: loaded >= total ? 'Complete!' : current,
    errors,
  };
}

// ─── Hook ───

export function usePreloader() {
  const [tier1, setTier1] = useState<PreloadProgress>(makeProgress(0, TIER1_RESOURCES.length, '', []));
  const [tier2, setTier2] = useState<PreloadProgress>(makeProgress(0, CARD_IMAGES.length, '', []));
  const [tier3, setTier3] = useState<PreloadProgress>(makeProgress(0, TIER3_AUDIO.length, '', []));

  // 用 ref 防止重复启动
  const tier2Started = useRef(false);
  const tier3Started = useRef(false);

  /**
   * 启动 Tier 1 阻塞加载 — 调用方等待完成
   */
  const startPreloading = useCallback(async () => {
    const resources = TIER1_RESOURCES;
    const errors: string[] = [];
    let loaded = 0;

    setTier1(makeProgress(0, resources.length, 'Initializing...', []));

    const BATCH = 6;
    for (let i = 0; i < resources.length; i += BATCH) {
      const batch = resources.slice(i, i + BATCH);
      await Promise.all(batch.map(async (res) => {
        try {
          if (res.endsWith('.mp3') || res.endsWith('.wav')) {
            await loadWithTimeout(() => loadOneAudio(res), 3000);
          } else {
            await loadOneImage(res);
          }
        } catch {
          errors.push(res);
        } finally {
          loaded++;
          setTier1(makeProgress(loaded, resources.length, res, errors));
        }
      }));
    }

    setTier1(makeProgress(resources.length, resources.length, 'Complete!', errors));
  }, []);

  /**
   * 启动 Tier 2 后台加载 — 不阻塞，完成时通知
   */
  const startTier2 = useCallback(async () => {
    if (tier2Started.current) return;
    tier2Started.current = true;

    const resources = CARD_IMAGES;
    const errors: string[] = [];
    let loaded = 0;

    setTier2(makeProgress(0, resources.length, '', []));

    const BATCH = 8;
    for (let i = 0; i < resources.length; i += BATCH) {
      const batch = resources.slice(i, i + BATCH);
      await Promise.all(batch.map(async (res) => {
        try {
          await loadOneImage(res);
        } catch {
          errors.push(res);
        } finally {
          loaded++;
          setTier2(makeProgress(loaded, resources.length, res, errors));
        }
      }));
    }

    setTier2(makeProgress(resources.length, resources.length, 'Complete!', errors));
  }, []);

  /**
   * 启动 Tier 3 延迟加载 — 战斗开始后调用
   */
  const startTier3 = useCallback(async () => {
    if (tier3Started.current) return;
    tier3Started.current = true;

    const resources = TIER3_AUDIO;
    const errors: string[] = [];
    let loaded = 0;

    setTier3(makeProgress(0, resources.length, '', []));

    const BATCH = 4;
    for (let i = 0; i < resources.length; i += BATCH) {
      const batch = resources.slice(i, i + BATCH);
      await Promise.all(batch.map(async (res) => {
        try {
          await loadWithTimeout(() => loadOneAudio(res), 5000);
        } catch {
          errors.push(res);
        } finally {
          loaded++;
          setTier3(makeProgress(loaded, resources.length, res, errors));
        }
      }));
    }

    setTier3(makeProgress(resources.length, resources.length, 'Complete!', errors));
  }, []);

  return {
    // 保持向后兼容 — progress 代表 Tier 1 进度
    progress: tier1,
    startPreloading,
    // 新增分级接口
    tier1,
    tier2,
    tier3,
    startTier2,
    startTier3,
  };
}

export default usePreloader;
