import React from 'react';
import { Spell } from '../types';

interface SpellCardProps {
  spell?: Spell; 
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isSmall?: boolean;
  isFaceDown?: boolean;
}

export const SpellCard: React.FC<SpellCardProps> = ({ spell, isSelected, onClick, disabled, isSmall, isFaceDown }) => {
  
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

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        boxShadow: isSelected ? `0 0 20px ${spell.shadowColor}` : 'none'
      }}
      className={`
        relative group flex flex-col items-center justify-between rounded-lg transition-all duration-300
        border-2 overflow-hidden
        ${isSmall ? 'w-20 h-28 p-2' : 'w-24 h-36 p-3 sm:w-28 sm:h-40'}
        ${disabled ? 'opacity-80 cursor-default grayscale-[0.5]' : 'cursor-pointer hover:-translate-y-2 hover:z-10'}
        ${isSelected 
          ? `bg-slate-900 ${spell.borderColor} translate-y-[-10px] z-20` 
          : 'bg-slate-900/90 border-slate-700 hover:border-white/50 hover:bg-slate-800'}
      `}
    >
      {/* Mana Cost */}
      <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-[10px] font-bold text-white shadow-md z-10">
        {spell?.manaCost ?? 1}
      </div>

      {/* Card Art */}
      <div className={`
        w-full aspect-square rounded bg-gradient-to-br from-slate-800 to-black flex items-center justify-center
        border border-white/5 relative overflow-hidden group-hover:border-white/20 transition-colors
      `}>
        <div className={`text-4xl sm:text-5xl drop-shadow-xl transition-transform duration-300 ${isSelected ? 'scale-110' : ''} group-hover:scale-110`}>
          {spell.emoji}
        </div>
      </div>

      {/* Card Text */}
      <div className="text-center w-full z-10">
        <h3 className={`font-wizard font-bold text-[10px] sm:text-xs uppercase tracking-wider ${spell.color} truncate`}>
          {spell.name}
        </h3>
        {!isSmall && (
          <div className="mt-1 text-[8px] text-gray-500 font-tech uppercase tracking-wide border-t border-white/5 pt-1">
            Beats {spell.beats} · Damage {spell.damage ?? 1}
          </div>
        )}
      </div>
      
      {/* Active Glow Effect */}
      {isSelected && (
        <div className="absolute inset-0 rounded-lg border-2 border-white/20 animate-pulse pointer-events-none" />
      )}
    </button>
  );
};
