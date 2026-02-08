import React, { useRef, useState, useMemo } from 'react';
import { SpellType, DuelPhase } from '../../types';
import { SpellCard } from '../SpellCard';
import { getSpellById } from '../../services/gameLogic';
import { HapticService } from '../../services/haptic';
import { motion, AnimatePresence } from 'framer-motion';

interface BattleHandProps {
  hand: SpellType[];
  playableCards: SpellType[];
  phase: DuelPhase;
  isProcessing: boolean;
  isMobile: boolean;
  dragState: any;
  startDrag: (spellId: SpellType, index: number, x: number, y: number) => void;
  onPointerDownCard: (spellId: SpellType) => void;
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
  onPointerDownCard,
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

  /* ====== 桌面端：扇形布局 ====== */
  const calculateHandLayout = (count: number) => {
    const baseAngle = 3;
    const maxTotalAngle = 35;
    const angleStep = Math.min(baseAngle, maxTotalAngle / (count - 1 || 1));
    const baseSpacing = 70;
    let xSpacing = Math.max(25, baseSpacing - (count * 2));
    return { angleStep, xSpacing };
  };

  const layoutConfig = useMemo(() => calculateHandLayout(hand.length), [hand.length]);

  return (
    <div 
      className="flex justify-center items-end relative pointer-events-auto h-40 md:h-48"
      style={{ maxWidth: '900px' }}
    >
      <AnimatePresence>
        {hand.map((id, index) => {
          const isAffordable = playableCards.includes(id);
          const isBeingDragged = dragState?.index === index;
          const isHovered = hoveredIndex === index;
          const isSelectedForAction = selectedCardId === id;
          const totalCards = hand.length;
          const centerIndex = (totalCards - 1) / 2;
          
          const { angleStep, xSpacing } = layoutConfig;
          const offsetIndex = index - centerIndex;
          
          const rotate = isHovered ? 0 : offsetIndex * angleStep;
          const archFactor = 6;
          const baseY = Math.abs(offsetIndex) * archFactor;
          
          let translateY = isBeingDragged ? -80 : (isSelectedForAction ? -70 : (isHovered ? -60 : baseY));
          const translateX = offsetIndex * xSpacing;
          
          const activeScale = isSelectedForAction ? 1.25 : (isHovered ? 1.25 : 1);
          const enableShadowAnim = isAffordable && phase === 'PLAYER_TURN' && !isProcessing && !isHovered && !isSelectedForAction;

          return (
            <motion.div 
              key={`${id}-${index}`} 
              layoutId={`${id}-${index}`}
              initial={{ opacity: 0, y: 150, scale: 0.5, rotate: 0 }}
              animate={{ 
                opacity: isBeingDragged ? 0 : 1, 
                x: translateX,
                y: translateY,
                rotate: rotate,
                scale: activeScale,
                zIndex: isSelectedForAction ? 200 : (isHovered ? 100 : index + 1),
                boxShadow: enableShadowAnim
                  ? [
                      '0 0 10px rgba(74,222,128,0.3), 0 0 20px rgba(74,222,128,0.2)',
                      '0 0 20px rgba(74,222,128,0.6), 0 0 40px rgba(74,222,128,0.4)',
                      '0 0 10px rgba(74,222,128,0.3), 0 0 20px rgba(74,222,128,0.2)'
                    ]
                  : 'none'
              }}
              exit={{ 
                opacity: 0, 
                y: -150, 
                scale: 0.2,
                transition: { duration: 0.4, ease: "easeOut" }
              }}
              transition={{ 
                duration: 0.25,
                ease: [0.34, 1.56, 0.64, 1],
                boxShadow: enableShadowAnim ? { 
                  duration: 1.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                } : undefined
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
