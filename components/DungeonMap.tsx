import React from 'react';
import { DungeonRunState, DungeonNode, NodeType } from '../types/dungeon';
import { Sword, Skull, Tent, HelpCircle, ShoppingCart, User, Award } from 'lucide-react';

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
  const { map, currentNodeIndex, playerHP, maxHP, gold, artifacts } = runState;

  return (
    <div className="fixed inset-0 bg-[#0a0a0c] flex flex-col items-center overflow-hidden">
      {/* 顶部状态栏 */}
      <div className="w-full h-16 bg-black/80 border-b border-purple-500/30 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-lg">❤️</span>
            <div className="w-32 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                style={{ width: `${(playerHP / maxHP) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-100">{playerHP}/{maxHP}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-lg">💰</span>
            <span className="text-sm font-bold text-slate-100">{gold}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {artifacts.map(a => (
            <div key={a.id} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded border border-slate-700 group relative" title={a.name}>
               <span className="text-xl">{a.icon}</span>
               <div className="absolute top-10 right-0 w-48 bg-black/90 p-2 rounded border border-purple-500/50 hidden group-hover:block z-50">
                  <p className="text-xs font-bold text-purple-300">{a.name}</p>
                  <p className="text-[10px] text-slate-300">{a.description}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* 地图内容区 */}
      <div className="flex-1 w-full max-w-2xl relative overflow-y-auto overflow-x-hidden pt-20 pb-40 no-scrollbar scroll-smooth">
        {/* 地图渲染 */}
        <div className="flex flex-col items-center gap-12 relative">
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
                  <div className={`absolute top-full h-12 w-1 border-l-2 border-dashed ${isCleared ? 'border-slate-700' : 'border-slate-800'}`} />
                )}

                <button
                  onClick={() => isAccessible && onSelectNode(node)}
                  disabled={!isAccessible}
                  className={`
                    relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-500
                    ${isCurrent ? 'bg-indigo-900/60 ring-4 ring-yellow-500/50 scale-110 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 
                      isCleared ? 'bg-slate-900/40 grayscale opacity-60' : 'bg-slate-900/80 border border-slate-700 pointer-events-none'}
                    ${isAccessible ? 'hover:scale-125 hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] cursor-pointer' : ''}
                  `}
                >
                  <NodeIcon type={node.type} isCleared={isCleared} isCurrent={isCurrent} />
                  
                  {isCurrent && (
                     <div className="absolute -top-12 animate-bounce">
                        <div className="bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded-md whitespace-nowrap uppercase tracking-widest shadow-lg">
                           你的位置
                        </div>
                     </div>
                  )}

                  <span className={`absolute top-1/2 left-24 -translate-y-1/2 whitespace-nowrap font-wizard text-lg font-bold ${isCurrent ? 'text-slate-100' : 'text-slate-500'}`}>
                    {node.name}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部渐变遮罩 */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0a0a0c] to-transparent pointer-events-none" />
    </div>
  );
};
