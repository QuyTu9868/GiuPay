"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import { T } from "@/lib/tokens";
import { DEMO_SHOPS_DATA, WARRANTY_BY_CATEGORY } from "@/lib/demo-shops";
import { coverImage } from "@/lib/coverImage";
import { ROUTES } from "@/lib/app-routes";
import {
  MagnifyingGlass, Sparkle, ShieldCheck, Package,
} from "@phosphor-icons/react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  description: string;
  priceUsdc: string;
  shopId: string;
  shopName: string;
  category: string;
  warrantyDays: number;
  isDemo: boolean; // false = shop thật, "Mua ngay" tạo đơn thật qua /api/listings/:id/buy
  imageCid?: string | null; // chỉ sản phẩm thật mới có — demo luôn dùng coverImage()
}

// ── Data ───────────────────────────────────────────────────────────────────────
// WARRANTY_BY_CATEGORY giờ dùng chung từ @/lib/demo-shops (trang chi tiết sản phẩm cũng cần).

// 280 sản phẩm demo — LUÔN có mặt (baseline ổn định), cộng thêm sản phẩm thật bên dưới.
const DEMO_PRODUCTS: Product[] = Object.values(DEMO_SHOPS_DATA).flatMap(d =>
  d.listings.filter(l => l.isActive).map(l => ({
    id: l.id, name: l.name, description: l.description,
    priceUsdc: l.priceUsdc, shopId: d.shop.id, shopName: d.shop.name,
    category: d.shop.category,
    warrantyDays: WARRANTY_BY_CATEGORY[d.shop.category] ?? 14,
    isDemo: true,
  }))
);

// Sản phẩm thật — lấy danh sách shop verified rồi lấy listing của từng shop.
// CỘNG THÊM vào demo, không thay thế. Lỗi mạng/API rỗng → coi như chưa có sản phẩm thật.
async function fetchRealProducts(): Promise<Product[]> {
  try {
    const shopsRes  = await fetch(`${API}/api/shops?limit=50`);
    const shopsJson = await shopsRes.json();
    if (!shopsJson.success) return [];
    const shops: { id: string; name: string; category: string }[] = shopsJson.data?.shops ?? [];
    if (!shops.length) return [];

    const perShop = await Promise.all(shops.map(async (shop) => {
      try {
        const res  = await fetch(`${API}/api/listings/shop/${shop.id}`);
        const json = await res.json();
        if (!json.success) return [];
        return (json.data?.listings ?? []).map((l: any): Product => ({
          id: l.id, name: l.name, description: l.description ?? "",
          priceUsdc: l.price_usdc, shopId: shop.id, shopName: shop.name,
          category: shop.category,
          warrantyDays: WARRANTY_BY_CATEGORY[shop.category] ?? 14,
          isDemo: false,
          imageCid: l.image_cid ?? null,
        }));
      } catch {
        return [];
      }
    }));
    return perShop.flat();
  } catch {
    return [];
  }
}

const CATEGORIES_VI = ["Tất cả","Công nghệ","Thời trang","Đồ ăn & Thức uống","Làm đẹp","Sách","Nội thất","Đồ chơi & Mẹ bé"];
const CATEGORIES_EN = ["All","Technology","Fashion","Food & Drinks","Beauty","Books","Home & Living","Toys & Kids"];

