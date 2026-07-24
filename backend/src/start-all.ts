/**
 * GiuPay — Entrypoint gộp cho host free-tier chỉ cho 1 service (vd Render free).
 * Chạy chung trong 1 process: API server + escrow indexer + CCTP relayer + bot — thay vì
 * 4 process riêng như `dev:all` ở local. Đợi server init DB xong mới khởi động 3
 * vòng lặp/cron còn lại, tránh chúng query bảng chưa kịp tạo lúc mới boot.
 *
 * Chạy: npm run start:all   (sau khi npm run build)
 */
import { ready } from "./server";

async function main() {
  await ready;
  await import("./indexer.js");
  await import("./cctp-relayer.js");
  // Thiếu import này khiến bot.ts (burn SBT hết hạn + auto-release escrow sau 14 ngày) không
  // bao giờ chạy trên Render — chỉ đăng ký cron nội bộ khi được import, không cần gọi thêm gì.
  await import("./bot.js");
}

main().catch((err) => {
  console.error("❌ start-all thất bại:", err);
  process.exit(1);
});
