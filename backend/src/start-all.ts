/**
 * GiuPay — Entrypoint gộp cho host free-tier chỉ cho 1 service (vd Render free).
 * Chạy chung trong 1 process: API server + escrow indexer + CCTP relayer — thay vì
 * 3 process riêng như `dev:all` ở local. Đợi server init DB xong mới khởi động 2
 * vòng lặp còn lại, tránh chúng query bảng chưa kịp tạo lúc mới boot.
 *
 * Chạy: npm run start:all   (sau khi npm run build)
 */
import { ready } from "./server";

async function main() {
  await ready;
  await import("./indexer.js");
  await import("./cctp-relayer.js");
}

main().catch((err) => {
  console.error("❌ start-all thất bại:", err);
  process.exit(1);
});
