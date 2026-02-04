/**
 * ShopScreen - 商店页面
 * 卡包购买、礼包、首充等商业化入口
 */

import React, { useState } from 'react';
import { ArrowLeft, Package, Gift, Crown, Sparkles, Star, Zap, X } from 'lucide-react';
import { SpellCard } from './SpellCard';
import { openPack, PACK_CONFIG, SPELLS } from '../constants';
import { Spell } from '../types';
import { HapticService } from '../services/haptic';
import { useToastStore } from '../stores/useToastStore';

interface ShopScreenProps {
  balance: number;
  onBack: () => void;
  onUpdateBalance: (newBalance: number) => void;
  onAddCards?: (cards: Spell[]) => void;
}

interface PackType {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  glowColor: string;
  cardsCount: number;
  guaranteedRarity?: string;
}

const PACK_TYPES: PackType[] = [
  {
    id: 'standard',
    name: '元素卡包',
    description: '包含5张随机卡牌',
    price: 100,
    icon: <Package className="w-8 h-8" />,
    gradient: 'from-blue-600 to-indigo-700',
    borderColor: 'border-blue-500',
    glowColor: 'shadow-blue-500/30',
    cardsCount: 5
  },
  {
    id: 'premium',
    name: '黄金卡包',
    description: '保底1张稀有卡牌',
    price: 300,
    icon: <Crown className="w-8 h-8" />,
    gradient: 'from-yellow-500 to-amber-600',
    borderColor: 'border-yellow-500',
    glowColor: 'shadow-yellow-500/30',
    cardsCount: 5,
    guaranteedRarity: 'rare'
  },
  {
    id: 'legendary',
    name: '传说卡包',
    description: '保底1张传说卡牌',
    price: 1000,
    icon: <Sparkles className="w-8 h-8" />,
    gradient: 'from-purple-500 to-pink-600',
    borderColor: 'border-purple-500',
    glowColor: 'shadow-purple-500/30',
    cardsCount: 5,
    guaranteedRarity: 'mythic'
  }
];

interface BundleType {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  price: number;
  icon: React.ReactNode;
  gradient: string;
  items: string[];
  tag?: string;
  tagColor?: string;
}

const BUNDLES: BundleType[] = [
  {
    id: 'starter',
    name: '新手礼包',
    description: '开局必买，超值优惠',
    originalPrice: 500,
    price: 99,
    icon: <Gift className="w-8 h-8" />,
    gradient: 'from-green-500 to-emerald-600',
    items: ['3个元素卡包', '500法力值', '1张稀有卡牌'],
    tag: '限购1次',
    tagColor: 'bg-green-500'
  },
  {
    id: 'weekly',
    name: '周卡',
    description: '每日领取奖励，持续7天',
    originalPrice: 700,
    price: 299,
    icon: <Star className="w-8 h-8" />,
    gradient: 'from-orange-500 to-red-600',
    items: ['立即获得300法力', '每日50法力x7天', '1个黄金卡包'],
    tag: '超值',
    tagColor: 'bg-orange-500'
  },
  {
    id: 'monthly',
    name: '月卡',
    description: '每日领取奖励，持续30天',
    originalPrice: 3000,
    price: 999,
    icon: <Zap className="w-8 h-8" />,
    gradient: 'from-purple-600 to-indigo-700',
    items: ['立即获得1000法力', '每日100法力x30天', '3个传说卡包'],
    tag: '最划算',
    tagColor: 'bg-purple-500'
  }
];

