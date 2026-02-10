/**
 * PackTearAnimation - 开包撕开物理手感
 * 
 * [P3 Fix #27] 模拟卡包撕开的物理手感
 * - 拖拽撕开手势
 * - 根据稀有度显示不同侧边光芒
 * - 撕开过程的阻力感
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { HapticService } from '../../services/haptic';

interface PackTearAnimationProps {
  packName: string;
  hasRare: boolean;
  hasLegendary: boolean;
  onTearComplete: () => void;
}

/** 根据最高稀有度返回光芒颜色 */
const getRarityGlow = (hasLegendary: boolean, hasRare: boolean) => {
  if (hasLegendary) return { color: '#fbbf24', shadow: 'rgba(251,191,36,0.8)', name: 'Legendary' };
  if (hasRare) return { color: '#a855f7', shadow: 'rgba(168,85,247,0.6)', name: 'Rare' };
  return { color: '#60a5fa', shadow: 'rgba(96,165,250,0.4)', name: 'Common' };
};

export const PackTearAnimation: React.FC<PackTearAnimationProps> = ({
  packName,
  hasRare,
  hasLegendary,
  onTearComplete,
}) => {
  const [tearProgress, setTearProgress] = useState(0);
  const [isTorn, setIsTorn] = useState(false);
  const startYRef = useRef(0);
  const hasFiredRef = useRef(false);
  const y = useMotionValue(0);
  
  const glow = getRarityGlow(hasLegendary, hasRare);
  
  // 撕开进度映射到光缝宽度
  const glowWidth = useTransform(y, [-200, 0], [40, 0]);
  const glowOpacity = useTransform(y, [-200, -50, 0], [1, 0.8, 0]);
  
  const TEAR_THRESHOLD = -180; // 需要拖拽 180px 才能撕开

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    hasFiredRef.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isTorn) return;
    const deltaY = e.clientY - startYRef.current;
    
    // 只允许向上拖（撕开）
    if (deltaY < 0) {
      // 阻力感：越拉越难
      const resistance = 1 - Math.min(Math.abs(deltaY) / 400, 0.6);
      const adjustedDelta = deltaY * resistance;
      y.set(adjustedDelta);
      
      const progress = Math.min(Math.abs(adjustedDelta) / Math.abs(TEAR_THRESHOLD), 1);
      setTearProgress(progress);
      
      // 渐进式触觉反馈
      if (progress > 0.3 && progress < 0.35) HapticService.light();
      if (progress > 0.6 && progress < 0.65) HapticService.medium();
      if (progress > 0.9 && !hasFiredRef.current) {
        HapticService.heavy();
        hasFiredRef.current = true;
      }
    }
  }, [isTorn, y]);

  const handlePointerUp = useCallback(() => {
    if (isTorn) return;
    
    if (tearProgress >= 0.9) {
      // 成功撕开！
      setIsTorn(true);
      HapticService.impact();
      setTimeout(onTearComplete, 400);
    } else {
      // 弹回
      y.set(0);
      setTearProgress(0);
    }
  }, [tearProgress, isTorn, onTearComplete, y]);

  return (
    <div 
      className="relative flex items-center justify-center select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: isTorn ? 'default' : 'grab' }}
    >
      {/* 卡包主体 */}
      <motion.div
        style={{ y }}
        className="relative w-48 h-64 md:w-56 md:h-72"
      >
        {/* 卡包图片 */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-800 to-purple-900 rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[url('/ui/card_back.webp')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-2">📦</div>
              <div className="text-white font-wizard text-sm uppercase tracking-wider">{packName}</div>
            </div>
          </div>
        </div>

        {/* [P3 Fix #27] 稀有度侧边光芒 — 撕开过程中从缝隙透出 */}
        <motion.div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ opacity: glowOpacity }}
        >
          <motion.div
            className="mx-auto rounded-full"
            style={{
              width: glowWidth,
              height: 4,
              backgroundColor: glow.color,
              boxShadow: `0 0 20px 10px ${glow.shadow}, 0 0 60px 20px ${glow.shadow}`,
            }}
          />
        </motion.div>

        {/* 撕裂线指示 */}
        {!isTorn && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/20" />
        )}
      </motion.div>

      {/* 拖拽提示 */}
      {!isTorn && tearProgress < 0.1 && (
        <motion.div
          className="absolute bottom-4 text-white/50 text-sm font-bold"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          ⬆️ 向上拖动撕开
        </motion.div>
      )}

      {/* 撕开进度条 */}
      {!isTorn && tearProgress > 0.1 && (
        <div className="absolute bottom-8 w-32 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full rounded-full"
            style={{ 
              width: `${tearProgress * 100}%`,
              backgroundColor: tearProgress > 0.8 ? glow.color : '#ffffff80',
            }}
          />
        </div>
      )}

      {/* 撕开爆裂效果 */}
      {isTorn && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: glow.shadow }}
        />
      )}
    </div>
  );
};

export default PackTearAnimation;