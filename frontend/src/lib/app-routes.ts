/**
 * GiuPay — Route Constants (Step 16)
 * Tất cả routes đều khai báo ở đây — không hardcode string path trong code.
 *
 * Usage:
 *   import { ROUTES } from "@/lib/app-routes";
 *   <a href={ROUTES.shop(shopId)}>...</a>
 */

export const ROUTES = {
  home:           "/",
  register:       "/register",

  // Shop
  shop:      (shopId: string)    => `/shop/${shopId}`,
  product:   (shopId: string, listingId: string) => `/shop/${shopId}/product/${listingId}`,
  dashboard: "/dashboard",
  manageProduct: (listingId: string) => `/dashboard/product/${listingId}`,

  // Payment
  pay:       (orderCode: string) => `/pay/${orderCode}`,

  // Review
  review:    (orderCode: string) => `/review/${orderCode}`,

  // Admin
  admin:          "/admin",
  adminDisputes:  "/admin/disputes",
  adminShops:     "/admin/shops",
  adminSettings:  "/admin/settings",

  // Auth0
  login:    "/api/auth/login",
  logout:   "/api/auth/logout",
  callback: "/api/auth/callback",
} as const;