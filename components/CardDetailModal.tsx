import React, { useEffect } from 'react';
import { Spell } from '../types';
import { X, Sparkles, Shield, Zap, Skull, Droplet, Wind, Mountain, Layers } from 'lucide-react';
import { getElementColors, getMechanicName } from '../constants';

interface CardDetailModalProps {
  spell: Spell;
  onClose: () => void;
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({ spell, onClose }) => {
  const colors = getElementColors(spell.id);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const getElementIcon = (id: string, size = 20): React.ReactNode => {
    if (id.startsWith('fire')) return <Zap size={size} className="text-orange-400" />;
    if (id.startsWith('ice')) return <Droplet size={size} className="text-cyan-400" />;
    if (id.startsWith('vine')) return <Layers size={size} className="text-green-400" />;
    if (id.startsWith('thunder')) return <Wind size={size} className="text-yellow-400" />;
    if (id.startsWith('rock')) return <Mountain size={size} className="text-stone-400" />;
    if (id === 'draw' || id === 'aoe' || id === 'silence' || id === 'healing') return <Sparkles size={size} className="text-purple-400" />;
    return <Sparkles size={size} className="text-white" />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border-2 ${colors.border}`}>
        {/* Card Header Background */}
        <div className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${spell.color.replace('text-', 'from-').replace('-500', '-900/80')} to-slate-950 -z-10`} />

        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/80 hover:text-white transition-colors z-20"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center pt-8 pb-6 px-6 bg-slate-950/90 mt-20">
          {/* Large Card Preview */}
          <div className="relative mb-6 transform scale-125 origin-bottom">
             <div className={`
                w-48 h-72 rounded-xl relative overflow-hidden transition-all duration-300
                border-[3px] ${colors.border} shadow-[0_0_30px_-5px_var(--shadow-color)]
                bg-slate-900 group
             `} style={{ '--shadow-color': colors.shadow } as React.CSSProperties}>
                 {/* Art */}
                 <div className="absolute inset-0 z-0">
                    <img
                        src={spell.artSrc || `https://via.placeholder.com/300x400?text=${spell.name}`}
                        alt={spell.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90" />
                 </div>

                 {/* Mana Cost */}
                <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center shadow-lg z-20">
                    <span className="text-lg font-bold text-white font-tech">{spell.manaCost}</span>
                </div>

                {/* Name */}
                <div className="absolute top-2 right-2 left-12 text-right z-20">
                     <h3 className={`font-wizard font-bold text-lg drop-shadow-md ${colors.text} truncate`}>{spell.name}</h3>
                </div>

                {/* Description Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-slate-900/90 border-t border-white/10 z-20">
                     <p className="text-xs text-center text-gray-200 leading-relaxed font-tech">
                         {spell.description}
                     </p>
                </div>
             </div>
          </div>

          {/* Stats Grid */}
          <div className="w-full grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">类型</div>
                  <div className={`font-wizard font-bold flex items-center gap-1 ${colors.text}`}>
                     {getElementIcon(spell.id, 16)}
                     {getMechanicName(spell.mechanic)}
                  </div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">稀有度</div>
                  <div className={`font-wizard font-bold capitalize ${
                      spell.rarity === 'mythic' ? 'text-amber-400' :
                      spell.rarity === 'rare' ? 'text-purple-400' : 'text-gray-300'
                  }`}>
                      {spell.rarity === 'mythic' ? '传说' : spell.rarity === 'rare' ? '稀有' : '普通'}
                  </div>
              </div>
          </div>

          {/* Full Description & Lore */}
          <div className="w-full space-y-4 text-center">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {spell.description}
                </p>
                {spell.damage > 0 && (
                     <div className="mt-2 text-xs font-mono text-red-400 flex items-center justify-center gap-1">
                       <Skull size={12} /> 基础伤害: {spell.damage}
                     </div>
                )}
                {spell.armorGain && spell.armorGain > 0 && (
                     <div className="mt-2 text-xs font-mono text-blue-400 flex items-center justify-center gap-1">
                       <Shield size={12} /> 获得护甲: {spell.armorGain}
                     </div>
                )}
              </div>

              {/* Flavor Text (Mock) */}
              <p className="text-xs text-gray-500 italic font-serif px-4">
                "{spell.name} 蕴含着古老的元素之力，只有最强大的法师才能驾驭它的全部潜能。"
              </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CardDetailModal;
