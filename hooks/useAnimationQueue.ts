import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  QUEUE_DEFAULT_DELAY, QUEUE_STATE_DELAY, QUEUE_MESSAGE_DELAY 
} from '../config/timing';

const DEFAULT_DELAY = QUEUE_DEFAULT_DELAY;

/**
 * [B-6] 根据 action type 自动选择合适的延迟
 * 如果 action 本身指定了 delay，优先使用；否则按类型分配
 */
function getSmartDelay(action: any): number {
  // 如果明确指定了 delay，优先使用
  if (action.delay !== undefined) return action.delay;
  
  // 根据 type 分配差异化延迟
  switch (action.type) {
    case 'UPDATE_STATE':    return QUEUE_STATE_DELAY;     // 200ms - 状态更新快速
    case 'ADD_MESSAGE':     return QUEUE_MESSAGE_DELAY;   // 600ms - 消息需要阅读时间
    case 'SET_PHASE':       return 100;                   // 100ms - phase 切换即时
    case 'UPDATE_UI':       return QUEUE_STATE_DELAY;     // 200ms - UI 更新快速
    case 'SET_AI_STATUS':   return 200;                   // 200ms
    case 'EXECUTE_LOGIC':   return 100;                   // 100ms - 逻辑执行即时
    case 'WAIT':            return DEFAULT_DELAY;         // 450ms - 等待用默认
    default:                return DEFAULT_DELAY;
  }
}

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

    // [P0 Fix 3.7] 使用 ref 追踪组件是否已卸载，防止卸载后更新 state
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (queue.length === 0 || timerRef.current) return;

        const action = queue[0];
    const delay = getSmartDelay(action);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      
      // [P0 Fix 3.7] 组件已卸载则不执行
      if (!isMountedRef.current) return;
      
      // 执行动作
      processRef.current(action);
      
      // 移除已执行动作
      setQueue(prev => prev.slice(1));
    }, delay);

    // [P0 Fix 3.7] 清理当前 timer，防止组件卸载后触发 setState
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [queue]);

  // 组件卸载时彻底清理
  useEffect(() => {
      return () => {
          if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
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
