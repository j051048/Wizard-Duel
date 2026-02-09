import React, { useRef, useState, useMemo } from 'react';
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

  /* ====== 桌面端：平面堆叠布局 ====== */
  const calculateHandLayout = (count: number) => {
    // 基础间距：卡牌宽度约 120px (SpellCard isSmall=false 且在容器内缩放)
    // 根据卡牌数量动态调整间距
    const maxContainerWidth = 800;
    const minSpacing = 40; // 最小重叠间距
    const maxSpacing = 150; // 最大间距（完全不重叠）
    
    // 如果卡牌少，铺开显示；如果卡牌多，紧凑堆叠
    let xSpacing = maxSpacing;
    if (count > 0) {
      // 尝试用最大间距排列
      const totalWidth = count * maxSpacing;
      if (totalWidth > maxContainerWidth) {
        // 如果超出容器，压缩间距
        xSpacing = Math.max(minSpacing, maxContainerWidth / count);
      }
    }
    
    return { xSpacing };
  };

  const layoutConfig = useMemo(() => calculateHandLayout(hand.length), [hand.length]);

  return (
    <div 
      className="flex justify-center items-end relative pointer-events-auto h-40 md:h-48"
      style={{ maxWidth: '900px', margin: '0 auto' }}
    >
      <AnimatePresence mode='popLayout'>
        {hand.map((id, index) => {
          const isAffordable = playableCards.includes(id);
          const isBeingDragged = dragState?.index === index;
          const isHovered = hoveredIndex === index;
          const isSelectedForAction = selectedCardId === id;
          const totalCards = hand.length;
          
          // 计算位置：居中排列
          const { xSpacing } = layoutConfig;
          // 计算总宽度
          const totalWidth = (totalCards - 1) * xSpacing;
          // 当前卡牌相对于中心的偏移
          const startX = -totalWidth / 2;
          const translateX = startX + index * xSpacing;
          
          // 悬停/选中状态的变换
          // 悬停时：上浮，放大，置顶
          let translateY = 0;
          let scale = 1;
          let zIndex = index;
          
          if (isBeingDragged) {
            translateY = -150; // 拖拽时隐藏/移出
          } else if (isSelectedForAction) {
            translateY = -80;
            scale = 1.3;
            zIndex = 100;
          } else if (isHovered) {
            translateY = -60;
            scale = 1.3;
            zIndex = 50;
          } else {
            // 默认状态：稍微错落一点（偶数索引的牌低一点点，产生一点层次感，或者完全平齐）
            // 这里选择完全平齐，符合"平面小面积叠加"的要求
            translateY = 0;
            scale = 1;
            zIndex = index;
          }
           
          return (
            <motion.div 
              key={`${id}-${index}`} 
              // 移除 layoutId 以避免不必要的自动布局动画导致的抖动
              initial={{ opacity: 0, y: 100, scale: 0.8 }}
              animate={{ 
                opacity: isBeingDragged ? 0 : 1, 
                x: translateX,
                y: translateY,
                rotate: 0, // 始终不旋转
                scale: scale,
                zIndex: zIndex,
                // 只有选中/高亮时才加阴影，普通状态不加，减少重绘
                filter: isHovered || isSelectedForAction ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' : 'none'
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.5,
                transition: { duration: 0.2 }
              }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 25,
                mass: 0.8
              }}
              className="absolute origin-bottom cursor-pointer"
              style={{ bottom: '10px' }}
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
              <AnimatePresence>
                {isSelectedForAction && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute -top-14 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap z-[250]"
                  >
                    👆 再点一次打出
                    <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 悬停/选中状态的高亮 */}
              {(isHovered || isSelectedForAction) && (
                 <div className="absolute -inset-1.5 rounded-xl border-4 border-amber-400 animate-pulse pointer-events-none z-50 shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
              )}
              
              {/* 可打出卡牌的绿色脉冲边框 */}
              {isAffordable && phase === 'PLAYER_TURN' && !isProcessing && !isHovered && !isSelectedForAction && (
                <div className="absolute -inset-1 rounded-xl border-2 border-green-400/60 animate-pulse pointer-events-none" />
              )}
              
              {/* 卡牌渲染 */}
              <div className={`transition-all duration-300 ${isHovered || isSelectedForAction ? 'drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]' : 'drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]'}`}>
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
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default BattleHand;
