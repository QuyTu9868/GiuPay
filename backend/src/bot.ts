/**
 * GiuPay Backend Bot — Bước 14
 * Nhiệm vụ:
 *   1. Burn SBT hết hạn bảo hành
 *   2. Release escrow đủ 14 ngày + không tranh chấp
 *   3. Cảnh báo shop chưa phản hồi tranh chấp > 7 ngày
 *
 * Chạy: ts-node src/bot.ts
 * Cron:  mỗi ngày lúc 02:00 (giờ VN)
 */

import cron from "node-cron";
import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import dotenv from "dotenv";
import { db } from "./db";
import { sendMail } from "./upload";
import { mintWarrantySBT } from "./sbt-chain";

dotenv.config();

// ── Config ─────────────────────────────────────────────────────────────────

// Fallback chỉ dùng khi thiếu env — luôn ưu tiên set ARC_RPC_URL trỏ RPC riêng (vd Alchemy)
// trong .env, RPC công khai hay bị 429 khi nhiều người cùng test Arc testnet (BUGLOG.md 2026-07-18).
const ARC_RPC_URL    = process.env.ARC_RPC_URL    ?? "https://rpc.testnet.arc.network";
const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY ?? "";
const ESCROW_ADDRESS  = process.env.ESCROW_CONTRACT_ADDRESS ?? "";
const SBT_ADDRESS     = process.env.SBT_CONTRACT_ADDRESS    ?? "";
const ADMIN_EMAIL     = process.env.ADMIN_EMAIL ?? "";

// Ngưỡng gas cảnh báo (USDC — Arc dùng USDC làm native gas)
const GAS_WARNING_THRESHOLD = ethers.parseUnits("1", 6); // 1 USDC (6 decimals)

// ── ABIs (chỉ lấy hàm cần dùng) ───────────────────────────────────────────

const ESCROW_ABI = [
  // Bot gọi sau 14 ngày. Contract dùng orderId kiểu bytes32 (KHÔNG phải uint256).
  "function releaseEscrow(bytes32 orderId) external",
  // Đọc thông tin escrow — struct Escrow: buyer, shop, amount, createdAt, deadline, status(uint8), disputeCount, disputeClosed
  "function escrows(bytes32) external view returns (address buyer, address shop, uint256 amount, uint256 createdAt, uint256 deadline, uint8 status, uint256 disputeCount, bool disputeClosed)",
] as const;

// orderId on-chain = keccak256(order_code). PHẢI khớp y hệt cách frontend tính khi gọi escrow.pay()
// (ethers: keccak256(toUtf8Bytes(order_code)) === solidityPackedKeccak256(["string"],[order_code])).
function orderIdFromCode(orderCode: string): string {
  return ethers.solidityPackedKeccak256(["string"], [orderCode]);
}

const SBT_ABI = [
  // Bot burn SBT hết hạn
  "function burn(uint256 tokenId) external",
  // Đọc thông tin token
  "function warrantyExpiresAt(uint256 tokenId) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
] as const;

// USDC contract để check balance bot
const USDC_ABI = [
  "function balanceOf(address) external view returns (uint256)",
] as const;

const USDC_ADDRESS = process.env.USDC_CONTRACT_ADDRESS ?? "";

// ── Provider & Signer ──────────────────────────────────────────────────────

function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(ARC_RPC_URL);
}

function getSigner(provider: JsonRpcProvider): Wallet {
  if (!BOT_PRIVATE_KEY) throw new Error("BOT_PRIVATE_KEY chưa được cấu hình");
  return new Wallet(BOT_PRIVATE_KEY, provider);
}

// ── Check balance trước khi chạy (Security checklist #15) ─────────────────

async function checkBotBalance(signer: Wallet): Promise<boolean> {
  try {
    const usdc = new Contract(USDC_ADDRESS, USDC_ABI, signer);
    const balance: bigint = await usdc.balanceOf(signer.address);

    console.log(`[Bot] Balance: ${ethers.formatUnits(balance, 6)} USDC`);

    if (balance < GAS_WARNING_THRESHOLD) {
      console.warn("[Bot] ⚠️  Sắp hết gas!");

      await sendMail({
        to: ADMIN_EMAIL,
        type: "bot_low_gas",
        data: {
          balance: ethers.formatUnits(balance, 6),
          bot_wallet: signer.address,
        },
      });

      // Vẫn cố chạy — chỉ cảnh báo, không dừng hẳn
      // Nếu muốn dừng hẳn khi dưới ngưỡng → return false ở đây
    }

    return true;
  } catch (err) {
    console.error("[Bot] Lỗi check balance:", err);
    return false;
  }
}

// ── Task 1: Burn SBT hết hạn bảo hành ─────────────────────────────────────

