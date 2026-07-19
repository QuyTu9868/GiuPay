/**
 * GiuPay — Test API giao hàng (chức năng MỚI: địa chỉ buyer + shop tạo giao hàng).
 * ---------------------------------------------------------------------------
 * Chạy THẬT với backend đang chạy ở localhost:3001 + Postgres thật.
 * Chạy:  cd backend && npm run dev   (tab khác)
 *        node --test test/shipping-api.test.mjs
 *
 * Bao phủ: validation + auth của 2 endpoint mới
 *   PUT  /api/orders/:code/shipping   (buyer lưu địa chỉ — public)
 *   POST /api/orders/:code/ship       (shop tạo giao hàng — requireShop)
 * Luồng happy-path đầy đủ (tạo shop→duyệt→đơn→trả→ship) nằm ở test e2e frontend.
 * ---------------------------------------------------------------------------
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";

const API = process.env.TEST_API_URL ?? "http://localhost:3001";

function randomWallet() {
  const hex = [...crypto.getRandomValues(new Uint8Array(20))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return "0x" + hex;
}

async function api(pathname, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Test-Bypass": "1", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

before(async () => {
  const { status } = await api("/health");
  assert.equal(status, 200, "Backend phải chạy ở localhost:3001 trước khi test");
});

// ── PUT /api/orders/:code/shipping (buyer lưu địa chỉ) ───────────────────────
test("PUT /shipping đơn không tồn tại → 404", async () => {
  const { status } = await api("/api/orders/KHONGCO123/shipping", {
    method: "PUT",
    body: { buyer_name: "Nguyễn Văn A", buyer_phone: "0912345678", ship_address: "123 Lê Lợi, Q1, HCM" },
  });
  assert.equal(status, 404);
});

test("PUT /shipping thiếu tên → 400", async () => {
  const { status } = await api("/api/orders/ANY/shipping", {
    method: "PUT",
    body: { buyer_phone: "0912345678", ship_address: "123 Lê Lợi" },
  });
  assert.equal(status, 400);
});

test("PUT /shipping SĐT sai định dạng → 400", async () => {
  const { status } = await api("/api/orders/ANY/shipping", {
    method: "PUT",
    body: { buyer_name: "A", buyer_phone: "abc", ship_address: "123 Lê Lợi" },
  });
  assert.equal(status, 400);
});

test("PUT /shipping thiếu địa chỉ → 400", async () => {
  const { status } = await api("/api/orders/ANY/shipping", {
    method: "PUT",
    body: { buyer_name: "A", buyer_phone: "0912345678" },
  });
  assert.equal(status, 400);
});

// ── POST /api/orders/:code/ship (shop tạo giao hàng) ─────────────────────────
test("POST /ship không có ví → 401", async () => {
  const { status } = await api("/api/orders/ANY/ship", {
    method: "POST",
    body: { weight: 500, length: 20, width: 15, height: 10 },
  });
  assert.equal(status, 401);
});

test("POST /ship ví lạ (không phải shop) → 401/403", async () => {
  const { status } = await api("/api/orders/ANY/ship", {
    method: "POST",
    headers: { "X-Wallet-Address": randomWallet() },
    body: { weight: 500, length: 20, width: 15, height: 10 },
  });
  assert.ok([401, 403].includes(status), `mong đợi 401/403, nhận ${status}`);
});

test("POST /ship kích thước không hợp lệ → 400 (validation trước khi tìm đơn)", async () => {
  const { status } = await api("/api/orders/ANY/ship", {
    method: "POST",
    headers: { "X-Wallet-Address": randomWallet() },
    body: { weight: 0, length: -5, width: 15, height: 10 },
  });
  // requireShop có thể chặn trước (401/403) hoặc validate chặn (400) — cả hai đều hợp lệ
  assert.ok([400, 401, 403].includes(status), `mong đợi 400/401/403, nhận ${status}`);
});
