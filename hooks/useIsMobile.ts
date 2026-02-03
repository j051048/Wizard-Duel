import { useState, useEffect } from 'react';

/**
 * useIsMobile - 响应式断点检测 Hook
 * 
 * 统一管理移动端判断逻辑，处理客户端渲染同步问题
 */
export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // 初始状态（兼容 SSR/加载瞬间）
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    // 立即执行一次以确保准确
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;
