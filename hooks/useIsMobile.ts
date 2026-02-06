import { useState, useEffect } from 'react';

/**
 * useIsMobile - 响应式断点检测 Hook
 * 
 * 统一管理移动端判断逻辑，处理客户端渲染同步问题
 * 返回更丰富的设备信息用于布局适配
 */

interface ResponsiveInfo {
  isMobile: boolean;
  isTouch: boolean;
  isSmallMobile: boolean; // < 380px 超小屏
  safeAreaBottom: number;
  safeAreaTop: number;
  screenWidth: number;
  screenHeight: number;
}

export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

/**
 * useResponsive - 更全面的响应式 Hook
 * 用于需要更精细控制的组件（如战斗界面）
 */
export function useResponsive(): ResponsiveInfo {
  const [info, setInfo] = useState<ResponsiveInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTouch: false,
        isSmallMobile: false,
        safeAreaBottom: 0,
        safeAreaTop: 0,
        screenWidth: 1920,
        screenHeight: 1080,
      };
    }
    
    return {
      isMobile: window.innerWidth < 768,
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isSmallMobile: window.innerWidth < 380,
      safeAreaBottom: 0,
      safeAreaTop: 0,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    };
  });

  useEffect(() => {
    const updateInfo = () => {
      // 获取 CSS 安全区域值
      const style = getComputedStyle(document.documentElement);
      const safeBottom = parseInt(style.getPropertyValue('--sab') || '0') || 0;
      const safeTop = parseInt(style.getPropertyValue('--sat') || '0') || 0;
      
      setInfo({
        isMobile: window.innerWidth < 768,
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isSmallMobile: window.innerWidth < 380,
        safeAreaBottom: safeBottom,
        safeAreaTop: safeTop,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      });
    };

    updateInfo();
    window.addEventListener('resize', updateInfo);
    window.addEventListener('orientationchange', updateInfo);

    return () => {
      window.removeEventListener('resize', updateInfo);
      window.removeEventListener('orientationchange', updateInfo);
    };
  }, []);

  return info;
}

export default useIsMobile;
