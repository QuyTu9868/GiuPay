import { test, expect, type Page } from "@playwright/test";

/**
 * Đăng ký shop — validation + luồng nộp đơn.
 * Phủ regression cho các bug đã sửa:
 *  - Trang register có tiêu đề "Đăng ký cửa hàng" (key i18n trước đây chưa render)
 *  - Nút "Bỏ qua & Nộp đơn" ở bước 2 (upload là tùy chọn)
 *  - Báo lỗi khi CHƯA kết nối ví (trước đây silent-fail: vẫn nhảy sang bước 3)
 */

async function mockBackend(page: Page) {
  await page.route("**://localhost:3001/**", (route) =>
    route.fulfill({ json: { success: true, data: {} } }));
}

test.beforeEach(async ({ page }) => { await mockBackend(page); });

test("hiện tiêu đề trang + form bước 1", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByText(/Đăng ký cửa hàng/i).first()).toBeVisible();
  await expect(page.getByText("Thông tin", { exact: true }).first()).toBeVisible();
});

test("bấm Tiếp tục khi form trống → hiện lỗi validation, ở lại bước 1", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: /Tiếp theo/i }).click();
  await expect(page.getByText(/Tên shop không được trống/i)).toBeVisible();
  // Vẫn ở bước 1 (chưa sang bước tài liệu)
  await expect(page.getByText(/Kéo thả hoặc click/i)).toHaveCount(0);
});

test("điền hợp lệ → sang bước 2 (tài liệu) và có nút Bỏ qua & Nộp đơn", async ({ page }) => {
  await page.goto("/register");
  await page.getByPlaceholder("VD: Thời Trang Linh").fill("Shop Test E2E");
  await page.locator("select").selectOption({ label: "Công nghệ" });
  await page.getByPlaceholder(/Mô tả sản phẩm/i).fill("Mô tả shop dùng cho kiểm thử tự động");
  await page.getByPlaceholder("shop@gmail.com").fill("shoptest@gmail.com");
  await page.getByRole("button", { name: /Tiếp theo/i }).click();

  // Bước 2: upload tài liệu — có nút bỏ qua
  await expect(page.getByText(/Kéo thả hoặc click/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Bỏ qua & Nộp đơn/i })).toBeVisible();
});

test("bấm Bỏ qua & Nộp đơn khi CHƯA có ví → báo lỗi kết nối ví (không silent-fail)", async ({ page }) => {
  await page.goto("/register");
  await page.getByPlaceholder("VD: Thời Trang Linh").fill("Shop Test E2E");
  await page.locator("select").selectOption({ label: "Công nghệ" });
  await page.getByPlaceholder(/Mô tả sản phẩm/i).fill("Mô tả shop dùng cho kiểm thử tự động");
  await page.getByPlaceholder("shop@gmail.com").fill("shoptest@gmail.com");
  await page.getByRole("button", { name: /Tiếp theo/i }).click();

  await page.getByRole("button", { name: /Bỏ qua & Nộp đơn/i }).click();
  // Vì test không kết nối ví → phải hiện lỗi, KHÔNG nhảy sang bước "Hoàn tất"
  await expect(page.getByText(/Chưa kết nối ví/i)).toBeVisible();
});
