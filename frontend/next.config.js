const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@phosphor-icons/react"],
  experimental: {
    // Next 14 cần cờ này để nạp src/instrumentation.ts (init Sentry phía server/edge).
    instrumentationHook: true,
    // Tree-shake barrel import của phosphor-icons — chỉ bundle icon thực sự dùng
    // thay vì cả thư viện. Đây là nguồn bloat lớn nhất và an toàn để tối ưu.
    //
    // LƯU Ý: KHÔNG thêm @rainbow-me/rainbowkit / wagmi / viem vào đây.
    // barrel-optimize của rainbowkit kéo theo @safe-global → viem/_cjs (import.meta)
    // làm webpack `next dev` parse lỗi → mọi trang 500 (dù `next build` vẫn qua).
    optimizePackageImports: [
      "@phosphor-icons/react",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gateway.pinata.cloud", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "ipfs.io", pathname: "/ipfs/**" },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage":
        require.resolve("./src/lib/async-storage-stub.js"),
    };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "pino-pretty": false,
        encoding: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

// Bọc Sentry: inject sentry.client.config vào bundle + báo lỗi build. Tắt upload source map
// (sourcemaps.disable) để không cần SENTRY_AUTH_TOKEN (khỏi giữ secret cho khâu build).
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});