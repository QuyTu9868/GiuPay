/**
 * GiuPay — CCTP Relayer
 * Bắc cầu USDC thật (Circle CCTP V2) từ Ethereum/OP/Arbitrum/Base Sepolia về Arc Testnet,
 * rồi tự động nộp vào PaymentEscrow thay buyer — không cần buyer tự tay làm bước 2 trên Arc.
 *
 * Vì sao cần ví riêng đứng ra làm hộ: sau khi burn ở chain nguồn, USDC được mint thẳng vào
 * MỘT địa chỉ trên Arc (mintRecipient) — buyer không có sẵn ví/gas trên Arc để tự gọi tiếp
 * receiveMessage() + escrow.pay(). Ví bot (BOT_PRIVATE_KEY, đã dùng sẵn cho releaseEscrow ở
 * bot.ts) đứng ra làm hộ 2 bước đó. Hệ quả: trên smart contract, Escrow.buyer = ví bot —
 * buyer THẬT vẫn được lưu đúng ở orders.buyer_wallet (DB). Chi tiết đánh đổi: xem
 * implementation-notes.md, mục "CCTP thật".
 *
 * Luồng xử lý mỗi đơn có bridge_status = 'pending':
 *   1. Hỏi Circle Iris API xem attestation của tx burn đã xong chưa.
 *   2. Xong rồi thì gọi receiveMessage() trên Arc → USDC mint vào ví bot.
 *   3. Ví bot approve() + escrow.pay() → tiền vào escrow, đơn chuyển 'in_escrow'.
 *
 * Chạy: npm run cctp-relayer        (poll liên tục)
 *       npm run cctp-relayer:once   (quét 1 lượt rồi thoát — để test)
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { db } from "./db";
// TRƯỚC ĐÂY import orderIdFromCode từ "./indexer" — indexer.ts có side-effect ở cuối file (tự
// gọi runLoop() ngay khi bị import, không chỉ khi chạy trực tiếp bằng `npm run indexer`), nên
// mỗi lần cctp-relayer.ts khởi động, nó vô tình chạy luôn CẢ vòng lặp indexer bên trong process
// của mình — nhân đôi số lệnh gọi RPC getLogs/getBlockNumber, góp phần gây rate-limit. Đổi sang
// import cùng hàm (logic giống hệt, chỉ khác không .toLowerCase() — không ảnh hưởng vì orderId
// dùng làm bytes32 argument on-chain, không phân biệt hoa/thường) từ escrow-chain.ts — file này
// không có side-effect nào khi import. Xem BUGLOG.md 2026-07-18.
import { orderIdFromCode } from "./escrow-chain";
import { mintWarrantySBT } from "./sbt-chain";

dotenv.config();

// ── Config ───────────────────────────────────────────────────────────────────

const ARC_RPC_URL     = process.env.ARC_RPC_URL ?? "";
const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY ?? "";
const ESCROW_ADDRESS  = process.env.ESCROW_CONTRACT_ADDRESS ?? "";
const ARC_USDC        = process.env.USDC_CONTRACT_ADDRESS ?? "";
// Địa chỉ CCTP V2 giống nhau trên mọi testnet EVM (kể cả Arc) — theo Circle docs.
const MESSAGE_TRANSMITTER = process.env.CCTP_MESSAGE_TRANSMITTER ?? "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";
const IRIS_API_URL    = process.env.CCTP_IRIS_API_URL ?? "https://iris-api-sandbox.circle.com";
// 20s → 30s: giảm tải RPC công khai Arc testnet, cùng gốc lỗi 429 với indexer.ts — xem
// BUGLOG.md 2026-07-18.
const POLL_MS          = Number(process.env.CCTP_RELAYER_POLL_MS ?? 30_000); // 30s/lượt
const MAX_BACKOFF_MS   = Number(process.env.CCTP_RELAYER_MAX_BACKOFF_MS ?? 120_000); // trần backoff 429

// ── ABIs (chỉ lấy hàm cần dùng) ────────────────────────────────────────────

const MESSAGE_TRANSMITTER_ABI = [
  "function receiveMessage(bytes message, bytes attestation) external returns (bool)",
] as const;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
] as const;

const ESCROW_ABI = [
  "function pay(bytes32 orderId, bytes32 txHash, address shop, uint256 amount, uint256 deadline) external",
] as const;

// ── Provider & Signer (ví bot — dùng chung với bot.ts) ─────────────────────

function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(ARC_RPC_URL);
}

function getSigner(provider: JsonRpcProvider): Wallet {
  if (!BOT_PRIVATE_KEY) throw new Error("BOT_PRIVATE_KEY chưa được cấu hình");
  return new Wallet(BOT_PRIVATE_KEY, provider);
}

// bytes32 hoá 1 địa chỉ EVM (đệm 0 phía trước) — CCTP dùng bytes32 cho mintRecipient
function addressToBytes32(addr: string): string {
  return ethers.zeroPadValue(addr, 32);
}

// ── Hỏi Circle Iris API xem attestation đã sẵn sàng chưa ────────────────────

interface IrisMessage {
  message: string;
  attestation: string | null;
  status: "complete" | "pending_confirmations";
}

async function fetchAttestation(sourceDomain: number, burnTxHash: string): Promise<IrisMessage | null> {
  const url = `${IRIS_API_URL}/v2/messages/${sourceDomain}?transactionHash=${burnTxHash}`;
  const res = await fetch(url);
  if (res.status === 404) return null; // Circle chưa thấy tx (mới burn xong, chưa index kịp)
  if (!res.ok) throw new Error(`Iris API lỗi ${res.status}: ${await res.text()}`);
  const json: any = await res.json();
  const messages: IrisMessage[] = json.messages ?? [];
  return messages[0] ?? null;
}

// ── Xử lý 1 đơn đang bắc cầu ─────────────────────────────────────────────────

interface BridgingOrder {
  id: string;
  order_code: string;
  price_usdc: string;
  quantity: number;
  bridge_source_domain: number;
  bridge_burn_tx_hash: string;
  shop_wallet: string;
  shop_name: string;
  product_name: string;
  product_image_cid: string | null;
  description: string | null;
  warranty_days: number;
  buyer_wallet: string | null;
  chain_paid_from: string | null;
}

async function processOrder(order: BridgingOrder, signer: Wallet): Promise<void> {
  const { order_code, bridge_source_domain, bridge_burn_tx_hash } = order;

  let msg: IrisMessage | null;
  try {
    msg = await fetchAttestation(bridge_source_domain, bridge_burn_tx_hash);
  } catch (err: any) {
    console.error(`[CCTP] ❌ Lỗi hỏi Iris API — đơn ${order_code}:`, err?.message ?? err);
    return; // thử lại lượt poll sau, không đánh dấu failed vì có thể chỉ là lỗi mạng tạm thời
  }

  if (!msg || msg.status !== "complete" || !msg.attestation) {
    console.log(`[CCTP] ⏳ Đơn ${order_code} — attestation chưa xong, chờ lượt sau.`);
    return;
  }

  console.log(`[CCTP] ✅ Attestation sẵn sàng — đơn ${order_code}, đang mint trên Arc...`);

  const usdc              = new Contract(ARC_USDC, ERC20_ABI, signer);
  const messageTransmitter = new Contract(MESSAGE_TRANSMITTER, MESSAGE_TRANSMITTER_ABI, signer);
  const escrow             = new Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);

  try {
    // 1) Mint USDC vào ví bot trên Arc — đo bằng chênh lệch balance trước/sau cho chắc chắn
    //    (tránh phải tự tính lại fee CCTP từ decodedMessage, dễ sai).
    const balanceBefore: bigint = await usdc.balanceOf(signer.address);

    const mintTx = await messageTransmitter.receiveMessage(msg.message, msg.attestation);
    const mintReceipt = await mintTx.wait();

    const balanceAfter: bigint = await usdc.balanceOf(signer.address);
    const mintedAmount = balanceAfter - balanceBefore;

    if (mintedAmount <= 0n) {
      throw new Error(`Mint xong nhưng balance không tăng (before=${balanceBefore} after=${balanceAfter})`);
    }
    console.log(`[CCTP] 💵 Đã mint ${ethers.formatUnits(mintedAmount, 6)} USDC trên Arc — đơn ${order_code} | tx ${mintReceipt.hash}`);

    // 2) Approve + nộp vào escrow thay buyer
    const approveTx = await usdc.approve(ESCROW_ADDRESS, mintedAmount);
    await approveTx.wait();

    const orderId  = orderIdFromCode(order_code);
    // txNonce chống replay của riêng escrow — khác với nonce CCTP, chỉ cần duy nhất mỗi lần pay()
    const txNonce  = ethers.solidityPackedKeccak256(["string"], [`${order_code}:cctp:${bridge_burn_tx_hash}`]);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const payTx = await escrow.pay(orderId, txNonce, order.shop_wallet, mintedAmount, deadline);
    const payReceipt = await payTx.wait();

    // buyer_wallet + chain_paid_from đã được lưu đúng từ bước /bridge-start — chỉ cần cập nhật trạng thái.
    const { rows: updatedRows } = await db.query<{ escrow_created_at: string }>(
      `UPDATE orders
          SET status = 'in_escrow', bridge_status = 'paid',
              bridge_mint_tx_hash = $2, tx_hash = $3,
              escrow_created_at = COALESCE(escrow_created_at, NOW()), updated_at = NOW()
        WHERE id = $1 RETURNING escrow_created_at`,
      [order.id, mintReceipt.hash, payReceipt.hash]
    );

    console.log(`[CCTP] 🎉 Đơn ${order_code} đã vào escrow | pay tx ${payReceipt.hash}`);

    // Mint SBT bằng chứng mua hàng — 3 luồng vào escrow còn lại (orders.ts, indexer.ts, bot.ts)
    // đều đã gọi mint ở đây, riêng luồng CCTP này trước đó bỏ sót nên đơn trả bằng cầu nối
    // (khác chain) không bao giờ có SBT. Lỗi ở đây KHÔNG được chặn luồng chính (tiền đã vào
    // escrow thật rồi) — chỉ log để xử lý tay sau nếu cần (xem sbt-chain.ts).
    try {
      const tokenId = await mintWarrantySBT({
        order_code, product_name: order.product_name,
        product_image_cid: order.product_image_cid, warranty_days: order.warranty_days,
        buyer_wallet: order.buyer_wallet, description: order.description,
        shop_name: order.shop_name, price_usdc: order.price_usdc,
        chain_paid_from: order.chain_paid_from, purchased_at: updatedRows[0].escrow_created_at,
      });
      if (tokenId) {
        await db.query("UPDATE orders SET sbt_token_id = $1 WHERE id = $2", [tokenId, order.id]);
        console.log(`[CCTP] 🎖️  Đã mint SBT #${tokenId} cho đơn ${order_code}`);
      }
    } catch (sbtErr: any) {
      console.error(`[CCTP] ⚠️  Đơn ${order_code} vào escrow nhưng mint SBT lỗi:`, sbtErr?.message ?? sbtErr);
    }
  } catch (err: any) {
    const errMsg = err?.shortMessage ?? err?.message ?? String(err);
    console.error(`[CCTP] ❌ Lỗi hoàn tất bắc cầu — đơn ${order_code}:`, errMsg);
    await db.query(
      `UPDATE orders SET bridge_status = 'failed', bridge_error = $2, updated_at = NOW() WHERE id = $1`,
      [order.id, errMsg.slice(0, 2000)]
    );
  }
}

// ── Quét 1 lượt tất cả đơn đang chờ bắc cầu ─────────────────────────────────

async function tick(): Promise<void> {
  const { rows: orders } = await db.query<BridgingOrder>(`
    SELECT o.id, o.order_code, o.price_usdc, o.quantity,
           o.bridge_source_domain, o.bridge_burn_tx_hash,
           o.product_name, o.product_image_cid, o.description,
           o.warranty_days, o.buyer_wallet, o.chain_paid_from,
           s.wallet_address AS shop_wallet, s.name AS shop_name
      FROM orders o JOIN shops s ON s.id = o.shop_id
     WHERE o.bridge_status = 'pending'
  `);

  if (!orders.length) return;
  console.log(`[CCTP] 🔍 ${orders.length} đơn đang chờ bắc cầu...`);

  const provider = getProvider();
  const signer   = getSigner(provider);

  for (const order of orders) {
    await processOrder(order, signer);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function assertConfig(): void {
  if (!ARC_RPC_URL || !ESCROW_ADDRESS || !ARC_USDC || !BOT_PRIVATE_KEY) {
    throw new Error("Thiếu ARC_RPC_URL / ESCROW_CONTRACT_ADDRESS / USDC_CONTRACT_ADDRESS / BOT_PRIVATE_KEY trong .env");
  }
}

async function runOnce(): Promise<void> {
  assertConfig();
  await tick();
}

// Nhận diện lỗi rate-limit (HTTP 429) — cùng logic với indexer.ts (xem file đó để biết lý do
// kiểm tra nhiều hình dạng lỗi khác nhau).
function isRateLimited(err: any): boolean {
  const msg = String(err?.message ?? err ?? "");
  return err?.status === 429 || err?.info?.error?.code === 429 || msg.includes("429") || /too many requests/i.test(msg);
}

async function runLoop(): Promise<void> {
  assertConfig();
  console.log(`[CCTP] 🌉 GiuPay CCTP relayer chạy | poll ${POLL_MS}ms`);

  // setTimeout đệ quy thay vì setInterval cố định — giãn động khi RPC bị 429, xem indexer.ts
  // và BUGLOG.md 2026-07-18 (cùng 1 gốc lỗi, sửa đồng bộ cả 2 tiến trình).
  let currentDelay = POLL_MS;

  const loopTick = async () => {
    try {
      await tick();
      currentDelay = POLL_MS;
    } catch (err: any) {
      if (isRateLimited(err)) {
        currentDelay = Math.min(currentDelay * 2, MAX_BACKOFF_MS);
        console.warn(`[CCTP] ⚠️ RPC bị rate-limit (429) — giãn poll ra ${currentDelay}ms`);
      } else {
        console.error("[CCTP] ❌ Lỗi poll:", err?.message ?? err);
      }
    }
    setTimeout(loopTick, currentDelay);
  };

  await loopTick();
}

// npm run cctp-relayer:once → quét 1 lượt; mặc định → chạy vòng lặp
const ONCE = process.argv.includes("--once");
if (ONCE) {
  runOnce().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
} else {
  runLoop().catch((e) => { console.error(e); process.exit(1); });
}

export { runOnce };
