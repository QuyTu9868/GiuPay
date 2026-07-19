/**
 * GiuPay — shops.ts (Bước 11)
 *
 * Routes:
 *   POST   /api/shops                    — Đăng ký shop mới (public, wallet auth)
 *   GET    /api/shops                    — Danh sách shop verified (public, homepage)
 *   GET    /api/shops/me                 — Thông tin shop của ví đang kết nối
 *   GET    /api/shops/:id                — Chi tiết shop public (trang shop)
 *   PUT    /api/shops/me                 — Cập nhật thông tin shop (wallet auth)
 *   GET    /api/shops/:id/orders         — Danh sách đơn public của shop
 *   GET    /api/shops/:id/reviews        — Danh sách đánh giá của shop
 *   POST   /api/shops/me/dispute-response — Shop phản hồi tranh chấp
 *   PUT    /api/shops/me/reviews/:reviewId/reply — Shop trả lời 1 đánh giá
 *
 * Auth:
 *   - Public routes: GET /api/shops, GET /api/shops/:id, GET /api/shops/:id/orders, GET /api/shops/:id/reviews
 *   - requireWallet: POST /api/shops, GET /api/shops/me, PUT /api/shops/me
 *   - requireVerifiedShop: POST /api/shops/me/dispute-response, PUT /api/shops/me/reviews/:reviewId/reply
 *
 * Ghi chú:
 *   - Shop mới tạo có status = 'pending', Admin duyệt qua /api/admin/shops/:id/approve
 *   - Sau khi được duyệt, Admin gọi ShopRegistry.sol để lưu onchain
 *   - doc_cid (IPFS) và doc_hash (keccak256 của CID) lưu cả DB lẫn onchain
 */

import { Router, Request, Response } from "express";
import Joi from "joi";
import { db } from "./db";
import { sendMail } from "./upload";
import { Shop, ApiResponse } from "./types";

const router = Router();

// ── Auth middlewares ───────────────────────────────────────

/**
 * Xác thực wallet address từ header X-Wallet-Address.
 * Attach req.walletAddress, req.shopId (nếu shop tồn tại), req.shopStatus.
 */
async function requireWallet(req: Request, res: Response, next: Function) {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu hoặc sai X-Wallet-Address header" } as ApiResponse);
    return;
  }
  (req as any).walletAddress = wallet;

  // Attach shopId nếu shop tồn tại (không bắt buộc phải verified ở middleware này)
  const { rows } = await db.query(
    "SELECT id, status FROM shops WHERE wallet_address = $1",
    [wallet]
  );
  if (rows.length) {
    (req as any).shopId     = rows[0].id;
    (req as any).shopStatus = rows[0].status;
  }

  next();
}

/**
 * Yêu cầu shop đã được duyệt (verified).
 * Dùng sau requireWallet.
 */
async function requireVerifiedShop(req: Request, res: Response, next: Function) {
  if (!(req as any).shopId) {
    res.status(401).json({ success: false, error: "Shop không tồn tại" } as ApiResponse);
    return;
  }
  if ((req as any).shopStatus !== "verified") {
    res.status(403).json({ success: false, error: "Shop chưa được Admin duyệt" } as ApiResponse);
    return;
  }
  next();
}

// ── Validation helpers ─────────────────────────────────────

function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: Function) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details.map(d => d.message).join("; "),
      } as ApiResponse);
      return;
    }
    req.body = value;
    next();
  };
}

// ── Schemas ────────────────────────────────────────────────

const registerShopSchema = Joi.object({
  name:          Joi.string().required(),
  description:   Joi.string().required(),
  category:      Joi.string().required(),
  gmail:         Joi.string().email().required(),
  return_policy: Joi.string().required(),
  facebook_url:  Joi.string().optional().allow(""),
  logo_cid:      Joi.string().optional().allow(""),
  doc_cid:       Joi.string().optional().allow(""),
  doc_hash:      Joi.string().optional().allow(""),
});

