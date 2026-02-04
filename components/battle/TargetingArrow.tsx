import React from 'react';
import { GameLoopState } from '../../types';

interface TargetingArrowProps {
  data: GameLoopState['targetingData'];
}

const TargetingArrow: React.FC<TargetingArrowProps> = ({ data }) => {
  if (!data?.isTargeting) return null;
  
  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-[60]">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" opacity="0.8" />
        </marker>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
           <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
           <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path 
        d={`M ${data.startX} ${data.startY} Q ${(data.startX + data.endX)/2 - 50} ${(data.startY + data.endY)/2}, ${data.endX} ${data.endY}`}
        stroke="url(#lineGrad)" 
        strokeWidth="4" 
        fill="none" 
        strokeDasharray="8 8"
        markerEnd="url(#arrowhead)"
        className="animate-dash-move"
      />
    </svg>
  );
};

export default TargetingArrow;
