import React, { useRef, useState } from 'react';
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
}

const calculateHandLayout = (count: number, isMobile: boolean, screenWidth: number) => {
    // 增大基础间距，让卡牌不那么拥挤
    const baseAngle = isMobile ? (screenWidth < 380 ? 2 : 3) : 3;
    const maxTotalAngle = isMobile ? 40 : 35; 
    const angleStep = Math.min(baseAngle, maxTotalAngle / (count - 1 || 1));
    
    // 间距：大幅增加基础间距
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
  onMouseLeaveCard
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
    <div className="flex justify-center items-end relative h-40 md:h-48 pointer-events-auto" style={{ width: '100%', maxWidth: '900px' }}>
      <AnimatePresence>
        {hand.map((id, index) => {
          const isAffordable = playableCards.includes(id);
          const isBeingDragged = dragState?.index === index;
          const isHovered = hoveredIndex === index;
          const totalCards = hand.length;
          const centerIndex = (totalCards - 1) / 2;
          
          const { angleStep, xSpacing } = calculateHandLayout(totalCards, isMobile, window.innerWidth);
          
          const offsetIndex = index - centerIndex;
          
          // 悬停时：卡牌抬起、放大、旋转归零，且z-index最高
          const rotate = isHovered ? 0 : offsetIndex * angleStep;
          const baseY = Math.abs(offsetIndex) * (isMobile ? 4 : 6);
          // 悬停时大幅抬起（抽出效果）
          const translateY = isBeingDragged ? -80 : (isHovered ? -60 : baseY);
          const translateX = offsetIndex * xSpacing;
          const scale = isHovered ? 1.25 : 1;

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
                zIndex: isHovered ? 100 : index + 1
              }}
              exit={{ 
                opacity: 0, 
                y: -150, 
                scale: 0.2,
                transition: { duration: 0.4, ease: "easeOut" }
              }}
              transition={{ 
                duration: 0.25,
                ease: [0.34, 1.56, 0.64, 1] // Spring-like bounce
              }}
              className="absolute origin-bottom cursor-pointer"
              style={{ bottom: '10px' }}
              onMouseEnter={() => {
                setHoveredIndex(index);
                onMouseEnterCard(id as SpellType);
                HapticService.light();
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
                onMouseLeaveCard();
              }}
            >
              {/* 悬停时的光晕效果 */}
              {isHovered && (
                <div className="absolute -inset-4 bg-gradient-to-t from-amber-500/30 via-transparent to-transparent rounded-xl blur-xl pointer-events-none animate-pulse" />
              )}
              
              {/* 卡牌阴影增强 */}
              <div className={`transition-all duration-300 ${isHovered ? 'drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]' : 'drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]'}`}>
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
                  isSmall={isMobile && !isHovered}
                  isSelected={isHovered}
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
