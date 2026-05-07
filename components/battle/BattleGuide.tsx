/**
 * BattleGuide — 战斗指引组件
 *
 * 为新手玩家提供回合提示、出牌建议、元素克制提醒
 */

import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';

interface BattleGuideProps {
  isPlayerTurn: boolean;
  phase: string;
  playerMana: number;
  playerMaxMana: number;
  handSize: number;
  opponentLastSpell: string | null;
  roundNumber: number;
  isMobile: boolean;
}

const ELEMENT_TIPS: Record<string, { tip: string; emoji: string }> = {
  fire: { tip: '对手用了火系，冰系法术有克制加成！', emoji: '❄️' },
  ice: { tip: '对手用了冰系，雷系法术有克制加成！', emoji: '⚡' },
  thunder: { tip: '对手用了雷系，岩石法术有克制加成！', emoji: '🪨' },
  rock: { tip: '对手用了岩石，藤系法术有克制加成！', emoji: '🌿' },
  vine: { tip: '对手用了藤系，火系法术有克制加成！', emoji: '🔥' },
};

function getElementPrefix(id: string): string | null {
  if (id.startsWith('fire') || id.startsWith('hero_fire')) return 'fire';
  if (id.startsWith('ice') || id.startsWith('hero_ice')) return 'ice';
  if (id.startsWith('thunder') || id.startsWith('hero_thunder')) return 'thunder';
  if (id.startsWith('rock') || id.startsWith('hero_rock')) return 'rock';
  if (id.startsWith('vine') || id.startsWith('hero_vine')) return 'vine';
  return null;
}

export const BattleGuide: React.FC<BattleGuideProps> = memo(({
  isPlayerTurn,
  phase,
  playerMana,
  playerMaxMana,
  handSize,
  opponentLastSpell,
  roundNumber,
  isMobile,
}) => {
  const [dismissed, setDismissed] = useState(false);

  // 前 3 局后自动隐藏指引
  useEffect(() => {
    if (roundNumber > 3) {
      setDismissed(true);
    }
  }, [roundNumber]);

  if (dismissed || !isPlayerTurn || phase !== 'PLAYER_TURN') return null;

  // 生成提示
  const tips: string[] = [];

  // 元素克制提示
  if (opponentLastSpell) {
    const element = getElementPrefix(opponentLastSpell);
    if (element && ELEMENT_TIPS[element]) {
      tips.push(`${ELEMENT_TIPS[element].emoji} ${ELEMENT_TIPS[element].tip}`);
    }
  }

  // 法力管理提示
  if (playerMana === playerMaxMana && playerMaxMana >= 3) {
    tips.push('💎 法力已满，不要浪费回合！');
  }

  // 手牌提示
  if (handSize === 0) {
    tips.push('🃏 手牌已空，结束回合抽牌吧');
  } else if (handSize >= 4 && playerMana >= 2) {
    tips.push('📜 手牌充足，尝试连续出牌触发连击');
  }

  // 首回合提示
  if (roundNumber === 1) {
    tips.push('🎯 第一回合：低费法术建立优势');
  }

  if (tips.length === 0) return null;

  const displayTips = isMobile ? tips.slice(0, 1) : tips.slice(0, 2);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={`
          ${isMobile
            ? 'absolute bottom-[180px] left-2 right-2 z-[45]'
            : 'absolute bottom-[200px] left-1/2 -translate-x-1/2 z-[45]'
          }
        `}
      >
        <div className={`
          bg-amber-950/70 backdrop-blur-md border border-amber-500/30
          rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.15)]
          ${isMobile ? 'px-3 py-2' : 'px-4 py-2.5 max-w-md'}
        `}>
          <div className="flex items-start gap-2">
            <Lightbulb size={isMobile ? 14 : 16} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              {displayTips.map((tip, i) => (
                <p key={i} className={`${isMobile ? 'text-[11px]' : 'text-xs'} text-amber-200/90 leading-relaxed ${i > 0 ? 'mt-1' : ''}`}>
                  {tip}
                </p>
              ))}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-amber-500/50 hover:text-amber-400 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

BattleGuide.displayName = 'BattleGuide';
