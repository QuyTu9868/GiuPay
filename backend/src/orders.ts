import { Router, Request, Response } from "express";
import Joi from "joi";
import QRCode from "qrcode";
import { db } from "./db";
import { Order, Dispute, ApiResponse } from "./types";
import { orderIdFromCode, ensureOnchainDisputeOpen, adminResolveOnchain } from "./escrow-chain";
import { mintWarrantySBT } from "./sbt-chain";
import { requireAdminSession } from "./admin";

const router = Router();

// ── Auth middleware ────────────────────────────────────────

async function requireShop(req: Request, res: Response, next: Function) {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" });
    return;
  }
  const { rows } = await db.query("SELECT id, status FROM shops WHERE wallet_address=$1", [wallet]);
  if (!rows.length) { res.status(401).json({ success: false, error: "Shop không tồn tại" }); return; }
  if (rows[0].status !== "verified") { res.status(403).json({ success: false, error: "Shop chưa được duyệt" }); return; }
  (req as any).shopId = rows[0].id;
  (req as any).walletAddress = wallet;
  next();
}

// ── Helpers ────────────────────────────────────────────────

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genOrderCode() {
  let code = "ORD-";
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

function payUrl(code: string) {
  return `${process.env.GIUPAY_FRONTEND_URL ?? "https://giupay.io"}/pay/${code}`;
}

async function genQR(url: string) {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", width: 512, margin: 2 });
}

function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: Function) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      res.status(400).json({ success: false, error: error.details.map(d => d.message).join("; ") });
      return;
    }
    req.body = value;
    next();
  };
}

// ── Schemas ────────────────────────────────────────────────

const updateStatusSchema = Joi.object({
  status:           Joi.string().valid("paid","in_escrow","released","refunded","disputed").required(),
  buyer_wallet:     Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  tx_hash:          Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).optional(),
  sbt_token_id:     Joi.number().integer().optional(),
  chain_paid_from:  Joi.string().valid("ethereum","base","arbitrum","op","arc").optional(),
  // Thông tin giao hàng buyer nhập ở trang thanh toán (GHN) — đều optional
  buyer_name:        Joi.string().max(255).optional().allow(""),
  buyer_phone:       Joi.string().max(20).optional().allow(""),
  ship_address:      Joi.string().max(1000).optional().allow(""),
  ghn_province_id:   Joi.number().integer().optional(),
  ghn_province_name: Joi.string().max(255).optional().allow(""),
  ghn_district_id:   Joi.number().integer().optional(),
  ghn_district_name: Joi.string().max(255).optional().allow(""),
  ghn_ward_code:     Joi.string().max(20).optional().allow(""),
  ghn_ward_name:     Joi.string().max(255).optional().allow(""),
});

const shipSchema = Joi.object({
  weight: Joi.number().integer().min(1).max(1_000_000).required(),  // gram
  length: Joi.number().integer().min(1).max(500).required(),        // cm
  width:  Joi.number().integer().min(1).max(500).required(),
  height: Joi.number().integer().min(1).max(500).required(),
});

// Buyer lưu địa chỉ giao hàng (dùng cho cả luồng QR — không đi qua PUT /status)
const shippingSchema = Joi.object({
  buyer_name:        Joi.string().min(1).max(255).required(),
  buyer_phone:       Joi.string().pattern(/^[\d\s-]{9,15}$/).required(),
  ship_address:      Joi.string().min(1).max(1000).required(),
  ghn_province_id:   Joi.number().integer().optional().allow(null),
  ghn_province_name: Joi.string().max(255).optional().allow("", null),
  ghn_district_id:   Joi.number().integer().optional().allow(null),
  ghn_district_name: Joi.string().max(255).optional().allow("", null),
  ghn_ward_code:     Joi.string().max(20).optional().allow("", null),
  ghn_ward_name:     Joi.string().max(255).optional().allow("", null),
});

// Buyer báo đã burn USDC trên mạng khác qua CCTP — domain: Ethereum Sepolia=0, OP Sepolia=2,
// Arbitrum Sepolia=3, Base Sepolia=6 (theo bảng domain chính thức của Circle, KHÔNG phải chainId).
const bridgeStartSchema = Joi.object({
  source_domain: Joi.number().integer().valid(0, 2, 3, 6).required(),
  burn_tx_hash:  Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  buyer_wallet:  Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  chain_paid_from: Joi.string().valid("ethereum", "op", "arbitrum", "base").required(),
});

