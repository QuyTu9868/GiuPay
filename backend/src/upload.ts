import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";
import FormData from "form-data";
import fetch from "node-fetch";
import multer from "multer";
import { ApiResponse } from "./types";

const router = Router();

// ── Multer — lưu file trong memory (không ghi disk) ───────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // tối đa 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Chỉ chấp nhận JPG, PNG, WEBP, PDF"));
  },
});

// ── IPFS / Pinata ──────────────────────────────────────────

async function uploadToPinata(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<{ cid: string; url: string }> {
  const form = new FormData();
  form.append("file", buffer, { filename, contentType: mimetype });
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: filename, keyvalues: { app: "giupay" } })
  );
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: process.env.PINATA_API_KEY ?? "",
      pinata_secret_api_key: process.env.PINATA_SECRET_KEY ?? "",
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata error: ${err}`);
  }

  const data = (await res.json()) as { IpfsHash: string };
  const cid = data.IpfsHash;

  // Dùng CID cố định — không dùng mutable gateway (theo security doc)
  return { cid, url: `ipfs://${cid}` };
}

// Pin JSON metadata (dùng cho tokenURI của WarrantySBT — xem sbt-chain.ts)
export async function pinJSONToIPFS(json: object, name: string): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: process.env.PINATA_API_KEY ?? "",
      pinata_secret_api_key: process.env.PINATA_SECRET_KEY ?? "",
    },
    body: JSON.stringify({
      pinataMetadata: { name, keyvalues: { app: "giupay" } },
      pinataOptions: { cidVersion: 1 },
      pinataContent: json,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata JSON pin error: ${err}`);
  }
  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

// ── Gmail / Nodemailer ─────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export type MailType =
  | "shop_approved"
  | "shop_rejected"
  | "shop_new_registration"
  | "order_paid"
  | "dispute_opened"
  | "dispute_resolved"
  | "bot_low_gas"
  | "dispute_no_response";

interface MailPayload {
  to: string;
  type: MailType;
  data: Record<string, string>;
}

function buildMail(type: MailType, data: Record<string, string>) {
  const base = process.env.GIUPAY_FRONTEND_URL ?? "https://giupay.io";

  const templates: Record<MailType, { subject: string; html: string }> = {
    shop_new_registration: {
      subject: "🆕 [Admin] Shop mới đăng ký — GiuPay",
      html: `
        <h2>Có đơn đăng ký shop mới!</h2>
        <table style="border-collapse:collapse;width:100%;max-width:480px">
          <tr><td style="padding:8px;color:#888;width:120px">Tên shop</td><td style="padding:8px"><b>${data.shop_name}</b></td></tr>
          <tr><td style="padding:8px;color:#888">Gmail</td><td style="padding:8px">${data.gmail}</td></tr>
          <tr><td style="padding:8px;color:#888">Ví</td><td style="padding:8px;font-family:monospace;font-size:12px">${data.wallet}</td></tr>
          <tr><td style="padding:8px;color:#888">Ghi chú</td><td style="padding:8px">${data.note ?? ""}</td></tr>
        </table>
        <br/>
        <a href="${base}/admin" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Vào Admin để duyệt</a>
        <p style="color:#888;margin-top:24px;font-size:12px;">GiuPay Admin Notification</p>
      `,
    },
    shop_approved: {
      subject: "🎉 Shop của bạn đã được duyệt — GiuPay",
      html: `
        <h2>Chúc mừng, <b>${data.shop_name}</b>!</h2>
        <p>Shop của bạn đã được Admin duyệt thành công trên GiuPay.</p>
        <p>Bạn có thể bắt đầu tạo đơn hàng ngay tại:</p>
        <a href="${base}/dashboard" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Vào Dashboard</a>
        <p style="color:#888;margin-top:24px;font-size:12px;">Email này được gửi từ noreply@giupay.io — không trả lời email này.</p>
      `,
    },
    shop_rejected: {
      subject: "❌ Shop chưa được duyệt — GiuPay",
      html: `
        <h2>Xin chào <b>${data.shop_name}</b>,</h2>
        <p>Rất tiếc, shop của bạn chưa được duyệt vì lý do sau:</p>
        <blockquote style="border-left:4px solid #ef4444;padding-left:12px;color:#333;">${data.reason}</blockquote>
        <p>Bạn có thể chỉnh sửa thông tin và gửi lại hồ sơ tại:</p>
        <a href="${base}/register" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Cập nhật hồ sơ</a>
      `,
    },
    order_paid: {
      subject: `🛍️ Đơn hàng ${data.order_code} vừa được thanh toán`,
      html: `
        <h2>Shop <b>${data.shop_name}</b> có đơn hàng mới!</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;color:#888">Mã đơn</td><td style="padding:8px"><b>${data.order_code}</b></td></tr>
          <tr><td style="padding:8px;color:#888">Sản phẩm</td><td style="padding:8px">${data.product_name}</td></tr>
          <tr><td style="padding:8px;color:#888">Giá</td><td style="padding:8px"><b>${data.price_usdc} USDC</b></td></tr>
          <tr><td style="padding:8px;color:#888">Chain thanh toán</td><td style="padding:8px">${data.chain ?? "—"}</td></tr>
        </table>
        <p>Tiền đang được giữ trong escrow. Sẽ tự động về ví của bạn sau <b>14 ngày</b> nếu không có tranh chấp.</p>
        <a href="${base}/dashboard" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Xem đơn hàng</a>
      `,
    },
    dispute_opened: {
      subject: `⚠️ Tranh chấp mới — Đơn ${data.order_code}`,
      html: `
        <h2>Có tranh chấp cho đơn hàng <b>${data.order_code}</b></h2>
        <p><b>Lý do:</b> ${data.reason}</p>
        <p>Bạn có <b>7 ngày</b> để phản hồi. Nếu không phản hồi, Admin sẽ can thiệp.</p>
        <a href="${base}/dashboard" style="background:#f59e0b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Phản hồi ngay</a>
      `,
    },
    dispute_resolved: {
      subject: `✅ Tranh chấp đã được giải quyết — Đơn ${data.order_code}`,
      html: `
        <h2>Tranh chấp đơn <b>${data.order_code}</b> đã được xử lý</h2>
        <p><b>Kết quả:</b> ${data.resolution === "refunded" ? "Hoàn tiền cho người mua" : "Giải phóng escrow cho shop"}</p>
        ${data.admin_note ? `<p><b>Ghi chú Admin:</b> ${data.admin_note}</p>` : ""}
      `,
    },
    dispute_no_response: {
      subject: `🚨 [Admin] Shop chưa phản hồi tranh chấp — ${data.order_code}`,
      html: `
        <h2>Cần can thiệp: Đơn <b>${data.order_code}</b></h2>
        <p>Shop <b>${data.shop_name}</b> chưa phản hồi tranh chấp sau 7 ngày.</p>
        <a href="${base}/admin/disputes" style="background:#ef4444;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Xử lý ngay</a>
      `,
    },
    bot_low_gas: {
      subject: "🤖 [Alert] Bot sắp hết gas — GiuPay",
      html: `
        <h2>Cảnh báo: Bot ví sắp hết USDC</h2>
        <p>Số dư hiện tại: <b>${data.balance} USDC</b></p>
        <p>Dưới ngưỡng an toàn 1 USDC. Vui lòng nạp thêm vào ví bot:</p>
        <code style="background:#f3f4f6;padding:8px;display:block;border-radius:4px">${data.bot_wallet}</code>
        <p style="color:#888;font-size:12px;">Lấy USDC testnet tại faucet.circle.com</p>
      `,
    },
  };

  return templates[type];
}

export async function sendMail(payload: MailPayload): Promise<void> {
  const { subject, html } = buildMail(payload.type, payload.data);
  await transporter.sendMail({
    from: `"GiuPay" <${process.env.GMAIL_USER}>`,
    to: payload.to,
    subject,
    html,
  });
}

// ── Routes ─────────────────────────────────────────────────

// POST /api/upload/image — Upload ảnh sản phẩm lên IPFS
router.post("/image", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "Không có file được upload" } as ApiResponse);
    return;
  }

  const { cid, url } = await uploadToPinata(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );

  res.json({
    success: true,
    data: { cid, url },
    message: "Upload ảnh thành công",
  } as ApiResponse);
});

// POST /api/upload/doc — Upload giấy tờ xác minh shop
router.post("/doc", upload.single("doc"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "Không có file được upload" } as ApiResponse);
    return;
  }

  const { cid, url } = await uploadToPinata(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );

  // Hash CID để lưu onchain (dùng keccak256 ở smart contract)
  // Ở đây trả CID về để backend lưu vào DB và contract
  res.json({
    success: true,
    data: { cid, url, filename: req.file.originalname },
    message: "Upload giấy tờ thành công",
  } as ApiResponse);
});

// POST /api/upload/send-mail — Gửi mail nội bộ (chỉ backend gọi, không expose public)
// Route này dùng để test mail template, production nên gọi sendMail() trực tiếp
router.post("/send-mail", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ success: false, error: "Không khả dụng trên production" });
    return;
  }

  const { to, type, data } = req.body;
  await sendMail({ to, type, data });
  res.json({ success: true, message: `Đã gửi mail '${type}' đến ${to}` });
});

export default router;