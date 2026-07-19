# GiuPay — Tiến trình Build
> Cập nhật: Bước 16 đang hoàn thiện (wagmi/RainbowKit setup xong, đang fix routing)

---

## Tổng quan 7 giai đoạn

| Giai đoạn | Bước | Trạng thái |
|---|---|---|
| 1 — Chuẩn bị môi trường | 1–3 | ✅ Xong |
| 2 — Smart Contracts | 4–8 | ✅ Xong |
| 3 — Backend API | 9–13 | ✅ Xong |
| 4 — Backend Bot | 14–15 | ✅ Xong |
| 5 — Frontend | 16–24 | 🔄 Đang làm (16 xong, 17–23 xong, 24 còn) |
| 6 — Bảo mật | 25–26 | ⬜ Chưa làm |
| 7 — Test & Hoàn thiện | 27–28 | ⬜ Chưa làm |

---

## Chi tiết từng bước

### Giai đoạn 1 — Chuẩn bị
- Bước 1: Cài Node.js, Hardhat, MetaMask, VS Code ✅
- Bước 2: Cấu hình Arc Testnet vào MetaMask + lấy USDC testnet ✅
- Bước 3: Khởi tạo project structure ✅

### Giai đoạn 2 — Smart Contracts
- Bước 4: ShopRegistry.sol ✅ → `0x8a3a60e01a2D05CC97ba1a14065a9a98e85D7415`
- Bước 5: PaymentEscrow.sol ✅ → `0x25C7aa6Bf2481c21b33c7122E100BC263Bfa76e4`
- Bước 6: WarrantySBT.sol ✅ → `0xdEbE0367cFC3CEabd29217084e115150224C5BeA`
- Bước 7: Test cases ✅
- Bước 8: Deploy Arc Testnet ✅ (Chain ID: 5042002)

**Contract addresses đã deploy:**
```
USDC:          0x3600000000000000000000000000000000000000
ShopRegistry:  0x8a3a60e01a2D05CC97ba1a14065a9a98e85D7415
PaymentEscrow: 0x25C7aa6Bf2481c21b33c7122E100BC263Bfa76e4
WarrantySBT:   0xdEbE0367cFC3CEabd29217084e115150224C5BeA
```

### Giai đoạn 3 — Backend API
- Bước 9: Node.js + Express + PostgreSQL ✅
- Bước 10: Auth0 Admin login + TOTP 2FA ✅
- Bước 11: API shops (CRUD) ✅
- Bước 12: API orders + gen QR ✅
- Bước 13: IPFS (Pinata) + Gmail (Nodemailer) ✅

### Giai đoạn 4 — Backend Bot
- Bước 14: Bot burn SBT + release escrow (cron job) ✅
- Bước 15: Bot backup + cảnh báo gas ✅ (trong bot.ts)

### Giai đoạn 5 — Frontend
- Bước 16: wagmi/RainbowKit setup 🔄
  - providers.tsx ✅
  - wagmi.config.ts ✅
  - useWallet.ts ✅
  - Auth0 route handler ✅ (`src/app/api/auth/[auth0]/route.ts`)
  - next.config.js ✅ (webpack aliases cho async-storage, pino-pretty)
  - Route files ✅ (9 file bridge trong pages/)
  - TODO: replace simulateWalletConnect() → wagmi useConnect()
- Bước 17: HomePage.tsx ✅ (mock data, client filter, stats)
- Bước 18: SelectAccountPage.tsx ✅ (Auth0 stub, 4 wallets)
- Bước 19: RegisterShopPage.tsx ✅ (3-step form, real upload)
- Bước 20: ShopPublicPage.tsx ✅ (mock data, orders + reviews)
- Bước 21: DashboardPage.tsx ✅ (stats bento, escrow countdown)
- Bước 22: CreateOrderPage.tsx ✅ (form + live preview + QR)
- Bước 23: PaymentPage.tsx ✅ (CCTP bridge flow, mock)
- Bước 24: AdminDashboardPage.tsx ✅ (Auth0 + TOTP 2FA)
- ReviewPage.tsx ✅ (rating 1-5 sao, onchain submit)

---

## TODOs còn lại trước khi test