const openDisputeSchema = Joi.object({
  reason:     Joi.string().min(10).max(2000).required(),
  opened_by:  Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
});

const resolveDisputeSchema = Joi.object({
  resolution: Joi.string().valid("refunded","released").required(),
  admin_note: Joi.string().max(2000).optional(),
});

// Buyer đánh giá đơn đã hoàn tất — route POST /:code/review dùng schema này.
// LƯU Ý: bản này lưu DB thôi (Postgres bảng reviews), KHÔNG ghi lên blockchain thật —
// dù copy UI (ReviewPage.tsx) hiện đang nói "sẽ được ghi lên Arc Network permanently".
// Bảng reviews có sẵn cột tx_hash (nullable) cho việc này sau, nhưng chưa có cơ chế ghi on-chain
// nào được implement (không có Review contract/memo nào trong repo) — để tx_hash trống.
const createReviewSchema = Joi.object({
  rating:  Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(1000).optional().allow(""),
});

// ── Routes ─────────────────────────────────────────────────

// GET /api/orders — Danh sách đơn của shop
router.get("/", requireShop, async (req: Request, res: Response) => {
  const shopId = (req as any).shopId;
  const { status, page = "1", limit = "20" } = req.query;
  const p = Math.max(1, parseInt(page as string));
  const l = Math.min(100, parseInt(limit as string));
  const offset = (p - 1) * l;

  const where = status ? "AND status=$3" : "";
  const params: any[] = status ? [shopId, l, status, offset] : [shopId, l, offset];

  // Tái cấu trúc params cho query đúng thứ tự
  const orderParams  = status ? [shopId, status, l, offset] : [shopId, l, offset];
  const orderWhere   = status ? "AND o.status=$2" : "";
  const limitOffset  = status ? "$3 OFFSET $4" : "$2 OFFSET $3";
  const countParams  = status ? [shopId, status] : [shopId];
  const countWhere   = status ? "AND status=$2" : "";

  const [{ rows: orders }, { rows: count }] = await Promise.all([
    // LEFT JOIN LATERAL dispute đang mở gần nhất — dùng để Dashboard hiện đếm ngược 7 ngày
    // phản hồi tranh chấp (trước đây orders.ts trả * thôi, không có deadline_at nào cả).
    db.query(
      `SELECT o.*, d.deadline_at AS dispute_deadline_at
         FROM orders o
         LEFT JOIN LATERAL (
           SELECT deadline_at FROM disputes WHERE order_id = o.id AND status = 'open'
           ORDER BY opened_at DESC LIMIT 1
         ) d ON true
        WHERE o.shop_id=$1 ${orderWhere}
        ORDER BY o.created_at DESC LIMIT ${limitOffset}`,
      orderParams
    ),
    db.query(`SELECT COUNT(*) FROM orders WHERE shop_id=$1 ${countWhere}`, countParams),
  ]);

  res.json({ success: true, data: { orders, total: parseInt(count[0].count), page: p } });
});

