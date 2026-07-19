/**
 * GiuPay — ProductDetailPage
 *
 * Trang chi tiết sản phẩm ĐỘC LẬP (full page, kiểu Shopee: bấm vào sản phẩm ở trang shop →
 * chuyển hẳn sang URL riêng /shop/[shopId]/product/[listingId] → xem đầy đủ ảnh/mô tả/bảo hành
 * → bấm "Mua ngay" MỚI thật sự gọi API tạo đơn + chuyển sang trang thanh toán).
 *
 * Đây là bản thay thế cho ListingDetailModal (đã bị xóa) — user yêu cầu dùng 1 trang riêng
 * thay vì popup, để có URL chia sẻ được, back button hoạt động đúng, giống trải nghiệm Shopee.
 */
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { useWallet } from "@/hooks/useWallet";
import { NavBarMinimal } from "@/components/NavBarMinimal";
import { ROUTES } from "@/lib/app-routes";
import { T } from "@/lib/tokens";
import { coverImage } from "@/lib/coverImage";
import { isDemoShop, getDemoListingDetail } from "@/lib/demo-shops";
import { DemoBuyModal } from "@/components/DemoBuyModal";
import {
  ShieldCheck, ShoppingCartSimple, CircleNotch,
  Storefront, Warning, CheckCircle, ClockCountdown, ArrowRight, Sparkle, ChatCircleDots,
} from "@phosphor-icons/react";
import { ChatWidget } from "@/components/ChatWidget";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:${T.canvas}; font-family:${T.fontSans}; color:${T.ink}; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; } button { font-family:inherit; cursor:pointer; border:none; background:none; }
  @keyframes ap-shimmer { 0%,100%{opacity:1} 50%{opacity:0.45} }
