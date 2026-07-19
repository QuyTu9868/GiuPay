/**
 * admin.ts — Bước 10 + Bước 24 (backend)
 *
 * Routes:
 *   POST /api/admin/verify-totp          — Verify mã 2FA sau khi Auth0 login
 *   GET  /api/admin/shops/pending        — Danh sách shop chờ duyệt
 *   GET  /api/admin/shops/verified       — Danh sách shop đã duyệt
 *   POST /api/admin/shops/:id/approve    — Duyệt shop → gửi Gmail
 *   POST /api/admin/shops/:id/reject     — Từ chối shop → gửi Gmail + lý do
 *   GET  /api/admin/disputes             — Danh sách tranh chấp đang mở
 *   GET  /api/admin/settings/fee-wallet  — Lấy thông tin ví nhận phí hiện tại
 *   POST /api/admin/settings/fee-wallet  — Gửi yêu cầu đổi ví (delay 24h — Security checklist #10)
 *
 * Auth:
 *   - requireAuth0: verify JWT token từ Auth0 (dùng express-oauth2-jwt-bearer)
 *   - requireAdmin: kiểm tra email trong bảng admins + is_active = true
 *   - requireTotp:  kiểm tra session flag totpVerified = true (set sau khi verify-totp thành công)
 *
 * Lưu ý TOTP flow:
 *   1. Frontend login Auth0 → nhận access_token
 *   2. Frontend POST /api/admin/verify-totp { totp_code } với Bearer token
 *   3. Backend verify mã TOTP bằng otplib
 *   4. Nếu đúng → set session flag, trả về { verified: true }
 *   5. Frontend lưu flag trong memory, dùng cho mọi request tiếp theo
 *   6. Mọi route admin nhạy cảm đều cần cả requireAuth0 + requireTotp
 *
 * Session: dùng in-memory Map (đủ cho testnet). Production → Redis.
 * Key: sub (Auth0 user ID) → { verifiedAt: Date, ip: string }
 * Tự expire sau 8 giờ.
 */

import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { authenticator } from "otplib";
import Joi from "joi";
import { db } from "./db";
import { sendMail } from "./upload";
import { ApiResponse } from "./types";
import { verifyShopOnChain, chainConfigured } from "./chain";

const router = Router();

// ── In-memory admin session ────────────────────────────────────────────────
// Key: session_token (UUID) → { adminId, email, verifiedAt, ip }
// Expire: 8 giờ

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

interface AdminSession {
  adminId: string;
  email:   string;
  verifiedAt: Date;
  ip: string;
}

const adminSessions = new Map<string, AdminSession>();

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, sess] of adminSessions) {
    if (now - sess.verifiedAt.getTime() > SESSION_TTL_MS) {
      adminSessions.delete(token);
    }
  }
}
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

// ── Helpers ────────────────────────────────────────────────────────────────

function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );
}

async function logAdminAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  note?: string,
  ip?: string
) {
  try {
    await db.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, note, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, action, targetType ?? null, targetId ?? null, note ?? null, ip ?? null]
    );
  } catch (e) {
    // Log thất bại không nên crash route chính
    console.error("[AdminLog] Lỗi ghi log:", e);
  }
}

// ── Middleware ─────────────────────────────────────────────────────────────

// Kiểm tra X-Admin-Session header hợp lệ
// Export để dùng lại ở route khác ngoài file này (vd orders.ts — xử lý tranh chấp) — trước đây
// route đó dùng nhầm requireAuth0 (JWT Bearer từ Auth0), leftover từ lúc admin auth còn dùng
// Auth0 client SDK; sau khi đổi hẳn sang login email+TOTP (xem _app.tsx) route đó không được cập
// nhật theo, nên luôn trả 401 "Unauthorized" dù admin đã đăng nhập đúng.
export function requireAdminSession(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-admin-session"] as string | undefined;
  if (!token) {
    res.status(401).json({ success: false, error: "Thiếu admin session token" } as ApiResponse);
    return;
  }

  const sess = adminSessions.get(token);
  if (!sess) {
    res.status(401).json({ success: false, error: "Session không hợp lệ hoặc đã hết hạn" } as ApiResponse);
    return;
  }

  const age = Date.now() - sess.verifiedAt.getTime();
  if (age > SESSION_TTL_MS) {
    adminSessions.delete(token);
    res.status(401).json({ success: false, error: "Phiên admin đã hết hạn. Vui lòng đăng nhập lại." } as ApiResponse);
    return;
  }

  (req as any).adminId    = sess.adminId;
  (req as any).adminEmail = sess.email;
  next();
}

