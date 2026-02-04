import React from 'react';
import { SpellType } from '../../types';
import { getSpellById } from '../../services/gameLogic';

interface ManaCurveProps {
  selectedCards: SpellType[];
}

const ManaCurve: React.FC<ManaCurveProps> = ({ selectedCards }) => {
  return (
    <div className="flex flex-col gap-2">
      {/* 标题 */}
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">法力曲线</div>
      
      <div className="flex items-end gap-2 h-20 pt-2 px-3 bg-black/20 rounded-lg border border-white/5">
          {[1,2,3,4,5,6,7].map(cost => {
            const count = selectedCards.filter(card => {
              const spell = getSpellById(card);
              return cost === 7 ? spell.manaCost >= 7 : spell.manaCost === cost;
            }).length;
            const height = Math.min(100, (count / 8) * 100); // Max height capped at 8 cards
            return (
              <div key={cost} className="flex flex-col items-center gap-1 group/bar relative w-5" title={`${cost}费卡牌: ${count}张`}>
                 {/* Count Tooltip */}
                 <div className="absolute -top-5 text-[10px] font-bold text-white opacity-0 group-hover/bar:opacity-100 transition-opacity bg-black/80 px-1 rounded">
                   {count}张
                 </div>
                 {/* Bar */}
                 <div 
                   className={`w-full rounded-sm relative transition-all duration-500 ${count > 0 ? 'bg-gradient-to-t from-cyan-600 to-blue-400' : 'bg-gray-800'}`}
                   style={{ height: `${Math.max(4, height)}%` }}
                 >
                   {/* Glow effect */}
                   {count > 0 && (
                     <div className="absolute inset-0 bg-blue-400 blur-sm opacity-0 group-hover/bar:opacity-50 transition-opacity"></div>
                   )}
                 </div>
                 {/* Label */}
                 <div className="text-[10px] font-bold text-gray-500">{cost === 7 ? '7+' : cost}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ManaCurve;
