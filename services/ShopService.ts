import { SPELLS } from '../data/spells';
import { Spell, SpellType } from '../types';

export type ProductType = 'pack' | 'bundle' | 'currency';

export interface Product {
    id: string;
    type: ProductType;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    currencyType: 'gold' | 'mana'; // Gold is premium (if we add it), Mana is grindable
    items: {
        type: 'card' | 'pack' | 'mana';
        id?: string;
        count: number;
        data?: any; // e.g. guaranteed rarity
    }[];
    limit?: number; // Purchase limit (e.g. 1 for Starter Bundle)
    badge?: string;
    badgeColor?: string;
}

export const SHOP_CATALOG: Product[] = [
    // === Packs ===
    {
        id: 'standard_pack',
        type: 'pack',
        name: '元素卡包',
        description: '包含5张随机卡牌',
        price: 100,
        currencyType: 'mana',
        items: [{ type: 'pack', id: 'standard', count: 1 }],
        badge: '基础',
        badgeColor: 'bg-blue-500'
    },
    {
        id: 'premium_pack',
        type: 'pack',
        name: '黄金卡包',
        description: '保底1张稀有卡牌',
        price: 300,
        currencyType: 'mana',
        items: [{ type: 'pack', id: 'premium', count: 1, data: { guaranteed: 'rare' } }],
        badge: '进阶',
        badgeColor: 'bg-yellow-500'
    },
    {
        id: 'legendary_pack',
        type: 'pack',
        name: '传说卡包',
        description: '保底1张传说卡牌',
        price: 1000,
        currencyType: 'mana',
        items: [{ type: 'pack', id: 'legendary', count: 1, data: { guaranteed: 'legendary' } }],
        badge: '每日限量',
        badgeColor: 'bg-purple-500'
    },

    // === Bundles (E-4) ===
    {
        id: 'starter_bundle',
        type: 'bundle',
        name: '新手礼包',
        description: '开局必买，超值优惠',
        price: 50, // Very cheap first play
        originalPrice: 500,
        currencyType: 'mana',
        items: [
            { type: 'pack', id: 'standard', count: 3 },
            { type: 'mana', count: 200 },
            { type: 'card', id: 'fire2', count: 1 } // Fireball guaranteed
        ],
        limit: 1,
        badge: '限购1次',
        badgeColor: 'bg-green-500'
    },
    {
        id: 'weekly_bundle',
        type: 'bundle',
        name: '周常补给',
        description: '每周一次的补给包',
        price: 500,
        originalPrice: 800,
        currencyType: 'mana',
        items: [
            { type: 'pack', id: 'premium', count: 2 },
            { type: 'mana', count: 100 }
        ],
        badge: '超值',
        badgeColor: 'bg-orange-500'
    },
    {
        id: 'limited_bundle_dragon',
        type: 'bundle',
        name: '巨龙宝藏',
        description: '限时出售，含传说卡牌',
        price: 2000,
        originalPrice: 4000,
        currencyType: 'mana',
        items: [
            { type: 'card', id: 'fire5', count: 1 }, // Dragon/Wave
            { type: 'pack', id: 'legendary', count: 1 },
            { type: 'mana', count: 500 }
        ],
        badge: '限时',
        badgeColor: 'bg-red-600'
    }
];

export class ShopService {
    static getProducts(category: ProductType): Product[] {
        return SHOP_CATALOG.filter(p => p.type === category);
    }

    static getProductById(id: string): Product | undefined {
        return SHOP_CATALOG.find(p => p.id === id);
    }

    static checkPurchaseLimit(productId: string, purchasedHistory: Record<string, number>): boolean {
        const product = this.getProductById(productId);
        if (!product || !product.limit) return true;
        
        const bought = purchasedHistory[productId] || 0;
        return bought < product.limit;
    }

    static processPurchase(
        userBalance: number, 
        productId: string, 
        purchasedHistory: Record<string, number>
    ): { success: boolean, cost: number, rewards: any[], error?: string } {
        const product = this.getProductById(productId);
        if (!product) return { success: false, cost: 0, rewards: [], error: '商品不存在' };

        if (!this.checkPurchaseLimit(productId, purchasedHistory)) {
            return { success: false, cost: 0, rewards: [], error: '已达购买上限' };
        }

        if (userBalance < product.price) {
            return { success: false, cost: 0, rewards: [], error: '余额不足' };
        }

        return {
            success: true,
            cost: product.price,
            rewards: product.items
        };
    }
}
