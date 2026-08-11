// Flow 1: buyer kết nối MetaMask thật vào GiuPay + đổi sang Arc Testnet.
import { test, expect } from "./dappwright.fixture";

test("buyer kết nối MetaMask + Arc network", async ({ wallet, page }) => {
  await page.goto("/shops");

  // Nút "Kết nối ví" (vi) hoặc "Connect wallet" (en) trên NavBar.
  await page.getByRole("button", { name: /Kết nối ví|Connect wallet/i }).first().click();

  // Modal RainbowKit -> chọn MetaMask.
  await page.getByText("MetaMask", { exact: true }).click();

  // MetaMask popup -> duyệt kết nối.
  await wallet.approve();

  // Kết nối xong: NavBar hiện địa chỉ ví rút gọn dạng 0xABCD...1234.
  // (addNetwork ở fixture đã thêm + switch sang Arc nên thường không có popup đổi mạng.)
  await expect(page.getByText(/0x[a-fA-F0-9]{4}\.{3}[a-fA-F0-9]{4}/).first())
    .toBeVisible({ timeout: 40_000 });
});
