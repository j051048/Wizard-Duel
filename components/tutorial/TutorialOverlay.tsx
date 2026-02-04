import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Check } from 'lucide-react';

export interface TutorialStep {
  targetId?: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  onComplete,
  onSkip
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  const currentStep = steps[currentStepIndex];

  const updateTargetRect = useCallback(() => {
    if (currentStep?.targetId) {
      const element = document.getElementById(currentStep.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // If element not found, fallback to center or retry
        setTargetRect(null);
      }
    } else {
        setTargetRect(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, currentStep?.targetId]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    // Also update on scroll just in case
    window.addEventListener('scroll', updateTargetRect);
    
    // Safety timeout to retry finding element (e.g. if animation hasn't finished)
    const timer = setTimeout(updateTargetRect, 500);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
      clearTimeout(timer);
    };
  }, [updateTargetRect]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const isCenter = !currentStep?.targetId || !targetRect;

  // Mask path calculation
  const Mask = () => {
     if (!targetRect) return (
         <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm" 
         />
     );

     // Add padding to highlight
     const padding = 8;
     const x = targetRect.left - padding;
     const y = targetRect.top - padding;
     const w = targetRect.width + padding * 2;
     const h = targetRect.height + padding * 2;
     
     return (
        <svg className="fixed inset-0 z-[60] w-full h-full pointer-events-none">
           <defs>
              <mask id="tutorial-mask">
                 <rect x="0" y="0" width="100%" height="100%" fill="white" />
                 <motion.rect 
                    initial={{ x, y, width: w, height: h }}
                    animate={{ x, y, width: w, height: h }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    rx="12" 
                    fill="black" 
                 />
              </mask>
           </defs>
           <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#tutorial-mask)" />
           
           {/* Highlight Border */}
           <motion.rect
              initial={{ x, y, width: w, height: h }}
              animate={{ x, y, width: w, height: h }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              rx="12"
              fill="transparent"
              stroke="#a855f7" // purple-500
              strokeWidth="2"
              strokeDasharray="10 5"
           />
        </svg>
     );
  };

  // Add Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  // Tooltip positioning
  const getTooltipStyle = () => {
     if (isCenter) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
     
     if (!targetRect) return {};

     const padding = 20;
     let top = 0;
     let left: number | string = 0;
     let right: number | string | undefined = undefined;
     let transform = '';

     const preferPos = currentStep.position || 'bottom';
     
     if (preferPos === 'bottom') {
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2;
        transform = 'translateX(-50%)';
     } else if (preferPos === 'top') {
        top = targetRect.top - padding;
        left = targetRect.left + targetRect.width / 2;
        transform = 'translateX(-50%) translateY(-100%)';
     }
     
     // Boundary checks
     const windowWidth = window.innerWidth;
     const tooltipHalfWidth = 160; // Approximate half width of max-w-xs (320px / 2)

     if (typeof left === 'number') {
        // Left Edge Check
        if (left < tooltipHalfWidth + 20) {
           left = 20;
           transform = transform.replace('translateX(-50%)', '');
        }
        // Right Edge Check
        else if (left > windowWidth - tooltipHalfWidth - 20) {
           left = 'auto';
           right = 20;
           transform = transform.replace('translateX(-50%)', '');
        }
     }

     return { top, left, right, transform };
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[60]">
        <Mask />
        
        {/* Interaction Layer - allows clicks on Next/Skip but blocks everything else */}
        <div className="absolute inset-0 z-[61] pointer-events-none">
           <motion.div
             className="absolute pointer-events-auto bg-slate-900/90 border border-purple-500/50 rounded-xl p-6 shadow-2xl max-w-xs md:max-w-sm"
             style={getTooltipStyle() as any}
             initial={{ opacity: 0, scale: 0.9, y: 10 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             key={currentStepIndex}
             transition={{ type: "spring" }}
           >
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-xl font-bold text-white font-wizard">{currentStep?.title || ''}</h3>
                 <button onClick={onSkip} className="text-gray-500 hover:text-white transition-colors">
                    <X size={16} />
                 </button>
              </div>
              
              <div className="text-gray-300 text-sm mb-6 leading-relaxed">
                 {currentStep?.content || ''}
              </div>

              <div className="flex justify-between items-center">
                 <div className="flex gap-1">
                    {steps.map((_, idx) => (
                       <div 
                         key={idx} 
                         className={`w-2 h-2 rounded-full ${idx === currentStepIndex ? 'bg-purple-500' : 'bg-gray-700'}`} 
                       />
                    ))}
                 </div>
                 
                 <button 
                   onClick={handleNext}
                   className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-purple-500/30"
                 >
                    {currentStepIndex === steps.length - 1 ? (
                       <>开始旅程 <Check size={16} /></>
                    ) : (
                       <>下一步 <ArrowRight size={16} /></>
                    )}
                 </button>
              </div>
           </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
