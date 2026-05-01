/**
 * Season Configuration - 赛季配置中心
 *
 * [P1] 统一 RankService 和 BattlePassService 的赛季定义
 * 支持自动轮转：当 endDate 过期时，自动生成新赛季
 */

import { SeasonInfo } from '../types/social';

const STORAGE_KEY_SEASON_META = 'wizard_season_meta';

// 每赛季持续天数
const SEASON_DURATION_DAYS = 60;

// 赛季名称模板
const SEASON_NAMES = [
  '元素觉醒',
  '混沌风暴',
  '远古遗迹',
  '暗影降临',
  '永恒之火',
  '虚空裂隙',
  '命运之轮',
  '创世之力',
];

/**
 * 获取当前活跃赛季
 * 如果当前赛季已过期，自动轮转到新赛季
 */
export function getActiveSeason(): SeasonInfo {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SEASON_META);
    if (saved) {
      const season: SeasonInfo = JSON.parse(saved);
      const now = new Date();
      const endDate = new Date(season.endDate);

      if (now < endDate && season.isActive) {
        return season;
      }

      // 赛季已过期，生成新赛季
      return rotateSeason(season);
    }
  } catch {
    // ignore parse errors
  }

  // 首次运行或数据损坏，创建初始赛季
  return createInitialSeason();
}

/**
 * 从过期赛季轮转到新赛季
 */
function rotateSeason(previousSeason: SeasonInfo): SeasonInfo {
  // 从旧 ID 提取序号，递增
  const prevNum = parseInt(previousSeason.id.replace('season_', ''), 10) || 1;
  const newNum = prevNum + 1;
  const nameIndex = (newNum - 1) % SEASON_NAMES.length;

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + SEASON_DURATION_DAYS);

  const newSeason: SeasonInfo = {
    id: `season_${newNum}`,
    name: SEASON_NAMES[nameIndex],
    startDate: now.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    isActive: true,
  };

  localStorage.setItem(STORAGE_KEY_SEASON_META, JSON.stringify(newSeason));
  console.log(`[Season] 轮转: ${previousSeason.id} → ${newSeason.id} (${newSeason.name})`);

  return newSeason;
}

/**
 * 创建初始赛季（首次运行）
 */
function createInitialSeason(): SeasonInfo {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + SEASON_DURATION_DAYS);

  const season: SeasonInfo = {
    id: 'season_1',
    name: SEASON_NAMES[0],
    startDate: now.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    isActive: true,
  };

  localStorage.setItem(STORAGE_KEY_SEASON_META, JSON.stringify(season));
  return season;
}

/**
 * 获取赛季剩余天数
 */
export function getSeasonDaysRemaining(season: SeasonInfo): number {
  const now = new Date();
  const end = new Date(season.endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
