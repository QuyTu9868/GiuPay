/**
 * GiuPay — Transaction flow tests (Approach #1)
 * ---------------------------------------------------------------------------
 * Ký giao dịch THẬT bằng ví demo (tài khoản Hardhat) lên node local 127.0.0.1:8545,
 * dùng ĐÚNG contract đã deploy (bản đã sửa bug khóa tiền) + đúng ABI.
 * Không cần MetaMask — provider lập trình (đây chính là "cách 1").
 *
 * Yêu cầu:
 *   1) npx hardhat node               (đang chạy ở 127.0.0.1:8545)
 *   2) đã deploy contract local        (địa chỉ nằm trong backend/.env)
 *
 * Chạy:  cd backend && npm run test:tx
 *
 * Ghi chú kỹ thuật: node Hardhat automine trả getTransactionCount lệch khi gửi
 * tx dồn dập → tự quản nonce tường minh (đếm cục bộ, chỉ +1 khi tx thành công).
 * Tx revert bị chặn ở estimateGas nên KHÔNG tiêu nonce → không tăng đếm.
 * ---------------------------------------------------------------------------
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const RPC = process.env.TEST_RPC_URL ?? "http://127.0.0.1:8545";

// Ví demo — tài khoản Hardhat mặc định (deterministic)
const KEY_OWNER = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // #0 = owner/bot
const KEY_SHOP  = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // #1 = shop
const KEY_BUYER = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"; // #2 = buyer

function abiOf(name) {
  const p = path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8")).abi;
}

const provider = new ethers.JsonRpcProvider(RPC, undefined, { batchMaxCount: 1, staticNetwork: true });
const ownerW = new ethers.Wallet(KEY_OWNER, provider); // deployer + bot
const shopW  = new ethers.Wallet(KEY_SHOP, provider);
const buyerW = new ethers.Wallet(KEY_BUYER, provider);
const OWNER = ownerW.address, SHOP = shopW.address, BUYER = buyerW.address;

// Địa chỉ contract deploy LOCAL (deterministic từ account #0). Hardcode để test
// độc lập với backend/.env (env đó trỏ Arc Testnet). Override qua TEST_* nếu cần.
const USDC   = process.env.TEST_USDC   ?? "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const REG    = process.env.TEST_REG    ?? "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const ESCROW = process.env.TEST_ESCROW ?? "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

const AMOUNT = ethers.parseUnits("100", 6);
const FEE = (AMOUNT * 10n) / 10000n;   // 0.1%
const NET = AMOUNT - FEE;

const usdc     = new ethers.Contract(USDC, abiOf("MockUSDC"), provider);
const registry = new ethers.Contract(REG, abiOf("ShopRegistry"), provider);
const escrow   = new ethers.Contract(ESCROW, abiOf("PaymentEscrow"), provider);

// ── Quản nonce tường minh ──────────────────────────────────────────────────
const nonces = {};
async function initNonces() {
  for (const w of [ownerW, shopW, buyerW]) {
    nonces[w.address] = await provider.getTransactionCount(w.address, "latest");
  }
}
// Gửi tx thành công: dùng nonce cục bộ, +1 sau khi mined
async function send(contract, wallet, method, ...args) {
  const tx = await contract.connect(wallet)[method](...args, { nonce: nonces[wallet.address] });
  await tx.wait();
  nonces[wallet.address]++;
  return tx;
}
// Kỳ vọng revert: tx bị chặn ở estimateGas → không tiêu nonce → không tăng đếm
async function expectRevert(pattern, contract, wallet, method, ...args) {
  await assert.rejects(
    contract.connect(wallet)[method](...args, { nonce: nonces[wallet.address] }),
    pattern
  );
}

async function increaseTime(seconds) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}
function uid(prefix) { return ethers.id(`${prefix}-${Date.now()}-${Math.random()}`); }
// deadline theo timestamp BLOCK của node (không dùng giờ thực) vì increaseTime đã
// đẩy thời gian node xa về tương lai.
async function futureDeadline() {
  const block = await provider.getBlock("latest");
  return block.timestamp + 3600;
}
async function fundAndApprove(amount = AMOUNT) {
  await send(usdc, ownerW, "mint", BUYER, amount);
  await send(usdc, buyerW, "approve", ESCROW, amount);
}
async function payFresh() {
  const orderId = uid("ORDER"), txHash = uid("TX");
  await fundAndApprove();
  await send(escrow, buyerW, "pay", orderId, txHash, SHOP, AMOUNT, await futureDeadline());
  return orderId;
}

test("Tx flow (approach #1 — ví demo + node local)", async (t) => {
  const net = await provider.getNetwork().catch(() => null);
  assert.ok(net, "Hardhat node phải chạy ở 127.0.0.1:8545 (npx hardhat node)");
  assert.equal(Number(net.chainId), 31337, "chainId phải là 31337 (local)");

  await initNonces();

  // ── Đảm bảo shop verified (idempotent) ──
  if (!(await registry.isVerified(SHOP))) {
    try { await send(registry, ownerW, "registerShop", SHOP, ethers.id("docs")); }
    catch { /* đã đăng ký ở lần chạy trước */ }
    await send(registry, ownerW, "verifyShop", SHOP);
  }
  assert.equal(await registry.isVerified(SHOP), true);

  await t.test("Thanh toán: buyer approve + pay → escrow giữ net, fee wallet nhận 0.1%", async () => {
    const orderId = uid("ORDER"), txHash = uid("TX");
    const feeWallet = await escrow.feeWallet();
    await fundAndApprove();
    const feeBefore = await usdc.balanceOf(feeWallet);
    await send(escrow, buyerW, "pay", orderId, txHash, SHOP, AMOUNT, await futureDeadline());

    const e = await escrow.getEscrow(orderId);
    assert.equal(e.amount, NET, "escrow phải giữ đúng net (sau phí)");
    assert.equal(Number(e.status), 0, "status = Active");
    assert.equal(e.buyer.toLowerCase(), BUYER.toLowerCase());
    assert.equal((await usdc.balanceOf(feeWallet)) - feeBefore, FEE, "fee wallet nhận đúng 0.1%");
  });

  await t.test("Chống replay: cùng txHash lần 2 → revert", async () => {
    const txHash = uid("TX");
    await fundAndApprove(AMOUNT * 2n);
    await send(escrow, buyerW, "pay", uid("ORDER"), txHash, SHOP, AMOUNT, await futureDeadline());
    await expectRevert(/Already processed/, escrow, buyerW, "pay", uid("ORDER"), txHash, SHOP, AMOUNT, await futureDeadline());
  });

  await t.test("LUỒNG ĐẦY ĐỦ (fix bug khóa tiền): pay → dispute → confirmReceived → release → shop nhận tiền", async () => {
    const orderId = await payFresh();
    await send(escrow, buyerW, "openDispute", orderId);
    await send(escrow, buyerW, "confirmReceived", orderId);

    const shopBefore = await usdc.balanceOf(SHOP);
    await increaseTime(14 * 24 * 3600 + 10);
    // Trước khi fix: revert "Has open dispute". Sau fix: thành công.
    await send(escrow, ownerW, "releaseEscrow", orderId);

    assert.equal((await usdc.balanceOf(SHOP)) - shopBefore, NET, "shop nhận net sau confirmReceived + release");
  });

  await t.test("Tranh chấp: shop hoàn tiền → buyer nhận lại net", async () => {
    const orderId = await payFresh();
    await send(escrow, buyerW, "openDispute", orderId);

    const buyerBefore = await usdc.balanceOf(BUYER);
    await send(escrow, shopW, "refundByShop", orderId);

    assert.equal((await usdc.balanceOf(BUYER)) - buyerBefore, NET, "buyer nhận lại net khi shop hoàn tiền");
    assert.equal(Number((await escrow.getEscrow(orderId)).status), 2, "status = Refunded");
  });

  await t.test("Tranh chấp đang MỞ (chưa confirm) → release bị chặn 'Not active'", async () => {
    const orderId = await payFresh();
    await send(escrow, buyerW, "openDispute", orderId);
    await increaseTime(14 * 24 * 3600 + 10);
    await expectRevert(/Not active/, escrow, ownerW, "releaseEscrow", orderId);
  });
});
