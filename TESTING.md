# TESTING.md — Checklist regression GiuPay

> Chạy lại checklist này **sau mỗi lần sửa code**, và **trước khi lên sàn**.
> Đánh dấu `[x]` khi test xong. Cái nào lỗi thì ghi vào `BUGLOG.md`.
>
> Quy ước: 🔗 = cần ví ký giao dịch · 🔑 = cần đăng nhập admin (email+TOTP) · ⚙️ = phụ thuộc cấu hình/.env

---

## 0. Trước khi test — kiểm tra môi trường (làm đầu tiên!)

- [ ] Backend đang chạy: `npm run dev` (tự reload) HAY `npm start` (bản build cũ)? Nếu chạy `dist/` mà vừa sửa code → **phải `npm run build` lại**.
- [ ] Frontend đang chạy `npm run dev` (thấy code mới ngay) hay `npm start` (phải build lại mới thấy)?
- [ ] `.env` backend đủ key: `BOT_PRIVATE_KEY`, `DEPLOYER_PRIVATE_KEY`, `ARC_RPC_URL`, `SBT_CONTRACT_ADDRESS`, `ESCROW`/`USDC` address, Pinata key.
- [ ] `.env.local` frontend: `NEXT_PUBLIC_SBT_CONTRACT` **trùng** `SBT_CONTRACT_ADDRESS` backend; `NEXT_PUBLIC_ARC_RPC_URL`, `NEXT_PUBLIC_ESCROW_CONTRACT`, chain id.
- [ ] Ví đang ở **đúng mạng Arc Testnet** và có **USDC để trả gas**.
- [ ] RPC không bị **429** (nếu spam lỗi 429 → đóng bớt tab / đổi RPC riêng).

## 1. Shop — đăng ký & quản lý

- [ ] 🔗 Đăng ký shop mới: điền form + upload ảnh → submit → hiện màn "chờ duyệt".
- [ ] 🔑 Admin duyệt shop → shop thành `verified`, xuất hiện ở `/shops`.
- [ ] 🔗 Chủ shop bấm "My Shop" → vào `/shop/{id}` thấy **Dashboard** (không phải trang khách).
- [ ] Gõ thẳng `/dashboard` → tự chuyển sang `/shop/{id}`.
- [ ] 🔗 Đang ở `/shop/{id}`, **đổi ví** → chuyển sang trang mua hàng (buyer view) **tại chỗ**, KHÔNG văng `/register`.
- [ ] Ảnh shop hiện ở **Dashboard** (cạnh "Hello, ...") và **trang khách**; bấm ảnh → mở ảnh full.
- [ ] Nút "Xem trang shop" (`?preview=1`) mở giao diện khách trong tab mới.

## 2. Sản phẩm (listings)

- [ ] 🔗 Tạo sản phẩm mới (tên, giá, ảnh, số ngày bảo hành) → hiện trong danh sách.
- [ ] 🔗 Sửa / xóa sản phẩm.
- [ ] Trang chi tiết `/shop/{id}/product/{lid}` hiện đủ ảnh/giá/bảo hành.
- [ ] Ảnh sản phẩm thật hiện đúng ở `/products` (không phải ảnh demo).
- [ ] 🔗 Ví chủ shop xem sản phẩm của chính mình → nút "Mua" bị khóa ("Sản phẩm của shop bạn").

## 3. Thanh toán (quan trọng nhất)

- [ ] 🔗 **Trả trực tiếp trên Arc**: connect ví → approve → pay → đơn thành `in_escrow`.
- [ ] 🔗 **Trả qua CCTP** (Ethereum/OP/Arbitrum/Base Sepolia): approve → depositForBurn → "đang bắc cầu" → `in_escrow`.
- [ ] Popup **đánh giá tự bật** ngay khi thanh toán xong.
- [ ] Chặn trả **trùng 1 đơn** qua 2 mạng (reload rồi trả lại → bị chặn).
- [ ] ⚙️ Ví hiện popup ký được (không kẹt "Đang ước tính" do 429).

## 4. SBT (bằng chứng mua hàng)

- [ ] ⚙️ Sau khi đơn vào `in_escrow` → vào `/profile` tab "My SBTs" thấy SBT mới (mint tự động).
- [ ] Nếu SBT = 0 → xem log terminal backend (thiếu key? tx lỗi? RPC 429?), đối chiếu `BUGLOG.md`.

## 5. Escrow / Tranh chấp / Hoàn tiền

- [ ] 🔗 Buyer mở khiếu nại đơn **trả trực tiếp Arc** → ký `openDispute()` thật trên chain.
- [ ] Buyer mở khiếu nại đơn **CCTP** → không bắt ký (backend mở hộ).
- [ ] Nhãn đổi đúng: chưa giao hàng = "Hủy đơn", đã giao = "Mở tranh chấp".
- [ ] 🔗 Shop phản hồi tranh chấp + tick "đồng ý hoàn tiền" → ký `refundByShop()`.
- [ ] 🔑 Admin resolve tranh chấp (refund / release) → gọi contract thật, tiền chuyển on-chain.
- [ ] Dashboard hiện đếm ngược escrow + số ngày còn lại của tranh chấp.
- [ ] ⚙️ Bot auto-release đơn quá 14 ngày (`npm run bot` / cron).

## 6. Đánh giá (review)

- [ ] 🔗 Đánh giá ngay sau thanh toán (popup) — đơn `in_escrow` cũng đánh giá được.
- [ ] Đánh giá lại từ Profile / trang đơn (`/review/{code}`).
- [ ] Đánh giá hiện trên trang shop (tab Đánh giá + biểu đồ sao); số đơn/điểm sao shop cập nhật.
- [ ] Chặn đánh giá **2 lần** cùng 1 đơn (báo "đã đánh giá rồi").

## 7. Chat buyer ↔ shop

- [ ] 🔗 Buyer chat shop **từ trang sản phẩm** (chưa từng mua) → gửi được.
- [ ] 🔗 Shop mở Dashboard → tab "Tin nhắn" → **thấy** luồng chat của buyer đó (kể cả chưa mua).
- [ ] Buyer trả lời qua NavBar chat → shop nhận, và ngược lại (polling ~4s).
- [ ] Gửi ảnh (Pinata) + hiện trạng thái "đang gửi/đang tải".
- [ ] Xóa 1 tin nhắn / xóa cả cuộc trò chuyện.
- [ ] "System message" tình trạng đơn chèn đúng vào luồng.

## 8. Admin

- [ ] 🔑 Đăng nhập `/admin` bằng email + TOTP.
- [ ] Duyệt / từ chối shop (gửi email).
- [ ] Resolve tranh chấp (xem mục 5).
- [ ] Lưu ý: restart backend xóa session admin (in-memory) → phải đăng nhập lại.

## 9. Điều hướng chung

- [ ] Các trang có nút Back + nút đổi ví (trừ trang thanh toán).
- [ ] Đổi ngôn ngữ VI/EN hoạt động ở mọi trang.
- [ ] Đổi dark/light mode.
