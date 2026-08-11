/**
 * GiuPay — DashboardPage (Step 21)
 * ✅ i18n: tất cả text dùng t.xxx + lang check
 * ✅ NavBar: render dùng chung trong _app.tsx (route "/dashboard" nằm trong FULL_NAVBAR_ROUTES)
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/lib/theme";
import {
  Storefront, ArrowRight, Plus, Package, ClockCountdown, CheckCircle,
  Warning, ArrowsLeftRight, MagnifyingGlass, ArrowSquareOut, SignOut,
  Star, CurrencyDollar, Receipt, Funnel, CaretDown, SealCheck, ArrowClockwise,
  Tag, Trash, Image, X, Truck, ChatCircleDots, Copy,
} from "@phosphor-icons/react";
import { SellerShipModal } from "@/components/SellerShipModal";
import { ChatWidget } from "@/components/ChatWidget";
import { ShopAvatar } from "@/components/ShopAvatar";
import { ROUTES } from "@/lib/app-routes";
import { shortenAddr } from "@/lib/utils";

const T = {
  canvas:"#FBFBFA", surface:"#FFFFFF", surfaceAlt:"#F7F6F3",
  border:"#EAEAEA", ink:"#111111", inkMid:"#37352F", inkMuted:"#787774",
  green:{ bg:"#EDF3EC", text:"#346538" }, blue:{ bg:"#E1F3FE", text:"#1F6C9F" },
  yellow:{ bg:"#FBF3DB", text:"#956400" }, red:{ bg:"#FDEBEC", text:"#9F2F2D" },
  fontSans:"'Geist Sans', 'SF Pro Display', sans-serif",
  fontMono:"'Geist Mono', 'SF Mono', monospace",
};

type OrderStatus = "pending_payment"|"paid"|"in_escrow"|"released"|"refunded"|"disputed";
interface Listing {
  id:string; shopId:string; name:string; description?:string;
  priceUsdc:string; imageCid?:string; warrantyDays:number; isActive:boolean; createdAt:string;
}
interface Order {
  id:string; orderCode:string; productName:string; productImageCid?:string;
  priceUsdc:string; quantity:number; warrantyDays:number; status:OrderStatus;
  buyerWallet?:string; escrowCreatedAt?:string; escrowReleasedAt?:string;
  createdAt:string; chainPaidFrom?:string;
  buyerName?:string; buyerPhone?:string; buyerAddress?:string; shippedAt?:string;
  listingId?:string|null; disputeDeadlineAt?:string|null; txHash?:string|null;
}
interface ShopStats { totalRevenue:string; ordersThisMonth:number; avgRating:number; escrowPending:string; escrowCount:number; }
interface ReviewItem {
  id:string; rating:number; comment?:string; buyer_wallet:string; tx_hash?:string; created_at:string;
  shop_reply?:string|null; shop_replied_at?:string|null; product_name:string; order_code:string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const CHAIN_LABELS: Record<string,string> = { ethereum:"Ethereum", base:"Base", polygon:"Polygon", bnb:"BNB Chain", arc:"Arc" };

function mapOrder(o: any): Order {
  return { id:o.id, orderCode:o.order_code, productName:o.product_name, productImageCid:o.product_image_cid, priceUsdc:o.price_usdc, quantity:o.quantity, warrantyDays:o.warranty_days, status:o.status, buyerWallet:o.buyer_wallet, escrowCreatedAt:o.escrow_created_at, escrowReleasedAt:o.escrow_released_at, createdAt:o.created_at, chainPaidFrom:o.chain_paid_from, buyerName:o.buyer_name, buyerPhone:o.buyer_phone, buyerAddress:o.ship_address, shippedAt:o.shipped_at, listingId:o.listing_id, disputeDeadlineAt:o.dispute_deadline_at, txHash:o.tx_hash };
}

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
  return { opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(12px)", transition:`opacity 500ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${delay}ms` };
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:${T.canvas}; font-family:${T.fontSans}; color:${T.ink}; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; } button { font-family:inherit; cursor:pointer; border:none; background:none; }
  input,select { font-family:inherit; }
  @keyframes ap-spin { to { transform:rotate(360deg); } }
  @keyframes ap-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
`;

function escrowDaysLeft(createdAt: string) { return Math.max(0, Math.ceil((new Date(createdAt).getTime()+14*86400000-Date.now())/86400000)); }
// deadline_at đã là mốc thời gian tuyệt đối (opened_at + 7 ngày, tính sẵn ở backend) — chỉ cần
// trừ với hiện tại, không cộng thêm 7 ngày nữa (khác escrowDaysLeft ở trên).
function disputeDaysLeft(deadlineAt: string) { return Math.max(0, Math.ceil((new Date(deadlineAt).getTime()-Date.now())/86400000)); }

function timeAgo(iso: string, isVi: boolean) {
  const d = Math.floor((Date.now()-new Date(iso).getTime())/86400000);
  if (isVi) { if(d===0)return"Hôm nay"; if(d===1)return"Hôm qua"; if(d<30)return`${d} ngày trước`; return`${Math.floor(d/30)} tháng trước`; }
  else { if(d===0)return"Today"; if(d===1)return"Yesterday"; if(d<30)return`${d} days ago`; return`${Math.floor(d/30)}mo ago`; }
}

function statusConfig(status: OrderStatus, isVi: boolean) {
  const vi = { pending_payment:{label:"Chờ TT",bg:T.surfaceAlt,text:T.inkMuted}, paid:{label:"Đã TT",bg:T.blue.bg,text:T.blue.text}, in_escrow:{label:"Escrow",bg:T.yellow.bg,text:T.yellow.text}, released:{label:"Hoàn thành",bg:T.green.bg,text:T.green.text}, refunded:{label:"Hoàn tiền",bg:T.red.bg,text:T.red.text}, disputed:{label:"Tranh chấp",bg:T.red.bg,text:T.red.text} };
  const en = { pending_payment:{label:"Pending",bg:T.surfaceAlt,text:T.inkMuted}, paid:{label:"Paid",bg:T.blue.bg,text:T.blue.text}, in_escrow:{label:"Escrow",bg:T.yellow.bg,text:T.yellow.text}, released:{label:"Completed",bg:T.green.bg,text:T.green.text}, refunded:{label:"Refunded",bg:T.red.bg,text:T.red.text}, disputed:{label:"Disputed",bg:T.red.bg,text:T.red.text} };
  return (isVi ? vi : en)[status];
}

function StatCard({ label, value, sub, icon, index }: { label:string; value:string; sub?:string; icon:React.ReactNode; index:number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ padding:"24px 24px 20px", border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, ...revealStyle(visible,index*60) }}>
      <div style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center", color:T.inkMid, marginBottom:20 }}>{icon}</div>
      <div style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      <div style={{ fontFamily:T.fontMono, fontSize:26, fontWeight:700, letterSpacing:"-0.03em", color:T.ink }}>{value}</div>
      {sub && <div style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

function EscrowCard({ order, isVi }: { order:Order; isVi:boolean }) {
  const days = escrowDaysLeft(order.escrowCreatedAt!);
  const pct  = Math.round(((14-days)/14)*100);
  const urgent = days <= 2;
  return (
    <div style={{ padding:"16px 18px", border:`1px solid ${urgent?T.red.bg:T.border}`, borderRadius:10, backgroundColor:urgent?T.red.bg:T.surface, transition:"box-shadow 200ms" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:urgent?T.red.text:T.ink, marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:180 }}>{order.productName}</div>
          <div style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted }}>{order.orderCode}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontFamily:T.fontMono, fontSize:14, fontWeight:700, color:T.ink }}>${order.priceUsdc}</div>
          <div style={{ fontFamily:T.fontMono, fontSize:11, color:urgent?T.red.text:T.yellow.text }}>{days}{isVi?"d còn lại":"d left"}</div>
        </div>
      </div>
      <div style={{ height:3, borderRadius:9999, backgroundColor:T.border, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:9999, width:`${pct}%`, backgroundColor:urgent?T.red.text:T.yellow.text, transition:"width 600ms cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
      {!order.shippedAt && (
        <p style={{ fontFamily:T.fontSans, fontSize:11, color:T.red.text, marginTop:8, lineHeight:1.4 }}>
          {isVi
            ? "Chưa giao hàng — đồng hồ escrow đã chạy từ lúc khách thanh toán, hãy giao sớm."
            : "Not shipped yet — the escrow clock started at payment, ship soon."}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { walletAddress } = useWallet();
  const { t, lang } = useTheme();
  const isVi = lang === "vi";
  const [shopData, setShopData] = useState<{ id:string; name:string; status:string; avgRating:number; escrowBalance:string; logoCid:string|null }|null>(null);
  const [orders, setOrders]   = useState<Order[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [replyingId, setReplyingId] = useState<string|null>(null);
  const [replyText, setReplyText]   = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus|"all">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders"|"listings"|"reviews"|"chat">("orders");
  // Shipping modal state
  const [shipOrder, setShipOrder] = useState<Order|null>(null);
  // Listing modal state
  const [showModal, setShowModal] = useState(false);
  const [editListing, setEditListing] = useState<Listing|null>(null);
  const [form, setForm] = useState({ name:"", price_usdc:"", description:"", image_cid:"", warranty_days:"0" });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imgUploading, setImgUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const { ref:statsRef, visible:statsVisible } = useReveal();
  const { ref:escrowRef, visible:escrowVisible } = useReveal();
  const { ref:tableRef, visible:tableVisible } = useReveal();

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  }

  async function loadListings() {
    if (!walletAddress) return;
    const r = await fetch(`${API}/api/listings/my`, { headers:{ "X-Wallet-Address": walletAddress } });
    const { data } = await r.json();
    setListings((data?.listings ?? []).map((l: any) => ({
      id:l.id, shopId:l.shop_id, name:l.name, description:l.description,
      priceUsdc:l.price_usdc, imageCid:l.image_cid, warrantyDays:l.warranty_days ?? 0,
      isActive:l.is_active, createdAt:l.created_at,
    })));
  }

  async function loadReviews(shopId: string) {
    try {
      const r = await fetch(`${API}/api/shops/${shopId}/reviews?limit=50`);
      const { data } = await r.json();
      setReviews(data?.reviews ?? []);
    } catch {}
  }

  async function submitReply(reviewId: string) {
    if (!walletAddress || !replyText.trim()) return;
    setReplySaving(true);
    try {
      const r = await fetch(`${API}/api/shops/me/reviews/${reviewId}/reply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Wallet-Address": walletAddress },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const j = await r.json();
      if (j.success) {
        setReviews(prev => prev.map(rv => rv.id === reviewId ? { ...rv, shop_reply: j.data.shop_reply, shop_replied_at: j.data.shop_replied_at } : rv));
        setReplyingId(null); setReplyText("");
        showToast(isVi ? "Đã gửi phản hồi" : "Reply sent");
      } else {
        showToast(j.error ?? (isVi ? "Gửi phản hồi thất bại" : "Failed to send reply"));
      }
    } catch {
      showToast(isVi ? "Lỗi kết nối" : "Connection error");
    } finally { setReplySaving(false); }
  }

  // Tách riêng để gọi lại được sau khi shop giao hàng xong (SellerShipModal.onShipped) —
  // không cần F5 mới thấy trạng thái đơn cập nhật.
  async function loadOrders() {
    if (!walletAddress) return;
    try {
      const r = await fetch(`${API}/api/orders`, { headers:{ "X-Wallet-Address": walletAddress } });
      const { data:od } = await r.json();
      setOrders((od.orders??[]).map(mapOrder));
    } catch {}
  }

  useEffect(() => {
    if (!walletAddress) return;
    const headers = { "X-Wallet-Address": walletAddress };
    async function load() {
      setLoading(true);
      try {
        const [shopRes] = await Promise.all([
          fetch(`${API}/api/shops/me`, { headers }),
          loadOrders(),
        ]);
        // KHÔNG hard-redirect /register khi ví hiện tại không sở hữu shop (vd vừa đổi sang ví
        // buyer khi đang xem /shop/{id}) — wrapper /shop/[id] sẽ tự đổi sang buyer view, giữ
        // nguyên trang. Chỉ dừng loading, không đá đi đâu cả.
        if (!shopRes.ok) { setLoading(false); return; }
        const { data:s }  = await shopRes.json();
        setShopData({ id:s.id, name:s.name, status:s.status, avgRating:parseFloat(s.avg_rating??"0"), escrowBalance:parseFloat(s.escrow_balance??"0").toFixed(2), logoCid:s.logo_cid ?? s.doc_cid ?? null });
        await loadListings();
        await loadReviews(s.id);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [walletAddress]);

  function openCreateModal() {
    setEditListing(null);
    setForm({ name:"", price_usdc:"", description:"", image_cid:"", warranty_days:"0" });
    setFormError(""); setShowModal(true);
  }
  async function handleImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImgUploading(true);
    try {
      const fd = new FormData(); fd.append("image", file);
      const r = await fetch(`${API}/api/upload/image`, { method:"POST", body:fd });
      const j = await r.json();
      if (j.success) setForm(prev => ({ ...prev, image_cid: j.data.cid }));
    } catch {} finally { setImgUploading(false); }
  }
  async function handleSaveListing() {
    if (!form.name.trim()) { setFormError(isVi?"Tên sản phẩm không được trống":"Name is required"); return; }
    if (!form.price_usdc || isNaN(parseFloat(form.price_usdc)) || parseFloat(form.price_usdc)<=0) {
      setFormError(isVi?"Giá không hợp lệ":"Invalid price"); return;
    }
    setFormSaving(true); setFormError("");
    try {
      const url = editListing ? `${API}/api/listings/${editListing.id}` : `${API}/api/listings`;
      const method = editListing ? "PATCH" : "POST";
      const r = await fetch(url, {
        method, headers:{ "Content-Type":"application/json", "X-Wallet-Address":walletAddress! },
        body:JSON.stringify({ name:form.name.trim(), price_usdc:parseFloat(form.price_usdc), description:form.description||undefined, image_cid:form.image_cid||undefined, warranty_days:parseInt(form.warranty_days)||0 }),
      });
      const j = await r.json();
      if (!j.success) { setFormError(j.error??"Lỗi"); return; }
      setShowModal(false);
      await loadListings();
      showToast(editListing ? (isVi?"Đã cập nhật sản phẩm":"Product updated") : (isVi?"Đã tạo sản phẩm":"Product created"));
    } catch { setFormError(isVi?"Lỗi server":"Server error"); }
    finally { setFormSaving(false); }
  }
  // Chỉ áp dụng cho đơn thủ công (listingId null) — dùng để dọn dẹp/test lại nhiều lần,
  // vì contract chặn thanh toán 2 lần cùng 1 order_code (xem implementation-notes.md).
  async function handleDeleteOrder(order: Order) {
    if (!confirm(isVi?`Xóa đơn ${order.orderCode}?`:`Delete order ${order.orderCode}?`)) return;
    const r = await fetch(`${API}/api/orders/${order.orderCode}`, { method:"DELETE", headers:{ "X-Wallet-Address":walletAddress! } });
    const j = await r.json();
    if (j.success) { await loadOrders(); showToast(isVi?"Đã xóa đơn":"Order deleted"); }
    else showToast(j.error ?? (isVi?"Lỗi xóa đơn":"Failed to delete order"));
  }
  async function handleDuplicateOrder(order: Order) {
    const r = await fetch(`${API}/api/orders/${order.orderCode}/duplicate`, { method:"POST", headers:{ "X-Wallet-Address":walletAddress! } });
    const j = await r.json();
    if (j.success) { await loadOrders(); showToast(isVi?`Đã tạo đơn mới ${j.data.order_code}`:`New order ${j.data.order_code} created`); }
    else showToast(j.error ?? (isVi?"Lỗi tạo đơn mới":"Failed to duplicate order"));
  }

  const now = new Date();
  const stats: ShopStats = {
    totalRevenue:    orders.filter(o=>o.status==="released").reduce((s,o)=>s+parseFloat(o.priceUsdc)*o.quantity,0).toFixed(2),
    ordersThisMonth: orders.filter(o=>{ const d=new Date(o.createdAt); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); }).length,
    avgRating:   shopData?.avgRating??0,
    escrowPending: shopData?.escrowBalance??"0.00",
    escrowCount: orders.filter(o=>o.status==="in_escrow").length,
  };

  const shopName = shopData?.name ?? "...";
  const escrowOrders   = orders.filter(o => o.status==="in_escrow");
  const disputedOrders = orders.filter(o => o.status==="disputed");
  const filtered = orders.filter(o => {
    const ms = !search || o.productName.toLowerCase().includes(search.toLowerCase()) || o.orderCode.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter==="all" || o.status===statusFilter;
    return ms && mf;
  });

  const tableHeaders = isVi
    ? ["Mã đơn","Sản phẩm","Giá","Mạng","Escrow","Trạng thái",""]
    : ["Order","Product","Price","Chain","Escrow","Status",""];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {/* NavBar giờ render 1 lần trong _app.tsx — không remount mỗi lần chuyển trang */}
      <main style={{ minHeight:"100dvh", backgroundColor:T.canvas, paddingTop:58 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 28px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom:36 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <SealCheck size={14} color={T.green.text} weight="fill" />
              <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.green.text, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                {isVi ? "Shop đã xác minh" : "Verified shop"}
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <ShopAvatar cid={shopData?.logoCid} name={shopName} size={56} title={isVi ? "Xem ảnh đầy đủ" : "View full image"} />
                <h1 style={{ fontFamily:T.fontSans, fontSize:"clamp(20px,3vw,28px)", fontWeight:700, letterSpacing:"-0.03em", color:T.ink }}>
                  {isVi ? `Xin chào, ${shopName}` : `Hello, ${shopName}`}
                </h1>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <a href={shopData ? `${ROUTES.shop(shopData.id)}?preview=1` : "#"} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 12px", backgroundColor:T.surface, transition:"color 150ms, border-color 150ms" }}
                  onMouseEnter={e => { e.currentTarget.style.color=T.ink; e.currentTarget.style.borderColor=T.ink; }}
                  onMouseLeave={e => { e.currentTarget.style.color=T.inkMuted; e.currentTarget.style.borderColor=T.border; }}
                >
                  {t.shopPage} <ArrowSquareOut size={11} />
                </a>
                {/* Trước đây trỏ tới /dashboard/create-order (tạo đơn thủ công) - đổi thành mở
                    thẳng modal "Thêm sản phẩm" (giống nút trong tab Products) để gộp 2 khái niệm
                    order/product làm 1 lối tạo duy nhất, tránh nhầm lẫn như trước. Trang
                    create-order cũ đã bị xóa hẳn (không còn file, không còn route). */}
                <button onClick={openCreateModal} style={{ display:"flex", alignItems:"center", gap:5, fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"7px 14px", transition:"background-color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor="#333")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor=T.ink)}
                >
                  <Plus size={13} weight="bold" /> {isVi ? "Thêm sản phẩm" : "Add product"}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div ref={statsRef} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:36 }}>
            <StatCard index={0} label={t.totalRevenue}    value={`$${stats.totalRevenue}`}          sub={isVi?"Tổng tất cả, USDC":"Total, USDC"}         icon={<CurrencyDollar size={16} weight="duotone" />} />
            <StatCard index={1} label={t.ordersThisMonth} value={stats.ordersThisMonth.toString()}  sub={isVi?"Tháng hiện tại":"Current month"}           icon={<Receipt size={16} weight="duotone" />} />
            <StatCard index={2} label={t.avgRating}       value={stats.avgRating.toFixed(1)}        sub={isVi?"Từ đơn đã hoàn thành":"From completed orders"} icon={<Star size={16} weight="duotone" />} />
            <StatCard index={3} label={t.escrowPending}   value={`$${stats.escrowPending}`}         sub={`${stats.escrowCount} ${isVi?"đơn đang chờ":"orders pending"}`} icon={<ClockCountdown size={16} weight="duotone" />} />
          </div>

          {/* Tab bar */}
          <div style={{ display:"flex", gap:0, marginBottom:28, borderBottom:`1px solid ${T.border}` }}>
            {([
              { id:"orders" as const,   label:isVi?`Đơn hàng (${orders.length})`:`Orders (${orders.length})`,         icon:<Package size={13} /> },
              { id:"listings" as const, label:isVi?`Sản phẩm (${listings.length})`:`Products (${listings.length})`, icon:<Tag size={13} /> },
              { id:"reviews" as const,  label:isVi?`Đánh giá (${reviews.length})`:`Reviews (${reviews.length})`,   icon:<Star size={13} /> },
              { id:"chat" as const,     label:isVi?"Tin nhắn":"Chat",                                                icon:<ChatCircleDots size={13} /> },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 16px", fontFamily:T.fontSans, fontSize:13, fontWeight:activeTab===tab.id?600:400, color:activeTab===tab.id?T.ink:T.inkMuted, borderBottom:activeTab===tab.id?`2px solid ${T.ink}`:"2px solid transparent", marginBottom:-1, transition:"color 150ms", cursor:"pointer" }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Escrow + Disputes */}
          {activeTab === "orders" && (escrowOrders.length > 0 || disputedOrders.length > 0) && (
            <div ref={escrowRef} style={{ display:"grid", gridTemplateColumns:disputedOrders.length>0?"1fr 1fr":"1fr", gap:20, marginBottom:36, ...revealStyle(escrowVisible) }}>
              {escrowOrders.length > 0 && (
                <div style={{ border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <ClockCountdown size={14} color={T.yellow.text} weight="duotone" />
                      <span style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink }}>{isVi?"Đếm ngược escrow":"Escrow countdown"}</span>
                    </div>
                    <span style={{ fontFamily:T.fontMono, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", borderRadius:9999, padding:"2px 8px", backgroundColor:T.yellow.bg, color:T.yellow.text }}>
                      {escrowOrders.length} {isVi?"đang chạy":"active"}
                    </span>
                  </div>
                  <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
                    {escrowOrders.map(o => <EscrowCard key={o.id} order={o} isVi={isVi} />)}
                  </div>
                  <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt }}>
                    <p style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted, lineHeight:1.5 }}>
                      {isVi?"Tiền sẽ tự động giải phóng sau 14 ngày nếu không có tranh chấp.":"Funds auto-release after 14 days with no dispute."}
                    </p>
                  </div>
                </div>
              )}
              {disputedOrders.length > 0 && (
                <div style={{ border:`1px solid ${T.red.bg}`, borderRadius:12, backgroundColor:T.surface, overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.red.bg}`, backgroundColor:T.red.bg, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Warning size={14} color={T.red.text} weight="fill" />
                      <span style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.red.text }}>{isVi?"Tranh chấp đang mở":"Open disputes"}</span>
                    </div>
                    <span style={{ fontFamily:T.fontMono, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", borderRadius:9999, padding:"2px 8px", backgroundColor:T.red.bg, color:T.red.text, border:`1px solid ${T.red.text}` }}>
                      {disputedOrders.length} {isVi?"đang mở":"open"}
                    </span>
                  </div>
                  <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
                    {disputedOrders.map(o => (
                      <div key={o.id} style={{ padding:"14px 16px", borderRadius:10, border:`1px solid ${T.border}`, backgroundColor:T.surface }}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                          <div>
                            <div style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink }}>{o.productName}</div>
                            <div style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted, marginTop:2 }}>{o.orderCode}</div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontFamily:T.fontMono, fontSize:13, fontWeight:700, color:T.ink }}>${o.priceUsdc}</div>
                            {o.disputeDeadlineAt && (
                              <div style={{ fontFamily:T.fontMono, fontSize:11, color:T.red.text, marginTop:2 }}>
                                {disputeDaysLeft(o.disputeDeadlineAt)}{isVi?"ng còn lại":"d left"}
                              </div>
                            )}
                          </div>
                        </div>
                        <a href={`/dashboard/disputes/${o.orderCode}`} style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:T.fontSans, fontSize:12, fontWeight:500, color:T.canvas, backgroundColor:T.red.text, borderRadius:6, padding:"7px 12px", transition:"opacity 150ms" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity="0.85")}
                          onMouseLeave={e => (e.currentTarget.style.opacity="1")}
                        >
                          {isVi?"Phản hồi ngay":"Respond now"} <ArrowRight size={11} weight="bold" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Orders tab content ─── */}
          {activeTab === "orders" && <div ref={tableRef} style={{ border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, overflow:"hidden", ...revealStyle(tableVisible) }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Package size={14} color={T.inkMuted} weight="duotone" />
                <span style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink }}>{t.allOrders}</span>
                <span style={{ fontFamily:T.fontMono, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", borderRadius:9999, padding:"2px 8px", backgroundColor:T.surfaceAlt, color:T.inkMuted }}>{orders.length}</span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ position:"relative" }}>
                  <MagnifyingGlass size={13} color={T.inkMuted} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                  <input type="text" placeholder={isVi?"Tìm đơn hàng...":"Search orders..."} value={search} onChange={e => setSearch(e.target.value)}
                    style={{ fontFamily:T.fontSans, fontSize:12, color:T.ink, border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 12px 7px 28px", outline:"none", backgroundColor:T.canvas, width:190, transition:"border-color 150ms" }}
                    onFocus={e => (e.target.style.borderColor=T.ink)} onBlur={e => (e.target.style.borderColor=T.border)} />
                </div>
                <div style={{ position:"relative" }}>
                  <button onClick={() => setFilterOpen(o => !o)} style={{ display:"flex", alignItems:"center", gap:5, fontFamily:T.fontSans, fontSize:12, color:T.inkMid, border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 12px", backgroundColor:T.canvas, transition:"border-color 150ms" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor=T.ink)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor=T.border)}
                  >
                    <Funnel size={12} />
                    {statusFilter==="all" ? t.filterAll : statusConfig(statusFilter as OrderStatus, isVi).label}
                    <CaretDown size={11} />
                  </button>
                  {filterOpen && (
                    <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:20, border:`1px solid ${T.border}`, borderRadius:8, backgroundColor:T.surface, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.06)", minWidth:160 }}>
                      {(["all","pending_payment","in_escrow","disputed","released","refunded"] as const).map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setFilterOpen(false); }} style={{ width:"100%", textAlign:"left", padding:"9px 14px", fontFamily:T.fontSans, fontSize:13, color:statusFilter===s?T.ink:T.inkMuted, fontWeight:statusFilter===s?500:400, backgroundColor:statusFilter===s?T.surfaceAlt:"transparent", borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}
                          onMouseEnter={e => { if(statusFilter!==s) e.currentTarget.style.backgroundColor=T.surfaceAlt; }}
                          onMouseLeave={e => { if(statusFilter!==s) e.currentTarget.style.backgroundColor="transparent"; }}
                        >
                          {s==="all" ? t.filterAll : statusConfig(s as OrderStatus, isVi).label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button style={{ display:"flex", alignItems:"center", padding:"7px 10px", border:`1px solid ${T.border}`, borderRadius:6, backgroundColor:T.canvas, color:T.inkMuted, transition:"color 150ms" }}
                  onClick={() => window.location.reload()}
                  onMouseEnter={e => (e.currentTarget.style.color=T.ink)}
                  onMouseLeave={e => (e.currentTarget.style.color=T.inkMuted)}
                  title={isVi?"Làm mới":"Refresh"}
                >
                  <ArrowClockwise size={13} />
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding:40, textAlign:"center" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto" }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:"48px 24px", textAlign:"center" }}>
                <Package size={28} color={T.border} weight="duotone" />
                <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, marginTop:12 }}>{t.noOrders}</p>
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt }}>
                      {tableHeaders.map(h => (
                        <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontFamily:T.fontMono, fontSize:10, color:T.inkMuted, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order, i) => {
                      const sc = statusConfig(order.status, isVi);
                      return (
                        <tr key={order.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                          <td style={{ padding:"14px 16px" }}>
                            <div style={{ fontFamily:T.fontMono, fontSize:12, color:T.ink, fontWeight:600 }}>{order.orderCode}</div>
                            <div style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted, marginTop:2 }}>{timeAgo(order.createdAt, isVi)}</div>
                          </td>
                          <td style={{ padding:"14px 16px", maxWidth:220 }}>
                            <div style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{order.productName}</div>
                            {order.warrantyDays>0 && <span style={{ fontFamily:T.fontMono, fontSize:9, letterSpacing:"0.05em", textTransform:"uppercase", borderRadius:9999, padding:"1px 6px", backgroundColor:T.blue.bg, color:T.blue.text, marginTop:4, display:"inline-block" }}>{order.warrantyDays}{isVi?"ng BH":"d warranty"}</span>}
                          </td>
                          <td style={{ padding:"14px 16px" }}><span style={{ fontFamily:T.fontMono, fontSize:13, fontWeight:600, color:T.ink }}>${order.priceUsdc}</span></td>
                          <td style={{ padding:"14px 16px" }}>
                            {order.chainPaidFrom
                              ? <span style={{ fontFamily:T.fontMono, fontSize:10, letterSpacing:"0.04em", textTransform:"uppercase", borderRadius:9999, padding:"2px 8px", backgroundColor:T.surfaceAlt, color:T.inkMuted }}>{CHAIN_LABELS[order.chainPaidFrom]??order.chainPaidFrom}</span>
                              : <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.border }}>—</span>
                            }
                          </td>
                          <td style={{ padding:"14px 16px" }}>
                            {order.status==="in_escrow"&&order.escrowCreatedAt
                              ? <div>
                                  <span style={{ fontFamily:T.fontMono, fontSize:12, color:T.yellow.text, fontWeight:600 }}>{escrowDaysLeft(order.escrowCreatedAt)}d</span><span style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted }}> {isVi?"còn lại":"left"}</span>
                                  {!order.shippedAt && <div style={{ fontFamily:T.fontSans, fontSize:10, color:T.red.text, marginTop:2 }}>{isVi?"chưa giao hàng":"not shipped"}</div>}
                                </div>
                              : order.status==="disputed"
                              ? <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.red.text, fontWeight:500 }}>{isVi?"Đang tranh chấp":"Disputed"}</span>
                              : <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.border }}>—</span>
                            }
                          </td>
                          <td style={{ padding:"14px 16px" }}><span style={{ fontFamily:T.fontMono, fontSize:10, letterSpacing:"0.05em", textTransform:"uppercase", borderRadius:9999, padding:"3px 9px", backgroundColor:sc.bg, color:sc.text }}>{sc.label}</span></td>
                          <td style={{ padding:"14px 16px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              {(order.status === "in_escrow" || order.status === "paid") && !order.shippedAt && (
                                <button
                                  onClick={() => setShipOrder(order)}
                                  style={{ display:"inline-flex", alignItems:"center", gap:4, fontFamily:T.fontSans, fontSize:12, fontWeight:500, color:T.canvas, backgroundColor:T.ink, border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", transition:"background-color 150ms" }}
                                  onMouseEnter={e => (e.currentTarget.style.backgroundColor="#333")}
                                  onMouseLeave={e => (e.currentTarget.style.backgroundColor=T.ink)}
                                >
                                  <Truck size={11} weight="fill" /> {isVi?"Giao hàng":"Ship"}
                                </button>
                              )}
                              {/* Trước đây trỏ tới /pay/{orderCode} (trang thanh toán) — vô lý vì đây là
                                  Dashboard của SELLER, không phải người trả tiền. Đổi thành mở thẳng
                                  giao dịch đã ký trên Arc Explorer (testnet.arcscan.app — xác nhận qua
                                  web search đây mới là explorer chính thức, không phải explorer.arc.network
                                  như wagmi.config.ts đang cấu hình — 2 chỗ đó có thể cũng cần sửa sau).
                                  Chỉ hiện khi đơn đã có tx_hash (tức đã thật sự phát sinh giao dịch on-chain);
                                  đơn còn pending_payment thì chưa có gì để xem trên chain cả. */}
                              {order.txHash ? (
                                <a href={`https://testnet.arcscan.app/tx/${order.txHash}`} target="_blank" rel="noreferrer"
                                  style={{ display:"inline-flex", alignItems:"center", gap:4, fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:"5px 10px", backgroundColor:T.surface, transition:"color 150ms, border-color 150ms" }}
                                  onMouseEnter={e => { e.currentTarget.style.color=T.ink; e.currentTarget.style.borderColor=T.ink; }}
                                  onMouseLeave={e => { e.currentTarget.style.color=T.inkMuted; e.currentTarget.style.borderColor=T.border; }}
                                >
                                  {isVi?"Xem giao dịch":"View tx"} <ArrowSquareOut size={11} />
                                </a>
                              ) : (
                                <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.border }}>—</span>
                              )}
                              {!order.listingId && (
                                <>
                                  <button
                                    onClick={() => handleDuplicateOrder(order)}
                                    title={isVi?"Nhân bản đơn để test thanh toán lại":"Duplicate order to test payment again"}
                                    style={{ display:"inline-flex", alignItems:"center", gap:4, fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:"5px 10px", backgroundColor:T.surface, cursor:"pointer", transition:"color 150ms, border-color 150ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.color=T.ink; e.currentTarget.style.borderColor=T.ink; }}
                                    onMouseLeave={e => { e.currentTarget.style.color=T.inkMuted; e.currentTarget.style.borderColor=T.border; }}
                                  >
                                    <Copy size={11} /> {isVi?"Test lại":"Retest"}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order)}
                                    title={isVi?"Xóa đơn":"Delete order"}
                                    style={{ display:"inline-flex", alignItems:"center", padding:"5px 8px", border:`1px solid ${T.border}`, borderRadius:6, color:T.inkMuted, backgroundColor:T.surface, cursor:"pointer", transition:"color 150ms, border-color 150ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.color=T.red.text; e.currentTarget.style.borderColor=T.red.text; }}
                                    onMouseLeave={e => { e.currentTarget.style.color=T.inkMuted; e.currentTarget.style.borderColor=T.border; }}
                                  >
                                    <Trash size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>}

          {/* ─── Listings tab content ─── */}
          {activeTab === "listings" && (
            <div>
              {/* Header row */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div>
                  <h2 style={{ fontFamily:T.fontSans, fontSize:16, fontWeight:600, color:T.ink }}>{isVi?"Sản phẩm đang bán":"Active products"}</h2>
                  <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginTop:3 }}>{isVi?"Người mua có thể thấy và mua trực tiếp từ trang shop":"Buyers can see and purchase directly from your shop page"}</p>
                </div>
                <button onClick={openCreateModal} style={{ display:"flex", alignItems:"center", gap:6, fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"8px 14px", transition:"background-color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor="#333")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor=T.ink)}
                >
                  <Plus size={13} weight="bold" /> {isVi?"Thêm sản phẩm":"Add product"}
                </button>
              </div>

              {listings.length === 0 ? (
                <div style={{ border:`2px dashed ${T.border}`, borderRadius:12, padding:"48px 24px", textAlign:"center" }}>
                  <Tag size={28} color={T.border} weight="duotone" style={{ marginBottom:12 }} />
                  <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, marginBottom:16 }}>
                    {isVi?"Chưa có sản phẩm nào. Thêm sản phẩm để hiển thị trên trang shop của bạn.":"No products yet. Add products to show on your shop page."}
                  </p>
                  <button onClick={openCreateModal} style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 16px" }}>
                    <Plus size={13} weight="bold" /> {isVi?"Thêm sản phẩm đầu tiên":"Add first product"}
                  </button>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
                  {listings.map(l => (
                    // Cả card bấm được, chuyển sang trang quản lý riêng /dashboard/product/[id] —
                    // trước đây có 3 nút icon nhỏ (edit/toggle/xóa) ngay trên card, giờ dời hết
                    // sang trang chi tiết đó với nút to hơn + có chữ, theo yêu cầu user.
                    <a key={l.id} href={ROUTES.manageProduct(l.id)} style={{ display:"block", border:`1px solid ${l.isActive?T.border:T.surfaceAlt}`, borderRadius:12, backgroundColor:l.isActive?T.surface:T.surfaceAlt, overflow:"hidden", opacity:l.isActive?1:0.65, transition:"opacity 200ms, box-shadow 150ms" }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow="none")}
                    >
                      {/* Image */}
                      {l.imageCid && (
                        <div style={{ height:140, overflow:"hidden", backgroundColor:T.surfaceAlt }}>
                          <img src={`https://gateway.pinata.cloud/ipfs/${l.imageCid}`} alt={l.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                        </div>
                      )}
                      {!l.imageCid && (
                        <div style={{ height:80, display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:T.surfaceAlt }}>
                          <Image size={24} color={T.border} weight="duotone" />
                        </div>
                      )}
                      {/* Content */}
                      <div style={{ padding:"14px 16px" }}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:6 }}>
                          <p style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:600, color:T.ink, flex:1, lineHeight:1.3 }}>{l.name}</p>
                          <span style={{ fontFamily:T.fontMono, fontSize:14, fontWeight:700, color:T.ink, flexShrink:0 }}>${parseFloat(l.priceUsdc).toFixed(2)}</span>
                        </div>
                        {l.description && (
                          <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, lineHeight:1.5, marginBottom:10, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" } as React.CSSProperties}>
                            {l.description}
                          </p>
                        )}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
                          <span style={{ fontFamily:T.fontMono, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", borderRadius:9999, padding:"2px 8px", backgroundColor:l.isActive?T.green.bg:T.surfaceAlt, color:l.isActive?T.green.text:T.inkMuted }}>
                            {l.isActive?(isVi?"Đang bán":"Active"):(isVi?"Đã tắt":"Inactive")}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Reviews tab content ─── */}
          {activeTab === "reviews" && (
            reviews.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 24px", border:`1px dashed ${T.border}`, borderRadius:12 }}>
                <Star size={36} color={T.border} style={{ marginBottom:12 }} />
                <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted }}>
                  {isVi?"Chưa có đánh giá nào.":"No reviews yet."}
                </p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {reviews.map(rv => (
                  <div key={rv.id} style={{ border:`1px solid ${T.border}`, borderRadius:10, backgroundColor:T.surface, padding:"16px 20px" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:4 }}>
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} size={12} weight="fill" color={i<=rv.rating?T.yellow.text:T.border} />
                          ))}
                          <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginLeft:6 }}>
                            {rv.product_name} · {rv.order_code}
                          </span>
                        </div>
                        {rv.comment && (
                          <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink, lineHeight:1.6, marginBottom:4 }}>{rv.comment}</p>
                        )}
                        <p style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted }}>
                          {shortenAddr(rv.buyer_wallet)} · {timeAgo(rv.created_at, isVi)}
                        </p>
                      </div>
                    </div>

                    {rv.shop_reply && replyingId !== rv.id && (
                      <div style={{ marginTop:10, padding:"10px 14px", borderRadius:8, backgroundColor:T.surfaceAlt, borderLeft:`2px solid ${T.inkMid}` }}>
                        <p style={{ fontFamily:T.fontSans, fontSize:11, fontWeight:600, color:T.inkMid, marginBottom:3 }}>
                          {isVi?"Phản hồi của shop":"Shop's reply"}
                        </p>
                        <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink, lineHeight:1.6 }}>{rv.shop_reply}</p>
                        <button onClick={() => { setReplyingId(rv.id); setReplyText(rv.shop_reply ?? ""); }}
                          style={{ fontFamily:T.fontSans, fontSize:11, color:T.blue.text, marginTop:6, cursor:"pointer" }}>
                          {isVi?"Sửa phản hồi":"Edit reply"}
                        </button>
                      </div>
                    )}

                    {!rv.shop_reply && replyingId !== rv.id && (
                      <button onClick={() => { setReplyingId(rv.id); setReplyText(""); }}
                        style={{ display:"inline-flex", alignItems:"center", gap:4, fontFamily:T.fontSans, fontSize:12, fontWeight:500, color:T.canvas, backgroundColor:T.ink, padding:"5px 12px", borderRadius:6, marginTop:8, border:"none", cursor:"pointer" }}>
                        {isVi?"Trả lời":"Reply"}
                      </button>
                    )}

                    {replyingId === rv.id && (
                      <div style={{ marginTop:10 }}>
                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                          placeholder={isVi?"Viết phản hồi cho khách hàng...":"Write a reply to your customer..."}
                          rows={3}
                          style={{ width:"100%", fontFamily:T.fontSans, fontSize:13, color:T.ink, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 12px", resize:"vertical", marginBottom:8 }}
                        />
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => submitReply(rv.id)} disabled={replySaving || !replyText.trim()}
                            style={{ fontFamily:T.fontSans, fontSize:12, fontWeight:500, color:T.canvas, backgroundColor:T.ink, padding:"6px 14px", borderRadius:6, border:"none", cursor:replySaving?"default":"pointer", opacity:replySaving||!replyText.trim()?0.5:1 }}>
                            {replySaving?(isVi?"Đang gửi...":"Sending..."):(isVi?"Gửi":"Send")}
                          </button>
                          <button onClick={() => { setReplyingId(null); setReplyText(""); }}
                            style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, padding:"6px 14px", borderRadius:6, border:`1px solid ${T.border}`, backgroundColor:"transparent", cursor:"pointer" }}>
                            {isVi?"Hủy":"Cancel"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── Chat tab content ─── */}
          {activeTab === "chat" && (
            <div style={{ maxWidth: 420 }}>
              <ChatWidget variant="panel" />
            </div>
          )}
        </div>
      </main>

      {/* ─── Create/Edit Listing Modal ─── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.4)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ backgroundColor:T.surface, borderRadius:12, padding:24, width:"100%", maxWidth:440, border:`1px solid ${T.border}`, boxShadow:"0 8px 32px rgba(0,0,0,0.12)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h3 style={{ fontFamily:T.fontSans, fontSize:16, fontWeight:600, color:T.ink }}>
                {editListing ? (isVi?"Chỉnh sửa sản phẩm":"Edit product") : (isVi?"Thêm sản phẩm mới":"Add new product")}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color:T.inkMuted, cursor:"pointer" }}><X size={18} /></button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ display:"block", fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginBottom:5 }}>{isVi?"Tên sản phẩm *":"Product name *"}</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({...p,name:e.target.value}))} placeholder={isVi?"VD: Áo thun basic trắng":"E.g. White basic t-shirt"}
                  style={{ width:"100%", fontFamily:T.fontSans, fontSize:13, color:T.ink, border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", outline:"none" }}
                  onFocus={e => (e.target.style.borderColor=T.ink)} onBlur={e => (e.target.style.borderColor=T.border)} />
              </div>
              <div>
                <label style={{ display:"block", fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginBottom:5 }}>{isVi?"Giá (USDC) *":"Price (USDC) *"}</label>
                <input type="number" min="0.01" step="0.01" value={form.price_usdc} onChange={e => setForm(p => ({...p,price_usdc:e.target.value}))} placeholder="0.00"
                  style={{ width:"100%", fontFamily:T.fontMono, fontSize:13, color:T.ink, border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", outline:"none" }}
                  onFocus={e => (e.target.style.borderColor=T.ink)} onBlur={e => (e.target.style.borderColor=T.border)} />
              </div>
              <div>
                <label style={{ display:"block", fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginBottom:5 }}>{isVi?"Mô tả (tùy chọn)":"Description (optional)"}</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(p => ({...p,description:e.target.value}))} placeholder={isVi?"Mô tả ngắn về sản phẩm...":"Short product description..."}
                  style={{ width:"100%", fontFamily:T.fontSans, fontSize:13, color:T.ink, border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", outline:"none", resize:"vertical" }}
                  onFocus={e => (e.target.style.borderColor=T.ink)} onBlur={e => (e.target.style.borderColor=T.border)} />
              </div>
              <div>
                <label style={{ display:"block", fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginBottom:5 }}>{isVi?"Bảo hành (ngày, 0 = không bảo hành)":"Warranty (days, 0 = none)"}</label>
                <input type="number" min="0" max="3650" step="1" value={form.warranty_days} onChange={e => setForm(p => ({...p,warranty_days:e.target.value}))} placeholder="0"
                  style={{ width:"100%", fontFamily:T.fontMono, fontSize:13, color:T.ink, border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", outline:"none" }}
                  onFocus={e => (e.target.style.borderColor=T.ink)} onBlur={e => (e.target.style.borderColor=T.border)} />
                <p style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted, marginTop:4 }}>
                  {isVi ? "Áp dụng cho đơn buyer mua trực tiếp từ sản phẩm này (không áp dụng khi bạn tự tạo đơn thủ công)." : "Applies to orders buyers place directly on this product (not manual orders you create yourself)."}
                </p>
              </div>
              <div>
                <label style={{ display:"block", fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginBottom:5 }}>{isVi?"Ảnh sản phẩm (tùy chọn)":"Product image (optional)"}</label>
                {form.image_cid && (
                  <div style={{ position:"relative", marginBottom:8 }}>
                    <img src={`https://gateway.pinata.cloud/ipfs/${form.image_cid}`} alt="" style={{ width:"100%", height:160, objectFit:"contain", backgroundColor:T.surfaceAlt, borderRadius:6, border:`1px solid ${T.border}` }} onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                    <button onClick={() => setForm(p => ({...p,image_cid:""}))} style={{ position:"absolute", top:6, right:6, width:22, height:22, borderRadius:"50%", backgroundColor:"rgba(0,0,0,0.5)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><X size={12} /></button>
                  </div>
                )}
                <label style={{ display:"flex", alignItems:"center", gap:6, fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 12px", cursor:imgUploading?"not-allowed":"pointer", backgroundColor:T.canvas }}>
                  <Image size={14} />
                  {imgUploading ? (isVi?"Đang upload...":"Uploading...") : (isVi?"Chọn ảnh":"Select image")}
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display:"none" }} onChange={handleImgUpload} disabled={imgUploading} />
                </label>
              </div>
              {formError && <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.red.text }}>{formError}</p>}
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={() => setShowModal(false)} style={{ flex:1, fontFamily:T.fontSans, fontSize:13, color:T.inkMid, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 0", cursor:"pointer", backgroundColor:T.canvas }}>
                  {isVi?"Hủy":"Cancel"}
                </button>
                <button onClick={handleSaveListing} disabled={formSaving || imgUploading} style={{ flex:1, fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.canvas, backgroundColor:(formSaving||imgUploading)?T.border:T.ink, borderRadius:6, padding:"10px 0", cursor:(formSaving||imgUploading)?"not-allowed":"pointer", transition:"background-color 150ms" }}>
                  {formSaving ? (isVi?"Đang lưu...":"Saving...") : imgUploading ? (isVi?"Đang tải ảnh...":"Uploading image...") : (editListing ? (isVi?"Cập nhật":"Update") : (isVi?"Tạo sản phẩm":"Create product"))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:60, backgroundColor:T.ink, color:T.canvas, fontFamily:T.fontSans, fontSize:13, padding:"10px 20px", borderRadius:9999, boxShadow:"0 4px 16px rgba(0,0,0,0.15)", whiteSpace:"nowrap", pointerEvents:"none" }}>
          {toastMsg}
        </div>
      )}

      {/* Seller ship modal */}
      {shipOrder && (
        <SellerShipModal
          order={shipOrder}
          isVi={isVi}
          shopWallet={walletAddress ?? ""}
          onClose={() => setShipOrder(null)}
          onShipped={loadOrders}
        />
      )}
    </>
  );
}
