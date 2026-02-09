/**
 * 通用工具函数
 * 
 * [P2 Fix #17] Supabase 重试机制
 * [P2 Fix #22] localStorage 节流保存
 */

// ============ 重试机制 (#17) ============

/**
 * 带指数退避的重试函数
 * @param fn 要执行的异步函数
 * @param maxRetries 最大重试次数
 * @param baseDelay 基础延迟(毫秒)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 最后一次尝试不等待
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// ============ 节流函数 (#22) ============

/**
 * 创建节流函数
 * @param fn 要节流的函数
 * @param delay 节流延迟(毫秒)
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= delay) {
      lastCall = now;
      fn(...args);
    } else {
      // 延迟执行，确保最后一次调用会被执行
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * 创建防抖函数
 * @param fn 要防抖的函数
 * @param delay 防抖延迟(毫秒)
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ============ 安全 localStorage 操作 ============

/**
 * 节流版 localStorage 保存
 */
export const throttledLocalStorageSave = throttle((key: string, data: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('[Storage] Failed to save:', error);
  }
}, 3000); // 3秒节流

/**
 * 安全读取 localStorage
 */
export function safeLocalStorageGet<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * 安全写入 localStorage
 */
export function safeLocalStorageSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
