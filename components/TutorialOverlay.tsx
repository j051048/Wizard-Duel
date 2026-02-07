import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, SkipForward, Lightbulb, Target } from 'lucide-react';
import { TutorialStepConfig } from '../data/tutorialSteps';

/**
 * TutorialOverlay (v2.0)
 * 
 * 全新设计的新手引导覆盖层
 * - 支持高亮特定元素
 * - 箭头指向目标
 * - 阻塞/非阻塞模式
 * - 进度条显示
 */

interface TutorialOverlayProps {
  step: TutorialStepConfig | null;
  onNext: () => void;
  onSkip?: () => void;
  progress?: { current: number; total: number; percentage: number };
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ 
  step, 
  onNext, 
  onSkip,
  progress 
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [contentPosition, setContentPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 计算目标元素位置
  useEffect(() => {
    if (!step?.targetId) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const el = document.getElementById(step.targetId!);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    updatePosition();
    
    // 监听窗口变化
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [step?.targetId]);

  // 计算内容框位置
  useEffect(() => {
    if (!step) return;

    const padding = 20;
    const boxWidth = 320;
    const boxHeight = 200;
    
    let x = window.innerWidth / 2 - boxWidth / 2;
    let y = window.innerHeight / 2 - boxHeight / 2;

    if (targetRect) {
      switch (step.position) {
        case 'top':
          x = targetRect.left + targetRect.width / 2 - boxWidth / 2;
          y = targetRect.top - boxHeight - padding - 20;
          break;
        case 'bottom':
          x = targetRect.left + targetRect.width / 2 - boxWidth / 2;
          y = targetRect.bottom + padding + 20;
          break;
        case 'left':
          x = targetRect.left - boxWidth - padding - 20;
          y = targetRect.top + targetRect.height / 2 - boxHeight / 2;
          break;
        case 'right':
          x = targetRect.right + padding + 20;
          y = targetRect.top + targetRect.height / 2 - boxHeight / 2;
          break;
      }
    }

    // 边界检查
    x = Math.max(padding, Math.min(x, window.innerWidth - boxWidth - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - boxHeight - padding));

    setContentPosition({ x, y });
  }, [step, targetRect]);

  const handleBackdropClick = useCallback(() => {
    if (step?.isBlocking) return;
    if (!step?.requireAction) {
      onNext();
    }
  }, [step, onNext]);

  if (!step) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] select-none">
        {/* 背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={handleBackdropClick}
        >
          {/* SVG 遮罩 - 高亮目标区域 */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                {targetRect && (
                  <rect
                    x={targetRect.left - 8}
                    y={targetRect.top - 8}
                    width={targetRect.width + 16}
                    height={targetRect.height + 16}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.8)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* 高亮边框 */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute pointer-events-none"
              style={{
                left: targetRect.left - 8,
                top: targetRect.top - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
              }}
            >
              <div className="w-full h-full rounded-xl border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse" />
            </motion.div>
          )}
        </motion.div>

        {/* 箭头指示器 */}
        {step.showArrow && targetRect && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.8 }}
            className="absolute z-[201] pointer-events-none"
            style={{
              left: targetRect.left + targetRect.width / 2 - 16,
              top: step.position === 'bottom' ? targetRect.top - 48 : targetRect.bottom + 8,
            }}
          >
            <Target 
              size={32} 
              className={`text-purple-400 ${step.position === 'bottom' ? '' : 'rotate-180'}`}
            />
          </motion.div>
        )}

        {/* 内容框 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute z-[202] w-80"
          style={{
            left: step.position === 'center' ? '50%' : contentPosition.x,
            top: step.position === 'center' ? '50%' : contentPosition.y,
            transform: step.position === 'center' ? 'translate(-50%, -50%)' : undefined,
          }}
        >
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-purple-500/50 shadow-2xl shadow-purple-500/20 overflow-hidden">
            {/* 头部 */}
            <div className="bg-purple-900/50 px-4 py-3 flex items-center gap-3 border-b border-purple-500/30">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white flex-1">{step.title}</h3>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="跳过教程"
                >
                  <SkipForward size={18} />
                </button>
              )}
            </div>

            {/* 内容 */}
            <div className="p-4">
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                {step.content}
              </p>
            </div>

            {/* 底部 */}
            <div className="px-4 py-3 bg-slate-900/50 flex items-center justify-between border-t border-slate-700/50">
              {/* 进度条 */}
              {progress && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {Array.from({ length: progress.total }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i < progress.current 
                            ? 'w-3 bg-purple-500' 
                            : i === progress.current 
                              ? 'w-4 bg-purple-400 animate-pulse' 
                              : 'w-2 bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">
                    {progress.current + 1}/{progress.total}
                  </span>
                </div>
              )}

              {/* 下一步按钮 */}
              <button
                onClick={onNext}
                disabled={step.requireAction !== undefined}
                className={`
                  flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-sm transition-all
                  ${step.requireAction 
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg hover:shadow-purple-500/30'
                  }
                `}
              >
                {step.requireAction ? (
                  <>
                    <span>执行操作</span>
                    <span className="animate-pulse">👆</span>
                  </>
                ) : (
                  <>
                    <span>继续</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* 底部提示 */}
        {!step.requireAction && !step.isBlocking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-xs z-[201]"
          >
            点击任意区域继续
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default TutorialOverlay;
