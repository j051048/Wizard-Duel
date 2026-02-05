/**
 * BattleArena - 战斗场景组件 (Refactored 3.0)
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Volume2, VolumeX, ScrollText, Flag } from 'lucide-react';
import { SpellType, DuelState, GameLoopState } from '../types';
import { GAME_CONFIG, SPELLS } from '../constants';
import { getSpellById, getPlayableCards } from '../services/gameLogic';
import { HapticService } from '../services/haptic';
import { PlayerFrame } from './PlayerFrame';
import { SpellCard } from './SpellCard';
import { useIsMobile } from '../hooks/useIsMobile';
import { calculateSpellProjection } from '../services/projection';
import { useSettings } from '../context/SettingsContext';
import { TutorialOverlay, TutorialStep } from './tutorial/TutorialOverlay';
import CardDetailModal from './CardDetailModal';

// Components
import AIEmoteBubble from './battle/AIEmoteBubble';
import TargetingArrow from './battle/TargetingArrow';
import CombatLog from './battle/CombatLog';
import BattleBoard from './battle/BattleBoard';
import BattleHand from './battle/BattleHand';
import BattleEffects from './battle/BattleEffects';
import CombatFeed from './battle/CombatFeed';
import { TurnIndicator } from './battle/TurnIndicator';
import { HeroSkillButton } from './battle/HeroSkillButton';

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
    addDamageNumber, triggerCrit, triggerShake, spawnProjectile, shakeClass,
    updateDragTrail
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
    (id) => playableCards.includes(id),
    updateDragTrail 
  );

  // Projection Logic
  const projection = useMemo(() => {
    const activeId = dragState?.spellId || hoveredSpellId;
    if (!activeId || !duelState || phase !== 'PLAYER_TURN' || gameLoopState.isProcessing) return null;
    return calculateSpellProjection(duelState, 'player', activeId);
  }, [dragState?.spellId, hoveredSpellId, phase, duelState, gameLoopState.isProcessing]);

  // Hero Skills Logic
  const heroSkills = useMemo(() => {
    return SPELLS.filter(s => s.id.startsWith('hero_'));
  }, []);

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
          
          let pType: any = 'default';
          if (lastMsg.includes('🔥')) pType = 'fire';
          else if (lastMsg.includes('❄️')) pType = 'ice';
          else if (lastMsg.includes('⚡')) pType = 'thunder';
          else if (lastMsg.includes('🌿')) pType = 'poison';
          else if (lastMsg.includes('🪨')) pType = 'rock';
          
          addDamageNumber(damage, isPlayerTarget, isCrit, pType); 
          triggerShake(pType);
      }
    }
  }, [effectMessages, triggerCrit, addDamageNumber, triggerShake]);

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
    <div className={`fixed inset-0 w-full h-full bg-slate-950 no-select flex flex-col z-40 overflow-hidden ${shakeClass}`}>
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

            {/* Opponent Area - 优化布局 */}
      <div className="w-full flex justify-center items-start pt-4 md:pt-6 z-20 relative safe-area-top">
          <div className="flex flex-col items-center relative">
             {/* 对手信息框 */}
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
                isThinking={aiStatus === 'THINKING'}
                projection={projection?.target === 'opponent' ? { hpChange: projection.netHpChange, armorChange: projection.netArmorChange } : null}
              />
              
            {/* AI 表情气泡 */}
            <div className="absolute -right-4 top-0">
              <AIEmoteBubble status={aiStatus} />
            </div>
            
            {/* 对手手牌展示 - 扇形排列 */}
            <div className="flex justify-center mt-3 relative h-12">
                {Array.from({ length: Math.min(duelState.opponentHandSize, 7) }).map((_, i) => {
                  const totalCards = Math.min(duelState.opponentHandSize, 7);
                  const centerIndex = (totalCards - 1) / 2;
                  const offsetIndex = i - centerIndex;
                  const rotation = offsetIndex * 4;
                  const translateX = offsetIndex * 18;
                  const translateY = Math.abs(offsetIndex) * 2;
                  
                  return (
                    <div 
                      key={i} 
                      className="absolute opacity-70 hover:opacity-100 transition-opacity"
                      style={{ 
                        transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
                        zIndex: i
                      }}
                    >
                      <SpellCard isFaceDown isSmall />
                    </div>
                  );
                })}
            </div>
          </div>
      </div>

      <TargetingArrow data={targetingData} />
      
      <TurnIndicator isPlayerTurn={phase === 'PLAYER_TURN'} roundNumber={duelState.roundNumber} />

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

      {/* [P0 新手引导] 拖拽时显示释放区域提示 */}
      {dragState?.isDragging && (
        <div className="fixed inset-0 z-[150] pointer-events-none flex items-center justify-center">
          {/* 释放区域发光提示 */}
          <div 
            className={`
              w-48 h-48 md:w-64 md:h-64 rounded-full 
              border-4 border-dashed 
              flex items-center justify-center
              transition-all duration-300
              ${dragState.isInDropZone 
                ? 'border-green-400 bg-green-500/20 scale-110 shadow-[0_0_60px_rgba(74,222,128,0.5)]' 
                : 'border-amber-400/60 bg-amber-500/10 animate-pulse shadow-[0_0_40px_rgba(251,191,36,0.3)]'
              }
            `}
          >
            <div className={`text-center ${dragState.isInDropZone ? 'scale-110' : ''} transition-transform`}>
              <div className={`text-4xl md:text-5xl mb-2 ${dragState.isInDropZone ? 'animate-bounce' : ''}`}>
                {dragState.isInDropZone ? '✨' : '⬆️'}
              </div>
              <span className={`
                text-sm md:text-base font-bold
                ${dragState.isInDropZone ? 'text-green-300' : 'text-amber-300/80'}
              `}>
                {dragState.isInDropZone ? '松开释放！' : '拖到这里释放'}
              </span>
            </div>
          </div>
          
          {/* 箭头指引 - 从手牌指向释放区 */}
          {!dragState.isInDropZone && (
            <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2">
              <div className="text-amber-400/60 text-3xl animate-bounce">
                ⬆️
              </div>
            </div>
          )}
        </div>
      )}

            {/* Player Area - 重新设计布局 */}
      <div className="absolute bottom-0 left-0 right-0 z-30 safe-area-bottom">
        
        {/* 手牌区域 - 居中底部 */}
        <div className="w-full flex justify-center pb-4 md:pb-6 pointer-events-none">
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
            onDoubleClickCard={(spellId) => handlePlayCard(spellId, true)}
          />
        </div>
        
                {/* 玩家信息框 - 左下角 */}
        <div className="absolute left-2 md:left-6 bottom-4 md:bottom-6 z-40">
          {/* 英雄技能栏 - 头像上方横排显示 */}
          <div id="hero-skills-container" className="flex flex-row gap-2 mb-2 pointer-events-auto justify-start">
            {heroSkills.slice(0, 3).map(skill => (
              <HeroSkillButton
                key={skill.id}
                skill={skill}
                canUse={phase === 'PLAYER_TURN' && !duelState.heroSkillsUsed && !gameLoopState.isProcessing}
                currentMana={duelState.playerMana}
                onClick={() => handlePlayCard(skill.id)}
              />
            ))}
          </div>
          
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
        
        {/* 结束回合按钮 - 右下角 */}
        <div className="absolute right-2 md:right-6 bottom-4 md:bottom-6 z-40">
          <button 
            onClick={onPass} 
            disabled={phase !== 'PLAYER_TURN'} 
            className={`
              relative px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-sm md:text-base uppercase tracking-wider
              transition-all duration-300 shadow-2xl
              ${phase === 'PLAYER_TURN' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black border-2 border-amber-300 hover:scale-105 hover:shadow-amber-500/50 active:scale-95' 
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }
            `}
          >
            {phase === 'PLAYER_TURN' ? (
              <span className="flex items-center gap-2">
                <span>结束回合</span>
                <span className="text-lg">👉</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>等待中</span>
                <span className="animate-spin">⏳</span>
              </span>
            )}
          </button>
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
          onClick={onSurrender} 
          className="p-2 bg-red-900/40 backdrop-blur-md rounded-lg border border-red-500/30 text-red-400 hover:text-red-200 hover:bg-red-900/60 transition-colors"
          title="投降"
        >
          <Flag size={20} />
        </button>
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
        playerHp={duelState.playerHP}
        maxHp={GAME_CONFIG.maxHP}
      />

      <CombatFeed messages={effectMessages} />

      {detailSpell && (
         <CardDetailModal 
           spell={getSpellById(detailSpell)} 
           onClose={() => setDetailSpell(null)} 
         />
      )}

            {isTutorialOpen && (
        <TutorialOverlay 
          steps={[
            {
               title: '⚔️ 战斗开始',
               content: '欢迎来到竞技场！这里的规则很简单：相克则胜，平局则各扣血量。',
               position: 'center'
            },
            {
               targetId: 'player-card-0',
               title: '🎴 出牌指引',
               content: '点击卡牌查看详情，拖拽卡牌到中间区域即可释放魔法。',
               position: 'top'
            },
            {
               targetId: 'player-mana-bar',
               title: '💧 消耗法力',
               content: '每张牌都需要消耗法力。注意管理你的资源！',
               position: 'top'
            },
            {
               targetId: 'hero-skills-container',
               title: '👑 英雄技能',
               content: '你还有强大的英雄技能！每回合可以使用一次，它们不会消耗手牌。',
               position: 'left'
            }
          ]}
          onComplete={() => {
            setIsTutorialOpen(false);
            setTutorialAction(undefined);
          }}
          onSkip={() => {
            setIsTutorialOpen(false);
            setTutorialAction(undefined);
          }}
        />
      )}
    </div>
  );
};

export default BattleArena;