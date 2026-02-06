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
    // [UI Polish] 移动端：激进的扇形参数，模仿炉石传说
    const baseAngle = isMobile ? (screenWidth < 380 ? 10 : 8) : 3; // 增加基础角度
    const maxTotalAngle = isMobile ? 80 : 35; // 允许更大的总扇面
    const angleStep = Math.min(baseAngle, maxTotalAngle / (count - 1 || 1));
    
    // [UI Polish] 移动端：极度紧凑的间距，强制堆叠
    // 假设卡牌宽度 ~100px。为了堆叠，间距应小于 50px。
    const baseSpacing = isMobile ? (screenWidth < 380 ? 30 : 40) : 70;
    // 随着卡牌数量增加，间距迅速减小，挤在一起
    let xSpacing = Math.max(isMobile ? 15 : 25, baseSpacing - (count * (isMobile ? 2.5 : 2)));
    
    // 动态压缩：如果卡牌多，强制限制总宽度不超过屏幕宽度的 85% (留给按钮)
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

  const layoutConfig = useMemo(() => 
    calculateHandLayout(hand.length, isMobile, window.innerWidth),
    [hand.length, isMobile]
  );

  // [UI Polish] 移动端扇形布局
  return (
    <div 
      className={`flex justify-center items-end relative pointer-events-auto ${isMobile ? 'h-36 mb-6' : 'h-40 md:h-48'}`} 
      style={{ 
        width: '100%', 
        maxWidth: isMobile ? '100%' : '900px',
        // [Safety Zone] Padding for mobile left/right UI elements
        paddingLeft: isMobile ? '80px' : '0',
        paddingRight: isMobile ? '80px' : '0' 
      }}
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
          
          // [UI Polish] 拱形幅度：中间高，两边低。移动端幅度更大
          const archFactor = isMobile ? 12 : 6; 
          const baseY = Math.abs(offsetIndex) * archFactor; 
          
          // 移动端默认放大卡牌，增强视觉冲击力
          const baseScale = isMobile ? 1.15 : 1;

          // 选中上浮逻辑
          let translateY = isBeingDragged ? -80 : (isSelectedForAction ? -70 : (isHovered ? -60 : baseY));
          // 移动端整体位置微调
          if (isMobile) translateY += 10; 

          const translateX = offsetIndex * xSpacing;
          
          // 状态缩放
          const activeScale = isSelectedForAction ? 1.25 : (isHovered ? 1.25 : 1);
          const finalScale = baseScale * activeScale;

          // 移动端不需要 z-index 阴影动画以节省性能
          const enableShadowAnim = !isMobile && isAffordable && phase === 'PLAYER_TURN' && !isProcessing && !isHovered && !isSelectedForAction;

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
                scale: finalScale,
                // [UI Polish] 选中时 Z轴 极大提升，防止被遮挡
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
              style={{ bottom: isMobile ? '30px' : '10px' }} // 底部距离提升 (Elevated)
              id={`player-card-${index}`}
              onMouseEnter={() => {
                if (!isMobile) {
                    setHoveredIndex(index);
                    onMouseEnterCard(id as SpellType);
                    HapticService.light();
                }
              }}
              onMouseLeave={() => {
                if (!isMobile) {
                    setHoveredIndex(null);
                    onMouseLeaveCard();
                }
              }}
              onClick={() => handleCardClick(id as SpellType, isAffordable)}
            >
              {/* 选中时的"再点一次"提示气泡 */}
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
                  isSmall={false} // 扇形模式下不使用 Small 变体，保持细节，通过 transform scale 控制大小
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
