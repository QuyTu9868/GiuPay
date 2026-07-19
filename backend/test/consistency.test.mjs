/**
 * GiuPay — Test nhất quán logic (thuần Node, không cần blockchain).
 * Chạy: cd backend && node --test test/consistency.test.mjs
 *
 * Bảo vệ các bất biến cross-module dễ vỡ:
 *  - orderId on-chain = keccak256(order_code) phải GIỐNG nhau ở frontend (viem),
 *    bot, và indexer — nếu lệch thì tiền escrow kẹt.
 *  - Danh mục shop phải khớp giữa HomePage / ShopsPage / RegisterShopPage — nếu
 *    lệch, shop đăng ký xong không hiện dưới bộ lọc.
 *  - QR EIP-681 đúng định dạng ví hiểu được.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, "../../frontend/src");

// ── orderId ──────────────────────────────────────────────────────────────────
test("orderId = keccak256(order_code) khớp giữa frontend(viem) / bot / indexer", () => {
  const codes = ["ORDER-001", "GIU-ABCDE", "don-hang-xyz-123", "ORDER-with-emoji-🎉"];
  for (const code of codes) {
    // bot.ts + indexer.ts dùng: ethers.solidityPackedKeccak256(["string"],[code])
    const botAndIndexer = ethers.solidityPackedKeccak256(["string"], [code]);
    // frontend PaymentPage dùng viem: keccak256(toBytes(code)) === keccak256(utf8 bytes)
    const frontendViem = ethers.keccak256(ethers.toUtf8Bytes(code));
    assert.equal(frontendViem, botAndIndexer, `Lệch orderId cho code "${code}"`);
    assert.match(botAndIndexer, /^0x[0-9a-f]{64}$/, "orderId phải là bytes32 hex");
  }
});

// ── Danh mục shop ────────────────────────────────────────────────────────────
function extractCategoriesVI(file) {
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/CATEGORIES_VI\s*=\s*\[([^\]]*)\]/);
  assert.ok(m, `Không tìm thấy CATEGORIES_VI trong ${path.basename(file)}`);
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/^["'`]|["'`]$/g, ""))
    .filter(Boolean)
    .filter((c) => c !== "Tất cả"); // HomePage/ShopsPage có "Tất cả", form đăng ký thì không
}

test("danh mục VI khớp giữa HomePage, ShopsPage, RegisterShopPage", () => {
  const home = extractCategoriesVI(path.join(FE, "pages/HomePage.tsx"));
  const shops = extractCategoriesVI(path.join(FE, "pages/ShopsPage.tsx"));
  const register = extractCategoriesVI(path.join(FE, "pages/RegisterShopPage.tsx"));

  assert.deepEqual(shops, home, "ShopsPage lệch danh mục so với HomePage");
  assert.deepEqual(register, home, "RegisterShopPage lệch danh mục so với HomePage");
  // Không còn danh mục 'mồ côi' cũ
  assert.ok(!register.includes("Thể thao"), "RegisterShopPage vẫn còn 'Thể thao'");
  assert.ok(!register.includes("Dịch vụ"), "RegisterShopPage vẫn còn 'Dịch vụ'");
  assert.ok(register.includes("Đồ chơi & Mẹ bé"), "RegisterShopPage thiếu 'Đồ chơi & Mẹ bé'");
});

// ── QR EIP-681 ───────────────────────────────────────────────────────────────
function buildEip681(usdc, chainId, recipient, amountMicro) {
  return `ethereum:${usdc}@${chainId}/transfer?address=${recipient}&uint256=${amountMicro}`;
}

test("QR EIP-681 transfer USDC đúng định dạng ví hiểu được", () => {
  const uri = buildEip681(
    "0x3600000000000000000000000000000000000000",
    5042002,
    "0xbB1Ef2600a4e81bE655Bd08C067391beF5841D13",
    "1000000"
  );
  assert.match(
    uri,
    /^ethereum:0x[0-9a-fA-F]{40}@\d+\/transfer\?address=0x[0-9a-fA-F]{40}&uint256=\d+$/,
    "URI EIP-681 sai định dạng"
  );
});