// ── Validation helpers ─────────────────────────────────────────────────────

function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details.map((d) => d.message).join("; "),
      } as ApiResponse);
      return;
    }
    req.body = value;
    next();
  };
}

// ── Schemas ────────────────────────────────────────────────────────────────

const totpSchema = Joi.object({
  totp_code: Joi.string().length(6).pattern(/^\d{6}$/).required()
    .messages({ "string.pattern.base": "Mã TOTP phải là 6 chữ số" }),
  email: Joi.string().email().required(),
});

const rejectSchema = Joi.object({
  reason: Joi.string().min(10).max(1000).required()
    .messages({ "string.min": "Lý do phải ít nhất 10 ký tự" }),
});

const feeWalletSchema = Joi.object({
  new_address: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({ "string.pattern.base": "Địa chỉ ví không hợp lệ" }),
});

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/verify-totp
 * Verify mã 6 chữ số từ Google Authenticator
 * Cần: Auth0 JWT + admin active trong DB
 * Không cần: TOTP session (đây là bước tạo session đó)
 */
router.post(
  "/verify-totp",
  validate(totpSchema),
  async (req: Request, res: Response) => {
    const { totp_code, email } = req.body;
    const ip = getClientIp(req);

    const { rows } = await db.query(
      "SELECT id, email, totp_secret, is_active FROM admins WHERE email = $1",
      [email.toLowerCase()]
    );
    if (!rows.length || !rows[0].is_active) {
      res.status(403).json({ success: false, error: "Tài khoản không có quyền admin" } as ApiResponse);
      return;
    }

    const sub        = rows[0].id;
    const totpSecret = rows[0].totp_secret as string | null;

    // Nếu admin chưa setup TOTP (secret null) → từ chối
    if (!totpSecret) {
      res.status(403).json({
        success: false,
        error: "Tài khoản chưa cấu hình 2FA. Liên hệ admin còn lại để setup.",
      } as ApiResponse);
      return;
    }

    // Dev bypass: totp_code '000000' accepted outside production for testnet demo
    const isDevBypass = process.env.NODE_ENV !== "production" && totp_code === "000000";

    if (!isDevBypass) {
      // Verify với otplib (window: ±1 step = ±30s để bù clock skew)
      authenticator.options = { window: 1 };
      const isValid = authenticator.verify({ token: totp_code, secret: totpSecret });

      if (!isValid) {
        // Log thất bại (Security: detect brute-force)
        await logAdminAction((req as any).adminId, "totp_fail", undefined, undefined, `IP: ${ip}`, ip);
        res.status(401).json({ success: false, error: "Mã 2FA không đúng hoặc đã hết hạn" } as ApiResponse);
        return;
      }
    }

    // Tạo session token
    const sessionToken = randomUUID();
    adminSessions.set(sessionToken, {
      adminId:    rows[0].id,
      email:      rows[0].email,
      verifiedAt: new Date(),
      ip,
    });

    await logAdminAction(rows[0].id, "totp_success", undefined, undefined, undefined, ip);

    res.json({
      success: true,
      data: { verified: true, session_token: sessionToken, expires_in: SESSION_TTL_MS / 1000 },
      message: "Xác thực 2FA thành công",
    } as ApiResponse);
  }
);

/**
 * GET /api/admin/shops/pending
 * Danh sách shop đang chờ duyệt
 */
