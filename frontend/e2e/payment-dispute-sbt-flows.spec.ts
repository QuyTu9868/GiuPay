import { test, expect, type Page } from "@playwright/test";
import { installMockWallet, getMockWalletCalls } from "./helpers/mock-wallet";
import { installMockRpc } from "./helpers/mock-rpc";

/**
 * GiuPay — Test luồng thanh toán (Arc trực tiếp + CCTP), tranh chấp, và xem SBT.
 * Đều cần ví kết nối THẬT (qua mock EIP-1193, xem helpers/mock-wallet.ts) + ký giao dịch
 * on-chain thật (qua helpers/mock-rpc.ts — chặn JSON-RPC HTTP để publicClient thấy tx
 * "đã mined" ngay, không cần chain thật).
 *
 * KHÔNG mô phỏng logic contract thật (không có state EVM thật đứng sau) — chỉ xác nhận:
 * app gọi ĐÚNG hàm/contract qua ví (assert qua getMockWalletCalls), UI chuyển step đúng,
 * và gọi đúng API backend ở đúng thời điểm.
 */

const SELLER = "0x" + "11".repeat(18) + "aaaa"; // shop_wallet
const BUYER  = "0x" + "22".repeat(18) + "bbbb";

const ESCROW = process.env.NEXT_PUBLIC_ESCROW_CONTRACT ?? "0x38800A873C6bC877E025529D0798ae57cBFAaA69";

function mockOrder(overrides: Record<string, any> = {}) {
  return {
    order_code: "PDS-001",
    product_name: "Tai nghe test",
    product_image_cid: null,
    description: "Đơn test flow thanh toán/tranh chấp",
    price_usdc: "100.00",
    quantity: 1,
    warranty_days: 90,
    shop_id: "demo-1",
    shop_name: "TechZone Store",
    shop_avg_rating: "5",
    shop_verified: true,
    shop_return_policy: "Đổi trả trong 7 ngày",
    shop_wallet: SELLER,
    status: "pending_payment",
    bridge_status: null,
    ...overrides,
  };
}

async function mockGhnEmpty(page: Page) {
  // Không có GHN_TOKEN thật trong môi trường test -> ép form về chế độ địa chỉ tự do
  // (bỏ qua chọn tỉnh/huyện/xã) để test không phải mock thêm 3 tầng dropdown GHN.
  await page.route("**/api/ghn-master**", (route) =>
    route.fulfill({ json: { success: true, data: [] } })
  );
}

/** Backend mock dùng chung — order state đổi được qua closure `state` để mô phỏng polling */
function backendMock(page: Page, state: { order: any; disputes?: any[] }) {
  return page.route("**://localhost:3001/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    if (path === "/api/shops/me") {
      const wallet = (req.headers()["x-wallet-address"] ?? "").toLowerCase();
      if (wallet === SELLER.toLowerCase()) {
        return route.fulfill({ json: { success: true, data: { id: "demo-1", name: "TechZone Store", status: "verified" } } });
      }
      return route.fulfill({ status: 404, json: { success: false, error: "not_found" } });
    }

    if (path === `/api/orders/${state.order.order_code}/dispute` && method === "GET") {
      return route.fulfill({ json: { success: true, data: state.disputes ?? [] } });
    }
    if (path === `/api/orders/${state.order.order_code}/ensure-onchain-dispute`) {
      return route.fulfill({ json: { success: true } });
    }
    if (path === "/api/shops/me/dispute-response") {
      const body = req.postDataJSON();
      return route.fulfill({ json: { success: true, message: "Đã gửi phản hồi.", _received: body } });
    }

    if (path === `/api/orders/${state.order.order_code}/shipping`) {
      return route.fulfill({ json: { success: true } });
    }
    if (path === `/api/orders/${state.order.order_code}/bridge-start`) {
      state.order = { ...state.order, bridge_status: "pending" };
      // Mô phỏng cctp-relayer.ts đã mint+nộp escrow xong ngay lần poll kế tiếp
      setTimeout(() => { state.order = { ...state.order, status: "in_escrow", bridge_status: null }; }, 300);
      return route.fulfill({ json: { success: true } });
    }
    if (path === `/api/orders/${state.order.order_code}/status` && method === "PUT") {
      state.order = { ...state.order, status: "in_escrow" };
      return route.fulfill({ json: { success: true } });
    }
    if (/^\/api\/orders\/[^/]+$/.test(path) && method === "GET") {
      return route.fulfill({ json: { success: true, data: state.order } });
    }

    if (path.startsWith("/api/shops")) {
      return route.fulfill({ json: { success: true, data: { shops: [] } } });
    }
    return route.fulfill({ json: { success: true, data: {} } });
  });
}

