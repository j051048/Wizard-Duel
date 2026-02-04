import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * 画质等级定义
 */
export type QualityLevel = 'high' | 'low';

interface SettingsContextType {
  quality: QualityLevel;
  setQuality: (quality: QualityLevel) => void;
  isLowQuality: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 从本地存储初始化，默认为 'high'
  const [quality, setQualityState] = useState<QualityLevel>(() => {
    const saved = localStorage.getItem('game_quality_settings');
    if (saved) return saved as QualityLevel;
    
    // 检查是否为移动端 (简单检测)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? 'low' : 'high';
  });

  const setQuality = (newQuality: QualityLevel) => {
    setQualityState(newQuality);
    localStorage.setItem('game_quality_settings', newQuality);
    
    // 全局标记
    if (newQuality === 'low') {
      document.documentElement.classList.add('low-quality');
    } else {
      document.documentElement.classList.remove('low-quality');
    }
  };

  // 初始化时同步 class 到 html 标签
  useEffect(() => {
    if (quality === 'low') {
      document.documentElement.classList.add('low-quality');
    } else {
      document.documentElement.classList.remove('low-quality');
    }
    
    // 简单的性能检测模拟 - 如果是非桌面环境或某些特征，可以默认建议 low (这里暂时保留手动)
  }, []);

  const value = {
    quality,
    setQuality,
    isLowQuality: quality === 'low',
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
