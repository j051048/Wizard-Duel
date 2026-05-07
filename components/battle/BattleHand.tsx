import React, { useRef, useState, useEffect } from 'react';
import { SpellType, DuelPhase } from '../../types';
import { SpellCard } from '../SpellCard';
import { getSpellById } from '../../services/gameLogic';
import { HapticService } from '../../services/haptic';
import { motion, AnimatePresence } from 'framer-motion';
import { DragState } from '../../hooks/useDragToPlay';

interface BattleHandProps {
  hand: SpellType[];
  playableCards: SpellType[];
  phase: DuelPhase;
  isProcessing: boolean;
  isMobile: boolean;
  dragState: DragState | null;
  startDrag: (spellId: SpellType, index: number, x: number, y: number) => void;
  onPointerUpCard: () => void;
  onMouseEnterCard: (spellId: SpellType) => void;
  onMouseLeaveCard: () => void;
  onDoubleClickCard?: (spellId: SpellType) => void;
}

const BattleHand: React.FC<BattleHandProps> = ({
  hand,
  playableCards,
  phase,
  isProcessing,
  isMobile,
  dragState,
  startDrag,
  onPointerUpCard,
  onMouseEnterCard,
  onMouseLeaveCard,
  onDoubleClickCard
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // [Task 07] 内存安全清理：组件卸载时清理 timeout，防止内存泄漏
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  const handleCardClick = (spellId: SpellType, isAffordable: boolean) => {
    if (!isAffordable || phase !== 'PLAYER_TURN' || isProcessing) return;

    if (selectedCardId === spellId) {
      if (onDoubleClickCard) {
        HapticService.medium();
        onDoubleClickCard(spellId);
      }
      setSelectedCardId(null);
      if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
      return;
    }

    setSelectedCardId(spellId);
    HapticService.light();

    if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
    selectionTimeoutRef.current = setTimeout(() => {
      setSelectedCardId(prev => (prev === spellId ? null : prev));
    }, 2500);
  };

  if (isMobile) {
    /* ====== 移动端：横向滚动列表 (非堆叠) ====== */
    return (
      <div 
        ref={containerRef}
        className="flex gap-2 px-3 pb-2 overflow-x-auto overflow-y-visible scrollbar-hide snap-x snap-mandatory"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollPaddingLeft: '12px',
          scrollPaddingRight: '12px',
        }}
      >
        <AnimatePresence>
          {hand.map((id, index) => {
            const isAffordable = playableCards.includes(id);
            const isBeingDragged = dragState?.index === index;
            const isSelectedForAction = selectedCardId === id;

            return (
              <motion.div 
                key={`${id}-${index}`}
                layoutId={`mobile-${id}-${index}`}
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ 
                  opacity: isBeingDragged ? 0 : 1,
                  scale: isSelectedForAction ? 1.1 : 1,
                  y: isSelectedForAction ? -20 : 0,
                  zIndex: isSelectedForAction ? 100 : index
                }}
                exit={{ opacity: 0, scale: 0.5, y: 50 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex-shrink-0 snap-center relative"
                onClick={() => handleCardClick(id as SpellType, isAffordable)}
              >
                {/* 选中提示气泡 */}
                <AnimatePresence>
                  {isSelectedForAction && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap z-[250]"
                    >
                      👆 再点打出
                      <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 选中高亮框 */}
                {isSelectedForAction && (
                  <div className="absolute -inset-1 rounded-xl border-2 border-amber-400 animate-pulse pointer-events-none z-50 shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                )}
                
                {/* 可打出指示 */}
                {isAffordable && phase === 'PLAYER_TURN' && !isProcessing && !isSelectedForAction && (
                  <div className="absolute -inset-0.5 rounded-lg border border-green-400/50 pointer-events-none" />
                )}

                {/* 卡牌 */}
                <div className={`
                  transition-all duration-200
                  ${isSelectedForAction ? 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]' : 'drop-shadow-md'}
                `}>
                  <SpellCard 
                    spell={getSpellById(id)} 
                    onPointerDown={(e) => {
                      if (isAffordable && phase === 'PLAYER_TURN' && !isProcessing) {
                        startDrag(id, index, e.clientX, e.clientY);
                      }
                    }}
                    onPointerUp={onPointerUpCard}
                    isAffordable={isAffordable}
                    disabled={!isAffordable || phase !== 'PLAYER_TURN' || isProcessing}
                    isSmall={true}
                    isSelected={isSelectedForAction}
                    showCost={true}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* 右侧留白 - 让最后一张卡可以滚动到中间 */}
        <div className="flex-shrink-0 w-8" />
      </div>
    );
  }

    /* ====== 桌面端：平铺排列布局 ====== */
  return (
    <div
      className="flex justify-center items-end gap-2 pointer-events-auto"
      style={{ maxWidth: '900px', margin: '0 auto' }}
    >
      {hand.map((id, index) => {
        const isAffordable = playableCards.includes(id);
        const isBeingDragged = dragState?.index === index;
        const isHovered = hoveredIndex === index;
        const isSelectedForAction = selectedCardId === id;

        return (
          <div
            key={`${id}-${index}`}
            className={`
              relative cursor-pointer transition-all duration-200 ease-out
              ${isBeingDragged ? 'opacity-0' : ''}
              ${isSelectedForAction ? 'z-[100] -translate-y-16 scale-110' : ''}
              ${isHovered && !isSelectedForAction ? 'z-[50] -translate-y-10 scale-105' : ''}
            `}
            id={`player-card-${index}`}
            onMouseEnter={() => {
              setHoveredIndex(index);
              onMouseEnterCard(id as SpellType);
              HapticService.light();
            }}
            onMouseLeave={() => {
              setHoveredIndex(null);
              onMouseLeaveCard();
            }}
            onClick={() => handleCardClick(id as SpellType, isAffordable)}
          >
            {/* 选中时的提示气泡 */}
            {isSelectedForAction && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap z-[250] pointer-events-none">
                👆 再点一次打出
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rotate-45" />
              </div>
            )}

            {/* 悬停/选中状态的高亮 */}
            {(isHovered || isSelectedForAction) && (
              <div className="absolute -inset-1 rounded-xl border-2 border-amber-400 pointer-events-none z-50 shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
            )}

            {/* 可打出卡牌的静态绿色边框（无 pulse 动画） */}
            {isAffordable && phase === 'PLAYER_TURN' && !isProcessing && !isHovered && !isSelectedForAction && (
              <div className="absolute -inset-0.5 rounded-lg border border-green-400/50 pointer-events-none" />
            )}

            {/* 卡牌渲染 */}
            <div className={`transition-shadow duration-200 ${isHovered || isSelectedForAction ? 'drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)]' : 'drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]'}`}>
              <SpellCard
                spell={getSpellById(id)}
                onPointerDown={(e) => {
                  if (isAffordable && phase === 'PLAYER_TURN' && !isProcessing) {
                    startDrag(id, index, e.clientX, e.clientY);
                  }
                }}
                onPointerUp={onPointerUpCard}
                isAffordable={isAffordable}
                disabled={!isAffordable || phase !== 'PLAYER_TURN' || isProcessing}
                isSmall={false}
                isSelected={isHovered || isSelectedForAction}
                showCost={true}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BattleHand;