// GET /api/orders/buyer — Đơn hàng mà buyer đã mua (dùng cho trang Profile)
// PHẢI đứng trước /:code để không bị Express match "buyer" như một order code
router.get("/buyer", async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" });
    return;
  }

  const { page = "1", limit = "20" } = req.query;
  const p = Math.max(1, parseInt(page as string));
  const l = Math.min(100, parseInt(limit as string));
  const offset = (p - 1) * l;

  const [{ rows: orders }, { rows: count }] = await Promise.all([
    db.query(
      `SELECT o.*, s.name as shop_name, s.category as shop_category, s.logo_cid as shop_logo,
              (r.id IS NOT NULL) as has_review
       FROM orders o
       JOIN shops s ON s.id = o.shop_id
       LEFT JOIN reviews r ON r.order_id = o.id
       WHERE o.buyer_wallet = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [wallet, l, offset]
    ),
    db.query("SELECT COUNT(*) FROM orders WHERE buyer_wallet = $1", [wallet]),
  ]);

  res.json({ success: true, data: { orders, total: parseInt(count[0].count), page: p } });
});

// GET /api/orders/:code — Chi tiết đơn (public)
router.get("/:code", async (req: Request, res: Response) => {
  const { rows } = await db.query(
    `SELECT o.*, s.name as shop_name, s.logo_cid as shop_logo_cid, s.return_policy,
            s.wallet_address as shop_wallet, (s.status = 'verified') as shop_verified,
            (r.id IS NOT NULL) as has_review
     FROM orders o JOIN shops s ON s.id=o.shop_id
     LEFT JOIN reviews r ON r.order_id = o.id
     WHERE o.order_code=$1`,
    [(req.params.code as string).toUpperCase()]
  );
  if (!rows.length) { res.status(404).json({ success: false, error: "Không tìm thấy đơn hàng" }); return; }

  // Ẩn qr_data + PII buyer khỏi endpoint CÔNG KHAI (ai có mã đơn cũng gọi được)
  const {
    qr_data, buyer_name, buyer_phone, ship_address,
    ghn_province_id, ghn_province_name, ghn_district_id, ghn_district_name,
    ghn_ward_code, ghn_ward_name, ...order
  } = rows[0] as any;
  res.json({ success: true, data: order });
});

// POST /api/orders/:code/review — Buyer đánh giá đơn đã hoàn tất (released)
// Trước bản sửa này route KHÔNG TỒN TẠI — ReviewPage.tsx (frontend) đã viết đầy đủ và gọi
// route này nhưng luôn nhận 404, nên không ai đánh giá được (xem implementation-notes.md).
router.post("/:code/review", validate(createReviewSchema), async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" });
    return;
  }
  const { rows } = await db.query(
    "SELECT id, status, buyer_wallet FROM orders WHERE order_code=$1",
    [(req.params.code as string).toUpperCase()]
  );
  if (!rows.length) { res.status(404).json({ success: false, error: "Không tìm thấy đơn hàng" }); return; }
  const order = rows[0];

  if (order.buyer_wallet?.toLowerCase() !== wallet) {
    res.status(403).json({ success: false, error: "Chỉ người mua đơn này mới đánh giá được" });
    return;
  }
  // Cho đánh giá ngay sau khi thanh toán (paid/in_escrow), không bắt chờ hết 14 ngày escrow.
  // Quyết định của chủ dự án: ưu tiên demo/thuyết trình, chấp nhận đánh đổi về mặt logic.
  if (!["paid", "in_escrow", "released"].includes(order.status)) {
    res.status(400).json({ success: false, error: "Chỉ đánh giá được đơn đã thanh toán" });
    return;
  }

  try {
    const { rows: review } = await db.query(
      "INSERT INTO reviews (order_id, buyer_wallet, rating, comment) VALUES ($1,$2,$3,$4) RETURNING id",
      [order.id, wallet, req.body.rating, req.body.comment || null]
    );
    res.status(201).json({ success: true, data: review[0], message: "Đã gửi đánh giá" } as ApiResponse);
  } catch (err: any) {
    // reviews.order_id có UNIQUE constraint — đơn đã được đánh giá trước đó
    if (err?.code === "23505") {
      res.status(409).json({ success: false, error: "Đơn này đã được đánh giá rồi" } as ApiResponse);
      return;
    }
    throw err;
  }
});

// GET /api/orders/:code/qr — Download QR (shop only)
router.get("/:code/qr", requireShop, async (req: Request, res: Response) => {
  const { rows } = await db.query(
    "SELECT * FROM orders WHERE order_code=$1 AND shop_id=$2",
    [(req.params.code as string).toUpperCase(), (req as any).shopId]
  );
  if (!rows.length) { res.status(404).json({ success: false, error: "Không tìm thấy đơn" }); return; }

  const order: Order = rows[0];

  if (req.query.format === "svg") {
    const svg = await QRCode.toString(order.pay_url, { type: "svg", margin: 2 });
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
    return;
  }

  if (req.query.raw === "true") {
    const qr = order.qr_data ?? await genQR(order.pay_url);
    const buf = Buffer.from(qr.replace(/^data:image\/png;base64,/, ""), "base64");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="QR-${order.order_code}.png"`);
    res.send(buf);
    return;
  }

  res.json({ success: true, data: { order_code: order.order_code, pay_url: order.pay_url, qr_data: order.qr_data } });
});

