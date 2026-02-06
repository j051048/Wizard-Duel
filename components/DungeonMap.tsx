import React from 'react';
import { DungeonRunState, DungeonNode, NodeType } from '../types/dungeon';
import { Sword, Skull, Tent, HelpCircle, ShoppingCart, Award } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

interface DungeonMapProps {
  runState: DungeonRunState;
  onSelectNode: (node: DungeonNode) => void;
}

const NodeIcon = ({ type, isCleared, isCurrent }: { type: NodeType, isCleared: boolean, isCurrent: boolean }) => {
  const size = isCurrent ? 32 : 24;
  const colorClass = isCleared ? 'text-slate-500' : isCurrent ? 'text-yellow-400 animate-pulse' : 'text-slate-300';
  
  switch (type) {
    case 'BATTLE': return <Sword size={size} className={colorClass} />;
    case 'ELITE': return <Skull size={size} className={`${colorClass} ${!isCleared ? 'text-orange-500' : ''}`} />;
    case 'BOSS': return <Award size={size + 8} className={`${colorClass} ${!isCleared ? 'text-red-500 animate-bounce' : ''}`} />;
    case 'REST': return <Tent size={size} className={colorClass} />;
    case 'SHOP': return <ShoppingCart size={size} className={colorClass} />;
    case 'EVENT': return <HelpCircle size={size} className={colorClass} />;
    default: return <Sword size={size} className={colorClass} />;
  }
};

export const DungeonMap: React.FC<DungeonMapProps> = ({ runState, onSelectNode }) => {
  const isMobile = useIsMobile();
  const { map, currentNodeIndex, playerHP, maxHP, gold, artifacts } = runState;

  return (
    <div className="fixed inset-0 bg-[#0a0a0c] flex flex-col items-center overflow-hidden">
      {/* 顶部状态栏 */}
      <div className={`w-full ${isMobile ? 'h-14 px-3' : 'h-16 px-6'} bg-black/90 border-b border-purple-500/20 backdrop-blur-md flex items-center justify-between z-50 safe-area-top`}>
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-base md:text-lg">❤️</span>
            <div className={`${isMobile ? 'w-20' : 'w-32'} h-2 md:h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700`}>
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                style={{ width: `${(playerHP / maxHP) * 100}%` }}
              />
            </div>
            <span className="text-[10px] md:text-sm font-bold text-slate-100">{playerHP}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 border-l border-white/10 pl-3 md:pl-6">
            <span className="text-yellow-400 text-sm md:text-lg">💰</span>
            <span className="text-xs md:text-sm font-bold text-slate-100">{gold}</span>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[40%]">
          {artifacts.map(a => (
            <div key={a.id} className={`${isMobile ? 'w-7 h-7' : 'w-9 h-9'} flex-shrink-0 flex items-center justify-center bg-slate-800/80 rounded border border-white/5 active:scale-95 transition-transform group relative`}>
               <span className={isMobile ? 'text-base' : 'text-xl'}>{a.icon}</span>
               {!isMobile && (
                 <div className="absolute top-10 right-0 w-48 bg-black/95 p-2 rounded-lg border border-purple-500/30 hidden group-hover:block z-50 shadow-2xl">
                    <p className="text-xs font-bold text-purple-300">{a.name}</p>
                    <p className="text-[10px] text-slate-400">{a.description}</p>
                 </div>
               )}
            </div>
          ))}
        </div>
      </div>

      {/* 地图内容区 */}
      <div className={`flex-1 w-full max-w-2xl relative overflow-y-auto overflow-x-hidden ${isMobile ? 'pt-8 pb-32' : 'pt-20 pb-40'} no-scrollbar scroll-smooth`}>
        {/* 地图渲染 */}
        <div className={`flex flex-col items-center ${isMobile ? 'gap-8' : 'gap-14'} relative`}>
          {/* 背景羊皮卷纹理 (SVG Or Image) */}
          <div className="absolute inset-x-0 top-0 bottom-0 opacity-5 pointer-events-none">
             <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
          </div>

          {map.map((node, index) => {
            const isCurrent = index === currentNodeIndex;
            const isAccessible = index === currentNodeIndex;
            const isCleared = index < currentNodeIndex;
            const isFuture = index > currentNodeIndex;

            return (
              <div key={node.id} className="relative flex flex-col items-center">
                {/* 连接线 */}
                {index < map.length - 1 && (
                  <div className={`absolute top-full ${isMobile ? 'h-8' : 'h-14'} w-0.5 border-l-2 border-dashed ${isCleared ? 'border-slate-700/50' : 'border-indigo-500/20'}`} />
                )}

                <button
                  onClick={() => isAccessible && onSelectNode(node)}
                  disabled={!isAccessible}
                  className={`
                    relative z-10 ${isMobile ? 'w-16 h-16' : 'w-20 h-20'} rounded-full flex flex-col items-center justify-center transition-all duration-500
                    ${isCurrent ? 'bg-indigo-900 ring-4 ring-amber-500/50 scale-110 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 
                      isCleared ? 'bg-slate-900/40 grayscale opacity-40' : 'bg-slate-900/80 border border-white/5 pointer-events-none'}
                    ${isAccessible ? 'active:scale-125 cursor-pointer' : ''}
                  `}
                >
                  <NodeIcon type={node.type} isCleared={isCleared} isCurrent={isCurrent} />
                  
                  {isCurrent && (
                     <div className={`absolute ${isMobile ? '-top-10 scale-75' : '-top-12'} animate-bounce`}>
                        <div className="bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded shadow-lg whitespace-nowrap">
                           当前位置
                        </div>
                     </div>
                  )}

                  <span className={`absolute top-1/2 ${isMobile ? 'left-20' : 'left-24'} -translate-y-1/2 whitespace-nowrap font-wizard ${isMobile ? 'text-sm' : 'text-lg'} font-bold ${isCurrent ? 'text-slate-100' : 'text-slate-500'}`}>
                    {node.name}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部渐变遮罩 */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />
    </div>
  );
};

export default DungeonMap;
