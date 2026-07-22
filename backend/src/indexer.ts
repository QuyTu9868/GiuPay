/**
 * GiuPay — Escrow Indexer (Task #4)
 * Nghe event on-chain của PaymentEscrow trên Arc rồi đồng bộ trạng thái đơn vào DB.
 *
 * Vì sao cần: khi buyer trả qua escrow (nhất là QR quét-là-trả, không có phiên trên
 * dApp), frontend KHÔNG chắc gọi được PUT /status → đơn kẹt ở 'pending_payment'.
 * Indexer là nguồn sự thật: cứ thấy PaymentReceived là set đơn 'in_escrow'.
 * Ngoài ra nó set escrow_created_at theo block timestamp on-chain — bot mới release
 * đúng mốc 14 ngày (bot lọc theo escrow_created_at + 14 days).
 *
 * Chạy: npm run indexer      (poll liên tục)
 *       npm run indexer:once (quét 1 lượt rồi thoát — để test)
 */

import { ethers, JsonRpcProvider, Contract } from "ethers";
import dotenv from "dotenv";
import { db } from "./db";
import { mintWarrantySBT } from "./sbt-chain";

dotenv.config();

// ── Config ───────────────────────────────────────────────────────────────────
const ARC_RPC_URL    = process.env.ARC_RPC_URL ?? "";
const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS ?? "";
const USDC_ADDRESS   = process.env.USDC_CONTRACT_ADDRESS ?? "";
// 15s → 30s: RPC công khai Arc testnet hay bị 429 (rate-limit) khi cộng dồn với traffic
// frontend + cctp-relayer.ts cùng gọi 1 endpoint. Arc có sub-second finality nên 30s vẫn đủ
// nhanh để cập nhật trạng thái đơn — không cần quét dồn dập như trước. Xem BUGLOG.md 2026-07-18.
const POLL_MS        = Number(process.env.INDEXER_POLL_MS ?? 30_000);   // 30s/lượt
// 2000 → 10: gói miễn phí của Alchemy giới hạn CỨNG mỗi lệnh eth_getLogs chỉ được quét tối đa
// 10 block/lần (báo lỗi -32600 "Under the Free tier plan..." nếu vượt) — không phải do app tự
// đặt ra, phải tuân theo giới hạn của nhà cung cấp RPC. Xem BUGLOG.md 2026-07-18.
const BATCH_BLOCKS   = Number(process.env.INDEXER_BATCH_BLOCKS ?? 10); // giới hạn range getLogs
const MAX_LOOKBACK   = Number(process.env.INDEXER_MAX_LOOKBACK ?? 50_000); // lần đầu quét lùi bao xa
// Backoff khi RPC bị 429 — gấp đôi delay mỗi lần dính rate-limit liên tiếp, về lại POLL_MS
// ngay khi 1 lượt chạy thành công. Trần tối đa để không giãn ra vô hạn.
const MAX_BACKOFF_MS = Number(process.env.INDEXER_MAX_BACKOFF_MS ?? 120_000); // tối đa 2 phút
const STATE_KEY      = `escrow:${ESCROW_ADDRESS.toLowerCase()}`;

// Chỉ lấy event cần dùng — khớp đúng chữ ký trong PaymentEscrow.sol
const ESCROW_EVENTS_ABI = [
  "event PaymentReceived(bytes32 indexed orderId, address buyer, address shop, uint256 amount)",
  "event EscrowReleased(bytes32 indexed orderId, address shop, uint256 amount)",
  "event EscrowRefunded(bytes32 indexed orderId, address buyer, uint256 amount)",
] as const;

// ERC20 Transfer — để bắt QR kiểu 2 "quét-là-trả" (transfer USDC thẳng cho shop, KHÔNG escrow).
const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

// orderId on-chain = keccak256(order_code) — PHẢI khớp frontend pay + bot (orderIdFromCode).
function orderIdFromCode(orderCode: string): string {
  return ethers.solidityPackedKeccak256(["string"], [orderCode]).toLowerCase();
}

