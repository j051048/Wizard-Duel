import React from 'react';
import { BET_OPTIONS } from '../../constants';

interface WagerSelectorProps {
  selectedBet: number;
  balance: number;
  onSelectBet: (bet: number) => void;
  t: (key: string) => string;
}

const WagerSelector: React.FC<WagerSelectorProps> = ({
  selectedBet,
  balance,
  onSelectBet,
  t
}) => {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
       <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">{t('Select Wager')}</span>
       <div className="flex gap-4 md:gap-8 justify-center w-full">
          {BET_OPTIONS.map((amt) => {
             const isSelected = selectedBet === amt;
             const isDisabled = balance < amt;
             return (
                <button
                   key={amt}
                   onClick={() => onSelectBet(amt)}
                   disabled={isDisabled}
                   className={`
                      relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 group
                      ${isSelected 
                         ? 'scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)] z-10' 
                         : 'scale-95 grayscale-[0.5] hover:grayscale-0 hover:scale-100'
                      }
                      ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer'}
                   `}
                >
                   {/* Chip Visual */}
                   <div className={`absolute inset-0 rounded-full border-4 ${isSelected ? 'border-amber-400 bg-purple-900' : 'border-slate-600 bg-slate-900'}`}></div>
                   <div className="absolute inset-1 rounded-full border border-dashed border-white/20"></div>
                   
                   <span className={`relative z-10 font-black text-lg md:text-xl font-mono ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {amt}
                   </span>
                   {isSelected && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_10px_orange]"></div>}
                </button>
             );
          })}
       </div>
    </div>
  );
};

export default WagerSelector;