const updateShopSchema = Joi.object({
  name:          Joi.string().optional(),
  description:   Joi.string().optional(),
  category:      Joi.string().optional(),
  gmail:         Joi.string().email().optional(),
  return_policy: Joi.string().optional(),
  facebook_url:  Joi.string().optional().allow(""),
  logo_cid:      Joi.string().optional().allow(""),
});

const disputeResponseSchema = Joi.object({
  dispute_id:    Joi.string().uuid().required(),
  shop_response: Joi.string().min(10).max(2000).required(),
  // Nếu shop đồng ý hoàn tiền ngay
  agree_refund:  Joi.boolean().default(false),
  // Bắt buộc nếu agree_refund=true — hash tx refundByShop() shop vừa tự ký on-chain (frontend
  // gọi contract TRƯỚC, có tx thành công rồi mới POST route này để ghi DB khớp với chain).
  tx_hash:       Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).when("agree_refund", { is: true, then: Joi.required(), otherwise: Joi.optional() }),
});

const replyReviewSchema = Joi.object({
  reply: Joi.string().min(1).max(1000).required(),
});

// ── Routes ─────────────────────────────────────────────────

/**
 * POST /api/shops
 * Đăng ký shop mới — status = 'pending', chờ Admin duyệt.
 * Public: ai cũng đăng ký được nhưng cần có ví.
 */
router.post(
  "/",
  requireWallet,
  validate(registerShopSchema),
  async (req: Request, res: Response) => {
    const wallet = (req as any).walletAddress as string;
    const b      = req.body;

    // Kiểm tra ví đã đăng ký chưa
    const { rows: existing } = await db.query(
      "SELECT id, status FROM shops WHERE wallet_address = $1",
      [wallet]
    );

    if (existing.length) {
      const shop = existing[0];
      if (shop.status === "pending") {
        res.status(409).json({
          success: false,
          error: "Ví này đã có đơn đăng ký đang chờ duyệt.",
        } as ApiResponse);
        return;
      }
      if (shop.status === "verified") {
        res.status(409).json({
          success: false,
          error: "Ví này đã có shop được duyệt. Vào Dashboard để quản lý.",
        } as ApiResponse);
        return;
      }
      // status === 'rejected' → cho phép đăng ký lại, update record cũ
      await db.query(
        `UPDATE shops SET
           name=$1, description=$2, category=$3, gmail=$4,
           return_policy=$5, facebook_url=$6, logo_cid=$7,
           doc_cid=$8, doc_hash=$9, status='pending', reject_reason=NULL,
           updated_at=NOW()
         WHERE id=$10`,
        [
          b.name, b.description, b.category, b.gmail,
          b.return_policy, b.facebook_url || null, b.logo_cid || null,
          b.doc_cid || null, b.doc_hash || null, shop.id,
        ]
      );

      const { rows: [updated] } = await db.query(
        "SELECT * FROM shops WHERE id = $1",
        [shop.id]
      );

      // Notify Admin
      await sendMail({
        to:   process.env.ADMIN_EMAIL ?? "",
        type: "shop_new_registration",
        data: { shop_name: b.name, gmail: b.gmail, wallet: wallet, note: "Đơn đăng ký lại" },
      }).catch(() => {}); // non-blocking

      res.status(200).json({
        success: true,
        data: updated,
        message: "Đơn đăng ký lại đã được gửi. Chờ Admin duyệt.",
      } as ApiResponse);
      return;
    }

    // Tạo shop mới
    const { rows: [shop] } = await db.query<Shop>(
      `INSERT INTO shops
         (wallet_address, name, description, category, gmail,
          return_policy, facebook_url, logo_cid, doc_cid, doc_hash, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
       RETURNING *`,
      [
        wallet, b.name, b.description, b.category, b.gmail,
        b.return_policy, b.facebook_url || null, b.logo_cid || null,
        b.doc_cid || null, b.doc_hash || null,
      ]
    );

    // Notify Admin về đơn mới
    await sendMail({
      to:   process.env.ADMIN_EMAIL ?? "",
      type: "shop_new_registration",
      data: { shop_name: b.name, gmail: b.gmail, wallet: wallet, note: "Đơn đăng ký mới" },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      data: shop,
      message: "Đăng ký thành công. Vui lòng chờ Admin duyệt (thường trong 24h). Gmail thông báo sẽ được gửi khi có kết quả.",
    } as ApiResponse);
  }
);

