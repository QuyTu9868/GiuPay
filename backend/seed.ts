/**
 * GiuPay — Seed Data (Bước 9)
 * Tạo shop ảo + đơn hàng + tranh chấp để test local
 *
 * Chạy: ts-node seed.ts
 * Chỉ chạy 1 lần sau khi initDB() xong
 */

import { db, initDB } from "./src/db";

// ── Helpers ────────────────────────────────────────────────

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genOrderCode() {
  let code = "ORD-";
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function payUrl(code: string) {
  return `http://localhost:3000/pay/${code}`;
}

// ── Seed ───────────────────────────────────────────────────

async function seed() {
  await initDB();
  console.log("🌱 Bắt đầu seed...");

  // ── 5 Shops ──────────────────────────────────────────────

  const shops = [
    {
      wallet:   "0x1111111111111111111111111111111111111111",
      name:     "TechZone Store",
      desc:     "Chuyên laptop, điện thoại, phụ kiện công nghệ chính hãng.",
      category: "Công nghệ",
      gmail:    "techzone@gmail.com",
      facebook: "https://facebook.com/techzone",
      policy:   "Đổi trả trong 7 ngày nếu lỗi do nhà sản xuất.",
      logo:     "ipfs://QmTechZoneLogo",
    },
    {
      wallet:   "0x2222222222222222222222222222222222222222",
      name:     "Thời Trang Linh",
      desc:     "Quần áo nữ phong cách Hàn Quốc, cập nhật xu hướng mỗi tuần.",
      category: "Thời trang",
      gmail:    "thoitranglinh@gmail.com",
      facebook: "https://facebook.com/thoitranglinh",
      policy:   "Hoàn tiền 100% nếu hàng lỗi hoặc giao sai mẫu.",
      logo:     "ipfs://QmLinhFashionLogo",
    },
    {
      wallet:   "0x3333333333333333333333333333333333333333",
      name:     "Sách Hay Mỗi Ngày",
      desc:     "Nhà sách online — sách văn học, kỹ năng, kinh tế, thiếu nhi.",
      category: "Sách",
      gmail:    "sachhaymoinday@gmail.com",
      facebook: null,
      policy:   "Không đổi trả trừ trường hợp sách in lỗi.",
      logo:     "ipfs://QmSachHayLogo",
    },
    {
      wallet:   "0x4444444444444444444444444444444444444444",
      name:     "HomeDecor VN",
      desc:     "Đồ trang trí nhà cửa, đèn LED, tranh treo tường, cây giả.",
      category: "Nội thất",
      gmail:    "homedecorvn@gmail.com",
      facebook: "https://facebook.com/homedecorvn",
      policy:   "Đổi trả trong 3 ngày nếu hàng vỡ/hỏng khi giao.",
      logo:     "ipfs://QmHomeDecorLogo",
    },
    {
      wallet:   "0x5555555555555555555555555555555555555555",
      name:     "Mỹ Phẩm Authentic",
      desc:     "Mỹ phẩm xách tay Hàn, Nhật, Mỹ — cam kết hàng auth 100%.",
      category: "Mỹ phẩm",
      gmail:    "myphamauth@gmail.com",
      facebook: "https://facebook.com/myphamauth",
      policy:   "Cam kết hoàn tiền nếu phát hiện hàng fake.",
      logo:     "ipfs://QmMyphamLogo",
    },
  ];

  const shopIds: Record<string, string> = {};

  for (const s of shops) {
    const { rows } = await db.query(
      `INSERT INTO shops
        (wallet_address, name, description, category, gmail, facebook_url, return_policy, logo_cid, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'verified')
       ON CONFLICT (wallet_address) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [s.wallet, s.name, s.desc, s.category, s.gmail, s.facebook, s.policy, s.logo]
    );
    shopIds[s.wallet] = rows[0].id;
    console.log(`  ✅ Shop: ${s.name}`);
  }

  // ── Orders per shop ───────────────────────────────────────

  type OrderSeed = {
    shopWallet: string;
    product: string;
    image: string;
    desc: string;
    price: number;
    qty: number;
    warranty: number;
    status: string;
    buyer?: string;
    txHash?: string;
    escrowDaysAgo?: number;
    released?: boolean;
  };

  const orders: OrderSeed[] = [
    // TechZone — released (14 ngày trước)
    {
      shopWallet: "0x1111111111111111111111111111111111111111",
      product: "Laptop Dell XPS 13",
      image:   "ipfs://QmDellXPS",
      desc:    "Core i7 Gen 12, RAM 16GB, SSD 512GB, màn 13.4 inch OLED.",
      price:   1200, qty: 1, warranty: 365,
      status:  "released",
      buyer:   "0xaaaa000000000000000000000000000000000001",
      txHash:  "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567891",
      escrowDaysAgo: 16, released: true,
    },
    // TechZone — in_escrow (3 ngày trước)
    {
      shopWallet: "0x1111111111111111111111111111111111111111",
      product: "iPhone 15 Pro Max 256GB",
      image:   "ipfs://QmiPhone15",
      desc:    "Titan tự nhiên, chip A17 Pro, camera 48MP.",
      price:   1350, qty: 1, warranty: 365,
      status:  "in_escrow",
      buyer:   "0xaaaa000000000000000000000000000000000002",
      txHash:  "0xdeadbeef1234567890deadbeef1234567890deadbeef1234567890deadbeef12",
      escrowDaysAgo: 3,
    },
    // Thời Trang Linh — released
    {
      shopWallet: "0x2222222222222222222222222222222222222222",
      product: "Set áo khoác Hàn Quốc mùa đông",
      image:   "ipfs://QmAoKhoak",
      desc:    "Chất liệu dạ cao cấp, form oversize, 3 màu: đen/kem/nâu.",
      price:   45, qty: 2, warranty: 0,
      status:  "released",
      buyer:   "0xaaaa000000000000000000000000000000000003",
      txHash:  "0x1111beef1234567890abcd1111beef1234567890abcd1111beef12345678901b",
      escrowDaysAgo: 20, released: true,
    },
    // Thời Trang Linh — DISPUTED (đang tranh chấp)
    {
      shopWallet: "0x2222222222222222222222222222222222222222",
      product: "Váy hoa nhí vintage",
      image:   "ipfs://QmVayHoa",
      desc:    "Chất voan mềm, có lớp lót, phù hợp đi biển hoặc dạo phố.",
      price:   28, qty: 1, warranty: 0,
      status:  "disputed",
      buyer:   "0xaaaa000000000000000000000000000000000004",
      txHash:  "0x2222beef1234567890abcd2222beef1234567890abcd2222beef12345678902b",
      escrowDaysAgo: 5,
    },
    // Sách — released
    {
      shopWallet: "0x3333333333333333333333333333333333333333",
      product: "Combo Đắc Nhân Tâm + Quẳng Gánh Lo Đi",
      image:   "ipfs://QmSachCombo",
      desc:    "2 cuốn sách kỹ năng sống kinh điển, bìa cứng.",
      price:   12, qty: 1, warranty: 0,
      status:  "released",
      buyer:   "0xaaaa000000000000000000000000000000000005",
      txHash:  "0x3333beef1234567890abcd3333beef1234567890abcd3333beef12345678903b",
      escrowDaysAgo: 18, released: true,
    },
    // Sách — in_escrow (8 ngày)
    {
      shopWallet: "0x3333333333333333333333333333333333333333",
      product: "Zero to One — Peter Thiel",
      image:   "ipfs://QmZeroToOne",
      desc:    "Bản tiếng Việt, bìa mềm.",
      price:   8, qty: 1, warranty: 0,
      status:  "in_escrow",
      buyer:   "0xaaaa000000000000000000000000000000000006",
      txHash:  "0x4444beef1234567890abcd4444beef1234567890abcd4444beef12345678904b",
      escrowDaysAgo: 8,
    },
    // HomeDecor — in_escrow (1 ngày)
    {
      shopWallet: "0x4444444444444444444444444444444444444444",
      product: "Đèn LED thả trần phòng khách",
      image:   "ipfs://QmDenLED",
      desc:    "Đèn tròn 3 màu ánh sáng, điều khiển từ xa, đường kính 60cm.",
      price:   55, qty: 1, warranty: 180,
      status:  "in_escrow",
      buyer:   "0xaaaa000000000000000000000000000000000007",
      txHash:  "0x5555beef1234567890abcd5555beef1234567890abcd5555beef12345678905b",
      escrowDaysAgo: 1,
    },
    // HomeDecor — DISPUTED (shop chưa phản hồi 8 ngày)
    {
      shopWallet: "0x4444444444444444444444444444444444444444",
      product: "Tranh canvas phong cảnh Nhật Bản",
      image:   "ipfs://QmTranh",
      desc:    "In canvas cao cấp, khung gỗ thông, size 60x90cm.",
      price:   30, qty: 1, warranty: 0,
      status:  "disputed",
      buyer:   "0xaaaa000000000000000000000000000000000008",
      txHash:  "0x6666beef1234567890abcd6666beef1234567890abcd6666beef12345678906b",
      escrowDaysAgo: 10,
    },
    // Mỹ phẩm — pending (chưa thanh toán)
    {
      shopWallet: "0x5555555555555555555555555555555555555555",
      product: "Son Dior Rouge 999",
      image:   "ipfs://QmSonDior",
      desc:    "Son lì Dior màu đỏ kinh điển, full size 3.5g, auth Pháp.",
      price:   52, qty: 1, warranty: 0,
      status:  "pending_payment",
    },
    // Mỹ phẩm — released
    {
      shopWallet: "0x5555555555555555555555555555555555555555",
      product: "Serum Vitamin C Klairs 35ml",
      image:   "ipfs://QmSerum",
      desc:    "Serum làm sáng da, mờ thâm nám, phù hợp da nhạy cảm.",
      price:   25, qty: 2, warranty: 0,
      status:  "released",
      buyer:   "0xaaaa000000000000000000000000000000000009",
      txHash:  "0x7777beef1234567890abcd7777beef1234567890abcd7777beef12345678907b",
      escrowDaysAgo: 15, released: true,
    },
  ];

  const orderIds: Record<string, string> = {};

  for (const o of orders) {
    const shopId = shopIds[o.shopWallet];
    const code   = genOrderCode();
    const url    = payUrl(code);

    const escrowAt = o.escrowDaysAgo ? daysAgo(o.escrowDaysAgo) : null;
    const releasedAt = o.released && escrowAt
      ? new Date(escrowAt.getTime() + 14 * 86400_000)
      : null;

    const { rows } = await db.query(
      `INSERT INTO orders
        (order_code, shop_id, product_name, product_image_cid, description,
         price_usdc, quantity, warranty_days, status,
         buyer_wallet, tx_hash, escrow_created_at, escrow_released_at, pay_url, chain_paid_from)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        code, shopId, o.product, o.image, o.desc,
        o.price.toFixed(6), o.qty, o.warranty, o.status,
        o.buyer ?? null, o.txHash ?? null,
        escrowAt, releasedAt, url,
        o.buyer ? "ethereum" : null,
      ]
    );

    orderIds[code] = rows[0].id;
    console.log(`  📦 Order: ${code} — ${o.product} [${o.status}]`);
  }

  // ── Disputes ──────────────────────────────────────────────

  // Lấy order id của 2 đơn disputed
  const { rows: disputedOrders } = await db.query(
    `SELECT id, order_code FROM orders WHERE status = 'disputed'`
  );

  for (const dOrder of disputedOrders) {
    const deadline = daysAgo(-7); // deadline 7 ngày từ bây giờ
    const openedAt = daysAgo(5);  // mở 5 ngày trước

    // Đơn HomeDecor — shop chưa phản hồi 8 ngày (để test bot cảnh báo)
    const isNoResponse = disputedOrders.indexOf(dOrder) === 1;

    await db.query(
      `INSERT INTO disputes
        (order_id, opened_by, reason, status, attempt_number, deadline_at, opened_at, shop_response)
       VALUES ($1,$2,$3,'open',1,$4,$5,$6)`,
      [
        dOrder.id,
        "0xaaaa000000000000000000000000000000000004",
        isNoResponse
          ? "Đã thanh toán 10 ngày nhưng chưa nhận được hàng, shop không phản hồi tin nhắn."
          : "Hàng nhận được khác màu so với ảnh đăng bán. Yêu cầu đổi hoặc hoàn tiền.",
        deadline,
        openedAt,
        isNoResponse ? null : null, // shop chưa phản hồi
      ]
    );
    console.log(`  ⚠️  Dispute: đơn ${dOrder.order_code}`);
  }

  console.log("\n✅ Seed xong! Tổng kết:");
  console.log(`   - ${shops.length} shops (verified)`);
  console.log(`   - ${orders.length} orders (pending/in_escrow/disputed/released)`);
  console.log(`   - ${disputedOrders.length} disputes (open)`);
  console.log("\n👉 Chạy: npm run dev để test");

  await db.end();
}

seed().catch((err) => {
  console.error("❌ Seed thất bại:", err);
  process.exit(1);
});