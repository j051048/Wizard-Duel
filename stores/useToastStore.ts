/**
 * useToastStore - Toast消息状态管理
 */

import { create } from 'zustand';
import { ToastType, ToastMessage } from '../components/ui/Toast';

interface ToastState {
  toasts: ToastMessage[];
  
  // Actions
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
  
  // Convenience methods
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (type, title, message, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = { id, type, title, message, duration };
    
    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast] // 最多显示5条
    }));
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  clearAll: () => set({ toasts: [] }),

  // Convenience methods
  success: (title, message) => get().addToast('success', title, message),
  error: (title, message) => get().addToast('error', title, message),
  warning: (title, message) => get().addToast('warning', title, message),
  info: (title, message) => get().addToast('info', title, message),
}));

export default useToastStore;