/**
 * GET /api/shops
 * Danh sách shop verified — dùng cho trang chủ / marketplace.
 * Public. Hỗ trợ filter theo category + search theo tên.
 */
router.get("/", async (req: Request, res: Response) => {
  const { category, search, page = "1", limit = "20" } = req.query;
  const p = Math.max(1, parseInt(page as string));
  const l = Math.min(50, Math.max(1, parseInt(limit as string)));
  const offset = (p - 1) * l;

  // Build dynamic WHERE
  const conditions = ["s.status = 'verified'"];
  const params: any[] = [];

  if (category && category !== "All") {
    params.push(category);
    conditions.push(`s.category = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`s.name ILIKE $${params.length}`);
  }

  const where = conditions.join(" AND ");

  // Main query with stats
  params.push(l, offset);
  const { rows: shops } = await db.query(
    `SELECT
       s.id, s.name, s.description, s.category,
       COALESCE(s.logo_cid, s.doc_cid) AS logo_cid,
       s.wallet_address, s.created_at,
       COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
       COUNT(DISTINCT o.id)::int                      AS total_orders
     FROM shops s
     LEFT JOIN orders o  ON o.shop_id = s.id AND o.status IN ('paid','in_escrow','released')
     LEFT JOIN reviews r ON r.order_id = o.id
     WHERE ${where}
     GROUP BY s.id
     ORDER BY avg_rating DESC, total_orders DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Count query
  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM shops s WHERE ${where}`,
    countParams
  );

  res.json({
    success: true,
    data: {
      shops,
      total: parseInt(count),
      page: p,
      totalPages: Math.ceil(parseInt(count) / l),
    },
  } as ApiResponse);
});

/**
 * GET /api/shops/me
 * Thông tin shop của wallet đang kết nối.
 * Trả về cả pending/rejected — dùng cho dashboard và register flow.
 */
router.get("/me", requireWallet, async (req: Request, res: Response) => {
  const wallet = (req as any).walletAddress as string;

  const { rows } = await db.query(
    `SELECT
       s.*,
       COUNT(DISTINCT o.id)::int                      AS total_orders,
       COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)  AS avg_rating,
       COALESCE(SUM(CASE WHEN o.status='in_escrow' THEN o.price_usdc ELSE 0 END), 0) AS escrow_balance
     FROM shops s
     LEFT JOIN orders o  ON o.shop_id = s.id
     LEFT JOIN reviews r ON r.order_id = o.id AND o.status IN ('paid','in_escrow','released')
     WHERE s.wallet_address = $1
     GROUP BY s.id`,
    [wallet]
  );

  if (!rows.length) {
    res.status(404).json({ success: false, error: "Chưa có shop nào với ví này." } as ApiResponse);
    return;
  }

  res.json({ success: true, data: rows[0] } as ApiResponse);
});

/**
 * GET /api/shops/:id/full
 * Shop + listings + orders trong 1 request — dùng cho ISR / getStaticProps.
 * Chạy 3 query song song để giảm latency.
 */
router.get("/:id/full", async (req: Request, res: Response) => {
  const { id } = req.params;

  const [shopResult, listingsResult, ordersResult] = await Promise.all([
    db.query(
      `SELECT s.id, s.name, s.description, s.category,
         s.gmail, s.facebook_url, s.return_policy,
         COALESCE(s.logo_cid, s.doc_cid) AS logo_cid,
         s.wallet_address, s.created_at,
         COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
         COUNT(DISTINCT o.id)::int                      AS total_orders
       FROM shops s
       LEFT JOIN orders o  ON o.shop_id = s.id AND o.status IN ('paid','in_escrow','released')
       LEFT JOIN reviews r ON r.order_id = o.id
       WHERE s.id = $1 AND s.status = 'verified'
       GROUP BY s.id`,
      [id]
    ),
    db.query(
      `SELECT id, name, description, price_usdc, image_cid, warranty_days, is_active
       FROM listings WHERE shop_id = $1 AND is_active = true ORDER BY created_at DESC`,
      [id]
    ),
    db.query(
      `SELECT o.id, o.order_code, o.product_name, o.price_usdc,
         o.warranty_days, o.status, o.created_at,
         r.rating, r.comment, r.buyer_wallet, r.created_at AS review_at
       FROM orders o
       LEFT JOIN reviews r ON r.order_id = o.id
       WHERE o.shop_id = $1 AND o.status IN ('paid','in_escrow','released')
       ORDER BY o.created_at DESC LIMIT 20`,
      [id]
    ),
  ]);

  if (!shopResult.rows.length) {
    res.status(404).json({ success: false, error: "Shop không tồn tại." } as ApiResponse);
    return;
  }

  const s = shopResult.rows[0];
  res.json({
    success: true,
    data: {
      shop: {
        id: s.id, name: s.name, description: s.description,
        category: s.category, gmail: s.gmail,
        facebookUrl: s.facebook_url ?? null,
        returnPolicy: s.return_policy, status: "verified",
        avgRating: parseFloat(s.avg_rating ?? "0"),
        totalOrders: s.total_orders ?? 0,
        totalRevenue: "—", createdAt: s.created_at,
        // Cần cho: (1) hiện logo thật thay vì ảnh demo, (2) so sánh ví đang kết nối với chủ shop
        // để chặn tự mua hàng của chính mình / hiện banner "quản lý shop" (xem implementation-notes.md).
        logoCid: s.logo_cid ?? null,
        walletAddress: s.wallet_address,
      },
      listings: listingsResult.rows.map(l => ({
        id: l.id, name: l.name,
        ...(l.description ? { description: l.description } : {}),
        priceUsdc: l.price_usdc,
        ...(l.image_cid ? { imageCid: l.image_cid } : {}),
        warrantyDays: l.warranty_days ?? 0,
        isActive: l.is_active,
      })),
      orders: ordersResult.rows.map(o => ({
        id: o.id, orderCode: o.order_code, productName: o.product_name,
        priceUsdc: o.price_usdc, warrantyDays: o.warranty_days,
        status: o.status, createdAt: o.created_at,
        ...(o.rating ? { review: {
          rating: o.rating, comment: o.comment ?? null,
          buyerWallet: o.buyer_wallet, createdAt: o.review_at,
        }} : {}),
      })),
    },
  } as ApiResponse);
});

/**
 * GET /api/shops/:id
 * Chi tiết shop public — dùng cho trang /shop/:id.
 * Chỉ trả về shop verified.
 */
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const { rows } = await db.query(
    `SELECT
       s.id, s.name, s.description, s.category,
       s.gmail, s.facebook_url, s.return_policy,
       COALESCE(s.logo_cid, s.doc_cid) AS logo_cid,
       s.wallet_address, s.created_at,
       COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
       COUNT(DISTINCT o.id)::int                      AS total_orders
     FROM shops s
     LEFT JOIN orders o  ON o.shop_id = s.id AND o.status IN ('paid','in_escrow','released')
     LEFT JOIN reviews r ON r.order_id = o.id
     WHERE s.id = $1 AND s.status = 'verified'
     GROUP BY s.id`,
    [id]
  );

  if (!rows.length) {
    res.status(404).json({ success: false, error: "Shop không tồn tại hoặc chưa được duyệt." } as ApiResponse);
    return;
  }

  res.json({ success: true, data: rows[0] } as ApiResponse);
});



/**
 * PUT /api/shops/me
 * Cập nhật thông tin shop — chỉ shop đã verified mới được sửa.
 * Wallet phải match với shop.
 */
router.put(
  "/me",
  requireWallet,
  requireVerifiedShop,
  validate(updateShopSchema),
  async (req: Request, res: Response) => {
    const shopId = (req as any).shopId as string;
    const b      = req.body;

    // Build SET clause động
    const sets: string[]  = ["updated_at = NOW()"];
    const vals: any[]     = [];

    const fieldMap: Record<string, string> = {
      name:          "name",
      description:   "description",
      category:      "category",
      gmail:         "gmail",
      return_policy: "return_policy",
      facebook_url:  "facebook_url",
      logo_cid:      "logo_cid",
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (b[key] !== undefined) {
        vals.push(b[key] || null);
        sets.push(`${col} = $${vals.length}`);
      }
    }

    if (sets.length === 1) {
      res.status(400).json({ success: false, error: "Không có trường nào để cập nhật." } as ApiResponse);
      return;
    }

    vals.push(shopId);
    const { rows: [updated] } = await db.query(
      `UPDATE shops SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );

    res.json({
      success: true,
      data: updated,
      message: "Thông tin shop đã được cập nhật.",
    } as ApiResponse);
  }
);

