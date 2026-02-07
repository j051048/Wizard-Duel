import React from 'react';

interface DragDropZoneProps {
  dragState: {
    isDragging: boolean;
    isInDropZone: boolean;
    spellId: string;
  } | null;
}

/**
 * DragDropZone - 拖拽释放区域
 * [P0 UX 优化] 增强视觉引导，新手友好
 */
export const DragDropZone: React.FC<DragDropZoneProps> = ({ dragState }) => {
  if (!dragState?.isDragging) return null;

  const isInZone = dragState.isInDropZone;

  return (
    <div className="fixed inset-0 z-[150] pointer-events-none">
      {/* 全屏半透明遮罩 - 聚焦注意力 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      
      {/* 主释放区域 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* 外圈脉冲光环 */}
        <div 
          className={`
            absolute w-56 h-56 md:w-72 md:h-72 rounded-full
            transition-all duration-500
            ${isInZone 
              ? 'bg-green-500/20 scale-125' 
              : 'bg-amber-500/10 animate-ping-slow'
            }
          `}
          style={{ animationDuration: '2s' }}
        />
        
        {/* 中圈发光边框 */}
        <div 
          className={`
            absolute w-48 h-48 md:w-64 md:h-64 rounded-full 
            border-4 transition-all duration-300
            ${isInZone 
              ? 'border-green-400 bg-green-500/30 scale-110 shadow-[0_0_80px_rgba(74,222,128,0.6),inset_0_0_40px_rgba(74,222,128,0.3)]' 
              : 'border-amber-400 bg-amber-500/20 shadow-[0_0_60px_rgba(251,191,36,0.4),inset_0_0_30px_rgba(251,191,36,0.2)]'
            }
          `}
        >
          {/* 旋转魔法阵装饰 */}
          <div 
            className={`absolute inset-2 rounded-full border-2 border-dashed transition-colors duration-300 ${isInZone ? 'border-green-300/50' : 'border-amber-300/40'}`}
            style={{ animation: 'spin 8s linear infinite' }}
          />
          <div 
            className={`absolute inset-4 rounded-full border border-dotted transition-colors duration-300 ${isInZone ? 'border-green-200/30' : 'border-amber-200/30'}`}
            style={{ animation: 'spin 12s linear infinite reverse' }}
          />
        </div>
        
        {/* 中心内容 */}
        <div className={`relative z-10 text-center transition-transform duration-300 ${isInZone ? 'scale-110' : ''}`}>
          <div className={`text-5xl md:text-6xl mb-3 transition-all duration-300 ${isInZone ? 'animate-bounce' : 'animate-float'}`}>
            {isInZone ? '✨' : '🎯'}
          </div>
          <span className={`
            text-base md:text-lg font-bold tracking-wider
            ${isInZone ? 'text-green-300' : 'text-amber-300'}
          `}>
            {isInZone ? '松开释放！' : '拖到这里'}
          </span>
          {!isInZone && (
            <div className="text-xs text-amber-200/60 mt-1">释放法术</div>
          )}
        </div>
      </div>
      
      {/* 底部箭头指引 - 从手牌指向释放区 */}
      {!isInZone && (
        <div className="absolute bottom-32 md:bottom-40 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="text-amber-400 text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>▲</div>
          <div className="text-amber-400/70 text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>▲</div>
          <div className="text-amber-400/40 text-lg animate-bounce" style={{ animationDelay: '0.3s' }}>▲</div>
        </div>
      )}
      
      {/* 成功时的粒子效果 */}
      {isInZone && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"
              style={{
                left: `${50 + Math.cos(i * Math.PI / 4) * 20}%`,
                top: `${50 + Math.sin(i * Math.PI / 4) * 20}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
