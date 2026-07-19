/**
 * Demo shop data — toàn bộ thông tin tĩnh cho 28 shop mẫu.
 * Cấu trúc khớp với interfaces trong ShopPublicPage.tsx.
 * Để chỉnh sửa shop demo: sửa file này, không cần đụng DB.
 * HomePage / ShopsPage / ProductsPage đều đọc từ DEMO_SHOPS_DATA — sửa 1 nơi, khớp cả 3 trang.
 */

export interface DemoShop {
  id: string; name: string; description: string; category: string;
  gmail: string; facebookUrl?: string; returnPolicy: string;
  status: "verified"; avgRating: number; totalOrders: number;
  totalRevenue: string; createdAt: string;
}

export interface DemoListing {
  id: string; name: string; description: string;
  priceUsdc: string; imageCid?: string; isActive: boolean;
}

export interface DemoOrder {
  id: string; orderCode: string; productName: string;
  priceUsdc: string; warrantyDays: number; status: string; createdAt: string;
  review?: { rating: number; comment: string; commentEn?: string; buyerWallet: string; createdAt: string };
}

export interface DemoShopFull {
  shop: DemoShop;
  listings: DemoListing[];
  orders: DemoOrder[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA — 28 shops (7 danh mục × 4 shop), mỗi shop có 10 listings
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_SHOPS_DATA: Record<string, DemoShopFull> = {

  // ── Công nghệ ──────────────────────────────────────────────────────────────
  "demo-1": {
    shop: {
      id: "demo-1", name: "TechZone Store", category: "Công nghệ",
      description: "Chuyên laptop, điện thoại, phụ kiện công nghệ chính hãng. Bảo hành chính hãng 12–24 tháng. Giao hàng toàn quốc trong 48 giờ.",
      gmail: "techzone.store@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu lỗi nhà sản xuất. Sản phẩm phải còn nguyên seal.",
      status: "verified", avgRating: 4.8, totalOrders: 128, totalRevenue: "$12,480", createdAt: "2024-03-01T00:00:00Z",
    },
    listings: [
      { id: "demo-1-l1", name: "MacBook Air M3 13\"", description: "Chip Apple M3, RAM 8GB, SSD 256GB, màu Midnight. Bảo hành Apple 12 tháng.", priceUsdc: "1299.00", isActive: true },
      { id: "demo-1-l2", name: "iPhone 15 Pro 256GB", description: "Màu Natural Titanium, chip A17 Pro, camera 48MP. Hàng VN/A chính hãng.", priceUsdc: "1099.00", isActive: true },
      { id: "demo-1-l3", name: "Samsung Galaxy S24 Ultra", description: "S-Pen tích hợp, màn hình 6.8\" Dynamic AMOLED, RAM 12GB. Hàng chính hãng.", priceUsdc: "1249.00", isActive: true },
      { id: "demo-1-l4", name: "Tai nghe Sony WH-1000XM5", description: "Chống ồn chủ động tốt nhất phân khúc, pin 30h, kết nối multipoint.", priceUsdc: "349.00", isActive: true },
      { id: "demo-1-l5", name: "iPad Pro 11\" M4", description: "Chip Apple M4, màn hình Ultra Retina XDR, hỗ trợ Apple Pencil Pro.", priceUsdc: "999.00", isActive: true },
      { id: "demo-1-l6", name: "Apple Watch Series 10", description: "GPS, màn hình lớn hơn, đo oxy máu, chống nước 50m.", priceUsdc: "429.00", isActive: true },
      { id: "demo-1-l7", name: "Dell XPS 15 OLED", description: "Core Ultra 9, RAM 32GB, màn OLED 3.5K cảm ứng.", priceUsdc: "1899.00", isActive: true },
      { id: "demo-1-l8", name: "Bàn phím cơ Keychron K8 Pro", description: "Hotswap, kết nối Bluetooth/USB-C, switch Gateron.", priceUsdc: "99.00", isActive: true },
      { id: "demo-1-l9", name: "Ổ cứng SSD di động Samsung T9 2TB", description: "Tốc độ 2000MB/s, vỏ nhôm chống sốc.", priceUsdc: "189.00", isActive: true },
      { id: "demo-1-l10", name: "Sạc nhanh Anker 100W GaN", description: "3 cổng USB-C, sạc đồng thời laptop + điện thoại.", priceUsdc: "59.00", isActive: true },
    ],
    orders: [
      { id: "demo-1-o1", orderCode: "TZ-001", productName: "MacBook Air M3 13\"", priceUsdc: "1299.00", warrantyDays: 365, status: "released", createdAt: "2024-05-10T08:00:00Z", review: { rating: 5, comment: "Máy chạy cực mượt, giao hàng đúng hẹn, đóng gói cẩn thận. Rất hài lòng!", commentEn: "Runs flawlessly, on-time delivery, careful packaging. Highly satisfied!", buyerWallet: "0xabc1...def2", createdAt: "2024-05-17T10:00:00Z" } },
      { id: "demo-1-o2", orderCode: "TZ-002", productName: "iPhone 15 Pro 256GB", priceUsdc: "1099.00", warrantyDays: 365, status: "released", createdAt: "2024-05-15T09:00:00Z", review: { rating: 5, comment: "Hàng chính hãng, camera quá đẹp. Shop tư vấn nhiệt tình.", commentEn: "Genuine product, incredible camera. Shop staff were very helpful.", buyerWallet: "0xbcd2...ef34", createdAt: "2024-05-22T11:00:00Z" } },
      { id: "demo-1-o3", orderCode: "TZ-003", productName: "Tai nghe Sony WH-1000XM5", priceUsdc: "349.00", warrantyDays: 365, status: "released", createdAt: "2024-05-20T10:00:00Z", review: { rating: 4, comment: "Chống ồn tốt, âm thanh hay. Giá hơi cao nhưng xứng đáng.", commentEn: "Great noise cancellation, excellent sound. Pricey but worth every penny.", buyerWallet: "0xcd34...f456", createdAt: "2024-05-27T09:00:00Z" } },
      { id: "demo-1-o4", orderCode: "TZ-004", productName: "Samsung Galaxy S24 Ultra", priceUsdc: "1249.00", warrantyDays: 365, status: "released", createdAt: "2024-06-01T08:00:00Z", review: { rating: 5, comment: "S-Pen tiện lợi, màn hình siêu đẹp. Đặt hàng qua escrow rất yên tâm.", commentEn: "S-Pen is super handy, gorgeous display. Buying through escrow felt very secure.", buyerWallet: "0xde45...5678", createdAt: "2024-06-08T10:00:00Z" } },
    ],
  },

  "demo-2": {
    shop: {
      id: "demo-2", name: "Gadget Hub VN", category: "Công nghệ",
      description: "Thiết bị nhà thông minh, tai nghe TWS, màn hình gaming. Bảo hành 12 tháng, hỗ trợ kỹ thuật 24/7.",
      gmail: "gadgethubvn@gmail.com",
      returnPolicy: "Đổi mới trong 30 ngày nếu lỗi từ nhà sản xuất. Không áp dụng hư hỏng do va đập.",
      status: "verified", avgRating: 4.6, totalOrders: 74, totalRevenue: "$5,920", createdAt: "2024-04-01T00:00:00Z",
    },
    listings: [
      { id: "demo-2-l1", name: "Màn hình ASUS ROG Swift 27\" 165Hz", description: "IPS 2K, 165Hz, G-Sync, HDR400, viền mỏng. Lý tưởng cho gaming.", priceUsdc: "399.00", isActive: true },
      { id: "demo-2-l2", name: "Bộ đèn Govee Immersion TV", description: "Đèn LED đồng bộ màn hình TV, 16 triệu màu, điều khiển qua app.", priceUsdc: "79.00", isActive: true },
      { id: "demo-2-l3", name: "Samsung SmartThings Hub", description: "Trung tâm điều khiển nhà thông minh, hỗ trợ Zigbee, Z-Wave, Wi-Fi.", priceUsdc: "129.00", isActive: true },
      { id: "demo-2-l4", name: "Tai nghe TWS Nothing Ear (2)", description: "ANC chủ động, Hi-Res Audio, pin 36h với case sạc, chống nước IP54.", priceUsdc: "149.00", isActive: true },
      { id: "demo-2-l5", name: "Bàn phím cơ gaming Razer Huntsman V3", description: "Switch quang học, RGB Chroma, hotswap.", priceUsdc: "189.00", isActive: true },
      { id: "demo-2-l6", name: "Webcam Logitech Brio 4K", description: "Tự động lấy nét HDR, mic khử ồn kép, dùng cho streaming.", priceUsdc: "149.00", isActive: true },
      { id: "demo-2-l7", name: "Loa thông minh Google Nest Audio", description: "Trợ lý ảo Google, âm bass sâu, kết nối đa phòng.", priceUsdc: "89.00", isActive: true },
      { id: "demo-2-l8", name: "Router Wifi 6 TP-Link Deco X68", description: "Mesh 3 băng tần, phủ sóng 550m², hỗ trợ 200 thiết bị.", priceUsdc: "259.00", isActive: true },
      { id: "demo-2-l9", name: "Camera an ninh Ezviz C6N 360°", description: "Xoay 360 độ, phát hiện chuyển động AI, lưu trữ cloud.", priceUsdc: "45.00", isActive: true },
      { id: "demo-2-l10", name: "Ghế gaming ergonomic AutoFull", description: "Đệm lưng lượn sóng, ngả 165 độ, tựa đầu điều chỉnh.", priceUsdc: "219.00", isActive: true },
    ],
    orders: [
      { id: "demo-2-o1", orderCode: "GH-001", productName: "Màn hình ASUS ROG Swift 27\"", priceUsdc: "399.00", warrantyDays: 365, status: "released", createdAt: "2024-05-05T08:00:00Z", review: { rating: 5, comment: "Màn hình cực đẹp, 165Hz chơi game mượt lắm. Đóng gói chắc chắn.", commentEn: "Beautiful monitor, 165Hz makes gaming buttery smooth. Solid packaging.", buyerWallet: "0xef56...789a", createdAt: "2024-05-12T09:00:00Z" } },
      { id: "demo-2-o2", orderCode: "GH-002", productName: "Tai nghe TWS Nothing Ear (2)", priceUsdc: "149.00", warrantyDays: 365, status: "released", createdAt: "2024-05-18T10:00:00Z", review: { rating: 4, comment: "ANC tốt, thiết kế đẹp. App đôi khi lag nhẹ nhưng không ảnh hưởng nhiều.", commentEn: "Good ANC, sleek design. App occasionally lags but barely noticeable.", buyerWallet: "0xf067...89ab", createdAt: "2024-05-25T11:00:00Z" } },
      { id: "demo-2-o3", orderCode: "GH-003", productName: "Bộ đèn Govee Immersion TV", priceUsdc: "79.00", warrantyDays: 180, status: "released", createdAt: "2024-06-01T09:00:00Z", review: { rating: 5, comment: "Màu sắc đồng bộ TV rất hay, cài đặt dễ. Phòng trông lung linh hẳn.", commentEn: "TV color sync looks amazing, easy to set up. The room looks stunning.", buyerWallet: "0x0178...9abc", createdAt: "2024-06-08T10:00:00Z" } },
      { id: "demo-2-o4", orderCode: "GH-004", productName: "Samsung SmartThings Hub", priceUsdc: "129.00", warrantyDays: 365, status: "released", createdAt: "2024-06-10T08:00:00Z", review: { rating: 4, comment: "Kết nối ổn định, hỗ trợ nhiều thiết bị. Setup ban đầu hơi phức tạp.", commentEn: "Stable connection, supports many devices. Initial setup is a bit complex.", buyerWallet: "0x1289...abcd", createdAt: "2024-06-17T09:00:00Z" } },
    ],
  },

  "demo-15": {
    shop: {
      id: "demo-15", name: "Phụ Kiện Số VN", category: "Công nghệ",
      description: "Phụ kiện điện thoại, sạc, cáp chính hãng cho iPhone và Android. Bảo hành đổi mới 1 đổi 1 trong 15 ngày.",
      gmail: "phukiensovn@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi mới 1 đổi 1 trong 15 ngày nếu sản phẩm lỗi kỹ thuật.",
      status: "verified", avgRating: 4.6, totalOrders: 187, totalRevenue: "$4,210", createdAt: "2024-05-01T00:00:00Z",
    },
    listings: [
      { id: "demo-15-l1", name: "Ốp lưng MagSafe trong suốt iPhone 15", description: "Chống ám vàng, tương thích sạc từ MagSafe, viền TPU mềm.", priceUsdc: "14.00", isActive: true },
      { id: "demo-15-l2", name: "Cáp sạc USB-C to Lightning Anker 1m", description: "Sạc nhanh PD, bọc dù chống đứt gãy, bảo hành 18 tháng.", priceUsdc: "12.00", isActive: true },
      { id: "demo-15-l3", name: "Củ sạc nhanh 30W USB-C Baseus", description: "Sạc nhanh cho iPhone/Samsung, nhỏ gọn, chuẩn PD 3.0.", priceUsdc: "16.00", isActive: true },
      { id: "demo-15-l4", name: "Miếng dán cường lực full màn hình", description: "Kính cường lực 9H, chống vân tay, tự dán không bọt khí.", priceUsdc: "8.00", isActive: true },
      { id: "demo-15-l5", name: "Giá đỡ điện thoại để bàn gập gọn", description: "Nhôm nguyên khối, điều chỉnh góc nhìn, gấp bỏ túi được.", priceUsdc: "10.00", isActive: true },
      { id: "demo-15-l6", name: "Tai nghe Bluetooth nhét tai TWS", description: "Pin 20h với hộp sạc, chống nước IPX4, kết nối ổn định.", priceUsdc: "19.00", isActive: true },
      { id: "demo-15-l7", name: "Pin dự phòng mini 10000mAh", description: "Nhỏ gọn bỏ túi, sạc 2 chiều, đủ sạc iPhone 2 lần.", priceUsdc: "22.00", isActive: true },
      { id: "demo-15-l8", name: "Bộ cáp sạc nam châm 3 đầu", description: "Dùng chung 1 dây cho Type-C/Lightning/Micro, tháo lắp nhanh.", priceUsdc: "13.00", isActive: true },
      { id: "demo-15-l9", name: "Ví đựng thẻ gắn sau điện thoại MagSafe", description: "Đựng 3 thẻ, chất liệu da PU, gắn từ tính chắc chắn.", priceUsdc: "9.00", isActive: true },
      { id: "demo-15-l10", name: "Gậy chụp ảnh tripod Bluetooth mini", description: "Chân đế 3 chạc, điều khiển từ xa, phù hợp livestream.", priceUsdc: "17.00", isActive: true },
    ],
    orders: [
      { id: "demo-15-o1", orderCode: "TC-001", productName: "Ốp lưng MagSafe trong suốt iPhone 15", priceUsdc: "14.00", warrantyDays: 180, status: "released", createdAt: "2024-06-02T08:00:00Z", review: { rating: 5, comment: "Ốp trong không ố vàng sau 2 tháng dùng, hít nam châm chắc.", commentEn: "Stayed crystal clear after 2 months, magnet grip is solid.", buyerWallet: "0x2a3b...4c5d", createdAt: "2024-06-09T09:00:00Z" } },
      { id: "demo-15-o2", orderCode: "TC-002", productName: "Củ sạc nhanh 30W USB-C Baseus", priceUsdc: "16.00", warrantyDays: 180, status: "released", createdAt: "2024-06-05T09:00:00Z", review: { rating: 5, comment: "Sạc nhanh thật sự, nhỏ gọn mang đi công tác tiện lắm.", commentEn: "Genuinely fast charging, compact enough for business trips.", buyerWallet: "0x3b4c...5d6e", createdAt: "2024-06-12T10:00:00Z" } },
      { id: "demo-15-o3", orderCode: "TC-003", productName: "Pin dự phòng mini 10000mAh", priceUsdc: "22.00", warrantyDays: 365, status: "released", createdAt: "2024-06-10T09:00:00Z", review: { rating: 4, comment: "Nhỏ gọn, sạc được 2 lần iPhone. Hơi lâu sạc đầy pin dự phòng.", commentEn: "Compact, charges my iPhone twice. Takes a while to fully recharge itself.", buyerWallet: "0x4c5d...6e7f", createdAt: "2024-06-17T10:00:00Z" } },
    ],
  },

  "demo-16": {
    shop: {
      id: "demo-16", name: "Camera & Đồ Nghề Sáng Tạo", category: "Công nghệ",
      description: "Thiết bị quay chụp, livestream, sáng tạo nội dung: camera, mic, đèn LED, gimbal. Tư vấn setup studio mini tại nhà.",
      gmail: "cameravsangtao@gmail.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu thiết bị lỗi phần cứng, giữ nguyên hộp và phụ kiện.",
      status: "verified", avgRating: 4.7, totalOrders: 62, totalRevenue: "$9,340", createdAt: "2024-04-10T00:00:00Z",
    },
    listings: [
      { id: "demo-16-l1", name: "Webcam Logitech C920 Full HD", description: "Quay 1080p 30fps, mic tích hợp, lấy nét tự động.", priceUsdc: "69.00", isActive: true },
      { id: "demo-16-l2", name: "Mic thu âm cài áo không dây DJI Mic", description: "Thu âm rõ ràng, khử ồn AI, kèm hộp sạc di động.", priceUsdc: "149.00", isActive: true },
      { id: "demo-16-l3", name: "Đèn LED livestream 3 chân kèm softbox", description: "Ánh sáng đều, điều chỉnh nhiệt màu, có remote điều khiển.", priceUsdc: "59.00", isActive: true },
      { id: "demo-16-l4", name: "Gimbal chống rung DJI Osmo Mobile 6", description: "Chống rung 3 trục cho điện thoại, theo dõi chủ thể tự động.", priceUsdc: "139.00", isActive: true },
      { id: "demo-16-l5", name: "Máy quay hành trình GoPro Hero 12", description: "Chống nước 10m, quay 5.3K, chống rung HyperSmooth.", priceUsdc: "399.00", isActive: true },
      { id: "demo-16-l6", name: "Thẻ nhớ SanDisk Extreme 128GB", description: "Tốc độ ghi 90MB/s, chuẩn cho quay 4K, chống nước/sốc.", priceUsdc: "25.00", isActive: true },
      { id: "demo-16-l7", name: "Phông xanh chroma key 2×3m", description: "Vải không nhăn, kèm khung treo, dùng cho edit video.", priceUsdc: "45.00", isActive: true },
      { id: "demo-16-l8", name: "Chân máy tripod nhôm 1.8m", description: "Đầu xoay 360°, chịu tải 5kg, gấp gọn mang đi.", priceUsdc: "32.00", isActive: true },
      { id: "demo-16-l9", name: "Ổ cứng SSD di động Crucial X6 1TB", description: "Truyền file quay dựng nhanh, nhỏ gọn, cổng USB-C.", priceUsdc: "89.00", isActive: true },
      { id: "demo-16-l10", name: "Bàn mixer âm thanh mini Rode", description: "Trộn 2 kênh mic, có hiệu ứng, dùng cho podcast/livestream.", priceUsdc: "119.00", isActive: true },
    ],
    orders: [
      { id: "demo-16-o1", orderCode: "CST-001", productName: "Máy quay hành trình GoPro Hero 12", priceUsdc: "399.00", warrantyDays: 365, status: "released", createdAt: "2024-05-20T08:00:00Z", review: { rating: 5, comment: "Quay 4K siêu nét, chống rung tốt khi đi phượt.", commentEn: "Incredibly sharp 4K footage, great stabilization on road trips.", buyerWallet: "0x5d6e...7f8a", createdAt: "2024-05-27T09:00:00Z" } },
      { id: "demo-16-o2", orderCode: "CST-002", productName: "Mic thu âm cài áo không dây DJI Mic", priceUsdc: "149.00", warrantyDays: 365, status: "released", createdAt: "2024-05-25T09:00:00Z", review: { rating: 5, comment: "Âm thanh sạch, kết nối ổn định khi livestream ngoài trời.", commentEn: "Clean audio, stable connection even livestreaming outdoors.", buyerWallet: "0x6e7f...8a9b", createdAt: "2024-06-01T10:00:00Z" } },
      { id: "demo-16-o3", orderCode: "CST-003", productName: "Đèn LED livestream 3 chân kèm softbox", priceUsdc: "59.00", warrantyDays: 180, status: "released", createdAt: "2024-06-03T09:00:00Z", review: { rating: 4, comment: "Ánh sáng đều, giá hợp lý. Chân đế hơi nhẹ khi gắn softbox lớn.", commentEn: "Even lighting, good price. Stand feels light with a bigger softbox.", buyerWallet: "0x7f8a...9b0c", createdAt: "2024-06-10T10:00:00Z" } },
    ],
  },

  // ── Thời trang ─────────────────────────────────────────────────────────────
  "demo-3": {
    shop: {
      id: "demo-3", name: "Thời Trang Linh", category: "Thời trang",
      description: "Quần áo nữ phong cách Hàn Quốc, cập nhật xu hướng mỗi tuần. Chất liệu cao cấp, form dáng chuẩn, ship COD toàn quốc.",
      gmail: "thoitranglinh@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi size trong 3 ngày kể từ ngày nhận hàng. Hàng lỗi đổi mới trong 7 ngày.",
      status: "verified", avgRating: 4.6, totalOrders: 87, totalRevenue: "$3,480", createdAt: "2024-02-01T00:00:00Z",
    },
    listings: [
      { id: "demo-3-l1", name: "Set áo croptop + chân váy midi", description: "Chất cotton linen thoáng mát, màu be và nâu đất. Size S-XL.", priceUsdc: "45.00", isActive: true },
      { id: "demo-3-l2", name: "Đầm maxi hoa nhí dáng A", description: "Vải chiffon mỏng nhẹ, in hoa nhí vintage. Phù hợp du lịch, dạo phố.", priceUsdc: "55.00", isActive: true },
      { id: "demo-3-l3", name: "Áo len tay dài cổ tim", description: "Len mềm mịn, dáng oversize nhẹ, màu pastel. Size M-XL.", priceUsdc: "39.00", isActive: true },
      { id: "demo-3-l4", name: "Quần wide-leg lưng cao", description: "Chất liệu KTV cao cấp, không nhăn, dáng đứng đẹp. Màu đen và kem.", priceUsdc: "48.00", isActive: true },
      { id: "demo-3-l5", name: "Áo sơ mi lụa tay phồng", description: "Chất lụa Hàn cao cấp, form rộng, phù hợp công sở lẫn dạo phố.", priceUsdc: "42.00", isActive: true },
      { id: "demo-3-l6", name: "Chân váy xếp ly midi", description: "Vải tuyết mưa, form xòe nhẹ, 4 màu pastel.", priceUsdc: "35.00", isActive: true },
      { id: "demo-3-l7", name: "Áo blazer form rộng unisex", description: "Vải tweed, lót trong mát, phối được nhiều outfit.", priceUsdc: "58.00", isActive: true },
      { id: "demo-3-l8", name: "Đầm dự tiệc satin ánh kim", description: "Dáng ôm nhẹ, xẻ tà, phù hợp tiệc tối.", priceUsdc: "65.00", isActive: true },
      { id: "demo-3-l9", name: "Set đồ ngủ lụa cao cấp", description: "Lụa satin mềm mịn, form suông thoải mái, 5 màu.", priceUsdc: "38.00", isActive: true },
      { id: "demo-3-l10", name: "Túi xách tote da PU", description: "Ngăn chứa rộng, khóa nam châm, quai da bền chắc.", priceUsdc: "32.00", isActive: true },
    ],
    orders: [
      { id: "demo-3-o1", orderCode: "TTL-001", productName: "Set áo croptop + chân váy midi", priceUsdc: "45.00", warrantyDays: 0, status: "released", createdAt: "2024-05-08T08:00:00Z", review: { rating: 5, comment: "Vải đẹp, mặc vào form chuẩn y hình. Giao hàng nhanh!", commentEn: "Great fabric, fits exactly like the photo. Fast delivery!", buyerWallet: "0x2390...bcde", createdAt: "2024-05-15T09:00:00Z" } },
      { id: "demo-3-o2", orderCode: "TTL-002", productName: "Đầm maxi hoa nhí dáng A", priceUsdc: "55.00", warrantyDays: 0, status: "released", createdAt: "2024-05-20T09:00:00Z", review: { rating: 5, comment: "Mặc đi du lịch Đà Lạt, ai cũng khen. Chất vải thật sự đẹp.", commentEn: "Wore it on a trip to Da Lat, everyone loved it. Truly beautiful material.", buyerWallet: "0x34ab...cdef", createdAt: "2024-05-27T11:00:00Z" } },
      { id: "demo-3-o3", orderCode: "TTL-003", productName: "Áo len tay dài cổ tim", priceUsdc: "39.00", warrantyDays: 0, status: "released", createdAt: "2024-06-02T08:00:00Z", review: { rating: 4, comment: "Len mềm mịn, màu đẹp. Hơi mỏng hơn mong đợi nhưng vẫn ổn.", commentEn: "Soft wool, nice color. Slightly thinner than expected but still fine.", buyerWallet: "0x45bc...def0", createdAt: "2024-06-09T10:00:00Z" } },
      { id: "demo-3-o4", orderCode: "TTL-004", productName: "Quần wide-leg lưng cao", priceUsdc: "48.00", warrantyDays: 0, status: "released", createdAt: "2024-06-12T09:00:00Z", review: { rating: 5, comment: "Dáng quần siêu đẹp, chất không nhăn. Mặc đi làm, đi chơi đều được.", commentEn: "Great-looking pants, wrinkle-free fabric. Perfect for both work and going out.", buyerWallet: "0x56cd...ef01", createdAt: "2024-06-19T10:00:00Z" } },
    ],
  },

  "demo-4": {
    shop: {
      id: "demo-4", name: "Urban Street VN", category: "Thời trang",
      description: "Streetwear nam & nữ, giày sneaker limited, phụ kiện unisex. Hàng nhập khẩu chính ngạch từ US, JP, KR.",
      gmail: "urbanstreetvn@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Không đổi trả với giày đã mang. Quần áo đổi size trong 5 ngày.",
      status: "verified", avgRating: 4.4, totalOrders: 61, totalRevenue: "$7,320", createdAt: "2024-03-15T00:00:00Z",
    },
    listings: [
      { id: "demo-4-l1", name: "Nike Air Force 1 '07 White", description: "Size 38-45, màu trắng classic. Hàng US chính hãng, full box.", priceUsdc: "120.00", isActive: true },
      { id: "demo-4-l2", name: "Áo hoodie Supreme Box Logo", description: "Cotton 500gsm, unisex, màu đen và đỏ. Size S-XXL.", priceUsdc: "220.00", isActive: true },
      { id: "demo-4-l3", name: "Mũ bucket hat New Era", description: "Logo thêu nổi, vải canvas dày dặn, màu be và xanh navy.", priceUsdc: "55.00", isActive: true },
      { id: "demo-4-l4", name: "Túi tote canvas 600D", description: "In hình graffiti độc quyền, 2 quai đeo, có khóa kéo. Màu đen.", priceUsdc: "35.00", isActive: true },
      { id: "demo-4-l5", name: "Quần jogger tech fleece", description: "Chất nỉ dày, bo gấu, có túi khóa kéo tiện lợi.", priceUsdc: "48.00", isActive: true },
      { id: "demo-4-l6", name: "Giày Adidas Samba OG", description: "Da lộn phối da trơn, đế cao su nguyên khối.", priceUsdc: "110.00", isActive: true },
      { id: "demo-4-l7", name: "Áo thun oversized graphic print", description: "Cotton 100%, in hình graffiti độc quyền.", priceUsdc: "28.00", isActive: true },
      { id: "demo-4-l8", name: "Balo chống nước Herschel", description: "Ngăn laptop 15\", chất canvas chống thấm.", priceUsdc: "65.00", isActive: true },
      { id: "demo-4-l9", name: "Kính mát vuông retro", description: "Gọng acetate, tròng chống UV400.", priceUsdc: "25.00", isActive: true },
      { id: "demo-4-l10", name: "Dây chuyền bạc 925 unisex", description: "Mặt dây hình học tối giản, không xi mạ.", priceUsdc: "45.00", isActive: true },
    ],
    orders: [
      { id: "demo-4-o1", orderCode: "US-001", productName: "Nike Air Force 1 '07 White", priceUsdc: "120.00", warrantyDays: 0, status: "released", createdAt: "2024-05-10T08:00:00Z", review: { rating: 5, comment: "Giày đúng auth, full box, size chuẩn. Giao hàng nhanh.", commentEn: "Authentic shoes, full box, true to size. Fast delivery.", buyerWallet: "0x67de...f012", createdAt: "2024-05-17T09:00:00Z" } },
      { id: "demo-4-o2", orderCode: "US-002", productName: "Áo hoodie Supreme Box Logo", priceUsdc: "220.00", warrantyDays: 0, status: "released", createdAt: "2024-05-22T10:00:00Z", review: { rating: 4, comment: "Vải dày đẹp, logo rõ nét. Hơi đắt nhưng đúng hàng chính hãng.", commentEn: "Thick fabric, sharp logo. Pricey but genuinely authentic.", buyerWallet: "0x78ef...0123", createdAt: "2024-05-29T11:00:00Z" } },
      { id: "demo-4-o3", orderCode: "US-003", productName: "Mũ bucket hat New Era", priceUsdc: "55.00", warrantyDays: 0, status: "released", createdAt: "2024-06-05T09:00:00Z", review: { rating: 4, comment: "Mũ đẹp, size vừa. Vải tốt nhưng màu hơi khác ảnh một chút.", commentEn: "Nice hat, good fit. Quality fabric but color is slightly different from the photos.", buyerWallet: "0x89f0...1234", createdAt: "2024-06-12T10:00:00Z" } },
      { id: "demo-4-o4", orderCode: "US-004", productName: "Túi tote canvas 600D", priceUsdc: "35.00", warrantyDays: 0, status: "released", createdAt: "2024-06-15T08:00:00Z", review: { rating: 5, comment: "Túi dày dặn, đựng được nhiều đồ. Hình in sắc nét, cá tính.", commentEn: "Sturdy bag, holds a lot. Crisp print, very stylish.", buyerWallet: "0x9a01...2345", createdAt: "2024-06-22T09:00:00Z" } },
    ],
  },

  "demo-17": {
    shop: {
      id: "demo-17", name: "Giày Da Nam Handmade", category: "Thời trang",
      description: "Giày da nam thủ công, da bò thật 100%, đóng theo form chân tại xưởng riêng. Bảo hành đế 12 tháng.",
      gmail: "giaydanamhandmade@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi size miễn phí trong 5 ngày nếu chưa qua sử dụng ngoài trời.",
      status: "verified", avgRating: 4.7, totalOrders: 71, totalRevenue: "$11,360", createdAt: "2024-03-20T00:00:00Z",
    },
    listings: [
      { id: "demo-17-l1", name: "Giày tây Oxford da bò nâu", description: "Da thật nguyên tấm, đế khâu Goodyear, phù hợp công sở.", priceUsdc: "135.00", isActive: true },
      { id: "demo-17-l2", name: "Giày lười Loafer da lộn", description: "Form Ý thanh lịch, lót da mềm, đi êm chân cả ngày.", priceUsdc: "98.00", isActive: true },
      { id: "demo-17-l3", name: "Giày boot Chelsea da đen", description: "Cổ thun co giãn, đế cao su chống trượt, phong cách basic.", priceUsdc: "115.00", isActive: true },
      { id: "demo-17-l4", name: "Sandal da nam quai ngang", description: "Da thật, đế EVA nhẹ, phù hợp mùa hè.", priceUsdc: "58.00", isActive: true },
      { id: "demo-17-l5", name: "Giày da Derby mũi trơn", description: "Đường may tay tỉ mỉ, phù hợp vest và smart casual.", priceUsdc: "128.00", isActive: true },
      { id: "demo-17-l6", name: "Thắt lưng da bò khóa kim loại", description: "Da nguyên tấm dày 4mm, khóa hợp kim không gỉ.", priceUsdc: "35.00", isActive: true },
      { id: "demo-17-l7", name: "Ví da nam gấp đôi", description: "Da bò thật, 8 ngăn thẻ, đóng thủ công từng đường chỉ.", priceUsdc: "42.00", isActive: true },
      { id: "demo-17-l8", name: "Túi đeo chéo da nam mini", description: "Kích thước gọn, đựng vừa điện thoại và ví giấy tờ.", priceUsdc: "65.00", isActive: true },
      { id: "demo-17-l9", name: "Xi đánh giày cao cấp kèm khăn lau", description: "Dưỡng và bảo vệ màu da, nhiều màu đế lựa chọn.", priceUsdc: "9.00", isActive: true },
      { id: "demo-17-l10", name: "Combo giày + thắt lưng da đồng bộ", description: "Tiết kiệm 15%, cùng tone màu, hộp quà sang trọng.", priceUsdc: "155.00", isActive: true },
    ],
    orders: [
      { id: "demo-17-o1", orderCode: "GDN-001", productName: "Giày tây Oxford da bò nâu", priceUsdc: "135.00", warrantyDays: 365, status: "released", createdAt: "2024-05-15T08:00:00Z", review: { rating: 5, comment: "Da thật êm chân, đi cả ngày không đau. Đóng gói sang trọng.", commentEn: "Genuine leather, comfortable all day. Elegant packaging.", buyerWallet: "0x8a9b...0c1d", createdAt: "2024-05-22T09:00:00Z" } },
      { id: "demo-17-o2", orderCode: "GDN-002", productName: "Giày boot Chelsea da đen", priceUsdc: "115.00", warrantyDays: 365, status: "released", createdAt: "2024-05-28T09:00:00Z", review: { rating: 5, comment: "Form đẹp, đế bám tốt đi trời mưa nhẹ vẫn ổn.", commentEn: "Great fit, good grip even in light rain.", buyerWallet: "0x9b0c...1d2e", createdAt: "2024-06-04T10:00:00Z" } },
      { id: "demo-17-o3", orderCode: "GDN-003", productName: "Ví da nam gấp đôi", priceUsdc: "42.00", warrantyDays: 180, status: "released", createdAt: "2024-06-08T09:00:00Z", review: { rating: 4, comment: "Da đẹp, đường may chắc chắn. Hơi dày lúc mới mua nhưng dùng quen.", commentEn: "Nice leather, sturdy stitching. A bit thick at first but breaks in fine.", buyerWallet: "0x0c1d...2e3f", createdAt: "2024-06-15T10:00:00Z" } },
    ],
  },

  "demo-18": {
    shop: {
      id: "demo-18", name: "Đồ Bộ Gia Đình Cotton", category: "Thời trang",
      description: "Đồ bộ mặc nhà, đồ đôi, đồ gia đình chất cotton 100% co giãn 4 chiều. Sản xuất tại xưởng Việt Nam, giá xưởng.",
      gmail: "dobogiadinh@gmail.com",
      returnPolicy: "Đổi size trong 5 ngày, hàng chưa giặt còn tem mác.",
      status: "verified", avgRating: 4.5, totalOrders: 143, totalRevenue: "$3,860", createdAt: "2024-02-10T00:00:00Z",
    },
    listings: [
      { id: "demo-18-l1", name: "Bộ đồ mặc nhà cotton form rộng", description: "Chất cotton 100% mềm mát, thấm hút mồ hôi tốt.", priceUsdc: "18.00", isActive: true },
      { id: "demo-18-l2", name: "Bộ đồ đôi tình nhân in chữ", description: "Áo thun + quần short, size cho cả nam nữ.", priceUsdc: "22.00", isActive: true },
      { id: "demo-18-l3", name: "Bộ pyjama lụa satin nữ", description: "Áo hai dây + quần dài, mềm mịn, thoáng khí.", priceUsdc: "26.00", isActive: true },
      { id: "demo-18-l4", name: "Bộ đồ bầu mặc nhà thun cotton", description: "Bụng co giãn linh hoạt, thoải mái suốt thai kỳ.", priceUsdc: "24.00", isActive: true },
      { id: "demo-18-l5", name: "Áo thun gia đình đồng phục", description: "In tên riêng theo yêu cầu, cotton 100%, cho bố mẹ và 1 bé.", priceUsdc: "32.00", isActive: true },
      { id: "demo-18-l6", name: "Quần short cotton nam mặc nhà", description: "Túi hai bên, dây rút eo, form rộng thoải mái.", priceUsdc: "12.00", isActive: true },
      { id: "demo-18-l7", name: "Bộ đồ ngủ dài tay mùa đông", description: "Nỉ bông giữ ấm, cổ tròn, phù hợp trời lạnh.", priceUsdc: "28.00", isActive: true },
      { id: "demo-18-l8", name: "Áo choàng tắm cotton unisex", description: "Thấm hút cực tốt, có mũ trùm, 2 màu trơn.", priceUsdc: "30.00", isActive: true },
      { id: "demo-18-l9", name: "Set khăn tắm gia đình cotton (4 chiếc)", description: "Sợi cotton Ai Cập, mềm mịn, không xù lông.", priceUsdc: "25.00", isActive: true },
      { id: "demo-18-l10", name: "Bộ đồ bộ trẻ em hoạt hình cotton", description: "Hình in an toàn không phai màu, size 2-10 tuổi.", priceUsdc: "15.00", isActive: true },
    ],
    orders: [
      { id: "demo-18-o1", orderCode: "DBG-001", productName: "Bộ đồ mặc nhà cotton form rộng", priceUsdc: "18.00", warrantyDays: 0, status: "released", createdAt: "2024-05-12T08:00:00Z", review: { rating: 5, comment: "Vải mát, mặc ngủ ngon giấc hẳn. Form rộng thoải mái.", commentEn: "Cool fabric, sleep so much better. Loose fit is very comfortable.", buyerWallet: "0x1d2e...3f4a", createdAt: "2024-05-19T09:00:00Z" } },
      { id: "demo-18-o2", orderCode: "DBG-002", productName: "Bộ pyjama lụa satin nữ", priceUsdc: "26.00", warrantyDays: 0, status: "released", createdAt: "2024-05-24T09:00:00Z", review: { rating: 5, comment: "Lụa mềm mịn, mặc sang mà giá hợp lý.", commentEn: "Silky soft, feels premium at a reasonable price.", buyerWallet: "0x2e3f...4a5b", createdAt: "2024-05-31T10:00:00Z" } },
      { id: "demo-18-o3", orderCode: "DBG-003", productName: "Set khăn tắm gia đình cotton", priceUsdc: "25.00", warrantyDays: 0, status: "released", createdAt: "2024-06-04T09:00:00Z", review: { rating: 4, comment: "Khăn mềm, thấm hút tốt. Giặt vài lần hơi xù nhẹ.", commentEn: "Soft towels, absorbs well. Slight fraying after a few washes.", buyerWallet: "0x3f4a...5b6c", createdAt: "2024-06-11T10:00:00Z" } },
    ],
  },

  // ── Đồ ăn & Thức uống ─────────────────────────────────────────────────────
  "demo-5": {
    shop: {
      id: "demo-5", name: "Phở Gia Truyền 1990", category: "Đồ ăn & Thức uống",
      description: "Phở bò Hà Nội gia truyền 3 đời. Nước dùng hầm 12 giờ từ xương bò, bánh phở tươi mỗi ngày. Giao hàng trong vòng 30 phút.",
      gmail: "phogiatruyen1990@gmail.com",
      returnPolicy: "Hoàn tiền 100% nếu đồ ăn không đúng mô tả hoặc giao sai món.",
      status: "verified", avgRating: 4.9, totalOrders: 302, totalRevenue: "$3,020", createdAt: "2024-01-15T00:00:00Z",
    },
    listings: [
      { id: "demo-5-l1", name: "Phở bò tái chín đặc biệt (1 tô)", description: "Tái nạm gầu bò Mỹ, hành lá, ngò, giá. Nước dùng đậm đà, không bột ngọt.", priceUsdc: "8.50", isActive: true },
      { id: "demo-5-l2", name: "Combo phở 2 tô + 2 quẩy", description: "2 tô phở đặc biệt + 2 quẩy giòn. Tiết kiệm hơn mua lẻ.", priceUsdc: "15.00", isActive: true },
      { id: "demo-5-l3", name: "Phở gà ta đồng quê (1 tô)", description: "Gà ta thả vườn, nước dùng trong và ngọt tự nhiên, gừng tươi.", priceUsdc: "7.50", isActive: true },
      { id: "demo-5-l4", name: "Set nước dùng phở đông lạnh (2L)", description: "Nước dùng đặc biệt đóng hộp 2L, hầm 12 giờ. Dùng được trong 30 ngày đông lạnh.", priceUsdc: "18.00", isActive: true },
      { id: "demo-5-l5", name: "Bún bò Huế đặc biệt (1 tô)", description: "Giò heo, chả cua, sả ớt cay nồng đúng vị Huế.", priceUsdc: "8.00", isActive: true },
      { id: "demo-5-l6", name: "Phở cuốn tôm thịt (10 cuốn)", description: "Bánh tráng phở mềm, tôm thịt tươi, kèm nước chấm chua ngọt.", priceUsdc: "9.50", isActive: true },
      { id: "demo-5-l7", name: "Bánh mì phở tái", description: "Bánh mì giòn kẹp thịt bò tái, hành ngò, tương ớt.", priceUsdc: "4.50", isActive: true },
      { id: "demo-5-l8", name: "Chả giò rế (10 cái)", description: "Nhân tôm thịt, cuốn bánh tráng rế, chiên giòn rụm.", priceUsdc: "6.00", isActive: true },
      { id: "demo-5-l9", name: "Combo gia đình 4 tô phở", description: "4 tô phở đặc biệt + nước chấm, tiết kiệm 15%.", priceUsdc: "30.00", isActive: true },
      { id: "demo-5-l10", name: "Trà đá chanh sả (1 bình 1L)", description: "Giải khát, thảo mộc tự nhiên, không đường hoá học.", priceUsdc: "3.00", isActive: true },
    ],
    orders: [
      { id: "demo-5-o1", orderCode: "PGT-001", productName: "Phở bò tái chín đặc biệt", priceUsdc: "8.50", warrantyDays: 0, status: "released", createdAt: "2024-05-01T07:00:00Z", review: { rating: 5, comment: "Ngon nhất Hà Nội! Nước dùng đậm vị, thịt mềm. Giao đúng 25 phút.", commentEn: "Best pho in Hanoi! Rich broth, tender meat. Delivered in exactly 25 minutes.", buyerWallet: "0xab12...3456", createdAt: "2024-05-01T10:00:00Z" } },
      { id: "demo-5-o2", orderCode: "PGT-002", productName: "Combo phở 2 tô + 2 quẩy", priceUsdc: "15.00", warrantyDays: 0, status: "released", createdAt: "2024-05-10T07:30:00Z", review: { rating: 5, comment: "Quẩy giòn, phở ngon. Giao nhanh, bao bì giữ nóng tốt. Sẽ order thêm.", commentEn: "Crispy dough sticks, great pho. Fast delivery, packaging kept food hot. Will reorder.", buyerWallet: "0xbc23...4567", createdAt: "2024-05-10T10:00:00Z" } },
      { id: "demo-5-o3", orderCode: "PGT-003", productName: "Phở gà ta đồng quê", priceUsdc: "7.50", warrantyDays: 0, status: "released", createdAt: "2024-05-18T08:00:00Z", review: { rating: 5, comment: "Phở gà ngọt nước, thịt gà dai vừa. Ăn sáng tuyệt vời!", commentEn: "Naturally sweet chicken broth, perfectly chewy chicken. A wonderful breakfast!", buyerWallet: "0xcd34...5678", createdAt: "2024-05-18T11:00:00Z" } },
      { id: "demo-5-o4", orderCode: "PGT-004", productName: "Set nước dùng phở đông lạnh 2L", priceUsdc: "18.00", warrantyDays: 0, status: "released", createdAt: "2024-06-01T09:00:00Z", review: { rating: 5, comment: "Mua về nấu ở nhà, ngon y như ngoài quán. Tiện lắm, mua thêm mấy hộp nữa.", commentEn: "Cooked it at home — tasted just like at the restaurant. Very convenient, ordering more boxes.", buyerWallet: "0xde45...6789", createdAt: "2024-06-08T10:00:00Z" } },
    ],
  },

  "demo-6": {
    shop: {
      id: "demo-6", name: "Cà Phê Rang Thủ Công", category: "Đồ ăn & Thức uống",
      description: "Specialty coffee rang mộc, nguồn gốc Đà Lạt & Buôn Ma Thuột. Rang theo đơn, giao trong 48h sau khi rang. Chứng nhận Rainforest Alliance.",
      gmail: "capherangthucong@gmail.com",
      returnPolicy: "Hoàn tiền nếu cà phê không đúng độ rang hoặc hư hỏng khi vận chuyển.",
      status: "verified", avgRating: 4.8, totalOrders: 156, totalRevenue: "$4,680", createdAt: "2024-02-15T00:00:00Z",
    },
    listings: [
      { id: "demo-6-l1", name: "Robusta Buôn Ma Thuột 500g", description: "Rang medium-dark, hậu vị đắng ngọt cân bằng. Phù hợp pha phin hoặc espresso.", priceUsdc: "22.00", isActive: true },
      { id: "demo-6-l2", name: "Arabica Cầu Đất Đà Lạt 250g", description: "Rang light, hương hoa quả tự nhiên, độ chua dễ chịu. Pha pour over hoặc cold brew.", priceUsdc: "28.00", isActive: true },
      { id: "demo-6-l3", name: "Blend House Special 500g", description: "Blend độc quyền 70% Robusta + 30% Arabica. Crema dày, hương caramel, vị cân bằng.", priceUsdc: "25.00", isActive: true },
      { id: "demo-6-l4", name: "Combo Thử Nghiệm 3 loại x 100g", description: "Trải nghiệm 3 dòng: Robusta, Arabica, Blend. Kèm hướng dẫn pha chế.", priceUsdc: "30.00", isActive: true },
      { id: "demo-6-l5", name: "Cold brew đóng chai 500ml", description: "Ủ lạnh 18 giờ, vị đậm êm, không cần pha.", priceUsdc: "6.50", isActive: true },
      { id: "demo-6-l6", name: "Trà Ô Long rang tay 200g", description: "Lá trà nguyên vẹn, hương rang nhẹ, ít chát.", priceUsdc: "15.00", isActive: true },
      { id: "demo-6-l7", name: "Bộ dụng cụ pha phin nhôm", description: "Phin nhôm nguyên khối, đi kèm ly thủy tinh.", priceUsdc: "12.00", isActive: true },
      { id: "demo-6-l8", name: "Cacao nguyên chất Đắk Lắk 300g", description: "Rang xay thủ công, không đường, đậm vị.", priceUsdc: "16.00", isActive: true },
      { id: "demo-6-l9", name: "Set quà tặng cà phê cao cấp", description: "2 túi 250g + phin + ly, hộp quà sang trọng.", priceUsdc: "45.00", isActive: true },
      { id: "demo-6-l10", name: "Cà phê sữa đá đóng lon (24 lon)", description: "Pha sẵn tiện lợi, vị truyền thống miền Nam.", priceUsdc: "20.00", isActive: true },
    ],
    orders: [
      { id: "demo-6-o1", orderCode: "CPTC-001", productName: "Robusta Buôn Ma Thuột 500g", priceUsdc: "22.00", warrantyDays: 30, status: "released", createdAt: "2024-05-05T08:00:00Z", review: { rating: 5, comment: "Cà phê rang tươi, thơm lắm. Pha phin ra đúng vị Buôn Ma Thuột xưa.", commentEn: "Freshly roasted, incredibly fragrant. Perfect authentic Buon Ma Thuot phin taste.", buyerWallet: "0xef56...789a", createdAt: "2024-05-12T09:00:00Z" } },
      { id: "demo-6-o2", orderCode: "CPTC-002", productName: "Arabica Cầu Đất Đà Lạt 250g", priceUsdc: "28.00", warrantyDays: 30, status: "released", createdAt: "2024-05-15T09:00:00Z", review: { rating: 5, comment: "Hương fruity rõ ràng, pha cold brew 12h ngon tuyệt. Sẽ order định kỳ.", commentEn: "Clear fruity notes, 12-hour cold brew is outstanding. Will order regularly.", buyerWallet: "0xf067...89ab", createdAt: "2024-05-22T10:00:00Z" } },
      { id: "demo-6-o3", orderCode: "CPTC-003", productName: "Blend House Special 500g", priceUsdc: "25.00", warrantyDays: 30, status: "released", createdAt: "2024-05-28T09:00:00Z", review: { rating: 4, comment: "Crema đẹp, vị cân bằng. Hơi nhẹ hơn mình muốn nhưng vẫn rất ngon.", commentEn: "Beautiful crema, balanced flavor. Slightly lighter than I prefer but still very good.", buyerWallet: "0x0178...9abc", createdAt: "2024-06-04T10:00:00Z" } },
      { id: "demo-6-o4", orderCode: "CPTC-004", productName: "Combo Thử Nghiệm 3 loại x 100g", priceUsdc: "30.00", warrantyDays: 30, status: "released", createdAt: "2024-06-10T09:00:00Z", review: { rating: 5, comment: "Combo này rất hay để chọn loại yêu thích. Cả 3 đều ngon, mình thích Arabica nhất.", commentEn: "Great kit to find your favorite. All three are great — Arabica is my top pick.", buyerWallet: "0x1289...abcd", createdAt: "2024-06-17T10:00:00Z" } },
    ],
  },

  "demo-19": {
    shop: {
      id: "demo-19", name: "Bánh Ngọt Handmade Sài Gòn", category: "Đồ ăn & Thức uống",
      description: "Bánh kem, bánh ngọt handmade theo đơn, nguyên liệu nhập khẩu, không chất bảo quản. Nhận đặt bánh sinh nhật, sự kiện.",
      gmail: "banhngothandmade@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Hoàn tiền nếu bánh giao không đúng mẫu đặt hoặc hư hỏng trong vận chuyển.",
      status: "verified", avgRating: 4.8, totalOrders: 219, totalRevenue: "$6,570", createdAt: "2024-01-25T00:00:00Z",
    },
    listings: [
      { id: "demo-19-l1", name: "Bánh kem socola tan chảy (18cm)", description: "Socola Bỉ nguyên chất, nhân kem tươi, không quá ngọt.", priceUsdc: "22.00", isActive: true },
      { id: "demo-19-l2", name: "Bánh su kem trứng muối (hộp 6 cái)", description: "Vỏ giòn xốp, nhân kem custard trứng muối béo ngậy.", priceUsdc: "9.00", isActive: true },
      { id: "demo-19-l3", name: "Bánh mousse xoài nhiệt đới (15cm)", description: "Xoài Cát Chu tươi, lớp mousse mịn nhẹ, thạch xoài phủ mặt.", priceUsdc: "18.00", isActive: true },
      { id: "demo-19-l4", name: "Bánh tiramisu Ý truyền thống (4 phần)", description: "Cà phê espresso đậm, phô mai mascarpone nhập Ý.", priceUsdc: "16.00", isActive: true },
      { id: "demo-19-l5", name: "Bánh quy bơ Đan Mạch (hộp 20 cái)", description: "Bơ Anchor, giòn tan, gói hộp thiếc sang trọng.", priceUsdc: "14.00", isActive: true },
      { id: "demo-19-l6", name: "Bánh mousse socola đen 70%", description: "Vị đắng nhẹ tinh tế, phù hợp người ăn kiêng đường.", priceUsdc: "19.00", isActive: true },
      { id: "demo-19-l7", name: "Bánh red velvet cream cheese (15cm)", description: "Màu đỏ tự nhiên từ củ dền, kem phô mai béo mịn.", priceUsdc: "20.00", isActive: true },
      { id: "demo-19-l8", name: "Set cupcake trang trí theo chủ đề (6 cái)", description: "Trang trí theo yêu cầu: sinh nhật, năm mới, tình yêu.", priceUsdc: "15.00", isActive: true },
      { id: "demo-19-l9", name: "Bánh trung thu handmade nhân đậu xanh", description: "Vỏ mềm dẻo, không dùng chất bảo quản, hộp quà sang.", priceUsdc: "12.00", isActive: true },
      { id: "demo-19-l10", name: "Bánh bông lan cuộn trà xanh matcha", description: "Matcha Nhật nguyên chất, nhân kem tươi nhẹ béo.", priceUsdc: "13.00", isActive: true },
    ],
    orders: [
      { id: "demo-19-o1", orderCode: "BNS-001", productName: "Bánh kem socola tan chảy", priceUsdc: "22.00", warrantyDays: 0, status: "released", createdAt: "2024-05-14T08:00:00Z", review: { rating: 5, comment: "Bánh tươi ngon, socola đậm vị, giao đúng giờ sinh nhật.", commentEn: "Fresh and delicious, rich chocolate, delivered right on the birthday.", buyerWallet: "0x4a5b...6c7d", createdAt: "2024-05-14T14:00:00Z" } },
      { id: "demo-19-o2", orderCode: "BNS-002", productName: "Bánh mousse xoài nhiệt đới", priceUsdc: "18.00", warrantyDays: 0, status: "released", createdAt: "2024-05-21T08:00:00Z", review: { rating: 5, comment: "Vị xoài tự nhiên, mousse tan trong miệng. Đóng gói giữ lạnh tốt.", commentEn: "Natural mango flavor, mousse melts in your mouth. Kept cold well during delivery.", buyerWallet: "0x5b6c...7d8e", createdAt: "2024-05-21T13:00:00Z" } },
      { id: "demo-19-o3", orderCode: "BNS-003", productName: "Bánh tiramisu Ý truyền thống", priceUsdc: "16.00", warrantyDays: 0, status: "released", createdAt: "2024-05-29T08:00:00Z", review: { rating: 5, comment: "Cà phê đậm đúng chuẩn Ý, không quá ngọt. Ngon nhất từng ăn.", commentEn: "Authentic strong Italian coffee flavor, not too sweet. Best I've had.", buyerWallet: "0x6c7d...8e9f", createdAt: "2024-05-29T13:00:00Z" } },
    ],
  },

  "demo-20": {
    shop: {
      id: "demo-20", name: "Trà Sữa & Nước Ép Tươi", category: "Đồ ăn & Thức uống",
      description: "Trà sữa pha máy, nước ép trái cây tươi 100%, không đường hóa học. Nguyên liệu nhập mỗi ngày, giao trong 30 phút.",
      gmail: "trasuanuocep@gmail.com",
      returnPolicy: "Đổi món miễn phí nếu giao sai hoặc đồ uống bị đổ, tràn khi vận chuyển.",
      status: "verified", avgRating: 4.6, totalOrders: 268, totalRevenue: "$2,680", createdAt: "2024-03-05T00:00:00Z",
    },
    listings: [
      { id: "demo-20-l1", name: "Trà sữa trân châu đường đen (size L)", description: "Trân châu nấu tay mỗi giờ, trà Đài Loan nguyên bản.", priceUsdc: "3.50", isActive: true },
      { id: "demo-20-l2", name: "Nước ép cam vàng nguyên chất (500ml)", description: "Cam ép tươi 100%, không thêm đường, không chất bảo quản.", priceUsdc: "4.00", isActive: true },
      { id: "demo-20-l3", name: "Sinh tố bơ sáp Đắk Lắk", description: "Bơ sáp béo ngậy, sữa tươi không đường, đá xay mịn.", priceUsdc: "4.50", isActive: true },
      { id: "demo-20-l4", name: "Trà đào cam sả detox", description: "Đào miếng, cam tươi, sả thơm, giải nhiệt thanh lọc cơ thể.", priceUsdc: "4.00", isActive: true },
      { id: "demo-20-l5", name: "Matcha latte đá xay", description: "Matcha Uji Nhật Bản nguyên chất, sữa tươi béo mịn.", priceUsdc: "4.50", isActive: true },
      { id: "demo-20-l6", name: "Nước ép cần tây táo xanh", description: "Detox thanh lọc, ép lạnh giữ dưỡng chất, không lọc bã.", priceUsdc: "5.00", isActive: true },
      { id: "demo-20-l7", name: "Combo 5 ly trà sữa (mua nhóm)", description: "Tiết kiệm 20% so với mua lẻ, đa dạng vị chọn.", priceUsdc: "15.00", isActive: true },
      { id: "demo-20-l8", name: "Trà chanh dây mật ong", description: "Chanh dây tươi, mật ong nguyên chất, vị chua ngọt cân bằng.", priceUsdc: "3.50", isActive: true },
      { id: "demo-20-l9", name: "Sữa chua uống việt quất", description: "Sữa chua lên men tự nhiên, việt quất tươi xay nhuyễn.", priceUsdc: "4.00", isActive: true },
      { id: "demo-20-l10", name: "Set nguyên liệu pha trà sữa tại nhà", description: "Trà túi lọc, bột sữa, trân châu khô — đủ pha 10 ly.", priceUsdc: "12.00", isActive: true },
    ],
    orders: [
      { id: "demo-20-o1", orderCode: "TSN-001", productName: "Trà sữa trân châu đường đen", priceUsdc: "3.50", warrantyDays: 0, status: "released", createdAt: "2024-05-16T08:00:00Z", review: { rating: 5, comment: "Trân châu dai ngon, trà thơm đậm. Giao nhanh còn nóng ấm trân châu.", commentEn: "Chewy tapioca pearls, rich tea aroma. Delivered fast with warm pearls.", buyerWallet: "0x7d8e...9f0a", createdAt: "2024-05-16T11:00:00Z" } },
      { id: "demo-20-o2", orderCode: "TSN-002", productName: "Nước ép cam vàng nguyên chất", priceUsdc: "4.00", warrantyDays: 0, status: "released", createdAt: "2024-05-23T08:00:00Z", review: { rating: 5, comment: "Cam tươi ngọt tự nhiên, không pha loãng. Uống sáng mỗi ngày.", commentEn: "Naturally sweet, not watered down. My daily morning drink now.", buyerWallet: "0x8e9f...0a1b", createdAt: "2024-05-23T09:00:00Z" } },
      { id: "demo-20-o3", orderCode: "TSN-003", productName: "Sinh tố bơ sáp Đắk Lắk", priceUsdc: "4.50", warrantyDays: 0, status: "released", createdAt: "2024-05-30T08:00:00Z", review: { rating: 4, comment: "Bơ béo ngon, sánh mịn. Giá hơi nhỉnh nhưng chất lượng xứng đáng.", commentEn: "Rich creamy avocado. A bit pricey but worth the quality.", buyerWallet: "0x9f0a...1b2c", createdAt: "2024-05-30T10:00:00Z" } },
    ],
  },

  // ── Làm đẹp ────────────────────────────────────────────────────────────────
  "demo-7": {
    shop: {
      id: "demo-7", name: "Mỹ Phẩm Authentic", category: "Làm đẹp",
      description: "Mỹ phẩm xách tay Hàn, Nhật, Mỹ — cam kết hàng auth 100%. Có tem chống hàng giả, bill mua hàng gốc đầy đủ.",
      gmail: "myphamauth@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Hoàn tiền 100% nếu phát hiện hàng không auth. Không đổi trả sản phẩm đã mở seal.",
      status: "verified", avgRating: 4.7, totalOrders: 94, totalRevenue: "$8,460", createdAt: "2024-01-20T00:00:00Z",
    },
    listings: [
      { id: "demo-7-l1", name: "Laneige Lip Sleeping Mask Berry", description: "Mặt nạ môi ngủ Hàn Quốc bestseller, dưỡng ẩm qua đêm. 20g.", priceUsdc: "25.00", isActive: true },
      { id: "demo-7-l2", name: "Some By Mi AHA BHA PHA 30 Days Miracle Toner", description: "Toner trị mụn nổi tiếng, BHA giúp thông lỗ chân lông, AHA tẩy da chết nhẹ nhàng. 150ml.", priceUsdc: "22.00", isActive: true },
      { id: "demo-7-l3", name: "Hada Labo Gokujyun Hyaluronic Lotion", description: "Lotion dưỡng ẩm Nhật Bản, chứa 5 loại HA. Da căng bóng sau 2 tuần. 170ml.", priceUsdc: "18.00", isActive: true },
      { id: "demo-7-l4", name: "Sulwhasoo Concentrated Ginseng Cream", description: "Kem dưỡng nhân sâm cao cấp Hàn Quốc, chống lão hóa, dưỡng trắng. 30ml.", priceUsdc: "89.00", isActive: true },
      { id: "demo-7-l5", name: "COSRX Snail Mucin 96% Essence", description: "Phục hồi da, dưỡng ẩm sâu, giảm thâm mụn. 100ml.", priceUsdc: "24.00", isActive: true },
      { id: "demo-7-l6", name: "Innisfree Green Tea Seed Serum", description: "Cấp ẩm tức thì, kiềm dầu nhẹ, chiết xuất trà xanh Jeju. 80ml.", priceUsdc: "26.00", isActive: true },
      { id: "demo-7-l7", name: "3CE Velvet Lip Tint", description: "Lì mịn, lên màu chuẩn, không khô môi.", priceUsdc: "19.00", isActive: true },
      { id: "demo-7-l8", name: "Etude House Soon Jung pH Toner", description: "Dịu nhẹ cho da nhạy cảm, không cồn không hương liệu. 200ml.", priceUsdc: "17.00", isActive: true },
      { id: "demo-7-l9", name: "Missha Time Revolution Ampoule", description: "Chống lão hóa, tái tạo da, chiết xuất men gạo lên men. 50ml.", priceUsdc: "32.00", isActive: true },
      { id: "demo-7-l10", name: "Set cọ trang điểm 12 món", description: "Lông cọ mềm mịn, cán gỗ, kèm túi đựng.", priceUsdc: "22.00", isActive: true },
    ],
    orders: [
      { id: "demo-7-o1", orderCode: "MPA-001", productName: "Laneige Lip Sleeping Mask Berry", priceUsdc: "25.00", warrantyDays: 0, status: "released", createdAt: "2024-05-08T09:00:00Z", review: { rating: 5, comment: "Hàng auth 100%, có tem chống giả. Môi mềm mịn sau 1 tuần dùng.", commentEn: "100% authentic with anti-counterfeit seal. Lips noticeably softer after 1 week.", buyerWallet: "0x2390...bcde", createdAt: "2024-05-15T10:00:00Z" } },
      { id: "demo-7-o2", orderCode: "MPA-002", productName: "Some By Mi AHA BHA PHA Toner", priceUsdc: "22.00", warrantyDays: 0, status: "released", createdAt: "2024-05-18T09:00:00Z", review: { rating: 5, comment: "Dùng 2 tuần mụn đầu đen giảm rõ rệt. Hàng xịn, giá tốt.", commentEn: "Blackheads visibly reduced after 2 weeks. Genuine product, great price.", buyerWallet: "0x34ab...cdef", createdAt: "2024-05-25T11:00:00Z" } },
      { id: "demo-7-o3", orderCode: "MPA-003", productName: "Hada Labo Gokujyun Hyaluronic Lotion", priceUsdc: "18.00", warrantyDays: 0, status: "released", createdAt: "2024-06-01T10:00:00Z", review: { rating: 5, comment: "Da căng ẩm sau 3 ngày dùng. Sẽ mua thêm!", commentEn: "Skin felt plump and hydrated after just 3 days. Definitely buying more!", buyerWallet: "0x45bc...def0", createdAt: "2024-06-08T11:00:00Z" } },
      { id: "demo-7-o4", orderCode: "MPA-004", productName: "Sulwhasoo Concentrated Ginseng Cream", priceUsdc: "89.00", warrantyDays: 0, status: "released", createdAt: "2024-06-12T09:00:00Z", review: { rating: 4, comment: "Kem dưỡng tốt, da mềm mịn. Giá hơi cao nhưng chất lượng xứng đáng.", commentEn: "Good moisturizer, skin feels soft. On the pricey side but quality is worth it.", buyerWallet: "0x56cd...ef01", createdAt: "2024-06-19T10:00:00Z" } },
    ],
  },

  "demo-8": {
    shop: {
      id: "demo-8", name: "Skincare By Linh", category: "Làm đẹp",
      description: "Skincare thuần chay (vegan), không paraben, không cồn, không hương liệu nhân tạo. Phù hợp da nhạy cảm và da mụn.",
      gmail: "skincarebylinh@gmail.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu sản phẩm gây kích ứng. Cần ảnh minh chứng.",
      status: "verified", avgRating: 4.5, totalOrders: 48, totalRevenue: "$2,400", createdAt: "2024-04-01T00:00:00Z",
    },
    listings: [
      { id: "demo-8-l1", name: "Sữa rửa mặt centella tạo bọt", description: "pH 5.5, có chiết xuất rau má soothing, không SLS. Phù hợp da nhạy cảm. 150ml.", priceUsdc: "19.00", isActive: true },
      { id: "demo-8-l2", name: "Serum niacinamide 10% + zinc 1%", description: "Kiểm soát dầu, thu nhỏ lỗ chân lông, làm mờ vết thâm. 30ml.", priceUsdc: "24.00", isActive: true },
      { id: "demo-8-l3", name: "Kem chống nắng SPF50+ PA++++", description: "Finish matte, không bóng nhờn, không để lại vệt trắng. Phù hợp da dầu mụn. 50ml.", priceUsdc: "28.00", isActive: true },
      { id: "demo-8-l4", name: "Mặt nạ ngủ phục hồi da", description: "Chứa ceramide, peptide, dưỡng ẩm sâu qua đêm. Không mùi, không kích ứng. 60ml.", priceUsdc: "32.00", isActive: true },
      { id: "demo-8-l5", name: "Toner cân bằng da BHA 2%", description: "Không cồn, giảm mụn ẩn, làm dịu da nhạy cảm. 150ml.", priceUsdc: "17.00", isActive: true },
      { id: "demo-8-l6", name: "Kem dưỡng ẩm ceramide phục hồi da", description: "Kết cấu gel nhẹ, thấm nhanh, không nhờn rít. 50ml.", priceUsdc: "22.00", isActive: true },
      { id: "demo-8-l7", name: "Xịt khoáng trà xanh cấp ẩm tức thì", description: "Dạng phun sương mịn, dùng được cả ngày. 100ml.", priceUsdc: "12.00", isActive: true },
      { id: "demo-8-l8", name: "Mặt nạ giấy rau má làm dịu (hộp 10 miếng)", description: "Chiết xuất centella, dịu da kích ứng, phù hợp da mụn.", priceUsdc: "15.00", isActive: true },
      { id: "demo-8-l9", name: "Tẩy tế bào chết AHA 5% dạng nước", description: "Loại bỏ da chết nhẹ nhàng, không gây khô căng. 120ml.", priceUsdc: "19.00", isActive: true },
      { id: "demo-8-l10", name: "Dầu tẩy trang thuần chay", description: "Chiết xuất hoa hướng dương, làm sạch sâu không gây bít tắc. 150ml.", priceUsdc: "16.00", isActive: true },
    ],
    orders: [
      { id: "demo-8-o1", orderCode: "SBL-001", productName: "Sữa rửa mặt centella tạo bọt", priceUsdc: "19.00", warrantyDays: 0, status: "released", createdAt: "2024-05-10T09:00:00Z", review: { rating: 5, comment: "Da không bị khô sau khi rửa mặt. Sản phẩm thuần chay thật sự hiệu quả.", commentEn: "Skin doesn't feel dry after cleansing. This vegan formula is genuinely effective.", buyerWallet: "0x67de...f012", createdAt: "2024-05-17T10:00:00Z" } },
      { id: "demo-8-o2", orderCode: "SBL-002", productName: "Serum niacinamide 10% + zinc 1%", priceUsdc: "24.00", warrantyDays: 0, status: "released", createdAt: "2024-05-22T10:00:00Z", review: { rating: 4, comment: "Lỗ chân lông nhỏ hơn sau 3 tuần. Hơi rát nhẹ ban đầu nhưng quen rồi ổn.", commentEn: "Pores visibly smaller after 3 weeks. Slight tingle at first but normalizes quickly.", buyerWallet: "0x78ef...0123", createdAt: "2024-05-29T11:00:00Z" } },
      { id: "demo-8-o3", orderCode: "SBL-003", productName: "Kem chống nắng SPF50+ PA++++", priceUsdc: "28.00", warrantyDays: 0, status: "released", createdAt: "2024-06-05T09:00:00Z", review: { rating: 5, comment: "Không nhờn, không bóng. Da mụn mà dùng được chống nắng thoải mái.", commentEn: "Non-greasy, no shine. Works comfortably even on oily, acne-prone skin.", buyerWallet: "0x89f0...1234", createdAt: "2024-06-12T10:00:00Z" } },
      { id: "demo-8-o4", orderCode: "SBL-004", productName: "Mặt nạ ngủ phục hồi da", priceUsdc: "32.00", warrantyDays: 0, status: "released", createdAt: "2024-06-15T09:00:00Z", review: { rating: 5, comment: "Dùng 1 tuần da mềm hơn hẳn. Không mùi, không gây mụn. Rất thích!", commentEn: "Skin noticeably softer after 1 week. No fragrance, no breakouts. Love it!", buyerWallet: "0x9a01...2345", createdAt: "2024-06-22T10:00:00Z" } },
    ],
  },

  "demo-21": {
    shop: {
      id: "demo-21", name: "Nước Hoa Chiết Authentic", category: "Làm đẹp",
      description: "Nước hoa chính hãng chiết mini và fullsize từ các thương hiệu quốc tế. Cam kết auth 100%, có tem kiểm định.",
      gmail: "nuochoachietauth@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Hoàn tiền nếu phát hiện hàng không auth qua kiểm định 3rd-party.",
      status: "verified", avgRating: 4.7, totalOrders: 118, totalRevenue: "$7,080", createdAt: "2024-02-25T00:00:00Z",
    },
    listings: [
      { id: "demo-21-l1", name: "Chiết Dior Sauvage EDT 10ml", description: "Hương gỗ cay nồng nam tính, lưu hương 6-8 tiếng.", priceUsdc: "18.00", isActive: true },
      { id: "demo-21-l2", name: "Chiết Chanel Coco Mademoiselle 10ml", description: "Hương hoa phương Đông sang trọng, phù hợp đi làm.", priceUsdc: "22.00", isActive: true },
      { id: "demo-21-l3", name: "Fullsize YSL Black Opium EDP 50ml", description: "Hương cà phê vani quyến rũ, hộp seal chính hãng.", priceUsdc: "89.00", isActive: true },
      { id: "demo-21-l4", name: "Chiết Bleu de Chanel EDP 10ml", description: "Hương cam quýt gỗ trầm lịch lãm, dùng ban ngày.", priceUsdc: "20.00", isActive: true },
      { id: "demo-21-l5", name: "Chiết Jo Malone Wood Sage & Sea Salt 10ml", description: "Hương gỗ biển tươi mát, unisex nhẹ nhàng.", priceUsdc: "24.00", isActive: true },
      { id: "demo-21-l6", name: "Fullsize Versace Eros EDT 100ml", description: "Hương bạc hà táo xanh mạnh mẽ, lưu hương 8 tiếng.", priceUsdc: "65.00", isActive: true },
      { id: "demo-21-l7", name: "Set 5 chai chiết nước hoa nam bestseller", description: "Trải nghiệm 5 mùi hot nhất, mỗi chai 5ml.", priceUsdc: "35.00", isActive: true },
      { id: "demo-21-l8", name: "Chiết Gucci Bloom EDP 10ml", description: "Hương hoa nhài trắng tinh khôi, nữ tính dịu dàng.", priceUsdc: "19.00", isActive: true },
      { id: "demo-21-l9", name: "Sáp thơm để xe/phòng mini", description: "Hương tương tự các dòng nước hoa hot, thơm 30 ngày.", priceUsdc: "8.00", isActive: true },
      { id: "demo-21-l10", name: "Set 5 chai chiết nước hoa nữ bestseller", description: "5 mùi nữ được yêu thích nhất, mỗi chai 5ml.", priceUsdc: "35.00", isActive: true },
    ],
    orders: [
      { id: "demo-21-o1", orderCode: "NHC-001", productName: "Chiết Dior Sauvage EDT 10ml", priceUsdc: "18.00", warrantyDays: 0, status: "released", createdAt: "2024-05-18T08:00:00Z", review: { rating: 5, comment: "Mùi auth 100%, lưu hương lâu như bản fullsize.", commentEn: "100% authentic scent, lasts as long as the full-size bottle.", buyerWallet: "0xa1b2...c3d4", createdAt: "2024-05-25T09:00:00Z" } },
      { id: "demo-21-o2", orderCode: "NHC-002", productName: "Fullsize YSL Black Opium EDP 50ml", priceUsdc: "89.00", warrantyDays: 0, status: "released", createdAt: "2024-05-24T08:00:00Z", review: { rating: 5, comment: "Có tem kiểm định rõ ràng, mùi cà phê vani mê hoặc.", commentEn: "Clear authentication seal, the coffee-vanilla scent is captivating.", buyerWallet: "0xb2c3...d4e5", createdAt: "2024-05-31T09:00:00Z" } },
      { id: "demo-21-o3", orderCode: "NHC-003", productName: "Set 5 chai chiết nước hoa nữ bestseller", priceUsdc: "35.00", warrantyDays: 0, status: "released", createdAt: "2024-06-02T08:00:00Z", review: { rating: 4, comment: "Giá tốt để thử nhiều mùi trước khi mua fullsize.", commentEn: "Great value to try several scents before buying full size.", buyerWallet: "0xc3d4...e5f6", createdAt: "2024-06-09T09:00:00Z" } },
    ],
  },

  "demo-22": {
    shop: {
      id: "demo-22", name: "Chăm Sóc Tóc & Cơ Thể", category: "Làm đẹp",
      description: "Sản phẩm chăm sóc tóc và cơ thể thuần chay, chiết xuất thiên nhiên. Không silicone, không sulfate, an toàn cho da đầu nhạy cảm.",
      gmail: "chamsoctoccothe@gmail.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu gây kích ứng, kèm ảnh minh chứng.",
      status: "verified", avgRating: 4.6, totalOrders: 85, totalRevenue: "$3,825", createdAt: "2024-04-15T00:00:00Z",
    },
    listings: [
      { id: "demo-22-l1", name: "Dầu gội bưởi kích thích mọc tóc 300ml", description: "Chiết xuất tinh dầu bưởi, giảm gãy rụng, sạch gàu.", priceUsdc: "14.00", isActive: true },
      { id: "demo-22-l2", name: "Dầu xả phục hồi tóc hư tổn 300ml", description: "Chứa keratin thực vật, mềm mượt sau 1 lần dùng.", priceUsdc: "15.00", isActive: true },
      { id: "demo-22-l3", name: "Serum dưỡng tóc phục hồi ngọn chẻ 50ml", description: "Tinh dầu argan, phục hồi tóc khô xơ, không bết dính.", priceUsdc: "18.00", isActive: true },
      { id: "demo-22-l4", name: "Sữa tắm hoa hồng dưỡng ẩm 400ml", description: "Chiết xuất hoa hồng, làm mềm da, hương thơm dịu nhẹ.", priceUsdc: "12.00", isActive: true },
      { id: "demo-22-l5", name: "Tẩy tế bào chết body cà phê 250g", description: "Cà phê nguyên chất, giảm sần da gà, thải độc da.", priceUsdc: "11.00", isActive: true },
      { id: "demo-22-l6", name: "Kem dưỡng thể bơ hạt mỡ shea 300ml", description: "Cấp ẩm sâu 48 giờ, không nhờn rít, mùi thơm nhẹ.", priceUsdc: "16.00", isActive: true },
      { id: "demo-22-l7", name: "Xịt dưỡng tóc chống nắng & xoăn 150ml", description: "Bảo vệ tóc khỏi tia UV, chống xù, tạo kiểu dễ hơn.", priceUsdc: "13.00", isActive: true },
      { id: "demo-22-l8", name: "Mặt nạ tóc ủ nhiệt 30 phút 250ml", description: "Phục hồi sâu tóc hư tổn nặng, chứa dầu dừa hữu cơ.", priceUsdc: "19.00", isActive: true },
      { id: "demo-22-l9", name: "Bộ dụng cụ tạo kiểu tóc mini", description: "Lược, kẹp, dây buộc thân thiện tóc, không gây gãy rụng.", priceUsdc: "9.00", isActive: true },
      { id: "demo-22-l10", name: "Set dầu gội xả du lịch mini (100ml x2)", description: "Tiện mang theo, đủ dùng cho chuyến đi 1 tuần.", priceUsdc: "8.00", isActive: true },
    ],
    orders: [
      { id: "demo-22-o1", orderCode: "CST2-001", productName: "Dầu gội bưởi kích thích mọc tóc 300ml", priceUsdc: "14.00", warrantyDays: 0, status: "released", createdAt: "2024-05-19T08:00:00Z", review: { rating: 5, comment: "Dùng 1 tháng tóc rụng ít hẳn, mùi bưởi dễ chịu.", commentEn: "Hair fall noticeably reduced after a month, pleasant pomelo scent.", buyerWallet: "0xd4e5...f607", createdAt: "2024-05-26T09:00:00Z" } },
      { id: "demo-22-o2", orderCode: "CST2-002", productName: "Kem dưỡng thể bơ hạt mỡ shea 300ml", priceUsdc: "16.00", warrantyDays: 0, status: "released", createdAt: "2024-05-27T08:00:00Z", review: { rating: 5, comment: "Da mềm mịn cả ngày, không nhờn dính khó chịu.", commentEn: "Skin stays soft all day, not greasy or sticky.", buyerWallet: "0xe5f6...0718", createdAt: "2024-06-03T09:00:00Z" } },
      { id: "demo-22-o3", orderCode: "CST2-003", productName: "Serum dưỡng tóc phục hồi ngọn chẻ 50ml", priceUsdc: "18.00", warrantyDays: 0, status: "released", createdAt: "2024-06-01T08:00:00Z", review: { rating: 4, comment: "Tóc mượt hơn rõ rệt. Cần dùng đều mới thấy hiệu quả rõ.", commentEn: "Hair noticeably smoother. Needs consistent use to see full results.", buyerWallet: "0xf607...1829", createdAt: "2024-06-08T09:00:00Z" } },
    ],
  },

  // ── Sách ───────────────────────────────────────────────────────────────────
  "demo-9": {
    shop: {
      id: "demo-9", name: "Sách Hay Mỗi Ngày", category: "Sách",
      description: "Nhà sách online — văn học, kỹ năng, kinh tế, thiếu nhi. Sách mới 100%, bảo quản nguyên seal. Bọc bìa miễn phí.",
      gmail: "sachhaymoinday@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi trả trong 3 ngày nếu sách lỗi in hoặc rách gáy.",
      status: "verified", avgRating: 4.9, totalOrders: 213, totalRevenue: "$6,390", createdAt: "2024-01-10T00:00:00Z",
    },
    listings: [
      { id: "demo-9-l1", name: "Atomic Habits — James Clear (bản dịch)", description: "Thói quen nguyên tử — sách self-help bán chạy nhất thế giới. Bìa cứng.", priceUsdc: "15.00", isActive: true },
      { id: "demo-9-l2", name: "Sapiens: Lược sử loài người", description: "Yuval Noah Harari. Góc nhìn toàn diện về lịch sử và tương lai nhân loại.", priceUsdc: "18.00", isActive: true },
      { id: "demo-9-l3", name: "Đắc Nhân Tâm — Dale Carnegie", description: "Sách kỹ năng giao tiếp kinh điển, bán chạy 80 năm liên tục.", priceUsdc: "12.00", isActive: true },
      { id: "demo-9-l4", name: "Combo 5 sách kinh tế tài chính cá nhân", description: "Rich Dad Poor Dad, Psychology of Money, The Millionaire Fastlane + 2 cuốn bonus.", priceUsdc: "55.00", isActive: true },
      { id: "demo-9-l5", name: "Nhà Giả Kim — Paulo Coelho", description: "Tiểu thuyết kinh điển về hành trình theo đuổi ước mơ. Bìa mềm.", priceUsdc: "9.00", isActive: true },
      { id: "demo-9-l6", name: "Tư Duy Nhanh Và Chậm — Daniel Kahneman", description: "Sách tâm lý học hành vi bán chạy toàn cầu. Bìa cứng.", priceUsdc: "17.00", isActive: true },
      { id: "demo-9-l7", name: "Cà Phê Cùng Tony — Tony Buổi Sáng", description: "Tản văn truyền cảm hứng khởi nghiệp cho người trẻ Việt.", priceUsdc: "10.00", isActive: true },
      { id: "demo-9-l8", name: "Muôn Kiếp Nhân Sinh (trọn bộ 3 tập)", description: "Nguyên Phong. Hành trình khám phá luân hồi và nhân quả.", priceUsdc: "32.00", isActive: true },
      { id: "demo-9-l9", name: "Bí Mật Tư Duy Triệu Phú — T. Harv Eker", description: "Sách kinh điển về tư duy làm giàu, bìa mềm.", priceUsdc: "11.00", isActive: true },
      { id: "demo-9-l10", name: "Combo sách thiếu nhi Doraemon (10 tập)", description: "Truyện tranh giáo dục kinh điển cho bé 6–12 tuổi.", priceUsdc: "25.00", isActive: true },
    ],
    orders: [
      { id: "demo-9-o1", orderCode: "SHNN-001", productName: "Atomic Habits", priceUsdc: "15.00", warrantyDays: 0, status: "released", createdAt: "2024-05-05T09:00:00Z", review: { rating: 5, comment: "Sách mới 100%, ship nhanh. Đọc xong thấy thay đổi được nhiều thói quen.", commentEn: "Brand new book, fast shipping. Reading it helped me change many habits.", buyerWallet: "0xab12...3456", createdAt: "2024-05-12T10:00:00Z" } },
      { id: "demo-9-o2", orderCode: "SHNN-002", productName: "Sapiens: Lược sử loài người", priceUsdc: "18.00", warrantyDays: 0, status: "released", createdAt: "2024-05-15T09:00:00Z", review: { rating: 5, comment: "Sách hay vô cùng. Bìa cứng sang, in đẹp. Bọc bìa miễn phí là điểm cộng lớn.", commentEn: "Wonderful book, beautiful hardcover, great print quality. Free cover wrap is a great bonus.", buyerWallet: "0xbc23...4567", createdAt: "2024-05-22T10:00:00Z" } },
      { id: "demo-9-o3", orderCode: "SHNN-003", productName: "Đắc Nhân Tâm", priceUsdc: "12.00", warrantyDays: 0, status: "released", createdAt: "2024-06-01T09:00:00Z", review: { rating: 5, comment: "Mua về tặng con. Sách nguyên seal, giao nhanh. Nhà sách uy tín!", commentEn: "Bought as a gift for my child. Book arrived sealed, fast delivery. Highly trustworthy store!", buyerWallet: "0xcd34...5678", createdAt: "2024-06-08T10:00:00Z" } },
      { id: "demo-9-o4", orderCode: "SHNN-004", productName: "Combo 5 sách kinh tế", priceUsdc: "55.00", warrantyDays: 0, status: "released", createdAt: "2024-06-12T09:00:00Z", review: { rating: 5, comment: "Combo giá tốt hơn mua lẻ nhiều. Đóng gói cẩn thận, không bị móp góc.", commentEn: "Bundle is much better value than buying separately. Careful packaging, no bent corners.", buyerWallet: "0xde45...6789", createdAt: "2024-06-19T10:00:00Z" } },
    ],
  },

  "demo-10": {
    shop: {
      id: "demo-10", name: "Sách Ngoại Văn", category: "Sách",
      description: "Sách tiếng Anh, Nhật, Hàn nhập khẩu trực tiếp. Bản in gốc, giá tốt hơn nhà sách nội địa 20–30%. Ship toàn quốc.",
      gmail: "sachnoaivan@gmail.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu sách lỗi in hoặc không đúng ISBN.",
      status: "verified", avgRating: 4.7, totalOrders: 99, totalRevenue: "$4,950", createdAt: "2024-02-20T00:00:00Z",
    },
    listings: [
      { id: "demo-10-l1", name: "Harry Potter Complete 7-Book Set (EN)", description: "Bộ 7 tập Harry Potter bản tiếng Anh, bìa mềm. Nhập từ US.", priceUsdc: "75.00", isActive: true },
      { id: "demo-10-l2", name: "The Almanack of Naval Ravikant (EN)", description: "Bìa cứng, in màu. Tư duy làm giàu và hạnh phúc từ CEO AngelList.", priceUsdc: "28.00", isActive: true },
      { id: "demo-10-l3", name: "新完全マスター N2 文法 (JP)", description: "Giáo trình luyện JLPT N2 phần ngữ pháp. Nhập từ Nhật.", priceUsdc: "22.00", isActive: true },
      { id: "demo-10-l4", name: "Korean From Zero! Book 1 (EN/KR)", description: "Học tiếng Hàn từ đầu, giải thích bằng tiếng Anh. Có bài tập kèm.", priceUsdc: "19.00", isActive: true },
      { id: "demo-10-l5", name: "Atomic Habits (Original English Edition)", description: "Bản gốc tiếng Anh, bìa mềm, giấy đẹp, nhập từ US.", priceUsdc: "16.00", isActive: true },
      { id: "demo-10-l6", name: "Minna no Nihongo Sơ Cấp 1 (JP)", description: "Giáo trình tiếng Nhật phổ biến nhất, kèm sách bài tập.", priceUsdc: "24.00", isActive: true },
      { id: "demo-10-l7", name: "TOPIK I Complete Guide (KR)", description: "Luyện thi TOPIK sơ cấp, đầy đủ 4 kỹ năng, có audio.", priceUsdc: "21.00", isActive: true },
      { id: "demo-10-l8", name: "The Alchemist (English Paperback)", description: "Bản gốc tiếng Anh của Nhà Giả Kim, in tại UK.", priceUsdc: "12.00", isActive: true },
      { id: "demo-10-l9", name: "Oxford Advanced Learner's Dictionary", description: "Từ điển Anh-Anh chuẩn quốc tế, bìa cứng, 1800 trang.", priceUsdc: "38.00", isActive: true },
      { id: "demo-10-l10", name: "Manga One Piece Vol 1-10 (EN Set)", description: "Bộ 10 tập đầu bản tiếng Anh, giấy in chất lượng cao.", priceUsdc: "55.00", isActive: true },
    ],
    orders: [
      { id: "demo-10-o1", orderCode: "SNV-001", productName: "Harry Potter Complete 7-Book Set", priceUsdc: "75.00", warrantyDays: 0, status: "released", createdAt: "2024-05-08T09:00:00Z", review: { rating: 5, comment: "Bộ sách đẹp, bản gốc tiếng Anh rõ ràng. Giao nhanh, đóng gói chắc.", commentEn: "Beautiful set, clear original English text. Fast delivery, secure packaging.", buyerWallet: "0xef56...789a", createdAt: "2024-05-15T10:00:00Z" } },
      { id: "demo-10-o2", orderCode: "SNV-002", productName: "The Almanack of Naval Ravikant", priceUsdc: "28.00", warrantyDays: 0, status: "released", createdAt: "2024-05-18T09:00:00Z", review: { rating: 5, comment: "Sách hay, thiết kế đẹp. Giá nhập khẩu vẫn rẻ hơn trong nước.", commentEn: "Great book, beautiful design. Imported price is still cheaper than local bookstores.", buyerWallet: "0xf067...89ab", createdAt: "2024-05-25T10:00:00Z" } },
      { id: "demo-10-o3", orderCode: "SNV-003", productName: "新完全マスター N2 文法", priceUsdc: "22.00", warrantyDays: 0, status: "released", createdAt: "2024-06-05T09:00:00Z", review: { rating: 4, comment: "Sách JLPT N2 đúng bản Nhật, giải thích rõ ràng. Giao hàng 4 ngày từ khi đặt.", commentEn: "Correct Japanese JLPT N2 edition, clear explanations. Arrived 4 days after ordering.", buyerWallet: "0x0178...9abc", createdAt: "2024-06-12T10:00:00Z" } },
      { id: "demo-10-o4", orderCode: "SNV-004", productName: "Korean From Zero! Book 1", priceUsdc: "19.00", warrantyDays: 0, status: "released", createdAt: "2024-06-15T09:00:00Z", review: { rating: 5, comment: "Sách học tiếng Hàn rất dễ hiểu, có nhiều bài tập thực hành.", commentEn: "Very beginner-friendly Korean textbook, packed with practice exercises.", buyerWallet: "0x1289...abcd", createdAt: "2024-06-22T10:00:00Z" } },
    ],
  },

  "demo-23": {
    shop: {
      id: "demo-23", name: "Văn Phòng Phẩm Sáng Tạo", category: "Sách",
      description: "Văn phòng phẩm, sổ tay, bút cao cấp cho học sinh, sinh viên, dân văn phòng. Thiết kế độc quyền, chất lượng bền đẹp.",
      gmail: "vanphongphamsangtao@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu sản phẩm lỗi in ấn hoặc hư hỏng.",
      status: "verified", avgRating: 4.7, totalOrders: 97, totalRevenue: "$2,910", createdAt: "2024-03-10T00:00:00Z",
    },
    listings: [
      { id: "demo-23-l1", name: "Sổ tay bìa da PU dòng kẻ ngang A5", description: "Giấy 100gsm không lem mực, bìa da bền đẹp.", priceUsdc: "9.00", isActive: true },
      { id: "demo-23-l2", name: "Bút máy luyện chữ ngòi EF", description: "Ngòi kim loại êm tay, phù hợp người mới học viết.", priceUsdc: "12.00", isActive: true },
      { id: "demo-23-l3", name: "Set bút gel màu pastel (12 màu)", description: "Mực lên đều, không lem, vỏ bút cầm êm tay.", priceUsdc: "8.00", isActive: true },
      { id: "demo-23-l4", name: "Washi tape trang trí (bộ 10 cuộn)", description: "Họa tiết đa dạng, dễ xé dán, không để lại keo.", priceUsdc: "7.00", isActive: true },
      { id: "demo-23-l5", name: "Planner kế hoạch tuần/tháng bìa cứng", description: "Thiết kế tối giản, giấy dày, gáy lò xo bền.", priceUsdc: "14.00", isActive: true },
      { id: "demo-23-l6", name: "Bảng viết bảng trắng mini để bàn", description: "Kích thước A4, kèm bút và khăn lau, dùng ghi chú nhanh.", priceUsdc: "10.00", isActive: true },
      { id: "demo-23-l7", name: "Hộp bút kéo nhiều ngăn", description: "Chất liệu vải canvas, gọn nhẹ, đựng được nhiều dụng cụ.", priceUsdc: "11.00", isActive: true },
      { id: "demo-23-l8", name: "Sticker trang trí sổ tay (100 miếng)", description: "Hình dán chống nước, nhiều chủ đề dễ thương.", priceUsdc: "5.00", isActive: true },
      { id: "demo-23-l9", name: "Bộ highlight đánh dấu 6 màu neon", description: "Không lem giấy mỏng, đầu bút vát tiện highlight.", priceUsdc: "6.00", isActive: true },
      { id: "demo-23-l10", name: "Combo dụng cụ học tập tựu trường", description: "Sổ, bút, thước, tẩy — đầy đủ cho năm học mới.", priceUsdc: "18.00", isActive: true },
    ],
    orders: [
      { id: "demo-23-o1", orderCode: "VPP-001", productName: "Sổ tay bìa da PU dòng kẻ ngang A5", priceUsdc: "9.00", warrantyDays: 0, status: "released", createdAt: "2024-05-20T08:00:00Z", review: { rating: 5, comment: "Giấy dày viết mượt, bìa da đẹp sang. Dùng làm quà tặng rất hợp.", commentEn: "Thick paper, smooth writing, elegant leather cover. Great as a gift.", buyerWallet: "0x2839...4a5b", createdAt: "2024-05-27T09:00:00Z" } },
      { id: "demo-23-o2", orderCode: "VPP-002", productName: "Planner kế hoạch tuần/tháng bìa cứng", priceUsdc: "14.00", warrantyDays: 0, status: "released", createdAt: "2024-05-25T08:00:00Z", review: { rating: 5, comment: "Thiết kế đẹp, giúp mình sắp xếp công việc hiệu quả hơn hẳn.", commentEn: "Beautiful design, really helps me organize my work better.", buyerWallet: "0x394a...5b6c", createdAt: "2024-06-01T09:00:00Z" } },
      { id: "demo-23-o3", orderCode: "VPP-003", productName: "Set bút gel màu pastel (12 màu)", priceUsdc: "8.00", warrantyDays: 0, status: "released", createdAt: "2024-06-02T08:00:00Z", review: { rating: 4, comment: "Màu đẹp, lên mực đều. Vài cây hết mực hơi nhanh.", commentEn: "Nice colors, even ink flow. A couple of pens ran out a bit fast.", buyerWallet: "0x4a5b...6c7d", createdAt: "2024-06-09T09:00:00Z" } },
    ],
  },

  "demo-24": {
    shop: {
      id: "demo-24", name: "Truyện Tranh & Manga VN", category: "Sách",
      description: "Manga, comic bản quyền tiếng Việt và tiếng Anh. Cập nhật tập mới nhanh nhất, đóng gói bọc bìa cẩn thận.",
      gmail: "truyentranhmanga@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi trả trong 3 ngày nếu sách in lỗi hoặc rách bìa khi giao.",
      status: "verified", avgRating: 4.8, totalOrders: 176, totalRevenue: "$5,280", createdAt: "2024-01-30T00:00:00Z",
    },
    listings: [
      { id: "demo-24-l1", name: "One Piece tập 105 (bản quyền VN)", description: "Bản dịch chính thức NXB Kim Đồng, giấy đẹp.", priceUsdc: "4.50", isActive: true },
      { id: "demo-24-l2", name: "Naruto trọn bộ 72 tập", description: "Bộ sưu tập đầy đủ, hộp đựng riêng, giá ưu đãi mua trọn bộ.", priceUsdc: "180.00", isActive: true },
      { id: "demo-24-l3", name: "Doraemon tuyển tập màu (10 tập)", description: "Bản in màu đặc biệt, giấy couche cao cấp.", priceUsdc: "35.00", isActive: true },
      { id: "demo-24-l4", name: "Attack on Titan tập cuối (bản quyền)", description: "Kết thúc trọn vẹn series đình đám, bìa cứng giới hạn.", priceUsdc: "8.00", isActive: true },
      { id: "demo-24-l5", name: "Conan thám tử lừng danh tập 105", description: "Tập mới nhất, giao trước ngày phát hành 1 ngày.", priceUsdc: "4.00", isActive: true },
      { id: "demo-24-l6", name: "Demon Slayer trọn bộ 23 tập", description: "Bộ đầy đủ kèm poster giới hạn, đóng hộp quà.", priceUsdc: "95.00", isActive: true },
      { id: "demo-24-l7", name: "Jujutsu Kaisen tập 1-5 (combo mở đầu)", description: "Bắt đầu series hot nhất hiện tại với giá ưu đãi.", priceUsdc: "18.00", isActive: true },
      { id: "demo-24-l8", name: "Light novel Sword Art Online tập 1", description: "Bản dịch tiếng Việt, kèm minh họa màu gốc Nhật.", priceUsdc: "7.00", isActive: true },
      { id: "demo-24-l9", name: "Sổ tay phác thảo phong cách manga", description: "Giấy dày vẽ bút chì không lem, dùng luyện vẽ.", priceUsdc: "9.00", isActive: true },
      { id: "demo-24-l10", name: "Poster in canvas nhân vật anime (A3)", description: "In UV bền màu, đóng khung sẵn, treo phòng đẹp.", priceUsdc: "15.00", isActive: true },
    ],
    orders: [
      { id: "demo-24-o1", orderCode: "TTM-001", productName: "One Piece tập 105", priceUsdc: "4.50", warrantyDays: 0, status: "released", createdAt: "2024-05-22T08:00:00Z", review: { rating: 5, comment: "Giao đúng ngày phát hành, sách đẹp không móp góc.", commentEn: "Delivered right on release day, book in perfect condition.", buyerWallet: "0x5b6c...7d8e", createdAt: "2024-05-22T14:00:00Z" } },
      { id: "demo-24-o2", orderCode: "TTM-002", productName: "Demon Slayer trọn bộ 23 tập", priceUsdc: "95.00", warrantyDays: 0, status: "released", createdAt: "2024-05-28T08:00:00Z", review: { rating: 5, comment: "Trọn bộ đẹp, có poster tặng kèm, đóng hộp cẩn thận.", commentEn: "Beautiful full set, bonus poster included, carefully boxed.", buyerWallet: "0x6c7d...8e9f", createdAt: "2024-06-04T09:00:00Z" } },
      { id: "demo-24-o3", orderCode: "TTM-003", productName: "Jujutsu Kaisen tập 1-5", priceUsdc: "18.00", warrantyDays: 0, status: "released", createdAt: "2024-06-05T08:00:00Z", review: { rating: 5, comment: "Giá tốt hơn mua lẻ nhiều, in ấn rõ nét.", commentEn: "Much better value than buying individually, crisp print quality.", buyerWallet: "0x7d8e...9f0a", createdAt: "2024-06-12T09:00:00Z" } },
    ],
  },

  // ── Nội thất ───────────────────────────────────────────────────────────────
  "demo-11": {
    shop: {
      id: "demo-11", name: "HomeDecor VN", category: "Nội thất",
      description: "Đồ trang trí nhà cửa phong cách tối giản. Đèn LED, tranh treo tường, cây giả cao cấp, khung ảnh, nến thơm.",
      gmail: "homedecorvn@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu sản phẩm lỗi hoặc vỡ khi vận chuyển.",
      status: "verified", avgRating: 4.5, totalOrders: 56, totalRevenue: "$5,600", createdAt: "2024-03-01T00:00:00Z",
    },
    listings: [
      { id: "demo-11-l1", name: "Đèn LED dây 10m nhiều màu", description: "Đèn LED dây cắt điện 220V, 10m, IP44, điều khiển từ xa 16 màu.", priceUsdc: "29.00", isActive: true },
      { id: "demo-11-l2", name: "Tranh treo tường canvas minimalist", description: "Bộ 3 tranh 30×40cm, in UV chống phai màu, khung gỗ thông. Phong cách Bắc Âu.", priceUsdc: "55.00", isActive: true },
      { id: "demo-11-l3", name: "Cây trúc giả cao 120cm", description: "Lá nhựa PE cao cấp sờ như thật, thân tre tự nhiên, chậu xi măng đi kèm.", priceUsdc: "45.00", isActive: true },
      { id: "demo-11-l4", name: "Set 3 nến thơm soy wax", description: "Soy wax 100%, hương gỗ tuyết tùng, vanille, cam bergamot. Cháy 40h.", priceUsdc: "38.00", isActive: true },
      { id: "demo-11-l5", name: "Gương trang trí hình vòm viền gỗ", description: "Khung gỗ tự nhiên, cao 120cm, phong cách tối giản.", priceUsdc: "65.00", isActive: true },
      { id: "demo-11-l6", name: "Thảm trải sàn lông xù Bắc Âu", description: "Kích thước 120×160cm, mềm mịn, chống trượt đế.", priceUsdc: "48.00", isActive: true },
      { id: "demo-11-l7", name: "Bình hoa gốm sứ trang trí (bộ 3)", description: "Men rạn thủ công, 3 kích cỡ, phong cách Nhật Bản.", priceUsdc: "35.00", isActive: true },
      { id: "demo-11-l8", name: "Đèn ngủ để bàn dáng nấm", description: "Ánh sáng vàng dịu, điều chỉnh độ sáng, chân đế gỗ.", priceUsdc: "27.00", isActive: true },
      { id: "demo-11-l9", name: "Khung ảnh treo tường bộ 6", description: "Đa kích thước, chất liệu gỗ MDF, kèm đinh treo.", priceUsdc: "22.00", isActive: true },
      { id: "demo-11-l10", name: "Rèm vải lanh chắn sáng", description: "Khổ 1.4×2.6m, chất liệu lanh tự nhiên, cản nắng 80%.", priceUsdc: "42.00", isActive: true },
    ],
    orders: [
      { id: "demo-11-o1", orderCode: "HDV-001", productName: "Đèn LED dây 10m", priceUsdc: "29.00", warrantyDays: 180, status: "released", createdAt: "2024-05-05T09:00:00Z", review: { rating: 5, comment: "Đèn đẹp, nhiều màu. Treo phòng ngủ trông ấm cúng hẳn. Giao nhanh.", commentEn: "Beautiful lights, so many colors. Bedroom feels much cozier. Fast delivery.", buyerWallet: "0x2390...bcde", createdAt: "2024-05-12T10:00:00Z" } },
      { id: "demo-11-o2", orderCode: "HDV-002", productName: "Tranh treo tường canvas minimalist", priceUsdc: "55.00", warrantyDays: 0, status: "released", createdAt: "2024-05-18T09:00:00Z", review: { rating: 4, comment: "Tranh đẹp, in sắc nét. Phòng khách trông nghệ hẳn. Đóng gói chắc chắn.", commentEn: "Beautiful prints, sharp imagery. Living room looks so much more artistic. Solid packaging.", buyerWallet: "0x34ab...cdef", createdAt: "2024-05-25T10:00:00Z" } },
      { id: "demo-11-o3", orderCode: "HDV-003", productName: "Cây trúc giả cao 120cm", priceUsdc: "45.00", warrantyDays: 0, status: "released", createdAt: "2024-06-01T09:00:00Z", review: { rating: 5, comment: "Cây nhìn y thật, nhẹ, dễ đặt. Để góc phòng trông tươi mát hẳn.", commentEn: "Looks exactly like real bamboo, lightweight, easy to position. Brightens up the room.", buyerWallet: "0x45bc...def0", createdAt: "2024-06-08T10:00:00Z" } },
      { id: "demo-11-o4", orderCode: "HDV-004", productName: "Set 3 nến thơm soy wax", priceUsdc: "38.00", warrantyDays: 0, status: "released", createdAt: "2024-06-10T09:00:00Z", review: { rating: 5, comment: "Nến thơm tự nhiên, cháy đều, không khói. Hương bergamot yêu thích nhất.", commentEn: "Natural soy candles, burns evenly, no smoke. The bergamot scent is my favorite.", buyerWallet: "0x56cd...ef01", createdAt: "2024-06-17T10:00:00Z" } },
    ],
  },

  "demo-12": {
    shop: {
      id: "demo-12", name: "Gỗ Thật Handmade", category: "Nội thất",
      description: "Nội thất gỗ thật làm thủ công: kệ sách, bàn café, ghế đẩu, khay trà. Gỗ thông & óc chó tự nhiên. Đặt theo yêu cầu.",
      gmail: "gothathandmade@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Không nhận đổi trả sản phẩm đặt theo yêu cầu riêng. Sản phẩm lỗi do vận chuyển hoàn tiền 100%.",
      status: "verified", avgRating: 4.8, totalOrders: 33, totalRevenue: "$9,900", createdAt: "2024-04-01T00:00:00Z",
    },
    listings: [
      { id: "demo-12-l1", name: "Kệ sách treo tường gỗ thông 3 tầng", description: "Gỗ thông tự nhiên nguyên tấm, phủ dầu walnut. Kích thước 60×80cm. Tặng kèm đinh móc.", priceUsdc: "120.00", isActive: true },
      { id: "demo-12-l2", name: "Bàn café nhỏ chân chữ X gỗ óc chó", description: "Mặt bàn gỗ óc chó 50×50cm, chân sắt sơn đen. Cao 45cm, phong cách mid-century.", priceUsdc: "189.00", isActive: true },
      { id: "demo-12-l3", name: "Ghế đẩu gỗ thông tròn mini", description: "Mặt ghế tròn đường kính 30cm, 3 chân gỗ thông. Chịu tải 120kg. Cao 45cm.", priceUsdc: "75.00", isActive: true },
      { id: "demo-12-l4", name: "Khay trà gỗ bamboo có tay cầm", description: "Bamboo tự nhiên, kích thước 40×30cm, có tay cầm. Chống mốc, dễ vệ sinh.", priceUsdc: "35.00", isActive: true },
      { id: "demo-12-l5", name: "Giường ngủ gỗ sồi khung thấp 1m6", description: "Gỗ sồi tự nhiên nguyên khối, thiết kế tối giản kiểu Nhật.", priceUsdc: "459.00", isActive: true },
      { id: "demo-12-l6", name: "Tủ đầu giường 2 ngăn gỗ thông", description: "Kích thước 40×35×50cm, phủ dầu tự nhiên, ray trượt êm.", priceUsdc: "89.00", isActive: true },
      { id: "demo-12-l7", name: "Bàn làm việc gỗ óc chó chân sắt", description: "Mặt bàn 120×60cm, chân sắt sơn tĩnh điện chắc chắn.", priceUsdc: "199.00", isActive: true },
      { id: "demo-12-l8", name: "Kệ treo tường góc chữ L", description: "Gỗ thông ghép, lắp đặt dễ dàng, chịu tải 15kg.", priceUsdc: "45.00", isActive: true },
      { id: "demo-12-l9", name: "Ghế bành gỗ bọc nệm vải linen", description: "Khung gỗ sồi, đệm mút D40 êm ái, tựa lưng cao.", priceUsdc: "259.00", isActive: true },
      { id: "demo-12-l10", name: "Thớt gỗ nghiến nguyên khối", description: "Đường kính 35cm, không mùi, kháng khuẩn tự nhiên.", priceUsdc: "28.00", isActive: true },
    ],
    orders: [
      { id: "demo-12-o1", orderCode: "GTH-001", productName: "Kệ sách treo tường gỗ thông 3 tầng", priceUsdc: "120.00", warrantyDays: 365, status: "released", createdAt: "2024-05-08T09:00:00Z", review: { rating: 5, comment: "Gỗ thật đẹp, vân gỗ tự nhiên. Lắp đặt dễ, cứng cáp. Thợ làm tỉ mỉ lắm.", commentEn: "Beautiful real wood, natural grain. Easy to mount, very sturdy. Craftsmanship is excellent.", buyerWallet: "0x67de...f012", createdAt: "2024-05-15T10:00:00Z" } },
      { id: "demo-12-o2", orderCode: "GTH-002", productName: "Bàn café nhỏ chân chữ X gỗ óc chó", priceUsdc: "189.00", warrantyDays: 365, status: "released", createdAt: "2024-05-22T09:00:00Z", review: { rating: 5, comment: "Bàn đẹp hơn ảnh, gỗ óc chó rất sang. Đặt phòng khách ai cũng khen.", commentEn: "Table looks even better in person, walnut wood is so elegant. Everyone compliments it.", buyerWallet: "0x78ef...0123", createdAt: "2024-05-29T10:00:00Z" } },
      { id: "demo-12-o3", orderCode: "GTH-003", productName: "Ghế đẩu gỗ thông tròn mini", priceUsdc: "75.00", warrantyDays: 365, status: "released", createdAt: "2024-06-05T09:00:00Z", review: { rating: 5, comment: "Ghế chắc chắn, gỗ đẹp. Để bên bàn làm việc rất tiện.", commentEn: "Solid stool, beautiful wood. Perfect next to my desk.", buyerWallet: "0x89f0...1234", createdAt: "2024-06-12T10:00:00Z" } },
      { id: "demo-12-o4", orderCode: "GTH-004", productName: "Khay trà gỗ bamboo", priceUsdc: "35.00", warrantyDays: 180, status: "released", createdAt: "2024-06-15T09:00:00Z", review: { rating: 4, comment: "Khay đẹp, bền. Màu bamboo tự nhiên rất thích. Giao hàng cẩn thận.", commentEn: "Beautiful tray, durable. Love the natural bamboo color. Careful delivery.", buyerWallet: "0x9a01...2345", createdAt: "2024-06-22T10:00:00Z" } },
    ],
  },

  "demo-25": {
    shop: {
      id: "demo-25", name: "Đồ Gia Dụng Thông Minh", category: "Nội thất",
      description: "Đồ gia dụng thông minh, thiết bị nhà bếp hiện đại. Bảo hành chính hãng 12-24 tháng, hỗ trợ lắp đặt tận nơi khu vực nội thành.",
      gmail: "dogiadungthongminh@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi mới trong 15 ngày nếu lỗi kỹ thuật từ nhà sản xuất.",
      status: "verified", avgRating: 4.6, totalOrders: 108, totalRevenue: "$14,040", createdAt: "2024-02-05T00:00:00Z",
    },
    listings: [
      { id: "demo-25-l1", name: "Nồi chiên không dầu Philips 4.1L", description: "Công nghệ Rapid Air, không dầu mỡ, dễ vệ sinh.", priceUsdc: "89.00", isActive: true },
      { id: "demo-25-l2", name: "Máy lọc nước RO 10 lõi lọc", description: "Lọc sạch 99.9% tạp chất, có vòi nóng lạnh tiện lợi.", priceUsdc: "259.00", isActive: true },
      { id: "demo-25-l3", name: "Máy hút bụi cầm tay không dây", description: "Lực hút mạnh, pin dùng 40 phút, nhẹ dễ thao tác.", priceUsdc: "79.00", isActive: true },
      { id: "demo-25-l4", name: "Bếp từ đôi mặt kính cường lực", description: "Công suất 3500W, cảm ứng nhiệt, hẹn giờ tự động.", priceUsdc: "135.00", isActive: true },
      { id: "demo-25-l5", name: "Máy xay sinh tố đa năng 1.5L", description: "Lưỡi dao 6 cánh thép không gỉ, xay đá mịn nhanh.", priceUsdc: "45.00", isActive: true },
      { id: "demo-25-l6", name: "Máy làm sữa hạt tự động 1.2L", description: "Tự nấu và xay trong 1 nút bấm, dễ vệ sinh.", priceUsdc: "69.00", isActive: true },
      { id: "demo-25-l7", name: "Quạt điều hòa hơi nước mini", description: "Làm mát nhanh, tiết kiệm điện, có thể tích trữ đá.", priceUsdc: "58.00", isActive: true },
      { id: "demo-25-l8", name: "Nồi cơm điện tử cao tần 1.8L", description: "Nấu 12 chế độ, lòng nồi chống dính 5 lớp.", priceUsdc: "99.00", isActive: true },
      { id: "demo-25-l9", name: "Máy rửa bát mini để bàn 6 bộ", description: "Tiết kiệm nước 70% so với rửa tay, tiệt trùng UV.", priceUsdc: "189.00", isActive: true },
      { id: "demo-25-l10", name: "Bộ dao inox nhà bếp cao cấp (6 món)", description: "Thép không gỉ 420, sắc bén, kèm giá đựng gỗ.", priceUsdc: "42.00", isActive: true },
    ],
    orders: [
      { id: "demo-25-o1", orderCode: "DGD-001", productName: "Nồi chiên không dầu Philips 4.1L", priceUsdc: "89.00", warrantyDays: 730, status: "released", createdAt: "2024-05-11T08:00:00Z", review: { rating: 5, comment: "Chiên giòn không cần dầu, vệ sinh siêu dễ. Đáng tiền.", commentEn: "Fries crispy with no oil, super easy to clean. Worth every penny.", buyerWallet: "0x8e9f...0a1b", createdAt: "2024-05-18T09:00:00Z" } },
      { id: "demo-25-o2", orderCode: "DGD-002", productName: "Máy lọc nước RO 10 lõi lọc", priceUsdc: "259.00", warrantyDays: 730, status: "released", createdAt: "2024-05-19T08:00:00Z", review: { rating: 5, comment: "Nước lọc trong sạch, có vòi nóng lạnh tiện cả nhà dùng.", commentEn: "Crystal clear filtered water, hot/cold tap is handy for the whole family.", buyerWallet: "0x9f0a...1b2c", createdAt: "2024-05-26T09:00:00Z" } },
      { id: "demo-25-o3", orderCode: "DGD-003", productName: "Máy xay sinh tố đa năng 1.5L", priceUsdc: "45.00", warrantyDays: 365, status: "released", createdAt: "2024-06-02T08:00:00Z", review: { rating: 4, comment: "Xay mịn, motor khỏe. Hơi ồn khi xay đá nhưng chấp nhận được.", commentEn: "Blends smoothly, strong motor. A bit loud with ice but acceptable.", buyerWallet: "0x0a1b...2c3d", createdAt: "2024-06-09T09:00:00Z" } },
    ],
  },

  "demo-26": {
    shop: {
      id: "demo-26", name: "Rèm Cửa & Chăn Ga Gối", category: "Nội thất",
      description: "Rèm cửa, chăn ga gối nệm may theo yêu cầu kích thước. Vải nhập khẩu, xưởng may tại chỗ, giao lắp đặt tận nơi.",
      gmail: "remcuavachanga@gmail.com",
      returnPolicy: "Không nhận đổi trả hàng may đo riêng, chỉ hỗ trợ bảo hành lỗi đường may 30 ngày.",
      status: "verified", avgRating: 4.5, totalOrders: 64, totalRevenue: "$8,320", createdAt: "2024-03-25T00:00:00Z",
    },
    listings: [
      { id: "demo-26-l1", name: "Rèm vải chống nắng 2 lớp (1.4×2.6m)", description: "Cản sáng 90%, cách nhiệt, chống bụi bẩn.", priceUsdc: "68.00", isActive: true },
      { id: "demo-26-l2", name: "Bộ chăn ga gối cotton 4 món (1m8)", description: "Cotton lụa mềm mát, họa tiết trơn, dễ giặt máy.", priceUsdc: "55.00", isActive: true },
      { id: "demo-26-l3", name: "Rèm cuốn chống nắng tự động", description: "Điều khiển từ xa, motor êm, phù hợp phòng khách hiện đại.", priceUsdc: "95.00", isActive: true },
      { id: "demo-26-l4", name: "Gối ôm bông ép cao cấp (dài 1m5)", description: "Ruột bông ép đàn hồi tốt, vỏ cotton thoáng mát.", priceUsdc: "22.00", isActive: true },
      { id: "demo-26-l5", name: "Nệm topper foam 5cm (1m6×2m)", description: "Memory foam êm ái, giảm áp lực cơ thể khi ngủ.", priceUsdc: "89.00", isActive: true },
      { id: "demo-26-l6", name: "Rèm voan mỏng trang trí phòng khách", description: "Chất liệu voan Hàn nhẹ nhàng, lấy sáng tự nhiên.", priceUsdc: "32.00", isActive: true },
      { id: "demo-26-l7", name: "Bộ ga giường lụa satin cao cấp (1m8)", description: "Mềm mịn như lụa, chống nhăn, giữ màu bền đẹp.", priceUsdc: "75.00", isActive: true },
      { id: "demo-26-l8", name: "Chăn hè cotton 4 lớp gạc", description: "Thoáng khí, thấm hút mồ hôi, phù hợp mùa hè nóng.", priceUsdc: "38.00", isActive: true },
      { id: "demo-26-l9", name: "Gối cao su non định hình cổ", description: "Nâng đỡ cột sống cổ, giảm đau mỏi vai gáy.", priceUsdc: "28.00", isActive: true },
      { id: "demo-26-l10", name: "Set rèm phòng ngủ + vỏ gối đồng bộ", description: "Cùng họa tiết, tiết kiệm 10% so với mua riêng.", priceUsdc: "85.00", isActive: true },
    ],
    orders: [
      { id: "demo-26-o1", orderCode: "RCG-001", productName: "Bộ chăn ga gối cotton 4 món (1m8)", priceUsdc: "55.00", warrantyDays: 90, status: "released", createdAt: "2024-05-13T08:00:00Z", review: { rating: 5, comment: "Vải mềm mát, may đo đúng kích thước giường, giao lắp tận nơi.", commentEn: "Soft cool fabric, custom-fitted perfectly, delivered and set up on-site.", buyerWallet: "0x1b2c...3d4e", createdAt: "2024-05-20T09:00:00Z" } },
      { id: "demo-26-o2", orderCode: "RCG-002", productName: "Rèm vải chống nắng 2 lớp", priceUsdc: "68.00", warrantyDays: 30, status: "released", createdAt: "2024-05-21T08:00:00Z", review: { rating: 4, comment: "Cản nắng tốt, phòng mát hẳn. Màu hơi khác ảnh chút xíu.", commentEn: "Blocks sun well, room feels cooler. Color is slightly different from the photo.", buyerWallet: "0x2c3d...4e5f", createdAt: "2024-05-28T09:00:00Z" } },
      { id: "demo-26-o3", orderCode: "RCG-003", productName: "Nệm topper foam 5cm", priceUsdc: "89.00", warrantyDays: 365, status: "released", createdAt: "2024-05-30T08:00:00Z", review: { rating: 5, comment: "Nằm êm hẳn, đỡ đau lưng buổi sáng. Đáng đầu tư.", commentEn: "Much more comfortable, less back pain in the morning. Worth the investment.", buyerWallet: "0x3d4e...5f60", createdAt: "2024-06-06T09:00:00Z" } },
    ],
  },

  // ── Đồ chơi & Mẹ bé ───────────────────────────────────────────────────────
  "demo-13": {
    shop: {
      id: "demo-13", name: "Đồ Chơi Nhí Vui", category: "Đồ chơi & Mẹ bé",
      description: "Chuyên LEGO, đồ chơi STEM, xe điều khiển, đồ chơi trí tuệ cho trẻ 3–12 tuổi. Hàng chính hãng, an toàn đạt chuẩn EN71.",
      gmail: "nhivui.toys@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu sản phẩm bị lỗi hoặc thiếu phụ kiện. Đóng gói phải còn nguyên.",
      status: "verified", avgRating: 4.9, totalOrders: 156, totalRevenue: "$9,800", createdAt: "2024-03-01T00:00:00Z",
    },
    listings: [
      { id: "demo-13-l1", name: "LEGO City Trạm Cứu Hỏa 280 mảnh", description: "Set LEGO City 60375, gồm xe cứu hỏa + trạm, dành cho trẻ 6 tuổi trở lên. Hộp chính hãng nguyên seal.", priceUsdc: "49.00", isActive: true },
      { id: "demo-13-l2", name: "Rubik's Cube 3×3 MoYu Speed", description: "Rubik tốc độ cao MoYu RS3M 2021, tra dầu sẵn, trơn mượt. Phù hợp cả người mới lẫn speedcuber.", priceUsdc: "18.00", isActive: true },
      { id: "demo-13-l3", name: "Bộ đồ chơi STEM Khoa học (trẻ 8–12 tuổi)", description: "60 thí nghiệm khoa học thú vị: núi lửa, mạch điện, kính hiển vi mini. Kèm hướng dẫn tiếng Việt.", priceUsdc: "35.00", isActive: true },
      { id: "demo-13-l4", name: "Xe điều khiển từ xa 4WD Off-road", description: "Xe RC địa hình 4 bánh, tốc độ 25km/h, pin 1200mAh chơi 30 phút. Dành cho trẻ 6 tuổi trở lên.", priceUsdc: "42.00", isActive: true },
      { id: "demo-13-l5", name: "Bộ xếp hình nam châm Magna-Tiles (32 mảnh)", description: "Phát triển tư duy không gian, an toàn cho bé từ 3 tuổi.", priceUsdc: "39.00", isActive: true },
      { id: "demo-13-l6", name: "Máy bay giấy điều khiển từ xa mini", description: "Nhẹ, dễ bay trong nhà, pin sạc 15 phút bay 8 phút.", priceUsdc: "24.00", isActive: true },
      { id: "demo-13-l7", name: "Bộ Lego Technic xe đua 200 mảnh", description: "Lắp ráp cơ khí, bánh xe chuyển động thật, trẻ 8 tuổi trở lên.", priceUsdc: "45.00", isActive: true },
      { id: "demo-13-l8", name: "Bàn cờ vua nam châm du lịch", description: "Gấp gọn, quân cờ có nam châm không rơi, hộp đựng tiện lợi.", priceUsdc: "15.00", isActive: true },
      { id: "demo-13-l9", name: "Bộ đồ chơi bác sĩ 20 chi tiết", description: "Nhựa ABS an toàn, hộp đựng nhựa cứng, có ống nghe thật.", priceUsdc: "18.00", isActive: true },
      { id: "demo-13-l10", name: "Xe đạp thăng bằng cho bé 2-5 tuổi", description: "Khung nhôm nhẹ, yên chỉnh độ cao, bánh EVA êm ái.", priceUsdc: "65.00", isActive: true },
    ],
    orders: [
      { id: "demo-13-o1", orderCode: "NHV-001", productName: "LEGO City Trạm Cứu Hỏa 280 mảnh", priceUsdc: "49.00", warrantyDays: 30, status: "released", createdAt: "2024-05-10T09:00:00Z", review: { rating: 5, comment: "Con trai mê mẩn, lắp xong tự hào lắm. Hộp nguyên seal, đủ mảnh. Giao nhanh!", commentEn: "My son is obsessed, so proud when he finished it. Box was sealed, all pieces included. Fast delivery!", buyerWallet: "0xab12...3456", createdAt: "2024-05-17T10:00:00Z" } },
      { id: "demo-13-o2", orderCode: "NHV-002", productName: "Rubik's Cube 3×3 MoYu Speed", priceUsdc: "18.00", warrantyDays: 30, status: "released", createdAt: "2024-05-20T10:00:00Z", review: { rating: 5, comment: "Xoay cực mượt, chính hãng MoYu. Con học giải 2 tuần là xong rồi. Giá tốt!", commentEn: "Turns super smooth, genuine MoYu. Kid learned to solve it in 2 weeks. Great price!", buyerWallet: "0xbc23...4567", createdAt: "2024-05-27T11:00:00Z" } },
      { id: "demo-13-o3", orderCode: "NHV-003", productName: "Bộ đồ chơi STEM Khoa học", priceUsdc: "35.00", warrantyDays: 30, status: "released", createdAt: "2024-06-01T10:00:00Z", review: { rating: 5, comment: "Bé thích lắm, hướng dẫn tiếng Việt rõ ràng. Thí nghiệm núi lửa là màn trình diễn đỉnh nhất!", commentEn: "Kids love it, Vietnamese instructions are clear. The volcano experiment was the biggest hit!", buyerWallet: "0xcd34...5678", createdAt: "2024-06-08T11:00:00Z" } },
      { id: "demo-13-o4", orderCode: "NHV-004", productName: "Xe điều khiển từ xa 4WD Off-road", priceUsdc: "42.00", warrantyDays: 30, status: "released", createdAt: "2024-06-12T10:00:00Z", review: { rating: 5, comment: "Xe chắc, chạy địa hình tốt. Pin trâu hơn dự kiến. Cả xóm xin mượn chơi!", commentEn: "Solid car, handles rough terrain well. Battery lasts longer than expected. The whole neighborhood wants to play with it!", buyerWallet: "0xde45...6789", createdAt: "2024-06-19T11:00:00Z" } },
    ],
  },

  "demo-14": {
    shop: {
      id: "demo-14", name: "Baby & Kids World", category: "Đồ chơi & Mẹ bé",
      description: "Đồ chơi Montessori, đồ chơi gỗ an toàn, sản phẩm phát triển trí tuệ cho bé 0–6 tuổi. Tất cả đạt chứng nhận an toàn CE/ASTM.",
      gmail: "babykidsworld.vn@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Hoàn tiền 100% trong 14 ngày nếu sản phẩm không như mô tả hoặc có lỗi sản xuất.",
      status: "verified", avgRating: 4.8, totalOrders: 203, totalRevenue: "$8,120", createdAt: "2024-02-01T00:00:00Z",
    },
    listings: [
      { id: "demo-14-l1", name: "Bộ Flashcard Học Chữ + Số (100 thẻ)", description: "100 thẻ cứng 2 mặt: mặt hình + mặt chữ/số. Chất liệu giấy cứng laminate, bé cầm không cong mép. Dành cho bé 2–5 tuổi.", priceUsdc: "12.00", isActive: true },
      { id: "demo-14-l2", name: "Xe Tập Đi 3-in-1 (6–24 tháng)", description: "Chuyển đổi từ xe đẩy → xe thăng bằng → xe đi bộ. Khung nhôm nhẹ, bánh EVA không trầy sàn. An toàn cho bé từ 6 tháng.", priceUsdc: "58.00", isActive: true },
      { id: "demo-14-l3", name: "Bộ Nhà Bếp Mini Bằng Gỗ (18 chi tiết)", description: "Bếp, nồi, chảo, thớt, dao gỗ — bộ 18 chi tiết sơn màu nước an toàn. Phát triển kỹ năng nhập vai cho bé 3–6 tuổi.", priceUsdc: "45.00", isActive: true },
      { id: "demo-14-l4", name: "Đồ Chơi Xếp Hình Gỗ Montessori (40 khối)", description: "40 khối gỗ hình học đa sắc: hình trụ, lập phương, chóp, cầu. Gỗ MDF phủ sơn nước, góc bo tròn an toàn.", priceUsdc: "28.00", isActive: true },
      { id: "demo-14-l5", name: "Thảm chơi cho bé sơ sinh (EVA chống thấm)", description: "Kích thước 180×200cm, họa tiết an toàn, dễ vệ sinh.", priceUsdc: "34.00", isActive: true },
      { id: "demo-14-l6", name: "Bộ đồ chơi câu cá gỗ Montessori", description: "Rèn phối hợp tay mắt, 8 con cá nam châm, cần câu gỗ.", priceUsdc: "16.00", isActive: true },
      { id: "demo-14-l7", name: "Xúc xắc lục lạc cho bé sơ sinh (bộ 4)", description: "Chất liệu vải hữu cơ, an toàn khi bé ngậm cắn.", priceUsdc: "14.00", isActive: true },
      { id: "demo-14-l8", name: "Ghế tập ngồi ăn dặm đa năng", description: "Điều chỉnh độ cao, khay ăn tháo rời, dây an toàn 5 điểm.", priceUsdc: "75.00", isActive: true },
      { id: "demo-14-l9", name: "Bộ đồ chơi xếp tháp vòng nhựa", description: "Màu sắc tươi sáng, giúp bé nhận biết kích thước (Stacking Rings).", priceUsdc: "11.00", isActive: true },
      { id: "demo-14-l10", name: "Địu em bé công thái học", description: "Hỗ trợ tư thế ngồi tự nhiên, đệm vai êm, dùng từ 0-36 tháng.", priceUsdc: "58.00", isActive: true },
    ],
    orders: [
      { id: "demo-14-o1", orderCode: "BKW-001", productName: "Bộ Flashcard Học Chữ + Số (100 thẻ)", priceUsdc: "12.00", warrantyDays: 30, status: "released", createdAt: "2024-05-08T09:00:00Z", review: { rating: 5, comment: "Thẻ cứng đẹp, màu sắc tươi sáng. Bé 3 tuổi nhà mình nhận mặt chữ nhanh lắm. Xứng đáng 5 sao!", commentEn: "Cards are firm and colorful. My 3-year-old recognized letters so quickly. Totally worth 5 stars!", buyerWallet: "0xef56...789a", createdAt: "2024-05-15T10:00:00Z" } },
      { id: "demo-14-o2", orderCode: "BKW-002", productName: "Xe Tập Đi 3-in-1", priceUsdc: "58.00", warrantyDays: 30, status: "released", createdAt: "2024-05-20T09:00:00Z", review: { rating: 5, comment: "Xe chắc chắn, bé 10 tháng đứng vịn đi vòng vòng cả ngày. Lắp ráp dễ, không cần dụng cụ.", commentEn: "Very sturdy, my 10-month-old cruises around all day. Easy assembly, no tools needed.", buyerWallet: "0xf067...89ab", createdAt: "2024-05-27T10:00:00Z" } },
      { id: "demo-14-o3", orderCode: "BKW-003", productName: "Bộ Nhà Bếp Mini Bằng Gỗ", priceUsdc: "45.00", warrantyDays: 30, status: "released", createdAt: "2024-06-01T09:00:00Z", review: { rating: 5, comment: "Đồ chơi đẹp, gỗ chắc. Bé gái 4 tuổi mê nấu ăn giả cả ngày. Sơn không mùi, an tâm.", commentEn: "Beautiful toy, solid wood. My 4-year-old girl cooks pretend meals all day. Odorless paint, safe.", buyerWallet: "0x0178...9abc", createdAt: "2024-06-08T10:00:00Z" } },
      { id: "demo-14-o4", orderCode: "BKW-004", productName: "Đồ Chơi Xếp Hình Gỗ Montessori", priceUsdc: "28.00", warrantyDays: 30, status: "released", createdAt: "2024-06-10T09:00:00Z", review: { rating: 4, comment: "Khối gỗ đẹp, màu sắc đúng như ảnh. Bé học phân biệt hình khối nhanh. Thiếu túi đựng nhưng không sao.", commentEn: "Beautiful blocks, colors match the photos. Baby learned shapes quickly. Missing storage bag but otherwise great.", buyerWallet: "0x1289...abcd", createdAt: "2024-06-17T11:00:00Z" } },
    ],
  },

  "demo-27": {
    shop: {
      id: "demo-27", name: "Đồ Sơ Sinh & Mẹ Bầu", category: "Đồ chơi & Mẹ bé",
      description: "Đồ dùng cho mẹ bầu và bé sơ sinh 0-12 tháng. Chất liệu an toàn, kiểm định kỹ trước khi bán, tư vấn miễn phí.",
      gmail: "dososinhmebau@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu sản phẩm chưa qua sử dụng, còn nguyên tem mác.",
      status: "verified", avgRating: 4.8, totalOrders: 231, totalRevenue: "$6,930", createdAt: "2024-01-05T00:00:00Z",
    },
    listings: [
      { id: "demo-27-l1", name: "Set quần áo sơ sinh cotton hữu cơ (5 bộ)", description: "Không phẩm nhuộm độc hại, mềm mại cho da bé.", priceUsdc: "28.00", isActive: true },
      { id: "demo-27-l2", name: "Đai đỡ bụng bầu nâng đỡ lưng", description: "Giảm đau lưng, hỗ trợ tư thế đúng khi mang thai.", priceUsdc: "22.00", isActive: true },
      { id: "demo-27-l3", name: "Máy hút sữa điện đôi không dây", description: "Lực hút êm dịu, pin dùng 3 giờ liên tục, dễ vệ sinh.", priceUsdc: "89.00", isActive: true },
      { id: "demo-27-l4", name: "Bình sữa chống sặc cổ rộng 250ml", description: "Núm ti giống ti mẹ, van chống đầy hơi cho bé.", priceUsdc: "9.00", isActive: true },
      { id: "demo-27-l5", name: "Khăn xô sơ sinh cotton (bộ 10 chiếc)", description: "Mềm mịn thấm hút, dùng lau miệng, quấn bé.", priceUsdc: "12.00", isActive: true },
      { id: "demo-27-l6", name: "Địu ngủ kén Swaddle sơ sinh", description: "Giúp bé ngủ ngon sâu giấc, chất liệu cotton co giãn.", priceUsdc: "18.00", isActive: true },
      { id: "demo-27-l7", name: "Kem chống hăm sơ sinh chiết xuất thiên nhiên", description: "Không paraben, dịu nhẹ cho da nhạy cảm.", priceUsdc: "10.00", isActive: true },
      { id: "demo-27-l8", name: "Máy tiệt trùng bình sữa bằng hơi nước", description: "Tiệt trùng 99.9% vi khuẩn trong 8 phút.", priceUsdc: "65.00", isActive: true },
      { id: "demo-27-l9", name: "Gối chống trào ngược cho bé sơ sinh", description: "Nâng nghiêng an toàn, giảm nôn trớ sau bú.", priceUsdc: "19.00", isActive: true },
      { id: "demo-27-l10", name: "Set đồ đi sinh cho mẹ và bé (trọn gói)", description: "Đầy đủ vật dụng cần thiết khi vào viện sinh.", priceUsdc: "45.00", isActive: true },
    ],
    orders: [
      { id: "demo-27-o1", orderCode: "DSS-001", productName: "Set quần áo sơ sinh cotton hữu cơ (5 bộ)", priceUsdc: "28.00", warrantyDays: 0, status: "released", createdAt: "2024-05-09T08:00:00Z", review: { rating: 5, comment: "Vải mềm mịn, an toàn cho da bé sơ sinh. Đóng gói cẩn thận.", commentEn: "Soft gentle fabric, safe for newborn skin. Carefully packaged.", buyerWallet: "0x4e5f...6071", createdAt: "2024-05-16T09:00:00Z" } },
      { id: "demo-27-o2", orderCode: "DSS-002", productName: "Máy hút sữa điện đôi không dây", priceUsdc: "89.00", warrantyDays: 365, status: "released", createdAt: "2024-05-17T08:00:00Z", review: { rating: 5, comment: "Hút êm không đau, pin trâu dùng cả ngày không cần sạc lại.", commentEn: "Gentle, painless suction, battery lasts all day without recharging.", buyerWallet: "0x5f60...7182", createdAt: "2024-05-24T09:00:00Z" } },
      { id: "demo-27-o3", orderCode: "DSS-003", productName: "Địu ngủ kén Swaddle sơ sinh", priceUsdc: "18.00", warrantyDays: 0, status: "released", createdAt: "2024-05-25T08:00:00Z", review: { rating: 5, comment: "Bé ngủ ngon hẳn từ khi dùng, không giật mình nửa đêm.", commentEn: "Baby sleeps so much better since using it, no more startling awake.", buyerWallet: "0x6071...8293", createdAt: "2024-06-01T09:00:00Z" } },
    ],
  },

  "demo-28": {
    shop: {
      id: "demo-28", name: "Đồ Chơi Ngoài Trời Cho Bé", category: "Đồ chơi & Mẹ bé",
      description: "Đồ chơi vận động ngoài trời cho bé: xe đạp, cầu trượt, bể bơi phao, dụng cụ thể thao mini. Vận chuyển và lắp ráp tận nhà.",
      gmail: "dochoingoaitroi@gmail.com", facebookUrl: "https://facebook.com",
      returnPolicy: "Đổi trả trong 7 ngày nếu sản phẩm lỗi lắp ráp hoặc hư hỏng khi giao.",
      status: "verified", avgRating: 4.7, totalOrders: 92, totalRevenue: "$10,120", createdAt: "2024-04-20T00:00:00Z",
    },
    listings: [
      { id: "demo-28-l1", name: "Cầu trượt liền xích đu mini cho bé", description: "Khung nhựa an toàn, phù hợp sân vườn nhỏ, lắp nhanh.", priceUsdc: "89.00", isActive: true },
      { id: "demo-28-l2", name: "Xe đạp 3 bánh có tay đẩy cho bé 1-3 tuổi", description: "Tay đẩy tháo rời được, mui che nắng, đai an toàn.", priceUsdc: "58.00", isActive: true },
      { id: "demo-28-l3", name: "Bể bơi phao gia đình 2m", description: "Đáy êm chống trầy, bơm hơi nhanh, phù hợp sân thượng.", priceUsdc: "35.00", isActive: true },
      { id: "demo-28-l4", name: "Bộ dụng cụ làm vườn mini cho bé", description: "An toàn, giúp bé học yêu thiên nhiên qua chơi.", priceUsdc: "15.00", isActive: true },
      { id: "demo-28-l5", name: "Nhà bóng lều lục giác (200 bóng)", description: "Không mùi nhựa độc hại, gấp gọn dễ cất giữ.", priceUsdc: "42.00", isActive: true },
      { id: "demo-28-l6", name: "Xe scooter 3 bánh phát sáng", description: "Bánh phát sáng khi di chuyển, tay lái điều chỉnh độ cao.", priceUsdc: "38.00", isActive: true },
      { id: "demo-28-l7", name: "Bộ cầu thăng bằng vận động ngoài trời", description: "Rèn khả năng giữ thăng bằng, chất liệu gỗ chắc chắn.", priceUsdc: "65.00", isActive: true },
      { id: "demo-28-l8", name: "Vòi phun nước chơi hè cho bé", description: "Kết nối vòi nước nhà, phun tia mát vui nhộn mùa hè.", priceUsdc: "19.00", isActive: true },
      { id: "demo-28-l9", name: "Bộ bóng rổ mini gắn tường cho bé", description: "Khung nhựa dẻo an toàn, kèm 2 quả bóng nhẹ.", priceUsdc: "22.00", isActive: true },
      { id: "demo-28-l10", name: "Xe kéo đa năng cho bé ngồi chơi ngoài trời", description: "Chở được bé và đồ chơi, bánh xe êm không ồn.", priceUsdc: "75.00", isActive: true },
    ],
    orders: [
      { id: "demo-28-o1", orderCode: "DCN-001", productName: "Xe đạp 3 bánh có tay đẩy cho bé", priceUsdc: "58.00", warrantyDays: 180, status: "released", createdAt: "2024-05-26T08:00:00Z", review: { rating: 5, comment: "Bé rất thích, tay đẩy tiện cho ba mẹ khi bé chưa đạp quen.", commentEn: "Kid loves it, push handle is great for when they're still learning to pedal.", buyerWallet: "0x7182...93a4", createdAt: "2024-06-02T09:00:00Z" } },
      { id: "demo-28-o2", orderCode: "DCN-002", productName: "Bể bơi phao gia đình 2m", priceUsdc: "35.00", warrantyDays: 30, status: "released", createdAt: "2024-06-01T08:00:00Z", review: { rating: 5, comment: "Bơm nhanh, đáy êm không trầy da bé. Cả nhà chơi cuối tuần vui lắm.", commentEn: "Quick to inflate, soft bottom won't scratch skin. Great weekend fun for the family.", buyerWallet: "0x8293...a4b5", createdAt: "2024-06-08T09:00:00Z" } },
      { id: "demo-28-o3", orderCode: "DCN-003", productName: "Nhà bóng lều lục giác (200 bóng)", priceUsdc: "42.00", warrantyDays: 30, status: "released", createdAt: "2024-06-05T08:00:00Z", review: { rating: 4, comment: "Bé chơi cả ngày không chán. Gấp gọn hơi tốn công lúc đầu.", commentEn: "Kid plays all day without getting bored. A bit fiddly to fold up at first.", buyerWallet: "0x93a4...b5c6", createdAt: "2024-06-12T09:00:00Z" } },
    ],
  },
};
