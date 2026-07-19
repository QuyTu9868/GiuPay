/**
 * GiuPay — Chat buyer-shop
 * 1 luồng chat = 1 cặp (shop_id, buyer_wallet). Chỉ tồn tại thật khi buyer đã từng mua
 * hàng của shop đó (kiểm tra trước khi cho gửi tin nhắn đầu tiên).
 *
 * Auth: dùng chung header X-Wallet-Address như mọi route khác trong app (không phải JWT) —
 * route tự xác định người gọi là buyer hay shop bằng cách so khớp ví trong header với
 * buyerWallet (param) hoặc với wallet_address của shop đó.
 */
import { Router, Request, Response } from "express";
import Joi from "joi";
import { db } from "./db";
import { ApiResponse } from "./types";

const router = Router();

function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: Function) => {
    const { error } = schema.validate(req.body);
    if (error) { res.status(400).json({ success: false, error: error.details[0].message }); return; }
    next();
  };
}

const sendMessageSchema = Joi.object({
  content: Joi.string().max(2000).allow("", null),
  image_cid: Joi.string().max(255).allow("", null),
}).or("content", "image_cid");

// Xác định vai trò của ví gọi API trong 1 luồng chat cụ thể — dùng chung cho GET/POST thread.
async function resolveRole(
  shopId: string, buyerWallet: string, callerWallet: string
): Promise<"buyer" | "shop" | null> {
  if (callerWallet === buyerWallet.toLowerCase()) return "buyer";
  const { rows } = await db.query("SELECT wallet_address FROM shops WHERE id=$1", [shopId]);
  if (rows.length && rows[0].wallet_address?.toLowerCase() === callerWallet) return "shop";
  return null;
}

// GET /api/messages/conversations — danh sách shop mà BUYER (ví trong header) đã mua hàng,
// kèm tin nhắn gần nhất để hiện preview.
router.get("/conversations", async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" }); return;
  }
  const { rows } = await db.query(
    `SELECT s.id as shop_id, s.name as shop_name, s.logo_cid as shop_logo,
            lm.content as last_content, lm.image_cid as last_image_cid,
            lm.created_at as last_at, lm.sender as last_sender
       FROM (
              -- Shop mà buyer đã MUA hàng, HOẶC đã từng NHẮN TIN (chat trước khi mua) —
              -- nếu chỉ lấy từ orders thì luồng chat trước-khi-mua sẽ không hiện trong danh sách.
              SELECT DISTINCT shop_id FROM orders   WHERE buyer_wallet=$1
              UNION
              SELECT DISTINCT shop_id FROM messages WHERE buyer_wallet=$1
            ) o
       JOIN shops s ON s.id = o.shop_id
       LEFT JOIN LATERAL (
         SELECT content, image_cid, created_at, sender FROM messages m
          WHERE m.shop_id = o.shop_id AND m.buyer_wallet = $1
          ORDER BY m.created_at DESC LIMIT 1
       ) lm ON true
      ORDER BY COALESCE(lm.created_at, '1970-01-01') DESC`,
    [wallet]
  );
  res.json({ success: true, data: rows } as ApiResponse);
});