// DELETE /api/orders/:code — Xóa đơn hàng (chỉ đơn thủ công — listing_id IS NULL — để dev/shop
// dọn dẹp đơn test cho nhẹ). Đơn tạo từ sản phẩm thật (listing_id có giá trị) KHÔNG xóa được ở đây
// để tránh mất lịch sử mua hàng thật của buyer.
router.delete("/:code", requireShop, async (req: Request, res: Response) => {
  const shopId = (req as any).shopId;
  const code = (req.params.code as string).toUpperCase();

  const { rows: existing } = await db.query(
    "SELECT id, listing_id FROM orders WHERE order_code=$1 AND shop_id=$2",
    [code, shopId]
  );
  if (!existing.length) { res.status(404).json({ success: false, error: "Không tìm thấy đơn của shop này" }); return; }
  if (existing[0].listing_id !== null) {
    res.status(400).json({ success: false, error: "Chỉ xóa được đơn tạo thủ công, không xóa được đơn từ sản phẩm" });
    return;
  }
  const orderId = existing[0].id;

  // disputes/reviews đều REFERENCES orders(id) không có ON DELETE CASCADE — phải xóa trước
  // nếu không sẽ bị lỗi FK violation khi xóa order.
  await db.query("DELETE FROM disputes WHERE order_id=$1", [orderId]);
  await db.query("DELETE FROM reviews WHERE order_id=$1", [orderId]);
  await db.query("DELETE FROM orders WHERE id=$1", [orderId]);

  res.json({ success: true, message: `Đã xóa đơn ${code}` } as ApiResponse);
});

