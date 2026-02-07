/**
 * ProfileHeader - 用户头像和基本信息
 */

import React, { useState } from 'react';
import { Edit3, Check, X, Crown } from 'lucide-react';
import { Rank } from '../../types';

interface ProfileHeaderProps {
  displayName: string;
  userRank: Rank;
  rankScore: number;
  activeAddress: string | null;
  isGuest: boolean;
  rankStyle: { text: string; bg: string; border: string; glow: string };
  onUpdateName: (name: string) => void;
  isMobile: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  displayName,
  userRank,
  rankScore,
  activeAddress,
  isGuest,
  rankStyle,
  onUpdateName,
  isMobile
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed.length <= 20) {
      onUpdateName(trimmed);
      localStorage.setItem('wizard_display_name', trimmed);
      setIsEditingName(false);
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border ${rankStyle.border} ${rankStyle.glow}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-purple-900/20" />
      
      <div className="relative p-6 flex items-center gap-5">
        {/* 头像 */}
        <div className="relative flex-shrink-0">
          <div className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} rounded-full border-3 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.3)] overflow-hidden bg-black`}>
            <img src="/pwa-192x192.png" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className={`absolute -bottom-1 -right-1 ${rankStyle.bg} ${rankStyle.border} border rounded-full px-2 py-0.5`}>
            <span className={`text-[10px] font-black ${rankStyle.text}`}>Lv.{Math.floor(rankScore / 100) + 1}</span>
          </div>
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          {/* 昵称 */}
          <div className="flex items-center gap-2 mb-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={20}
                  className="bg-black/60 border border-purple-500/40 rounded-lg px-3 py-1.5 text-white text-sm font-bold focus:outline-none focus:border-purple-400 w-36"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="p-1.5 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-colors">
                  <Check size={14} className="text-green-400" />
                </button>
                <button onClick={() => { setIsEditingName(false); setNameInput(displayName); }} className="p-1.5 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors">
                  <X size={14} className="text-red-400" />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-wizard font-black text-white truncate">{displayName}</h2>
                <button onClick={() => setIsEditingName(true)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <Edit3 size={14} className="text-gray-400" />
                </button>
              </>
            )}
          </div>

          {/* 段位 */}
          <div className="flex items-center gap-2 mb-2">
            <Crown size={14} className={rankStyle.text} />
            <span className={`font-bold text-sm ${rankStyle.text}`}>{userRank}</span>
            <span className="text-gray-500 text-xs">|</span>
            <span className="text-gray-400 text-xs font-mono">{rankScore} PTS</span>
          </div>

          {/* 地址 */}
          {activeAddress && !isGuest && (
            <div className="text-[10px] text-gray-500 font-mono bg-black/40 rounded px-2 py-1 inline-block">
              {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
            </div>
          )}
          {isGuest && (
            <div className="text-[10px] text-amber-500/60 font-bold uppercase">游客模式</div>
          )}
        </div>
      </div>
    </div>
  );
};
