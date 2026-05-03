// ShopService - 商店服务

export type ProductType = 'pack' | 'bundle' | 'currency';

// [P3.2] Cosmetic product types
export interface CosmeticProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'card_back' | 'emote_pack' | 'avatar_frame';
  previewEmoji: string;
}

export const COSMETICS: CosmeticProduct[] = [
  { id: 'cardback_flame', name: '烈焰卡背', description: '燃烧的火焰卡背', price: 500, type: 'card_back', previewEmoji: '🔥' },
  { id: 'cardback_frost', name: '寒冰卡背', description: '冰晶闪烁的卡背', price: 500, type: 'card_back', previewEmoji: '❄️' },
  { id: 'emote_pack_2', name: '表情包 Vol.2', description: '6个全新表情', price: 300, type: 'emote_pack', previewEmoji: '😎' },
  { id: 'avatar_frame_gold', name: '黄金头像框', description: '华丽的金色头像框', price: 800, type: 'avatar_frame', previewEmoji: '🏅' },
];

const COSMETIC_PURCHASES_KEY = 'wizard_cosmetic_purchases_v1';

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
    expiresAt?: number; // 限时礼包过期时间戳
    isFirstPurchase?: boolean; // 是否是首充礼包
    resetPeriod?: 'weekly' | 'daily'; // 购买限制重置周期
}

export const SHOP_CATALOG: Product[] = [
    // === [P0 商业化] 首充礼包 - 最高优先级展示 ===
    {
        id: 'first_purchase_bundle',
        type: 'bundle',
        name: '🌟 首充双倍',
        description: '首次购买限定！双倍价值',
        price: 100,
        originalPrice: 600,
        currencyType: 'mana',
        items: [
            { type: 'pack', id: 'premium', count: 3 },
            { type: 'card', id: 'fire3', count: 1 }, // 地狱爆破 - 稀有卡
            { type: 'card', id: 'ice3', count: 1 }, // 寒冰屏障
            { type: 'mana', count: 300 }
        ],
        limit: 1,
        badge: '🔥 首充必买',
        badgeColor: 'bg-gradient-to-r from-yellow-500 to-amber-600',
        isFirstPurchase: true
    },

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
        limit: 1,
        resetPeriod: 'weekly', // 每周重置购买次数
        badge: '每周限购',
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
        badgeColor: 'bg-red-600',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 天后过期
    },
    
    // === [P0 商业化] 限时折扣礼包 ===
    {
        id: 'weekend_special',
        type: 'bundle',
        name: '周末特惠',
        description: '仅限周末，错过等一周！',
        price: 300,
        originalPrice: 900,
        currencyType: 'mana',
        items: [
            { type: 'pack', id: 'premium', count: 5 },
            { type: 'mana', count: 150 }
        ],
        badge: '⏰ 限时67%OFF',
        badgeColor: 'bg-gradient-to-r from-red-500 to-pink-600',
        expiresAt: getWeekendExpiry()
    }
];

// 计算本周末结束时间
function getWeekendExpiry(): number {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // 计算到下周一 00:00 的毫秒数
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
}

export class ShopService {
    static getProducts(category: ProductType): Product[] {
        return SHOP_CATALOG.filter(p => {
            if (p.type !== category) return false;
            // 过滤已过期的限时商品
            if (p.expiresAt && Date.now() > p.expiresAt) return false;
            return true;
        });
    }
    
    // [P0 商业化] 获取首充礼包（优先展示）
    static getFirstPurchaseBundle(): Product | undefined {
        return SHOP_CATALOG.find(p => p.isFirstPurchase);
    }
    
    // [P0 商业化] 获取限时礼包（带倒计时）
    static getLimitedBundles(): Product[] {
        return SHOP_CATALOG.filter(p => 
            p.type === 'bundle' && 
            p.expiresAt && 
            Date.now() < p.expiresAt
        );
    }
    
    // [P0 商业化] 计算剩余时间
    static getTimeRemaining(expiresAt: number): { hours: number, minutes: number, seconds: number } | null {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) return null;
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        return { hours, minutes, seconds };
    }

    static getProductById(id: string): Product | undefined {
        return SHOP_CATALOG.find(p => p.id === id);
    }

    /**
     * 检查购买限制
     * purchasedHistory 格式：{ productId: timestamp } 或 { productId: count }
     * 对于有 resetPeriod 的商品，检查时间戳是否在当前周期内
     */
    static checkPurchaseLimit(productId: string, purchasedHistory: Record<string, number>): boolean {
        const product = this.getProductById(productId);
        if (!product || !product.limit) return true;
        
        const purchaseRecord = purchasedHistory[productId];
        if (!purchaseRecord) return true; // 从未购买过
        
        // 如果有重置周期，检查是否已过重置时间
        if (product.resetPeriod) {
            const purchaseTime = purchaseRecord; // 存储的是时间戳
            const now = Date.now();
            
            if (product.resetPeriod === 'weekly') {
                // 获取本周一 00:00 的时间戳
                const weekStart = this.getWeekStartTimestamp();
                // 如果上次购买在本周之前，则可以重新购买
                if (purchaseTime < weekStart) return true;
            } else if (product.resetPeriod === 'daily') {
                // 获取今天 00:00 的时间戳
                const dayStart = this.getDayStartTimestamp();
                if (purchaseTime < dayStart) return true;
            }
        }
        
        // 无重置周期或在周期内已购买
        return false;
    }
    
    // 获取本周一 00:00 的时间戳
    static getWeekStartTimestamp(): number {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周一为起始
        const monday = new Date(now);
        monday.setDate(now.getDate() - diff);
        monday.setHours(0, 0, 0, 0);
        return monday.getTime();
    }
    
    // 获取今天 00:00 的时间戳
    static getDayStartTimestamp(): number {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now.getTime();
    }

    static processPurchase(
        userBalance: number, 
        productId: string, 
        purchasedHistory: Record<string, number>
    ): { success: boolean, cost: number, rewards: any[], error?: string } {
        const product = this.getProductById(productId);
        if (!product) return { success: false, cost: 0, rewards: [], error: '商品不存在' };

        // 检查是否已过期
        if (product.expiresAt && Date.now() > product.expiresAt) {
            return { success: false, cost: 0, rewards: [], error: '商品已过期' };
        }

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

    // [P3.2] Cosmetic shop methods
    static getCosmeticProducts(): CosmeticProduct[] {
        return COSMETICS;
    }

    static purchaseCosmetic(id: string, balance: number): { success: boolean; newBalance: number } {
        const product = COSMETICS.find(c => c.id === id);
        if (!product) return { success: false, newBalance: balance };
        if (balance < product.price) return { success: false, newBalance: balance };
        // Check if already purchased
        const purchased = this.getPurchasedCosmetics();
        if (purchased.includes(id)) return { success: false, newBalance: balance };
        // Deduct and save
        const newBalance = balance - product.price;
        purchased.push(id);
        try { localStorage.setItem(COSMETIC_PURCHASES_KEY, JSON.stringify(purchased)); } catch { /* ignore */ }
        return { success: true, newBalance };
    }

    static getPurchasedCosmetics(): string[] {
        try {
            const raw = localStorage.getItem(COSMETIC_PURCHASES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }
}
