import { test, expect, type Page } from "@playwright/test";

/**
 * Admin — luồng đăng nhập THẬT (email + 2FA) → vào dashboard.
 * Backend admin được MOCK. Phủ regression cho bug: trước đây admin cần Auth0,
 * giờ chỉ email + TOTP (bypass 000000 ở testnet).
 */

async function mockAdmin(page: Page, { totpOk = true }: { totpOk?: boolean } = {}) {
  await page.route("**://localhost:3001/api/admin/verify-totp", async (route) => {
    if (totpOk) {
      return route.fulfill({
        json: { success: true, data: { verified: true, session_token: "test-session-token", expires_in: 28800 } },
      });
    }
    return route.fulfill({ status: 401, json: { success: false, error: "Mã 2FA không đúng hoặc đã hết hạn" } });
  });
  // Dữ liệu dashboard sau khi đăng nhập
  await page.route("**://localhost:3001/api/admin/shops/pending", (r) =>
    r.fulfill({ json: { success: true, data: [] } }));
  await page.route("**://localhost:3001/api/admin/shops/verified", (r) =>
    r.fulfill({ json: { success: true, data: [] } }));
  await page.route("**://localhost:3001/api/admin/disputes", (r) =>
    r.fulfill({ json: { success: true, data: [] } }));
  await page.route("**://localhost:3001/api/admin/settings/fee-wallet", (r) =>
    r.fulfill({ json: { success: true, data: { current: "0x0000000000000000000000000000000000000000" } } }));
}

test.describe("Admin login", () => {
  test("màn hình đăng nhập hiện email + mã 2FA (không còn Auth0)", async ({ page }) => {
    await mockAdmin(page);
    await page.goto("/admin");
    await expect(page.getByText("GiuPay Admin")).toBeVisible();
    await expect(page.getByPlaceholder("admin@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("000000")).toBeVisible();
    // KHÔNG còn nút Auth0
    await expect(page.getByText(/Auth0/i)).toHaveCount(0);
  });

  test("nhập email + 000000 → vào được Bảng điều khiển", async ({ page }) => {
    await mockAdmin(page, { totpOk: true });
    await page.goto("/admin");
    await page.getByPlaceholder("admin@example.com").fill("admin@giupay.io");
    await page.getByPlaceholder("000000").fill("000000");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByRole("heading", { name: "Bảng điều khiển" })).toBeVisible();
  });

  test("mã sai → hiện lỗi, KHÔNG vào dashboard", async ({ page }) => {
    await mockAdmin(page, { totpOk: false });
    await page.goto("/admin");
    await page.getByPlaceholder("admin@example.com").fill("admin@giupay.io");
    await page.getByPlaceholder("000000").fill("111111");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText(/Mã 2FA không đúng/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bảng điều khiển" })).toHaveCount(0);
  });

  test("nút Đăng nhập disabled khi thiếu email hoặc mã chưa đủ 6 số", async ({ page }) => {
    await mockAdmin(page);
    await page.goto("/admin");
    const btn = page.getByRole("button", { name: "Đăng nhập" });
    await expect(btn).toBeDisabled();
    await page.getByPlaceholder("admin@example.com").fill("admin@giupay.io");
    await page.getByPlaceholder("000000").fill("123"); // chưa đủ 6
    await expect(btn).toBeDisabled();
  });
});
