/**
 * ShopScreen - 商店页面 (Refactored for E-2/E-4)
 * 使用 ShopService 处理商品逻辑，包含限时礼包和限购逻辑
 */

import React, { useState } from 'react';
import { ArrowLeft, Package, Gift, Crown, Sparkles, Star, Zap, Lock, ShoppingBag } from 'lucide-react';
import { Spell, SpellType } from '../types';
import { HapticService } from '../services/haptic';
import { useToastStore } from '../stores/useToastStore';
import { PackOpener } from './shop/PackOpener';
import { ShopService, Product } from '../services/ShopService';
import { openPack } from '../constants'; // Legacy import, kept for Guest fallback if needed
import { SecureGameService } from '../services/SecureGameService';
import { useUserStore } from '../stores/useUserStore';
import { SPELLS } from '../data/spells';

interface ShopScreenProps {
  balance: number;
  onBack: () => void;
  onUpdateBalance: (newBalance: number) => void;
  onAddCards?: (cards: SpellType[]) => void;
  purchasedBundles?: Record<string, number>; // productId -> timestamp
  onPurchaseBundle?: (bundleId: string) => void;
  packInventory?: Record<string, number>;
  onAddPacks?: (packId: string, count: number) => void;
  onConsumePack?: (packId: string) => boolean;
}