async function fillMinimalShipping(page: Page) {
  await page.getByPlaceholder(/Nguyễn Văn A|John Doe/).fill("Nguyen Van Test");
  await page.getByPlaceholder("0912 345 678").fill("0912345678");
  await page.getByPlaceholder(/Số nhà, tên đường|House number/).fill("123 Test Street");
}

test.describe("Thanh toán — Arc Network (escrow trực tiếp)", () => {
  test("buyer connect, chọn Arc, ký approve+pay -> escrow.pay() được gọi, đơn chuyển in_escrow", async ({ page }) => {
    const state = { order: mockOrder({ order_code: "PDS-ARC-01" }) };
    await installMockWallet(page, { address: BUYER, connected: true });
    await installMockRpc(page);
    await mockGhnEmpty(page);
    await backendMock(page, state);

    await page.goto("/pay/PDS-ARC-01");
    await expect(page.getByText(/Tai nghe test/i).first()).toBeVisible();

    await page.getByText("Arc Network").first().click();
    await fillMinimalShipping(page);

    const payBtn = page.getByText(/Trả trên dapp/i).first();
    await expect(payBtn).toBeEnabled({ timeout: 10_000 });
    await payBtn.click();

    // Bước "bridge" hiện nút "Trả ngay" (payNow) — bấm để thực sự ký approve+pay
    await page.getByText(/Thanh toán ngay|Pay now/i).first().click();

    await expect(page.getByText(/Thanh toán thành công|Payment successful|Hoàn tất/i).first())
      .toBeVisible({ timeout: 20_000 });

    const calls = await getMockWalletCalls(page);
    const sent = calls.filter((c) => c.method === "eth_sendTransaction");
    expect(sent.length).toBeGreaterThanOrEqual(2); // approve() + pay()
    // pay() gọi thẳng vào escrow contract đã whitelist
    const toEscrow = sent.some((c) => (c.params?.[0]?.to ?? "").toLowerCase() === ESCROW.toLowerCase());
    expect(toEscrow).toBe(true);
  });
});

test.describe("Thanh toán — CCTP (Ethereum Sepolia -> Arc)", () => {
  test("buyer connect, chọn Ethereum, ký approve+depositForBurn -> backend nhận bridge-start", async ({ page }) => {
    const state = { order: mockOrder({ order_code: "PDS-ETH-01" }) };
    await installMockWallet(page, { address: BUYER, connected: true });
    await installMockRpc(page);
    await mockGhnEmpty(page);
    await backendMock(page, state);

    let bridgeStartCalled = false;
    await page.route("**://localhost:3001/api/orders/PDS-ETH-01/bridge-start", async (route) => {
      bridgeStartCalled = true;
      state.order = { ...state.order, bridge_status: "pending" };
      setTimeout(() => { state.order = { ...state.order, status: "in_escrow", bridge_status: null }; }, 300);
      await route.fulfill({ json: { success: true } });
    });

    await page.goto("/pay/PDS-ETH-01");
    await page.getByText("Ethereum", { exact: true }).click();
    await fillMinimalShipping(page);

    const payBtn = page.getByText(/Trả trên dapp/i).first();
    await expect(payBtn).toBeEnabled({ timeout: 10_000 });
    await payBtn.click();
    await page.getByText(/Thanh toán ngay|Pay now/i).first().click();

    await expect(page.getByText(/Thanh toán thành công|Payment successful|Hoàn tất/i).first())
      .toBeVisible({ timeout: 30_000 });

    expect(bridgeStartCalled).toBe(true);
    const calls = await getMockWalletCalls(page);
    const switched = calls.filter((c) => c.method === "wallet_switchEthereumChain");
    // Phải chuyển sang Sepolia (11155111 = 0xaa36a7) trước khi ký
    expect(switched.some((c) => c.params?.[0]?.chainId === "0xaa36a7")).toBe(true);
  });
});

