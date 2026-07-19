/**
 * GiuPay — Root Layout (Step 16)
 * Next.js App Router root — inject GlobalCSS + Providers một lần duy nhất.
 */

import type { Metadata } from "next";
import { Providers }     from "./providers";
import { GlobalCSS }     from "@/components/GlobalCSS";

export const metadata: Metadata = {
  title:       "GiuPay — Onchain payments for every shop",
  description: "Create orders, share QR codes, and receive USDC automatically. Secured by Arc Network escrow.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://giupay.io"),
  openGraph: {
    title:       "GiuPay",
    description: "Onchain escrow payments for Vietnamese shops",
    siteName:    "GiuPay",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Geist font từ Vercel CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Global styles — inject một lần */}
        <GlobalCSS />

        {/* wagmi + RainbowKit + TanStack Query */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
