/**
 * GiuPay — HomePage (Step 17)
 * ✅ i18n: tất cả text dùng t.xxx từ useTheme()
 */

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import {
  Storefront, ShieldCheck, ArrowRight, MagnifyingGlass,
  Star, CheckCircle, ArrowsLeftRight, ClockCountdown,
  CurrencyDollar,
} from "@phosphor-icons/react";
import { useWallet } from "@/hooks/useWallet";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { DEMO_SHOPS_DATA } from "@/lib/demo-shops";

const T = {
  canvas:    "#FBFBFA", surface:   "#FFFFFF", surfaceAlt:"#F7F6F3",
  border:    "#EAEAEA", ink:       "#111111", inkMid:    "#37352F",
  inkMuted:  "#787774",
  green:  { bg: "#EDF3EC", text: "#346538" },
  blue:   { bg: "#E1F3FE", text: "#1F6C9F" },
  yellow: { bg: "#FBF3DB", text: "#956400" },
  red:    { bg: "#FDEBEC", text: "#9F2F2D" },
  fontSans: "'Geist Sans', 'SF Pro Display', 'Helvetica Neue', sans-serif",
  fontMono: "'Geist Mono', 'SF Mono', 'JetBrains Mono', monospace",
};

interface Shop {
  id: string; name: string; category: string;
  description: string; avgRating: number; totalOrders: number;
  descriptionEn?: string;
}

const CATEGORIES_VI = ["Tất cả","Công nghệ","Thời trang","Đồ ăn & Thức uống","Làm đẹp","Sách","Nội thất","Đồ chơi & Mẹ bé"];
const CATEGORIES_EN = ["All","Technology","Fashion","Food & Drinks","Beauty","Books","Home & Living","Toys & Kids"];

// Map VI category (stored in DB) → EN label for display
const CATEGORY_VI_TO_EN: Record<string, string> = Object.fromEntries(
  CATEGORIES_VI.slice(1).map((vi, i) => [vi, CATEGORIES_EN[i + 1]])
);

// Derive từ DEMO_SHOPS_DATA (frontend/src/lib/demo-shops/data.ts) — nguồn duy nhất,
// khớp tự động với /shops, /products và ShopPublicPage. Sửa data ở 1 nơi.
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
// không thay thế. Xem giải thích đầy đủ trong ShopsPage.tsx (cùng pattern).
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
      totalOrders: s.total_orders ?? 0,
    }));
  } catch {
    return [];
  }
}

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function revealStyle(visible: boolean, delay = 0): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  };
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: ${T.canvas}; font-family: ${T.fontSans}; color: ${T.ink}; -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }
  button { font-family: inherit; cursor: pointer; }
  input { font-family: inherit; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: ${T.surfaceAlt}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
  @keyframes ap-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes ap-shimmer { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:0.01ms!important; transition-duration:0.01ms!important; }
  }
  @media (max-width:640px) { .ap-hide-sm { display:none!important; } .ap-show-sm { display:flex!important; } }
  @media (min-width:641px) { .ap-show-sm { display:none!important; } }