async function burnExpiredSBTs(): Promise<void> {
  console.log("[Bot] 🔥 Bắt đầu burn SBT hết hạn...");

  // Lấy các đơn hàng có SBT + còn hạn bảo hành + chưa burn
  const { rows: orders } = await db.query(`
    SELECT id, order_code, sbt_token_id, warranty_days, escrow_created_at
    FROM orders
    WHERE sbt_token_id IS NOT NULL
      AND warranty_days > 0
      AND status IN ('released', 'refunded')
      AND escrow_created_at IS NOT NULL
      AND escrow_created_at + (warranty_days || ' days')::interval < NOW()
  `);

  if (!orders.length) {
    console.log("[Bot] Không có SBT nào cần burn.");
    return;
  }

  console.log(`[Bot] Cần burn ${orders.length} SBT.`);

  const provider = getProvider();
  const signer   = getSigner(provider);
  const sbt      = new Contract(SBT_ADDRESS, SBT_ABI, signer);

  let burned = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      const tokenId: bigint = BigInt(order.sbt_token_id);

      // Verify token vẫn tồn tại (tránh lỗi nếu đã burn trước đó)
      const owner: string = await sbt.ownerOf(tokenId);
      if (!owner) { failed++; continue; }

      const tx = await sbt.burn(tokenId);
      await tx.wait();

      // Đánh dấu đã burn trong DB (set sbt_token_id = null)
      await db.query(
        "UPDATE orders SET sbt_token_id = NULL, updated_at = NOW() WHERE id = $1",
        [order.id]
      );

      console.log(`[Bot] ✅ Burned SBT #${tokenId} — đơn ${order.order_code} | tx: ${tx.hash}`);
      burned++;
    } catch (err: any) {
      // Token đã burn / không tồn tại → coi như xong, update DB
      if (err?.message?.includes("ERC721NonexistentToken") || err?.message?.includes("invalid token")) {
        await db.query(
          "UPDATE orders SET sbt_token_id = NULL, updated_at = NOW() WHERE id = $1",
          [order.id]
        );
        console.log(`[Bot] ℹ️  SBT #${order.sbt_token_id} đơn ${order.order_code} đã không tồn tại, bỏ qua.`);
      } else {
        console.error(`[Bot] ❌ Lỗi burn SBT đơn ${order.order_code}:`, err?.message ?? err);
        failed++;
      }
    }
  }

  console.log(`[Bot] Burn xong: ${burned} thành công, ${failed} lỗi.`);
}

// ── Task 2: Release escrow đủ 14 ngày ─────────────────────────────────────

async function releaseMaturedEscrows(): Promise<void> {
  console.log("[Bot] 💰 Bắt đầu release escrow đủ 14 ngày...");

  // Lấy các đơn in_escrow đủ 14 ngày + không tranh chấp mở
  const { rows: orders } = await db.query(`
    SELECT o.id, o.order_code, o.escrow_created_at, o.product_name, o.product_image_cid,
           o.warranty_days, o.buyer_wallet, o.description, o.price_usdc, o.chain_paid_from,
           s.name AS shop_name
    FROM orders o
    JOIN shops s ON s.id = o.shop_id
    WHERE o.status = 'in_escrow'
      AND o.escrow_created_at IS NOT NULL
      AND o.escrow_created_at + interval '14 days' <= NOW()
      AND NOT EXISTS (
        SELECT 1 FROM disputes d
        WHERE d.order_id = o.id AND d.status = 'open'
      )
  `);

  if (!orders.length) {
    console.log("[Bot] Không có escrow nào cần release.");
    return;
  }

  console.log(`[Bot] Cần release ${orders.length} escrow.`);

  const provider = getProvider();
  const signer   = getSigner(provider);
  const escrow   = new Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);

  let released = 0;
  let failed   = 0;

  for (const order of orders) {
    try {
      // orderId là bytes32 = keccak256(order_code) — khớp với lúc frontend gọi escrow.pay()
      const orderId = orderIdFromCode(order.order_code);

      const tx = await escrow.releaseEscrow(orderId);
      await tx.wait();

      await db.query(
        "UPDATE orders SET status = 'released', escrow_released_at = NOW(), updated_at = NOW() WHERE id = $1",
        [order.id]
      );

      console.log(`[Bot] ✅ Released escrow đơn ${order.order_code} | tx: ${tx.hash}`);
      released++;

      // Mint SBT bằng chứng mua hàng — lỗi ở đây KHÔNG được coi là release thất bại (tiền đã
      // giải ngân thật rồi), chỉ log để biết mà xử lý tay sau nếu cần (xem sbt-chain.ts).
      try {
        const tokenId = await mintWarrantySBT({
          order_code: order.order_code, product_name: order.product_name,
          product_image_cid: order.product_image_cid, warranty_days: order.warranty_days,
          buyer_wallet: order.buyer_wallet, description: order.description,
          shop_name: order.shop_name, price_usdc: order.price_usdc,
          chain_paid_from: order.chain_paid_from, purchased_at: order.escrow_created_at,
        });
        if (tokenId) {
          await db.query("UPDATE orders SET sbt_token_id = $1 WHERE id = $2", [tokenId, order.id]);
          console.log(`[Bot] 🎖️  Đã mint SBT #${tokenId} cho đơn ${order.order_code}`);
        }
      } catch (sbtErr: any) {
        console.error(`[Bot] ⚠️  Release đơn ${order.order_code} thành công nhưng mint SBT lỗi:`, sbtErr?.message ?? sbtErr);
      }
    } catch (err: any) {
      console.error(`[Bot] ❌ Lỗi release escrow đơn ${order.order_code}:`, err?.message ?? err);
      failed++;
    }
  }

  console.log(`[Bot] Release xong: ${released} thành công, ${failed} lỗi.`);
}

