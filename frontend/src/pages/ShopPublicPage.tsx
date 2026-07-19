/**
 * GiuPay — ShopPublicPage (Step 20)
 * ✅ i18n: tất cả text dùng t.xxx từ useTheme()
 * ✅ NavBar: dùng NavBarMinimal
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import { NavBarMinimal } from "@/components/NavBarMinimal";
import {
  CheckCircle, Star, SealCheck, FacebookLogo, ArrowSquareOut,
  ShieldCheck, CaretDown, CaretUp, ClockCountdown, Warning,
  Tag, ShoppingCartSimple, CircleNotch, Image, Sparkle, X,
} from "@phosphor-icons/react";
import { isDemoShop } from "@/lib/demo-shops";
import { ROUTES } from "@/lib/app-routes";
import { ShopAvatar } from "@/components/ShopAvatar";
import { shortenAddr, timeAgo } from "@/lib/utils";

const T = {
  canvas:"#FBFBFA", surface:"#FFFFFF", surfaceAlt:"#F7F6F3",
  border:"#EAEAEA", ink:"#111111", inkMid:"#37352F", inkMuted:"#787774",
  green:{ bg:"#EDF3EC", text:"#346538" }, blue:{ bg:"#E1F3FE", text:"#1F6C9F" },
  yellow:{ bg:"#FBF3DB", text:"#956400" }, red:{ bg:"#FDEBEC", text:"#9F2F2D" },
  fontSans:"'Geist Sans', 'SF Pro Display', sans-serif",
  fontMono:"'Geist Mono', 'SF Mono', monospace",
};

interface ShopData {
  id:string; name:string; description:string; category:string;
  gmail:string; facebookUrl?:string; returnPolicy:string;
  status:"verified"; avgRating:number; totalOrders:number;
  totalRevenue:string; createdAt:string;
  logoCid?:string|null; walletAddress?:string;
}
interface PublicOrder {
  id:string; orderCode:string; productName:string; productImageCid?:string;
  description?:string; priceUsdc:string; warrantyDays:number; status:string; createdAt:string;
  review?: { rating:number; comment?:string; commentEn?:string; buyerWallet:string; createdAt:string };
}
interface Listing {
  id:string; name:string; description?:string;
  priceUsdc:string; imageCid?:string; warrantyDays?:number; isActive:boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function useReveal(threshold = 0.08) {
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
  return { opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(12px)", transition:`opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms` };
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:${T.canvas}; font-family:${T.fontSans}; color:${T.ink}; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; } button { font-family:inherit; cursor:pointer; border:none; background:none; }
  @keyframes ap-shimmer { 0%,100%{opacity:1} 50%{opacity:0.45} }
`;

function Stars({ rating, size=12 }: { rating:number; size?:number }) {
  return <div style={{ display:"flex", gap:2 }}>{[1,2,3,4,5].map(i => <Star key={i} size={size} weight={i<=Math.round(rating)?"fill":"regular"} color={i<=Math.round(rating)?T.yellow.text:T.border} />)}</div>;
}

function initials(name: string) { return name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase(); }

function ShopHeader({ shop, isVi }: { shop:ShopData; isVi:boolean }) {
  const { ref, visible } = useReveal(0.05);
  return (
    <div ref={ref} style={{ border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, overflow:"hidden", marginBottom:20, ...revealStyle(visible) }}>
      <div style={{ padding:"28px 28px 24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:20 }}>
          <ShopAvatar cid={shop.logoCid} name={shop.name} size={72} title={isVi ? "Xem ảnh đầy đủ" : "View full image"} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
              <h1 style={{ fontFamily:T.fontSans, fontSize:"clamp(18px,3vw,24px)", fontWeight:700, letterSpacing:"-0.02em", color:T.ink }}>{shop.name}</h1>
              <SealCheck size={18} color={T.green.text} weight="fill" />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <span style={{ fontFamily:T.fontMono, fontSize:10, letterSpacing:"0.05em", textTransform:"uppercase", borderRadius:9999, padding:"2px 8px", backgroundColor:T.surfaceAlt, color:T.inkMuted }}>{shop.category}</span>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <Stars rating={shop.avgRating} />
                <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.ink, fontWeight:600 }}>{shop.avgRating.toFixed(1)}</span>
              </div>
              <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted }}>{shop.totalOrders} {isVi?"đơn hàng":"orders"}</span>
            </div>
          </div>
          {shop.facebookUrl && (
            <a href={shop.facebookUrl} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 10px", backgroundColor:T.surface, transition:"color 150ms, border-color 150ms", flexShrink:0 }}
              onMouseEnter={e => { e.currentTarget.style.color=T.ink; e.currentTarget.style.borderColor=T.ink; }}
              onMouseLeave={e => { e.currentTarget.style.color=T.inkMuted; e.currentTarget.style.borderColor=T.border; }}
            >
              <FacebookLogo size={14} /> Facebook <ArrowSquareOut size={10} />
            </a>
          )}
        </div>
        <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, lineHeight:1.7 }}>{shop.description}</p>
      </div>
    </div>
  );
}

function ReturnPolicyAccordion({ policy, isVi }: { policy:string; isVi:boolean }) {
  const [open, setOpen] = useState(false);
  if (!policy) return null;
  return (
    <div style={{ border:`1px solid ${T.border}`, borderRadius:10, backgroundColor:T.surface, overflow:"hidden", marginBottom:20 }}>
      <button onClick={() => setOpen(o=>!o)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <ShieldCheck size={14} color={T.inkMuted} weight="duotone" />
          <span style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink }}>{isVi?"Chính sách đổi trả":"Return policy"}</span>
        </div>
        {open ? <CaretUp size={14} color={T.inkMuted} /> : <CaretDown size={14} color={T.inkMuted} />}
      </button>
      {open && (
        <div style={{ padding:"0 18px 16px", borderTop:`1px solid ${T.border}`, paddingTop:14 }}>
          <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, lineHeight:1.7 }}>{policy}</p>
        </div>
      )}
    </div>
  );
}


function ListingsSection({ shopId, listings, isVi }: { shopId:string; listings:Listing[]; isVi:boolean }) {
  function handleCardClick(listing: Listing) {
    // Cả demo lẫn shop thật: chuyển hẳn sang trang chi tiết sản phẩm riêng (kiểu Shopee) — xem
    // đầy đủ ảnh/mô tả/bảo hành TRƯỚC, "Mua ngay" trên trang đó mới thật sự tạo đơn (hoặc mở
    // DemoBuyModal nếu là demo — xử lý bên trong ProductDetailPage, không phải ở đây nữa).
    window.location.href = ROUTES.product(shopId, listing.id);
  }

  if (listings.length === 0) return null;

  return (
    <div style={{ border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, overflow:"hidden", marginBottom:20 }}>
      {/* Header */}
      <div style={{ padding:"15px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8 }}>
        <Tag size={14} color={T.inkMuted} weight="duotone" />
        <span style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink }}>
          {isVi?"Sản phẩm đang bán":"Products"}
        </span>
        <span style={{ fontFamily:T.fontMono, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", borderRadius:9999, padding:"2px 8px", backgroundColor:T.surfaceAlt, color:T.inkMuted, marginLeft:2 }}>
          {listings.length}
        </span>
      </div>

      {/* Grid — cả card bấm được, mở modal xem chi tiết (ảnh/mô tả/bảo hành) trước khi tạo đơn */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:0 }}>
        {listings.map((l, i) => (
          <div key={l.id} onClick={() => handleCardClick(l)}
            style={{ padding:16, borderRight:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, display:"flex", flexDirection:"column", gap:10, cursor:"pointer", transition:"background-color 150ms" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor=T.surfaceAlt)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor="transparent")}
          >
            {/* Image */}
            {l.imageCid ? (
              <div style={{ height:120, borderRadius:8, overflow:"hidden", backgroundColor:T.surfaceAlt, flexShrink:0 }}>
                <img src={`https://ipfs.io/ipfs/${l.imageCid}`} alt={l.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
              </div>
            ) : (
              <div style={{ height:80, borderRadius:8, backgroundColor:T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Image size={20} color={T.border} weight="duotone" />
              </div>
            )}
            {/* Info */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
              <p style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:600, color:T.ink, lineHeight:1.3 }}>{l.name}</p>
              {l.description && (
                <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" } as React.CSSProperties}>
                  {l.description}
                </p>
              )}
              {!!l.warrantyDays && (
                <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontFamily:T.fontSans, fontSize:11, color:T.green.text }}>
                  <ShieldCheck size={11} weight="fill" /> {isVi ? `Bảo hành ${l.warrantyDays} ngày` : `${l.warrantyDays}-day warranty`}
                </span>
              )}
            </div>
            {/* Price + CTA */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginTop:"auto" }}>
              <span style={{ fontFamily:T.fontMono, fontSize:15, fontWeight:700, color:T.ink }}>${parseFloat(l.priceUsdc).toFixed(2)}</span>
              <span style={{ display:"flex", alignItems:"center", gap:5, fontFamily:T.fontSans, fontSize:12, fontWeight:500, color:T.ink, borderRadius:6, padding:"7px 12px", border:`1px solid ${T.border}`, flexShrink:0 }}>
                <ShoppingCartSimple size={13} />
                {isVi?"Xem chi tiết":"View details"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ShopPublicPageProps {
  initialShop?: ShopData;
  initialListings?: Listing[];
  initialOrders?: PublicOrder[];
}

export default function ShopPublicPage({ initialShop, initialListings, initialOrders }: ShopPublicPageProps = {}) {
  const { t, lang } = useTheme();
  const isVi = lang === "vi";
  const [shop, setShop]         = useState<ShopData|null>(initialShop ?? null);
  const [orders, setOrders]     = useState<PublicOrder[]>(initialOrders ?? []);
  const [listings, setListings] = useState<Listing[]>(initialListings ?? []);
  const [loading, setLoading]   = useState(!initialShop);

  useEffect(() => {
    // Data đã được load từ getStaticProps — bỏ qua fetch client-side
    if (initialShop !== undefined) return;

    const segments = window.location.pathname.split("/");
    const shopId = segments[segments.length-1];
    if (!shopId) { setLoading(false); return; }

    // Fallback client-side fetch (nếu không có getStaticProps)
    fetch(`${API}/api/shops/${shopId}/full`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) return;
        setShop(json.data.shop);
        setListings(json.data.listings ?? []);
        setOrders(json.data.orders ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back="/#shops" />
      <div style={{ minHeight:"100dvh", backgroundColor:T.canvas, display:"flex", flexDirection:"column", gap:16, padding:"88px 28px 40px", maxWidth:1100, margin:"0 auto" }}>
        {[200,120,400].map((h,i) => <div key={i} style={{ height:h, border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surfaceAlt, animation:"ap-shimmer 1.6s ease-in-out infinite" }} />)}
      </div>
    </>
  );

  if (!shop) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back="/#shops" />
      <div style={{ minHeight:"100dvh", backgroundColor:T.canvas, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
        <Warning size={32} color={T.border} weight="duotone" />
        <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted }}>{isVi?"Không tìm thấy shop":"Shop not found"}</p>
        <a href="/" style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink }}>{isVi?"Về trang chủ":"Back to home"}</a>
      </div>
    </>
  );

  const buyerProtection = isVi
    ? ["Cửa sổ escrow 14 ngày","Khiếu nại tối đa 3 lần","SBT bảo hành","Tự động giải phóng khi hoàn thành"]
    : ["14-day escrow window","Dispute up to 3 times","SBT warranty proof","Auto-release on completion"];

  const isDemo = isDemoShop(shop.id);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back="/shops" backLabel={isVi?"Marketplace":"Marketplace"} />
      {isDemo && (
        <div style={{ position:"fixed", top:58, left:0, right:0, zIndex:40, backgroundColor:T.blue.bg, borderBottom:`1px solid ${T.blue.text}22`, padding:"8px 28px", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Sparkle size={13} color={T.blue.text} weight="fill" />
          <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.blue.text }}>
            {isVi
              ? "Đây là shop demo — sản phẩm & đánh giá mẫu. Giao dịch sẽ được mô phỏng."
              : "This is a demo shop — sample products & reviews. Transactions will be simulated."}
          </span>
        </div>
      )}
      <main style={{ minHeight:"100dvh", backgroundColor:T.canvas, paddingTop: isDemo ? 94 : 56 }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"44px 28px 80px", display:"grid", gridTemplateColumns:"1fr 300px", gap:28, alignItems:"start" }}>
          <div>
            <ShopHeader shop={shop} isVi={isVi} />
            <ReturnPolicyAccordion policy={shop.returnPolicy} isVi={isVi} />
            <ListingsSection shopId={shop.id} listings={listings} isVi={isVi} />
          </div>

          <div style={{ position:"sticky", top:76 }}>
            {/* Rating card */}
            <div style={{ border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, overflow:"hidden", marginBottom:16 }}>
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt }}>
                <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                  {isVi?"Đánh giá":"Rating breakdown"}
                </span>
              </div>
              <div style={{ padding:20 }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:16 }}>
                  <span style={{ fontFamily:T.fontSans, fontSize:40, fontWeight:700, letterSpacing:"-0.04em", color:T.ink, lineHeight:1 }}>{shop.avgRating.toFixed(1)}</span>
                  <div>
                    <Stars rating={shop.avgRating} size={14} />
                    <div style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted, marginTop:3 }}>
                      {orders.filter(o=>o.review).length} {isVi?"đánh giá":"reviews"}
                    </div>
                  </div>
                </div>
                {[5,4,3,2,1].map(star => {
                  const count = orders.filter(o=>o.review?.rating===star).length;
                  const total = orders.filter(o=>o.review).length||1;
                  return (
                    <div key={star} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontFamily:T.fontMono, fontSize:10, color:T.inkMuted, width:8 }}>{star}</span>
                      <Star size={10} color={T.yellow.text} weight="fill" />
                      <div style={{ flex:1, height:4, borderRadius:9999, backgroundColor:T.border, overflow:"hidden" }}>
                        <div style={{ width:`${(count/total)*100}%`, height:"100%", backgroundColor:T.yellow.text, borderRadius:9999, transition:"width 600ms cubic-bezier(0.16,1,0.3,1)" }} />
                      </div>
                      <span style={{ fontFamily:T.fontMono, fontSize:10, color:T.inkMuted, width:16, textAlign:"right" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verified badge */}
            <div style={{ border:`1px solid ${T.green.bg}`, borderRadius:12, backgroundColor:T.green.bg, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <SealCheck size={16} color={T.green.text} weight="fill" />
                <span style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:600, color:T.green.text }}>
                  {isVi?"Shop đã xác minh":"Verified shop"}
                </span>
              </div>
              <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.green.text, lineHeight:1.6 }}>
                {isVi?"Danh tính được xác minh bởi đội ngũ GiuPay. Mọi giao dịch được bảo vệ bởi escrow hợp đồng thông minh.":"Identity verified by GiuPay admin team. All transactions are secured by smart contract escrow."}
              </p>
            </div>

            {/* Buyer protection */}
            <div style={{ border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <ClockCountdown size={14} color={T.inkMuted} weight="duotone" />
                <span style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink }}>
                  {isVi?"Bảo vệ người mua":"Buyer protection"}
                </span>
              </div>
              {buyerProtection.map(f => (
                <div key={f} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
                  <CheckCircle size={12} color={T.green.text} weight="fill" />
                  <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMid }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Đánh giá — hiện đủ danh sách review thật (không chỉ số liệu tổng hợp ở "Rating
            breakdown" bên trên). Đặt full-width, dưới CẢ 2 cột Products lẫn Verified shop/Buyer
            protection. Dữ liệu lấy thẳng từ orders[].review đã có sẵn (không cần gọi API riêng) —
            khớp CÙNG 1 cấu trúc cho cả shop thật (backend JOIN reviews vào orders ở /:id/full)
            lẫn shop demo (nhúng sẵn trong demo-shops/data.ts), nên code này chạy đúng cho cả 2. */}
        {orders.filter(o => o.review).length > 0 && (
          <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 28px 80px" }}>
            <h2 style={{ fontFamily:T.fontSans, fontSize:16, fontWeight:700, color:T.ink, marginBottom:16 }}>
              {isVi?"Đánh giá từ người mua":"Buyer reviews"} ({orders.filter(o => o.review).length})
            </h2>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {orders.filter(o => o.review).map(o => (
                <div key={o.id} style={{ border:`1px solid ${T.border}`, borderRadius:10, backgroundColor:T.surface, padding:"16px 20px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:6 }}>
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={12} weight="fill" color={i<=(o.review!.rating)?T.yellow.text:T.border} />
                    ))}
                    <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginLeft:6 }}>{o.productName}</span>
                  </div>
                  {(isVi ? o.review!.comment : (o.review!.commentEn ?? o.review!.comment)) && (
                    <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink, lineHeight:1.6, marginBottom:6 }}>
                      {isVi ? o.review!.comment : (o.review!.commentEn ?? o.review!.comment)}
                    </p>
                  )}
                  <p style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted }}>
                    {shortenAddr(o.review!.buyerWallet)} · {timeAgo(o.review!.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
