/**
 * GiuPay — Pages Router _document.tsx
 * Khai báo viewport cho toàn bộ trang trong src/pages/** (Pages Router không tự
 * thêm viewport như App Router — thiếu file này khiến mọi trang hiện thu nhỏ
 * kiểu desktop trên điện thoại, phải tự zoom tay mới bấm được nút).
 */

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="icon" type="image/svg+xml" href="/brand/giupay-icon-square.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
