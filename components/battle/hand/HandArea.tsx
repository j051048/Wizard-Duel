import { SpellType, DuelPhase } from '../../../types';
import BattleHand from '../BattleHand';
import { TutorialBubble } from '../../ui/TutorialBubble';

/**
 * HandArea - 手牌区域组件 (v3.0 - Mobile Optimized)
 * 
 * 移动端优化:
 * - 横向滚动代替堆叠
 * - 更大的触控区域
 * - 紧凑布局节省空间
 */

interface HandAreaProps {
  hand: SpellType[];
  playableCards: SpellType[];
  phase: DuelPhase;
  isProcessing: boolean;
  isMobile: boolean;
  dragState: any;
  startDrag: (id: SpellType, index: number, clientX: number, clientY: number) => void;
  onCardPressStart: (id: SpellType) => void;
  onCardPressEnd: () => void;
  setHoveredSpellId: (id: SpellType | null) => void;
  handlePlayCard: (id: SpellType, isConfirmed: boolean) => void;
  shouldShowTutorial: boolean;
}

export const HandArea: React.FC<HandAreaProps> = ({
  hand,
  playableCards,
  phase,
  isProcessing,
  isMobile,
  dragState,
  startDrag,
  onCardPressStart,
  onCardPressEnd,
  setHoveredSpellId,
  handlePlayCard,
  shouldShowTutorial
}) => {

  if (isMobile) {
      /* ====== 移动端：紧凑底部手牌区 ====== */
      return (
        <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none" 
             style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
            <div className="relative w-full">
                {/* 手牌容器 */}
                <div id="player-hand-container" className="w-full relative z-40 pointer-events-auto">
                    {/* 新手引导 - [P1-14] 移动端改为单击确认 */}
                    <TutorialBubble 
                        isVisible={shouldShowTutorial} 
                        text="👆 点击选牌，再点确认出牌！" 
                        position="top"
                    />
                    
                    {/* 横向滚动手牌 */}
                    <BattleHand 
                        hand={hand}
                        playableCards={playableCards}
                        phase={phase}
                        isProcessing={isProcessing}
                        isMobile={true}
                        dragState={dragState}
                        startDrag={startDrag}
                        onPointerDownCard={onCardPressStart}
                        onPointerUpCard={onCardPressEnd}
                        onMouseEnterCard={setHoveredSpellId}
                        onMouseLeaveCard={() => setHoveredSpellId(null)}
                        onDoubleClickCard={(spellId) => handlePlayCard(spellId, true)}
                    />
                </div>
                
                {/* 底部装饰条 - 更细 */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-[#0a0502] to-transparent pointer-events-none z-0" />
            </div>
        </div>
      );
  }

  /* ====== 桌面端布局 ====== */
  return (
    <div id="player-hand-container" className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none flex justify-center pb-4 md:pb-6 safe-area-bottom">
        <div className="relative pointer-events-auto">
             <TutorialBubble 
                isVisible={shouldShowTutorial} 
                text="👆 拖动或双击卡牌打出！" 
                position="top"
            />
            <BattleHand 
                hand={hand}
                playableCards={playableCards}
                phase={phase}
                isProcessing={isProcessing}
                isMobile={false}
                dragState={dragState}
                startDrag={startDrag}
                onPointerDownCard={onCardPressStart}
                onPointerUpCard={onCardPressEnd}
                onMouseEnterCard={setHoveredSpellId}
                onMouseLeaveCard={() => setHoveredSpellId(null)}
                onDoubleClickCard={(spellId) => handlePlayCard(spellId, true)}
            />
        </div>
    </div>
  );
};
