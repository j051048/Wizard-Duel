import React, { useEffect, useState } from 'react';
import { X, ChevronRight, Info } from 'lucide-react';
import { TutorialStepConfig } from '../../data/tutorialSteps';

interface TutorialOverlayProps {
  step: TutorialStepConfig;
  onNext: () => void;
  onSkip?: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onSkip }) => {
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  
  useEffect(() => {
    if (step.targetId) {
      const updatePosition = () => {
          const el = document.getElementById(step.targetId!);
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
          } else {
              // Fallback if element not found yet
               setHighlightStyle({
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 90,
                pointerEvents: 'none'
              });
          }
      };
      
      updatePosition();
      // Retry for dynamic content
      const timer = setTimeout(updatePosition, 100); 
      window.addEventListener('resize', updatePosition);
      return () => {
          clearTimeout(timer);
          window.removeEventListener('resize', updatePosition);
      };
    } else {
      setHighlightStyle({
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 90,
        pointerEvents: 'none'
      });
    }
  }, [step.targetId]);

  const handleContainerClick = () => {
      // 如果需要特定操作才能完成，点击背景无效
      if (step.requireAction) return;
      onNext();
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 select-none ${step.requireAction ? 'pointer-events-none' : 'pointer-events-auto'}`} 
      onClick={handleContainerClick}
    >
      {/* Highlight Layer */}
      <div style={highlightStyle} />

      {/* Content Box */}
      <div 
         className={`
            relative z-[101] max-w-sm w-full bg-slate-900/95 border-2 border-purple-500/50 rounded-2xl p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-300 pointer-events-auto
            ${step.position === 'center' ? 'mt-0' : 
              step.position === 'bottom' ? 'mt-auto mb-32' : 
              step.position === 'top' ? 'mb-auto mt-32' :
              step.position === 'left' ? 'mr-auto ml-10' : 'ml-auto mr-10'}
         `}
         onClick={(e) => e.stopPropagation()} // Prevent auto-next when clicking the box
      >
         <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-purple-500 rounded-xl shadow-lg shadow-purple-500/30">
               <Info className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{step.title}</h3>
              <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                {step.content}
              </p>
            </div>
         </div>

         <div className="flex justify-end items-center mt-6">
            {!step.requireAction ? (
                <button 
                  onClick={onNext}
                  className="flex items-center gap-1 text-purple-400 font-bold hover:text-purple-300 transition-colors px-4 py-2 hover:bg-white/5 rounded-lg"
                >
                   下一步
                   <ChevronRight size={18} />
                </button>
            ) : (
                <div className="text-xs text-amber-400 font-mono tracking-wider animate-pulse px-2 py-1 bg-amber-500/10 rounded border border-amber-500/30">
                    请按指示操作
                </div>
            )}
         </div>

         {onSkip && (
             <button 
               onClick={(e) => { e.stopPropagation(); onSkip(); }}
               className="absolute -top-3 -right-3 p-1.5 bg-slate-800 border-2 border-slate-700 rounded-full text-slate-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all shadow-lg"
               title="跳过引导"
              >
                <X size={14} />
             </button>
         )}
      </div>
      
      {/* Click Hint */}
      {!step.requireAction && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-xs animate-pulse z-[101]">
            点击任意区域继续
          </div>
      )}
    </div>
  );
};
