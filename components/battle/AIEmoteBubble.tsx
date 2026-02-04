import React from 'react';
import { AIStatus, AIEmoteType } from '../../types';

interface AIEmoteBubbleProps {
  status: AIStatus;
}

const AIEmoteBubble: React.FC<AIEmoteBubbleProps> = ({ status }) => {
  if (!status.emote && !status.message) return null;
  
  const getEmoteIcon = (emote: AIEmoteType | null) => {
    switch (emote) {
      case 'thinking': return '🤔';
      case 'thinking_fast': return '💡';
      case 'laugh': return '😂';
      case 'angry': return '💢';
      case 'surprised': return '😲';
      case 'taunt': return '😏';
      default: return '💬';
    }
  };

  return (
    <div className="absolute -right-32 top-8 z-50 animate-bounce-slight pointer-events-none">
       <div className="relative bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-slate-300 shadow-xl max-w-[150px]">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getEmoteIcon(status.emote)}</span>
            <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
              {status.message}
            </p>
          </div>
          {/* 下标 */}
          <div className="absolute -left-2 top-4 w-4 h-4 bg-white/90 border-l-2 border-b-2 border-slate-300 rotate-45" />
       </div>
    </div>
  );
};

export default AIEmoteBubble;
