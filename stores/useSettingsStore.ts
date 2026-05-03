import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type QualityLevel = 'high' | 'low';

interface SettingsState {
  quality: QualityLevel;
  isLowQuality: boolean;
  setQuality: (quality: QualityLevel) => void;
}

const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const syncQualityClass = (quality: QualityLevel) => {
  if (quality === 'low') {
    document.documentElement.classList.add('low-quality');
  } else {
    document.documentElement.classList.remove('low-quality');
  }
};

const defaultQuality: QualityLevel = isMobile() ? 'low' : 'high';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      quality: defaultQuality,
      isLowQuality: defaultQuality === 'low',
      setQuality: (quality: QualityLevel) => {
        set({ quality, isLowQuality: quality === 'low' });
        syncQualityClass(quality);
      },
    }),
    {
      name: 'game_quality_settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncQualityClass(state.quality);
        }
      },
    }
  )
);

// Initialize CSS class on first load
syncQualityClass(useSettingsStore.getState().quality);