// POST /api/orders/:code/duplicate — Nhân bản đơn thủ công thành 1 đơn mới (mã mới, QR mới,
// status pending_payment) để test thanh toán lại nhiều lần. KHÔNG thể "trả lại" cùng 1 order_code
// vì contract PaymentEscrow.sol chặn vĩnh viễn on-chain (require buyer==address(0) theo orderId
// = keccak256(order_code)) — xem implementation-notes.md phần "Nhân bản đơn thay vì reset".
router.post("/:code/duplicate", requireShop, async (req: Request, res: Response) => {
  const shopId = (req as any).shopId;
  const code = (req.params.code as string).toUpperCase();

  const { rows: existing } = await db.query(
    "SELECT * FROM orders WHERE order_code=$1 AND shop_id=$2",
    [code, shopId]
  );
  if (!existing.length) { res.status(404).json({ success: false, error: "Không tìm thấy đơn của shop này" }); return; }
  const src = existing[0] as any;
  if (src.listing_id !== null) {
    res.status(400).json({ success: false, error: "Chỉ nhân bản được đơn tạo thủ công, không nhân bản được đơn từ sản phẩm" });
    return;
  }

  let newCode = "";
  for (let i = 0; i < 10; i++) {
    const c = genOrderCode();
    const { rows } = await db.query("SELECT id FROM orders WHERE order_code=$1", [c]);
    if (!rows.length) { newCode = c; break; }
  }
  if (!newCode) { res.status(500).json({ success: false, error: "Không gen được mã đơn" }); return; }

  const url = payUrl(newCode);
  const qr  = await genQR(url);

  const { rows } = await db.query<Order>(
    `INSERT INTO orders
      (order_code,shop_id,product_name,product_image_cid,description,price_usdc,quantity,warranty_days,pay_url,qr_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [newCode, shopId, src.product_name, src.product_image_cid, src.description,
     src.price_usdc, src.quantity, src.warranty_days, url, qr]
  );

  res.status(201).json({ success: true, data: rows[0], message: `Đã tạo đơn mới ${newCode} để test lại` } as ApiResponse);
});

// PUT /api/orders/:code/status — Update sau thanh toán (frontend gọi)
router.put("/:code/status", validate(updateStatusSchema), async (req: Request, res: Response) => {
  const b = req.body;
  const { rows: existing } = await db.query<Order>("SELECT * FROM orders WHERE order_code=$1", [(req.params.code as string).toUpperCase()]);
  if (!existing.length) { res.status(404).json({ success: false, error: "Không tìm thấy đơn" }); return; }

  const order = existing[0];
  const allowed: Record<string, string[]> = {
    // Trên Arc, escrow.pay() nạp thẳng vào escrow nên cho pending_payment → in_escrow luôn.
    pending_payment: ["paid","in_escrow"], paid: ["in_escrow"],
    in_escrow: ["released","refunded","disputed"], disputed: ["released","refunded"],
  };
  if (!(allowed[order.status] ?? []).includes(b.status)) {
    res.status(400).json({ success: false, error: `Không thể chuyển từ '${order.status}' sang '${b.status}'` });
    return;
  }

  const sets = ["status=$1","updated_at=NOW()"];
  const vals: any[] = [b.status];
  const push = (v: any, col: string) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };

  if (b.buyer_wallet)    push(b.buyer_wallet.toLowerCase(), "buyer_wallet");
  if (b.tx_hash)         push(b.tx_hash, "tx_hash");
  if (b.sbt_token_id)    push(b.sbt_token_id, "sbt_token_id");
  if (b.chain_paid_from) push(b.chain_paid_from, "chain_paid_from");
  // Địa chỉ giao hàng buyer (nếu có)
  if (b.buyer_name)        push(b.buyer_name, "buyer_name");
  if (b.buyer_phone)       push(b.buyer_phone, "buyer_phone");
  if (b.ship_address)      push(b.ship_address, "ship_address");
  if (b.ghn_province_id)   push(b.ghn_province_id, "ghn_province_id");
  if (b.ghn_province_name) push(b.ghn_province_name, "ghn_province_name");
  if (b.ghn_district_id)   push(b.ghn_district_id, "ghn_district_id");
  if (b.ghn_district_name) push(b.ghn_district_name, "ghn_district_name");
  if (b.ghn_ward_code)     push(b.ghn_ward_code, "ghn_ward_code");
  if (b.ghn_ward_name)     push(b.ghn_ward_name, "ghn_ward_name");
  if (b.status === "in_escrow") sets.push("escrow_created_at=NOW()");
  if (b.status === "released")  sets.push("escrow_released_at=NOW()");

  vals.push((req.params.code as string).toUpperCase());
  const { rows } = await db.query<Order>(`UPDATE orders SET ${sets.join(",")} WHERE order_code=$${vals.length} RETURNING *`, vals);
  const updated = rows[0];

  // Mint SBT bằng chứng mua hàng ngay khi tiền vừa vào escrow (thay vì chờ đến lúc release
  // sau 14 ngày) — theo yêu cầu người dùng. Idempotent (mintWarrantySBT tự check orderToToken
  // on-chain), nên nếu route này gọi trùng (vd retry) cũng không mint 2 lần. Lỗi mint KHÔNG
  // được chặn response (tiền đã vào escrow thật rồi) — chỉ log, bot.ts vẫn còn lượt mint dự
  // phòng lúc release nếu lần này lỗi (xem sbt-chain.ts).
  if (b.status === "in_escrow" && order.status !== "in_escrow") {
    try {
      const tokenId = await mintWarrantySBT({
        order_code: updated.order_code, product_name: updated.product_name,
        product_image_cid: updated.product_image_cid, warranty_days: updated.warranty_days,
        buyer_wallet: updated.buyer_wallet,
      });
      if (tokenId) {
        await db.query("UPDATE orders SET sbt_token_id=$1 WHERE id=$2", [tokenId, updated.id]);
        updated.sbt_token_id = tokenId;
        console.log(`[Orders] 🎖️  Đã mint SBT #${tokenId} cho đơn ${updated.order_code} lúc vào escrow`);
      }
    } catch (sbtErr: any) {
      console.error(`[Orders] ⚠️  Đơn ${updated.order_code} vào escrow nhưng mint SBT lỗi:`, sbtErr?.message ?? sbtErr);
    }
  }

  res.json({ success: true, data: updated, message: `Cập nhật: ${b.status}` });
});

