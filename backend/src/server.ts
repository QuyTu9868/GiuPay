import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { initDB } from "./db";
import orderRoutes   from "./orders";
import uploadRoutes  from "./upload";
import adminRoutes   from "./admin";
import shopRoutes    from "./shops";    // Bước 11
import listingRoutes from "./listings"; // Listings feature
import messageRoutes from "./messages"; // Chat buyer-shop

dotenv.config();

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Wallet-Address", "X-Admin-Session"],
}));

// Rate limit chung — 60 req/phút mỗi IP
app.use(rateLimit({
  windowMs: 60_000,
  max: 60,
  message: { success: false, error: "Quá nhiều request, thử lại sau 1 phút." },
  // Bỏ qua route admin; và bỏ qua traffic test (header X-Test-Bypass) khi KHÔNG chạy production.
  skip: (req) =>
    req.path.startsWith("/api/admin") ||
    (process.env.NODE_ENV !== "production" && req.headers["x-test-bypass"] === "1"),
}));

// Rate limit admin — disabled for dev/test
const adminRateLimit = (_req: any, _res: any, next: any) => next();

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// ── Health check ───────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ success: true, message: "GiuPay API running 🚀" })
);

// ── Routes ─────────────────────────────────────────────────
app.use("/api/shops",    shopRoutes);                    // Bước 11
app.use("/api/orders",   orderRoutes);                   // Bước 12
app.use("/api/upload",   uploadRoutes);                  // Bước 13
app.use("/api/admin",    adminRateLimit, adminRoutes);   // Bước 10 + 24
app.use("/api/listings", listingRoutes);                 // Listings feature
app.use("/api/messages", messageRoutes);                 // Chat buyer-shop

// ── 404 ────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, error: "Endpoint không tồn tại" })
);

// ── Global error handler ───────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌", err.stack ?? err.message);
  // TODO trước khi deploy thật: đổi lại thành ẩn chi tiết lỗi (đừng lộ stack/message ra
  // ngoài production) — hiện tại luôn trả message thật để còn debug được trong lúc phát
  // triển, vì biến NODE_ENV không đáng tin cậy trên máy dev của user (có thể đã bị set sẵn
  // ở đâu đó ngoài .env, ví dụ biến môi trường hệ thống Windows, khiến dotenv không ghi đè được).
  res.status(500).json({ success: false, error: err.message || "Lỗi server" });
});

// Supabase free tier có thể tạm ngưng/mất kết nối đúng lúc service khởi động (đặc biệt
// sau khi Render tự sleep rồi dậy lại). Trước đây initDB() thất bại 1 lần là start-all.ts
// process.exit(1) luôn — cả service (API + indexer + relayer + bot, gộp chung 1 process)
// sập và KHÔNG tự hồi phục dù Supabase đã sẵn sàng lại sau đó, phải có người vào restart
// tay trên Render. Giờ retry với backoff (cùng kiểu đã dùng cho RPC 429 ở indexer.ts/
// cctp-relayer.ts) — cứ thử lại tới khi kết nối được, tự lành mà không cần ai đụng vào.
async function connectDBWithRetry(): Promise<void> {
  const MAX_DELAY_MS = 60_000;
  let delay = 2_000;
  for (;;) {
    try {
      await initDB();
      return;
    } catch (err: any) {
      console.error(`❌ Kết nối DB thất bại, thử lại sau ${delay}ms:`, err?.message ?? err);
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, MAX_DELAY_MS);
    }
  }
}

async function start() {
  await connectDBWithRetry();
  app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}

// Export promise (không đổi hành vi chạy độc lập qua `npm run dev`/`start`) — để
// start-all.ts đợi DB init xong trước khi khởi động indexer/cctp-relayer trong cùng
// 1 process, tránh race condition query bảng chưa kịp tạo lúc mới boot.
export const ready = start();