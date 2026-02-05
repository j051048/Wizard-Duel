import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Info } from 'lucide-react';

interface TutorialStep {
  title: string;
  content: string;
  targetId?: string; 
  position: 'top' | 'bottom' | 'center' | 'left' | 'right';
  requiredAction?: 'PLAY_FIRE_CARD' | 'USE_SKILL'; // [New 6.4] 需要执行的操作
  isBlocking?: boolean; // [New 6.4] 是否锁定操作
}

interface TutorialOverlayProps {
  onComplete: () => void;
  lastAction?: string; // 最近一次玩家执行的操作 ID
}

const steps: TutorialStep[] = [
  {
    title: "欢迎来到巫师对决！",
    content: "你将扮演一名掌握五行元素的巫师，通过合理的卡牌组合击败对手。点击屏幕继续。",
    position: 'center'
  },
  {
    title: "你的手牌",
    content: "点击卡牌可以预览效果和预估伤害。再次点击或上划即可释放魔法！",
    targetId: 'player-card-0',
    position: 'bottom'
  },
  {
    title: "克制实战！",
    content: "对手现在使用了 [荆棘缠绕]，属于藤蔓系。请从手牌中拖拽一张 [火系卡牌] 来克制它，造成双倍伤害！",
    targetId: 'player-card-0',
    position: 'bottom',
    requiredAction: 'PLAY_FIRE_CARD',
    isBlocking: true
  },
  {
    title: "做得好！",
    content: "双倍伤害非常致命。消灭对手的生命值即可获胜。祝你好运，巫师！",
    position: 'center'
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete, lastAction }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  const step = steps[currentStep];

  // [New 6.4] 监听操作执行，实现引导闭环
  useEffect(() => {
    if (step.requiredAction && lastAction === step.requiredAction) {
        setTimeout(() => handleNext(true), 1000); // 延迟跳转，强制执行下一步
    }
  }, [lastAction, step.requiredAction]);

  useEffect(() => {
    if (step.targetId) {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightStyle({
          position: 'fixed',
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
          borderRadius: '12px',
          zIndex: 90,
          pointerEvents: 'none',
          transition: 'all 0.3s ease'
        });
      }
    } else {
      setHighlightStyle({
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 90,
        pointerEvents: 'none'
      });
    }
  }, [currentStep, step.targetId]);

  const handleNext = (force: boolean = false) => {
    // [New 6.4] 如果是强制执行步骤，且非强制跳过，则点击背景不跳转
    if (step.isBlocking && !force) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 select-none" onClick={handleNext}>
      {/* Highlight Layer */}
      <div style={highlightStyle} />

      {/* Content Box */}
      <div className={`
        relative z-[101] max-w-sm w-full bg-slate-900/95 border-2 border-purple-500/50 rounded-2xl p-6 shadow-2xl transition-all
        ${step.position === 'center' ? 'mt-0' : step.position === 'bottom' ? 'mt-auto mb-32' : 'mt-32'}
      `}>
         <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-purple-500 rounded-xl">
               <Info className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{step.title}</h3>
              <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                {step.content}
              </p>
            </div>
         </div>

         <div className="flex justify-between items-center mt-6">
            <div className="flex gap-1">
               {steps.map((_, i) => (
                 <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-6 bg-purple-500' : 'w-2 bg-slate-700'}`} />
               ))}
            </div>
            <button className="flex items-center gap-1 text-purple-400 font-bold hover:text-purple-300">
               {currentStep === steps.length - 1 ? '开始战斗' : '下一步'}
               <ChevronRight size={18} />
            </button>
         </div>

         <button 
           onClick={(e) => { e.stopPropagation(); onComplete(); }}
           className="absolute -top-3 -right-3 p-1 bg-slate-800 border-2 border-slate-700 rounded-full text-slate-400 hover:text-white"
          >
            <X size={16} />
         </button>
      </div>
      
      {/* Click Hint */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-xs animate-pulse z-[101]">
        点击任意区域继续
      </div>
    </div>
  );
};
