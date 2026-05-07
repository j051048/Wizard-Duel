import React from 'react';
import { Crown, Zap, Sparkles, Skull, Swords, TowerControl, Beer } from 'lucide-react';
import { GameMode } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTranslation } from '../i18n';

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onBackToLobby: () => void;
}

const ModeCard: React.FC<{
  onClick: () => void;
  gradient: string;
  borderColor: string;
  hoverBorder: string;
  glowClass?: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  titleColor: string;
  description: string;
  tags: { icon: React.ReactNode; text: string; color: string }[];
  badge?: { text: string; bg: string; border: string };
  isMobile: boolean;
}> = ({ onClick, gradient, borderColor, glowClass, icon, iconBg, title, titleColor, description, tags, badge, isMobile }) => (
  <div
    onClick={onClick}
    className={`group relative ${gradient} border ${borderColor} rounded-2xl p-3 md:p-4 cursor-pointer hover:border-opacity-70 transition-all duration-300 active:scale-95 ${glowClass || ''}`}
  >
    <div className="relative z-10 flex flex-col h-full">
      <div className="flex items-center justify-center mb-3">
        <div className={`w-10 h-10 md:w-12 md:h-12 ${iconBg} rounded-full flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
      </div>
      <h3 className={`text-base md:text-lg font-bold text-center mb-1 md:mb-2 ${titleColor} font-wizard`}>
        {title}
      </h3>
      <p className="text-gray-400 text-center mb-3 text-[10px] md:text-xs leading-relaxed flex-1 line-clamp-2">
        {description}
      </p>
      <div className={`space-y-1 text-[9px] md:text-[10px] text-gray-500 ${isMobile ? 'flex flex-row justify-center gap-3 space-y-0' : ''}`}>
        {tags.map((tag, i) => (
          <div key={i} className="flex items-center gap-1">
            {tag.icon}
            <span>{tag.text}</span>
          </div>
        ))}
      </div>
      {badge && (
        <div className={`mt-2 py-1 ${badge.bg} rounded-lg text-center border ${badge.border}`}>
          <span className="text-[9px] font-black uppercase tracking-widest">{badge.text}</span>
        </div>
      )}
    </div>
  </div>
);

export const ModeSelect: React.FC<ModeSelectProps> = ({ onSelectMode, onBackToLobby }) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  return (
    <div className={`min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950`}>
      <div className={`text-center ${isMobile ? 'mb-4 mt-4' : 'mb-8'}`}>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-wizard font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-widest`}>
          {t('Select Game Mode')}
        </h1>
        <p className={`${isMobile ? 'text-xs' : 'text-lg'} text-gray-400 uppercase tracking-tighter`}>
          {t('Choose the experience for you')}
        </p>
      </div>

      {/* Row 1: Original 3 modes */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-3 md:gap-4 max-w-6xl w-full mb-4`}>
        <ModeCard
          onClick={() => onSelectMode('standard')}
          gradient="bg-gradient-to-br from-blue-600/20 to-purple-600/20"
          borderColor="border-blue-500/30"
          hoverBorder="hover:border-blue-400/50"
          icon={<Crown size={isMobile ? 20 : 24} className="text-white" />}
          iconBg="bg-gradient-to-br from-blue-500 to-purple-600"
          title={t('Standard Mode')}
          titleColor="text-blue-400"
          description={t('Primary competitive experience. Balanced card pool.')}
          tags={[
            { icon: <Sparkles size={9} className="text-green-400" />, text: t('Core Balanced Mode'), color: 'text-green-400' },
            { icon: <Sparkles size={9} className="text-green-400" />, text: t('Fair Match'), color: 'text-green-400' },
          ]}
          isMobile={isMobile}
        />

        <ModeCard
          onClick={() => onSelectMode('dungeon')}
          gradient="bg-gradient-to-br from-purple-600/30 to-indigo-900/40"
          borderColor="border-purple-500/50"
          hoverBorder="hover:border-purple-400"
          glowClass="shadow-[0_0_20px_rgba(139,92,246,0.2)]"
          icon={<Skull size={isMobile ? 24 : 28} className="text-white" />}
          iconBg="bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-800"
          title={t('Dungeon Adventure')}
          titleColor="text-purple-300"
          description={t('Roguelike Exploration') + ' · ' + t('Acquire Legendary Artifacts')}
          tags={[
            { icon: <Sparkles size={9} className="text-purple-400" />, text: t('Roguelike Exploration'), color: 'text-purple-400' },
            { icon: <Sparkles size={9} className="text-purple-400" />, text: t('Build Relics Progressively'), color: 'text-purple-400' },
          ]}
          badge={{ text: t('Solo Challenge'), bg: 'bg-purple-500/20', border: 'border-purple-500/30' }}
          isMobile={isMobile}
        />

        <ModeCard
          onClick={() => onSelectMode('wild')}
          gradient="bg-gradient-to-br from-orange-600/20 to-red-600/20"
          borderColor="border-orange-500/30"
          hoverBorder="hover:border-orange-400/50"
          icon={<Zap size={isMobile ? 20 : 24} className="text-white" />}
          iconBg="bg-gradient-to-br from-orange-500 to-red-600"
          title={t('Wild Mode')}
          titleColor="text-orange-400"
          description={t('Wild Mode Desc')}
          tags={[
            { icon: <Sparkles size={9} className="text-yellow-400" />, text: t('All Cards Unlocked'), color: 'text-yellow-400' },
            { icon: <Sparkles size={9} className="text-yellow-400" />, text: t('Fun Builds'), color: 'text-yellow-400' },
          ]}
          isMobile={isMobile}
        />
      </div>

      {/* Row 2: New 3 modes */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-3 md:gap-4 max-w-6xl w-full mb-6`}>
        <ModeCard
          onClick={() => onSelectMode('arena')}
          gradient="bg-gradient-to-br from-amber-600/20 to-yellow-600/20"
          borderColor="border-amber-500/30"
          hoverBorder="hover:border-amber-400/50"
          glowClass="shadow-[0_0_15px_rgba(245,158,11,0.15)]"
          icon={<Swords size={isMobile ? 20 : 24} className="text-white" />}
          iconBg="bg-gradient-to-br from-amber-500 to-yellow-600"
          title="竞技场"
          titleColor="text-amber-400"
          description="随机选牌，构筑临时牌组。12胜或3负结算。150金币入场。"
          tags={[
            { icon: <Sparkles size={9} className="text-amber-400" />, text: 'Draft 选牌', color: 'text-amber-400' },
            { icon: <Sparkles size={9} className="text-amber-400" />, text: '高风险高回报', color: 'text-amber-400' },
          ]}
          badge={{ text: '竞技模式', bg: 'bg-amber-500/20', border: 'border-amber-500/30' }}
          isMobile={isMobile}
        />

        <ModeCard
          onClick={() => onSelectMode('tavern_brawl')}
          gradient="bg-gradient-to-br from-red-800/20 to-orange-700/20"
          borderColor="border-red-500/30"
          hoverBorder="hover:border-red-400/50"
          glowClass="shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          icon={<Beer size={isMobile ? 20 : 24} className="text-white" />}
          iconBg="bg-gradient-to-br from-red-600 to-orange-500"
          title="酒馆乱斗"
          titleColor="text-red-400"
          description="每周不同特殊规则！首胜奖励卡包。免费参与。"
          tags={[
            { icon: <Sparkles size={9} className="text-red-400" />, text: '每周轮换', color: 'text-red-400' },
            { icon: <Sparkles size={9} className="text-red-400" />, text: '趣味规则', color: 'text-red-400' },
          ]}
          badge={{ text: '限时活动', bg: 'bg-red-500/20', border: 'border-red-500/30' }}
          isMobile={isMobile}
        />

        <ModeCard
          onClick={() => onSelectMode('endless_tower')}
          gradient="bg-gradient-to-br from-violet-700/20 to-indigo-800/20"
          borderColor="border-violet-500/30"
          hoverBorder="hover:border-violet-400/50"
          glowClass="shadow-[0_0_15px_rgba(139,92,246,0.15)]"
          icon={<TowerControl size={isMobile ? 20 : 24} className="text-white" />}
          iconBg="bg-gradient-to-br from-violet-600 to-indigo-700"
          title="无尽之塔"
          titleColor="text-violet-400"
          description="Roguelike 爬塔挑战。逐层递增难度，收集遗物强化。"
          tags={[
            { icon: <Sparkles size={9} className="text-violet-400" />, text: 'Roguelike', color: 'text-violet-400' },
            { icon: <Sparkles size={9} className="text-violet-400" />, text: '遗物收集', color: 'text-violet-400' },
          ]}
          badge={{ text: '单人挑战', bg: 'bg-violet-500/20', border: 'border-violet-500/30' }}
          isMobile={isMobile}
        />
      </div>

      <button
        onClick={onBackToLobby}
        className={`${isMobile ? 'w-full py-4' : 'px-8 py-3'} bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10 active:scale-95`}
      >
        {t('Return to Magic Hall')}
      </button>

      {isMobile && <div className="h-6 w-full" />}
    </div>
  );
};