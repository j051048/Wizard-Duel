import React, { useEffect, useRef } from 'react';
import { ScrollText, X } from 'lucide-react';

interface CombatLogProps {
  isOpen: boolean;
  messages: string[];
  onClose: () => void;
}

const CombatLog: React.FC<CombatLogProps> = ({ isOpen, messages, onClose }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && logEndRef.current) {
        logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length]);

  return (
    <div className={`
      fixed left-0 top-0 bottom-0 w-64 md:w-80 bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-[100] transform transition-transform duration-300 ease-out shadow-2xl
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-amber-400 font-wizard uppercase tracking-widest text-sm">
              <ScrollText size={16} />
              <span>对战日志</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="h-[calc(100%-60px)] overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="text-white/20 text-xs text-center mt-10">暂无战斗记录</div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="flex gap-2 group animate-fade-in-up">
                  <div className="text-[10px] text-white/20 mt-1 font-mono">{(i+1).toString().padStart(2, '0')}</div>
                  <div className={`text-xs leading-relaxed ${msg.includes('玩家') ? 'text-blue-300' : msg.includes('对手') ? 'text-red-300' : 'text-gray-300'}`}>
                    {msg}
                  </div>
                </div>
              ))
            )}
            <div ref={logEndRef} />
        </div>
    </div>
  );
};

export default React.memo(CombatLog);
