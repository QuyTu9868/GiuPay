import { Router, Request, Response } from "express";
import Joi from "joi";
import QRCode from "qrcode";
import { db } from "./db";

const router = Router();

// ── Auth middleware ────────────────────────────────────────────

async function requireShop(req: Request, res: Response, next: Function) {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" });
    return;
  }
  const { rows } = await db.query(
    "SELECT id, status FROM shops WHERE wallet_address=$1",
    [wallet]
  );
  if (!rows.length) {
    res.status(401).json({ success: false, error: "Shop không tồn tại" });
    return;
  }
  if (rows[0].status !== "verified") {
    res.status(403).json({ success: false, error: "Shop chưa được duyệt" });
    return;
  }
  (req as any).shopId = rows[0].id;
  (req as any).walletAddress = wallet;
  next();
}

// ── Schemas ───────────────────────────────────────────────────

const createSchema = Joi.object({
  name:          Joi.string().min(2).max(500).required(),
  description:   Joi.string().max(5000).optional().allow(""),
  price_usdc:    Joi.number().positive().max(100_000).required(),
  image_cid:     Joi.string().optional().allow(""),
  warranty_days: Joi.number().integer().min(0).max(3650).default(0),
});

const updateSchema = Joi.object({
  name:          Joi.string().min(2).max(500).optional(),
  description:   Joi.string().max(5000).optional().allow(""),
  price_usdc:    Joi.number().positive().max(100_000).optional(),
  image_cid:     Joi.string().optional().allow(""),
  warranty_days: Joi.number().integer().min(0).max(3650).optional(),
  is_active:     Joi.boolean().optional(),
});

// ── Helpers ───────────────────────────────────────────────────

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

// ── Routes ────────────────────────────────────────────────────

// GET /api/listings/my — Seller's own listings (requires wallet auth)
router.get("/my", requireShop, async (req: Request, res: Response) => {
  const { rows } = await db.query(
    "SELECT * FROM listings WHERE shop_id=$1 ORDER BY created_at DESC",
    [(req as any).shopId]
  );
  res.json({ success: true, data: { listings: rows } });
});

// GET /api/listings/shop/:shopId — Public: active listings for a shop
router.get("/shop/:shopId", async (req: Request, res: Response) => {
  const { shopId } = req.params;
  const { rows } = await db.query(
    "SELECT * FROM listings WHERE shop_id=$1 AND is_active=true ORDER BY created_at DESC",
    [shopId]
  );
  res.json({ success: true, data: { listings: rows } });
});

// GET /api/listings/:id — Public: chi tiết 1 sản phẩm (dùng cho trang full-page kiểu Shopee,
// bấm vào card sản phẩm ở trang shop sẽ chuyển sang trang này thay vì mở modal).
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = await db.query(
    `SELECT l.id, l.name, l.description, l.price_usdc, l.image_cid, l.warranty_days, l.is_active,
            s.id AS shop_id, s.name AS shop_name, s.status AS shop_status, s.wallet_address AS shop_wallet
     FROM listings l JOIN shops s ON s.id = l.shop_id
     WHERE l.id = $1`,
    [id]
  );
  if (!rows.length || rows[0].shop_status !== "verified") {
    res.status(404).json({ success: false, error: "Sản phẩm không tồn tại" });
    return;
  }
  const l = rows[0];
  res.json({
    success: true,
    data: {
      id: l.id,
      name: l.name,
      description: l.description ?? null,
      priceUsdc: l.price_usdc,
      imageCid: l.image_cid ?? null,
      warrantyDays: l.warranty_days ?? 0,
      isActive: l.is_active,
      shopId: l.shop_id,
      shopName: l.shop_name,
      // Dùng để chặn chủ shop tự mua sản phẩm của chính mình (so sánh với ví đang kết nối).
      shopWallet: l.shop_wallet,
    },
  });
});

