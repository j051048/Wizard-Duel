import React from 'react';
import { Sparkles } from 'lucide-react';
import { Deck } from '../../types';

interface PlayButtonProps {
  canStart: boolean;
  selectedDeck: Deck | null;
  selectedBet: number;
  onStartDuel: () => void;
  t: (key: string) => string;
}

import { useIsMobile } from '../../hooks/useIsMobile';

const PlayButton: React.FC<PlayButtonProps> = ({
  canStart,
  selectedDeck,
  selectedBet,
  onStartDuel,
  t
}) => {
  const isMobile = useIsMobile();
  return (
    <div id="lobby-play-btn" className="w-full mt-2 md:mt-4">
      <button
        onClick={onStartDuel}
        disabled={!canStart || !selectedDeck}
        className={`
          w-full relative group ${isMobile ? 'h-14' : 'h-16 md:h-20'} rounded-full flex items-center justify-center overflow-hidden transition-all duration-500
          ${canStart && selectedDeck
            ? 'breathe-glow hover:shadow-[0_0_60px_rgba(147,51,234,0.7)] hover:scale-[1.02]'
            : 'bg-gray-900 border border-white/5 cursor-not-allowed opacity-50'
          }
        `}
      >
          {canStart && selectedDeck ? (
             <>
                {/* Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 animate-gradient-xy"></div>
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-full group-hover:animate-shimmer"></div>

                 {/* Text Content */}
                <div className="relative z-10 flex items-center gap-2 md:gap-3">
                   <Sparkles size={isMobile ? 18 : 24} className="text-yellow-300 animate-pulse" />
                   <span className={`${isMobile ? 'text-xl' : 'text-2xl md:text-3xl'} font-wizard font-bold text-white tracking-[0.1em] drop-shadow-md`}>
                      {t('ENTER ARENA')}
                   </span>
                   <Sparkles size={isMobile ? 18 : 24} className="text-yellow-300 animate-pulse" />
                </div>
             </>
          ) : (
             <span className={`font-mono text-gray-500 tracking-widest uppercase ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                {!selectedDeck ? t('Select a Deck') : t('Insufficient Funds')}
             </span>
          )}
      </button>
      <div className="text-center mt-2 md:mt-3 h-4">
         {canStart && selectedDeck && (
            <span className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} text-green-400 font-mono animate-pulse`}>
               {t('ESTIMATED REWARD')}: +{Math.floor(selectedBet * 0.92)} {t('PTS')}
            </span>
         )}
      </div>
    </div>
  );
};

export default PlayButton;
