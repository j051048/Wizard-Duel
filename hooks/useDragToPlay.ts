import { useState, useEffect, useRef } from 'react';
import { SpellType, GameLoopState } from '../types';
import { HapticService } from '../services/haptic';
import { useMotionValue, useTransform } from 'framer-motion';

interface DragState {
  spellId: SpellType;
  index: number;
  startX: number;
  startY: number;
  // currentX/Y removed to prevent re-renders
  isDragging: boolean;
  isInDropZone: boolean; 
}

export const useDragToPlay = (
  onPlayCard: (spellId: SpellType, isConfirmed: boolean) => void,
  setTargeting: (data: GameLoopState['targetingData']) => void,
  isProcessing: boolean,
  phase: string,
  isAffordable: (spellId: SpellType) => boolean,
  onDragMove?: (x: number, y: number) => void
) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  
  // [Performance] 使用 MotionValue 追踪坐标，避免触发组件重渲染
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // [Performance] 用于节流 setTargeting
  const lastTargetingTime = useRef(0);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState) return;
      
      // 更新 MotionValue (不触发 React Render)
      x.set(e.clientX);
      y.set(e.clientY);

      // [P0 新手引导] 计算是否在释放区域内 (屏幕上半部分60%)
      const dropZoneThreshold = window.innerHeight * 0.6;
      const isInDropZone = e.clientY < dropZoneThreshold;

      if (onDragMove) {
          onDragMove(e.clientX, e.clientY);
      }
      
      // 只有当 dropZone 状态改变时才更新 State
      if (isInDropZone !== dragState.isInDropZone) {
          setDragState(prev => prev ? { ...prev, isInDropZone } : null);
          HapticService.light();
      }
      
      // 更新瞄准线 (仅当需要时更新 Targeting State)
      // 注意：这里 setTargeting 仍然会触发重渲染，但在释放区外(拖拽区)不触发
      // 优化：瞄准线应该也使用 motion values，目前暂保持原有逻辑但限制触发频率
      // 真正优化需要在 TargetingArrow 中使用 motion value
      if (e.clientY < window.innerHeight * 0.7) {
        const now = Date.now();
        // [Performance] 节流：限制瞄准线更新频率为 ~30fps (33ms)，避免过于频繁的 React 重绘
        // 这是解决"拖拽卡顿"的关键优化之一，因为瞄准线更新会触发 BattleArena 重绘
        if (now - lastTargetingTime.current > 32) {
            setTargeting({
              isTargeting: true,
              startX: dragState.startX,
              startY: dragState.startY,
              endX: e.clientX,
              endY: e.clientY
            });
            lastTargetingTime.current = now;
        }
      } else {
        // 离开瞄准区域时立即清除
        if (lastTargetingTime.current !== 0) { // 稍微优化，避免重复 null
            setTargeting(null);
            lastTargetingTime.current = 0; 
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragState) return;
      
      const threshold = window.innerHeight * 0.6;
      if (e.clientY < threshold) {
        onPlayCard(dragState.spellId, true);
      }
      
      setDragState(null);
      setTargeting(null);
    };

    if (dragState) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, onPlayCard, setTargeting, x, y]); // Dependencies updated

  const startDrag = (spellId: SpellType, index: number, startX: number, startY: number) => {
    if (!isAffordable(spellId) || phase !== 'PLAYER_TURN' || isProcessing) return;
    
    HapticService.light();
    
    // 初始化坐标
    x.set(startX);
    y.set(startY);

    setDragState({
      spellId,
      index,
      startX,
      startY,
      isDragging: true,
      isInDropZone: false 
    });
  };

  return { dragState, startDrag, dragX: x, dragY: y };
};
