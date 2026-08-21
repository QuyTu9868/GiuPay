// Chẩn đoán trực tiếp trên production: flow thanh toán CCTP (Ethereum Sepolia -> Arc).
// User báo "hỏng từ nãy giờ". Không đoán - quan sát từng popup MetaMask thật, chụp lại.
import { test, expect } from "./dappwright.fixture";

const API = "https://giupay.onrender.com";
const CHEAP_LISTING = "ac50f489-2e68-465a-87ea-981d74f00968"; // Rice Crackers $5
const GHN = "https://giupay-six.vercel.app/api/ghn-master";

async function resolveShipChain(request: any) {
  const provs = (await (await request.get(`${GHN}?type=province`)).json()).data ?? [];
  for (const p of provs) {
    const dists = (await (await request.get(`${GHN}?type=district&province_id=${p.ProvinceID}`)).json()).data ?? [];
    for (const d of dists) {
      const wards = (await (await request.get(`${GHN}?type=ward&district_id=${d.DistrictID}`)).json()).data ?? [];
      if (wards.length > 0) return { provinceId: p.ProvinceID, districtId: d.DistrictID, wardCode: wards[0].WardCode };
    }
  }
  throw new Error("no ghn chain with data");
}

test("chẩn đoán CCTP: buyer connect, chọn Ethereum, ký approve+depositForBurn", async ({ wallet, page, request }) => {
  test.setTimeout(360_000);
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push("CONSOLE: " + m.text()); });

  const buyRes = await request.post(`${API}/api/listings/${CHEAP_LISTING}/buy`);
  const { data } = await buyRes.json();
  const code = data.order_code;
  console.log("ORDER", code);

  await page.goto(`/pay/${code}`);
  await page.getByRole("button", { name: /Arc Network/i }).waitFor({ timeout: 15000 });
  await page.getByText("Ethereum", { exact: true }).click();

  await page.getByPlaceholder(/Nguyễn Văn A|John Doe/).fill("Test Buyer");
  await page.getByPlaceholder("0912 345 678").fill("0912345678");
  const selects = page.locator("select");
  if ((await selects.count()) >= 3) {
    const chain = await resolveShipChain(request);
    await selects.nth(0).selectOption(String(chain.provinceId));
    await expect.poll(() => selects.nth(1).locator(`option[value="${chain.districtId}"]`).count()).toBeGreaterThan(0);
    await selects.nth(1).selectOption(String(chain.districtId));
    await expect.poll(() => selects.nth(2).locator(`option[value="${chain.wardCode}"]`).count()).toBeGreaterThan(0);
    await selects.nth(2).selectOption(String(chain.wardCode));
  }
  await page.getByPlaceholder(/Số nhà|House number|đầy đủ|Full delivery/).fill("123 Test Street");
  await page.screenshot({ path: "cctp-check-1-filled.png", fullPage: true });

  // Connect
  await page.getByRole("button", { name: /Kết nối ví để thanh toán|Connect wallet to pay/i }).click();
  await page.getByText("MetaMask", { exact: true }).click();
  await wallet.approve();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "cctp-check-2-after-connect.png", fullPage: true });
  console.log("PAGE TEXT AFTER CONNECT:", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400));

  // Sang bước trả (nếu có nút trung gian)
  const payOnDapp = page.getByRole("button", { name: /Trả trên dapp|Pay on dapp/i });
  if (await payOnDapp.isVisible({ timeout: 8000 }).catch(() => false)) {
    await payOnDapp.click();
  }
  const payNow = page.getByRole("button", { name: /Thanh toán ngay|Pay now/i }).first();
  await payNow.waitFor({ timeout: 15000 });
  await payNow.click();

  // CCTP cần đổi mạng sang Ethereum Sepolia trước khi ký approve+depositForBurn -> có thể
  // sinh thêm 1 popup đổi mạng trước 2 popup ký. Thử approve() cho popup đổi mạng (nếu có),
  // không chặn cả bài nếu không có popup nào (timeout ngắn qua Promise.race).
  async function tryApprove(label: string, timeoutMs: number) {
    console.log(`[${label}] chờ tối đa ${timeoutMs}ms...`);
    const res = await Promise.race([
      wallet.approve().then(() => "approved"),
      new Promise((r) => setTimeout(() => r("timeout"), timeoutMs)),
    ]);
    console.log(`[${label}] ->`, res);
    return res;
  }

  await tryApprove("switch-network-or-approve-tx-1", 15000);
  await page.screenshot({ path: "cctp-check-3-after-signal-1.png", fullPage: true });
  await tryApprove("approve-tx-2", 20000);
  await page.screenshot({ path: "cctp-check-4-after-signal-2.png", fullPage: true });
  await tryApprove("depositForBurn-tx-3", 20000);
  await page.screenshot({ path: "cctp-check-5-after-signal-3.png", fullPage: true });

  await page.waitForTimeout(4000);
  await page.screenshot({ path: "cctp-check-6-final.png", fullPage: true });
  console.log("PAGE TEXT FINAL:", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 600));
  console.log("CONSOLE ERRORS:", consoleErrors.length ? JSON.stringify(consoleErrors, null, 2) : "none");
});