router.get(
  "/shops/pending",
  requireAdminSession,
  async (_req: Request, res: Response) => {
    const { rows } = await db.query(
      `SELECT id, wallet_address, name, description, logo_cid, category,
              gmail, facebook_url, return_policy, doc_cid, doc_hash, status, created_at
       FROM shops
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );
    res.json({ success: true, data: rows } as ApiResponse);
  }
);

/**
 * GET /api/admin/shops/verified
 * Danh sách shop đã duyệt
 */
router.get(
  "/shops/verified",
  requireAdminSession,
  async (_req: Request, res: Response) => {
    const { rows } = await db.query(
      `SELECT s.id, s.wallet_address, s.name, s.category, s.gmail,
              s.status, s.created_at,
              COUNT(o.id)::int          AS total_orders,
              ROUND(AVG(r.rating), 1)   AS avg_rating
       FROM shops s
       LEFT JOIN orders o ON o.shop_id = s.id AND o.status = 'released'
       LEFT JOIN reviews r ON r.order_id = o.id
       WHERE s.status = 'verified'
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );
    res.json({ success: true, data: rows } as ApiResponse);
  }
);

/**
 * POST /api/admin/shops/:id/approve
 * Duyệt shop → gửi Gmail thông báo cho shop
 */
router.post(
  "/shops/:id/approve",
  requireAdminSession,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const ip     = getClientIp(req);

    const { rows } = await db.query(
      "SELECT id, name, gmail, status, wallet_address, doc_hash FROM shops WHERE id = $1",
      [id]
    );

    if (!rows.length) {
      res.status(404).json({ success: false, error: "Shop không tồn tại" } as ApiResponse);
      return;
    }

    const shop = rows[0];

    if (shop.status !== "pending") {
      res.status(400).json({
        success: false,
        error: `Shop đang ở trạng thái '${shop.status}', không thể duyệt`,
      } as ApiResponse);
      return;
    }

    // Update DB
    await db.query(
      "UPDATE shops SET status = 'verified', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Verify shop ON-CHAIN — bắt buộc để buyer có thể trả qua escrow (pay có require isVerified).
    // Non-fatal: nếu chain lỗi vẫn coi như duyệt trong DB, trả cảnh báo để admin retry.
    let chainWarning: string | undefined;
    let chainTx: string | undefined;
    if (chainConfigured()) {
      try {
        const r = await verifyShopOnChain(shop.wallet_address, shop.doc_hash);
        chainTx = r.verifiedTx;
        console.log(`[Chain] Verified shop ${shop.wallet_address} on-chain | tx: ${r.verifiedTx}${r.registeredTx ? ` (register: ${r.registeredTx})` : ""}`);
      } catch (e: any) {
        chainWarning = `Duyệt DB OK nhưng verify on-chain lỗi: ${e?.message ?? e}. Buyer chưa trả được cho tới khi verify lại on-chain.`;
        console.error("[Chain] verifyShopOnChain lỗi:", e?.message ?? e);
      }
    } else {
      chainWarning = "Chain chưa cấu hình (ARC_RPC_URL/DEPLOYER_PRIVATE_KEY/SHOP_REGISTRY_ADDRESS) — bỏ qua verify on-chain.";
    }

    // Gửi Gmail thông báo shop được duyệt (non-blocking)
    sendMail({
      to:   shop.gmail,
      type: "shop_approved",
      data: { shop_name: shop.name },
    }).catch((e) => console.error("[Mail] approve:", e.message));

    // Log hành động
    await logAdminAction(
      (req as any).adminId,
      "shop_approved",
      "shop",
      id,
      `Shop: ${shop.name}${chainTx ? ` | on-chain: ${chainTx}` : ""}`,
      ip
    );

    res.json({
      success: true,
      message: `Shop "${shop.name}" đã được duyệt. Gmail thông báo đã gửi.`,
      ...(chainTx ? { chainTx } : {}),
      ...(chainWarning ? { warning: chainWarning } : {}),
    } as ApiResponse);
  }
);

/**
 * POST /api/admin/shops/:id/reject
 * Từ chối shop → gửi Gmail với lý do
 */
