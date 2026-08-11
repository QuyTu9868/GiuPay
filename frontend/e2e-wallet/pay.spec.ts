// Flow 2: buyer thanh toán 1 đơn qua escrow trên Arc (approve + pay, 2 chữ ký MetaMask thật).
// Tạo đơn thẳng qua API (SP rẻ nhất: Rice Crackers $5) rồi vào /pay/{code} - bỏ qua trang SP cho chắc.
// LƯU Ý: chạy thật -> tạo đơn thật trên prod + khóa ~$5 USDC vào escrow 14 ngày.
import { test, expect } from "./dappwright.fixture";

const API = "https://giupay.onrender.com";
const GHN = "https://giupay-six.vercel.app/api/ghn-master";
const CHEAP_LISTING = "ac50f489-2e68-465a-87ea-981d74f00968"; // Rice Crackers $5

// Tìm 1 chuỗi tỉnh/huyện/xã CÓ data (bỏ qua entry dummy 0 con).
async function resolveShipChain(request: any) {
  const provs = (await (await request.get(`${GHN}?type=province`)).json()).data ?? [];
  for (const p of provs) {
    const dists = (await (await request.get(`${GHN}?type=district&province_id=${p.ProvinceID}`)).json()).data ?? [];
    for (const d of dists) {
      const wards = (await (await request.get(`${GHN}?type=ward&district_id=${d.DistrictID}`)).json()).data ?? [];
      if (wards.length > 0) {
        return { provinceId: p.ProvinceID, districtId: d.DistrictID, wardCode: wards[0].WardCode };
      }
    }
  }
  throw new Error("Không tìm được chuỗi tỉnh/huyện/xã có data GHN");
}

test("buyer approve + pay escrow trên Arc", async ({ wallet, page, request }) => {
  // 1) Tạo đơn qua API -> lấy order_code
  const buyRes = await request.post(`${API}/api/listings/${CHEAP_LISTING}/buy`);
  expect(buyRes.ok()).toBeTruthy();
  const { data } = await buyRes.json();
  const code = data.order_code;
  expect(code).toBeTruthy();

  // 2) Vào trang thanh toán
  await page.goto(`/pay/${code}`);
  await page.waitForTimeout(6000); // chờ fetch order (Render có thể cold)
  await page.screenshot({ path: "test-results/pay-page.png", fullPage: true });
  console.log("ORDER_CODE", code, "URL", page.url());

  // 3) Chọn chain Arc
  await page.getByRole("button", { name: /Arc Network/i }).click();

  // 4) Điền địa chỉ giao hàng. Tên + SĐT trước.
  await page.getByPlaceholder(/Nguyễn Văn A|John Doe/).fill("Test Buyer");
  await page.getByPlaceholder("0912 345 678").fill("0912345678");

  // Nếu app bật GHN (dropdown tỉnh/huyện/xã), chọn theo 1 chuỗi CÓ data thật.
  // Data GHN có nhiều entry rác (tỉnh/huyện dummy 0 con) nên resolve động qua API,
  // chọn theo value thay vì index để không vấp phải entry rỗng.
  const selects = page.locator("select");
  if ((await selects.count()) >= 3) {
    const chain = await resolveShipChain(request);
    await selects.nth(0).selectOption(String(chain.provinceId));
    await expect.poll(() => selects.nth(1).locator(`option[value="${chain.districtId}"]`).count())
      .toBeGreaterThan(0);
    await selects.nth(1).selectOption(String(chain.districtId));
    await expect.poll(() => selects.nth(2).locator(`option[value="${chain.wardCode}"]`).count())
      .toBeGreaterThan(0);
    await selects.nth(2).selectOption(String(chain.wardCode));
  }

  await page.getByPlaceholder(/Số nhà|House number|đầy đủ|Full delivery/).fill("123 Test Street");
  await page.screenshot({ path: "test-results/pay-ship.png", fullPage: true });

  // 5) Kết nối ví để thanh toán -> RainbowKit -> MetaMask -> duyệt
  await page.getByRole("button", { name: /Kết nối ví để thanh toán|Connect wallet to pay/i }).click();
  await page.getByText("MetaMask", { exact: true }).click();
  await wallet.approve();

  // 6) Sau connect: tới bước trả. Bấm "Trả trên dapp" nếu hiện, rồi "Thanh toán ngay".
  const payOnDapp = page.getByRole("button", { name: /Trả trên dapp|Pay on dapp/i });
  if (await payOnDapp.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await payOnDapp.click();
  }
  await page.getByRole("button", { name: /Thanh toán ngay|Pay now/i }).click();

  // 7) Ký 2 giao dịch: approve USDC rồi pay escrow.
  // confirmTransaction dùng context.waitForEvent("page") bắt popup MỚI, nên KHÔNG được chờ
  // giữa 2 lần gọi - phải gọi liền để lần 2 kịp "arm" listener trước khi popup pay bật
  // (popup pay tự mở sau khi approve mined, không do click). Chờ giữa -> lỡ event -> treo.
  await wallet.confirmTransaction(); // approve (popup 1)
  await wallet.confirmTransaction(); // pay (popup 2, bật sau khi approve mined)
  await page.screenshot({ path: "test-results/pay-after-sign.png", fullPage: true });

  // 8) Xong: hiện màn hình thanh toán thành công
  await expect(page.getByText(/Thanh toán thành công|Payment (complete|successful)|hoàn tất/i).first())
    .toBeVisible({ timeout: 120_000 });
});
