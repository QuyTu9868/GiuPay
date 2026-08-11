// Sentry (phía trình duyệt) - bắt lỗi khi user dùng dApp: lỗi React render, lỗi JS,
// promise reject không bắt... File này Sentry inject vào bundle client qua withSentryConfig.
// Không có DSN (vd chạy local) thì Sentry no-op, không ảnh hưởng gì.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
  // Giữ nhẹ quota free tier: lấy mẫu 10% transaction, không bật Session Replay.
  tracesSampleRate: 0.1,
});
