// Sentry phía server của Next (SSR / getStaticProps / API route trong app frontend).
// Dùng chung project frontend: ưu tiên SENTRY_DSN, fallback NEXT_PUBLIC_SENTRY_DSN.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