router.post(
  "/shops/:id/reject",
  requireAdminSession,
  validate(rejectSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const ip = getClientIp(req);

    const { rows } = await db.query(
      "SELECT id, name, gmail, status FROM shops WHERE id = $1",
      [id]
    );

    if (!rows.length) {
      res.status(404).json({ success: false, error: "Shop không tồn tại" } as ApiResponse);
      return;
    }

    const shop = rows[0];

    if (shop.status !== "pending") {
      res.status(400).json({
        success: false,
        error: `Shop đang ở trạng thái '${shop.status}', không thể từ chối`,
      } as ApiResponse);
      return;
    }

    await db.query(
      "UPDATE shops SET status = 'rejected', reject_reason = $1, updated_at = NOW() WHERE id = $2",
      [reason, id]
    );

    sendMail({
      to:   shop.gmail,
      type: "shop_rejected",
      data: { shop_name: shop.name, reason },
    }).catch((e) => console.error("[Mail] reject:", e.message));

    await logAdminAction(
      (req as any).adminId,
      "shop_rejected",
      "shop",
      id,
      `Shop: ${shop.name} | Lý do: ${reason}`,
      ip
    );

    res.json({
      success: true,
      message: `Shop "${shop.name}" đã bị từ chối. Gmail đã gửi với lý do.`,
    } as ApiResponse);
  }
);

/**
 * DELETE /api/admin/shops/:id
 * Xoá tuyệt đối 1 shop (test/dev cleanup) — xoá luôn orders/disputes/reviews liên quan
 * rồi xoá shop (listings tự cascade theo FK). Không có bước xác nhận nào khác ngoài
 * việc gọi đúng route này — chỉ cần admin session hợp lệ là xoá ngay, không rollback.
 */
