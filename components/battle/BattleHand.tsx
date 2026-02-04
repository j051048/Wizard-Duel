import React, { useRef } from 'react';
import { SpellType, DuelPhase } from '../../types';
import { SpellCard } from '../SpellCard';
import { getSpellById } from '../../services/gameLogic';
import { HapticService } from '../../services/haptic';

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
    const baseAngle = isMobile ? (screenWidth < 380 ? 3 : 5) : 4;
    const maxTotalAngle = isMobile ? 60 : 50; 
    const angleStep = Math.min(baseAngle, maxTotalAngle / (count - 1 || 1));
    
    // 间距：卡牌越多，间距越紧
    const baseSpacing = isMobile ? (screenWidth < 380 ? 15 : 25) : 40;
    const xSpacing = Math.max(10, baseSpacing - (count * 1.5));
    
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

  return (
    <div className="flex justify-center items-end relative h-32 md:h-40 pointer-events-auto" style={{ width: '100%', maxWidth: '800px' }}>
      {hand.map((id, index) => {
        const isAffordable = playableCards.includes(id);
        const isBeingDragged = dragState?.index === index;
        const totalCards = hand.length;
        const centerIndex = (totalCards - 1) / 2;
        
        const { angleStep, xSpacing } = calculateHandLayout(totalCards, isMobile, window.innerWidth);
        
        const offsetIndex = index - centerIndex;
        const rotate = offsetIndex * angleStep;
        const translateY = Math.abs(offsetIndex) * (isMobile ? 5 : 8) + (isBeingDragged ? -50 : 0);
        const translateX = offsetIndex * xSpacing;

        return (
          <div 
            key={`${id}-${index}`} 
            className={`absolute transition-all duration-300 transform origin-bottom hover:z-50 hover:scale-110 ${isBeingDragged ? 'opacity-0' : ''}`}
            style={{ 
              transform: `translateX(${translateX}px) rotate(${rotate}deg) translateY(${translateY}px)`,
              zIndex: index + 1,
              bottom: '10px'
            }}
          >
            <SpellCard 
              spell={getSpellById(id as SpellType)} 
              onPointerDown={(e) => {
                onPointerDownCard(id as SpellType);
                if (isAffordable && phase === 'PLAYER_TURN' && !isProcessing) {
                  startDrag(id as SpellType, index, e.clientX, e.clientY);
                }
              }}
              onPointerUp={onPointerUpCard}
              onPointerLeave={onPointerUpCard}
              onMouseEnter={() => onMouseEnterCard(id as SpellType)}
              onMouseLeave={onMouseLeaveCard}
              isAffordable={isAffordable}
              disabled={!isAffordable || phase !== 'PLAYER_TURN' || isProcessing}
              isSmall={isMobile}
            />
          </div>
        );
      })}
    </div>
  );
};

export default BattleHand;