// POST /api/listings — Create a new listing
router.post("/", requireShop, async (req: Request, res: Response) => {
  const { error, value: b } = createSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ success: false, error: error.details.map(d => d.message).join("; ") });
    return;
  }
  const { rows } = await db.query(
    `INSERT INTO listings (shop_id, name, description, price_usdc, image_cid, warranty_days)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      (req as any).shopId,
      b.name,
      b.description || null,
      parseFloat(b.price_usdc).toFixed(6),
      b.image_cid || null,
      b.warranty_days,
    ]
  );
  res.status(201).json({ success: true, data: rows[0], message: "Đã tạo sản phẩm" });
});

// PATCH /api/listings/:id — Update listing (name, price, description, image, active toggle)
router.patch("/:id", requireShop, async (req: Request, res: Response) => {
  const { id } = req.params;
  const shopId = (req as any).shopId;

  const { rows: existing } = await db.query(
    "SELECT id FROM listings WHERE id=$1 AND shop_id=$2",
    [id, shopId]
  );
  if (!existing.length) {
    res.status(404).json({ success: false, error: "Không tìm thấy sản phẩm" });
    return;
  }

  const { error, value: b } = updateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ success: false, error: error.details.map(d => d.message).join("; ") });
    return;
  }

  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (b.name        !== undefined) { fields.push(`name=$${idx++}`);        params.push(b.name); }
  if (b.description !== undefined) { fields.push(`description=$${idx++}`); params.push(b.description || null); }
  if (b.price_usdc  !== undefined) { fields.push(`price_usdc=$${idx++}`);  params.push(parseFloat(b.price_usdc).toFixed(6)); }
  if (b.image_cid   !== undefined) { fields.push(`image_cid=$${idx++}`);   params.push(b.image_cid || null); }
  if (b.warranty_days !== undefined) { fields.push(`warranty_days=$${idx++}`); params.push(b.warranty_days); }
  if (b.is_active   !== undefined) { fields.push(`is_active=$${idx++}`);   params.push(b.is_active); }

  if (!fields.length) {
    res.status(400).json({ success: false, error: "Không có gì để cập nhật" });
    return;
  }
  fields.push(`updated_at=NOW()`);
  params.push(id);

  const { rows } = await db.query(
    `UPDATE listings SET ${fields.join(",")} WHERE id=$${idx} RETURNING *`,
    params
  );
  res.json({ success: true, data: rows[0], message: "Đã cập nhật sản phẩm" });
});

// DELETE /api/listings/:id — Delete listing
router.delete("/:id", requireShop, async (req: Request, res: Response) => {
  const { id } = req.params;
  const shopId = (req as any).shopId;
  const { rowCount } = await db.query(
    "DELETE FROM listings WHERE id=$1 AND shop_id=$2",
    [id, shopId]
  );
  if (!rowCount) {
    res.status(404).json({ success: false, error: "Không tìm thấy sản phẩm" });
    return;
  }
  res.json({ success: true, message: "Đã xóa sản phẩm" });
});

// POST /api/listings/:id/buy — Buyer creates an order from a listing (no auth required)
router.post("/:id/buy", async (req: Request, res: Response) => {
  const { id } = req.params;

  const { rows: found } = await db.query(
    `SELECT l.*, s.status AS shop_status, s.wallet_address AS shop_wallet
     FROM listings l JOIN shops s ON s.id = l.shop_id
     WHERE l.id = $1`,
    [id]
  );
  if (!found.length) {
    res.status(404).json({ success: false, error: "Sản phẩm không tồn tại" });
    return;
  }
  const listing = found[0];
  if (!listing.is_active) {
    res.status(400).json({ success: false, error: "Sản phẩm không còn bán" });
    return;
  }
  if (listing.shop_status !== "verified") {
    res.status(400).json({ success: false, error: "Shop không hoạt động" });
    return;
  }

  let code = "";
  for (let i = 0; i < 10; i++) {
    const c = genOrderCode();
    const { rows } = await db.query("SELECT id FROM orders WHERE order_code=$1", [c]);
    if (!rows.length) { code = c; break; }
  }
  if (!code) {
    res.status(500).json({ success: false, error: "Không gen được mã đơn" });
    return;
  }

  const url = payUrl(code);
  const qr = await genQR(url);

  const { rows } = await db.query(
    `INSERT INTO orders
       (order_code, shop_id, product_name, product_image_cid, description,
        price_usdc, quantity, warranty_days, pay_url, qr_data, listing_id)
     VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8,$9,$10)
     RETURNING *`,
    [
      code,
      listing.shop_id,
      listing.name,
      listing.image_cid || null,
      listing.description || null,
      listing.price_usdc,
      listing.warranty_days || 0,
      url,
      qr,
      listing.id,
    ]
  );

  res.status(201).json({
    success: true,
    data: { order_code: code, pay_url: url, qr_data: qr, order: rows[0] },
    message: `Đơn ${code} đã được tạo`,
  });
});

export default router;