// GET /api/messages/inbox — danh sách hội thoại GỘP CHUNG cho ví đang kết nối: vừa hiện các shop
// mà ví này từng mua/nhắn tin VỚI TƯ CÁCH BUYER, vừa hiện (nếu ví này có shop riêng) các khách
// đã nhắn/mua VỚI TƯ CÁCH SHOP — trộn chung 1 danh sách duy nhất, mỗi mục tự biết mình đóng vai
// buyer hay shop trong ĐÚNG luồng đó (field "role"), không tách theo trang/route nữa. User yêu
// cầu gộp vì 1 ví có thể vừa là chủ shop vừa tự đi mua hàng ở shop khác — trước đây NavBar luôn
// cứng role="buyer" nên khi xem Dashboard chính mình vẫn chỉ thấy hội thoại buyer, tách rời hẳn
// với tab Chat riêng (role="shop") của Dashboard, gây cảm giác có 2 hộp thư không liên quan.
router.get("/inbox", async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" }); return;
  }

  const buyerSide = await db.query(
    `SELECT s.id as shop_id, s.name as shop_name, s.logo_cid as shop_logo,
            lm.content as last_content, lm.image_cid as last_image_cid,
            lm.created_at as last_at, lm.sender as last_sender
       FROM (
              SELECT DISTINCT shop_id FROM orders   WHERE buyer_wallet=$1
              UNION
              SELECT DISTINCT shop_id FROM messages WHERE buyer_wallet=$1
            ) o
       JOIN shops s ON s.id = o.shop_id
       LEFT JOIN LATERAL (
         SELECT content, image_cid, created_at, sender FROM messages m
          WHERE m.shop_id = o.shop_id AND m.buyer_wallet = $1
          ORDER BY m.created_at DESC LIMIT 1
       ) lm ON true`,
    [wallet]
  );
  const buyerConvos = buyerSide.rows.map(r => ({
    role: "buyer" as const, shop_id: r.shop_id, buyer_wallet: wallet,
    title: r.shop_name, last_content: r.last_content, last_image_cid: r.last_image_cid,
    last_at: r.last_at, last_sender: r.last_sender,
  }));

  const { rows: shopRows } = await db.query("SELECT id FROM shops WHERE wallet_address=$1", [wallet]);
  let shopConvos: any[] = [];
  let myShopId: string | null = null;
  if (shopRows.length) {
    myShopId = shopRows[0].id;
    const shopSide = await db.query(
      `SELECT o.buyer_wallet,
              (SELECT buyer_name FROM orders o2
                WHERE o2.shop_id=$1 AND o2.buyer_wallet=o.buyer_wallet AND o2.buyer_name IS NOT NULL
                ORDER BY o2.created_at DESC LIMIT 1) as buyer_name,
              lm.content as last_content, lm.image_cid as last_image_cid,
              lm.created_at as last_at, lm.sender as last_sender
         FROM (
                SELECT DISTINCT buyer_wallet FROM orders   WHERE shop_id=$1 AND buyer_wallet IS NOT NULL
                UNION
                SELECT DISTINCT buyer_wallet FROM messages WHERE shop_id=$1 AND buyer_wallet IS NOT NULL
              ) o
         LEFT JOIN LATERAL (
           SELECT content, image_cid, created_at, sender FROM messages m
            WHERE m.shop_id = $1 AND m.buyer_wallet = o.buyer_wallet
            ORDER BY m.created_at DESC LIMIT 1
         ) lm ON true`,
      [myShopId]
    );
    shopConvos = shopSide.rows.map(r => ({
      role: "shop" as const, shop_id: myShopId, buyer_wallet: r.buyer_wallet,
      title: r.buyer_name, last_content: r.last_content, last_image_cid: r.last_image_cid,
      last_at: r.last_at, last_sender: r.last_sender,
    }));
  }

  const all = [...buyerConvos, ...shopConvos].sort((a, b) => {
    const ta = a.last_at ? new Date(a.last_at).getTime() : 0;
    const tb = b.last_at ? new Date(b.last_at).getTime() : 0;
    return tb - ta;
  });

  res.json({ success: true, data: { myShopId, conversations: all } } as ApiResponse);
});

// GET /api/messages/shop-conversations — danh sách buyer đã mua hàng của SHOP (ví trong header).
// (Giữ lại — chưa xóa nơi nào còn gọi route này, xem "/inbox" ở trên cho danh sách gộp mới.)
router.get("/shop-conversations", async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" }); return;
  }
  const { rows: shopRows } = await db.query("SELECT id FROM shops WHERE wallet_address=$1", [wallet]);
  if (!shopRows.length) { res.status(401).json({ success: false, error: "Shop không tồn tại" }); return; }
  const shopId = shopRows[0].id;

  const { rows } = await db.query(
    `SELECT o.buyer_wallet,
            (SELECT buyer_name FROM orders o2
              WHERE o2.shop_id=$1 AND o2.buyer_wallet=o.buyer_wallet AND o2.buyer_name IS NOT NULL
              ORDER BY o2.created_at DESC LIMIT 1) as buyer_name,
            lm.content as last_content, lm.image_cid as last_image_cid,
            lm.created_at as last_at, lm.sender as last_sender
       FROM (
              -- Buyer đã MUA hàng của shop, HOẶC đã từng NHẮN TIN cho shop (chat trước khi mua).
              -- Trước đây chỉ lấy từ orders → tin nhắn của người chưa mua không tới được shop.
              SELECT DISTINCT buyer_wallet FROM orders   WHERE shop_id=$1 AND buyer_wallet IS NOT NULL
              UNION
              SELECT DISTINCT buyer_wallet FROM messages WHERE shop_id=$1 AND buyer_wallet IS NOT NULL
            ) o
       LEFT JOIN LATERAL (
         SELECT content, image_cid, created_at, sender FROM messages m
          WHERE m.shop_id = $1 AND m.buyer_wallet = o.buyer_wallet
          ORDER BY m.created_at DESC LIMIT 1
       ) lm ON true
      ORDER BY COALESCE(lm.created_at, '1970-01-01') DESC`,
    [shopId]
  );
  // Trả kèm shopId — shop cần giá trị này để gọi các route thread (/:shopId/:buyerWallet)
  // mà không phải query lại /api/shops/me riêng.
  res.json({ success: true, data: { shopId, conversations: rows } } as ApiResponse);
});

