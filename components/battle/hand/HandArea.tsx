import { SpellType, DuelPhase } from '../../../types';
import BattleHand from '../BattleHand';
import { TutorialBubble } from '../../ui/TutorialBubble';

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
      /* ====== 移动端底部布局：横向滚动卡牌 ====== */
      return (
        <div className="absolute bottom-0 left-0 right-0 z-30 safe-area-bottom pointer-events-none">
            <div className="relative w-full flex flex-col justify-end">
                <div id="player-hand-container" className="w-full relative z-40 pointer-events-auto">
                    <TutorialBubble 
                        isVisible={shouldShowTutorial} 
                        text="👆 拖动或点击出牌！" 
                        position="top"
                    />
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
                    
                    {/* [UI Polish] 底部纹理条 - 视觉装饰 */}
                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-[#0a0502] border-t border-[#3d2e1e] z-0 opacity-80 pointer-events-none">
                        <div className="w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-repeat-x"></div>
                        {/* Center Handle Graphic */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-1 rounded-full bg-[#5c4a35]"></div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  /* ====== 桌面端布局 ====== */
  return (
    <div id="player-hand-container" className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none flex justify-center pb-4 md:pb-6">
        <div className="relative pointer-events-auto">
             {/* [P0 新手引导] 首次出牌气泡 */}
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
