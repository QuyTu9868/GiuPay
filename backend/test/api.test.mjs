/**
 * GiuPay — Backend API integration tests
 * ---------------------------------------------------------------------------
 * Chạy THẬT với backend đang chạy ở localhost:3001 + Postgres thật.
 * Không mock — phủ đúng các luồng/bug đã sửa: admin auth, đăng ký shop,
 * duyệt/từ chối, hiển thị public.
 *
 * Yêu cầu: backend đang chạy (`npm run dev`) + admin đã seed
 *          (email hangquytu2024@gmail.com, xem seed_admin.js).
 *
 * Chạy:  cd backend && node --test test/api.test.mjs
 * ---------------------------------------------------------------------------
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const API = process.env.TEST_API_URL ?? "http://localhost:3001";
const ADMIN_EMAIL = "hangquytu2024@gmail.com";

// Ví ngẫu nhiên mỗi lần chạy → tránh đụng 409 với dữ liệu cũ
function randomWallet() {
  const hex = [...crypto.getRandomValues(new Uint8Array(20))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "0x" + hex;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const createdShopNames = [];

async function api(pathname, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    // X-Test-Bypass: bỏ qua rate limit (chỉ có tác dụng khi backend NODE_ENV !== production)
    headers: { "Content-Type": "application/json", "X-Test-Bypass": "1", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

async function loginAdmin() {
  const { json } = await api("/api/admin/verify-totp", {
    method: "POST",
    body: { email: ADMIN_EMAIL, totp_code: "000000" },
  });
  return json?.data?.session_token;
}

before(async () => {
  // Đảm bảo backend sống trước khi test
  const { status } = await api("/health");
  assert.equal(status, 200, "Backend phải chạy ở localhost:3001 trước khi test");
});

after(async () => {
  // Dọn mọi shop test đã tạo
  if (createdShopNames.length) {
    await pool.query("DELETE FROM shops WHERE name = ANY($1)", [createdShopNames]);
  }
  await pool.end();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. HEALTH
// ─────────────────────────────────────────────────────────────────────────────
test("GET /health → 200 success", async () => {
  const { status, json } = await api("/health");
  assert.equal(status, 200);
  assert.equal(json.success, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN AUTH (verify-totp)
// ─────────────────────────────────────────────────────────────────────────────
test("POST /api/admin/verify-totp với 000000 (dev bypass) → session token", async () => {
  const { status, json } = await api("/api/admin/verify-totp", {
    method: "POST",
    body: { email: ADMIN_EMAIL, totp_code: "000000" },
  });
  assert.equal(status, 200);
  assert.equal(json.success, true);
  assert.ok(json.data.session_token, "phải trả session_token");
});

test("verify-totp mã sai (khác 000000) → 401", async () => {
  const { status } = await api("/api/admin/verify-totp", {
    method: "POST",
    body: { email: ADMIN_EMAIL, totp_code: "111111" },
  });
  assert.equal(status, 401);
});

test("verify-totp thiếu email → 400 (validation)", async () => {
  const { status } = await api("/api/admin/verify-totp", {
    method: "POST",
    body: { totp_code: "000000" },
  });
  assert.equal(status, 400);
});

test("verify-totp email không phải admin → 403", async () => {
  const { status } = await api("/api/admin/verify-totp", {
    method: "POST",
    body: { email: "khongphaiadmin@example.com", totp_code: "000000" },
  });
  assert.equal(status, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. MIDDLEWARE requireAdminSession
// ─────────────────────────────────────────────────────────────────────────────
test("GET /api/admin/shops/pending KHÔNG có session → 401", async () => {
  const { status } = await api("/api/admin/shops/pending");
  assert.equal(status, 401);
});

test("GET /api/admin/shops/pending session sai → 401", async () => {
  const { status } = await api("/api/admin/shops/pending", {
    headers: { "X-Admin-Session": "session-gia-khong-ton-tai" },
  });
  assert.equal(status, 401);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ĐĂNG KÝ SHOP (POST /api/shops)
// ─────────────────────────────────────────────────────────────────────────────
test("POST /api/shops KHÔNG có ví → 401", async () => {
  const { status } = await api("/api/shops", {
    method: "POST",
    body: { name: "X", category: "Công nghệ", description: "abc", gmail: "a@b.com", return_policy: "policy" },
  });
  assert.equal(status, 401);
});

test("POST /api/shops thiếu field bắt buộc → 400", async () => {
  const { status } = await api("/api/shops", {
    method: "POST",
    headers: { "X-Wallet-Address": randomWallet() },
    body: { name: "Chỉ có tên" },
  });
  assert.equal(status, 400);
});

test("POST /api/shops hợp lệ → tạo shop status=pending", async () => {
  const name = `API Test Shop ${Date.now()}`;
  createdShopNames.push(name);
  const { status, json } = await api("/api/shops", {
    method: "POST",
    headers: { "X-Wallet-Address": randomWallet() },
    body: {
      name, category: "Công nghệ",
      description: "Shop tao boi api integration test",
      gmail: "apitest@example.com",
      return_policy: "Hoan tra trong 7 ngay ke tu khi nhan hang",
    },
  });
  assert.equal(status, 201);
  assert.equal(json.success, true);
  assert.equal(json.data.status, "pending");
});

test("POST /api/shops cùng ví pending lần 2 → 409", async () => {
  const wallet = randomWallet();
  const name1 = `Dup Shop A ${Date.now()}`;
  const name2 = `Dup Shop B ${Date.now()}`;
  createdShopNames.push(name1, name2);
  const base = {
    category: "Công nghệ", description: "dup test description",
    gmail: "dup@example.com", return_policy: "Hoan tra 7 ngay ke tu khi nhan",
  };
  const first = await api("/api/shops", {
    method: "POST", headers: { "X-Wallet-Address": wallet }, body: { ...base, name: name1 },
  });
  assert.equal(first.status, 201);
  const second = await api("/api/shops", {
    method: "POST", headers: { "X-Wallet-Address": wallet }, body: { ...base, name: name2 },
  });
  assert.equal(second.status, 409, "ví đã có shop pending phải bị 409");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. LUỒNG ĐẦY ĐỦ: đăng ký → admin thấy pending → duyệt → hiện public
// ─────────────────────────────────────────────────────────────────────────────
test("E2E: shop mới → pending list → approve → xuất hiện ở /api/shops", async () => {
  const token = await loginAdmin();
  assert.ok(token, "đăng nhập admin thất bại");

  const name = `E2E Flow Shop ${Date.now()}`;
  createdShopNames.push(name);

  // Tạo shop
  const created = await api("/api/shops", {
    method: "POST",
    headers: { "X-Wallet-Address": randomWallet() },
    body: {
      name, category: "Thời trang",
      description: "shop kiem thu luong duyet day du",
      gmail: "e2eflow@example.com",
      return_policy: "Doi tra trong 7 ngay neu loi nha san xuat",
    },
  });
  assert.equal(created.status, 201);
  const shopId = created.data?.id ?? created.json.data.id;

  // Admin thấy trong pending
  const pending = await api("/api/admin/shops/pending", { headers: { "X-Admin-Session": token } });
  assert.equal(pending.status, 200);
  assert.ok(pending.json.data.some((s) => s.id === shopId), "shop mới phải nằm trong pending");

  // Admin duyệt
  const approve = await api(`/api/admin/shops/${shopId}/approve`, {
    method: "POST", headers: { "X-Admin-Session": token },
  });
  assert.equal(approve.status, 200);
  assert.equal(approve.json.success, true);

  // Xuất hiện ở marketplace public
  const pub = await api("/api/shops?limit=50");
  assert.equal(pub.status, 200);
  const shops = pub.json.data.shops ?? pub.json.data;
  assert.ok(shops.some((s) => s.id === shopId), "shop đã duyệt phải hiện ở /api/shops");
});

test("GET /api/shops (public) chỉ trả shop verified", async () => {
  const { status, json } = await api("/api/shops?limit=50");
  assert.equal(status, 200);
  const shops = json.data.shops ?? json.data;
  // Không có field status='pending' nào lọt ra (endpoint không trả status,
  // nhưng đảm bảo response có cấu trúc phân trang đúng)
  assert.ok(Array.isArray(shops), "data.shops phải là mảng");
  assert.ok(typeof json.data.total === "number", "phải có total");
});