// GET /api/messages/:shopId/:buyerWallet — toàn bộ tin nhắn của 1 luồng, cũ -> mới.
router.get("/:shopId/:buyerWallet", async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" }); return;
  }
  const { shopId } = req.params;
  const buyerWallet = (req.params.buyerWallet as string).toLowerCase();

  const role = await resolveRole(shopId, buyerWallet, wallet);
  if (!role) { res.status(403).json({ success: false, error: "Không có quyền xem hội thoại này" }); return; }

  const { rows } = await db.query(
    "SELECT id, sender, content, image_cid, created_at FROM messages WHERE shop_id=$1 AND buyer_wallet=$2 ORDER BY created_at ASC",
    [shopId, buyerWallet]
  );
  res.json({ success: true, data: rows } as ApiResponse);
});

// POST /api/messages/:shopId/:buyerWallet — gửi tin nhắn (content và/hoặc image_cid từ /api/upload/image).
// Buyer chỉ gửi được nếu đã từng mua hàng của shop này — chặn spam chat với shop lạ.
router.post("/:shopId/:buyerWallet", validate(sendMessageSchema), async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" }); return;
  }
  const { shopId } = req.params;
  const buyerWallet = (req.params.buyerWallet as string).toLowerCase();

  const role = await resolveRole(shopId, buyerWallet, wallet);
  if (!role) { res.status(403).json({ success: false, error: "Không có quyền gửi vào hội thoại này" }); return; }

  // Trước đây buyer PHẢI mua hàng của shop này rồi mới nhắn được (chặn spam chat với shop lạ).
  // User yêu cầu bỏ giới hạn này để cho phép hỏi shop TRƯỚC KHI mua (chat ngay từ trang sản
  // phẩm) — xem ProductDetailPage.tsx nút "Chat với shop".

  const { content, image_cid } = req.body;
  const { rows: [message] } = await db.query(
    "INSERT INTO messages (shop_id, buyer_wallet, sender, content, image_cid) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [shopId, buyerWallet, role, content || null, image_cid || null]
  );
  res.status(201).json({ success: true, data: message } as ApiResponse);
});

// DELETE /api/messages/:id — Xóa 1 tin nhắn, CHỈ được xóa tin nhắn của chính mình gửi (không xóa
// được tin của phía bên kia trong cùng luồng chat) — dùng resolveRole để xác định caller đang là
// buyer hay shop trong luồng chứa tin nhắn này, rồi so với message.sender.
router.delete("/:id", async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" }); return;
  }
  const { id } = req.params;

  const { rows } = await db.query(
    "SELECT id, shop_id, buyer_wallet, sender FROM messages WHERE id=$1", [id]
  );
  if (!rows.length) { res.status(404).json({ success: false, error: "Không tìm thấy tin nhắn" }); return; }
  const msg = rows[0];

  const role = await resolveRole(msg.shop_id, msg.buyer_wallet, wallet);
  if (!role) { res.status(403).json({ success: false, error: "Không có quyền với hội thoại này" }); return; }
  if (role !== msg.sender) {
    res.status(403).json({ success: false, error: "Chỉ được xóa tin nhắn của chính mình" }); return;
  }

  await db.query("DELETE FROM messages WHERE id=$1", [id]);
  res.json({ success: true, message: "Đã xóa tin nhắn" } as ApiResponse);
});

// DELETE /api/messages/:shopId/:buyerWallet — Xóa NGUYÊN 1 cuộc trò chuyện (mọi tin nhắn giữa
// shop này và buyer này), dùng để dọn bớt danh sách hội thoại (mục "Messages") cho gọn — khác
// với route DELETE /:id ở trên (chỉ xóa 1 tin nhắn lẻ). Cả buyer lẫn shop trong luồng đều xóa
// được (resolveRole chỉ cần xác định caller có phải 1 trong 2 bên, không cần đúng người gửi) —
// vì đây là 1 luồng chat DÙNG CHUNG, xóa xong thì mất khỏi list của CẢ HAI bên, không phải xóa
// riêng "cho tôi" (bảng messages không có cột đánh dấu ẩn theo từng người).
router.delete("/:shopId/:buyerWallet", async (req: Request, res: Response) => {
  const wallet = (req.headers["x-wallet-address"] as string)?.toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(401).json({ success: false, error: "Thiếu X-Wallet-Address header" }); return;
  }
  const { shopId } = req.params;
  const buyerWallet = (req.params.buyerWallet as string).toLowerCase();

  const role = await resolveRole(shopId, buyerWallet, wallet);
  if (!role) { res.status(403).json({ success: false, error: "Không có quyền với hội thoại này" }); return; }

  await db.query("DELETE FROM messages WHERE shop_id=$1 AND buyer_wallet=$2", [shopId, buyerWallet]);
  res.json({ success: true, message: "Đã xóa cuộc trò chuyện" } as ApiResponse);
});

export default router;
