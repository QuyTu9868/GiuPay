---
name: code-change-workflow
description: "Quy trình BẮT BUỘC mỗi khi người dùng báo lỗi, yêu cầu sửa lỗi, hoặc yêu cầu thêm/bớt/thay đổi chức năng trong bất kỳ project code nào (dApp, bot, script, frontend, contract). Trigger với mọi câu kiểu: 'lỗi này là sao', 'sửa lỗi', 'bị lỗi', 'không chạy', 'fix bug', 'thêm chức năng X', 'bỏ chức năng Y', 'đổi lại thành Z'. LUÔN dùng skill này trước khi đụng vào code, kể cả khi yêu cầu có vẻ đơn giản."
---

# Quy trình sửa lỗi và thay đổi chức năng

Mục tiêu: chấm dứt tình trạng "sửa lỗi này đẻ ra lỗi khác" và "làm sai ý người dùng rồi phải đập đi làm lại".

## BƯỚC 0 — NHẮC LẠI Ý HIỂU (áp dụng cho MỌI yêu cầu: sửa lỗi lẫn thêm/bớt chức năng)

Trước khi làm bất cứ gì, nhắc lại yêu cầu bằng lời của mình: "Mình hiểu là bạn muốn... đúng không?"
- Nếu yêu cầu mơ hồ hoặc có nhiều cách hiểu → liệt kê các cách hiểu, hỏi người dùng chọn.
- KHÔNG sửa code, KHÔNG viết code khi người dùng chưa xác nhận đúng ý và chưa nói "sửa đi" / "làm đi".

## PHẦN A — KHI ĐƯỢC BÁO LỖI / YÊU CẦU SỬA LỖI

### A1. Đọc lỗi nguyên văn
Trích lại đúng dòng error message quan trọng và giải thích nó nói gì. Nhiều lỗi (revert reason, RPC error, HTTP status) đã ghi sẵn nguyên nhân trong message.

### A2. Loại trừ lỗi môi trường trước khi đụng code
Kiểm tra các nghi phạm quen thuộc: sai network/chain ID, ví thiếu gas, RPC lag, `.env` thiếu key, cache Next.js (`.next`), version package. Sửa code trong khi gốc là môi trường thì càng sửa càng nát.

### A3. Yêu cầu tái hiện lỗi
Phải xác định được "làm bước nào thì lỗi xuất hiện". Nếu chưa tái hiện được → hỏi thêm thông tin/log, KHÔNG được sửa, vì sửa xong cũng không biết đã hết chưa.

### A4. Khoanh vùng theo lớp
Xác định lỗi thuộc lớp nào rồi test riêng lớp đó bằng script nhỏ, bỏ qua các lớp khác:
- Lỗi có transaction hash → on-chain (contract / protocol bên thứ 3)
- Lỗi trước khi ký giao dịch → frontend / wallet
- Lỗi HTTP 4xx/5xx → API bên ngoài / server
Test từng lớp: gọi API bằng script riêng, gọi contract bằng Hardhat console/script, frontend thì hardcode dữ liệu giả. Lớp nào chạy đúng khi đứng một mình thì loại khỏi nghi phạm.

### A5. Chẩn đoán và chờ duyệt
Giải thích cho người dùng: lỗi nằm ở đâu, vì sao xảy ra, định sửa thế nào. CHỜ người dùng duyệt ("sửa đi") rồi mới sửa. Không đoán mò, không vá triệu chứng.

Với MỖI chẩn đoán/giả định nguyên nhân, bắt buộc ghi thêm 1 dòng phản chứng: "dấu hiệu nào trong log/code sẽ chứng tỏ chẩn đoán này SAI". Rồi tự đi kiểm tra dấu hiệu đó trước khi kết luận. Đây là để bẻ gãy vòng lặp tự biện minh: nếu chỉ nêu bằng chứng ủng hộ giả định, rất dễ đọc log theo hướng củng cố điều đã tin sẵn (confirmation bias). Buộc phải tìm bằng chứng chống lại chính mình thì chẩn đoán mới đáng tin.

Nếu có nhiều giả định, ưu tiên kiểm tra cái nào có phản chứng rõ ràng và dễ kiểm nhất trước, để loại nhanh.

### A6. Sửa
- Một lỗi một lần sửa. CẤM gộp 2 lỗi vào 1 lần chỉnh code.
- Chỉ sửa đúng nguyên nhân gốc đã nêu, không sửa lan sang chỗ khác.

### A7. Sau khi sửa
- Tự liệt kê: "thay đổi này có thể ảnh hưởng đến những chỗ nào".
- Nhắc người dùng chạy checklist regression (các flow chính của project, giữ trong `TESTING.md`).
- Nhắc commit git khi code chạy được.
- Ghi 1 dòng vào `BUGLOG.md` của project: triệu chứng → nguyên nhân → cách sửa.

### A8. Chặn vòng lặp vá
Nếu đã sửa 2 lần cùng 1 lỗi mà chưa hết → DỪNG. Không thử phương án 3, 4, 5. Quay lại A4 khoanh vùng lại từ đầu, hoặc `git diff` với bản chạy được gần nhất để tìm chính xác thay đổi gây lỗi.

## PHẦN B — KHI YÊU CẦU THÊM / BỚT / THAY ĐỔI CHỨC NĂNG

### B1. Nhắc lại ý hiểu (Bước 0) + nêu phạm vi
Liệt kê: những file/chức năng sẽ đụng vào, những gì sẽ KHÔNG đụng vào. Chờ duyệt rồi mới làm.

### B2. Kiểm tra điều kiện tiên quyết
Nếu chức năng cần điều kiện/bước tiên quyết (ví dụ: cần approve token trước khi swap, cần connect ví trước khi ký), phải kiểm tra và xử lý điều kiện đó trước, không nhảy thẳng vào chức năng chính.

### B3. Làm đúng phạm vi
- Chỉ làm đúng những gì được yêu cầu. KHÔNG tự thêm function, logic, refactor, "cải thiện" ngoài yêu cầu.
- Thấy vấn đề khác → hỏi trước, không tự sửa.

### B4. Sau khi thay đổi
Giống A7: liệt kê ảnh hưởng, nhắc chạy regression checklist, nhắc commit.

## NGUYÊN TẮC XUYÊN SUỐT
- Không bao giờ code trước khi được xác nhận ý hiểu và được duyệt.
- Mỗi lần chỉnh code chỉ phục vụ 1 mục đích (1 lỗi hoặc 1 chức năng).
- Git là lưới an toàn: commit sau mỗi bản chạy được, `git diff` khi có lỗi mới lạ.