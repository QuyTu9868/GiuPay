import { test, expect, type Page } from "@playwright/test";
import { installMockWallet, setMockAccount, switchMockWalletIdentity } from "./helpers/mock-wallet";

/**
 * GiuPay — Test luồng kết nối ví THẬT (mock EIP-1193 provider, không cần MetaMask thật).
 *
 * CẬP NHẬT: đã BỎ trang /select-account (không còn bước chọn buyer/seller lúc connect).
 * Luồng mới: bấm "Kết nối ví" trên NavBar -> mở thẳng modal RainbowKit -> chọn ví.
 * Sau khi connect, NavBar (components/NavBar.tsx) tự dẫn ví có shop VERIFIED vào /shop/{id};
 * ví không có shop thì ở nguyên trang (mua bình thường). Đổi ví (switch account) thì KHÔNG
 * tự nhảy trang.
 *
 * Backend (localhost:3001) mock ở page-level (page.route) — chỉ test qua các trang fetch
 * dữ liệu client-side (/, /shops, /pay/:code).
 */

const SELLER = "0x" + "11".repeat(18) + "aaaa";
const BUYER  = "0x" + "22".repeat(18) + "bbbb";

const PAY_ORDER = {
  order_code: "TZ-PAY-01",
  product_name: "iPhone 15 Pro Max",
  product_image_cid: null,
  description: "Đơn hàng test luồng thanh toán có ví",
  price_usdc: "999.00",
  quantity: 1,
  warranty_days: 180,
  shop_id: "demo-1",
  shop_name: "TechZone Store",
  shop_avg_rating: "5",
  shop_verified: true,
  shop_return_policy: "Đổi trả trong 7 ngày",
  shop_wallet: SELLER,
  status: "pending_payment",
  bridge_status: null,
};

/** Mock mọi request tới backend — /api/shops/me trả theo đúng ví đang gọi (header X-Wallet-Address) */
async function mockBackend(page: Page, shopByWallet: Record<string, any> = {}) {
  await page.route("**://localhost:3001/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;

    if (path === "/api/shops/me") {
      const wallet = (req.headers()["x-wallet-address"] ?? "").toLowerCase();
      const shop = shopByWallet[wallet];
      if (shop) return route.fulfill({ json: { success: true, data: shop } });
      return route.fulfill({ status: 404, json: { success: false, error: "not_found" } });
    }

    if (/^\/api\/orders\/[^/]+$/.test(path)) {
      return route.fulfill({ json: { success: true, data: PAY_ORDER } });
    }

    if (path.startsWith("/api/shops")) {
      return route.fulfill({ json: { success: true, data: { shops: [] } } });
    }

    return route.fulfill({ json: { success: true, data: {} } });
  });
}

/**
 * Luồng connect mới: bấm nút "Kết nối ví" trên NavBar -> modal RainbowKit mở ra ->
 * chọn ví giả (announce EIP-6963 với rdns "me.rainbow", hiện dưới tên "Rainbow" — app đã tắt
 * multiInjectedProviderDiscovery, chỉ nhận diện đúng 4 ví chọn tay, xem mock-wallet.ts).
 * Không còn qua /select-account.
 */
async function connectWallet(page: Page) {
  await page.getByRole("button", { name: /Kết nối ví|Connect wallet/i }).first().click();
  const walletTile = page.getByRole("button", { name: /Rainbow/i }).first();
  await expect(walletTile).toBeVisible({ timeout: 10_000 });
  await walletTile.click();
}

test.describe("Ví — connect ví có shop verified", () => {
  test("connect ví sở hữu shop verified -> tự chuyển vào /shop/{id}", async ({ page }) => {
    await installMockWallet(page, { address: SELLER, connected: false });
    await mockBackend(page, {
      [SELLER]: { id: "seller-shop-1", name: "Seller Test Shop", status: "verified" },
    });

    await page.goto("/");
    await connectWallet(page);

    await expect(page).toHaveURL(/\/shop\/seller-shop-1$/, { timeout: 15_000 });
  });
});

test.describe("Ví — connect ví không có shop (buyer)", () => {
  test("connect ví không có shop -> ở lại trang chủ, NavBar hiện địa chỉ ví", async ({ page }) => {
    await installMockWallet(page, { address: BUYER, connected: false });
    await mockBackend(page); // không ví nào có shop -> 404

    await page.goto("/");
    await connectWallet(page);

    // NavBar hiện địa chỉ rút gọn của buyer sau khi connect
    await expect(page.getByText(new RegExp(BUYER.slice(0, 6), "i")).first())
      .toBeVisible({ timeout: 15_000 });
    // KHÔNG bị điều hướng đi đâu (ví không có shop -> ở nguyên trang chủ)
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("Ví — đổi ví giữa các trang (seller <-> buyer)", () => {
  test("connect verified seller -> /shop; đổi ví sang buyer, sang /shops nhận đúng ví buyer", async ({ page }) => {
    await installMockWallet(page, { address: SELLER, connected: false });
    await mockBackend(page, {
      [SELLER]: { id: "seller-shop-1", name: "Seller Test Shop", status: "verified" },
    });

    // 1) Connect verified seller -> tự vào /shop/{id}
    await page.goto("/");
    await connectWallet(page);
    await expect(page).toHaveURL(/\/shop\/seller-shop-1$/, { timeout: 15_000 });

    // 2) "Đổi ví" sang buyer cho lần load trang tiếp theo (ghi localStorage mock provider)
    await switchMockWalletIdentity(page, BUYER);

    // 3) Sang trang khác -> wagmi reconnect qua injected connector, đọc ví buyer mới
    await page.goto("/shops");
    await expect(page.getByText(new RegExp(BUYER.slice(0, 6), "i")).first())
      .toBeVisible({ timeout: 15_000 });
    // Buyer không sở hữu shop -> không có nút "Shop của tôi"
    await expect(page.getByText("Shop của tôi", { exact: true })).toHaveCount(0);
  });
});

test.describe("Ví — đổi account ngay trên 1 trang (không reload)", () => {
  test("connect trên trang chủ, đổi account live -> NavBar cập nhật ngay", async ({ page }) => {
    await installMockWallet(page, { address: SELLER, connected: false });
    await mockBackend(page); // không ví nào có shop -> connect xong ở nguyên trang chủ

    await page.goto("/");
    await connectWallet(page);
    await expect(page.getByText(new RegExp(SELLER.slice(0, 6), "i")).first())
      .toBeVisible({ timeout: 15_000 });

    // Đổi account NGAY trên trang này (accountsChanged) — không reload
    await setMockAccount(page, BUYER);
    await expect(page.getByText(new RegExp(BUYER.slice(0, 6), "i")).first())
      .toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Ví — Buyer đã kết nối trên trang thanh toán", () => {
  test("ví đã connect sẵn -> hiện nút 'Trả trên dapp' thay vì 'Kết nối ví để thanh toán'", async ({ page }) => {
    await installMockWallet(page, { address: BUYER, connected: true });
    await mockBackend(page);

    await page.goto("/pay/TZ-PAY-01");
    await expect(page.getByText(/iPhone 15 Pro Max/i).first()).toBeVisible();

    await page.getByText("Arc Network").first().click();
    await expect(page.getByText(/Trả trên dapp/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Kết nối ví để thanh toán/i)).toHaveCount(0);
  });
});