/**
 * GET /api/shops/:id/orders
 * Danh sách đơn hàng công khai của shop — dùng cho trang shop public.
 * Chỉ trả về đơn đã released (hiển thị công khai).
 */
router.get("/:id/orders", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = "1", limit = "10" } = req.query;
  const p = Math.max(1, parseInt(page as string));
  const l = Math.min(50, parseInt(limit as string));
  const offset = (p - 1) * l;

  // Verify shop exists + verified
  const { rows: shopRows } = await db.query(
    "SELECT id FROM shops WHERE id = $1 AND status = 'verified'",
    [id]
  );
  if (!shopRows.length) {
    res.status(404).json({ success: false, error: "Shop không tồn tại." } as ApiResponse);
    return;
  }

  const { rows: orders } = await db.query(
    `SELECT
       o.order_code, o.product_name, o.product_image_cid,
       o.description, o.price_usdc, o.quantity, o.warranty_days,
       o.status, o.escrow_created_at, o.created_at,
       r.rating, r.comment, r.buyer_wallet, r.created_at AS review_at
     FROM orders o
     LEFT JOIN reviews r ON r.order_id = o.id
     WHERE o.shop_id = $1 AND o.status IN ('paid','in_escrow','released')
     ORDER BY o.created_at DESC
     LIMIT $2 OFFSET $3`,
    [id, l, offset]
  );

  const { rows: [{ count }] } = await db.query(
    "SELECT COUNT(*) FROM orders WHERE shop_id = $1 AND status IN ('paid','in_escrow','released')",
    [id]
  );

  res.json({
    success: true,
    data: { orders, total: parseInt(count), page: p },
  } as ApiResponse);
});

