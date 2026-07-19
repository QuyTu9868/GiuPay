import { test, expect, type Page } from "@playwright/test";

/**
 * /shops — phủ regression cho tối ưu tốc độ:
 *  - Bỏ WalletGate: shop hiện NGAY cả khi chưa kết nối ví (trước đây bị chặn)
 *  - Chỉ còn banner nhỏ "Kết nối ví để mua hàng", không block nội dung
 *  - Lọc danh mục + tìm kiếm hoạt động
 *  - Không còn ảnh external (loremflickr) — ảnh cover là data:image/svg+xml
 */

async function mockBackend(page: Page) {
  await page.route("**://localhost:3001/**", (route) =>
    route.fulfill({ json: { success: true, data: { shops: [] } } }));
}

test.beforeEach(async ({ page }) => { await mockBackend(page); });

test("CHƯA kết nối ví vẫn thấy shop (WalletGate đã gỡ)", async ({ page }) => {
  await page.goto("/shops");
  await expect(page.getByRole("heading", { name: /Khám phá cửa hàng/i })).toBeVisible();
  // Banner nhắc kết nối ví (không chặn nội dung)
  await expect(page.getByText(/Kết nối ví để mua hàng/i)).toBeVisible();
  // Vẫn thấy ít nhất 1 shop demo
  await expect(page.getByText("TechZone Store").first()).toBeVisible();
});

test("lọc danh mục 'Sách' chỉ còn shop thuộc Sách", async ({ page }) => {
  await page.goto("/shops");
  await page.getByRole("button", { name: "Sách", exact: true }).click();
  await expect(page.getByText("Sách Hay Mỗi Ngày").first()).toBeVisible();
  // Shop công nghệ không còn hiển thị
  await expect(page.getByText("TechZone Store")).toHaveCount(0);
});

test("tìm kiếm lọc theo tên shop", async ({ page }) => {
  await page.goto("/shops");
  await page.getByPlaceholder(/Tìm cửa hàng/i).fill("Phở");
  await expect(page.getByText(/Phở Gia Truyền/i).first()).toBeVisible();
  await expect(page.getByText("TechZone Store")).toHaveCount(0);
});

test("ảnh cover là SVG local (data URI), KHÔNG gọi loremflickr", async ({ page }) => {
  await page.goto("/shops");
  const firstImg = page.locator('main img[alt="TechZone Store"]').first();
  await expect(firstImg).toBeVisible();
  const src = await firstImg.getAttribute("src");
  expect(src ?? "").toMatch(/^data:image\/svg\+xml/);
  expect(src ?? "").not.toContain("loremflickr");
});
