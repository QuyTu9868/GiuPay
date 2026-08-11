"use client";

// Bắt lỗi render ở cây App Router (app/). Trang thật nằm ở Pages Router nên chỗ này
// chủ yếu phủ layout/providers, nhưng Sentry khuyến nghị có để không sót lỗi render.
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