// PUT /api/orders/:code/shipping — Buyer lưu địa chỉ giao hàng (public, buyer có mã đơn)
router.put("/:code/shipping", validate(shippingSchema), async (req: Request, res: Response) => {
  const code = (req.params.code as string).toUpperCase();
  const b = req.body;
  const { rows } = await db.query(
    `UPDATE orders SET buyer_name=$1, buyer_phone=$2, ship_address=$3,
        ghn_province_id=$4, ghn_province_name=$5, ghn_district_id=$6, ghn_district_name=$7,
        ghn_ward_code=$8, ghn_ward_name=$9, updated_at=NOW()
      WHERE order_code=$10 RETURNING order_code`,
    [b.buyer_name, b.buyer_phone, b.ship_address,
     b.ghn_province_id ?? null, b.ghn_province_name || null,
     b.ghn_district_id ?? null, b.ghn_district_name || null,
     b.ghn_ward_code || null, b.ghn_ward_name || null, code]
  );
  if (!rows.length) { res.status(404).json({ success: false, error: "Không tìm thấy đơn" }); return; }
  res.json({ success: true, message: "Đã lưu địa chỉ giao hàng" } as ApiResponse);
});

// POST /api/orders/:code/bridge-start — Buyer báo đã burn USDC trên mạng khác (CCTP), sau khi
// tx burn đã confirm trên chain nguồn. cctp-relayer.ts (chạy nền) sẽ tự poll attestation, mint
// USDC trên Arc, rồi nộp vào escrow thay buyer — không cần buyer làm gì thêm.
router.post("/:code/bridge-start", validate(bridgeStartSchema), async (req: Request, res: Response) => {
  const code = (req.params.code as string).toUpperCase();
  const { source_domain, burn_tx_hash, buyer_wallet, chain_paid_from } = req.body;
  const { rows } = await db.query(
    `UPDATE orders SET bridge_status='pending', bridge_source_domain=$1, bridge_burn_tx_hash=$2,
        bridge_error=NULL, buyer_wallet=$4, chain_paid_from=$5, updated_at=NOW()
      WHERE order_code=$3 AND status='pending_payment' RETURNING order_code`,
    [source_domain, burn_tx_hash, code, buyer_wallet.toLowerCase(), chain_paid_from]
  );
  if (!rows.length) {
    res.status(404).json({ success: false, error: "Không tìm thấy đơn, hoặc đơn đã được xử lý trước đó" });
    return;
  }
  res.json({ success: true, message: "Đã ghi nhận — đang bắc cầu về Arc (thường mất khoảng 30 giây tới vài phút)" } as ApiResponse);
});

// POST /api/orders/:code/ship — Shop tạo đơn giao hàng (nhập cân nặng + kích thước kiện)
router.post("/:code/ship", requireShop, validate(shipSchema), async (req: Request, res: Response) => {
  const shopId = (req as any).shopId;
  const code = (req.params.code as string).toUpperCase();
  const b = req.body;

  const { rows: existing } = await db.query<Order>(
    "SELECT * FROM orders WHERE order_code=$1 AND shop_id=$2", [code, shopId]
  );
  if (!existing.length) { res.status(404).json({ success: false, error: "Không tìm thấy đơn của shop này" }); return; }
  const order = existing[0] as any;

  if (!["paid", "in_escrow"].includes(order.status)) {
    res.status(400).json({ success: false, error: `Chỉ giao được đơn đã thanh toán, đơn đang '${order.status}'` });
    return;
  }
  if (order.shipped_at) { res.status(400).json({ success: false, error: "Đơn này đã tạo giao hàng rồi" }); return; }

  // Mã vận đơn demo — production: gọi GHN create-order API bằng kích thước kiện + địa chỉ buyer đã lưu
  const tracking = "GHN" + Math.random().toString(36).substring(2, 10).toUpperCase();

  const { rows } = await db.query<Order>(
    `UPDATE orders SET ship_weight=$1, ship_length=$2, ship_width=$3, ship_height=$4,
        ship_tracking=$5, shipped_at=NOW(), updated_at=NOW()
      WHERE id=$6 RETURNING *`,
    [b.weight, b.length, b.width, b.height, tracking, order.id]
  );
  res.json({ success: true, data: rows[0], message: `Đã tạo đơn giao hàng — mã vận đơn ${tracking}` } as ApiResponse);
});

