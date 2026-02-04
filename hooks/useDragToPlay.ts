import { useState, useEffect } from 'react';
import { SpellType, GameLoopState } from '../types';
import { HapticService } from '../services/haptic';

interface DragState {
  spellId: SpellType;
  index: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

export const useDragToPlay = (
  onPlayCard: (spellId: SpellType, isConfirmed: boolean) => void,
  setTargeting: (data: GameLoopState['targetingData']) => void,
  isProcessing: boolean,
  phase: string,
  isAffordable: (spellId: SpellType) => boolean
) => {
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState) return;
      setDragState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY, isDragging: true } : null);
      
      // 更新瞄准线
      if (e.clientY < window.innerHeight * 0.7) {
        setTargeting({
          isTargeting: true,
          startX: dragState.startX,
          startY: dragState.startY,
          endX: e.clientX,
          endY: e.clientY
        });
      } else {
        setTargeting(null);
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
  }, [dragState, onPlayCard, setTargeting]);

  const startDrag = (spellId: SpellType, index: number, x: number, y: number) => {
    if (!isAffordable(spellId) || phase !== 'PLAYER_TURN' || isProcessing) return;
    
    HapticService.light();
    setDragState({
      spellId,
      index,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      isDragging: false
    });
  };

  return { dragState, startDrag };
};