export const ShopScreen: React.FC<ShopScreenProps> = ({
  balance,
  onBack,
  onUpdateBalance,
  onAddCards
}) => {
  const [activeTab, setActiveTab] = useState<'packs' | 'bundles' | 'currency'>('packs');
  const [openingPack, setOpeningPack] = useState<PackType | null>(null);
  const [revealedCards, setRevealedCards] = useState<Spell[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [pityCounter, setPityCounter] = useState({ rare: 0, mythic: 0, legendary: 0 });
  
  const toast = useToastStore();

  const handleBuyPack = (pack: PackType) => {
    if (balance < pack.price) {
      toast.error('法力不足', `需要 ${pack.price} 法力，当前只有 ${balance}`);
      HapticService.failure();
      return;
    }

    HapticService.medium();
    onUpdateBalance(balance - pack.price);
    
    // 生成卡包内容
    const { cards, newPity } = openPack(pityCounter);
    setPityCounter(newPity);
    
    // 如果是高级卡包，确保保底
    let finalCards = cards;
    if (pack.guaranteedRarity === 'rare' && !cards.some(c => c.rarity === 'rare' || c.rarity === 'mythic')) {
      const rareCards = SPELLS.filter(s => s.rarity === 'rare' && s.id !== 'skip');
      finalCards[0] = rareCards[Math.floor(Math.random() * rareCards.length)];
    }
    if (pack.guaranteedRarity === 'mythic' && !cards.some(c => c.rarity === 'mythic')) {
      const mythicCards = SPELLS.filter(s => s.rarity === 'mythic' && s.id !== 'skip');
      finalCards[0] = mythicCards[Math.floor(Math.random() * mythicCards.length)];
    }

    setRevealedCards(finalCards);
    setRevealIndex(0);
    setOpeningPack(pack);
    
    onAddCards?.(finalCards);
  };

  const handleRevealNext = () => {
    HapticService.light();
    if (revealIndex < revealedCards.length - 1) {
      setRevealIndex(prev => prev + 1);
    }
  };

  const handleCloseReveal = () => {
    setOpeningPack(null);
    setRevealedCards([]);
    setRevealIndex(0);
    toast.success('开包完成', `获得了 ${revealedCards.length} 张卡牌！`);
  };

  const handleBuyBundle = (bundle: BundleType) => {
    if (balance < bundle.price) {
      toast.error('法力不足', `需要 ${bundle.price} 法力`);
      HapticService.failure();
      return;
    }

    // 模拟购买
    HapticService.success();
    onUpdateBalance(balance - bundle.price + 500); // 假设礼包包含500法力
    toast.success('购买成功', `${bundle.name} 已添加到您的账户`);
  };

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* 背景 */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/30 via-slate-950 to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full" />
      </div>

      {/* 头部 */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-white/10 bg-black/20 backdrop-blur-md safe-area-top">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        
        <h1 className="text-xl font-wizard font-bold text-white">魔法商店</h1>
        
        <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-purple-500/30">
          <span className="text-purple-400 text-xs font-bold">💎</span>
          <span className="text-white font-mono font-bold">{balance}</span>
        </div>
      </header>

      {/* 标签页 */}
      <div className="relative z-10 flex border-b border-white/10 bg-black/20">
        {[
          { id: 'packs', label: '卡包', icon: <Package className="w-4 h-4" /> },
          { id: 'bundles', label: '礼包', icon: <Gift className="w-4 h-4" /> },
          { id: 'currency', label: '充值', icon: <Zap className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wider transition-all
              ${activeTab === tab.id 
                ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10' 
                : 'text-gray-500 hover:text-gray-300'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="relative z-10 p-4 pb-20 overflow-y-auto" style={{ height: 'calc(100vh - 140px)' }}>
        
        {/* 卡包页面 */}
        {activeTab === 'packs' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center mb-6">
              每个卡包包含5张卡牌，有几率开出稀有和传说卡牌
            </p>
            
            <div className="grid gap-4">
              {PACK_TYPES.map(pack => (
                <div
                  key={pack.id}
                  className={`
                    relative bg-slate-900/80 rounded-2xl border ${pack.borderColor}/30 p-4
                    hover:border-opacity-60 transition-all cursor-pointer group
                    shadow-lg ${pack.glowColor}
                  `}
                  onClick={() => handleBuyPack(pack)}
                >
                  <div className="flex items-center gap-4">
                    {/* 图标 */}
                    <div className={`
                      w-16 h-16 rounded-xl bg-gradient-to-br ${pack.gradient}
                      flex items-center justify-center text-white
                      shadow-lg group-hover:scale-110 transition-transform
                    `}>
                      {pack.icon}
                    </div>
                    
                    {/* 信息 */}
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">{pack.name}</h3>
                      <p className="text-gray-400 text-sm">{pack.description}</p>
                      {pack.guaranteedRarity && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                          保底{pack.guaranteedRarity === 'rare' ? '稀有' : '传说'}
                        </span>
                      )}
                    </div>
                    
                    {/* 价格 */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{pack.price}</div>
                      <div className="text-xs text-purple-400">法力</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 礼包页面 */}
        {activeTab === 'bundles' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center mb-6">
              限时超值礼包，错过不再有
            </p>
            
            <div className="grid gap-4">
              {BUNDLES.map(bundle => (
                <div
                  key={bundle.id}
                  className="relative bg-slate-900/80 rounded-2xl border border-white/10 p-4 overflow-hidden"
                >
                  {/* 标签 */}
                  {bundle.tag && (
                    <div className={`absolute top-0 right-0 ${bundle.tagColor} text-white text-xs font-bold px-3 py-1 rounded-bl-xl`}>
                      {bundle.tag}
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    {/* 图标 */}
                    <div className={`
                      w-16 h-16 rounded-xl bg-gradient-to-br ${bundle.gradient}
                      flex items-center justify-center text-white flex-shrink-0
                    `}>
                      {bundle.icon}
                    </div>
                    
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-lg">{bundle.name}</h3>
                      <p className="text-gray-400 text-sm mb-2">{bundle.description}</p>
                      
                      <ul className="space-y-1">
                        {bundle.items.map((item, i) => (
                          <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-green-400">✓</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* 价格 */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-gray-500 text-sm line-through">{bundle.originalPrice}</div>
                      <div className="text-2xl font-bold text-green-400">{bundle.price}</div>
                      <button
                        onClick={() => handleBuyBundle(bundle)}
                        className="mt-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white text-sm font-bold hover:scale-105 transition-transform"
                      >
                        购买
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 充值页面 */}
        {activeTab === 'currency' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center mb-6">
              充值法力值，解锁更多卡牌
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { amount: 100, price: '¥6', bonus: 0 },
                { amount: 500, price: '¥28', bonus: 50 },
                { amount: 1000, price: '¥50', bonus: 150 },
                { amount: 3000, price: '¥128', bonus: 600 },
                { amount: 5000, price: '¥198', bonus: 1200 },
                { amount: 10000, price: '¥388', bonus: 3000 }
              ].map(item => (
                <div
                  key={item.amount}
                  className="bg-slate-900/80 rounded-xl border border-white/10 p-4 text-center hover:border-purple-500/50 transition-all cursor-pointer"
                >
                  <div className="text-3xl mb-2">💎</div>
                  <div className="text-2xl font-bold text-white">{item.amount}</div>
                  {item.bonus > 0 && (
                    <div className="text-xs text-green-400">+{item.bonus} 赠送</div>
                  )}
                  <div className="mt-2 text-lg font-bold text-purple-400">{item.price}</div>
                </div>
              ))}
            </div>
            
            <p className="text-center text-gray-600 text-xs mt-4">
              充值功能开发中，敬请期待
            </p>
          </div>
        )}
      </div>

      {/* 开包动画弹窗 */}
      {openingPack && revealedCards.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
          <button
            onClick={handleCloseReveal}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <h2 className="text-2xl font-wizard font-bold text-white mb-2">
            {openingPack.name}
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            点击卡牌翻开 ({revealIndex + 1}/{revealedCards.length})
          </p>
          
          {/* 卡牌展示 */}
          <div className="flex gap-4 justify-center flex-wrap mb-8">
            {revealedCards.map((card, index) => (
              <div
                key={index}
                className={`
                  transition-all duration-500 transform cursor-pointer
                  ${index <= revealIndex ? 'opacity-100 scale-100 rotate-0' : 'opacity-50 scale-90 rotate-y-180'}
                `}
                onClick={handleRevealNext}
              >
                {index <= revealIndex ? (
                  <div className="animate-in zoom-in-50 duration-300">
                    <SpellCard spell={card} />
                  </div>
                ) : (
                  <SpellCard isFaceDown />
                )}
              </div>
            ))}
          </div>
          
          {/* 操作按钮 */}
          {revealIndex >= revealedCards.length - 1 ? (
            <button
              onClick={handleCloseReveal}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-white hover:scale-105 transition-transform"
            >
              完成
            </button>
          ) : (
            <button
              onClick={handleRevealNext}
              className="px-8 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-white hover:bg-white/20 transition-colors"
            >
              翻开下一张
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ShopScreen;