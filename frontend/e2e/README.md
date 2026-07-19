# GiuPay — E2E Smoke Test (Playwright)

Test tự động kiểm tra các luồng chính của GiuPay có mở được và điều hướng đúng.
Bỏ qua phần ví (MetaMask); backend (localhost:3001) được **mock** (giả lập) nên
**không cần bật backend/database thật** để chạy.

## Chạy lần đầu (chỉ 1 lần)

```bash
cd frontend
npm install                      # cài @playwright/test (đã có trong package.json)
npx playwright install chromium  # tải trình duyệt để test (khoảng ~150MB)
```

## Chạy test

```bash
npm run test:e2e        # chạy tất cả, in kết quả ra terminal
npm run test:e2e:ui     # chạy có giao diện, xem trực quan từng bước
```

Playwright **tự bật `next dev`** trước khi test và tự tắt sau khi xong — không cần
mở terminal riêng cho frontend.

Xem báo cáo dạng web sau khi chạy:

```bash
npx playwright show-report
```

## File

- `../playwright.config.ts` — cấu hình (baseURL, tự chạy next dev)
- `giupay-flows.spec.ts` — 13 test bao 10 luồng: Trang chủ, Danh sách shop,
  Shop public, Chọn tài khoản, Đăng ký shop, Dashboard, Tạo đơn, Thanh toán,
  Đánh giá, Admin.

## Ghi chú

Test dùng text tiếng Việt để tìm phần tử (vì code chưa có `data-testid`).
Nếu sau này đổi chữ trên giao diện, chỉnh lại chuỗi tương ứng trong file spec —
hoặc tốt hơn là thêm `data-testid` vào component rồi đổi selector cho bền.
