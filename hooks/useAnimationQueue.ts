import { useEffect, useRef, useState, useCallback } from 'react';

const DEFAULT_DELAY = 450;

/**
 * 动画队列管理器
 * 负责顺序执行游戏指令，确保动画流畅播放
 */
export function useAnimationQueue<T extends { delay?: number }>(
  processAction: (action: T) => void
) {
  const [queue, setQueue] = useState<T[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processRef = useRef(processAction);

  // 保持 processAction 最新，避免闭包问题
  useEffect(() => {
    processRef.current = processAction;
  }, [processAction]);

  const enqueue = useCallback((actions: T | T[]) => {
    setQueue(prev => [...prev, ...(Array.isArray(actions) ? actions : [actions])]);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (queue.length === 0 || timerRef.current) return;

    const action = queue[0];
    const delay = action.delay !== undefined ? action.delay : DEFAULT_DELAY;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      
      // 执行动作
      processRef.current(action);
      
      // 移除已执行动作
      setQueue(prev => prev.slice(1));
    }, delay);

    return () => {
      // 组件卸载时不一定要清除计时器，取决于业务需求
      // 这里为了防止内存泄漏，可以选择清除，但要注意不打断正在进行的动画链
    };
  }, [queue]);

  // 组件卸载时彻底清理
  useEffect(() => {
      return () => {
          if (timerRef.current) {
              clearTimeout(timerRef.current);
          }
      };
  }, []);

  return {
    queue,
    isProcessing: queue.length > 0,
    enqueue,
    clearQueue
  };
}
