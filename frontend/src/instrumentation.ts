// Next 14 nạp file này qua experimental.instrumentationHook để init Sentry phía server/edge.
// (Client init nằm ở sentry.client.config.ts, Sentry tự inject vào bundle trình duyệt.)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Bắt lỗi ở server component / route handler của app/ (nếu có).
export { captureRequestError as onRequestError } from "@sentry/nextjs";