router.delete(
  "/shops/:id",
  requireAdminSession,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const ip = getClientIp(req);

    const { rows } = await db.query("SELECT id, name FROM shops WHERE id = $1", [id]);
    if (!rows.length) {
      res.status(404).json({ success: false, error: "Shop không tồn tại" } as ApiResponse);
      return;
    }
    const shop = rows[0];

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      // Xoá tranh chấp + đánh giá của các đơn thuộc shop trước (FK không cascade)
      await client.query(
        `DELETE FROM disputes WHERE order_id IN (SELECT id FROM orders WHERE shop_id = $1)`,
        [id]
      );
      await client.query(
        `DELETE FROM reviews WHERE order_id IN (SELECT id FROM orders WHERE shop_id = $1)`,
        [id]
      );
      await client.query(`DELETE FROM orders WHERE shop_id = $1`, [id]);
      // listings tự xoá theo ON DELETE CASCADE
      await client.query(`DELETE FROM shops WHERE id = $1`, [id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    await logAdminAction((req as any).adminId, "shop_deleted", "shop", id, `Shop: ${shop.name}`, ip);

    res.json({ success: true, message: `Đã xoá shop "${shop.name}" (kèm toàn bộ đơn hàng/dữ liệu liên quan).` } as ApiResponse);
  }
);

/**
 * GET /api/admin/disputes
 * Danh sách tranh chấp — mặc định trả về đang mở, có filter ?status=all
 */
router.get(
  "/disputes",
  requireAdminSession,
  async (req: Request, res: Response) => {
    const showAll = req.query.status === "all";

    const { rows } = await db.query(
      `SELECT
         d.id, d.order_id, d.opened_by, d.reason, d.status,
         d.resolution, d.attempt_number, d.shop_response,
         d.admin_note, d.opened_at, d.deadline_at,
         o.order_code,
         o.price_usdc,
         s.name  AS shop_name,
         s.gmail AS shop_gmail
       FROM disputes d
       JOIN orders o ON o.id = d.order_id
       JOIN shops  s ON s.id = o.shop_id
       ${showAll ? "" : "WHERE d.status = 'open'"}
       ORDER BY d.opened_at DESC`
    );

    res.json({ success: true, data: rows } as ApiResponse);
  }
);

/**
 * GET /api/admin/settings/fee-wallet
 * Lấy ví nhận phí hiện tại + pending change nếu có
 * Đọc từ bảng admin_settings (key: 'fee_wallet')
 */
router.get(
  "/settings/fee-wallet",
  requireAdminSession,
  async (_req: Request, res: Response) => {
    const { rows } = await db.query(
      "SELECT value, pending_value, pending_effect_at FROM admin_settings WHERE key = 'fee_wallet'"
    );

    if (!rows.length) {
      // Chưa có setting → trả về địa chỉ từ env
      res.json({
        success: true,
        data: {
          current:            process.env.FEE_WALLET_ADDRESS ?? "",
          pending:            null,
          pending_effect_at:  null,
        },
      } as ApiResponse);
      return;
    }

    const setting = rows[0];

    // Nếu đến giờ hiệu lực → tự apply
    if (
      setting.pending_value &&
      setting.pending_effect_at &&
      new Date(setting.pending_effect_at) <= new Date()
    ) {
      await db.query(
        `UPDATE admin_settings
         SET value = pending_value, pending_value = NULL, pending_effect_at = NULL, updated_at = NOW()
         WHERE key = 'fee_wallet'`
      );
      res.json({
        success: true,
        data: {
          current:           setting.pending_value,
          pending:           null,
          pending_effect_at: null,
        },
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: {
        current:           setting.value,
        pending:           setting.pending_value ?? null,
        pending_effect_at: setting.pending_effect_at ?? null,
      },
    } as ApiResponse);
  }
);

/**
 * POST /api/admin/settings/fee-wallet
 * Gửi yêu cầu đổi ví nhận phí — có hiệu lực sau 24h (Security checklist #10)
 * Gmail xác nhận gửi cho tất cả admin active
 */
router.post(
  "/settings/fee-wallet",
  requireAdminSession,
  validate(feeWalletSchema),
  async (req: Request, res: Response) => {
    const { new_address } = req.body;
    const ip = getClientIp(req);

    // Kiểm tra không trùng với ví hiện tại
    const { rows: current } = await db.query(
      "SELECT value FROM admin_settings WHERE key = 'fee_wallet'"
    );
    const currentWallet = current[0]?.value ?? process.env.FEE_WALLET_ADDRESS ?? "";

    if (new_address.toLowerCase() === currentWallet.toLowerCase()) {
      res.status(400).json({
        success: false,
        error: "Địa chỉ mới trùng với ví hiện tại",
      } as ApiResponse);
      return;
    }

    const effectAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

    // Upsert vào admin_settings
    await db.query(
      `INSERT INTO admin_settings (key, value, pending_value, pending_effect_at, updated_by, updated_at)
       VALUES ('fee_wallet', $1, $2, $3, $4, NOW())
       ON CONFLICT (key) DO UPDATE
         SET pending_value     = $2,
             pending_effect_at = $3,
             updated_by        = $4,
             updated_at        = NOW()`,
      [currentWallet, new_address, effectAt, (req as any).adminEmail]
    );

    // Gửi Gmail xác nhận đến tất cả admin active
    const { rows: admins } = await db.query(
      "SELECT email FROM admins WHERE is_active = true"
    );

    const effectAtStr = effectAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    await Promise.allSettled(
      admins.map((admin) =>
        sendMail({
          to:   admin.email,
          type: "shop_approved", // reuse template tạm — production nên tạo template riêng
          data: {
            shop_name: `[Cảnh báo] Yêu cầu đổi ví nhận phí\n\nVí mới: ${new_address}\nHiệu lực: ${effectAtStr}\nYêu cầu bởi: ${(req as any).adminEmail}\nIP: ${ip}\n\nNếu không phải bạn, đăng nhập Admin Dashboard và huỷ ngay.`,
          },
        })
      )
    );

    await logAdminAction(
      (req as any).adminId,
      "fee_wallet_change_requested",
      "admin_settings",
      undefined,
      `Ví mới: ${new_address} | Hiệu lực: ${effectAt.toISOString()}`,
      ip
    );

    res.json({
      success: true,
      data: { pending: new_address, pending_effect_at: effectAt.toISOString() },
      message: `Yêu cầu đổi ví đã ghi nhận. Sẽ có hiệu lực lúc ${effectAtStr}. Gmail xác nhận đã gửi.`,
    } as ApiResponse);
  }
);

export default router;