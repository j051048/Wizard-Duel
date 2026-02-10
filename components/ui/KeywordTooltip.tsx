/**
 * KeywordTooltip - 关键字提示系统
 * 
 * [P2 Fix #17] 在卡牌描述中高亮关键字，悬停/点击显示解释。
 * 类似炉石的关键字 tooltip。
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface KeywordDef {
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const KEYWORD_DATABASE: Record<string, KeywordDef> = {
  '灼烧': {
    name: '灼烧',
    description: '在每个回合结束时造成持续伤害，持续数个回合。',
    icon: '🔥',
    color: 'text-orange-400',
  },
  '冻结': {
    name: '冻结',
    description: '使目标无法在下一个回合行动（跳过出牌阶段）。',
    icon: '❄️',
    color: 'text-cyan-300',
  },
  '缠绕': {
    name: '缠绕',
    description: '使目标下一张牌的法力消耗增加。',
    icon: '🌿',
    color: 'text-green-400',
  },
  '充能': {
    name: '充能',
    description: '连续使用同元素法术可触发连击加成，伤害逐次递增。',
    icon: '⚡',
    color: 'text-yellow-400',
  },
  '坚韧': {
    name: '坚韧',
    description: '获得护甲值。护甲优先于生命值吸收伤害。',
    icon: '🛡️',
    color: 'text-stone-300',
  },
  '亡语': {
    name: '亡语',
    description: '随从死亡时触发的特殊效果。',
    icon: '💀',
    color: 'text-purple-400',
  },
  '嘲讽': {
    name: '嘲讽',
    description: '敌方随从必须优先攻击拥有嘲讽的随从。',
    icon: '🛡️',
    color: 'text-amber-400',
  },
  '沉默': {
    name: '沉默',
    description: '移除目标身上的所有增益和减益效果。',
    icon: '🤫',
    color: 'text-gray-400',
  },
  '疲劳': {
    name: '疲劳',
    description: '牌库抽空后，每次抽牌改为受到递增的伤害（1,2,3...）。',
    icon: '😵',
    color: 'text-red-400',
  },
  '克制': {
    name: '克制',
    description: '元素相克：火克草、草克冰、冰克雷、雷克岩、岩克火。被克制时伤害翻倍。',
    icon: '🌊',
    color: 'text-blue-400',
  },
  '幸运币': {
    name: '幸运币',
    description: '后手补偿卡牌。0费使用，获得1点临时法力水晶。',
    icon: '🪙',
    color: 'text-yellow-400',
  },
};

interface KeywordTooltipProps {
  keyword: string;
  children?: React.ReactNode;
}

export const KeywordTooltip: React.FC<KeywordTooltipProps> = ({ keyword, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const def = KEYWORD_DATABASE[keyword];
  
  if (!def) return <span>{children || keyword}</span>;

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen(prev => !prev)}
    >
      <span className={`font-bold underline decoration-dotted cursor-help ${def.color}`}>
        {children || keyword}
      </span>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 z-[300] pointer-events-none"
          >
            <div className="bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-lg p-3 shadow-2xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{def.icon}</span>
                <span className={`font-bold text-sm ${def.color}`}>{def.name}</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{def.description}</p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-900 border-r border-b border-white/20 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

/**
 * 解析文本中的关键字并替换为 Tooltip 组件
 */
export function parseKeywords(text: string): React.ReactNode[] {
  const keywords = Object.keys(KEYWORD_DATABASE);
  const regex = new RegExp(`(${keywords.join('|')})`, 'g');
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    if (KEYWORD_DATABASE[part]) {
      return <KeywordTooltip key={i} keyword={part} />;
    }
    return <span key={i}>{part}</span>;
  });
}

export default KeywordTooltip;