/**
 * Demo shops — entry point.
 * Import từ đây thay vì import thẳng từ data.ts.
 */

export { DEMO_SHOPS_DATA } from "./data";
export type { DemoShop, DemoListing, DemoOrder, DemoShopFull } from "./data";

/** Kiểm tra xem shopId có phải demo shop không */
export function isDemoShop(shopId: string): boolean {
  return shopId.startsWith("demo-");
}

/** Lấy data đầy đủ của 1 demo shop. Trả về null nếu không tồn tại. */
export function getDemoShopData(shopId: string) {
  const { DEMO_SHOPS_DATA } = require("./data");
  return DEMO_SHOPS_DATA[shopId] ?? null;
}

/** Số ngày bảo hành mặc định theo danh mục — demo listing không có warrantyDays riêng,
 *  suy ra từ category của shop (dùng chung cho ProductsPage.tsx và trang chi tiết sản phẩm). */
export const WARRANTY_BY_CATEGORY: Record<string, number> = {
  "Công nghệ": 365, "Thời trang": 30, "Đồ ăn & Thức uống": 3,
  "Làm đẹp": 30, "Sách": 14, "Nội thất": 90, "Đồ chơi & Mẹ bé": 30,
};

/** Tìm 1 sản phẩm demo theo shopId + listingId, trả về đủ field để dựng trang chi tiết
 *  sản phẩm (ProductDetailPage) mà KHÔNG cần gọi API thật. Trả về null nếu không tìm thấy. */
export function getDemoListingDetail(shopId: string, listingId: string) {
  const { DEMO_SHOPS_DATA } = require("./data");
  const shopFull = DEMO_SHOPS_DATA[shopId];
  if (!shopFull) return null;
  const listing = shopFull.listings.find((l: any) => l.id === listingId);
  if (!listing) return null;
  return {
    id: listing.id,
    name: listing.name,
    description: listing.description,
    priceUsdc: listing.priceUsdc,
    imageCid: null,
    category: shopFull.shop.category,
    warrantyDays: WARRANTY_BY_CATEGORY[shopFull.shop.category] ?? 14,
    isActive: listing.isActive,
    shopId: shopFull.shop.id,
    shopName: shopFull.shop.name,
  };
}