// ── Task 3: Cảnh báo tranh chấp shop không phản hồi ───────────────────────

async function alertUnansweredDisputes(): Promise<void> {
  console.log("[Bot] 🚨 Kiểm tra tranh chấp chưa phản hồi...");

  const { rows: disputes } = await db.query(`
    SELECT
      d.id          AS dispute_id,
      d.opened_at,
      d.deadline_at,
      o.order_code,
      s.name        AS shop_name,
      s.gmail       AS shop_gmail
    FROM disputes d
    JOIN orders o ON o.id = d.order_id
    JOIN shops  s ON s.id = o.shop_id
    WHERE d.status = 'open'
      AND d.shop_response IS NULL
      AND d.opened_at + interval '7 days' <= NOW()
  `);

  if (!disputes.length) {
    console.log("[Bot] Không có tranh chấp nào quá hạn.");
    return;
  }

  console.log(`[Bot] ${disputes.length} tranh chấp cần Admin can thiệp.`);

  for (const d of disputes) {
    try {
      // Gửi mail cảnh báo Admin
      await sendMail({
        to: ADMIN_EMAIL,
        type: "dispute_no_response",
        data: {
          order_code: d.order_code,
          shop_name:  d.shop_name,
        },
      });

      console.log(`[Bot] 📧 Đã gửi cảnh báo Admin — đơn ${d.order_code}`);
    } catch (err: any) {
      console.error(`[Bot] ❌ Lỗi gửi mail cảnh báo đơn ${d.order_code}:`, err?.message);
    }
  }
}

// ── Main runner ────────────────────────────────────────────────────────────

async function runBot(): Promise<void> {
  console.log("\n========================================");
  console.log(`[Bot] 🤖 Bắt đầu chạy: ${new Date().toISOString()}`);
  console.log("========================================");

  try {
    const provider = getProvider();
    const signer   = getSigner(provider);

    // Kiểm tra balance trước
    const ok = await checkBotBalance(signer);
    if (!ok) {
      console.error("[Bot] Không thể kiểm tra balance. Dừng.");
      return;
    }

    // Chạy 3 tasks tuần tự
    await burnExpiredSBTs();
    await releaseMaturedEscrows();
    await alertUnansweredDisputes();

    console.log(`[Bot] ✅ Hoàn thành: ${new Date().toISOString()}`);
  } catch (err: any) {
    console.error("[Bot] ❌ Lỗi nghiêm trọng:", err?.message ?? err);

    // Gửi mail báo Admin khi bot crash
    try {
      await sendMail({
        to: ADMIN_EMAIL,
        type: "bot_low_gas", // tái dùng template — hoặc tạo template "bot_error"
        data: {
          balance: "N/A",
          bot_wallet: process.env.BOT_WALLET_ADDRESS ?? "unknown",
        },
      });
    } catch (_) {
      // Không làm gì nếu mail cũng fail
    }
  }
}

// ── Cron schedule ──────────────────────────────────────────────────────────
// Chạy mỗi ngày lúc 02:00 AM (timezone Asia/Ho_Chi_Minh)
// Để chạy thủ công ngay: ts-node src/bot.ts --run-now

const RUN_NOW = process.argv.includes("--run-now");

if (RUN_NOW) {
  // Chạy ngay lập tức (dùng khi debug hoặc test)
  runBot().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log("[Bot] 🕑 Đang chờ lịch cron: mỗi ngày lúc 02:00...");

  // "0 2 * * *" = 02:00 AM mỗi ngày
  cron.schedule("0 2 * * *", () => {
    runBot().catch(console.error);
  }, {
    timezone: "Asia/Ho_Chi_Minh",
  });

  // Giữ process sống
  console.log("[Bot] 🤖 GiuPay Bot dang chay. Ctrl+C de dung.");
}