`;

export interface ListingDetail {
  id: string; name: string; description?: string | null;
  priceUsdc: string; imageCid?: string | null; warrantyDays: number;
  isActive: boolean; shopId: string; shopName: string;
  category?: string | null; // chỉ demo listing mới có — dùng để chọn ảnh placeholder + emoji
  shopWallet?: string; // dùng để chặn chủ shop tự mua sản phẩm của chính mình
}

interface ProductDetailPageProps {
  initialListing?: ListingDetail;
}

export default function ProductDetailPage({ initialListing }: ProductDetailPageProps = {}) {
  const { lang } = useTheme();
  const isVi = lang === "vi";
  const { walletAddress } = useWallet();
  const [listing, setListing] = useState<ListingDetail | null>(initialListing ?? null);
  const [loading, setLoading] = useState(!initialListing);
  const [buying, setBuying]   = useState(false);
  const [error, setError]     = useState("");
  // Demo listing: "Mua ngay" không gọi API thật (không tồn tại trong DB) — mở modal mô phỏng.
  const [showDemoBuy, setShowDemoBuy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    // Data đã có từ getStaticProps — bỏ qua fetch client-side
    if (initialListing !== undefined) return;

    const segments = window.location.pathname.split("/").filter(Boolean);
    // /shop/[shopId]/product/[listingId]
    const shopId    = segments[segments.length - 3];
    const listingId = segments[segments.length - 1];
    if (!listingId) { setLoading(false); return; }

    if (shopId && isDemoShop(shopId)) {
      const demo = getDemoListingDetail(shopId, listingId);
      setListing(demo as ListingDetail | null);
      setLoading(false);
      return;
    }

    fetch(`${API}/api/listings/${listingId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) return;
        setListing(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDemo = !!listing && isDemoShop(listing.shopId);
  // Ví đang kết nối chính là chủ shop bán sản phẩm này — không cho tự mua hàng của chính mình.
  const isOwnProduct = !!listing?.shopWallet && !!walletAddress
    && walletAddress.toLowerCase() === listing.shopWallet.toLowerCase();

  async function handleBuy() {
    if (!listing || isOwnProduct) return;
    // Demo shop: mô phỏng, không tạo đơn thật (listing này không tồn tại trong DB).
    if (isDemo) { setShowDemoBuy(true); return; }
    setBuying(true);
    setError("");
    try {
      const r = await fetch(`${API}/api/listings/${listing.id}/buy`, { method: "POST" });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "Lỗi");
      window.location.href = ROUTES.pay(j.data.order_code);
    } catch (err: any) {
      setError(isVi ? "Không thể tạo đơn, thử lại" : "Failed to create order");
      setBuying(false);
    }
  }

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back="/shops" />
      <div style={{ minHeight: "100dvh", backgroundColor: T.canvas, display: "flex", flexDirection: "column", gap: 16, padding: "88px 28px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          <div style={{ height: 380, border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surfaceAlt, animation: "ap-shimmer 1.6s ease-in-out infinite" }} />
          <div style={{ height: 380, border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surfaceAlt, animation: "ap-shimmer 1.6s ease-in-out infinite" }} />
        </div>
      </div>
    </>
  );

  if (!listing) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back="/shops" />
      <div style={{ minHeight: "100dvh", backgroundColor: T.canvas, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <Warning size={32} color={T.border} weight="duotone" />
        <p style={{ fontFamily: T.fontSans, fontSize: 14, color: T.inkMuted }}>{isVi ? "Không tìm thấy sản phẩm" : "Product not found"}</p>
        <a href="/shops" style={{ fontFamily: T.fontSans, fontSize: 13, color: T.ink }}>{isVi ? "Về marketplace" : "Back to marketplace"}</a>
      </div>
    </>
  );

  const buyerProtection = isVi
    ? ["Cửa sổ escrow 14 ngày", "Khiếu nại tối đa 3 lần", "SBT bảo hành", "Tự động giải phóng khi hoàn thành"]
    : ["14-day escrow window", "Dispute up to 3 times", "SBT warranty proof", "Auto-release on completion"];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back={ROUTES.shop(listing.shopId)} backLabel={isVi ? "Về shop" : "Back to shop"} title={listing.shopName} />
      <main style={{ minHeight: "100dvh", backgroundColor: T.canvas, paddingTop: 56 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 28px 80px" }}>
          {/* Top: image + buy panel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "start", marginBottom: 28 }}>
            {/* Image */}
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, overflow: "hidden" }}>
              <img
                src={listing.imageCid ? `https://ipfs.io/ipfs/${listing.imageCid}` : coverImage(listing.id, listing.category ?? undefined, 600, 420)}
                alt={listing.name}
                style={{ width: "100%", height: 420, objectFit: "contain", display: "block", backgroundColor: T.surfaceAlt }}
                onError={e => {
                  const img = e.target as HTMLImageElement;
                  if (img.src.startsWith("data:")) return; // đã là placeholder rồi, tránh vòng lặp lỗi
                  img.src = coverImage(listing.id, listing.category ?? undefined, 600, 420);
                }}
              />
            </div>

            {/* Info + Buy */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <a href={ROUTES.shop(listing.shopId)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted }}>
                  <Storefront size={13} /> {listing.shopName}
                </a>
                {!isDemo && !isOwnProduct && walletAddress && (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setChatOpen(o => !o)} title={isVi ? "Chat với shop" : "Chat with shop"}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, height: 24, padding: "0 10px", borderRadius: 6, border: `1px solid ${T.border}`, backgroundColor: T.surfaceAlt, color: T.inkMuted, cursor: "pointer", fontFamily: T.fontSans, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}
                    >
                      <ChatCircleDots size={13} weight="fill" />
                      {isVi ? "Chat với shop" : "Chat with shop"}
                    </button>
                    {chatOpen && (
                      <ChatWidget variant="popover" autoOpenShopId={listing.shopId} autoOpenShopName={listing.shopName} onClose={() => setChatOpen(false)} />
                    )}
                  </div>
                )}
              </div>

              <h1 style={{ fontFamily: T.fontSans, fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, letterSpacing: "-0.02em", color: T.ink, marginBottom: 14, lineHeight: 1.3 }}>
                {listing.name}
              </h1>

              <p style={{ fontFamily: T.fontMono, fontSize: 30, fontWeight: 700, color: T.ink, marginBottom: 18 }}>
                ${parseFloat(listing.priceUsdc).toFixed(2)}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 8, backgroundColor: listing.warrantyDays ? T.green.bg : T.surfaceAlt, marginBottom: 24 }}>
                <ShieldCheck size={15} color={listing.warrantyDays ? T.green.text : T.inkMuted} weight={listing.warrantyDays ? "fill" : "regular"} />
                <span style={{ fontFamily: T.fontSans, fontSize: 13, color: listing.warrantyDays ? T.green.text : T.inkMuted }}>
                  {listing.warrantyDays
                    ? (isVi ? `Bảo hành ${listing.warrantyDays} ngày (kèm SBT xác thực)` : `${listing.warrantyDays}-day warranty (with SBT proof)`)
                    : (isVi ? "Sản phẩm không có bảo hành" : "No warranty on this product")}
                </span>
              </div>

              {isDemo && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: T.yellow.bg, borderRadius: 6, padding: "4px 10px" }}>
                    <Sparkle size={11} color={T.yellow.text} weight="fill" />
                    <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.yellow.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>Demo</span>
                  </div>
                  <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted }}>
                    {isVi ? "Giao dịch sẽ được mô phỏng" : "Transaction will be simulated"}
                  </span>
                </div>
              )}

              <button
                onClick={handleBuy}
                disabled={buying || !listing.isActive || isOwnProduct}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "15px 0", fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.canvas,
                  backgroundColor: (buying || !listing.isActive || isOwnProduct) ? "#999" : T.ink,
                  borderRadius: 9, cursor: (buying || !listing.isActive || isOwnProduct) ? "not-allowed" : "pointer",
                  transition: "background-color 150ms", marginBottom: 10,
                }}
              >
                {buying ? <CircleNotch size={16} style={{ animation: "ap-shimmer 1s linear infinite" }} /> : <ShoppingCartSimple size={16} />}
                {isOwnProduct
                  ? (isVi ? "Sản phẩm của shop bạn" : "Your own shop's product")
                  : !listing.isActive
                  ? (isVi ? "Sản phẩm ngừng bán" : "No longer available")
                  : (isVi ? "Mua ngay" : "Buy now")}
              </button>

              {isOwnProduct && (
                <p style={{ fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, marginBottom: 10, lineHeight: 1.6 }}>
                  {isVi
                    ? "Bạn đang xem sản phẩm của chính shop mình nên không thể tự mua. Muốn quản lý sản phẩm này, vào Dashboard."
                    : "This is your own shop's product, so you can't buy it. To manage it, go to your Dashboard."}
                </p>
              )}

              {error && (
                <p style={{ fontFamily: T.fontSans, fontSize: 12, color: T.red.text, marginBottom: 10 }}>{error}</p>
              )}

              {/* Buyer protection mini list */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, backgroundColor: T.surface, padding: "14px 16px", marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <ClockCountdown size={13} color={T.inkMuted} weight="duotone" />
                  <span style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 500, color: T.ink }}>
                    {isVi ? "Bảo vệ người mua" : "Buyer protection"}
                  </span>
                </div>
                {buyerProtection.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <CheckCircle size={11} color={T.green.text} weight="fill" />
                    <span style={{ fontFamily: T.fontSans, fontSize: 11.5, color: T.inkMid }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full description */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, overflow: "hidden" }}>
            <div style={{ padding: "15px 20px", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.ink }}>
                {isVi ? "Mô tả sản phẩm" : "Product description"}
              </span>
            </div>
            <div style={{ padding: 20 }}>
              {listing.description ? (
                <p style={{ fontFamily: T.fontSans, fontSize: 13.5, color: T.inkMid, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {listing.description}
                </p>
              ) : (
                <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted }}>
                  {isVi ? "Shop chưa thêm mô tả cho sản phẩm này." : "No description provided."}
                </p>
              )}
            </div>
          </div>

          <a href={ROUTES.shop(listing.shopId)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: T.fontSans, fontSize: 12.5, color: T.inkMuted, marginTop: 18 }}>
            {isVi ? "Xem thêm sản phẩm khác của shop" : "See more products from this shop"} <ArrowRight size={12} />
          </a>
        </div>
      </main>

      {showDemoBuy && (
        <DemoBuyModal
          item={{ name: listing.name, priceUsdc: listing.priceUsdc, shopName: listing.shopName }}
          isVi={isVi}
          onClose={() => setShowDemoBuy(false)}
        />
      )}
    </>
  );
}
