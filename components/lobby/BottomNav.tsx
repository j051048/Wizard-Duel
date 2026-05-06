import React from 'react';
import { Home, ShoppingBag, BookOpen, User } from 'lucide-react';
import type { GameState } from '../../types/ui';

interface BottomNavProps {
  current: GameState;
  onNavigate: (state: GameState) => void;
  t: (key: string) => string;
}

const TABS: { key: GameState; label: string; icon: React.ElementType }[] = [
  { key: 'LOBBY',       label: 'Home',       icon: Home },
  { key: 'SHOP',        label: 'Shop',       icon: ShoppingBag },
  { key: 'COLLECTION',  label: 'Collection', icon: BookOpen },
  { key: 'PROFILE',     label: 'Profile',    icon: User },
];

export const BottomNav: React.FC<BottomNavProps> = ({ current, onNavigate, t }) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 backdrop-blur border-t border-white/5 safe-area-bottom" role="navigation" aria-label="Main navigation">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = current === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onNavigate(tab.key)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${
                active
                  ? 'text-purple-400 scale-105'
                  : 'text-gray-500 hover:text-gray-300 active:scale-95'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-purple-400' : ''}`}>
                {t(tab.label)}
              </span>
              {active && <div className="absolute bottom-0 w-6 h-0.5 bg-purple-400 rounded-full" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
