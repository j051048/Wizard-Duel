/**
 * TutorialModal - 新手教学引导组件
 *
 * 显示关键词解释和操作提示
 */

import React, { useState } from 'react';
import { X, BookOpen, Zap, Shield, Flame, Leaf, Snowflake, Hammer } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentTab, setCurrentTab] = useState<'basics' | 'mechanics' | 'strategy'>('basics');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-purple-500/30 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <BookOpen className="text-purple-400" size={24} />
            <h2 className="text-2xl font-bold text-white">游戏教程</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'basics', label: '基础规则', icon: Zap },
            { id: 'mechanics', label: '关键词机制', icon: Shield },
            { id: 'strategy', label: '策略指南', icon: Hammer }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentTab(id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                currentTab === id
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {currentTab === 'basics' && (
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">🎯 游戏目标</h3>
                <p>将对手的生命值降至0。首先达到30点生命值的玩家获胜。</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">⚡ 回合流程</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>每回合开始时，抽1张牌</li>
                  <li>法力水晶上限+1（最高10）</li>
                  <li>轮流出牌或跳过回合</li>
                  <li>当一方生命值≤0时，游戏结束</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">🛡️ 护甲系统</h3>
                <p>护甲优先承受伤害。护甲可以无限叠加，但伤害会先扣除护甲再扣血。</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">🔄 克制关系</h3>
                <p className="mb-2">五元素相生相克：</p>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="bg-red-500/20 p-2 rounded">🔥火克🌿木</div>
                  <div className="bg-green-500/20 p-2 rounded">🌿木克❄️冰</div>
                  <div className="bg-cyan-500/20 p-2 rounded">❄️冰克⚡雷</div>
                  <div className="bg-yellow-500/20 p-2 rounded">⚡雷克🪨石</div>
                  <div className="bg-stone-500/20 p-2 rounded">🪨石克🔥火</div>
                </div>
                <p className="mt-2">克制时伤害+50%！</p>
              </div>
            </div>
          )}

          {currentTab === 'mechanics' && (
            <div className="space-y-4 text-gray-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-500/10 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="text-red-400" size={20} />
                    <h4 className="font-bold text-white">🔥 灼烧 (Burn)</h4>
                  </div>
                  <p>获胜后，对手下回合额外受到燃烧伤害。</p>
                </div>

                <div className="bg-green-500/10 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="text-green-400" size={20} />
                    <h4 className="font-bold text-white">🌿 缠绕 (Tangle)</h4>
                  </div>
                  <p>获胜后，对手下一张法术费用增加。</p>
                </div>

                <div className="bg-cyan-500/10 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Snowflake className="text-cyan-400" size={20} />
                    <h4 className="font-bold text-white">❄️ 冻结 (Freeze)</h4>
                  </div>
                  <p>平局或胜利时，冻结对手下回合行动。</p>
                </div>

                <div className="bg-yellow-500/10 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="text-yellow-400" size={20} />
                    <h4 className="font-bold text-white">⚡ 充能 (Charge)</h4>
                  </div>
                  <p>连续使用雷系法术时，伤害增加50%。</p>
                </div>

                <div className="bg-stone-500/10 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="text-stone-400" size={20} />
                    <h4 className="font-bold text-white">🛡️ 坚韧 (Fortify)</h4>
                  </div>
                  <p>获得护甲，优先承受伤害。</p>
                </div>

                <div className="bg-blue-500/10 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-blue-400">💙</div>
                    <h4 className="font-bold text-white">💙 治疗 (Heal)</h4>
                  </div>
                  <p>恢复生命值。</p>
                </div>

                <div className="bg-purple-500/10 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-purple-400">💥</div>
                    <h4 className="font-bold text-white">💥 AOE</h4>
                  </div>
                  <p>造成基础伤害 + 额外伤害（无视护甲）。</p>
                </div>

                <div className="bg-indigo-500/10 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-indigo-400">📚</div>
                    <h4 className="font-bold text-white">📚 抽牌 (Draw)</h4>
                  </div>
                  <p>从牌库抽取卡牌。</p>
                </div>

                <div className="bg-gray-500/10 p-4 rounded-lg col-span-full">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-gray-400">🤫</div>
                    <h4 className="font-bold text-white">🤫 沉默 (Silence)</h4>
                  </div>
                  <p>移除对手所有状态效果。</p>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'strategy' && (
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">🏆 胜利策略</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>快攻：</strong>前期使用低费高效卡牌，快速积累优势</li>
                  <li><strong>控制：</strong>利用冻结、缠绕等机制限制对手节奏</li>
                  <li><strong>防御：</strong>前期叠加护甲，后期使用高伤终结技</li>
                  <li><strong>连击：</strong>连续使用雷系法术触发充能机制</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">💡 实用技巧</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>注意五元素克制关系，选择合适的应对卡牌</li>
                  <li>护甲是你的朋友，优先使用防御卡牌</li>
                  <li>观察对手上回合使用的卡牌，预测其策略</li>
                  <li>合理使用跳过回合来保存资源或等待更好时机</li>
                  <li>前期手牌管理很重要，避免过早打出关键卡牌</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">🎯 牌组构筑</h3>
                <p>标准牌组需要25-30张卡牌，包含各种费用和机制的平衡组合。尝试不同的元素搭配，找到适合自己的玩法风格！</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors"
          >
            开始游戏
          </button>
        </div>
      </div>
    </div>
  );
};