// POST /api/orders/:code/dispute — Mở tranh chấp
router.post("/:code/dispute", validate(openDisputeSchema), async (req: Request, res: Response) => {
  const b = req.body;
  const { rows: [order] } = await db.query<Order>("SELECT * FROM orders WHERE order_code=$1", [(req.params.code as string).toUpperCase()]);
  if (!order) { res.status(404).json({ success: false, error: "Không tìm thấy đơn" }); return; }
  if (order.status !== "in_escrow") { res.status(400).json({ success: false, error: "Đơn không đang trong escrow" }); return; }

  if (order.escrow_created_at) {
    const release = new Date(order.escrow_created_at);
    release.setDate(release.getDate() + 14);
    if (new Date() > release) { res.status(400).json({ success: false, error: "Hết 14 ngày tranh chấp" }); return; }
  }

  const { rows: [{ count }] } = await db.query("SELECT COUNT(*) FROM disputes WHERE order_id=$1", [order.id]);
  if (parseInt(count) >= 3) { res.status(400).json({ success: false, error: "Đã đủ 3 lần tranh chấp" }); return; }

  const { rows: open } = await db.query("SELECT id FROM disputes WHERE order_id=$1 AND status='open'", [order.id]);
  if (open.length) { res.status(409).json({ success: false, error: "Đang có tranh chấp mở rồi" }); return; }

  const deadline = new Date(); deadline.setDate(deadline.getDate() + 7);
  const { rows: [dispute] } = await db.query<Dispute>(
    "INSERT INTO disputes (order_id,opened_by,reason,attempt_number,deadline_at) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [order.id, b.opened_by.toLowerCase(), b.reason, parseInt(count)+1, deadline]
  );
  await db.query("UPDATE orders SET status='disputed',updated_at=NOW() WHERE id=$1", [order.id]);

  res.status(201).json({ success: true, data: dispute, message: `Tranh chấp lần ${parseInt(count)+1} đã mở. Shop có 7 ngày phản hồi.` });
});

// GET /api/orders/:code/dispute — Lịch sử tranh chấp
router.get("/:code/dispute", async (req: Request, res: Response) => {
  const { rows: [order] } = await db.query("SELECT id FROM orders WHERE order_code=$1", [(req.params.code as string).toUpperCase()]);
  if (!order) { res.status(404).json({ success: false, error: "Không tìm thấy đơn" }); return; }
  const { rows } = await db.query("SELECT * FROM disputes WHERE order_id=$1 ORDER BY opened_at DESC", [order.id]);
  res.json({ success: true, data: rows });
});

// POST /api/orders/:code/ensure-onchain-dispute — Mở dispute THẬT trên chain hộ, chỉ dùng cho đơn
// trả qua CCTP (buyer trên chain là ví relayer/bot, buyer thật không tự ký openDispute() được).
// Gọi TRƯỚC KHI shop tự ký refundByShop() ở trang /dashboard/disputes/[code] — refundByShop() bắt
// buộc escrow đang ở trạng thái Disputed, nếu chưa mở (đơn CCTP) thì sẽ luôn revert "No dispute".
// Idempotent — nếu escrow đã Disputed rồi (đơn trả trực tiếp Arc, buyer đã tự ký) thì không làm gì.
router.post("/:code/ensure-onchain-dispute", async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" }); return;
  }
  const { rows: [order] } = await db.query(
    `SELECT o.buyer_wallet, s.wallet_address as shop_wallet, o.order_code
       FROM orders o JOIN shops s ON s.id = o.shop_id WHERE o.order_code=$1`,
    [(req.params.code as string).toUpperCase()]
  );
  if (!order) { res.status(404).json({ success: false, error: "Không tìm thấy đơn" }); return; }
  const isParty = order.buyer_wallet?.toLowerCase() === wallet || order.shop_wallet?.toLowerCase() === wallet;
  if (!isParty) { res.status(403).json({ success: false, error: "Không có quyền với đơn này" }); return; }

  try {
    await ensureOnchainDisputeOpen(orderIdFromCode(order.order_code));
    res.json({ success: true } as ApiResponse);
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.shortMessage ?? err.message ?? String(err) } as ApiResponse);
  }
});

