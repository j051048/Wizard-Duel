import { useState, useEffect, useCallback, useMemo } from 'react';
import { DuelPhase, GameState } from '../types';
import { TUTORIAL_STEPS, TutorialStepConfig, getActiveTutorialStep } from '../data/tutorialSteps';

/**
 * useTutorial Hook (v2.0)
 * 
 * 管理新手教程的状态和流程
 * [P0 Balance] 强制前3回合教程，确保新玩家学会核心机制
 */

const STORAGE_KEY = 'wizard_duel_tutorial_v2';

export function useTutorial(
  isEnabled: boolean,
  gameState: GameState,
  currentPhase: DuelPhase,
  roundNumber: number
) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isSkipped, setIsSkipped] = useState(false);
  const [currentDelay, setCurrentDelay] = useState<NodeJS.Timeout | null>(null);

  // 从 localStorage 恢复已完成的步骤
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompletedSteps(new Set(parsed.completed || []));
        setIsSkipped(parsed.skipped || false);
      }
    } catch (e) {
      console.warn('Failed to load tutorial state:', e);
    }
  }, []);

  // 保存状态到 localStorage
  const saveState = useCallback((completed: Set<string>, skipped: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        completed: Array.from(completed),
        skipped
      }));
    } catch (e) {
      console.warn('Failed to save tutorial state:', e);
    }
  }, []);

  // 完成当前步骤
  const completeStep = useCallback((stepId: string) => {
    setCompletedSteps(prev => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      saveState(next, isSkipped);
      return next;
    });
  }, [isSkipped, saveState]);

  // 跳过整个教程
  const skipTutorial = useCallback(() => {
    setIsSkipped(true);
    saveState(completedSteps, true);
  }, [completedSteps, saveState]);

  // 重置教程（用于测试或玩家想重新学习）
  const resetTutorial = useCallback(() => {
    setCompletedSteps(new Set());
    setIsSkipped(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // 计算当前应该显示的步骤
  const activeStep = useMemo(() => {
    // 如果教程被禁用或跳过，不显示任何步骤
    if (!isEnabled || isSkipped) return null;
    
    return getActiveTutorialStep(
      TUTORIAL_STEPS,
      completedSteps,
      gameState,
      currentPhase,
      roundNumber
    );
  }, [isEnabled, isSkipped, completedSteps, gameState, currentPhase, roundNumber]);

  // 处理延迟显示
  const [delayedStep, setDelayedStep] = useState<TutorialStepConfig | null>(null);
  
  useEffect(() => {
    if (currentDelay) {
      clearTimeout(currentDelay);
    }

    if (activeStep?.delay) {
      const timer = setTimeout(() => {
        setDelayedStep(activeStep);
      }, activeStep.delay);
      setCurrentDelay(timer);
    } else {
      setDelayedStep(activeStep);
    }

    return () => {
      if (currentDelay) clearTimeout(currentDelay);
    };
  }, [activeStep]);

  // 处理玩家动作
  const handleAction = useCallback((actionType: 'PLAY_CARD' | 'MULLIGAN' | 'END_TURN' | 'ANY') => {
    if (!delayedStep) return;
    
    if (delayedStep.requireAction === actionType || delayedStep.requireAction === 'ANY') {
      completeStep(delayedStep.id);
    }
  }, [delayedStep, completeStep]);

  // 手动进入下一步（用于 blocking 步骤）
  const nextStep = useCallback(() => {
    if (delayedStep) {
      completeStep(delayedStep.id);
    }
  }, [delayedStep, completeStep]);

  // 计算教程进度
  const progress = useMemo(() => {
    const total = TUTORIAL_STEPS.length;
    const completed = completedSteps.size;
    return {
      current: completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  }, [completedSteps]);

  // 判断教程是否已完成
  const isCompleted = useMemo(() => {
    return completedSteps.has('tutorial_complete') || isSkipped;
  }, [completedSteps, isSkipped]);

  return {
    activeStep: delayedStep,
    handleAction,
    nextStep,
    skipTutorial,
    resetTutorial,
    isActive: !!delayedStep,
    isCompleted,
    isSkipped,
    progress
  };
}

export default useTutorial;
