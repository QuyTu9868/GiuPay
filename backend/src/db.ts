import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shops (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_address  VARCHAR(42) UNIQUE NOT NULL,
      name            VARCHAR(255) NOT NULL,
      description     TEXT,
      logo_cid        VARCHAR(255),
      category        VARCHAR(100),
      gmail           VARCHAR(255) NOT NULL,
      facebook_url    VARCHAR(500),
      return_policy   TEXT,
      status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
      reject_reason   TEXT,
      doc_hash        VARCHAR(255),
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_code        VARCHAR(20) UNIQUE NOT NULL,
      shop_id           UUID NOT NULL REFERENCES shops(id),
      product_name      VARCHAR(500) NOT NULL,
      product_image_cid VARCHAR(255),
      description       TEXT,
      price_usdc        NUMERIC(20,6) NOT NULL,
      quantity          INTEGER NOT NULL DEFAULT 1,
      warranty_days     INTEGER DEFAULT 0,
      status            VARCHAR(30) DEFAULT 'pending_payment' CHECK (
                          status IN ('pending_payment','paid','in_escrow','released','refunded','disputed')
                        ),
      buyer_wallet      VARCHAR(42),
      tx_hash           VARCHAR(66),
      sbt_token_id      BIGINT,
      escrow_created_at TIMESTAMPTZ,
      escrow_released_at TIMESTAMPTZ,
      pay_url           VARCHAR(500),
      qr_data           TEXT,
      chain_paid_from   VARCHAR(50),
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id        UUID NOT NULL REFERENCES orders(id),
      opened_by       VARCHAR(42) NOT NULL,
      reason          TEXT NOT NULL,
      status          VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','resolved','closed')),
      resolution      VARCHAR(20) CHECK (resolution IN ('refunded','released',NULL)),
      attempt_number  INTEGER DEFAULT 1,
      shop_response   TEXT,
      admin_note      TEXT,
      opened_at       TIMESTAMPTZ DEFAULT NOW(),
      resolved_at     TIMESTAMPTZ,
      deadline_at     TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS admins (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email           VARCHAR(255) UNIQUE NOT NULL,
      password_hash   VARCHAR(255) NOT NULL,
      totp_secret     VARCHAR(255),
      recovery_email  VARCHAR(255),
      is_active       BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id    UUID NOT NULL REFERENCES admins(id),
      action      VARCHAR(100) NOT NULL,
      target_type VARCHAR(50),
      target_id   UUID,
      note        TEXT,
      ip_address  VARCHAR(45),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- Bảng cài đặt hệ thống (fee wallet, v.v.)
    -- Dùng pattern pending_value + pending_effect_at cho delay 24h (Security checklist #10)
    CREATE TABLE IF NOT EXISTS admin_settings (
      key               VARCHAR(100) PRIMARY KEY,
      value             TEXT NOT NULL,
      pending_value     TEXT,
      pending_effect_at TIMESTAMPTZ,
      updated_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_by        VARCHAR(255)
    );

    -- Bảng đánh giá (Bước 28)
    CREATE TABLE IF NOT EXISTS reviews (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id      UUID UNIQUE NOT NULL REFERENCES orders(id),
      buyer_wallet  VARCHAR(42) NOT NULL,
      rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment       TEXT,
      tx_hash       VARCHAR(66),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS listings (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      name        VARCHAR(500) NOT NULL,
      description TEXT,
      price_usdc  NUMERIC(20,6) NOT NULL,
      image_cid   VARCHAR(255),
      is_active   BOOLEAN DEFAULT true,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_orders_order_code   ON orders(order_code);
    CREATE INDEX IF NOT EXISTS idx_orders_shop_id      ON orders(shop_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_disputes_order_id   ON disputes(order_id);
    CREATE INDEX IF NOT EXISTS idx_shops_wallet        ON shops(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_admin    ON admin_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_order       ON reviews(order_id);
    CREATE INDEX IF NOT EXISTS idx_listings_shop_id    ON listings(shop_id);
    CREATE INDEX IF NOT EXISTS idx_listings_active     ON listings(shop_id, is_active);

    -- Idempotent additions for existing databases
    ALTER TABLE shops  ADD COLUMN IF NOT EXISTS doc_cid TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;

    -- Thông tin giao hàng buyer (nhập ở trang thanh toán) — Bước GHN
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_name         VARCHAR(255);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_phone        VARCHAR(20);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_address       TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghn_province_id    INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghn_province_name  VARCHAR(255);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghn_district_id    INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghn_district_name  VARCHAR(255);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghn_ward_code      VARCHAR(20);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghn_ward_name      VARCHAR(255);
    -- Thông tin shop tạo đơn giao (SellerShipModal)
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_weight   INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_length   INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_width    INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_height   INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_tracking VARCHAR(50);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at    TIMESTAMPTZ;

    -- Chat buyer-shop — 1 luồng chat theo cặp (shop_id, buyer_wallet), CHỈ tạo được nếu buyer
    -- đã từng mua hàng của shop đó (kiểm tra ở tầng API khi POST, không ràng buộc ở DB).
    CREATE TABLE IF NOT EXISTS messages (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      buyer_wallet  VARCHAR(42) NOT NULL,
      sender        VARCHAR(10) NOT NULL CHECK (sender IN ('buyer','shop')),
      content       TEXT,
      image_cid     VARCHAR(255),
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      CHECK (content IS NOT NULL OR image_cid IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(shop_id, buyer_wallet, created_at);

    -- Bắc cầu CCTP (buyer trả từ Ethereum/Base/Arbitrum/OP Sepolia -> Arc) — cctp-relayer.ts
    -- bridge_status: pending (đang chờ attestation) -> minted (đã mint trên Arc) -> paid (đã nộp escrow) / failed
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS bridge_status        VARCHAR(20);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS bridge_source_domain INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS bridge_burn_tx_hash  VARCHAR(66);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS bridge_mint_tx_hash  VARCHAR(66);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS bridge_error         TEXT;

    -- Thời gian bảo hành mặc định của sản phẩm (listing) — trước đây chỉ có ở "Tạo đơn thủ công",
    -- khiến đơn mua trực tiếp từ 1 sản phẩm đã đăng luôn bị hard-code warranty_days=0 (xem listings.ts,
    -- route POST /:id/buy). Thêm cột này để shop khai báo 1 lần khi đăng sản phẩm.
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS warranty_days INTEGER DEFAULT 0;

    -- Shop trả lời đánh giá của buyer (Bước 40)
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS shop_reply      TEXT;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS shop_replied_at TIMESTAMPTZ;
  `);
  console.log("✅ DB schema ready");
}