import React, { useRef, useState, useMemo } from 'react';
import { SpellType, DuelPhase } from '../../types';
import { SpellCard } from '../SpellCard';
import { getSpellById } from '../../services/gameLogic';
import { HapticService } from '../../services/haptic';
import { motion, AnimatePresence } from 'framer-motion';

interface BattleHandProps {
  hand: string[];
  playableCards: string[];
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

const calculateHandLayout = (count: number, isMobile: boolean, screenWidth: number) => {
    const baseAngle = isMobile ? (screenWidth < 380 ? 2 : 3) : 3;
    const maxTotalAngle = isMobile ? 40 : 35; 
    const angleStep = Math.min(baseAngle, maxTotalAngle / (count - 1 || 1));
    
    const baseSpacing = isMobile ? (screenWidth < 380 ? 35 : 50) : 70;
    const xSpacing = Math.max(25, baseSpacing - (count * 2));
    
    return { angleStep, xSpacing };
};

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
  // [P0 Phase 2] 单击选中状态
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // [P0 Phase 2] 处理单击选中 + 二次点击确认出牌
  const handleCardClick = (spellId: SpellType, isAffordable: boolean) => {
    if (!isAffordable || phase !== 'PLAYER_TURN' || isProcessing) return;

    // 如果点击的是已选中的卡牌（等待确认），则出牌
    if (selectedCardId === spellId) {
      if (onDoubleClickCard) {
        HapticService.medium();
        onDoubleClickCard(spellId);
      }
      setSelectedCardId(null);
      if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
      return;
    }

    // 第一次点击：选中卡牌
    setSelectedCardId(spellId);
    HapticService.light();

    // 清除之前的超时，设置新的自动取消选中
    if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
    selectionTimeoutRef.current = setTimeout(() => {
      setSelectedCardId(prev => (prev === spellId ? null : prev));
    }, 2500); // 2.5秒后自动取消选中
  };

  const layoutConfig = useMemo(() => 
    calculateHandLayout(hand.length, isMobile, window.innerWidth),
    [hand.length, isMobile]
  );

  return (
    <div className="flex justify-center items-end relative h-40 md:h-48 pointer-events-auto" style={{ width: '100%', maxWidth: '900px' }}>
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
          const baseY = Math.abs(offsetIndex) * (isMobile ? 4 : 6);
          // [P0 Phase 2] 选中等待确认时，卡牌上浮更明显
          const translateY = isBeingDragged ? -80 : (isSelectedForAction ? -50 : (isHovered ? -60 : baseY));
          const translateX = offsetIndex * xSpacing;
          const scale = isSelectedForAction ? 1.15 : (isHovered ? 1.25 : 1);

          return (
            <motion.div 
              key={`${id}-${index}`} 
              layoutId={`${id}-${index}`}
              initial={{ opacity: 0, y: 100, scale: 0.5, rotate: 0 }}
              animate={{ 
                opacity: isBeingDragged ? 0 : 1, 
                x: translateX,
                y: translateY,
                rotate: rotate,
                scale: scale,
                zIndex: isSelectedForAction ? 200 : (isHovered ? 100 : index + 1),
                boxShadow: isAffordable && phase === 'PLAYER_TURN' && !isProcessing && !isHovered && !isSelectedForAction
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
                boxShadow: { 
                  duration: 1.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }
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
              {/* [P0 Phase 2] 选中时的"再点一次"提示气泡 */}
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

              {/* 悬停时的光晕效果 */}
              {isHovered && (
                <div className="absolute -inset-4 bg-gradient-to-t from-amber-500/30 via-transparent to-transparent rounded-xl blur-xl pointer-events-none animate-pulse" />
              )}
              
              {/* [P0 Phase 2] 选中状态的高亮边框（金色脉冲） */}
              {isSelectedForAction && (
                <div className="absolute -inset-1.5 rounded-xl border-4 border-amber-400 animate-pulse pointer-events-none z-50 shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
              )}
              
              {/* 可打出卡牌的绿色脉冲边框 */}
              {isAffordable && phase === 'PLAYER_TURN' && !isProcessing && !isHovered && !isSelectedForAction && (
                <div className="absolute -inset-1 rounded-xl border-2 border-green-400/60 animate-pulse pointer-events-none" />
              )}
              
              {/* 卡牌阴影增强 */}
              <div className={`transition-all duration-300 ${isHovered || isSelectedForAction ? 'drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]' : 'drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]'}`}>
                <SpellCard 
                  spell={getSpellById(id as SpellType)} 
                  onPointerDown={(e) => {
                    onPointerDownCard(id as SpellType);
                    if (isAffordable && phase === 'PLAYER_TURN' && !isProcessing) {
                      startDrag(id as SpellType, index, e.clientX, e.clientY);
                    }
                  }}
                  onPointerUp={onPointerUpCard}
                  isAffordable={isAffordable}
                  disabled={!isAffordable || phase !== 'PLAYER_TURN' || isProcessing}
                  isSmall={isMobile && !isHovered && !isSelectedForAction}
                  isSelected={isHovered || isSelectedForAction}
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