function getContract(): Contract {
  const provider = new JsonRpcProvider(ARC_RPC_URL);
  return new Contract(ESCROW_ADDRESS, ESCROW_EVENTS_ABI, provider);
}

// ── Persist block đã xử lý (sống sót qua restart) ────────────────────────────
async function initState(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS indexer_state (
      key         TEXT PRIMARY KEY,
      last_block  BIGINT NOT NULL,
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function getLastBlock(): Promise<number | null> {
  const { rows } = await db.query("SELECT last_block FROM indexer_state WHERE key = $1", [STATE_KEY]);
  return rows.length ? Number(rows[0].last_block) : null;
}

async function setLastBlock(block: number): Promise<void> {
  await db.query(
    `INSERT INTO indexer_state (key, last_block, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET last_block = EXCLUDED.last_block, updated_at = NOW()`,
    [STATE_KEY, block]
  );
}

// ── Map orderId(hash) → đơn (chỉ các đơn CHƯA chốt) ──────────────────────────
interface OrderRow {
  id: string; order_code: string; status: string; escrow_created_at: string | null;
  product_name: string; product_image_cid: string | null; warranty_days: number;
}

async function buildOrderMap(): Promise<Map<string, OrderRow>> {
  const { rows } = await db.query<OrderRow>(
    `SELECT id, order_code, status, escrow_created_at, product_name, product_image_cid, warranty_days
       FROM orders
      WHERE status NOT IN ('released','refunded')`
  );
  const map = new Map<string, OrderRow>();
  for (const o of rows) map.set(orderIdFromCode(o.order_code), o);
  return map;
}

// ── Xử lý từng loại event ────────────────────────────────────────────────────
async function onPaymentReceived(
  order: OrderRow, buyer: string, txHash: string, blockTs: number
): Promise<void> {
  // Đã in_escrow và đã có mốc thời gian rồi thì bỏ qua (idempotent)
  if (order.status === "in_escrow" && order.escrow_created_at) return;

  await db.query(
    `UPDATE orders
        SET status = 'in_escrow',
            buyer_wallet = COALESCE(buyer_wallet, $2),
            tx_hash = COALESCE(tx_hash, $3),
            chain_paid_from = COALESCE(chain_paid_from, 'arc'),
            escrow_created_at = COALESCE(escrow_created_at, to_timestamp($4)),
            updated_at = NOW()
      WHERE id = $1`,
    [order.id, buyer.toLowerCase(), txHash, blockTs]
  );
  console.log(`[Indexer] 💰 in_escrow: đơn ${order.order_code} | buyer ${buyer} | tx ${txHash}`);

  // Mint SBT bằng chứng mua hàng ngay khi vào escrow — cùng logic với orders.ts (route
  // PUT /status), phòng trường hợp đường đó không chạy được (vd backend cold-start lúc buyer
  // vừa ký xong) và chỉ có indexer bắt được event on-chain. Idempotent, không mint trùng.
  try {
    const tokenId = await mintWarrantySBT({
      order_code: order.order_code, product_name: order.product_name,
      product_image_cid: order.product_image_cid, warranty_days: order.warranty_days,
      buyer_wallet: buyer,
    });
    if (tokenId) {
      await db.query("UPDATE orders SET sbt_token_id = $1 WHERE id = $2", [tokenId, order.id]);
      console.log(`[Indexer] 🎖️  Đã mint SBT #${tokenId} cho đơn ${order.order_code}`);
    }
  } catch (sbtErr: any) {
    console.error(`[Indexer] ⚠️  Vào escrow thành công nhưng mint SBT lỗi — đơn ${order.order_code}:`, sbtErr?.message ?? sbtErr);
  }
}

async function onEscrowFinalized(order: OrderRow, newStatus: "released" | "refunded", txHash: string): Promise<void> {
  if (order.status === newStatus) return;
  const extra = newStatus === "released" ? ", escrow_released_at = COALESCE(escrow_released_at, NOW())" : "";
  await db.query(
    `UPDATE orders SET status = $2, tx_hash = COALESCE(tx_hash, $3)${extra}, updated_at = NOW() WHERE id = $1`,
    [order.id, newStatus, txHash]
  );
  console.log(`[Indexer] ${newStatus === "released" ? "✅ released" : "↩️  refunded"}: đơn ${order.order_code} | tx ${txHash}`);
}

// ── QR kiểu 2: USDC transfer thẳng vào ví shop → mark 'paid' (KHÔNG escrow) ───
async function processDirectPayments(provider: JsonRpcProvider, from: number, to: number): Promise<void> {
  if (!USDC_ADDRESS) return;

  // Chỉ lọc theo ví shop đang có đơn chờ thanh toán (nhẹ + tránh nhiễu)
  const { rows: shops } = await db.query<{ wallet_address: string }>(
    `SELECT DISTINCT s.wallet_address
       FROM shops s JOIN orders o ON o.shop_id = s.id
      WHERE o.status = 'pending_payment' AND s.wallet_address IS NOT NULL`
  );
  if (!shops.length) return;
  const shopWallets = shops.map((s) => s.wallet_address);

  const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const logs = await usdc.queryFilter(usdc.filters.Transfer(null, shopWallets), from, to);

  for (const ev of logs as ethers.EventLog[]) {
    const to_   = String(ev.args?.to).toLowerCase();
    const from_ = String(ev.args?.from).toLowerCase();
    const value = (ev.args?.value as bigint).toString();

    // Tìm đúng đơn pending của shop này có tổng tiền khớp
    const { rows } = await db.query<{ id: string; order_code: string }>(
      `SELECT o.id, o.order_code
         FROM orders o JOIN shops s ON s.id = o.shop_id
        WHERE lower(s.wallet_address) = $1
          AND o.status = 'pending_payment'
          AND round(o.price_usdc * o.quantity * 1000000)::bigint = $2::bigint
        ORDER BY o.created_at ASC
        LIMIT 1`,
      [to_, value]
    );
    if (!rows.length) continue; // transfer không khớp đơn nào → bỏ qua

    const order = rows[0];
    await db.query(
      `UPDATE orders
          SET status = 'paid',
              buyer_wallet    = COALESCE(buyer_wallet, $2),
              tx_hash         = COALESCE(tx_hash, $3),
              chain_paid_from = COALESCE(chain_paid_from, 'arc'),
              updated_at      = NOW()
        WHERE id = $1 AND status = 'pending_payment'`,
      [order.id, from_, ev.transactionHash]
    );
    console.log(`[Indexer] ⚡ paid (QR trực tiếp, KHÔNG escrow): đơn ${order.order_code} | from ${from_} | tx ${ev.transactionHash}`);
  }
}

// ── Quét 1 dải block [from, to] ──────────────────────────────────────────────
async function processRange(escrow: Contract, from: number, to: number): Promise<void> {
  const orderMap = await buildOrderMap();
  const blockTsCache = new Map<number, number>();
  const provider = escrow.runner?.provider as JsonRpcProvider;

  async function blockTs(blockNumber: number): Promise<number> {
    if (blockTsCache.has(blockNumber)) return blockTsCache.get(blockNumber)!;
    const b = await provider.getBlock(blockNumber);
    const ts = b?.timestamp ?? Math.floor(Date.now() / 1000);
    blockTsCache.set(blockNumber, ts);
    return ts;
  }

  const [paid, released, refunded] = await Promise.all([
    escrow.queryFilter(escrow.filters.PaymentReceived(), from, to),
    escrow.queryFilter(escrow.filters.EscrowReleased(), from, to),
    escrow.queryFilter(escrow.filters.EscrowRefunded(), from, to),
  ]);

  for (const ev of paid as ethers.EventLog[]) {
    const orderId = String(ev.args?.orderId).toLowerCase();
    const order = orderMap.get(orderId);
    if (!order) { console.warn(`[Indexer] PaymentReceived không map được orderId ${orderId} (tx ${ev.transactionHash})`); continue; }
    await onPaymentReceived(order, String(ev.args?.buyer), ev.transactionHash, await blockTs(ev.blockNumber));
  }
  for (const ev of released as ethers.EventLog[]) {
    const order = orderMap.get(String(ev.args?.orderId).toLowerCase());
    if (order) await onEscrowFinalized(order, "released", ev.transactionHash);
  }
  for (const ev of refunded as ethers.EventLog[]) {
    const order = orderMap.get(String(ev.args?.orderId).toLowerCase());
    if (order) await onEscrowFinalized(order, "refunded", ev.transactionHash);
  }

  // QR kiểu 2: transfer USDC thẳng cho shop (cùng dải block)
  await processDirectPayments(provider, from, to);
}

// ── Quét từ lastBlock tới head, theo từng batch ──────────────────────────────
async function catchUp(escrow: Contract): Promise<void> {
  const provider = escrow.runner?.provider as JsonRpcProvider;
  const head = await provider.getBlockNumber();

  let last = await getLastBlock();
  if (last === null) {
    last = Math.max(0, head - MAX_LOOKBACK);
    console.log(`[Indexer] Lần đầu chạy — quét lùi từ block ${last} tới ${head}`);
  }
  if (last >= head) return;

  for (let from = last + 1; from <= head; from += BATCH_BLOCKS) {
    const to = Math.min(head, from + BATCH_BLOCKS - 1);
    await processRange(escrow, from, to);
    await setLastBlock(to);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
function assertConfig(): void {
  if (!ARC_RPC_URL || !ESCROW_ADDRESS) {
    throw new Error("Thiếu ARC_RPC_URL hoặc ESCROW_CONTRACT_ADDRESS trong .env");
  }
}

async function runOnce(): Promise<void> {
  assertConfig();
  await initState();
  await catchUp(getContract());
}

// Nhận diện lỗi rate-limit (HTTP 429) từ nhiều hình dạng lỗi khác nhau mà ethers/provider
// có thể ném ra (status code, error.code, hoặc chỉ có trong message).
function isRateLimited(err: any): boolean {
  const msg = String(err?.message ?? err ?? "");
  return err?.status === 429 || err?.info?.error?.code === 429 || msg.includes("429") || /too many requests/i.test(msg);
}

async function runLoop(): Promise<void> {
  assertConfig();
  await initState();
  const escrow = getContract();
  console.log(`[Indexer] 🤖 GiuPay escrow indexer chạy | escrow ${ESCROW_ADDRESS} | poll ${POLL_MS}ms`);

  // Dùng setTimeout đệ quy thay vì setInterval cố định — để giãn động khoảng chờ khi RPC
  // bị 429, thay vì cứ đập lại y hệt mỗi POLL_MS bất kể lỗi gì (điều này chính là 1 phần
  // nguyên nhân gây 429 dồn dập, xem BUGLOG.md 2026-07-18).
  let currentDelay = POLL_MS;

  const tick = async () => {
    try {
      await catchUp(escrow);
      currentDelay = POLL_MS; // thành công → về lại nhịp bình thường
    } catch (err: any) {
      if (isRateLimited(err)) {
        currentDelay = Math.min(currentDelay * 2, MAX_BACKOFF_MS);
        console.warn(`[Indexer] ⚠️ RPC bị rate-limit (429) — giãn poll ra ${currentDelay}ms`);
      } else {
        console.error("[Indexer] ❌ Lỗi poll:", err?.message ?? err);
      }
    }
    setTimeout(tick, currentDelay);
  };

  await tick();
}

// npm run indexer:once → quét 1 lượt; mặc định → chạy vòng lặp
const ONCE = process.argv.includes("--once");
if (ONCE) {
  runOnce().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
} else {
  runLoop().catch((e) => { console.error(e); process.exit(1); });
}

export { runOnce, catchUp, orderIdFromCode };
