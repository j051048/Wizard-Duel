import React, { useMemo } from 'react';
import { GameLoopState } from '../../types';
import { motion } from 'framer-motion';

interface TargetingArrowProps {
  data: GameLoopState['targetingData'];
  isMobile?: boolean;
}

const TargetingArrow: React.FC<TargetingArrowProps> = ({ data, isMobile = false }) => {
  if (!data?.isTargeting) return null;

  const { startX, startY, endX, endY } = data;

  // 使用 SVG Path 替代大量的 DOM 节点
  const pathData = useMemo(() => {
    const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const offsetFactor = isMobile ? 0.3 : 0.2;
    const controlX = (startX + endX) / 2 - (startY - endY) * offsetFactor;
    const controlY = (startY + endY) / 2 - dist * (isMobile ? 0.25 : 0.15);
    return `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`;
  }, [startX, startY, endX, endY, isMobile]);

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-[60] overflow-visible">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation={isMobile ? "4.5" : "3.5"} result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <radialGradient id="dotGrad">
           <stop offset="0%" stopColor="#fbbf24" />
           <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
      </defs>

      {/* 主路径 - 加上虚线效果模拟之前的点状感，但性能极佳 */}
      <motion.path 
        d={pathData}
        fill="none"
        stroke="url(#dotGrad)"
        strokeWidth={isMobile ? "12" : "8"}
        strokeDasharray={isMobile ? "1 25" : "1 20"}
        strokeLinecap="round"
        filter="url(#glow)"
        animate={{ strokeDashoffset: [-100, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />

      {/* 辅助外发光路径 */}
      <path 
        d={pathData}
        fill="none"
        stroke="rgba(251, 191, 36, 0.15)"
        strokeWidth={isMobile ? "30" : "20"}
        strokeLinecap="round"
        filter="url(#glow)"
      />

      {/* 目标准星 */}
      <motion.g
        style={{ x: endX, y: endY }}
      >
         <circle r={isMobile ? "35" : "25"} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 6" className="animate-spin-slow" />
         <circle r={isMobile ? "10" : "6"} fill="#fbbf24" filter="url(#glow)" />
         
         <motion.circle 
            r={isMobile ? "45" : "30"}
            fill="none"
            stroke="#fbbf24"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
         />
      </motion.g>
    </svg>
  );
};

export default TargetingArrow;
