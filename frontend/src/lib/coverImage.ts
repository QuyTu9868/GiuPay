/**
 * GiuPay — coverImage.ts
 *
 * Sinh ảnh cover/placeholder cho shop & sản phẩm dưới dạng SVG data-URI.
 * KHÔNG gọi mạng (thay cho loremflickr) → render tức thì, ổn định, không lệ thuộc external.
 *
 * - Màu gradient chọn theo hash của seed (id/tên) → mỗi shop/sản phẩm 1 màu cố định.
 * - Emoji lớn ở giữa lấy theo danh mục → trông "khớp" chủ đề hơn ảnh random.
 */

// Bảng emoji theo danh mục (dùng chung cho shop & product)
const CATEGORY_EMOJI: Record<string, string> = {
  "Công nghệ": "💻",
  "Thời trang": "👗",
  "Đồ ăn & Thức uống": "🍜",
  "Làm đẹp": "💄",
  "Sách": "📚",
  "Nội thất": "🛋️",
  "Thể thao": "🏀",
  "Đồ chơi & Mẹ bé": "🧸",
  // EN aliases
  "Electronics": "💻",
  "Fashion": "👗",
  "Food & Drinks": "🍜",
  "Beauty": "💄",
  "Books": "📚",
  "Home & Living": "🛋️",
  "Sports": "🏀",
  "Toys & Kids": "🧸",
};

// Cặp màu gradient dịu, hợp tông sáng của GiuPay
const GRADIENTS: [string, string][] = [
  ["#E1F3FE", "#B9E0FB"], // blue
  ["#EDF3EC", "#CFE6CE"], // green
  ["#FBF3DB", "#F5E4B0"], // yellow
  ["#FDEBEC", "#F8CDCF"], // red/pink
  ["#F0EBFB", "#DBCDF5"], // purple
  ["#F7F6F3", "#E4E1D9"], // neutral
  ["#E6F7F4", "#C4EBE3"], // teal
  ["#FCEDE1", "#F7D6BC"], // orange
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function categoryEmoji(category?: string): string {
  return (category && CATEGORY_EMOJI[category]) || "🛍️";
}

/**
 * Trả về data-URI SVG cover.
 * @param seed   chuỗi định danh (shop id / product id / tên) — quyết định màu
 * @param category  danh mục — quyết định emoji
 * @param w,h    kích thước SVG (aspect ratio hiển thị)
 */
export function coverImage(seed: string, category?: string, w = 400, h = 130): string {
  const hash = hashStr(seed);
  const [c1, c2] = GRADIENTS[hash % GRADIENTS.length];
  const emoji = categoryEmoji(category);
  const fontSize = Math.round(Math.min(w, h) * 0.42);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="${fontSize}">${emoji}</text>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
