import React from 'react';

interface DragDropZoneProps {
  dragState: {
    isDragging: boolean;
    isInDropZone: boolean;
    spellId: string;
    // ... other props
  } | null;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({ dragState }) => {
  if (!dragState?.isDragging) return null;

  return (
    <div className="fixed inset-0 z-[150] pointer-events-none flex items-center justify-center">
      {/* 释放区域发光提示 */}
      <div 
        className={`
          w-48 h-48 md:w-64 md:h-64 rounded-full 
          border-4 border-dashed 
          flex items-center justify-center
          transition-all duration-300
          ${dragState.isInDropZone 
            ? 'border-green-400 bg-green-500/20 scale-110 shadow-[0_0_60px_rgba(74,222,128,0.5)]' 
            : 'border-amber-400/60 bg-amber-500/10 animate-pulse shadow-[0_0_40px_rgba(251,191,36,0.3)]'
          }
        `}
      >
        <div className={`text-center ${dragState.isInDropZone ? 'scale-110' : ''} transition-transform`}>
          <div className={`text-4xl md:text-5xl mb-2 ${dragState.isInDropZone ? 'animate-bounce' : ''}`}>
            {dragState.isInDropZone ? '✨' : '⬆️'}
          </div>
          <span className={`
            text-sm md:text-base font-bold
            ${dragState.isInDropZone ? 'text-green-300' : 'text-amber-300/80'}
          `}>
            {dragState.isInDropZone ? '松开释放！' : '拖到这里释放'}
          </span>
        </div>
      </div>
      
      {/* 箭头指引 - 从手牌指向释放区 */}
      {!dragState.isInDropZone && (
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2">
          <div className="text-amber-400/60 text-3xl animate-bounce">
            ⬆️
          </div>
        </div>
      )}
    </div>
  );
};
