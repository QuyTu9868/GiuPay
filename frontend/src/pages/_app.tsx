/**
 * GiuPay — Pages Router _app.tsx
 * Wrap tất cả pages trong src/pages/ với providers:
 *   - WagmiProvider + RainbowKit + TanStack Query  (từ Providers)
 *
 * Admin auth (/admin) dùng email + TOTP trực tiếp qua backend, không cần Auth0 client SDK.
 * Bỏ Auth0Provider/UserProvider giúp mọi trang không phải khởi tạo Auth0 + gọi /api/auth/me.
 *
 * Lý do cần file này: src/app/layout.tsx chỉ wrap App Router pages.
 * Pages Router pages (src/pages/**) cần _app.tsx riêng.
 */

import type { AppProps } from "next/app";
import { useRouter }     from "next/router";
import { Providers }     from "@/app/providers";
import { GlobalCSS }     from "@/components/GlobalCSS";
import { ThemeProvider } from "@/lib/theme";
import { NavBar }        from "@/components/NavBar";
import { Analytics }     from "@vercel/analytics/react";

import "@/app/globals.css";

// Các trang dùng NavBar đầy đủ (marketplace: explore/products/wallet).
// Render NavBar 1 lần ở đây, KHÔNG render trong từng page — tránh unmount/remount
// (và gọi lại /api/shops/me) mỗi khi chuyển trang giữa các route này.
// Các trang khác (pay/[code], review/[code], shop/[id], register,
// pending, admin) dùng NavBar tối giản riêng của từng trang
// (back button / step indicator khác nhau) nên vẫn giữ nguyên trong file của chúng.
const FULL_NAVBAR_ROUTES = new Set(["/", "/shops", "/products", "/dashboard", "/profile", "/order/[code]"]);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const showNavBar = FULL_NAVBAR_ROUTES.has(router.pathname);

  return (
    <Providers>
      <ThemeProvider>
        <GlobalCSS />
        {showNavBar && <NavBar />}
        <Component {...pageProps} />
        <Analytics />
      </ThemeProvider>
    </Providers>
  );
}
