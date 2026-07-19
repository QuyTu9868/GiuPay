// ── Ảnh demo cho shops và products ─────────────────────────────────────────
// Điền URL ảnh vào đây. Có thể dùng:
//   - URL ảnh từ internet:  "https://..."
//   - Ảnh local (bỏ vào /public/images/): "/images/ten-anh.jpg"
// Kích thước đề nghị: 800×400px (shop cover), 600×400px (product)

export const SHOP_COVER: Record<string, string> = {
  "demo-1":  "", // TechZone Store — laptop, điện thoại
  "demo-2":  "", // Gadget Hub VN  — tai nghe, smart home
  "demo-3":  "", // Thời Trang Linh — thời trang Hàn nữ
  "demo-4":  "", // Urban Street VN — streetwear, sneaker
  "demo-5":  "", // Phở Gia Truyền 1990 — phở bò
  "demo-6":  "", // Cà Phê Rang Thủ Công — cà phê
  "demo-7":  "", // Mỹ Phẩm Authentic — mỹ phẩm xách tay
  "demo-8":  "", // Skincare By Linh — skincare thuần chay
  "demo-9":  "", // Sách Hay Mỗi Ngày — sách tiếng Việt
  "demo-10": "", // Sách Ngoại Văn — sách tiếng Anh/Nhật/Hàn
  "demo-11": "", // HomeDecor VN — đồ trang trí, đèn LED
  "demo-12": "", // Gỗ Thật Handmade — nội thất gỗ
  "demo-13": "", // InkStudio Tattoo — xăm nghệ thuật
  "demo-14": "", // PhotoBox Studio — chụp ảnh
};

// Ảnh cho từng sản phẩm (listing id từ data.ts)
// Nếu để "" → dùng ảnh cover của shop thay thế
export const PRODUCT_IMG: Record<string, string> = {
  // ── TechZone Store ────────────────────────────────────────────
  "demo-1-l1": "", // MacBook Pro M3
  "demo-1-l2": "", // iPhone 15 Pro Max
  "demo-1-l3": "", // Tai nghe AirPods Pro 2
  "demo-1-l4": "", // Apple Watch Series 9

  // ── Gadget Hub VN ─────────────────────────────────────────────
  "demo-2-l1": "", // Smart speaker Google Nest
  "demo-2-l2": "", // Tai nghe TWS Sony WF-1000XM5
  "demo-2-l3": "", // Màn hình gaming ASUS 27"
  "demo-2-l4": "", // Robot hút bụi Roomba j7+

  // ── Thời Trang Linh ───────────────────────────────────────────
  "demo-3-l1": "", // Set áo croptop + chân váy midi
  "demo-3-l2": "", // Áo len oversized basic
  "demo-3-l3": "", // Đầm wrap dress floral
  "demo-3-l4": "", // Set co-ord linen

  // ── Urban Street VN ───────────────────────────────────────────
  "demo-4-l1": "", // Áo hoodie Supreme Box Logo
  "demo-4-l2": "", // Giày Nike Air Force 1 '07
  "demo-4-l3": "", // Mũ bucket hat New Era
  "demo-4-l4": "", // Túi tote canvas streetwear

  // ── Phở Gia Truyền ────────────────────────────────────────────
  "demo-5-l1": "", // Phở bò tái chín (1 tô)
  "demo-5-l2": "", // Combo 2 tô phở + 2 quẩy
  "demo-5-l3": "", // Phở gà đặc biệt
  "demo-5-l4": "", // Bộ nước phở gia truyền (1L)

  // ── Cà Phê Rang Thủ Công ──────────────────────────────────────
  "demo-6-l1": "", // Cà phê Cầu Đất Đà Lạt (250g)
  "demo-6-l2": "", // Robusta Buôn Ma Thuột (500g)
  "demo-6-l3": "", // Blend Espresso đặc biệt (250g)
  "demo-6-l4": "", // Set thử 4 loại (100g × 4)

  // ── Mỹ Phẩm Authentic ─────────────────────────────────────────
  "demo-7-l1": "", // Son môi MAC Ruby Woo
  "demo-7-l2": "", // Serum Vitamin C La Roche-Posay
  "demo-7-l3": "", // Set dưỡng da Laneige
  "demo-7-l4": "", // Nước hoa Chanel Chance Eau Tendre

  // ── Skincare By Linh ──────────────────────────────────────────
  "demo-8-l1": "", // Toner hoa hồng thuần chay
  "demo-8-l2": "", // Kem dưỡng da nhạy cảm SPF50
  "demo-8-l3": "", // Serum niacinamide 10%
  "demo-8-l4": "", // Sữa rửa mặt chiết xuất lô hội

  // ── Sách Hay Mỗi Ngày ─────────────────────────────────────────
  "demo-9-l1": "", // Sapiens: Lược sử loài người
  "demo-9-l2": "", // Nhà giả kim
  "demo-9-l3": "", // Đắc nhân tâm (bìa cứng)
  "demo-9-l4": "", // Tư duy nhanh và chậm

  // ── Sách Ngoại Văn ────────────────────────────────────────────
  "demo-10-l1": "", // Atomic Habits (EN)
  "demo-10-l2": "", // The Psychology of Money (EN)
  "demo-10-l3": "", // 君の名は。(JP)
  "demo-10-l4": "", // 82년생 김지영 (KR)

  // ── HomeDecor VN ──────────────────────────────────────────────
  "demo-11-l1": "", // Đèn LED dây fairy lights 10m
  "demo-11-l2": "", // Tranh treo tường canvas minimalist
  "demo-11-l3": "", // Cây xanh giả bonsai để bàn
  "demo-11-l4": "", // Gương tròn boho decor

  // ── Gỗ Thật Handmade ──────────────────────────────────────────
  "demo-12-l1": "", // Kệ sách gỗ thông 5 tầng
  "demo-12-l2": "", // Bàn cà phê gỗ me tây nguyên tấm
  "demo-12-l3": "", // Ghế đẩu gỗ oak mini
  "demo-12-l4": "", // Hộp đựng đồ gỗ khắc laser

  // ── InkStudio Tattoo ──────────────────────────────────────────
  "demo-13-l1": "", // Xăm minimalist (< 5cm)
  "demo-13-l2": "", // Xăm watercolor (5–10cm)
  "demo-13-l3": "", // Xăm neo-traditional (>10cm)
  "demo-13-l4": "", // Cover-up tattoo

  // ── PhotoBox Studio ───────────────────────────────────────────
  "demo-14-l1": "", // Chụp ảnh sản phẩm (1 buổi, 10 sản phẩm)
  "demo-14-l2": "", // Chụp ảnh cá nhân lifestyle (2 giờ)
  "demo-14-l3": "", // Chụp ảnh thực phẩm cho menu
  "demo-14-l4": "", // Chụp ảnh cưới buổi sáng (4 giờ)
};

// Fallback khi không có URL: dùng ảnh placeholder theo category
export const CATEGORY_FALLBACK: Record<string, string> = {
  "Công nghệ":          "",
  "Thời trang":         "",
  "Đồ ăn & Thức uống": "",
  "Làm đẹp":            "",
  "Sách":               "",
  "Nội thất":           "",
  "Dịch vụ":            "",
};