test.describe("Thanh toán — Arbitrum + OP (chain từng thiếu trong wagmi config)", () => {
  // Trước fix (2026-07-17): wagmiConfig.chains chỉ khai [arcTestnet, sepolia, baseSepolia,
  // polygonAmoy, bscTestnet] — THIẾU Arbitrum Sepolia (421614) và OP Sepolia (11155420) dù
  // PaymentPage cho buyer chọn 2 mạng này. switchChainAsync() throw ChainNotConfiguredError
  // ngay -> buyer chọn Arbitrum/OP thanh toán fail 100%, chưa kịp ký gì. Đã fix trong
  // wagmi.config.ts (thêm arbitrumSepolia + optimismSepolia) — test này giờ xác nhận
  // thanh toán qua 2 mạng đó chạy được bình thường như các mạng khác.
  test("chọn Arbitrum -> ký approve+depositForBurn thành công (không còn lỗi ChainNotConfigured)", async ({ page }) => {
    const state = { order: mockOrder({ order_code: "PDS-ARB-01" }) };
    await installMockWallet(page, { address: BUYER, connected: true });
    await installMockRpc(page);
    await mockGhnEmpty(page);
    await backendMock(page, state);

    await page.goto("/pay/PDS-ARB-01");
    await page.getByText("Arbitrum", { exact: true }).click();
    await fillMinimalShipping(page);
    await page.getByText(/Trả trên dapp/i).first().click();
    await page.getByText(/Thanh toán ngay|Pay now/i).first().click();

    await expect(page.getByText(/Thanh toán thành công|Payment successful/i).first())
      .toBeVisible({ timeout: 20_000 });

    const calls = await getMockWalletCalls(page);
    const switched = calls.filter((c) => c.method === "wallet_switchEthereumChain");
    // Arbitrum Sepolia 421614 = 0x66eee
    expect(switched.some((c) => c.params?.[0]?.chainId === "0x66eee")).toBe(true);
  });

  test("chọn OP Mainnet -> ký approve+depositForBurn thành công (không còn lỗi ChainNotConfigured)", async ({ page }) => {
    const state = { order: mockOrder({ order_code: "PDS-OP-01" }) };
    await installMockWallet(page, { address: BUYER, connected: true });
    await installMockRpc(page);
    await mockGhnEmpty(page);
    await backendMock(page, state);

    await page.goto("/pay/PDS-OP-01");
    await page.getByText("OP Mainnet", { exact: true }).click();
    await fillMinimalShipping(page);
    await page.getByText(/Trả trên dapp/i).first().click();
    await page.getByText(/Thanh toán ngay|Pay now/i).first().click();

    await expect(page.getByText(/Thanh toán thành công|Payment successful/i).first())
      .toBeVisible({ timeout: 20_000 });

    const calls = await getMockWalletCalls(page);
    const switched = calls.filter((c) => c.method === "wallet_switchEthereumChain");
    // OP Sepolia 11155420 = 0xaa37dc
    expect(switched.some((c) => c.params?.[0]?.chainId === "0xaa37dc")).toBe(true);
  });
});