### Replace stubs → real (sau khi wagmi hoạt động)
- [ ] `simulateWalletConnect()` → wagmi `useConnect()`
- [ ] `MOCK_SHOPS`, `MOCK_ORDER`, `MOCK_STATS` → real `fetch()` calls
- [ ] `"0xMOCK_WALLET_ADDRESS"` → `useAccount().address`
- [ ] Add `X-Wallet-Address` header vào mọi authenticated request
- [ ] `withAuthenticationRequired()` cho protected routes (dashboard, create-order, admin)

### Fix hiện tại cần làm
- [ ] `next.config.js` webpack alias async-storage stub
- [ ] Route files (9 file bridge) copy vào `src/pages/`
- [ ] `.env.local` đủ AUTH0_SECRET, AUTH0_BASE_URL

---

## Cây file Backend

```
backend/
├── src/
│   ├── server.ts        ✅ Express app, rate limit, CORS, helmet
│   ├── db.ts            ✅ PostgreSQL pool + initDB() schema
│   ├── types.ts         ✅ OrderStatus, ShopStatus, interfaces
│   ├── orders.ts        ✅ CRUD orders, dispute, QR gen
│   ├── upload.ts        ✅ Pinata IPFS + Nodemailer Gmail
│   ├── admin.ts         ✅ Auth0 JWT + TOTP + shop approve/reject
│   └── bot.ts           ✅ Cron job: burn SBT, release escrow, alert
├── prisma/
│   └── schema.prisma    ✅ Shop, Order, Dispute, Review, AdminLog
├── package.json         ✅ tất cả dependencies
├── tsconfig.json        ✅ CommonJS, Node10
└── .env                 ✅ (example — không commit)
```

**Backend API routes:**
```
GET    /health
POST   /api/orders
GET    /api/orders
GET    /api/orders/:code
GET    /api/orders/:code/qr
PUT    /api/orders/:code/status
POST   /api/orders/:code/dispute
GET    /api/orders/:code/dispute
PUT    /api/orders/:code/dispute/:id/resolve
POST   /api/upload/image
POST   /api/upload/doc
POST   /api/admin/verify-totp
GET    /api/admin/shops/pending
GET    /api/admin/shops/verified
POST   /api/admin/shops/:id/approve
POST   /api/admin/shops/:id/reject
GET    /api/admin/disputes
GET    /api/admin/settings/fee-wallet
POST   /api/admin/settings/fee-wallet
```

---

## Cây file Frontend

```
giupay-frontend/
├── public/
│   └── logo.png              (cần thêm)
│
├── src/
│   ├── app/                  ← Next.js App Router (layout only)
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [auth0]/
│   │   │           └── route.ts  ✅ Auth0 handler
│   │   ├── globals.css       ✅
│   │   ├── layout.tsx        ✅ UserProvider + Providers wrap
│   │   └── providers.tsx     ✅ wagmi + RainbowKit + QueryClient
│   │
│   ├── pages/                ← Actual page components
│   │   ├── index.tsx         ✅ → HomePage
│   │   ├── select-account.tsx✅ → SelectAccountPage
│   │   ├── register.tsx      ✅ → RegisterShopPage
│   │   ├── shop/
│   │   │   └── [id].tsx      ✅ → ShopPublicPage
│   │   ├── dashboard/
│   │   │   ├── index.tsx     ✅ → DashboardPage
│   │   │   └── create-order.tsx ✅ → CreateOrderPage
│   │   ├── pay/
│   │   │   └── [code].tsx    ✅ → PaymentPage
│   │   ├── admin/
│   │   │   └── index.tsx     ✅ → AdminDashboardPage
│   │   ├── review/
│   │   │   └── [code].tsx    ✅ → ReviewPage
│   │   ├── HomePage.tsx      ✅ Step 17
│   │   ├── SelectAccountPage.tsx ✅ Step 18
│   │   ├── RegisterShopPage.tsx  ✅ Step 19
│   │   ├── ShopPublicPage.tsx    ✅ Step 20
│   │   ├── DashboardPage.tsx     ✅ Step 21
│   │   ├── CreateOrderPage.tsx   ✅ Step 22
│   │   ├── PaymentPage.tsx       ✅ Step 23
│   │   ├── AdminDashboardPage.tsx✅ Step 24
│   │   └── ReviewPage.tsx        ✅ Step 28
│   │
│   ├── components/
│   │   ├── NavBar.tsx        ✅ scroll effect, mobile drawer
│   │   ├── NavBarMinimal.tsx ✅ back button + StepDots
│   │   ├── Field.tsx         ✅ form field wrapper
│   │   └── GlobalCSS.tsx     ✅ CSS reset + animations
│   │
│   ├── hooks/
│   │   ├── useReveal.ts      ✅ IntersectionObserver scroll reveal
│   │   └── useWallet.ts      ✅ wagmi wrapper hook
│   │
│   ├── lib/
│   │   ├── tokens.ts         ✅ T design tokens (shared)
│   │   ├── types.ts          ✅ Shop, Order, Dispute interfaces
│   │   ├── utils.ts          ✅ formatUSDC, shortenAddr, timeAgo
│   │   ├── wagmi.config.ts   ✅ Arc Testnet chain config
│   │   ├── app-routes.ts     ✅ route constants
│   │   └── async-storage-stub.js ✅ fix MetaMask SDK on web
│   │
│   └── (next-env.d.ts)
│
├── next.config.js            ✅ webpack alias, transpile, images
├── package.json              ✅
├── tsconfig.json             ✅
└── .env.local                ✅ (không commit)
```

