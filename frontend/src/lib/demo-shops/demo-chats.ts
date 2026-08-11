/**
 * Demo chat — vài shop mẫu có sẵn tin nhắn ảo để minh họa ChatWidget.
 * KHÔNG kết nối backend thật — chọn 1 demo shop chỉ hiện lại đúng mảng messages tĩnh này.
 * Buyer vẫn gõ được trong luồng demo cho vui, nhưng tin nhắn chỉ append tạm ở client
 * (không lưu DB) — rõ ràng đây là minh họa, không phải chat thật với shop.
 */
export interface DemoChatMessage {
  sender: "buyer" | "shop";
  content: string;
  contentEn: string;
  offsetMin: number; // phút trước "now" khi render, để hiện giờ hợp lý
}

export interface DemoChat {
  shopId: string;
  shopName: string;
  messages: DemoChatMessage[];
}

// Demo shop đã gỡ nên không còn chat demo phía buyer.
export const DEMO_CHAT_SHOP_IDS: readonly string[] = [];

export const DEMO_CHATS: DemoChat[] = [];

// ── Demo phía seller (Dashboard > Tin nhắn) ─────────────────────────────────
// Ở vị trí shop, demo phải là hội thoại với KHÁCH HÀNG (không phải với shop khác như
// phía buyer) — dùng key riêng thay vì shopId/buyer_wallet thật vì đây chỉ minh họa,
// không tồn tại trong DB.
export interface DemoCustomerChat {
  key: string;
  customerName: string;
  messages: DemoChatMessage[];
}

export const DEMO_CUSTOMER_CHATS: DemoCustomerChat[] = [
  {
    key: "demo-customer-1",
    customerName: "Minh Anh",
    messages: [
      { sender: "buyer", content: "Anh/chị ơi đơn của em bao giờ giao vậy ạ?", contentEn: "Hi, when will my order be shipped?", offsetMin: 240 },
      { sender: "shop", content: "Dạ shop đang đóng gói, mai sẽ gửi cho bạn nha, sẽ cập nhật mã vận đơn liền ạ.", contentEn: "We're packing it now, will ship tomorrow and update the tracking code right away.", offsetMin: 235 },
      { sender: "buyer", content: "Dạ em cảm ơn shop nhiều ạ", contentEn: "Thank you so much!", offsetMin: 233 },
    ],
  },
  {
    key: "demo-customer-2",
    customerName: "Hoàng Long",
    messages: [
      { sender: "buyer", content: "Shop ơi cho em hỏi có ship COD không ạ?", contentEn: "Hi, do you offer cash on delivery?", offsetMin: 400 },
      { sender: "shop", content: "Dạ bên em thanh toán qua escrow trên app để đảm bảo an toàn cho cả 2 bên, không hỗ trợ COD ạ.", contentEn: "We only support in-app escrow payment to keep both sides safe, no COD.", offsetMin: 396 },
      { sender: "buyer", content: "Ok vậy em đặt qua app luôn", contentEn: "Got it, I'll order through the app then", offsetMin: 393 },
    ],
  },
  {
    key: "demo-customer-3",
    customerName: "Thu Trang",
    messages: [
      { sender: "buyer", content: "Sản phẩm này còn bảo hành không shop?", contentEn: "Does this product still have warranty?", offsetMin: 130 },
      { sender: "shop", content: "Dạ còn ạ, bảo hành 12 tháng lỗi 1 đổi 1 trong 7 ngày đầu nha bạn.", contentEn: "Yes, 12-month warranty with 1-to-1 replacement in the first 7 days.", offsetMin: 126 },
    ],
  },
];
