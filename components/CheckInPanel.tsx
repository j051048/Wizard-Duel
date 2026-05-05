/**
 * CheckInPanel - 每日签到面板
 * 显示7天签到奖励和连续签到进度
 */

import React, { useState } from 'react';
import { X, Gift, Flame, CheckCircle } from 'lucide-react';
import { CheckInService } from '../services/CheckInService';

interface CheckInPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (gems: number) => void;
}

const CheckInPanel: React.FC<CheckInPanelProps> = ({ isOpen, onClose, onClaim }) => {
  const [state, setState] = useState(() => CheckInService.getState());
  const [justClaimed, setJustClaimed] = useState(false);
  const rewards = CheckInService.getRewards();

  if (!isOpen) return null;

  const handleCheckIn = () => {
    const result = CheckInService.checkIn();
    if (result.success) {
      setJustClaimed(true);
      setState(CheckInService.getState());
      onClaim(result.gems);
      setTimeout(() => setJustClaimed(false), 2000);
    }
  };

  const canCheckIn = CheckInService.canCheckIn();
  const currentWeekDay = state.streak > 0 ? ((state.streak - 1) % 7) : 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-purple-500/30 w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600/20 to-amber-600/20 p-5 border-b border-white/5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Gift size={24} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">每日签到</h3>
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Flame size={14} className="text-orange-400" />
                连续签到 {state.streak} 天
              </p>
            </div>
          </div>
        </div>

        {/* Reward Grid */}
        <div className="p-5">
          <div className="grid grid-cols-7 gap-2 mb-5">
            {rewards.map((reward, idx) => {
              const isClaimed = state.claimedRewards.includes(idx);
              const isCurrent = canCheckIn && idx === currentWeekDay;
              const isNext = !canCheckIn && idx === (currentWeekDay + 1) % 7;

              return (
                <div
                  key={reward.day}
                  className={`
                    relative flex flex-col items-center p-2 rounded-xl text-center transition-all
                    ${isClaimed
                      ? 'bg-green-500/10 border border-green-500/30'
                      : isCurrent
                        ? 'bg-purple-500/20 border-2 border-purple-500/50 animate-pulse shadow-lg shadow-purple-500/20'
                        : 'bg-slate-800/50 border border-white/5 opacity-60'
                    }
                  `}
                >
                  <span className="text-lg mb-0.5">{reward.icon}</span>
                  <span className="text-[10px] font-bold text-gray-400">{reward.label}</span>
                  <span className={`text-xs font-mono font-bold mt-0.5 ${isClaimed ? 'text-green-400' : isCurrent ? 'text-purple-300' : 'text-gray-500'}`}>
                    +{reward.gems}
                  </span>
                  {isClaimed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                      <CheckCircle size={16} className="text-green-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Check-in Button */}
          <button
            onClick={handleCheckIn}
            disabled={!canCheckIn}
            className={`
              w-full py-3.5 rounded-xl font-bold text-base transition-all
              ${canCheckIn
                ? 'bg-gradient-to-r from-purple-600 to-amber-600 text-white hover:shadow-lg hover:shadow-purple-500/30 active:scale-95'
                : 'bg-slate-800 text-gray-500 cursor-not-allowed border border-white/5'
              }
              ${justClaimed ? 'scale-95' : ''}
            `}
          >
            {canCheckIn ? '签到领取奖励' : '今日已签到 ✓'}
          </button>

          {/* Total stats */}
          <p className="text-center text-xs text-gray-500 mt-3">
            累计签到 {state.totalCheckIns} 天
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckInPanel;