`;

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const { ref, visible } = useReveal(0.05);
  const { t } = useTheme();

  return (
    <section style={{ padding:"140px 28px 100px", textAlign:"center" }}>
      <div ref={ref} style={{ maxWidth:700, margin:"0 auto", ...revealStyle(visible) }}>
        <span style={{
          fontFamily:T.fontMono, fontSize:11, color:T.inkMuted,
          textTransform:"uppercase", letterSpacing:"0.08em",
          display:"block", marginBottom:20,
        }}>{t.heroEyebrow}</span>

        <h1 style={{
          fontFamily:T.fontSans, fontSize:"clamp(38px,6.5vw,68px)",
          fontWeight:700, letterSpacing:"-0.035em", lineHeight:1.04,
          color:T.ink, marginBottom:24,
          whiteSpace:"pre-line",
        }}>{t.heroTitle}</h1>

        <p style={{
          fontFamily:T.fontSans, fontSize:17, color:T.inkMuted,
          lineHeight:1.65, maxWidth:520, margin:"0 auto 40px",
        }}>{t.heroSub}</p>


        <div style={{ display:"flex", marginTop:64, borderTop:`1px solid ${T.border}`, paddingTop:36 }}>
          {[
            { label: t.heroStatShops,   value:"128"   },
            { label: t.heroStatOrders,  value:"4,320" },
            { label: t.heroStatEscrow,  value:"$284K" },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              flex:1, textAlign:"center",
              borderRight: i < 2 ? `1px solid ${T.border}` : "none",
              padding:"0 20px",
            }}>
              <div style={{ fontFamily:T.fontSans, fontSize:26, fontWeight:700, letterSpacing:"-0.03em", color:T.ink }}>{value}</div>
              <div style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginTop:5 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const { ref, visible } = useReveal();
  const { t, lang } = useTheme();

  const steps = [
    { icon:<Storefront size={18} weight="duotone" />,     title:t.step1Title, desc:t.step1Desc },
    { icon:<ArrowsLeftRight size={18} weight="duotone" />, title:t.step2Title, desc:t.step2Desc },
    { icon:<ShieldCheck size={18} weight="duotone" />,    title:t.step3Title, desc:t.step3Desc },
    { icon:<ClockCountdown size={18} weight="duotone" />, title:t.step3Title, desc:t.step3Desc },
  ];

  return (
    <section id="how-it-works" style={{ padding:"100px 28px", backgroundColor:T.surface, borderTop:`1px solid ${T.border}` }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ marginBottom:52 }}>
          <span style={{
            fontFamily:T.fontMono, fontSize:11, color:T.inkMuted,
            textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:12,
          }}>{t.howItWorksTitle}</span>
          <h2 style={{ fontFamily:T.fontSans, fontSize:"clamp(22px,3.5vw,34px)", fontWeight:700, letterSpacing:"-0.03em", color:T.ink, lineHeight:1.1 }}>
            {t.howItWorksSub}
          </h2>
        </div>

        <div ref={ref} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
          {steps.map(({ icon, title, desc }, i) => (
            <div key={i} style={{
              padding:"30px 26px", backgroundColor:T.surface,
              borderRight: i < steps.length - 1 ? `1px solid ${T.border}` : "none",
              ...revealStyle(visible, i * 80),
            }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
                <div style={{ width:34, height:34, borderRadius:8, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center", color:T.ink }}>{icon}</div>
                <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.border, fontWeight:700, letterSpacing:"0.05em" }}>0{i+1}</span>
              </div>
              <h3 style={{ fontFamily:T.fontSans, fontSize:14, fontWeight:600, color:T.ink, letterSpacing:"-0.01em", marginBottom:10 }}>{title}</h3>
              <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, lineHeight:1.65 }}>{desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop:18, display:"inline-flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:8, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt }}>
          <CurrencyDollar size={13} color={T.inkMuted} />
          <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted }}>
            <strong style={{ color:T.ink }}>0.1%</strong> {lang === "vi" ? "mỗi giao dịch · Không phí tháng" : "per transaction · No monthly fees"}
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Shop Card ─────────────────────────────────────────────────────────────────
// Style tĩnh của ShopCard — hoist ra module scope, tránh tạo lại object mỗi lần render x 28 shop.
const scBaseStyle: React.CSSProperties = { display:"flex", flexDirection:"column", padding:24, border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, transition:"box-shadow 200ms, border-color 200ms, transform 80ms" };
const scAvatarRowStyle: React.CSSProperties = { display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 };
const scAvatarStyle: React.CSSProperties = { width:38, height:38, borderRadius:8, flexShrink:0, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontSans, fontSize:12, fontWeight:700, color:T.ink };
const scNameColStyle: React.CSSProperties = { flex:1, minWidth:0 };
const scNameRowStyle: React.CSSProperties = { display:"flex", alignItems:"center", gap:5, marginBottom:6 };
const scNameStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:14, fontWeight:600, color:T.ink, letterSpacing:"-0.01em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" };
const scCategoryStyle: React.CSSProperties = { fontFamily:T.fontMono, fontSize:10, letterSpacing:"0.05em", textTransform:"uppercase", borderRadius:9999, padding:"2px 7px", backgroundColor:T.surfaceAlt, color:T.inkMuted };
const scDescStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, lineHeight:1.6, margin:"0 0 auto", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" };
const scFooterStyle: React.CSSProperties = { display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, paddingTop:14, borderTop:`1px solid ${T.border}` };
const scRatingRowStyle: React.CSSProperties = { display:"flex", alignItems:"center", gap:4 };
const scRatingStyle: React.CSSProperties = { fontFamily:T.fontMono, fontSize:12, fontWeight:600, color:T.ink };
const scOrdersStyle: React.CSSProperties = { fontFamily:T.fontSans, fontSize:12, color:T.inkMuted };

function ShopCard({ shop, index }: { shop:Shop; index:number }) {
  const { ref, visible } = useReveal(0.05);
  const { t, lang } = useTheme();
  const isVi = lang === "vi";
  const initials      = shop.name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
  const displayDesc   = isVi ? shop.description : (shop.descriptionEn ?? shop.description);
  const displayCat    = isVi ? shop.category    : (CATEGORY_VI_TO_EN[shop.category] ?? shop.category);

  return (
    <Link ref={ref as any} href={`/shop/${shop.id}`} style={{ ...scBaseStyle, ...revealStyle(visible, index * 60) }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor=T.inkMid; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor=T.border; }}
    >
      <div style={scAvatarRowStyle}>
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
        <span style={scOrdersStyle}>{shop.totalOrders.toLocaleString()} {t.heroStatOrders.toLowerCase()}</span>
      </div>
    </Link>
  );
}

// ── Shops Section ─────────────────────────────────────────────────────────────
function ShopsSection() {
  const { ref, visible } = useReveal();
  const { t, lang } = useTheme();
  const CATEGORIES = lang === "vi" ? CATEGORIES_VI : CATEGORIES_EN;
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [search, setSearch]           = useState("");

  // Demo (28 shop, luôn có ngay) + shop thật (cộng thêm khi tải xong, không thay thế).
  const demoShops = useMemo(() => filterDemoShops(categoryIdx, search), [categoryIdx, search]);
  const { data: realShops = [] } = useQuery({
    queryKey: ["real-shops", categoryIdx, search],
    queryFn: () => fetchRealShops(categoryIdx, search),
  });
  const shops = useMemo(() => [...demoShops, ...realShops], [demoShops, realShops]);
  const loading = false;

  return (
    <section id="shops" style={{ padding:"100px 28px", backgroundColor:T.canvas, borderTop:`1px solid ${T.border}` }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div ref={ref} style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:28, ...revealStyle(visible) }}>
          <div>
            <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:10 }}>Marketplace</span>
            <h2 style={{ fontFamily:T.fontSans, fontSize:"clamp(20px,3vw,30px)", fontWeight:700, letterSpacing:"-0.03em", color:T.ink }}>{t.exploreShops}</h2>
          </div>
          <div style={{ position:"relative" }}>
            <MagnifyingGlass size={13} color={T.inkMuted} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
            <input
              type="text" placeholder={t.searchPlaceholder} value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink, backgroundColor:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 12px 8px 30px", outline:"none", width:210, transition:"border-color 150ms" }}
              onFocus={e => (e.target.style.borderColor = T.ink)}
              onBlur={e => (e.target.style.borderColor = T.border)}
            />
          </div>
        </div>

        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:28 }}>
          {CATEGORIES.map((cat, idx) => (
            <button key={idx} onClick={() => setCategoryIdx(idx)} style={{
              flexShrink:0, fontFamily:T.fontSans, fontSize:12,
              fontWeight: idx === categoryIdx ? 600 : 400,
              color: idx === categoryIdx ? T.canvas : T.inkMuted,
              backgroundColor: idx === categoryIdx ? T.ink : T.surface,
              border:`1px solid ${idx === categoryIdx ? T.ink : T.border}`,
              borderRadius:9999, padding:"5px 13px", transition:"all 150ms",
            }}>{cat}</button>
          ))}
        </div>

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
              {t.noShopsFound} {search && <strong style={{ color:T.ink }}>"{search}"</strong>}
            </p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:16 }}>
            {shops.map((shop, i) => <ShopCard key={shop.id} shop={shop} index={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Single CTA: Connect Wallet → /select-account ──────────────────────────────
function DualCTA() {
  const { ref, visible } = useReveal();
  const { t } = useTheme();
  const { address } = useWallet();

  // Ẩn section này khi ví đã kết nối
  if (address) return null;

  return (
    <section style={{ padding:"100px 28px", backgroundColor:T.surface, borderTop:`1px solid ${T.border}` }}>
      <div ref={ref} style={{ maxWidth:600, margin:"0 auto", textAlign:"center", ...revealStyle(visible) }}>
        <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:16 }}>
          {t.singleCtaEyebrow}
        </span>
        <h2 style={{ fontFamily:T.fontSans, fontSize:"clamp(24px,3.5vw,38px)", fontWeight:700, letterSpacing:"-0.035em", color:T.ink, lineHeight:1.08, marginBottom:16 }}>
          {t.singleCtaTitle}
        </h2>
        <p style={{ fontFamily:T.fontSans, fontSize:15, color:T.inkMuted, lineHeight:1.65, maxWidth:440, margin:"0 auto 40px" }}>
          {t.singleCtaSub}
        </p>
        {/* Kết nối ví thẳng (mở hộp chọn ví), không qua trang chọn buyer/shop nữa.
            Sau khi connect, NavBar tự dẫn ví có shop verified vào /shop/{id}; ví thường thì mua bình thường. */}
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button onClick={openConnectModal} style={{
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
              fontFamily:T.fontSans, fontSize:15, fontWeight:600,
              color:T.canvas, backgroundColor:T.ink, borderRadius:10,
              padding:"15px 36px", border:"none", cursor:"pointer",
              transition:"background-color 150ms, transform 80ms, box-shadow 150ms",
              boxShadow:"0 1px 4px rgba(0,0,0,0.12)",
            }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor="#222"; e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.18)"; e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor=T.ink; e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.12)"; e.currentTarget.style.transform="translateY(0)"; }}
            >
              <ShieldCheck size={16} weight="fill" />
              {t.singleCtaBtn}
              <ArrowRight size={14} weight="bold" />
            </button>
          )}
        </ConnectButton.Custom>
        <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginTop:16 }}>
          {t.singleCtaNote}
        </p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const { t } = useTheme();
  const links = [
    { label: t.back === "Quay lại" ? "Điều khoản" : "Terms",   href: "#" },
    { label: t.back === "Quay lại" ? "Riêng tư"   : "Privacy", href: "#" },
    { label: "Docs", href: "#" },
  ];

  return (
    <footer style={{ padding:"24px 28px", borderTop:`1px solid ${T.border}`, backgroundColor:T.canvas }}>
      <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Storefront size={13} color={T.inkMuted} weight="duotone" />
          <span style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted }}>GiuPay</span>
          <span style={{ fontFamily:T.fontMono, fontSize:9, border:`1px solid ${T.border}`, borderRadius:4, padding:"1px 5px", backgroundColor:T.surfaceAlt, color:T.inkMuted }}>v1.0</span>
        </div>
        <div style={{ display:"flex", gap:20 }}>
          {links.map(({ label, href }) => (
            <a key={label} href={href} style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, transition:"color 150ms" }}
              onMouseEnter={e => (e.currentTarget.style.color=T.ink)}
              onMouseLeave={e => (e.currentTarget.style.color=T.inkMuted)}
            >{label}</a>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", backgroundColor:T.green.text, animation:"ap-pulse 2s ease-in-out infinite" }} />
          <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted }}>{t.footerStatus}</span>
        </div>
      </div>
    </footer>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {/* NavBar giờ render 1 lần trong _app.tsx — không remount mỗi lần chuyển trang */}
      <main>
        <Hero />
        <HowItWorks />
        <ShopsSection />
        <DualCTA />
      </main>
      <Footer />
    </>
  );
}
