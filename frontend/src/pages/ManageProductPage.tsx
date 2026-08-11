/**
 * GiuPay — ManageProductPage
 * Route: /dashboard/product/[id] — bấm vào 1 sản phẩm trong tab "Sản phẩm" ở Dashboard sẽ
 * chuyển sang trang riêng này thay vì chỉ có 3 nút icon nhỏ ngay trên card.
 *
 * Trước đây 3 hành động (sửa/bật-tắt/xóa) nằm ở 3 icon nhỏ trên card trong DashboardPage —
 * user yêu cầu dời hết vào 1 trang chi tiết riêng, nút to hơn + có chữ mô tả thay vì chỉ icon.
 * Sửa thông tin sản phẩm giờ làm inline ngay trên trang này (không dùng modal như trước).
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/lib/theme";
import { T } from "@/lib/tokens";
import { ROUTES } from "@/lib/app-routes";
import { NavBarMinimal } from "@/components/NavBarMinimal";
import {
  PencilSimple, ToggleLeft, ToggleRight, Trash, Image as ImageIcon,
  Warning, ShieldCheck, X, CheckCircle,
} from "@phosphor-icons/react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const GLOBAL_CSS = `@keyframes ap-spin { to { transform:rotate(360deg); } }`;

interface ListingDetail {
  id: string; name: string; description?: string | null;
  priceUsdc: string; imageCid?: string | null; warrantyDays: number;
  isActive: boolean; shopId: string; shopName: string; shopWallet?: string;
}

export default function ManageProductPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { walletAddress } = useWallet();
  const { lang } = useTheme();
  const isVi = lang === "vi";

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", price_usdc: "", description: "", image_cid: "", warranty_days: "0" });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imgUploading, setImgUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  }

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/listings/${id}`);
      const j = await r.json();
      if (!j.success) { setNotFound(true); return; }
      setListing(j.data);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Chủ shop của sản phẩm này mới được xem/sửa trang quản lý — backend (PATCH/DELETE) đã tự
  // chặn ví khác rồi, nhưng chặn luôn ở đây để tránh hiển thị nhầm cho người không liên quan.
  const isOwner = !!listing?.shopWallet && !!walletAddress
    && walletAddress.toLowerCase() === listing.shopWallet.toLowerCase();

  function startEdit() {
    if (!listing) return;
    setForm({
      name: listing.name,
      price_usdc: listing.priceUsdc,
      description: listing.description ?? "",
      image_cid: listing.imageCid ?? "",
      warranty_days: String(listing.warrantyDays ?? 0),
    });
    setFormError("");
    setEditing(true);
  }

  async function handleImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImgUploading(true);
    try {
      const fd = new FormData(); fd.append("image", file);
      const r = await fetch(`${API}/api/upload/image`, { method: "POST", body: fd });
      const j = await r.json();
      if (j.success) setForm(prev => ({ ...prev, image_cid: j.data.cid }));
    } catch {} finally { setImgUploading(false); }
  }

  async function handleSave() {
    if (!listing || !walletAddress) return;
    if (!form.name.trim()) { setFormError(isVi ? "Tên sản phẩm không được trống" : "Name is required"); return; }
    if (!form.price_usdc || isNaN(parseFloat(form.price_usdc)) || parseFloat(form.price_usdc) <= 0) {
      setFormError(isVi ? "Giá không hợp lệ" : "Invalid price"); return;
    }
    setFormSaving(true); setFormError("");
    try {
      const r = await fetch(`${API}/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Wallet-Address": walletAddress },
        body: JSON.stringify({
          name: form.name.trim(),
          price_usdc: parseFloat(form.price_usdc),
          description: form.description || undefined,
          image_cid: form.image_cid || undefined,
          warranty_days: parseInt(form.warranty_days) || 0,
        }),
      });
      const j = await r.json();
      if (!j.success) { setFormError(j.error ?? "Lỗi"); return; }
      setEditing(false);
      await load();
      showToast(isVi ? "Đã cập nhật sản phẩm" : "Product updated");
    } catch { setFormError(isVi ? "Lỗi server" : "Server error"); }
    finally { setFormSaving(false); }
  }

  async function handleToggle() {
    if (!listing || !walletAddress) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Wallet-Address": walletAddress },
        body: JSON.stringify({ is_active: !listing.isActive }),
      });
      if ((await r.json()).success) {
        await load();
        showToast(!listing.isActive ? (isVi ? "Đã bật bán lại" : "Product enabled") : (isVi ? "Đã tạm ngừng bán" : "Product disabled"));
      }
    } finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!listing || !walletAddress) return;
    if (!confirm(isVi ? `Xóa "${listing.name}"? Không thể hoàn tác.` : `Delete "${listing.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/listings/${listing.id}`, { method: "DELETE", headers: { "X-Wallet-Address": walletAddress } });
      if ((await r.json()).success) {
        router.push(ROUTES.dashboard);
      }
    } finally { setBusy(false); }
  }

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back={ROUTES.dashboard} backLabel={isVi ? "Về Dashboard" : "Back to Dashboard"} />
      <div style={{ minHeight: "100dvh", backgroundColor: T.canvas, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 58 }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.ink, animation: "ap-spin 700ms linear infinite" }} />
      </div>
    </>
  );

  if (notFound || !listing) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back={ROUTES.dashboard} backLabel={isVi ? "Về Dashboard" : "Back to Dashboard"} />
      <div style={{ minHeight: "100dvh", backgroundColor: T.canvas, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, paddingTop: 58 }}>
        <Warning size={28} color={T.border} weight="duotone" />
        <p style={{ fontFamily: T.fontSans, fontSize: 14, color: T.inkMuted }}>{isVi ? "Không tìm thấy sản phẩm" : "Product not found"}</p>
        <a href={ROUTES.dashboard} style={{ fontFamily: T.fontSans, fontSize: 13, color: T.ink }}>{isVi ? "Về Dashboard" : "Back to Dashboard"}</a>
      </div>
    </>
  );

  if (!isOwner) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back={ROUTES.dashboard} backLabel={isVi ? "Về Dashboard" : "Back to Dashboard"} />
      <div style={{ minHeight: "100dvh", backgroundColor: T.canvas, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, paddingTop: 58 }}>
        <Warning size={28} color={T.border} weight="duotone" />
        <p style={{ fontFamily: T.fontSans, fontSize: 14, color: T.inkMuted }}>
          {isVi ? "Bạn không phải chủ sản phẩm này" : "You don't own this product"}
        </p>
        <a href={ROUTES.dashboard} style={{ fontFamily: T.fontSans, fontSize: 13, color: T.ink }}>{isVi ? "Về Dashboard" : "Back to Dashboard"}</a>
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back={ROUTES.dashboard} backLabel={isVi ? "Về Dashboard" : "Back to Dashboard"} title={listing.name} />
      <main style={{ minHeight: "100dvh", backgroundColor: T.canvas, paddingTop: 56 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 28px 80px" }}>

          {/* Image */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, overflow: "hidden", marginBottom: 24 }}>
            {listing.imageCid ? (
              <img src={`https://gateway.pinata.cloud/ipfs/${listing.imageCid}`} alt={listing.name}
                style={{ width: "100%", height: 320, objectFit: "contain", display: "block", backgroundColor: T.surfaceAlt }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: T.surfaceAlt }}>
                <ImageIcon size={32} color={T.border} weight="duotone" />
              </div>
            )}
          </div>

          {!editing ? (
            <>
              {/* Display view */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <h1 style={{ fontFamily: T.fontSans, fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, letterSpacing: "-0.02em", color: T.ink, lineHeight: 1.3 }}>
                  {listing.name}
                </h1>
                <span style={{ fontFamily: T.fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: 9999, padding: "3px 10px", backgroundColor: listing.isActive ? T.green.bg : T.surfaceAlt, color: listing.isActive ? T.green.text : T.inkMuted, whiteSpace: "nowrap" }}>
                  {listing.isActive ? (isVi ? "Đang bán" : "Active") : (isVi ? "Đã tạm ngừng" : "Inactive")}
                </span>
              </div>

              <p style={{ fontFamily: T.fontMono, fontSize: 28, fontWeight: 700, color: T.ink, marginBottom: 16 }}>
                ${parseFloat(listing.priceUsdc).toFixed(2)}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 8, backgroundColor: listing.warrantyDays ? T.green.bg : T.surfaceAlt, marginBottom: 24 }}>
                <ShieldCheck size={15} color={listing.warrantyDays ? T.green.text : T.inkMuted} weight={listing.warrantyDays ? "fill" : "regular"} />
                <span style={{ fontFamily: T.fontSans, fontSize: 13, color: listing.warrantyDays ? T.green.text : T.inkMuted }}>
                  {listing.warrantyDays
                    ? (isVi ? `Bảo hành ${listing.warrantyDays} ngày` : `${listing.warrantyDays}-day warranty`)
                    : (isVi ? "Không có bảo hành" : "No warranty")}
                </span>
              </div>

              <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, overflow: "hidden", marginBottom: 28 }}>
                <div style={{ padding: "13px 18px", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.ink }}>{isVi ? "Mô tả sản phẩm" : "Product description"}</span>
                </div>
                <div style={{ padding: 18 }}>
                  {listing.description ? (
                    <p style={{ fontFamily: T.fontSans, fontSize: 13.5, color: T.inkMid, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{listing.description}</p>
                  ) : (
                    <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted }}>{isVi ? "Chưa có mô tả." : "No description."}</p>
                  )}
                </div>
              </div>

              {/* Big, text-labeled action buttons — thay cho 3 icon nhỏ trước đây */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={startEdit} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 0", fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.canvas, backgroundColor: T.ink, borderRadius: 9, cursor: busy ? "not-allowed" : "pointer", transition: "background-color 150ms" }}
                  onMouseEnter={e => !busy && (e.currentTarget.style.backgroundColor = "#333")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = T.ink)}
                >
                  <PencilSimple size={16} weight="bold" /> {isVi ? "Chỉnh sửa thông tin" : "Edit product info"}
                </button>

                <button onClick={handleToggle} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 0", fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, color: T.ink, backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, cursor: busy ? "not-allowed" : "pointer", transition: "border-color 150ms" }}
                  onMouseEnter={e => !busy && (e.currentTarget.style.borderColor = T.ink)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                >
                  {listing.isActive ? <ToggleLeft size={18} /> : <ToggleRight size={18} weight="fill" color={T.green.text} />}
                  {listing.isActive ? (isVi ? "Tạm ngừng bán" : "Disable product") : (isVi ? "Bật bán lại" : "Enable product")}
                </button>

                <button onClick={handleDelete} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 0", fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, color: T.red.text, backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, cursor: busy ? "not-allowed" : "pointer", transition: "border-color 150ms, background-color 150ms" }}
                  onMouseEnter={e => !busy && (e.currentTarget.style.borderColor = T.red.text, e.currentTarget.style.backgroundColor = T.red.bg)}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.backgroundColor = T.surface; }}
                >
                  <Trash size={16} /> {isVi ? "Xóa sản phẩm" : "Delete product"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Inline edit form */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 style={{ fontFamily: T.fontSans, fontSize: 16, fontWeight: 600, color: T.ink }}>{isVi ? "Chỉnh sửa sản phẩm" : "Edit product"}</h2>
                <button onClick={() => setEditing(false)} style={{ color: T.inkMuted, cursor: "pointer" }}><X size={18} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, marginBottom: 5 }}>{isVi ? "Tên sản phẩm *" : "Product name *"}</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    style={{ width: "100%", fontFamily: T.fontSans, fontSize: 13, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = T.border)} />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, marginBottom: 5 }}>{isVi ? "Giá (USDC) *" : "Price (USDC) *"}</label>
                  <input type="number" min="0.01" step="0.01" value={form.price_usdc} onChange={e => setForm(p => ({ ...p, price_usdc: e.target.value }))}
                    style={{ width: "100%", fontFamily: T.fontMono, fontSize: 13, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = T.border)} />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, marginBottom: 5 }}>{isVi ? "Mô tả (tùy chọn)" : "Description (optional)"}</label>
                  <textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    style={{ width: "100%", fontFamily: T.fontSans, fontSize: 13, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", outline: "none", resize: "vertical" }}
                    onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = T.border)} />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, marginBottom: 5 }}>{isVi ? "Bảo hành (ngày, 0 = không bảo hành)" : "Warranty (days, 0 = none)"}</label>
                  <input type="number" min="0" max="3650" step="1" value={form.warranty_days} onChange={e => setForm(p => ({ ...p, warranty_days: e.target.value }))}
                    style={{ width: "100%", fontFamily: T.fontMono, fontSize: 13, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = T.border)} />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, marginBottom: 5 }}>{isVi ? "Ảnh sản phẩm (tùy chọn)" : "Product image (optional)"}</label>
                  {form.image_cid && (
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <img src={`https://gateway.pinata.cloud/ipfs/${form.image_cid}`} alt="" style={{ width: "100%", height: 180, objectFit: "contain", backgroundColor: T.surfaceAlt, borderRadius: 6, border: `1px solid ${T.border}` }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <button onClick={() => setForm(p => ({ ...p, image_cid: "" }))} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={12} /></button>
                    </div>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 12px", cursor: imgUploading ? "not-allowed" : "pointer", backgroundColor: T.canvas }}>
                    <ImageIcon size={14} />
                    {imgUploading ? (isVi ? "Đang upload..." : "Uploading...") : (isVi ? "Chọn ảnh" : "Select image")}
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImgUpload} disabled={imgUploading} />
                  </label>
                </div>
                {formError && <p style={{ fontFamily: T.fontSans, fontSize: 12, color: T.red.text }}>{formError}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => setEditing(false)} style={{ flex: 1, fontFamily: T.fontSans, fontSize: 13, color: T.inkMid, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 0", cursor: "pointer", backgroundColor: T.canvas }}>
                    {isVi ? "Hủy" : "Cancel"}
                  </button>
                  <button onClick={handleSave} disabled={formSaving || imgUploading} style={{ flex: 1, fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.canvas, backgroundColor: (formSaving || imgUploading) ? T.border : T.ink, borderRadius: 6, padding: "10px 0", cursor: (formSaving || imgUploading) ? "not-allowed" : "pointer", transition: "background-color 150ms" }}>
                    {formSaving ? (isVi ? "Đang lưu..." : "Saving...") : imgUploading ? (isVi ? "Đang tải ảnh..." : "Uploading image...") : (isVi ? "Lưu thay đổi" : "Save changes")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, backgroundColor: T.ink, color: T.canvas, fontFamily: T.fontSans, fontSize: 13, padding: "10px 20px", borderRadius: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", whiteSpace: "nowrap", pointerEvents: "none" }}>
          {toastMsg}
        </div>
      )}
    </>
  );
}
