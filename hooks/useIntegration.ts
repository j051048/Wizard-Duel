/**
 * useIntegration - 外部应用集成 Hook
 * 
 * 用于将 Wizard Duel 嵌入其他应用时的通信和状态同步
 * 
 * 特性：
 * - 通过 postMessage 与父应用通信
 * - 从 URL 参数接收初始状态
 * - 向父应用报告游戏事件
 * - 支持积分同步
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiService } from '../services/api';

interface IntegrationState {
  isEmbedded: boolean;      // 是否嵌入在其他应用中
  parentOrigin: string | null;  // 父应用来源
  userId: string | null;    // 从父应用接收的用户ID
  initialPoints: number | null;  // 从父应用接收的初始积分
  isReady: boolean;         // 集成是否就绪
}

interface IntegrationActions {
  notifyParent: (event: string, data: any) => void;
  requestPoints: () => void;
  reportBalanceChange: (newBalance: number, change: number) => void;
  reportGameEnd: (result: 'WIN' | 'LOSS' | 'DRAW', payout: number) => void;
  exitGame: () => void;
}

// 消息类型定义
interface ParentMessage {
  type: string;
  userId?: string;
  points?: number;
  token?: string;
  action?: string;
}

export function useIntegration(): [IntegrationState, IntegrationActions] {
  const [state, setState] = useState<IntegrationState>({
    isEmbedded: false,
    parentOrigin: null,
    userId: null,
    initialPoints: null,
    isReady: false,
  });

  const parentOriginRef = useRef<string | null>(null);

  // 检测是否在 iframe 中运行
  useEffect(() => {
    const isEmbedded = window.self !== window.top;
    
    // 从 URL 参数读取配置
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    const urlPoints = urlParams.get('points');
    
    setState(prev => ({
      ...prev,
      isEmbedded,
      userId: urlUserId,
      initialPoints: urlPoints ? parseInt(urlPoints, 10) : null,
    }));

    // 如果有 URL 参数中的积分，同步到后端
    if (urlUserId && urlPoints) {
      ApiService.receiveExternalPoints('url_param', {
        userId: urlUserId,
        points: parseInt(urlPoints, 10),
      });
    }
  }, []);

  // 监听来自父应用的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 安全检查：验证消息来源
      // 在生产环境中，应该检查 event.origin 是否在白名单中
      
      const data = event.data as ParentMessage;
      
      if (!data || typeof data.type !== 'string') return;
      
      // 处理不同类型的消息
      switch (data.type) {
        case 'wizard_duel_init':
          // 接收初始化数据
          parentOriginRef.current = event.origin;
          setState(prev => ({
            ...prev,
            parentOrigin: event.origin,
            userId: data.userId || prev.userId,
            initialPoints: data.points || prev.initialPoints,
            isReady: true,
          }));

          // 同步积分到后端
          if (data.userId && data.points) {
            ApiService.receiveExternalPoints('parent_app', {
              userId: data.userId,
              points: data.points,
              token: data.token,
            });
          }

          // 回复父应用：游戏已就绪
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'wizard_duel_ready' }, event.origin);
          }
          break;

        case 'wizard_duel_exit':
          // 父应用请求退出游戏
          // 可以在这里保存状态或显示确认对话框
          console.log('Parent requested exit');
          break;

        case 'wizard_duel_sync_points':
          // 父应用同步积分
          if (data.points !== undefined && data.userId) {
            ApiService.receiveExternalPoints('parent_app', {
              userId: data.userId,
              points: data.points,
            });
          }
          break;

        default:
          // 未知消息类型
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 向父应用发送消息
  const notifyParent = useCallback((event: string, data: any) => {
    if (window.parent !== window && parentOriginRef.current) {
      window.parent.postMessage({
        type: `wizard_duel_${event}`,
        ...data,
      }, parentOriginRef.current);
    }

    // 同时触发自定义事件（供同页面监听）
    window.dispatchEvent(new CustomEvent(`wizardDuel:${event}`, { detail: data }));
  }, []);

  // 请求父应用提供积分
  const requestPoints = useCallback(() => {
    notifyParent('request_points', {});
  }, [notifyParent]);

  // 报告余额变更
  const reportBalanceChange = useCallback((newBalance: number, change: number) => {
    notifyParent('balance_change', { balance: newBalance, change });
  }, [notifyParent]);

  // 报告游戏结束
  const reportGameEnd = useCallback((result: 'WIN' | 'LOSS' | 'DRAW', payout: number) => {
    notifyParent('game_end', { result, payout });
  }, [notifyParent]);

  // 退出游戏
  const exitGame = useCallback(() => {
    notifyParent('exit', {});
  }, [notifyParent]);

  // 初始化完成后通知父应用
  useEffect(() => {
    if (state.isEmbedded && !state.isReady) {
      // 延迟发送就绪信号，等待初始化完成
      const timer = setTimeout(() => {
        notifyParent('initialized', {});
        setState(prev => ({ ...prev, isReady: true }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.isEmbedded, state.isReady, notifyParent]);

  const actions: IntegrationActions = {
    notifyParent,
    requestPoints,
    reportBalanceChange,
    reportGameEnd,
    exitGame,
  };

  return [state, actions];
}

export default useIntegration;
