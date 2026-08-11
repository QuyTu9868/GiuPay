"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import { MagnifyingGlass, Star, CheckCircle, Wallet } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";
import { useWallet } from "@/hooks/useWallet";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { coverImage } from "@/lib/coverImage";
import Link from "next/link";
import { DEMO_SHOPS_DATA } from "@/lib/demo-shops";

interface Shop {
  id:string; name:string; category:string;
  description:string; avgRating:number; totalOrders:number;
  descriptionEn?:string; logoCid?:string|null;
}

const CATEGORIES_VI = ["Tất cả","Công nghệ","Thời trang","Đồ ăn & Thức uống","Làm đẹp","Sách","Nội thất","Đồ chơi & Mẹ bé"];
const CATEGORIES_EN = ["All","Technology","Fashion","Food & Drinks","Beauty","Books","Home & Living","Toys & Kids"];
const CATEGORY_VI_TO_EN: Record<string,string> = Object.fromEntries(
  CATEGORIES_VI.slice(1).map((vi, i) => [vi, CATEGORIES_EN[i+1]])
);

// Derive từ DEMO_SHOPS_DATA (frontend/src/lib/demo-shops/data.ts) — nguồn duy nhất,
// khớp tự động với Homepage, /products và ShopPublicPage. Sửa data ở 1 nơi.
const DEMO_SHOPS: Shop[] = Object.values(DEMO_SHOPS_DATA).map(d => ({
  id: d.shop.id, name: d.shop.name, category: d.shop.category,
  description: d.shop.description, avgRating: d.shop.avgRating, totalOrders: d.shop.totalOrders,
}));

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Lọc shop demo theo danh mục/tìm kiếm — 28 shop demo LUÔN có mặt (baseline ổn định,
// không phụ thuộc mạng/DB), không bao giờ bị API thật thay thế hay ghi đè.
function filterDemoShops(categoryIdx: number, search: string): Shop[] {
  const isAll = categoryIdx === 0;
  return DEMO_SHOPS.filter(d => {
    const matchCat  = isAll || d.category === CATEGORIES_VI[categoryIdx];
    const matchSrch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSrch;
  });
}

// Shop thật (đã admin duyệt, status='verified') — CỘNG THÊM vào danh sách demo,
// không thay thế. Demo và shop thật hiện chung, không khác biệt gì về giao diện —
// khác biệt duy nhất là mức tương tác (mua thật/xem thôi), xử lý ở trang chi tiết
// shop (xem isDemoShop() trong ShopPublicPage.tsx), không phải ở trang danh sách này.
// Lỗi mạng/API rỗng → coi như không có shop thật nào, KHÔNG làm hỏng phần demo.
async function fetchRealShops(categoryIdx: number, search: string): Promise<Shop[]> {
  const params = new URLSearchParams({ limit: "50" });
  const isAll = categoryIdx === 0;
  if (!isAll) params.set("category", CATEGORIES_VI[categoryIdx]);
  if (search)  params.set("search", search);

  try {
    const res  = await fetch(`${API}/api/shops?${params}`);
    const json = await res.json();
    if (!json.success) return [];
    return (json.data?.shops ?? []).map((s: any): Shop => ({
      id: s.id, name: s.name, category: s.category,
      description: s.description ?? "", avgRating: parseFloat(s.avg_rating ?? "0"),
      totalOrders: s.total_orders ?? 0, logoCid: s.logo_cid ?? null,
    }));
  } catch {
    return [];
  }
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:${T.canvas}; font-family:${T.fontSans}; color:${T.ink}; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; } button { font-family:inherit; cursor:pointer; border:none; background:none; }
  input { font-family:inherit; }
  @keyframes ap-shimmer { 0%,100%{opacity:1} 50%{opacity:0.4} }
`;

function useReveal(threshold = 0.05) {
  const [visible, setVisible] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    obsRef.current?.disconnect();
    if (!node) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(node);
    obsRef.current = obs;
  }, [threshold]);
  return { ref, visible };
}

function revealStyle(visible: boolean, delay = 0): React.CSSProperties {
  return { opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(10px)", transition:`opacity 500ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${delay}ms` };
}

// Style tĩnh của ShopCard — hoist ra module scope, tránh tạo lại object mỗi lần render x 28 shop.
const scBaseStyle: React.CSSProperties = { display:"flex", flexDirection:"column", padding:0, border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, transition:"box-shadow 200ms, border-color 200ms", overflow:"hidden" };
const scCoverImgStyle: React.CSSProperties = { width:"100%", height:130, objectFit:"cover", display:"block" };
const scBodyStyle: React.CSSProperties = { padding:16, display:"flex", flexDirection:"column", flex:1 };
const scAvatarRowStyle: React.CSSProperties = { display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 };
const scAvatarStyle: React.CSSProperties = { width:32, height:32, borderRadius:6, flexShrink:0, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontSans, fontSize:11, fontWeight:700, color:T.ink };
const scNameColStyle: React.CSSProperties = { flex:1, minWidth:0 };
const scNameRowStyle: React.CSSProperties = { display:"flex", alignItems:"center", gap:5, marginBottom:4 };
const scNameStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:14, fontWeight:600, color:T.ink, letterSpacing:"-0.01em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" };
const scCategoryStyle: React.CSSProperties = { fontFamily:T.fontMono, fontSize:10, letterSpacing:"0.05em", textTransform:"uppercase", borderRadius:9999, padding:"2px 7px", backgroundColor:T.surfaceAlt, color:T.inkMuted };
const scDescStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, lineHeight:1.6, flex:1, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" } as React.CSSProperties;
const scFooterStyle: React.CSSProperties = { display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14, paddingTop:12, borderTop:`1px solid ${T.border}` };
const scRatingRowStyle: React.CSSProperties = { display:"flex", alignItems:"center", gap:4 };
const scRatingStyle: React.CSSProperties = { fontFamily:T.fontMono, fontSize:12, fontWeight:600, color:T.ink };
const scOrdersStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:12, color:T.inkMuted };

function ShopCard({ shop, index }: { shop:Shop; index:number }) {
  const { ref, visible } = useReveal(0.05);
  const { lang } = useTheme();
  const isVi     = lang === "vi";
  const initials = shop.name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
  const displayDesc = isVi ? shop.description : (shop.descriptionEn ?? shop.description);
  const displayCat  = isVi ? shop.category    : (CATEGORY_VI_TO_EN[shop.category] ?? shop.category);

  return (
    <Link ref={ref as any} href={`/shop/${shop.id}`} style={{ ...scBaseStyle, ...revealStyle(visible, index*60) }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor=T.inkMid; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor=T.border; }}
    >
      {/* Cover image — logo thật (IPFS) nếu shop đã upload, fallback SVG placeholder demo */}
      <img
        src={shop.logoCid ? `https://gateway.pinata.cloud/ipfs/${shop.logoCid}` : coverImage(shop.id, shop.category, 400, 130)}
        alt={shop.name}
        style={scCoverImgStyle}
        onError={e => {
          const img = e.target as HTMLImageElement;
          if (img.src.startsWith("data:")) return;
          img.src = coverImage(shop.id, shop.category, 400, 130);
        }}
      />
      <div style={scBodyStyle}>
        <div style={scAvatarRowStyle}>
          {/* Initials avatar */}
          <div style={scAvatarStyle}>{initials}</div>
          <div style={scNameColStyle}>
            <div style={scNameRowStyle}>
              <span style={scNameStyle}>{shop.name}</span>
              <CheckCircle size={13} color={T.green.text} weight="fill" />
            </div>
            <span style={scCategoryStyle}>{displayCat}</span>
          </div>
        </div>
        <p style={scDescStyle}>{displayDesc}</p>
        <div style={scFooterStyle}>
          <div style={scRatingRowStyle}>
            <Star size={12} color={T.yellow.text} weight="fill" />
            <span style={scRatingStyle}>{shop.avgRating.toFixed(1)}</span>
          </div>
          <span style={scOrdersStyle}>
            {shop.totalOrders.toLocaleString()} {lang === "vi" ? "đơn hàng" : "orders"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Wallet Guard — hiện khi chưa connect ──────────────────────────────────────
function WalletGate() {
  const { lang } = useTheme();
  const isVi = lang === "vi";

  return (
    <div style={{ minHeight:"60dvh", display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 28px" }}>
      <div style={{ maxWidth:420, width:"100%", textAlign:"center", border:`1px solid ${T.border}`, borderRadius:14, padding:"52px 36px", backgroundColor:T.surface }}>
        <div style={{ width:48, height:48, borderRadius:12, backgroundColor:T.surfaceAlt, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
          <Wallet size={22} color={T.inkMuted} weight="duotone" />
        </div>
        <h2 style={{ fontFamily:T.fontSans, fontSize:20, fontWeight:700, color:T.ink, letterSpacing:"-0.02em", marginBottom:10 }}>
          {isVi ? "Kết nối ví để tiếp tục" : "Connect wallet to continue"}
        </h2>
        <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, lineHeight:1.65, marginBottom:28 }}>
          {isVi
            ? "Bạn cần kết nối ví để khám phá danh sách cửa hàng đã xác minh trên GiuPay."
            : "You need to connect your wallet to explore verified shops on GiuPay."}
        </p>
        <ConnectButton.Custom>
          {({ openConnectModal, mounted }) => {
            if (!mounted) return null;
            return (
              <button onClick={openConnectModal} style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:8, padding:"12px 24px", border:"none", cursor:"pointer", transition:"background-color 150ms" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor="#333")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor=T.ink)}
              >
                <Wallet size={14} weight="fill" />
                {isVi ? "Kết nối ví" : "Connect Wallet"}
              </button>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </div>
  );
}

export default function ShopsPage() {
  const { lang } = useTheme();
  const { isConnected } = useWallet();
  const isVi = lang === "vi";
  const CATEGORIES = isVi ? CATEGORIES_VI : CATEGORIES_EN;

  const [categoryIdx, setCategoryIdx] = useState(0);
  const [search, setSearch]           = useState("");
  const { ref: headerRef, visible: headerVisible } = useReveal(0.01);

  // Demo (28 shop, luôn có ngay) + shop thật (cộng thêm khi tải xong, không thay thế).
  const demoShops = useMemo(() => filterDemoShops(categoryIdx, search), [categoryIdx, search]);
  const { data: realShops = [] } = useQuery({
    queryKey: ["real-shops", categoryIdx, search],
    queryFn: () => fetchRealShops(categoryIdx, search),
  });
  const shops = useMemo(() => [...demoShops, ...realShops], [demoShops, realShops]);
  const loading = false;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {/* NavBar giờ render 1 lần trong _app.tsx — không remount mỗi lần chuyển trang */}
      <main style={{ minHeight:"100dvh", backgroundColor:T.canvas, paddingTop:58 }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 28px 80px" }}>

          {/* Header */}
          <div ref={headerRef} style={{ marginBottom:32, ...revealStyle(headerVisible) }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <div>
                <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Marketplace</span>
                <h1 style={{ fontFamily:T.fontSans, fontSize:"clamp(22px,3vw,32px)", fontWeight:700, letterSpacing:"-0.03em", color:T.ink }}>
                  {isVi ? "Khám phá cửa hàng" : "Explore shops"}
                </h1>
              </div>
              <div style={{ position:"relative" }}>
                <MagnifyingGlass size={13} color={T.inkMuted} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={isVi ? "Tìm cửa hàng..." : "Search shops..."}
                  style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink, backgroundColor:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 12px 8px 30px", outline:"none", width:220, transition:"border-color 150ms" }}
                  onFocus={e => (e.target.style.borderColor=T.ink)}
                  onBlur={e => (e.target.style.borderColor=T.border)}
                />
              </div>
            </div>
          </div>

          {/* Banner nhỏ khi chưa kết nối ví — không block nội dung */}
          {!isConnected && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"10px 16px", borderRadius:10, border:`1px solid ${T.border}`, backgroundColor:T.surface, marginBottom:24, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Wallet size={14} color={T.inkMuted} weight="duotone" />
                <span style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted }}>
                  {isVi ? "Kết nối ví để mua hàng và thanh toán." : "Connect wallet to purchase and pay."}
                </span>
              </div>
              <ConnectButton.Custom>
                {({ openConnectModal, mounted }) => mounted ? (
                  <button onClick={openConnectModal} style={{ fontFamily:T.fontSans, fontSize:12, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"6px 14px", border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>
                    {isVi ? "Kết nối ví" : "Connect Wallet"}
                  </button>
                ) : null}
              </ConnectButton.Custom>
            </div>
          )}

          {/* Category tabs */}
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:28 }}>
            {CATEGORIES.map((cat, idx) => (
              <button key={idx} onClick={() => setCategoryIdx(idx)} style={{
                flexShrink:0, fontFamily:T.fontSans, fontSize:12,
                fontWeight:idx===categoryIdx?600:400,
                color:idx===categoryIdx?T.canvas:T.inkMuted,
                backgroundColor:idx===categoryIdx?T.ink:T.surface,
                border:`1px solid ${idx===categoryIdx?T.ink:T.border}`,
                borderRadius:9999, padding:"5px 13px", transition:"all 150ms",
              }}>{cat}</button>
            ))}
          </div>

          {/* Shop grid */}
          {loading ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:16 }}>
              {[...Array(6)].map((_,i) => (
                <div key={i} style={{ height:176, border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surfaceAlt, animation:"ap-shimmer 1.6s ease-in-out infinite" }} />
              ))}
            </div>
          ) : shops.length === 0 ? (
            <div style={{ padding:"64px 24px", textAlign:"center", border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface }}>
              <MagnifyingGlass size={28} color={T.border} />
              <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, marginTop:12 }}>
                {isVi ? "Không tìm thấy cửa hàng" : "No shops found"}
                {search && <> — <strong style={{ color:T.ink }}>"{search}"</strong></>}
              </p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:16 }}>
              {shops.map((shop, i) => <ShopCard key={shop.id} shop={shop} index={i} />)}
            </div>
          )}

          {!loading && shops.length > 0 && (
            <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, textAlign:"center", marginTop:32 }}>
              {isVi ? `${shops.length} cửa hàng` : `${shops.length} shops`}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