// PUT /api/orders/:code/dispute/:disputeId/resolve — Admin xử lý tranh chấp
// QUAN TRỌNG: gọi smart contract THẬT trước (adminResolve), chỉ update DB nếu on-chain
// thành công — trước đây route này chỉ đổi DB rồi báo buyer "đã hoàn tiền" trong khi
// tiền vẫn còn kẹt trong escrow (không hề gọi contract). Xem escrow-chain.ts.
router.put("/:code/dispute/:disputeId/resolve", requireAdminSession, validate(resolveDisputeSchema), async (req: Request, res: Response) => {
  const b = req.body;
  const { rows: [dispute] } = await db.query(
    `SELECT d.*, o.id as order_id, o.order_code, o.product_name, o.product_image_cid,
            o.warranty_days, o.buyer_wallet
     FROM disputes d
     JOIN orders o ON o.id=d.order_id
     WHERE d.id=$1 AND o.order_code=$2 AND d.status='open'`,
    [(req.params.disputeId as string), (req.params.code as string).toUpperCase()]
  );
  if (!dispute) { res.status(404).json({ success: false, error: "Không tìm thấy tranh chấp" }); return; }

  const refund  = b.resolution === "refunded";
  const orderId = orderIdFromCode(dispute.order_code);

  let txHash: string;
  try {
    await ensureOnchainDisputeOpen(orderId);
    txHash = await adminResolveOnchain(orderId, refund);
  } catch (err: any) {
    res.status(502).json({
      success: false,
      error: `Không gọi được smart contract, chưa có gì thay đổi: ${err.shortMessage ?? err.message ?? String(err)}`,
    } as ApiResponse);
    return;
  }

  // QUAN TRỌNG: on-chain đã chạy xong ở trên (tiền đã thật sự chuyển) — nếu 2 câu UPDATE
  // này lỗi mà không bắt riêng, exception sẽ rơi thẳng ra ngoài route (express-async-errors
  // tự bắt) và trả 500 "Lỗi server" chung chung như thể chưa có gì xảy ra, trong khi thực tế
  // tiền đã di chuyển trên chain rồi — cực kỳ dễ gây hiểu lầm "chưa xử lý" rồi bấm lại lần 2.
  // Bắt riêng để LUÔN trả về đúng sự thật: on-chain đã xong, kèm tx hash, kể cả khi DB lỗi.
  try {
    await db.query("UPDATE disputes SET status='resolved',resolution=$1,admin_note=$2,resolved_at=NOW() WHERE id=$3",
      [b.resolution, b.admin_note||null, req.params.disputeId]);

    const newStatus = refund ? "refunded" : "released";
    const extra = newStatus === "released" ? ",escrow_released_at=NOW()" : "";
    await db.query(`UPDATE orders SET status=$1,tx_hash=$2,updated_at=NOW()${extra} WHERE id=$3`, [newStatus, txHash, dispute.order_id]);

    // Admin xử lý nghiêng về shop (released) — mint SBT bằng chứng mua hàng, giống luồng
    // release tự động 14 ngày trong bot.ts. Lỗi ở đây KHÔNG được chặn response thành công
    // (tiền đã giải ngân thật rồi) — chỉ log để xử lý tay sau nếu cần (xem sbt-chain.ts).
    if (newStatus === "released") {
      try {
        const tokenId = await mintWarrantySBT({
          order_code: dispute.order_code, product_name: dispute.product_name,
          product_image_cid: dispute.product_image_cid, warranty_days: dispute.warranty_days,
          buyer_wallet: dispute.buyer_wallet,
        });
        if (tokenId) await db.query("UPDATE orders SET sbt_token_id=$1 WHERE id=$2", [tokenId, dispute.order_id]);
      } catch (sbtErr: any) {
        console.error(`[Dispute resolve] Mint SBT lỗi cho đơn ${dispute.order_code}:`, sbtErr?.message ?? sbtErr);
      }
    }
  } catch (dbErr: any) {
    res.status(500).json({
      success: false,
      error: `Đã xử lý THÀNH CÔNG trên smart contract (tx ${txHash}) nhưng lưu vào database bị lỗi: ` +
        `${dbErr.message ?? String(dbErr)}. KHÔNG bấm xử lý lại — tiền đã chuyển rồi, chỉ cần sửa dữ liệu ` +
        `đơn ${dispute.order_code} thủ công cho khớp on-chain.`,
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: `${refund ? "Đã hoàn tiền cho người mua" : "Đã giải phóng escrow cho shop"} on-chain (tx ${txHash.slice(0,10)}...)`,
  } as ApiResponse);
});

export default router;