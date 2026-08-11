import { defineConfig } from "@playwright/test";

// Config cho test ví thật (dAppwright + MetaMask), tách khỏi bộ e2e mock.
// Chạy: npx playwright test --config playwright.dappwright.config.ts
export default defineConfig({
  testDir: "./e2e-wallet",
  timeout: 360_000,
  expect: { timeout: 40_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  // Test thẳng vào app deployed (đã nối backend onrender + Arc Testnet), tránh lệch
  // API/CORS giữa frontend local và backend prod. Đơn tạo qua API onrender sẽ khớp.
  use: { baseURL: "https://giupay-six.vercel.app" },
});
