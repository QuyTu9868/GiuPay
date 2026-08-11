import { defineConfig } from "@playwright/test";

// Config cho test ví thật (dAppwright + MetaMask), tách khỏi bộ e2e mock.
// Chạy: npx playwright test --config playwright.dappwright.config.ts
export default defineConfig({
  testDir: "./e2e-wallet",
  timeout: 180_000,
  expect: { timeout: 40_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 180_000,
    reuseExistingServer: true,
  },
});