test.describe("Thanh toán — Base (đã có sẵn trong wagmi config)", () => {
  test("chọn Base -> ký approve+depositForBurn thành công", async ({ page }) => {
    const state = { order: mockOrder({ order_code: "PDS-BASE-01" }) };
    await installMockWallet(page, { address: BUYER, connected: true });
    await installMockRpc(page);
    await mockGhnEmpty(page);
    await backendMock(page, state);

    await page.goto("/pay/PDS-BASE-01");
    await page.getByText("Base", { exact: true }).click();
    await fillMinimalShipping(page);
    await page.getByText(/Trả trên dapp/i).first().click();
    await page.getByText(/Thanh toán ngay|Pay now/i).first().click();

    await expect(page.getByText(/Thanh toán thành công|Payment successful/i).first())
      .toBeVisible({ timeout: 20_000 });

    const calls = await getMockWalletCalls(page);
    const switched = calls.filter((c) => c.method === "wallet_switchEthereumChain");
    // Base Sepolia 84532 = 0x14a34
    expect(switched.some((c) => c.params?.[0]?.chainId === "0x14a34")).toBe(true);
  });
});

test.describe("Tranh chấp — Shop đồng ý hoàn tiền (on-chain)", () => {
  test("shop connect, tick đồng ý hoàn tiền, ký refundByShop() -> gửi phản hồi kèm tx_hash", async ({ page }) => {
    const order = mockOrder({ order_code: "PDS-DISPUTE-01", status: "disputed" });
    const dispute = { id: "d-1", reason: "Sản phẩm lỗi", status: "open", opened_at: new Date().toISOString() };
    const state = { order, disputes: [dispute] };

    await installMockWallet(page, { address: SELLER, connected: true });
    await installMockRpc(page);
    await backendMock(page, state);

    let receivedBody: any = null;
    await page.route("**://localhost:3001/api/shops/me/dispute-response", async (route) => {
      receivedBody = route.request().postDataJSON();
      await route.fulfill({ json: { success: true, message: "Đã gửi phản hồi." } });
    });

    await page.goto("/dashboard/disputes/PDS-DISPUTE-01");
    await expect(page.getByText("Sản phẩm lỗi")).toBeVisible({ timeout: 10_000 });

    await page.locator("textarea").fill("Đồng ý hoàn tiền cho khách vì lỗi sản phẩm.");
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: /Xác nhận hoàn tiền|Confirm refund/i }).click();

    await expect(page.getByText(/Đã gửi phản hồi/i)).toBeVisible({ timeout: 20_000 });

    expect(receivedBody?.agree_refund).toBe(true);
    expect(receivedBody?.tx_hash).toBeTruthy();

    const calls = await getMockWalletCalls(page);
    const sent = calls.filter((c) => c.method === "eth_sendTransaction");
    expect(sent.length).toBeGreaterThanOrEqual(1);
    expect((sent[0].params?.[0]?.to ?? "").toLowerCase()).toBe(ESCROW.toLowerCase());
  });

  test("shop từ chối hoàn tiền -> gửi phản hồi KHÔNG ký tx nào (không đụng ví)", async ({ page }) => {
    const order = mockOrder({ order_code: "PDS-DISPUTE-02", status: "disputed" });
    const dispute = { id: "d-2", reason: "Giao hàng chậm", status: "open", opened_at: new Date().toISOString() };
    const state = { order, disputes: [dispute] };

    await installMockWallet(page, { address: SELLER, connected: true });
    await installMockRpc(page);
    await backendMock(page, state);

    let receivedBody: any = null;
    await page.route("**://localhost:3001/api/shops/me/dispute-response", async (route) => {
      receivedBody = route.request().postDataJSON();
      await route.fulfill({ json: { success: true, message: "Đã gửi phản hồi." } });
    });

    await page.goto("/dashboard/disputes/PDS-DISPUTE-02");
    await expect(page.getByText("Giao hàng chậm")).toBeVisible({ timeout: 10_000 });

    // KHÔNG tick "đồng ý hoàn tiền" -> submit chỉ gửi phản hồi text, không ký on-chain
    await page.locator("textarea").fill("Đơn đã giao, buyer xác nhận nhầm địa chỉ cũ.");
    await page.getByRole("button", { name: /Gửi phản hồi|Submit response/i }).click();

    await expect(page.getByText(/Đã gửi phản hồi/i)).toBeVisible({ timeout: 10_000 });

    expect(receivedBody?.agree_refund).toBe(false);
    expect(receivedBody?.tx_hash).toBeUndefined();

    const calls = await getMockWalletCalls(page);
    expect(calls.filter((c) => c.method === "eth_sendTransaction")).toHaveLength(0);
  });
});

