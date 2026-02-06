import { useState, useEffect, useCallback, useRef } from 'react';
import { DuelPhase, GameState } from '../types';
import { TUTORIAL_STEPS, TutorialStepConfig } from '../data/tutorialSteps';

export function useTutorial(
  isEnabled: boolean,
  gameState: GameState,
  currentPhase: DuelPhase,
  roundNumber: number
) {
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const saved = localStorage.getItem('wizard_duel_tutorial_completed');
    if (saved) {
      setCompletedSteps(new Set(JSON.parse(saved)));
    }
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setActiveStepId(null);
    setCompletedSteps(prev => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      localStorage.setItem('wizard_duel_tutorial_completed', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  // 核心逻辑：根据游戏状态决定激活哪个 Step
  useEffect(() => {
    if (!isEnabled) {
        if (activeStepId) setActiveStepId(null);
        return;
    }
    if (activeStepId) return; // 已经有激活的步奏

    // 查找第一个符合条件且未完成的步骤
    const nextStep = TUTORIAL_STEPS.find(step => {
       if (completedSteps.has(step.id)) return false;
       
       // 全局状态匹配
       if (step.gameState && step.gameState !== gameState) return false;
       
       // 阶段匹配 (仅当在DUEL中)
       if (gameState === 'DUEL' && step.triggerPhase && step.triggerPhase !== currentPhase) return false;
       
       // 轮次匹配 (默认 Round 0/1 触发大部分)
       if (step.id === 'win_condition') {
           if (roundNumber < 2) return false;
       } else if (step.id === 'play_card_guide' || step.id === 'end_turn_guide') {
           // 这些基础操作引导通常在 Round 1
           if (roundNumber > 1 && completedSteps.has('welcome')) return false; // 如果已经是后期回合，不再提示基础操作
       }
       
       return true;
    });

    if (nextStep) {
       // 防抖
       const timer = setTimeout(() => {
           setActiveStepId(nextStep.id);
       }, 600);
       return () => clearTimeout(timer);
    }

  }, [isEnabled, gameState, currentPhase, roundNumber, completedSteps, activeStepId]);

  const currentStepConfig = TUTORIAL_STEPS.find(s => s.id === activeStepId);

  // Action Handler
  const handleAction = useCallback((actionType: 'PLAY_CARD' | 'MULLIGAN' | 'END_TURN') => {
      if (!currentStepConfig) return;
      
      if (currentStepConfig.requireAction === actionType) {
          completeStep(currentStepConfig.id);
      }
  }, [currentStepConfig, completeStep]);

  const nextStep = useCallback(() => {
     if (activeStepId) completeStep(activeStepId);
  }, [activeStepId, completeStep]);

  return {
    activeStep: currentStepConfig || null,
    handleAction,
    nextStep,
    isActive: !!currentStepConfig
  };
}