export const ShopScreen: React.FC<ShopScreenProps> = ({
  balance,
  onBack,
  onUpdateBalance,
  onAddCards,
  purchasedBundles = {},
  onPurchaseBundle,
  packInventory = {},
  onAddPacks,
  onConsumePack
}) => {
  const [activeTab, setActiveTab] = useState<'packs' | 'bundles'>('packs');
  const [openingProduct, setOpeningProduct] = useState<Product | null>(null);
  const [inventoryPackOpening, setInventoryPackOpening] = useState<string | null>(null);
  
  // Pack Opener State
  const [revealedCards, setRevealedCards] = useState<Spell[]>([]);
  const [pityCounter, setPityCounter] = useState({ rare: 0, mythic: 0, legendary: 0 });
  
  const toast = useToastStore();
  const user = useUserStore();

  // Helper to pick a random card of a specific rarity
  const pickCardOfRarity = (rarity: string): Spell => {
      const availableCards = SPELLS.filter(s => 
          s.rarity === rarity && 
          !s.id.startsWith('hero_') && 
          s.id !== 'skip'
      );
      if (availableCards.length === 0) {
          // Fallback
          return SPELLS.find(s => s.rarity === 'common' && s.id !== 'skip') || SPELLS[0];
      }
      return availableCards[Math.floor(Math.random() * availableCards.length)];
  };

  // === Transaction Logic ===
  const handlePurchase = async (product: Product) => {
    // 1. Validate Balance
    if (balance < product.price) {
        toast.error('余额不足', `还需要 ${product.price - balance} 钻石`);
        HapticService.failure();
        return;
    }

    // 2. Validate Limits (now using timestamp-based history)
    const purchaseRes = ShopService.processPurchase(balance, product.id, purchasedBundles);
    if (!purchaseRes.success) {
        toast.error('购买失败', purchaseRes.error || '未知错误');
        return;
    }

    // 3. Execution (Secure)
    try {
        // Securely deduct gold
        if (user.supabaseUserId) {
             const goldRes = await SecureGameService.adjustGold(user.supabaseUserId, -product.price, 'buy_' + product.id);
             if (!goldRes.success) {
                 toast.error('交易失败', goldRes.error);
                 return;
             }
             onUpdateBalance(goldRes.newBalance);
        } else {
             // Guest/Offline fallback
             onUpdateBalance(balance - product.price);
        }
        
        HapticService.medium();

        // 4. Process Rewards
        let cardsOpened: Spell[] = [];
        const packsToAdd: {id: string, count: number}[] = [];

        // Handle Pack (Direct Open) vs Inventory
        if (product.type === 'pack') {
             // For direct open, we first Add to inventory (Secure), then Open (Secure)
             // Pack ID logic:
             const packItem = product.items.find(i => i.type === 'pack');
             const packId = packItem?.id || 'standard';
             const packType = packId as 'standard' | 'premium' | 'legendary';

             if (user.supabaseUserId) {
                 // Add pack to DB first
                 const { addUserPacks } = await import('../services/supabase');
                 await addUserPacks(user.supabaseUserId, packId, 1);
                 
                 // Open pack via Secure RPC
                 const openRes = await SecureGameService.openPack(user.supabaseUserId, packId, packType);
                 
                 if (openRes.success) {
                     // Convert Rarity results to Cards
                     cardsOpened = openRes.cards.map(c => pickCardOfRarity(c.rarity));
                     
                     // Sync Pity
                     // Note: RPC handled pity update on server, we can refresh it later
                 } else {
                     toast.error('开包失败', openRes.error);
                     return;
                 }
             } else {
                 // Guest: Use local openPack (Legacy)
                 const { cards, newPity } = openPack(pityCounter);
                 setPityCounter(newPity);
                 cardsOpened = cards;
             }
        } else {
             // Bundle / Other items
             purchaseRes.rewards.forEach(reward => {
                 if (reward.type === 'pack') {
                     packsToAdd.push({ id: reward.id || 'standard', count: reward.count });
                 } else if (reward.type === 'mana') {
                     // Mana reward (add back)
                     if (user.supabaseUserId) {
                         SecureGameService.adjustGold(user.supabaseUserId, reward.count, 'bundle_reward');
                         onUpdateBalance(balance - product.price + reward.count);
                     } else {
                         onUpdateBalance(balance - product.price + reward.count);
                     }
                 } else if (reward.type === 'card') {
                      const spell = SPELLS.find(s => s.id === reward.id);
                      if (spell) cardsOpened.push(spell);
                 }
             });
        }

        // 5. Finalize (Add to Inventory)
        if (packsToAdd.length > 0) {
             packsToAdd.forEach(p => onAddPacks?.(p.id, p.count));
        }
        if (cardsOpened.length > 0) {
             onAddCards?.(cardsOpened.map(c => c.id));
             setRevealedCards(cardsOpened);
             setOpeningProduct(product); 
        } else if (packsToAdd.length > 0) {
             toast.success('购买成功', '物品已放入库存');
        }

        if (product.type === 'bundle') {
             onPurchaseBundle?.(product.id);
        }

    } catch (err: any) {
        console.error('Purchase error:', err);
        toast.error('购买出错', err.message);
    }
  };

  const handleOpenInventory = async (packId: string) => {
      // Secure Open from Inventory
      const packType = packId as 'standard' | 'premium' | 'legendary';
      
      try {
          if (user.supabaseUserId) {
              const openRes = await SecureGameService.openPack(user.supabaseUserId, packId, packType);
              if (openRes.success) {
                  // RPC consumes pack automatically
                  // Update UI to reflect consumption
                  
                  // Convert results
                  const cards = openRes.cards.map(c => pickCardOfRarity(c.rarity));
                  
                  setRevealedCards(cards);
                  onAddCards?.(cards.map(c => c.id));
                  setInventoryPackOpening(packId); 
                  
                  // Update UI inventory count locally
                  // Use onConsumePack to update local UI state
                  onConsumePack?.(packId); 
              } else {
                  toast.error('开启失败', openRes.error);
              }
          } else {
              // Guest
              if (onConsumePack?.(packId)) {
                const { cards, newPity } = openPack(pityCounter);
                setPityCounter(newPity);
                setRevealedCards(cards);
                onAddCards?.(cards.map(c => c.id));
                setInventoryPackOpening(packId); 
              }
          }
      } catch (err) {
          console.error('Open inventory error:', err);
      }
  };

  // === Render ===

  // Pack Opener Overlay
  if ((openingProduct && revealedCards.length > 0) || (inventoryPackOpening && revealedCards.length > 0)) {
     return (
         <PackOpener 
            cards={revealedCards}
            onClose={() => {
                setOpeningProduct(null);
                setInventoryPackOpening(null);
                setRevealedCards([]);
            }}
            packName={openingProduct?.name || '卡包'}
         />
     );
  }

  const products = ShopService.getProducts(activeTab === 'packs' ? 'pack' : 'bundle');

  return (
    <div className="min-h-screen bg-slate-950 pb-20 pt-20 px-4 animate-in fade-in">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md z-40 p-4 border-b border-white/10 flex items-center justify-between safe-area-top">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2 font-bold text-xl tracking-widest text-[#ffd700]">
           <ShoppingBag className="mb-1" />
           <span>神秘商店</span>
        </div>
        <div className="bg-black/40 px-3 py-1 rounded-lg border border-purple-500/30 font-mono text-purple-300">
          {balance} 💎
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
         <button 
           onClick={() => setActiveTab('packs')}
           className={`px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap ${activeTab === 'packs' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-white/5 text-gray-400'}`}
         >
           卡包抽取
         </button>
         <button 
           onClick={() => setActiveTab('bundles')}
           className={`px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap ${activeTab === 'bundles' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'bg-white/5 text-gray-400'}`}
         >
           超值礼包
         </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Packs */}
        {activeTab === 'packs' && (
            <>
            {/* Inventory Packs */}
            {Object.entries(packInventory).map(([packId, count]) => (
                (count as number) > 0 && (
                <div key={`inv-${packId}`} className="relative bg-slate-900/50 border border-green-500/50 rounded-xl p-6 flex flex-col items-center gap-4 group hover:bg-slate-900 transition-colors">
                    <div className="absolute top-2 right-2 bg-green-500 text-xs font-bold px-2 py-1 rounded text-black">
                        库存: {count}
                    </div>
                    <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center border border-green-500/30 group-hover:scale-105 transition-transform animate-pulse-gentle">
                        <Package size={48} className="text-green-400" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-lg text-white">拥有: {packId === 'standard' ? '基础卡包' : '卡包'}</h3>
                        <p className="text-sm text-gray-400">点击立即开启</p>
                    </div>
                    <button 
                        onClick={() => handleOpenInventory(packId)}
                        className="w-full py-3 mt-auto bg-green-600 hover:bg-green-500 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20"
                    >
                        <Package size={18} /> 开包
                    </button>
                </div>
                )
            ))}

            {products.map(pack => (
                <div key={pack.id} className={`bg-gradient-to-b from-${pack.badgeColor?.split('-')[1] || 'blue'}-500/5 to-transparent border border-white/10 hover:border-${pack.badgeColor?.split('-')[1] || 'blue'}-500 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all group relative overflow-hidden`}>
                    
                    <div className={`w-20 h-20 rounded-xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        {GetProductIcon(pack)}
                    </div>
                    
                    <div className="text-center z-10">
                        <h3 className="font-bold text-xl mb-1">{pack.name}</h3>
                        <p className="text-sm text-gray-400 mb-2">{pack.description}</p>
                    </div>

                    <button
                        onClick={() => handlePurchase(pack)}
                        className={`w-full mt-auto py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95
                            ${balance >= pack.price ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                        `}
                    >
                         {balance >= pack.price ? (
                             <>
                                <span className="text-cyan-600">{pack.price}</span> 💎 购买
                             </>
                         ) : (
                             <span>余额不足</span>
                         )}
                    </button>
                </div>
            ))}
            </>
        )}

        {/* Bundles */}
        {activeTab === 'bundles' && products.map(bundle => {
             // 使用 checkPurchaseLimit 判断是否可购买（支持周期刷新）
             const canPurchase = ShopService.checkPurchaseLimit(bundle.id, purchasedBundles);
             const isPurchased = !canPurchase;
             return (
                <div key={bundle.id} className={`bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden ${isPurchased ? 'opacity-50 grayscale' : ''}`}>
                    {bundle.badge && !isPurchased && (
                        <div className={`absolute top-0 right-0 ${bundle.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-lg`}>
                            {bundle.badge}
                        </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center`}>
                            {GetProductIcon(bundle)}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{bundle.name}</h3>
                            <div className="flex gap-2 text-sm text-gray-400">
                                {bundle.originalPrice && <span className="line-through">💎{bundle.originalPrice}</span>}
                                <span className="text-red-400 font-bold">💎{bundle.price}</span>
                            </div>
                        </div>
                    </div>

                    <ul className="space-y-2 bg-black/20 p-3 rounded-lg text-sm text-gray-300">
                        {bundle.items.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-green-500" />
                                {item.type === 'pack' ? `${item.count}个卡包` : item.type === 'mana' ? `${item.count}钻石` : '稀有卡牌'}
                            </li>
                        ))}
                    </ul>

                    <button 
                        disabled={isPurchased}
                        onClick={() => !isPurchased && handlePurchase(bundle)}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold shadow-lg shadow-purple-900/40 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:from-gray-700 disabled:to-gray-800"
                    >
                        {isPurchased ? '已购买' : `立即购买 ${bundle.price} 💎`}
                    </button>
                </div>
             );
        })}
      </div>
    </div>
  );
};

export default ShopScreen;

const CheckCircle = ({size, className}: {size: number, className?: string}) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const GetProductIcon = (product: Product) => {
    if (product.id.includes('dragon')) return <span className="text-3xl">🐲</span>;
    if (product.id.includes('starter')) return <Gift className="text-green-400" />;
    if (product.id.includes('weekly')) return <Star className="text-orange-400" />;
    if (product.id.includes('legendary')) return <Sparkles className="text-purple-400" />;
    if (product.id.includes('premium')) return <Crown className="text-yellow-400" />;
    return <Package className="text-blue-400" />;
};