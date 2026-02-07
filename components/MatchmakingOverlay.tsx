import React, { useState, useEffect } from 'react';
import { Loader2, Swords, X, User, Zap } from 'lucide-react';
import { matchmaking, OnlineUser } from '../services/matchmaking';

interface MatchmakingOverlayProps {
  userId: string;
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onMatchFound: (roomId: string, opponent: OnlineUser) => void;
}

export const MatchmakingOverlay: React.FC<MatchmakingOverlayProps> = ({
  userId,
  username,
  isOpen,
  onClose,
  onMatchFound
}) => {
  const [status, setStatus] = useState<'idle' | 'searching' | 'found'>('idle');
  const [timer, setTimer] = useState(0);
  const [matchedOpponent, setMatchedOpponent] = useState<OnlineUser | null>(null);

  useEffect(() => {
    let interval: any;
    if (status === 'searching') {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (isOpen) {
      handleStartSearch();
    } else {
      handleCancel();
    }
  }, [isOpen]);

  const handleStartSearch = async () => {
    setStatus('searching');
    await matchmaking.init(userId, username);
    
    // 开始寻找对手
    matchmaking.startSeeking(({ roomId, opponent }) => {
      setMatchedOpponent(opponent);
      setStatus('found');
      
      // 延迟 2 秒后进入对战
      setTimeout(() => {
        onMatchFound(roomId, opponent);
      }, 2000);
    });
  };

  const handleCancel = () => {
    matchmaking.updateStatus('online');
    setStatus('idle');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-sm p-8 bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.2)] flex flex-col items-center">
        
        {/* Cancel Button */}
        {status !== 'found' && (
          <button 
            onClick={handleCancel}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}

        {status === 'searching' ? (
          <>
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Swords size={32} className="text-purple-400 animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-wizard text-white mb-2">正在匹配对手...</h2>
            <p className="text-slate-400 text-sm mb-6 font-mono">已等待 {timer}s</p>
            
            <div className="w-full space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <User size={20} className="text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{username}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">当前玩家</div>
                </div>
              </div>
              <div className="flex justify-center">
                <span className="text-xs text-slate-600 font-bold italic">VS</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 border-dashed opacity-50">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                  <Loader2 size={20} className="text-slate-600 animate-spin" />
                </div>
                <div className="text-sm font-bold text-slate-600">寻找中...</div>
              </div>
            </div>
          </>
        ) : status === 'found' ? (
          <>
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-8 border-4 border-green-500/50 animate-bounce">
              <Zap size={48} className="text-green-400 fill-green-400" />
            </div>

            <h2 className="text-2xl font-wizard text-white mb-2">找到对手！</h2>
            <p className="text-green-400 text-sm mb-6 animate-pulse font-bold">准备进入对战厅</p>

            <div className="w-full p-4 bg-green-500/10 rounded-2xl border border-green-500/30 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-xl">
                🧙‍♂️
              </div>
              <div>
                <div className="text-lg font-bold text-white">{matchedOpponent?.username}</div>
                <div className="text-xs text-green-400/70">等级 10 · 元素领主</div>
              </div>
            </div>
          </>
        ) : null}

        <button 
           onClick={handleCancel}
           className="mt-8 text-xs text-slate-500 hover:text-red-400 font-bold uppercase tracking-widest transition-colors"
        >
          取消匹配
        </button>
      </div>
    </div>
  );
};
