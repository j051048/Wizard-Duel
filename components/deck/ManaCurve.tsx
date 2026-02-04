import React from 'react';
import { SpellType } from '../../types';
import { getSpellById } from '../../services/gameLogic';

interface ManaCurveProps {
  selectedCards: SpellType[];
}

const ManaCurve: React.FC<ManaCurveProps> = ({ selectedCards }) => {
  return (
    <div className="flex items-end gap-3 h-24 pt-4 px-4 bg-black/20 rounded-lg border border-white/5">
        {[1,2,3,4,5,6].map(cost => {
          const count = selectedCards.filter(card => getSpellById(card).manaCost === cost).length;
          const height = Math.min(100, (count / 10) * 100); // Max height capped at 10 cards
          return (
            <div key={cost} className="flex flex-col items-center gap-1 group/bar relative w-6">
               {/* Count Tooltip */}
               <div className="absolute -top-6 text-xs font-bold text-white opacity-0 group-hover/bar:opacity-100 transition-opacity">
                 {count}
               </div>
               {/* Bar */}
               <div 
                 className="w-full bg-gradient-to-t from-cyan-600 to-blue-400 rounded-sm relative transition-all duration-500"
                 style={{ height: `${Math.max(4, height)}%` }}
               >
                 {/* Glow effect */}
                 <div className="absolute inset-0 bg-blue-400 blur-sm opacity-0 group-hover/bar:opacity-50 transition-opacity"></div>
               </div>
               {/* Label */}
               <div className="text-[10px] font-bold text-gray-500 mt-1">{cost}</div>
            </div>
          );
        })}
    </div>
  );
};

export default ManaCurve;
