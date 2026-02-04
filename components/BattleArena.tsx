/**
 * BattleArena - 战斗场景组件 (Refactored 3.0)
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Volume2, VolumeX, ScrollText } from 'lucide-react';
import { SpellType, DuelState, GameLoopState } from '../types';
import { GAME_CONFIG } from '../constants';
import { getSpellById, getPlayableCards } from '../services/gameLogic';
import { HapticService } from '../services/haptic';
import { PlayerFrame } from './PlayerFrame';
import { SpellCard } from './SpellCard';
import { useIsMobile } from '../hooks/useIsMobile';
import { calculateSpellProjection } from '../services/projection';
import { useSettings } from '../context/SettingsContext';
import { TutorialOverlay } from './TutorialOverlay';
import CardDetailModal from './CardDetailModal';

// Components
import AIEmoteBubble from './battle/AIEmoteBubble';
import TargetingArrow from './battle/TargetingArrow';
import CombatLog from './battle/CombatLog';
import BattleBoard from './battle/BattleBoard';
import BattleHand from './battle/BattleHand';
import BattleEffects from './battle/BattleEffects';

// Hooks
import { useDragToPlay } from '../hooks/useDragToPlay';
import { useBattleAnimations } from '../hooks/useBattleAnimations';

interface BattleArenaProps {
  gameLoopState: GameLoopState;
  selectedBet: number;
  onPlayCard: (spellId: SpellType, isConfirmed?: boolean) => void;
  onPass?: () => void;
  onSurrender: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPlayerShaking?: boolean;
  isOpponentShaking?: boolean;
  isTavernMode?: boolean;
  setTargeting: (data: GameLoopState['targetingData']) => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  gameLoopState,
  onPlayCard,
  onPass,
  onSurrender,
  isMuted,
  onToggleMute,
  isPlayerShaking = false,
  isOpponentShaking = false,
  setTargeting
}) => {
  const { 
    duelState, phase, playerCard, opponentCard, resultText, effectMessages, aiStatus, targetingData 
  } = gameLoopState;

  const isMobile = useIsMobile();
  const { isLowQuality } = useSettings();
  
  // States
  const [hoveredSpellId, setHoveredSpellId] = useState<SpellType | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(duelState?.isTutorial || false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [tutorialAction, setTutorialAction] = useState<string | undefined>(undefined);
  const [detailSpell, setDetailSpell] = useState<SpellType | null>(null);
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Hooks
  const { 
    canvasRef, showCritEffect, showBloodFlash, projectiles, 
    addDamageNumber, triggerCrit, spawnProjectile 
  } = useBattleAnimations(isLowQuality);

  const playableCards = useMemo(() => {
    if (!duelState) return [];
    return getPlayableCards(
      duelState.playerHand, 
      duelState.playerMana, 
      duelState.playerEffects,
      duelState.playerCostMod
    );
  }, [duelState]);

  const { dragState, startDrag } = useDragToPlay(
    (id, confirmed) => handlePlayCard(id, confirmed),
    setTargeting,
    gameLoopState.isProcessing,
    phase,
    (id) => playableCards.includes(id)
  );

  // Projection Logic
  const projection = useMemo(() => {
    const activeId = dragState?.spellId || hoveredSpellId;
    if (!activeId || !duelState || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing) return null;
    return calculateSpellProjection(duelState, 'player', activeId);
  }, [dragState?.spellId, hoveredSpellId, phase, duelState, gameLoopState.isProcessing]);

  // Effects Monitoring
  useEffect(() => {
    if (effectMessages.length > 0) {
      const lastMsg = effectMessages[effectMessages.length - 1];
      const isCrit = lastMsg.includes('暴击');
      
      if (isCrit) triggerCrit();

      const match = lastMsg.match(/(\d+)\s*点伤害/);
      if (match) {
          const damage = parseInt(match[1]);
          const isPlayerTarget = lastMsg.includes('受到'); 
          addDamageNumber(damage, isPlayerTarget, isCrit); 
      }
    }
  }, [effectMessages, triggerCrit, addDamageNumber]);

  useEffect(() => {
    if (duelState?.isTutorial) setIsTutorialOpen(true);
  }, [duelState?.isTutorial]);

  const prevOppCard = useRef<SpellType | null>(null);
  useEffect(() => {
    if (opponentCard && opponentCard !== prevOppCard.current) {
       spawnProjectile('opp');
    }
    prevOppCard.current = opponentCard;
  }, [opponentCard, spawnProjectile]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handlePlayCard = (spellId: SpellType, isConfirmed: boolean = false) => {
    if (!duelState) return;
    
    setHoveredSpellId(null);
    setTargeting(null);
    spawnProjectile('player');

    if (spellId.startsWith('fire')) {
        setTutorialAction('PLAY_FIRE_CARD');
    }

    onPlayCard(spellId, isConfirmed);
  };

  const handleCardPressStart = (spellId: SpellType) => {
      longPressTimerRef.current = setTimeout(() => {
          setDetailSpell(spellId);
          HapticService.medium();
      }, 600);
  };

  const handleCardPressEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };

  if (!duelState) return null;

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 no-select flex flex-col z-40 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none arena-bg-overlay overflow-hidden">
        <img 
          src="/ui/bg_arena.webp" 
          alt="Arena Background"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110 blur-[2px] optimize-gpu animate-bg-breathing"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/80" />
      </div>

      {/* Opponent Area */}
      <div className="w-full h-[15%] min-h-[120px] flex justify-center items-start pt-2 z-20 relative">
          <div className="flex flex-col items-center relative">
             <PlayerFrame 
                isPlayer={false}
                name={duelState.aiProfile?.name || "黑魔法师"}
                hp={duelState.opponentHP}
                armor={duelState.opponentArmor}
                maxHp={GAME_CONFIG.maxHP}
                mana={duelState.opponentMana}
                maxMana={duelState.opponentMaxMana} 
                effects={duelState.opponentEffects}
                isShaking={isOpponentShaking}
                avatarSrc={duelState.aiProfile?.avatar}
                projection={projection?.target === 'opponent' ? { hpChange: projection.netHpChange, armorChange: projection.netArmorChange } : null}
              />
            <AIEmoteBubble status={aiStatus} />
            <div className="flex justify-center -space-x-4 scale-75 origin-top mt-1">
                {Array.from({ length: Math.min(duelState.opponentHandSize, 5) }).map((_, i) => (
                  <div key={i} style={{ transform: `rotate(${(i - 2) * 5}deg)` }} className="opacity-80">
                    <SpellCard isFaceDown isSmall />
                  </div>
                ))}
            </div>
          </div>
      </div>

      <TargetingArrow data={targetingData} />

      {!isLowQuality && (
          <canvas 
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            className="fixed inset-0 pointer-events-none z-50"
          />
      )}

      <BattleBoard 
        duelState={duelState}
        playerCard={playerCard}
        opponentCard={opponentCard}
        resultText={resultText}
        isMobile={isMobile}
      />

      {/* Player Area */}
      <div className="w-full h-[35%] min-h-[220px] max-h-[350px] z-30 relative safe-area-bottom">
        <div className="w-full h-full relative flex items-end justify-between px-2 pb-2 md:px-8 md:pb-6">
          <div className="z-40 mb-6 scale-90 md:scale-100">
             <PlayerFrame 
               isPlayer={true}
               hp={duelState.playerHP}
               armor={duelState.playerArmor}
               maxHp={GAME_CONFIG.maxHP}
               mana={duelState.playerMana}
               maxMana={duelState.playerMaxMana}
               effects={duelState.playerEffects}
               isShaking={isPlayerShaking}
               projection={projection?.target === 'player' ? { hpChange: projection.netHpChange, armorChange: projection.netArmorChange } : null}
             />
          </div>

          <div className="flex-1 flex flex-col items-center justify-end h-full absolute inset-x-0 bottom-0 pointer-events-none">
             <BattleHand 
                hand={duelState.playerHand}
                playableCards={playableCards}
                phase={phase}
                isProcessing={gameLoopState.isProcessing}
                isMobile={isMobile}
                dragState={dragState}
                startDrag={startDrag}
                onPointerDownCard={handleCardPressStart}
                onPointerUpCard={handleCardPressEnd}
                onMouseEnterCard={setHoveredSpellId}
                onMouseLeaveCard={() => setHoveredSpellId(null)}
             />
          </div>

          <div className="z-40 w-16 md:w-32 flex flex-col gap-2 mb-2 ml-auto">
             <button 
                onClick={onPass} 
                disabled={phase !== 'PLAYER_TURN'} 
                className={`relative w-full aspect-square md:aspect-video flex flex-col items-center justify-center rounded-xl shadow-2xl transition-all ${phase === 'PLAYER_TURN' ? 'bg-amber-600 border-2 border-amber-300' : 'bg-slate-800'}`}
             >
                <div className="text-xl">{phase === 'PLAYER_TURN' ? '👉' : '⏳'}</div>
             </button>
          </div>
        </div>
      </div>

      {/* Floating Dragged Card */}
      {dragState?.isDragging && (
        <div 
          className="fixed z-[200] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 scale-125 transition-transform duration-200"
          style={{ left: dragState.currentX, top: dragState.currentY }}
        >
          <SpellCard spell={getSpellById(dragState.spellId)} isSmall={isMobile} isSelected />
        </div>
      )}

      {/* Controls */}
      <div className="fixed top-4 right-4 z-40 safe-area-top flex gap-2">
        <button 
          onClick={() => setIsLogOpen(!isLogOpen)} 
          className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white/60 hover:text-white transition-colors"
        >
          <ScrollText size={20} />
        </button>
        <button onClick={onToggleMute} className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white/60">
           {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      <CombatLog 
        isOpen={isLogOpen} 
        messages={effectMessages} 
        onClose={() => setIsLogOpen(false)} 
      />

      <BattleEffects 
        showCrit={showCritEffect} 
        showBloodFlash={showBloodFlash} 
      />

      {/* Projectiles */}
      <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
        {projectiles.map(p => (
           <div 
            key={p.id}
            className={`absolute w-12 h-12 rounded-full blur-md z-50 ${p.type === 'player' ? 'bg-gradient-to-t from-purple-500 to-white animate-projectile' : 'bg-gradient-to-b from-red-500 to-white animate-projectile-opp'}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, marginLeft: '-24px' }}
           >
              <div className="absolute inset-0 bg-white rounded-full scale-50 blend-screen" />
           </div>
        ))}
      </div>

      {detailSpell && (
         <CardDetailModal 
           spell={getSpellById(detailSpell)} 
           onClose={() => setDetailSpell(null)} 
         />
      )}

      {isTutorialOpen && (
        <TutorialOverlay 
          onComplete={() => {
            setIsTutorialOpen(false);
            setTutorialAction(undefined);
          }} 
          lastAction={tutorialAction}
        />
      )}
    </div>
  );
};

export default BattleArena;