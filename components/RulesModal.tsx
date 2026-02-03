import React from 'react';
import { X, BookOpen } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-gray-900 border border-purple-500/30 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-900/50 rounded-full">
            <BookOpen className="text-purple-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">玩法说明</h2>
        </div>

        <div className="space-y-6 text-gray-300 text-sm md:text-base">
          <section>
            <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
              <span>⚔️</span> 对决规则
            </h3>
            <p>双方初始 **30点生命值**。使用五元素法术相互攻击，生命值归零者判负。</p>
            <p className="mt-1">每回合根据法力值上限自然恢复法力（上限随回合增长），合理规划手牌与费用是取胜关键。</p>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
              <span>🔄</span> 元素克制
            </h3>
            <p className="mb-2">当双方使用的法术存在克制关系时，<span className="text-white font-bold bg-white/10 px-1 rounded">胜方造成伤害，败方法术失效</span>。</p>
            <div className="bg-black/40 p-3 rounded-lg border border-white/5 flex flex-wrap justify-center items-center gap-2 text-xs font-mono">
               <span className="text-red-400 font-bold">🔥 火</span> 
               <span className="text-gray-600">&gt;</span>
               <span className="text-green-400 font-bold">🌿 草</span> 
               <span className="text-gray-600">&gt;</span>
               <span className="text-cyan-400 font-bold">❄️ 冰</span> 
               <span className="text-gray-600">&gt;</span>
               <span className="text-yellow-400 font-bold">⚡ 雷</span> 
               <span className="text-gray-600">&gt;</span>
               <span className="text-stone-400 font-bold">🪨 土</span> 
               <span className="text-gray-600">&gt;</span>
               <span className="text-red-400 font-bold">🔥 火</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">（若无克制关系或双方使用同种法术，则进入拼刀判定，通常相互抵消或造成基础伤害）</p>
          </section>

          <section>
            <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
              <span>✨</span> 特殊机制
            </h3>
            <ul className="space-y-2 list-none text-xs md:text-sm">
                <li className="flex gap-2">
                    <span className="text-red-400 font-bold min-w-[60px]">灼烧 Burn:</span>
                    <span>持续受到回合结束时的伤害。</span>
                </li>
                <li className="flex gap-2">
                    <span className="text-green-400 font-bold min-w-[60px]">缠绕 Tangle:</span>
                    <span>下一张法术费用增加(Cost+2)。</span>
                </li>
                <li className="flex gap-2">
                    <span className="text-cyan-400 font-bold min-w-[60px]">冻结 Freeze:</span>
                    <span>跳过下回合的攻击（仍可防御）。</span>
                </li>
                <li className="flex gap-2">
                    <span className="text-yellow-400 font-bold min-w-[60px]">充能 Charge:</span>
                    <span>连续使用闪电系法术伤害翻倍。</span>
                </li>
                <li className="flex gap-2">
                    <span className="text-stone-400 font-bold min-w-[60px]">坚韧 Fortify:</span>
                    <span>获得护甲，抵挡受到的伤害。</span>
                </li>
            </ul>
          </section>
          
           <section>
            <h3 className="text-gray-400 font-bold mb-2 flex items-center gap-2">
              <span>🏳️</span> 断牌/跳过
            </h3>
            <p>当手牌耗尽或法力不足以支付任何手牌时，可选择 <span className="text-white border border-gray-600 px-1 rounded text-xs">跳过回合</span>。这将无法造成伤害，但可保留法力用于下回合。</p>
          </section>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10 flex justify-center">
            <button 
                onClick={onClose}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-purple-500/25 active:scale-95"
            >
                我明白了，开始决斗！
            </button>
        </div>

      </div>
    </div>
  );
};
