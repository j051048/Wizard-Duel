import React from 'react';
import { Spell } from '../types.ts';
import { getMechanicName } from '../constants.ts';
import { Zap, Shield, Flame, Snowflake, Leaf } from 'lucide-react';

interface SpellCardProps {
  spell?: Spell; 
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isSmall?: boolean;
  isFaceDown?: boolean;
  isAffordable?: boolean; // 新增：是否有足够法力使用
  showMechanic?: boolean; // 是否显示机制描述
}

// 获取机制图标
const getMechanicIcon = (mechanic?: string) => {
  switch (mechanic) {
    case 'burn': return <Flame size={10} className="text-orange-400" />;
    case 'freeze': return <Snowflake size={10} className="text-cyan-300" />;
    case 'charge': return <Zap size={10} className="text-yellow-400" />;
    case 'fortify': return <Shield size={10} className="text-stone-300" />;
    case 'tangle': return <Leaf size={10} className="text-green-400" />;
    default: return null;
  }
};

export const SpellCard: React.FC<SpellCardProps> = ({ 
  spell, 
  isSelected, 
  onClick, 
  disabled, 
  isSmall, 
  isFaceDown,
  isAffordable = true,
  showMechanic = true
}) => {
  
  // FACE DOWN CARD (Card Back)
  if (isFaceDown) {
    return (
      <div className={`
        relative rounded-lg border-2 border-slate-700 bg-slate-900 overflow-hidden shadow-lg
        ${isSmall ? 'w-16 h-24' : 'w-24 h-36 sm:w-28 sm:h-40'}
        flex items-center justify-center
      `}>
        {/* Mystic Pattern Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-80"></div>
        <div className="absolute inset-1 border border-slate-600/50 rounded flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-slate-500 flex items-center justify-center opacity-50">
                <div className="w-3 h-3 bg-slate-500 rotate-45"></div>
            </div>
        </div>
      </div>
    );
  }

  // Safety check: if not face down and no spell provided, render placeholder or null
  if (!spell) return null;

  const canPlay = isAffordable && !disabled;
  const mechanicIcon = getMechanicIcon(spell.mechanic);

  return (
    <button
      onClick={canPlay ? onClick : undefined}
      disabled={!canPlay}
      style={{
        boxShadow: isSelected ? `0 0 25px ${spell.shadowColor}` : 'none'
      }}
      className={`
        relative group flex flex-col items-center justify-between rounded-lg transition-all duration-300
        border-2 overflow-hidden
        ${isSmall ? 'w-20 h-28 p-2' : 'w-28 h-44 p-2 sm:w-32 sm:h-48'}
        ${!canPlay ? 'opacity-50 cursor-not-allowed grayscale-[0.7]' : 'cursor-pointer hover:-translate-y-3 hover:z-10'}
        ${isSelected 
          ? `bg-slate-900 ${spell.borderColor} scale-105 z-20` 
          : `bg-slate-900/90 border-slate-700 ${canPlay ? 'hover:border-white/50 hover:bg-slate-800' : ''}`}
      `}
    >
      {/* Mana Cost - 左上角 */}
      <div className={`
        absolute top-1 left-1 w-7 h-7 rounded-full flex items-center justify-center 
        text-xs font-black text-white shadow-md z-10
        ${spell.manaCost >= 3 ? 'bg-gradient-to-br from-purple-600 to-purple-800 border border-purple-400' : 
          spell.manaCost === 2 ? 'bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400' : 
          'bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-400'}
      `}>
        {spell.manaCost}
      </div>

      {/* Damage - 右上角 */}
      <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-900/80 border border-red-500/50 flex items-center justify-center text-[10px] font-bold text-red-300 shadow-md z-10">
        {spell.damage}
      </div>

      {/* Card Art */}
      <div className={`
        w-full aspect-square rounded bg-gradient-to-br from-slate-800 to-black flex items-center justify-center
        border border-white/5 relative overflow-hidden group-hover:border-white/20 transition-colors mt-4
      `}>
        {/* Background glow based on element */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${spell.shadowColor} 0%, transparent 70%)`
          }}
        />
        <div className={`text-4xl sm:text-5xl drop-shadow-xl transition-transform duration-300 ${isSelected ? 'scale-110' : ''} group-hover:scale-110 relative z-10`}>
          {spell.emoji}
        </div>
      </div>

      {/* Card Text Area */}
      <div className="text-center w-full z-10 space-y-1 mt-1">
        {/* Card Name */}
        <h3 className={`font-wizard font-bold text-[9px] sm:text-[10px] uppercase tracking-wider ${spell.color} truncate leading-tight`}>
          {spell.name}
        </h3>
        
        {/* Mechanic Badge */}
        {!isSmall && showMechanic && (
          <div className={`
            flex items-center justify-center gap-1 
            text-[8px] font-bold uppercase tracking-wide
            px-2 py-0.5 rounded-full bg-black/40 border border-white/10
            ${spell.color}
          `}>
            {mechanicIcon}
            <span>{getMechanicName(spell.mechanic)}</span>
          </div>
        )}
        
        {/* Short Description */}
        {!isSmall && (
          <div className="text-[7px] text-gray-500 font-tech leading-tight px-1 border-t border-white/5 pt-1">
            {spell.shortDesc}
          </div>
        )}
      </div>
      
      {/* Active Glow Effect */}
      {isSelected && (
        <div className="absolute inset-0 rounded-lg border-2 border-white/30 animate-pulse pointer-events-none" />
      )}
      
      {/* Unaffordable Overlay */}
      {!isAffordable && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
          <span className="text-red-400 text-xs font-bold">法力不足</span>
        </div>
      )}
    </button>
  );
};