---

## Design System

**Dials:** VARIANCE 6 | MOTION 4 | DENSITY 4

**Token T (dùng chung toàn app):**
```ts
canvas:    "#FBFBFA"   // nền trang
surface:   "#FFFFFF"   // nền card
surfaceAlt:"#F7F6F3"   // nền input, badge
border:    "#EAEAEA"   // border mọi nơi
ink:       "#111111"   // text chính, button
inkMid:    "#37352F"   // text secondary
inkMuted:  "#787774"   // text muted, placeholder
green:  { bg: "#EDF3EC", text: "#346538" }
blue:   { bg: "#E1F3FE", text: "#1F6C9F" }
yellow: { bg: "#FBF3DB", text: "#956400" }
red:    { bg: "#FDEBEC", text: "#9F2F2D" }
fontSans: "'Geist Sans', 'SF Pro Display', sans-serif"
fontMono: "'Geist Mono', 'SF Mono', monospace"
```

---

## Bước tiếp theo (theo thứ tự ưu tiên)

1. **Fix routing** — copy 9 file bridge vào `src/pages/` (xem phần cây file)
2. **Fix webpack** — update `next.config.js` với async-storage alias
3. **Test trang chủ** lên được → kiểm tra từng route
4. **Bước 25–26** — Security checklist 19 items
5. **Bước 27** — End-to-end test trên Arc Testnet
6. **Bước 28** — Hoàn thiện ReviewPage + replace mọi mock data

---

## .env.local cần đủ

```dotenv
# Blockchain
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ESCROW_CONTRACT=0x25C7aa6Bf2481c21b33c7122E100BC263Bfa76e4
NEXT_PUBLIC_SBT_CONTRACT=0xdEbE0367cFC3CEabd29217084e115150224C5BeA
NEXT_PUBLIC_USDC_CONTRACT=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_SHOP_REGISTRY_CONTRACT=0x8a3a60e01a2D05CC97ba1a14065a9a98e85D7415

# WalletConnect (dùng tạm project escrowmad)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Auth0
AUTH0_SECRET=random_32_char_hex
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://giupay-dapp.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_AUTH0_DOMAIN=giupay-dapp.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_client_id

# Backend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Key learnings

- `next.config.ts` không được support → luôn dùng `next.config.js`
- `@react-native-async-storage/async-storage` không install được trên web → dùng stub file + webpack alias
- `pino-pretty` (WalletConnect dep) → resolve.fallback: false trên browser
- Pages Router cần tên file = URL path → cần file bridge `index.tsx`, `[code].tsx`...
- Chain ID Arc Testnet: `5042002`, RPC: `https://rpc.testnet.arc.network`
- USDC trên Arc: `0x3600000000000000000000000000000000000000` (native system contract)