test.describe("SBT — hiển thị warranty SBT trong Profile", () => {
  test("chưa có đơn nào mint SBT -> tab SBT hiện trạng thái rỗng", async ({ page }) => {
    await installMockWallet(page, { address: BUYER, connected: true });
    await installMockRpc(page, { sbtBalance: 0 });
    await page.route("**://localhost:3001/**", (route) =>
      route.fulfill({ json: { success: true, data: { orders: [] } } })
    );

    await page.goto("/profile");
    await page.getByRole("button", { name: /SBT/i }).click();
    await expect(page.getByText("Bạn chưa có SBT nào.")).toBeVisible();
  });

  // Bug thật (2026-07-17): SBT được mint GẮN VỚI 1 ĐƠN HÀNG CỤ THỂ (bot.ts mintWarrantySBT
  // -> orders.sbt_token_id, xem backend/src/bot.ts:224-231 + sbt-chain.ts orderToToken()).
  // Nhưng tab "SBT của tôi" trong Profile chỉ đếm balanceOf() rồi vẽ thẻ giả "SBT #1..#N" —
  // KHÔNG hiện tên sản phẩm/mã đơn/token id thật, dù dữ liệu đó đã có sẵn trong orders[]
  // (order.sbt_token_id, order.product_name, order.warranty_days). User connect ví, thấy
  // "có 2 SBT" nhưng không biết đó là SBT của đơn hàng nào.
  test("SBT của đơn hàng ĐÃ hoàn tất phải hiện tên sản phẩm + mã token thật, không phải placeholder rời rạc", async ({ page }) => {
    await installMockWallet(page, { address: BUYER, connected: true });
    await installMockRpc(page, { sbtBalance: 1 });

    const releasedOrder = {
      order_code: "SBT-ORDER-01",
      shop_name: "TechZone Store",
      shop_category: "Công nghệ",
      product_name: "Tai nghe chống ồn XM5",
      price_usdc: "199.00",
      quantity: 1,
      status: "released",
      warranty_days: 90,
      sbt_token_id: "42",
      created_at: new Date().toISOString(),
      has_review: false,
    };
    // Playwright: route đăng ký SAU được ưu tiên khớp trước — route cụ thể phải đăng ký
    // SAU route catch-all, không thì catch-all nuốt mất request /api/orders/buyer.
    await page.route("**://localhost:3001/**", (route) =>
      route.fulfill({ json: { success: true, data: {} } })
    );
    await page.route("**://localhost:3001/api/orders/buyer", (route) =>
      route.fulfill({ json: { success: true, data: { orders: [releasedOrder] } } })
    );

    await page.goto("/profile");
    await page.getByRole("button", { name: /SBT của tôi/i }).click();

    // Kỳ vọng: tab SBT phải cho biết SBT #42 là bằng chứng mua "Tai nghe chống ồn XM5"
    // (đơn SBT-ORDER-01) — hiện tại KHÔNG có, chỉ thấy "SBT #1" chung chung.
    await expect(page.getByText(/Tai nghe chống ồn XM5/i)).toBeVisible();
    await expect(page.getByText(/SBT #42|#42/i)).toBeVisible();
  });
});
