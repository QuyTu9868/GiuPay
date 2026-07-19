import { test, expect, type Page } from "@playwright/test";

/**
 * Trang /products — danh sách, lọc danh mục, tìm kiếm, và luồng mua DEMO.
 * Danh sách sản phẩm là dữ liệu demo phía client (không cần backend).
 * DemoBuyModal fetch /api/ghn-master (Next route) — mock rỗng để không phụ thuộc GHN.
 */

async function mockBackend(page: Page) {
  await page.route("**://localhost:3001/**", (route) =>
    route.fulfill({ json: { success: true, data: {} } }));
  // GHN master data cho DemoBuyModal
  await page.route("**/api/ghn-master**", (route) =>
    route.fulfill({ json: { data: [] } }));
}

test.beforeEach(async ({ page }) => { await mockBackend(page); });

test("mở được, hiện tiêu đề + thẻ danh mục", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: /Tất cả sản phẩm/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tất cả", exact: true })).toBeVisible();
});

test("tìm kiếm lọc được sản phẩm", async ({ page }) => {
  await page.goto("/products");
  const search = page.getByPlaceholder(/Tìm sản phẩm hoặc shop/i);
  await search.fill("khôngcósảnphẩmnàotên_xyz123");
  await expect(page.getByText(/Không tìm thấy sản phẩm/i)).toBeVisible();
});

test("mở sản phẩm → modal chi tiết → Mua ngay → DemoBuyModal hiện form giao hàng", async ({ page }) => {
  await page.goto("/products");
  // Thẻ sản phẩm là <button> có <img>; tab danh mục không có img → phân biệt được
  await page.locator("main button:has(img)").first().click();
  // ProductModal hiện nút "Mua ngay — $..."
  const buyBtn = page.getByRole("button", { name: /Mua ngay/i });
  await expect(buyBtn).toBeVisible();
  await buyBtn.click();
  // DemoBuyModal — form giao hàng
  await expect(page.getByText(/Địa chỉ giao hàng/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Đặt hàng \(Demo\)/i })).toBeVisible();
});
