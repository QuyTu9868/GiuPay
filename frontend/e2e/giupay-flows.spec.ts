import { test, expect, type Page } from "@playwright/test";

/**
 * GiuPay — Smoke test toàn bộ luồng (1 file)
 * ---------------------------------------------------------------------------
 * Mục tiêu: kiểm tra mỗi luồng chính MỞ ĐƯỢC và điều hướng đúng.
 * KHÔNG test ví (MetaMask) — chỗ nào cần ví thì chỉ kiểm tra tới bước
 * "hiện nút Kết nối ví". Backend (localhost:3001) được MOCK (giả lập),
 * nên không cần bật backend/database thật để chạy.
 *
 * Cách chạy:
 *   npx playwright test          (Playwright tự bật `next dev` giúp)
 *   npx playwright test --ui     (chạy có giao diện xem trực quan)
 * ---------------------------------------------------------------------------
 */

// ── Dữ liệu đơn hàng giả để trả cho GET /api/orders/:code ───────────────────
// Fields dùng snake_case vì frontend map từ data.order_code, data.product_name...
const FAKE_ORDER = {
  order_code: "TZ-001",
  product_name: "MacBook Air M3 13\"",
  product_image_cid: null,
  description: "Đơn hàng demo dùng cho test",
  price_usdc: "1299.00",
  quantity: 1,
  warranty_days: 365,
  shop_id: "demo-1",
  shop_name: "TechZone Store",
  shop_avg_rating: "5",
  shop_verified: true,
  shop_return_policy: "Đổi trả trong 7 ngày",
  status: "released", // ReviewPage yêu cầu "released" mới cho đánh giá
  buyer_wallet: "0xabc1230000000000000000000000000000000def",
  escrow_released_at: "2024-06-01T08:00:00Z",
  has_review: false,
};

/**
 * Giả lập backend: chặn mọi request tới localhost:3001 và trả JSON hợp lệ.
 * Nhờ vậy các trang không "treo" chờ backend thật.
 */
async function mockBackend(page: Page) {
  await page.route("**://localhost:3001/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    // Chi tiết đơn hàng — dùng cho trang Thanh toán & Đánh giá
    if (/^\/api\/orders\/[^/]+$/.test(path)) {
      return route.fulfill({ json: { success: true, data: FAKE_ORDER } });
    }

    // "Ví này có shop chưa?" — chưa kết nối ví nên trả không có
    if (path === "/api/shops/me") {
      return route.fulfill({ status: 404, json: { success: false, error: "not_found" } });
    }

    // Danh sách shop
    if (path.startsWith("/api/shops")) {
      return route.fulfill({ json: { success: true, data: { shops: [] } } });
    }

    // Mặc định: trả rỗng nhưng hợp lệ để trang không lỗi
    return route.fulfill({ json: { success: true, data: {} } });
  });
}

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. TRANG CHỦ
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Trang chủ", () => {
  test("mở được: hiện hero + nút kết nối ví", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Thanh toán onchain/i)).toBeVisible();
    // Trang chủ đã đổi sang 1 CTA "Kết nối ví" duy nhất (bỏ 2 CTA + link /shops, /register cũ).
    // Điều hướng /shops, /products test ở shops-extra.spec.ts / products.spec.ts.
    await expect(page.getByRole("button", { name: /Kết nối ví|Connect wallet/i }).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DANH SÁCH SHOP (public)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Danh sách shop", () => {
  test("hiện tiêu đề + bộ lọc danh mục + có shard shop", async ({ page }) => {
    await page.goto("/shops");
    await expect(page.getByRole("heading", { name: /Khám phá cửa hàng/i })).toBeVisible();
    // Bộ lọc danh mục
    await expect(page.getByText("Tất cả", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Công nghệ", { exact: true }).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TRANG SHOP PUBLIC (dùng demo shop, không cần backend)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Trang shop public", () => {
  test("shop demo-1 (TechZone Store) hiện tên shop + sản phẩm", async ({ page }) => {
    await page.goto("/shop/demo-1");
    await expect(page.getByRole("heading", { name: "TechZone Store" })).toBeVisible();
    // Có ít nhất 1 sản phẩm demo
    await expect(page.getByText(/MacBook Air M3/i).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (ĐÃ BỎ) "Chọn loại tài khoản" — trang /select-account đã xóa; luồng connect ví
// giờ mở thẳng modal RainbowKit, test ở wallet-flows.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 5. ĐĂNG KÝ SHOP (form 3 bước)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Đăng ký shop", () => {
  test("mở được và hiện form bước 1 (Thông tin)", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText(/Đăng ký cửa hàng/i).first()).toBeVisible();
    await expect(page.getByText("Thông tin", { exact: true }).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. DASHBOARD SHOP (chưa kết nối ví → dashboard/index.tsx tự router.replace("/"))
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Dashboard shop", () => {
  test("chưa kết nối ví -> tự chuyển về trang chủ", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: /Kết nối ví|Connect wallet/i }).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (ĐÃ BỎ) "Tạo đơn hàng" — trang /dashboard/create-order đã xóa.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 8. THANH TOÁN (order mock)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Trang thanh toán", () => {
  // FAKE_ORDER dùng status "released" (để Trang đánh giá test được) — PaymentPage coi
  // status != "pending_payment" là "đã thanh toán rồi", chặn hiện form trả tiền. 2 test
  // dưới cần override riêng về "pending_payment" mới thấy đúng màn hình thanh toán.
  test.beforeEach(async ({ page }) => {
    await page.route("**://localhost:3001/api/orders/TZ-001", (route) =>
      route.fulfill({ json: { success: true, data: { ...FAKE_ORDER, status: "pending_payment" } } })
    );
  });

  test("load đơn hàng và hiện thông tin sản phẩm", async ({ page }) => {
    await page.goto("/pay/TZ-001");
    // Sau khi mock trả đơn hàng → hiện tên sản phẩm
    await expect(page.getByText(/MacBook Air M3/i).first()).toBeVisible();
    // Không rơi vào trạng thái "không có đơn hàng"
    await expect(page.getByText("TechZone Store").first()).toBeVisible();
  });

  test("chưa kết nối ví: vẫn hiện lựa chọn trả bằng quét QR", async ({ page }) => {
    await page.goto("/pay/TZ-001");
    // Chọn 1 chain để bật các nút thanh toán
    await page.getByText("Arc Network").first().click();
    // Nút quét QR luôn hiện (WalletConnect) dù chưa kết nối ví
    await expect(page.getByText(/QR/i).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. ĐÁNH GIÁ (order mock, status = released)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Trang đánh giá", () => {
  test("hiện form đánh giá cho đơn đã hoàn tất", async ({ page }) => {
    await page.goto("/review/TZ-001");
    await expect(page.getByText(/Đánh giá sản phẩm/i).first()).toBeVisible();
    await expect(page.getByText(/MacBook Air M3/i).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. ADMIN (Auth0 + 2FA — chỉ kiểm tra màn hình đăng nhập hiện ra)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin", () => {
  test("hiện màn hình đăng nhập admin (email + 2FA)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("GiuPay Admin")).toBeVisible();
    await expect(page.getByPlaceholder("admin@example.com")).toBeVisible();
    await expect(page.getByText("Đăng nhập", { exact: true })).toBeVisible();
  });
});
