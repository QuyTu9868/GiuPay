/**
 * Demo shop data.
 * Trước đây chứa 28 shop mẫu tĩnh để marketplace không trống khi chưa có shop thật.
 * Nay đã có 14 shop thật (đã admin duyệt) nên bỏ toàn bộ demo: DEMO_SHOPS_DATA = {}.
 * Interface giữ lại vì Home/Shops/Products và các helper trong index.ts vẫn import kiểu.
 */

export interface DemoShop {
  id: string; name: string; description: string; category: string;
  gmail: string; facebookUrl?: string; returnPolicy: string;
  status: "verified"; avgRating: number; totalOrders: number;
  totalRevenue: string; createdAt: string;
}

export interface DemoListing {
  id: string; name: string; description: string;
  priceUsdc: string; imageCid?: string; isActive: boolean;
}

export interface DemoOrder {
  id: string; orderCode: string; productName: string;
  priceUsdc: string; warrantyDays: number; status: string; createdAt: string;
  review?: { rating: number; comment: string; commentEn?: string; buyerWallet: string; createdAt: string };
}

export interface DemoShopFull {
  shop: DemoShop;
  listings: DemoListing[];
  orders: DemoOrder[];
}

// Không còn shop demo. Marketplace chỉ hiển thị shop thật từ API.
export const DEMO_SHOPS_DATA: Record<string, DemoShopFull> = {};
