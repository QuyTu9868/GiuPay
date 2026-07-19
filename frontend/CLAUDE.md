# GiuPay — Claude Code Instructions

## Dự án là gì
GiuPay là một decentralized payment dApp trên Arc Testnet (Chain ID: 5042002).
Seller tạo đơn hàng → sinh QR → Buyer thanh toán USDC → tiền vào escrow 14 ngày → tự động giải phóng.

---

## Tech Stack
- **Frontend**: Next.js (Pages Router), React, TypeScript
- **Wallet**: RainbowKit + wagmi + viem
- **Auth**: Auth0 (@auth0/nextjs-auth0)
- **Backend**: Node.js + Express + PostgreSQL (port 3001)
- **Blockchain**: Arc Testnet, USDC native, Circle CCTP
- **Storage**: Pinata IPFS
- **Email**: Nodemailer + Gmail

---

## Cấu trúc thư mục

```
giupay-frontend/
├── src/
│   ├── app/              ← Next.js App Router (chỉ route wrapper + providers)
│   │   ├── api/auth/[auth0]/route.ts
│   │   ├── layout.tsx
│   │   └── providers.tsx
│   ├── pages/            ← Trang thật (XxxPage.tsx)
│   │   ├── HomePage.tsx
│   │   ├── SelectAccountPage.tsx
│   │   ├── RegisterShopPage.tsx
│   │   ├── ShopPublicPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CreateOrderPage.tsx
│   │   ├── PaymentPage.tsx
│   │   ├── AdminDashboardPage.tsx
│   │   ├── ReviewPage.tsx
│   │   ├── profile.tsx
│   │   └── pending.tsx
│   ├── components/       ← Component dùng chung
│   │   ├── NavBar.tsx        ← Full navbar (ConnectButton + lang toggle)
│   │   ├── NavBarMinimal.tsx ← Back button navbar cho inner pages
│   │   ├── Field.tsx
│   │   └── GlobalCSS.tsx
│   ├── hooks/
│   │   ├── useWallet.ts      ← wagmi wrapper
│   │   └── useReveal.ts
│   └── lib/
│       ├── i18n.ts           ← Từ điển vi/en (NGUỒN DUY NHẤT cho text)
│       ├── theme.ts          ← ThemeProvider: dark/light + lang state
│       ├── tokens.ts         ← Design tokens T (màu, font)
│       ├── types.ts          ← TypeScript interfaces
│       ├── utils.ts          ← formatUSDC, shortenAddr, timeAgo
│       ├── wagmi.config.ts   ← Arc Testnet chain config
│       └── app-routes.ts     ← Route constants
```

---

## Contract Addresses (Arc Testnet)

```
# Cập nhật 2026-07-19: redeploy WarrantySBT (đổi tên on-chain "ArcPay Warranty SBT (ARCW)" -> "GiuPay Warranty SBT (GIUW)")
USDC:          0x3600000000000000000000000000000000000000
ShopRegistry:  0x6E18Ba8Ce0841Ff58831629a5dd34AE37932cd6b
PaymentEscrow: 0x38800A873C6bC877E025529D0798ae57cBFAaA69
WarrantySBT:   0x2460C32eDA3134bCF3e284455Ed64d8c68F831C9
```

> Địa chỉ cũ (KHÔNG dùng nữa):
> ShopRegistry 0x8a3a60e01a2D05CC97ba1a14065a9a98e85D7415 · PaymentEscrow 0x25C7aa6Bf2481c21b33c7122E100BC263Bfa76e4 (bug khóa tiền) · WarrantySBT 0xdEbE0367cFC3CEabd29217084e115150224C5BeA, 0xd063BDE77185bf2b23E701eF3430722a94280896 (tên "ArcPay Warranty SBT")

---

## Quy tắc bắt buộc

### i18n
- **KHÔNG** hardcode text tiếng Anh hay tiếng Việt trong component
- **LUÔN** dùng `const { t, lang } = useTheme()` rồi dùng `t.keyName`
- Thêm key mới → thêm vào **cả hai** `vi` và `en` trong `src/lib/i18n.ts`
- `lang === "vi"` để check ngôn ngữ hiện tại nếu cần inline logic

### NavBar
- Trang chủ và dashboard → dùng `import { NavBar } from "@/components/NavBar"`
- Inner pages (register, pay, review...) → dùng `import { NavBarMinimal } from "@/components/NavBarMinimal"`
- **KHÔNG** định nghĩa NavBar inline trong từng page

### Wallet
- Dùng `import { useWallet } from "@/hooks/useWallet"` — không gọi wagmi trực tiếp trong page
- Dùng `ConnectButton.Custom` từ RainbowKit cho wallet UI

### Design Tokens
- Dùng `import { T } from "@/lib/tokens"` cho màu sắc, font
- **KHÔNG** hardcode màu hex trong component

### Smart Contract
- ABI và địa chỉ contract để trong `src/lib/`
- **KHÔNG** định nghĩa ABI trong component

---

## Design System

```
T.canvas    = "#FBFBFA"  // nền trang
T.surface   = "#FFFFFF"  // nền card
T.surfaceAlt= "#F7F6F3"  // input, badge
T.border    = "#EAEAEA"  // border
T.ink       = "#111111"  // text chính
T.inkMid    = "#37352F"  // text secondary
T.inkMuted  = "#787774"  // text muted
T.green     = { bg: "#EDF3EC", text: "#346538" }
T.blue      = { bg: "#E1F3FE", text: "#1F6C9F" }
T.yellow    = { bg: "#FBF3DB", text: "#956400" }
T.red       = { bg: "#FDEBEC", text: "#9F2F2D" }
T.fontSans  = "'Geist Sans', 'SF Pro Display', sans-serif"
T.fontMono  = "'Geist Mono', 'SF Mono', monospace"
```

---

## Nguyên tắc làm việc

1. **Chỉ sửa đúng những gì được yêu cầu** — không tự refactor hay thêm tính năng
2. **Hỏi trước khi làm** nếu thấy vấn đề ở chỗ khác
3. **Giữ nguyên logic hiện có** — chỉ thay text hardcode thành `t.key`
4. **Chạy `npm run build`** để kiểm tra TypeScript trước khi báo xong
5. Nếu cần thêm translation key → thêm vào `i18n.ts` cùng lúc với code

---

## Lỗi thường gặp & cách fix

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `Cannot read properties of undefined (reading 'replace')` | Gọi method trên `t.key` khi `t` chưa load | Dùng `lang === "vi" ? "..." : "..."` thay vì `.replace()` |
| Navbar không hiện trạng thái ví | Page dùng NavBar inline thay vì import từ components | Xóa NavBar inline, dùng `import { NavBar }` |
| `t.xxx` là undefined | Key chưa có trong `i18n.ts` | Thêm key vào cả `vi` và `en` trong `i18n.ts` |

---

## Env Variables cần có

```env
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ESCROW_CONTRACT=0x25C7aa6Bf2481c21b33c7122E100BC263Bfa76e4
NEXT_PUBLIC_SBT_CONTRACT=0x2460C32eDA3134bCF3e284455Ed64d8c68F831C9
NEXT_PUBLIC_USDC_CONTRACT=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_SHOP_REGISTRY_CONTRACT=0x8a3a60e01a2D05CC97ba1a14065a9a98e85D7415
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_API_URL=http://localhost:3001
AUTH0_SECRET=...
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://giupay-dapp.us.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
```
