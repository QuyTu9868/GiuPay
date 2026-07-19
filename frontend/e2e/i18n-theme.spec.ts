import { test, expect, type Page } from "@playwright/test";

/**
 * i18n (vi/en) + dark mode — toggle từ NavBar.
 */

async function mockBackend(page: Page) {
  await page.route("**://localhost:3001/**", (route) =>
    route.fulfill({ json: { success: true, data: {} } }));
}

test.beforeEach(async ({ page }) => { await mockBackend(page); });

test("đổi ngôn ngữ sang English → nút ví hiện 'Connect Wallet'", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Kết nối ví/i }).first()).toBeVisible();
  // Mở dropdown ngôn ngữ (nút hiện 'vi') rồi chọn English
  await page.getByRole("button", { name: /^vi$/i }).first().click();
  await page.getByText("English", { exact: true }).click();
  await expect(page.getByRole("button", { name: /Connect Wallet/i }).first()).toBeVisible();
  // Đã lưu localStorage
  expect(await page.evaluate(() => localStorage.getItem("ap-lang"))).toBe("en");
});

test("bật dark mode → html[data-theme=dark] + lưu localStorage", async ({ page }) => {
  await page.goto("/");
  // Nút dark mode có title 'Chế độ tối'
  await page.getByRole("button", { name: /Chế độ tối/i }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("ap-dark"))).toBe("1");
});
