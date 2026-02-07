/**
 * useGameFeedback - 游戏反馈管理
 * 
 * [#5 App.tsx 瘦身] 从 App.tsx 提取音效与震动反馈逻辑
 * 
 * 职责：
 * - 监听游戏效果消息并触发相应反馈
 * - 管理震动状态
 * - 处理游戏结束时的音效
 */

import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { HapticService } from '../services/haptic';

interface UseGameFeedbackDeps {
  effectMessages: string[];
  audioActions: {
    playSfx: (sfx: 'hit' | 'victory' | 'defeat' | 'cardPlay' | 'button') => void;
  };
}

export function useGameFeedback({ effectMessages, audioActions }: UseGameFeedbackDeps) {
  const ui = useUIStore();
  const prevMessagesLengthRef = useRef(0);

  /**
   * 监听效果消息，触发震动与音效
   */
  useEffect(() => {
    // 只处理新增的消息
    if (effectMessages.length <= prevMessagesLengthRef.current) {
      prevMessagesLengthRef.current = effectMessages.length;
      return;
    }
    
    const lastMsg = effectMessages[effectMessages.length - 1];
    prevMessagesLengthRef.current = effectMessages.length;
    
    if (!lastMsg) return;

    // 玩家受到伤害
    if (lastMsg.includes('受到')) {
      ui.setIsPlayerShaking(true);
      audioActions.playSfx('hit');
      HapticService.heavy();
      setTimeout(() => ui.setIsPlayerShaking(false), 500);
    } 
    // 对手受到伤害
    else if (lastMsg.includes('造成')) {
      ui.setIsOpponentShaking(true);
      audioActions.playSfx('hit');
      HapticService.light();
      setTimeout(() => ui.setIsOpponentShaking(false), 500);
    }
    // 暴击效果
    else if (lastMsg.includes('暴击') || lastMsg.includes('克制')) {
      HapticService.medium();
    }
  }, [effectMessages, audioActions, ui]);

  /**
   * 游戏结束反馈
   */
  const triggerGameEndFeedback = useCallback((result: 'WIN' | 'LOSS' | 'DRAW') => {
    if (result === 'WIN') {
      audioActions.playSfx('victory');
      HapticService.success();
    } else {
      audioActions.playSfx('defeat');
      HapticService.failure();
    }
  }, [audioActions]);

  /**
   * 出牌反馈
   */
  const triggerCardPlayFeedback = useCallback(() => {
    audioActions.playSfx('cardPlay');
    HapticService.medium();
  }, [audioActions]);

  /**
   * 按钮点击反馈
   */
  const triggerButtonFeedback = useCallback(() => {
    audioActions.playSfx('button');
    HapticService.light();
  }, [audioActions]);

  return {
    triggerGameEndFeedback,
    triggerCardPlayFeedback,
    triggerButtonFeedback,
  };
}
