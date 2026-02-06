/**
 * MulliganScreen - 起手换牌阶段
 * 允许玩家选择要替换的起始手牌
 */

import React, { useState, useEffect } from 'react';
import { SpellType } from '../types';
import { SpellCard } from './SpellCard';
import { getSpellById } from '../services/gameLogic';
import { RefreshCcw, Check, Clock } from 'lucide-react';
import { HapticService } from '../services/haptic';
import { useIsMobile } from '../hooks/useIsMobile';

interface MulliganScreenProps {
  initialHand: SpellType[];
  playerName?: string;
  opponentName?: string;
  opponentAvatar?: string;
  onConfirm: (selectedIndices: number[]) => void;
  timeLimit?: number; // 秒
}

export const MulliganScreen: React.FC<MulliganScreenProps> = ({
  initialHand,
  playerName = '你',
  opponentName = '对手',
  opponentAvatar,
  onConfirm,
  timeLimit = 30
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);

  // 倒计时
  useEffect(() => {
    if (isConfirmed) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleConfirm();
          return 0;
        }
        // 最后5秒警告震动
        if (prev <= 5) {
          HapticService.light();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isConfirmed]);

  // 入场动画
  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const toggleCard = (index: number) => {
    if (isConfirmed) return;
    
    HapticService.light();
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    if (isConfirmed) return;
    
    setIsConfirmed(true);
    HapticService.medium();
    
    // 延迟回调，播放确认动画
    setTimeout(() => {
      onConfirm(Array.from(selectedIndices));
    }, 800);
  };

  const isMobile = useIsMobile();
  const isLowTime = timeLeft <= 10;
  const isCriticalTime = timeLeft <= 5;

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col overflow-hidden safe-area-bottom">
      {/* 背景 */}
      <div className="absolute inset-0 z-0 text-white">
        <img 
          src="/ui/bg_arena.webp" 
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950" />
      </div>

      {/* 顶部：对手信息 */}
      <div className={`relative z-10 flex justify-center items-center ${isMobile ? 'py-4' : 'py-6'}`}>
        <div className={`flex items-center ${isMobile ? 'gap-2 px-4 py-2' : 'gap-4 px-6 py-3'} bg-black/40 backdrop-blur-md rounded-full border border-white/10`}>
          <div className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} rounded-full border-2 border-red-500/50 overflow-hidden bg-slate-800`}>
            {opponentAvatar ? (
              <img src={opponentAvatar} className="w-full h-full object-cover" alt={opponentName} />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${isMobile ? 'text-lg' : 'text-2xl'}`}>🧙</div>
            )}
          </div>
          <div>
            <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold">对手</p>
            <p className={`text-white font-bold ${isMobile ? 'text-xs truncate max-w-[80px]' : ''}`}>{opponentName}</p>
          </div>
          <div className="text-gray-500 text-[10px] md:text-sm">正在选择...</div>
        </div>
      </div>

      {/* 中央：标题和倒计时 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        {/* 标题动画 */}
        <div className={`text-center ${isMobile ? 'mb-4' : 'mb-8'} transition-all duration-1000 ${showAnimation ? 'opacity-0 -translate-y-10' : 'opacity-100 translate-y-0'}`}>
          <h1 className="text-2xl md:text-4xl font-wizard font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 mb-1 md:mb-2">
            选择起手牌
          </h1>
          <p className="text-gray-400 text-[10px] md:text-sm">
            点击要替换的牌，然后确认
          </p>
        </div>

        {/* 倒计时 */}
        <div className={`
          ${isMobile ? 'mb-4 px-4 py-2' : 'mb-8 px-6 py-3'} flex items-center gap-3 rounded-full transition-all
          ${isCriticalTime 
            ? 'bg-red-500/20 border border-red-500/50 animate-pulse' 
            : isLowTime 
              ? 'bg-yellow-500/20 border border-yellow-500/50' 
              : 'bg-black/40 border border-white/10'
          }
        `}>
          <Clock className={`w-4 h-4 md:w-5 md:h-5 ${isCriticalTime ? 'text-red-400' : isLowTime ? 'text-yellow-400' : 'text-gray-400'}`} />
          <span className={`font-mono font-bold ${isMobile ? 'text-lg' : 'text-2xl'} ${
            isCriticalTime ? 'text-red-400' : isLowTime ? 'text-yellow-400' : 'text-white'
          }`}>
            {timeLeft}
          </span>
          <span className="text-gray-500 text-[10px] md:text-sm">秒</span>
        </div>

        {/* 手牌展示 */}
        <div id="mulligan-container" className={`flex justify-center items-end ${isMobile ? 'gap-1.5' : 'gap-4 md:gap-6'} mb-6 md:mb-8 px-2`}>
          {initialHand.map((spellId, index) => {
            const isSelected = selectedIndices.has(index);
            const spell = getSpellById(spellId);
            
            return (
              <div
                key={`${spellId}-${index}`}
                className={`
                  relative cursor-pointer transition-all duration-300 transform
                  ${showAnimation ? 'opacity-0 translate-y-20' : 'opacity-100 translate-y-0'}
                  ${isSelected ? '-translate-y-4 scale-105' : 'hover:-translate-y-2 hover:scale-102'}
                  ${isConfirmed && isSelected ? 'opacity-50 rotate-12' : ''}
                `}
                style={{ 
                  transitionDelay: showAnimation ? `${index * 100}ms` : '0ms',
                  animationDelay: `${index * 100}ms`
                }}
                onClick={() => toggleCard(index)}
              >
                <SpellCard 
                  spell={spell} 
                  isSelected={isSelected}
                  disabled={isConfirmed}
                  isSmall={isMobile}
                />
                
                {/* 替换标记 */}
                {isSelected && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-bounce z-20">
                    <RefreshCcw className="w-4 h-4 text-white" />
                  </div>
                )}
                
                {/* 选中光晕 */}
                {isSelected && (
                  <div className="absolute inset-0 border-2 border-red-500 rounded-xl pointer-events-none animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* 选择提示 */}
        <div className="text-center text-sm text-gray-500 mb-6">
          {selectedIndices.size === 0 ? (
            <span>点击卡牌标记要替换的牌，或直接确认保留所有</span>
          ) : (
            <span className="text-amber-400">
              已选择 <span className="font-bold">{selectedIndices.size}</span> 张牌进行替换
            </span>
          )}
        </div>

        {/* 确认按钮 */}
        <button
          onClick={handleConfirm}
          disabled={isConfirmed}
          className={`
            px-12 py-4 rounded-xl font-bold text-lg uppercase tracking-wider
            transition-all duration-300 flex items-center gap-3
            ${isConfirmed 
              ? 'bg-green-600 text-white cursor-default'
              : 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30 active:scale-95'
            }
          `}
        >
          {isConfirmed ? (
            <>
              <Check className="w-5 h-5" />
              已确认
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              {selectedIndices.size > 0 ? `替换 ${selectedIndices.size} 张` : '保留全部'}
            </>
          )}
        </button>
      </div>

      {/* 底部装饰 */}
      <div className="relative z-10 h-20 flex items-center justify-center">
        <div className="w-64 h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      {/* 绳子倒计时视觉效果 */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-800 z-20">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${
            isCriticalTime 
              ? 'bg-gradient-to-r from-red-600 to-orange-500' 
              : isLowTime 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                : 'bg-gradient-to-r from-green-500 to-emerald-400'
          }`}
          style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
        />
        {/* 燃烧效果 */}
        {isLowTime && (
          <div 
            className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent to-yellow-500/50 animate-pulse"
            style={{ left: `${(timeLeft / timeLimit) * 100}%`, marginLeft: '-16px' }}
          />
        )}
      </div>
    </div>
  );
};

export default MulliganScreen;