/**
 * GET /api/shops/:id/reviews
 * Danh sách đánh giá của shop — dùng cho rating section.
 */
router.get("/:id/reviews", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = "1", limit = "10" } = req.query;
  const p = Math.max(1, parseInt(page as string));
  const l = Math.min(50, parseInt(limit as string));
  const offset = (p - 1) * l;

  const { rows: reviews } = await db.query(
    `SELECT
       r.id, r.rating, r.comment, r.buyer_wallet,
       r.tx_hash, r.created_at,
       r.shop_reply, r.shop_replied_at,
       o.product_name, o.order_code
     FROM reviews r
     JOIN orders o ON o.id = r.order_id
     WHERE o.shop_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [id, l, offset]
  );

  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM reviews r
     JOIN orders o ON o.id = r.order_id
     WHERE o.shop_id = $1`,
    [id]
  );

  // Rating distribution
  const { rows: dist } = await db.query(
    `SELECT r.rating, COUNT(*)::int AS count
     FROM reviews r
     JOIN orders o ON o.id = r.order_id
     WHERE o.shop_id = $1
     GROUP BY r.rating ORDER BY r.rating DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      reviews,
      total: parseInt(count),
      page: p,
      distribution: dist,
    },
  } as ApiResponse);
});

/**
 * POST /api/shops/me/dispute-response
 * Shop phản hồi tranh chấp trong vòng 7 ngày.
 * Nếu agree_refund = true → smart contract hoàn tiền ngay (bot trigger).
 */
router.post(
  "/me/dispute-response",
  requireWallet,
  requireVerifiedShop,
  validate(disputeResponseSchema),
  async (req: Request, res: Response) => {
    const shopId = (req as any).shopId as string;
    const b      = req.body;

    // Verify dispute belongs to this shop + còn open
    const { rows: [dispute] } = await db.query(
      `SELECT d.*, o.order_code, o.buyer_wallet, o.price_usdc
       FROM disputes d
       JOIN orders o ON o.id = d.order_id
       WHERE d.id = $1 AND o.shop_id = $2 AND d.status = 'open'`,
      [b.dispute_id, shopId]
    );

    if (!dispute) {
      res.status(404).json({
        success: false,
        error: "Tranh chấp không tồn tại hoặc không thuộc shop này.",
      } as ApiResponse);
      return;
    }

    // Kiểm tra deadline (7 ngày)
    if (dispute.deadline_at && new Date(dispute.deadline_at) < new Date()) {
      res.status(400).json({
        success: false,
        error: "Đã quá hạn 7 ngày phản hồi. Admin đang can thiệp.",
      } as ApiResponse);
      return;
    }

    if (b.agree_refund) {
      // Shop đồng ý hoàn tiền — frontend đã tự ký refundByShop() on-chain THẬT trước khi gọi route
      // này (giống pattern buyer tự ký openDispute() ở order/[code].tsx — xem implementation-notes.md).
      // Route này chỉ ghi DB khớp với on-chain, không tự ý coi như thành công nếu chưa có tx_hash thật.
      await db.query(
        `UPDATE disputes
         SET shop_response=$1, status='resolved', resolution='refunded', resolved_at=NOW()
         WHERE id=$2`,
        [b.shop_response, b.dispute_id]
      );
      await db.query(
        "UPDATE orders SET status='refunded', tx_hash=$1, updated_at=NOW() WHERE id=$2",
        [b.tx_hash, dispute.order_id]
      );

      res.json({
        success: true,
        message: `Đã hoàn tiền cho người mua on-chain (tx ${(b.tx_hash as string).slice(0, 10)}...).`,
      } as ApiResponse);
      return;
    }

    // Phản hồi bình thường (không đồng ý hoàn tiền)
    await db.query(
      "UPDATE disputes SET shop_response=$1 WHERE id=$2",
      [b.shop_response, b.dispute_id]
    );

    // Notify Admin về phản hồi
    await sendMail({
      to:   process.env.ADMIN_EMAIL ?? "",
      type: "dispute_opened",
      data: {
        order_code: dispute.order_code,
        reason:     `[Shop đã phản hồi] ${b.shop_response.slice(0, 200)}`,
      },
    }).catch(() => {});

    res.json({
      success: true,
      message: "Phản hồi đã được ghi nhận. Admin sẽ xem xét nếu cần can thiệp.",
    } as ApiResponse);
  }
);

/**
 * PUT /api/shops/me/reviews/:reviewId/reply
 * Shop trả lời 1 đánh giá của buyer. Chỉ shop sở hữu đơn hàng gắn với review đó mới trả lời được.
 * Gọi lại nhiều lần thì ghi đè reply cũ (sửa lại câu trả lời).
 */
router.put(
  "/me/reviews/:reviewId/reply",
  requireWallet,
  requireVerifiedShop,
  validate(replyReviewSchema),
  async (req: Request, res: Response) => {
    const shopId = (req as any).shopId as string;
    const { reviewId } = req.params;
    const { reply } = req.body;

    // Verify review thuộc đúng shop này (qua order.shop_id) trước khi cho ghi đè
    const { rows: [review] } = await db.query(
      `SELECT r.id FROM reviews r JOIN orders o ON o.id = r.order_id
       WHERE r.id = $1 AND o.shop_id = $2`,
      [reviewId, shopId]
    );
    if (!review) {
      res.status(404).json({ success: false, error: "Đánh giá không tồn tại hoặc không thuộc shop này." } as ApiResponse);
      return;
    }

    const { rows } = await db.query(
      "UPDATE reviews SET shop_reply=$1, shop_replied_at=NOW() WHERE id=$2 RETURNING shop_reply, shop_replied_at",
      [reply, reviewId]
    );

    res.json({ success: true, data: rows[0], message: "Đã gửi phản hồi." } as ApiResponse);
  }
);

export default router;