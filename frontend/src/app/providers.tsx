/**
 * GiuPay — Providers (Step 16)
 * Wrap toàn app với wagmi + RainbowKit + TanStack Query.
 * Auth0 dùng @auth0/nextjs-auth0 — server-side, không cần wrap client.
 *
 * Đặt trong: src/app/providers.tsx
 * Dùng trong: src/app/layout.tsx
 *
 * Usage:
 *   <Providers>{children}</Providers>
 */

"use client";

import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider }                             from "wagmi";
import { QueryClient, QueryClientProvider }          from "@tanstack/react-query";
import { wagmiConfig }                               from "@/lib/wagmi.config";

import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,      // 30s
      gcTime:    5 * 60_000,  // 5 min
      retry: 1,
    },
  },
});

// RainbowKit custom theme — match GiuPay design tokens
const rainbowKitTheme = lightTheme({
  accentColor:          "#111111",
  accentColorForeground:"#FBFBFA",
  borderRadius:         "medium",
  fontStack:            "system",
  overlayBlur:          "small",
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={rainbowKitTheme}
          modalSize="compact"
          appInfo={{
            appName: "GiuPay",
            learnMoreUrl: "https://giupay.io",
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