// Ảnh sản phẩm — SVG placeholder local (coverImage), không gọi mạng
function productImg(id: string, category: string, w: number, h: number) {
  return coverImage(id, category, w, h);
}
const CATEGORY_EMOJI: Record<string, string> = {
  "Công nghệ":"💻","Thời trang":"👗","Đồ ăn & Thức uống":"🍜",
  "Làm đẹp":"✨","Sách":"📚","Nội thất":"🛋️","Đồ chơi & Mẹ bé":"🧸",
};

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:${T.canvas}; font-family:${T.fontSans}; color:${T.ink}; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; } button { font-family:inherit; cursor:pointer; border:none; background:none; }
  input { font-family:inherit; }
  @keyframes ap-fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ap-modal-in { from{opacity:0;transform:scale(0.97) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes ap-shimmer { 0%,100%{opacity:1} 50%{opacity:0.4} }
`;

// ── Product Modal đã bị xóa — bấm vào ProductCard giờ điều hướng thẳng sang trang chi tiết
// sản phẩm riêng (/shop/[shopId]/product/[listingId]), xem ProductCard bên dưới.

// ── Product Card ───────────────────────────────────────────────────────────────
// Style tĩnh của ProductCard — không phụ thuộc props/hover, nên tạo 1 lần ở module scope
// thay vì tạo lại object mới mỗi lần render × tới 280 card cùng lúc trên trang /products.
const pcImgWrapStyle: React.CSSProperties = { position:"relative", overflow:"hidden", height:140, borderBottom:`1px solid ${T.border}` };
const pcImgStyle: React.CSSProperties = { width:"100%", height:"100%", objectFit:"cover", display:"block" };
const pcEmojiStyle: React.CSSProperties = { position:"absolute", bottom:8, left:10, fontSize:20, backgroundColor:"rgba(255,255,255,0.88)", borderRadius:7, padding:"3px 8px", backdropFilter:"blur(4px)" };
const pcPriceStyle: React.CSSProperties = { position:"absolute", top:8, right:10, fontFamily:T.fontMono, fontSize:13, fontWeight:700, color:T.ink, backgroundColor:"rgba(255,255,255,0.92)", borderRadius:7, padding:"3px 9px", backdropFilter:"blur(4px)" };
const pcInfoStyle: React.CSSProperties = { padding:"14px 16px" };
const pcNameStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:13, fontWeight:600, color:T.ink, marginBottom:4, lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" } as React.CSSProperties;
const pcShopNameStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:11, color:T.inkMuted, marginBottom:10 };
const pcRowStyle: React.CSSProperties = { display:"flex", alignItems:"center", justifyContent:"space-between" };
const pcCategoryStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:11, color:T.inkMuted };
const pcWarrantyRowStyle: React.CSSProperties = { display:"flex", alignItems:"center", gap:4 };
const pcWarrantyTextStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:11, color:T.green.text };
const pcButtonBaseStyle: React.CSSProperties = { background:"none", borderRadius:12, padding:0, textAlign:"left", cursor:"pointer", transition:"border-color 150ms, background-color 150ms", overflow:"hidden", animation:"ap-fade-in 400ms ease-out both" };

function ProductCard({ product, isVi, onClick }: { product: Product; isVi: boolean; onClick: () => void }) {
  const emoji = CATEGORY_EMOJI[product.category] ?? "📦";
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...pcButtonBaseStyle,
        border: `1px solid ${hovered ? T.inkMuted : T.border}`,
        backgroundColor: hovered ? T.surfaceAlt : T.surface,
      }}
    >
      {/* Cover image — ảnh thật (IPFS) cho sản phẩm thật đã upload, fallback SVG demo */}
      <div style={pcImgWrapStyle}>
        <img
          src={product.imageCid ? `https://ipfs.io/ipfs/${product.imageCid}` : productImg(product.id, product.category, 300, 140)}
          alt={product.name}
          style={pcImgStyle}
          onError={e => {
            const img = e.target as HTMLImageElement;
            if (img.src.startsWith("data:")) return;
            img.src = productImg(product.id, product.category, 300, 140);
          }}
        />
        <span style={pcEmojiStyle}>{emoji}</span>
        <span style={pcPriceStyle}>${parseFloat(product.priceUsdc).toFixed(2)}</span>
      </div>

      {/* Info */}
      <div style={pcInfoStyle}>
        <p style={pcNameStyle}>
          {product.name}
        </p>
        <p style={pcShopNameStyle}>{product.shopName}</p>
        <div style={pcRowStyle}>
          <span style={pcCategoryStyle}>{isVi ? product.category : (CATEGORIES_EN[CATEGORIES_VI.indexOf(product.category)] ?? product.category)}</span>
          <div style={pcWarrantyRowStyle}>
            <ShieldCheck size={11} color={T.green.text} weight="fill" />
            <span style={pcWarrantyTextStyle}>
              {product.warrantyDays >= 365 ? `${product.warrantyDays / 365}y` : `${product.warrantyDays}d`}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { lang } = useTheme();
  const isVi = lang === "vi";

  const [catIdx, setCatIdx]       = useState(0);
  const [search, setSearch]       = useState("");

  // Demo (280 sản phẩm, luôn có ngay) + sản phẩm thật (cộng thêm khi tải xong, không thay thế).
  const { data: realProducts = [] } = useQuery({
    queryKey: ["real-products"],
    queryFn: fetchRealProducts,
  });
  const ALL_PRODUCTS = [...DEMO_PRODUCTS, ...realProducts];
  const totalShops = new Set(ALL_PRODUCTS.map(p => p.shopId)).size;

  const filtered = ALL_PRODUCTS.filter(p => {
    const matchCat  = catIdx === 0 || p.category === CATEGORIES_VI[catIdx];
    const matchSrch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.shopName.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSrch;
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {/* NavBar giờ render 1 lần trong _app.tsx — không remount mỗi lần chuyển trang */}
      <main style={{ minHeight:"100dvh", backgroundColor:T.canvas, paddingTop:56 }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"44px 28px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom:32 }}>
            <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:10 }}>
              {isVi ? "Marketplace" : "Marketplace"}
            </span>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
              <div>
                <h1 style={{ fontFamily:T.fontSans, fontSize:"clamp(22px,3.5vw,34px)", fontWeight:700, letterSpacing:"-0.04em", color:T.ink, lineHeight:1.1 }}>
                  {isVi ? "Tất cả sản phẩm" : "All products"}
                </h1>
                <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, marginTop:6 }}>
                  {isVi ? `${ALL_PRODUCTS.length} sản phẩm từ ${totalShops} shop` : `${ALL_PRODUCTS.length} products from ${totalShops} shops`}
                </p>
              </div>

              {/* Search */}
              <div style={{ position:"relative" }}>
                <MagnifyingGlass size={13} color={T.inkMuted} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                <input
                  type="text"
                  placeholder={isVi ? "Tìm sản phẩm hoặc shop..." : "Search products or shops..."}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink, backgroundColor:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"9px 14px 9px 32px", outline:"none", width:240, transition:"border-color 150ms" }}
                  onFocus={e => (e.target.style.borderColor = T.ink)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:28 }}>
            {CATEGORIES_VI.map((cat, idx) => {
              const label = isVi ? cat : CATEGORIES_EN[idx];
              const active = idx === catIdx;
              return (
                <button
                  key={idx}
                  onClick={() => setCatIdx(idx)}
                  style={{
                    flexShrink:0, fontFamily:T.fontSans, fontSize:12,
                    fontWeight: active ? 600 : 400,
                    color: active ? T.canvas : T.inkMuted,
                    backgroundColor: active ? T.ink : T.surface,
                    border:`1px solid ${active ? T.ink : T.border}`,
                    borderRadius:9999, padding:"6px 14px", transition:"all 150ms",
                  }}
                >
                  {idx > 0 ? `${CATEGORY_EMOJI[CATEGORIES_VI[idx]]} ` : ""}{label}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div style={{ padding:"80px 24px", textAlign:"center", border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface }}>
              <Package size={32} color={T.border} weight="duotone" />
              <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, marginTop:12 }}>
                {isVi ? "Không tìm thấy sản phẩm" : "No products found"}
                {search && <strong style={{ color:T.ink }}> "{search}"</strong>}
              </p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:14 }}>
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} isVi={isVi} onClick={() => { window.location.href = ROUTES.product(p.shopId, p.id); }} />
              ))}
            </div>
          )}

          {/* Demo notice */}
          <div style={{ marginTop:48, display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
            <Sparkle size={13} color={T.inkMuted} weight="fill" />
            <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted }}>
              {isVi ? "Sản phẩm có nhãn Demo (xem chi tiết) sẽ mô phỏng giao dịch, không chuyển USDC thật — sản phẩm còn lại thanh toán bằng USDC thật qua escrow." : "Products marked Demo (see detail) simulate the transaction, no real USDC moves — other products use real USDC via escrow."}
            </span>
          </div>
        </div>
      </main>
    </>
  );
}
