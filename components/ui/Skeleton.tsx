/**
 * 通用骨架屏组件
 * 提供基础的脉冲动画占位符
 */
import React from 'react';

interface SkeletonProps {
  className?: string; // 支持 Tailwind 类名自定义宽高和圆角
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rect' 
}) => {
  const baseClasses = "animate-pulse bg-gray-700/50";
  
  let variantClasses = "";
  switch (variant) {
    case 'circle':
      variantClasses = "rounded-full";
      break;
    case 'text':
      variantClasses = "rounded h-4 w-3/4";
      break;
    case 'rect':
    default:
      variantClasses = "rounded-md";
      break;
  }

  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`} />
  );
};

// 预设组合：卡牌骨架
export const CardSkeleton: React.FC = () => (
  <div className="w-[160px] h-[240px] bg-gray-800/80 rounded-xl border border-gray-700 p-3 flex flex-col gap-2 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent skew-x-12 animate-shimmer" />
    <Skeleton className="h-24 w-full mb-2" />
    <Skeleton variant="text" className="w-2/3" />
    <Skeleton variant="text" className="w-1/2" />
    <div className="mt-auto flex justify-between">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-8 h-8 rounded-full" />
    </div>
  </div>
);

// 预设组合：列表项骨架
export const ListItemSkeleton: React.FC = () => (
  <div className="w-full h-16 bg-gray-800/50 rounded-lg flex items-center px-4 gap-4 animate-pulse">
    <Skeleton variant="circle" className="w-10 h-10" />
    <div className="flex-1 flex flex-col gap-2">
      <Skeleton variant="text" className="w-1/3" />
      <Skeleton variant="text" className="w-1/4 h-3" />
    </div>
    <Skeleton className="w-16 h-8 rounded-full" />
  </div>
);
