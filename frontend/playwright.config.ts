import { defineConfig, devices } from "@playwright/test";

/**
 * GiuPay — Playwright config
 * ---------------------------------------------------------------------------
 * - webServer: Playwright tự chạy `next dev` trước khi test, tự tắt sau khi xong.
 *   => Không cần mở terminal riêng bật frontend nữa.
 * - baseURL: mọi page.goto("/...") sẽ tự thêm http://localhost:3000 ở đầu.
 * - Backend (localhost:3001) KHÔNG cần bật thật — trong test tụi mình mock lại
 *   (xem helper mockBackend trong e2e/giupay-flows.spec.ts).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // next dev biên dịch route theo yêu cầu ở lần truy cập đầu → có thể timeout khi
  // nhiều test chạy song song. Retry sẽ trúng route đã biên dịch nên ổn định.
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
