/**
 * Demo chat — vài shop mẫu có sẵn tin nhắn ảo để minh họa ChatWidget.
 * KHÔNG kết nối backend thật — chọn 1 demo shop chỉ hiện lại đúng mảng messages tĩnh này.
 * Buyer vẫn gõ được trong luồng demo cho vui, nhưng tin nhắn chỉ append tạm ở client
 * (không lưu DB) — rõ ràng đây là minh họa, không phải chat thật với shop.
 */
import { DEMO_SHOPS_DATA } from "./data";

export interface DemoChatMessage {
  sender: "buyer" | "shop";
  content: string;
  contentEn: string;
  offsetMin: number; // phút trước "now" khi render — để hiện giờ hợp lý
}

export interface DemoChat {
  shopId: string;
  shopName: string;
  messages: DemoChatMessage[];
}

export const DEMO_CHAT_SHOP_IDS = ["demo-1", "demo-3", "demo-16"] as const;

export const DEMO_CHATS: DemoChat[] = [
  {
    shopId: "demo-1",
    shopName: DEMO_SHOPS_DATA["demo-1"].shop.name,
    messages: [
      { sender: "buyer", content: "Chào shop, MacBook Air M3 còn hàng không ạ?", contentEn: "Hi, is the MacBook Air M3 still in stock?", offsetMin: 190 },
      { sender: "shop", content: "Dạ còn hàng ạ, shop có sẵn giao trong 24-48h nha!", contentEn: "Yes it's in stock, we can ship within 24-48h!", offsetMin: 185 },
      { sender: "buyer", content: "Ok để em đặt qua escrow cho yên tâm", contentEn: "Ok I'll order through escrow to feel secure", offsetMin: 182 },
      { sender: "shop", content: "Dạ vâng, shop luôn đóng gói kỹ và cập nhật tracking đầy đủ ạ.", contentEn: "Sure, we always pack carefully and update tracking fully.", offsetMin: 180 },
    ],
  },
  {
    shopId: "demo-3",
    shopName: DEMO_SHOPS_DATA["demo-3"].shop.name,
    messages: [
      { sender: "buyer", content: "Áo size M còn không shop ơi?", contentEn: "Do you still have the shirt in size M?", offsetMin: 300 },
      { sender: "shop", content: "Dạ còn ạ, bên em còn đủ size S/M/L nha bạn", contentEn: "Yes, we still have sizes S/M/L available", offsetMin: 295 },
      { sender: "buyer", content: "Cho em xin ảnh thật của áo được không ạ", contentEn: "Can I get real photos of the shirt?", offsetMin: 293 },
      { sender: "shop", content: "Dạ em gửi liền đây ạ, hàng y hình luôn nha", contentEn: "Sending right away, the item matches the photo exactly", offsetMin: 291 },
    ],
  },
  {
    shopId: "demo-16",
    shopName: DEMO_SHOPS_DATA["demo-16"].shop.name,
    messages: [
      { sender: "buyer", content: "Máy ảnh này có kèm thẻ nhớ không shop?", contentEn: "Does this camera come with a memory card?", offsetMin: 120 },
      { sender: "shop", content: "Dạ không kèm thẻ nhớ ạ, chỉ có máy + pin + sạc thôi bạn nhé", contentEn: "No memory card included, just the camera + battery + charger", offsetMin: 116 },
      { sender: "buyer", content: "Vậy shop có bán thẻ nhớ riêng không?", contentEn: "Do you sell memory cards separately then?", offsetMin: 114 },
      { sender: "shop", content: "Dạ có, bạn xem thêm ở mục sản phẩm phụ kiện nha", contentEn: "Yes, check our accessories listings for that", offsetMin: 110 },
    ],
  },
];

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
