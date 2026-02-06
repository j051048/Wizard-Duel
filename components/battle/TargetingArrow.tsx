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

  // Calculate Bezier Points
  const points = useMemo(() => {
    const numPoints = isMobile ? 8 : 12; // 移动端稍微减少点数提升性能
    const pts = [];
    
    // Control Point - Higher arc based on distance
    const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    // 移动端手指可能遮挡，稍微向上偏移
    const offsetFactor = isMobile ? 0.3 : 0.2;
    const controlX = (startX + endX) / 2 - (startY - endY) * offsetFactor;
    const controlY = (startY + endY) / 2 - dist * (isMobile ? 0.25 : 0.15);

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      // Quadratic Bezier formula
      const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
      const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
      pts.push({ x, y, scale: 0.5 + t * 0.5, opacity: 0.3 + t * 1.5 });
    }
    return pts;
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

      {/* Connection Glow Line */}
      <path 
        d={`M ${startX} ${startY} Q ${(startX + endX) / 2 - (startY - endY) * 0.3} ${(startY + endY) / 2 - (isMobile ? 150 : 100)}, ${endX} ${endY}`}
        fill="none"
        stroke="rgba(251, 191, 36, 0.2)"
        strokeWidth={isMobile ? "24" : "15"}
        strokeLinecap="round"
        filter="url(#glow)"
      />

      {/* Animated Dots */}
      {points.map((pt, i) => (
        <motion.circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r={(isMobile ? 10 : 7) * pt.scale}
          fill="url(#dotGrad)"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: Math.min(1, pt.opacity),
            scale: [pt.scale, pt.scale * 1.3, pt.scale],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.1
          }}
          style={{ filter: 'url(#glow)' }}
        />
      ))}

      {/* Target Crosshair / Impact */}
      <motion.g
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        style={{ x: endX, y: endY }}
      >
         <circle r={isMobile ? "35" : "25"} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 6" className="animate-spin-slow" />
         <circle r={isMobile ? "10" : "6"} fill="#fbbf24" filter="url(#glow)" />
         
         {/* Pulse effect at the tip */}
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
