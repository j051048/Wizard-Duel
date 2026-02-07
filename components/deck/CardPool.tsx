import React, { useState, useRef, useMemo } from 'react';
import { Plus, Info } from 'lucide-react';
import { SpellType, Spell, GameMode } from '../../types';
import { SpellCard } from '../SpellCard';
import { getMechanicName } from '../../constants';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useIsMobile } from '../../hooks/useIsMobile';

interface CardPoolProps {
  filteredCardPool: Spell[];
  onAddCard: (spellId: SpellType, e?: React.MouseEvent) => void;
  onRightClick: (e: React.MouseEvent, spellId: SpellType) => void;
  onPressStart: (spellId: SpellType) => void;
  onPressEnd: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  activeCostFilter: number | null;
  onCostFilterChange: (cost: number | null) => void;
}

// 悬停提示组件 - 使用 Portal 渲染到 body
const CardTooltip: React.FC<{ spell: Spell; targetRect: DOMRect | null; visible: boolean }> = ({ spell, targetRect, visible }) => {
  if (!visible || !targetRect) return null;
  
  const tooltipWidth = 224; // w-56 = 14rem = 224px
  const tooltipHeight = 200; // 估算高度
  const padding = 8;
  
  // 计算位置 - 优先显示在上方，空间不足则显示在下方
  const spaceAbove = targetRect.top;
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const showBelow = spaceAbove < tooltipHeight + padding;
  
  // 水平居中，但确保不超出屏幕
  let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
  
  // 垂直位置
  const top = showBelow 
    ? targetRect.bottom + padding 
    : targetRect.top - tooltipHeight - padding;
  
  return createPortal(
    <div 
      className="fixed z-[9999] pointer-events-none transition-all duration-200"
      style={{ 
        left: `${left}px`, 
        top: `${top}px`,
        width: `${tooltipWidth}px`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.95)'
      }}
    >
      <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/20 p-3 shadow-2xl">
        {/* 卡牌名称 */}
        <div className={`font-bold text-base mb-1 ${spell.color}`}>
          {spell.name}
        </div>
        
        {/* 费用和伤害 */}
        <div className="flex items-center gap-3 text-xs mb-2">
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">{spell.manaCost}</span>
            <span className="text-blue-300">法力</span>
          </span>
          {spell.damage > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-[10px]">{spell.damage}</span>
              <span className="text-red-300">伤害</span>
            </span>
          )}
          {(spell.armorGain || 0) > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold text-[10px]">{spell.armorGain}</span>
              <span className="text-slate-300">护甲</span>
            </span>
          )}
        </div>
        
        {/* 机制标签 */}
        {spell.mechanic && spell.mechanic !== 'skip' && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-900/50 rounded-full text-[10px] text-purple-300 mb-2">
            <span>🔮</span>
            <span>{getMechanicName(spell.mechanic)}</span>
          </div>
        )}
        
        {/* 完整描述 */}
        <p className="text-xs text-gray-300 leading-relaxed">
          {spell.description}
        </p>
        
        {/* 操作提示 */}
        <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-gray-500 flex justify-between">
          <span>点击添加到卡组</span>
          <span>长按查看大图</span>
        </div>
      </div>
      
      {/* 箭头 - 根据位置调整 */}
      <div 
        className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border border-white/20 transform rotate-45 ${showBelow ? '-top-1 border-r-0 border-b-0' : '-bottom-1 border-l-0 border-t-0'}`}
      />
    </div>,
    document.body
  );
};

/**
 * CardPool - 卡牌池组件
 * [P0 性能] 使用虚拟滚动优化大量卡牌渲染
 */
const CardPool: React.FC<CardPoolProps> = ({
  filteredCardPool,
  onAddCard,
  onRightClick,
  onPressStart,
  onPressEnd,
  searchTerm,
  onSearchChange,
  activeCostFilter,
  onCostFilterChange
}) => {
  const isMobile = useIsMobile();
  const [hoveredSpell, setHoveredSpell] = useState<Spell | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  
  // 虚拟滚动容器 ref
  const parentRef = useRef<HTMLDivElement>(null);
  
  // 计算列数和卡牌尺寸
  const columns = isMobile ? 3 : 4;
  const cardHeight = isMobile ? 130 : 180; // 卡牌高度 + 间距
  const gap = isMobile ? 6 : 16;
  
  // 将卡牌分组为行
  const rows = useMemo(() => {
    const result: Spell[][] = [];
    for (let i = 0; i < filteredCardPool.length; i += columns) {
      result.push(filteredCardPool.slice(i, i + columns));
    }
    return result;
  }, [filteredCardPool, columns]);
  
  // 虚拟化行
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => cardHeight,
    overscan: 3, // 预渲染上下各 3 行
  });

  return (
    <div className={`flex flex-col bg-[#1a1425] h-full ${isMobile ? '' : 'rounded-xl border border-[#3b304e] shadow-2xl'} relative overflow-hidden`}>
       {/* Decorative Corner */}
       {!isMobile && <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-amber-600/30 rounded-tl-xl pointer-events-none"></div>}
       
       {/* Filters Header - Mobile Optimized */}
       <div className={`${isMobile ? 'p-2 bg-slate-900/90 backdrop-blur sticky top-0 z-20 shadow-lg' : 'p-4 border-b border-white/5 bg-black/20 space-y-3'}`}>
          {!isMobile && (
             <h3 className="text-xl font-wizard text-amber-100 flex items-center gap-2 mb-3">
                <span className="text-2xl">📖</span> 卡牌收藏
             </h3>
          )}

          <div className={`flex ${isMobile ? 'gap-2 items-center' : 'justify-between items-center'}`}>
            {/* Search Input */}
            <div className={`relative ${isMobile ? 'flex-1' : 'w-auto'}`}>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={isMobile ? "搜索..." : "搜索卡牌..."}
                className={`
                  bg-black/40 border border-white/10 rounded-full text-white focus:outline-none focus:border-amber-500 transition-all 
                  ${isMobile ? 'w-full text-xs px-3 py-2' : 'w-48 px-4 py-1.5 text-sm'}
                `}
              />
            </div>

            {/* Mana Filter - Mobile compact */}
            <div className={`flex items-center gap-1 ${isMobile ? 'overflow-x-auto no-scrollbar max-w-[60%]' : ''}`}>
               {!isMobile && <span className="text-[10px] text-gray-500 shrink-0 uppercase tracking-tighter mr-1">费用:</span>}
               
               <button 
                  onClick={() => onCostFilterChange(null)}
                  className={`shrink-0 rounded-full font-bold transition-all border flex items-center justify-center
                    ${isMobile ? 'w-7 h-7 text-[10px] p-0' : 'px-3 py-1 text-[10px]'}
                    ${activeCostFilter === null ? 'bg-amber-600 border-amber-400 text-white' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'}
                  `}
               >
                 {isMobile ? 'All' : '全部'}
               </button>

               {[0, 1, 2, 3, 4, 5, 6, 7].map(cost => (
                 <button
                     key={cost}
                     onClick={() => onCostFilterChange(activeCostFilter === cost ? null : cost)}
                     className={`
                       shrink-0 rounded-full flex items-center justify-center font-bold transition-all border shadow-sm
                       ${isMobile ? 'w-7 h-7 text-[10px]' : 'w-7 h-7 text-xs'}
                       ${activeCostFilter === cost 
                         ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-blue-500/50' 
                         : 'bg-[#1a233b] border-blue-900/50 text-blue-300 hover:bg-blue-900'}
                     `}
                 >
                     {cost === 7 ? '7+' : cost}
                 </button>
               ))}
            </div>
          </div>
       </div>

       {/* [P0 性能] 虚拟滚动容器 */}
       <div 
         ref={parentRef}
         className={`flex-1 overflow-y-auto ${isMobile ? 'px-2' : 'px-4'} custom-scrollbar`}
       >
          {filteredCardPool.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <span className="text-4xl mb-2">🔍</span>
              <span className="text-xs">没有找到匹配的卡牌</span>
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowCards = rows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div 
                      className="grid h-full"
                      style={{
                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        gap: `${gap}px`,
                        padding: `${gap / 2}px 0`,
                      }}
                    >
                      {rowCards.map((spell) => (
                        <div 
                          key={spell.id} 
                          className="relative group cursor-pointer touch-manipulation" 
                          onClick={(e) => onAddCard(spell.id, e)}
                          onContextMenu={(e) => onRightClick(e, spell.id)}
                          onPointerDown={() => onPressStart(spell.id)}
                          onPointerUp={onPressEnd}
                          onPointerLeave={() => {
                            onPressEnd();
                            setHoveredSpell(null);
                            setHoveredRect(null);
                          }}
                          onMouseEnter={(e) => {
                            if (!isMobile) {
                              setHoveredSpell(spell);
                              setHoveredRect(e.currentTarget.getBoundingClientRect());
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredSpell(null);
                            setHoveredRect(null);
                          }}
                        >
                          <div className={`transform transition-transform duration-200 ${!isMobile ? 'group-hover:scale-105 group-hover:-translate-y-2' : ''} pointer-events-none`}>
                             <SpellCard spell={spell} isSmall showMechanic={false} />
                          </div>
                          
                          {/* Hover/Touch Overlay */}
                          {!isMobile && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg pointer-events-none">
                              <div className="bg-green-600 text-white rounded-full p-1 shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                  <Plus size={16} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* 底部留白 - 移动端为抽屉预留空间 */}
          {isMobile && <div className="h-40" />}
          
          {!isMobile && (
            <CardTooltip 
              spell={hoveredSpell!} 
              targetRect={hoveredRect} 
              visible={!!hoveredSpell} 
            />
          )}
       </div>
    </div>
  );
};

export default CardPool;
