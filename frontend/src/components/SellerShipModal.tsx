"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Truck, X, CircleNotch, Package, MapPin, User, Phone } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";

export interface ShipOrder {
  orderCode: string;
  productName: string;
  priceUsdc: string;
  buyerWallet?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerAddress?: string;
}

interface Props {
  order: ShipOrder;
  isVi: boolean;
  shopWallet: string;            // ví shop — gửi qua header x-wallet-address (requireShop)
  onClose: () => void;
  onShipped?: () => void;        // gọi sau khi tạo giao hàng thành công (để refresh list)
}

const SPIN_CSS = `@keyframes ssm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function SellerShipModal({ order, isVi, shopWallet, onClose, onShipped }: Props) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [trackingCode, setTrackingCode] = useState("");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth]   = useState("");
  const [height, setHeight] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function validate() {
    const errs: Record<string, string> = {};
    const w = parseFloat(weight);
    if (!weight || isNaN(w) || w <= 0)
      errs.weight = isVi ? "Nhập cân nặng hợp lệ (g)" : "Enter a valid weight (g)";
    const dims = [parseFloat(length), parseFloat(width), parseFloat(height)];
    if (dims.some(d => isNaN(d) || d <= 0))
      errs.dims = isVi ? "Nhập đủ kích thước hợp lệ (cm)" : "Enter valid dimensions (cm)";
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch(`${API}/api/orders/${order.orderCode}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet-address": shopWallet },
        body: JSON.stringify({
          weight: Math.round(parseFloat(weight)),
          length: Math.round(parseFloat(length)),
          width:  Math.round(parseFloat(width)),
          height: Math.round(parseFloat(height)),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrors({ api: json.error || (isVi ? "Tạo giao hàng thất bại" : "Failed to create shipment") });
        setSubmitting(false);
        return;
      }
      setTrackingCode(json.data?.ship_tracking ?? "");
      setStep("success");
      onShipped?.();
    } catch {
      setErrors({ api: isVi ? "Lỗi kết nối máy chủ" : "Server connection error" });
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: "100%", padding: "8px 10px", fontFamily: T.fontSans, fontSize: 13,
    color: T.ink, backgroundColor: T.canvas, border: `1px solid ${T.border}`,
    borderRadius: 7, outline: "none", boxSizing: "border-box",
  };
  const labelBase: React.CSSProperties = {
    display: "block", fontFamily: T.fontSans, fontSize: 12,
    fontWeight: 500, color: T.inkMid, marginBottom: 5,
  };
  const errBase: React.CSSProperties = {
    fontFamily: T.fontSans, fontSize: 11, color: T.red.text, marginTop: 3,
  };

  return (
    <>
      <style>{SPIN_CSS}</style>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "22px 22px 24px", maxWidth: 460, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.16)", maxHeight: "90dvh", overflowY: "auto" }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: T.blue.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Truck size={14} color={T.blue.text} weight="fill" />
              </div>
              <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.blue.text, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                {isVi ? "Tạo đơn giao hàng" : "Create shipment"}
              </span>
            </div>
            <button onClick={onClose} style={{ color: T.inkMuted, padding: 2 }}><X size={16} /></button>
          </div>

          {step === "form" ? (
            <>
              {/* Order summary */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 18, backgroundColor: T.canvas }}>
                <div style={{ display: "flex", alignItems: "center", gap:6, marginBottom: 4 }}>
                  <Package size={12} color={T.inkMuted} weight="duotone" />
                  <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.inkMuted }}>{order.orderCode}</span>
                </div>
                <p style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink }}>{order.productName}</p>
                <p style={{ fontFamily: T.fontMono, fontSize: 13, fontWeight: 700, color: T.ink, marginTop: 4 }}>${parseFloat(order.priceUsdc).toFixed(2)} USDC</p>
              </div>

              {/* Buyer info — auto-filled from order */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink }}>
                    {isVi ? "Thông tin người nhận" : "Recipient info"}
                  </span>
                  <span style={{ fontFamily: T.fontMono, fontSize: 9, color: T.blue.text, backgroundColor: T.blue.bg, borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {isVi ? "Từ đơn buyer" : "From buyer's order"}
                  </span>
                </div>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
                  {[
                    { icon: <User size={12} color={T.inkMuted} />, label: isVi ? "Tên" : "Name", value: order.buyerName || (isVi ? "(chưa có)" : "(none)") },
                    { icon: <Phone size={12} color={T.inkMuted} />, label: isVi ? "SĐT" : "Phone", value: order.buyerPhone || (isVi ? "(chưa có)" : "(none)") },
                    { icon: <MapPin size={12} color={T.inkMuted} />, label: isVi ? "Địa chỉ" : "Address", value: order.buyerAddress || (isVi ? "(chưa có)" : "(none)") },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", backgroundColor: T.surfaceAlt, borderBottom: i < 2 ? `1px solid ${T.border}` : undefined }}>
                      <div style={{ marginTop: 1, flexShrink: 0 }}>{row.icon}</div>
                      <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, minWidth: 44, flexShrink: 0 }}>{row.label}</span>
                      <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.ink, fontWeight: 500 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Package dimensions — seller fills */}
              <p style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 12 }}>
                {isVi ? "Thông tin kiện hàng" : "Package details"}
              </p>

              {/* Weight */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelBase}>{isVi ? "Cân nặng (gram) *" : "Weight (grams) *"}</label>
                <input
                  type="number" min="1" value={weight}
                  onChange={e => { setWeight(e.target.value); setErrors(p => ({ ...p, weight: "" })); }}
                  placeholder={isVi ? "500" : "500"}
                  style={{ ...inputBase, borderColor: errors.weight ? T.red.text : T.border }}
                />
                {errors.weight && <p style={errBase}>{errors.weight}</p>}
              </div>

              {/* Dimensions */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelBase}>{isVi ? "Kích thước (cm): Dài × Rộng × Cao *" : "Dimensions (cm): L × W × H *"}</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <input
                    type="number" min="1" value={length}
                    onChange={e => { setLength(e.target.value); setErrors(p => ({ ...p, dims: "" })); }}
                    placeholder={isVi ? "Dài" : "Length"}
                    style={{ ...inputBase, borderColor: errors.dims ? T.red.text : T.border }}
                  />
                  <input
                    type="number" min="1" value={width}
                    onChange={e => { setWidth(e.target.value); setErrors(p => ({ ...p, dims: "" })); }}
                    placeholder={isVi ? "Rộng" : "Width"}
                    style={{ ...inputBase, borderColor: errors.dims ? T.red.text : T.border }}
                  />
                  <input
                    type="number" min="1" value={height}
                    onChange={e => { setHeight(e.target.value); setErrors(p => ({ ...p, dims: "" })); }}
                    placeholder={isVi ? "Cao" : "Height"}
                    style={{ ...inputBase, borderColor: errors.dims ? T.red.text : T.border }}
                  />
                </div>
                {errors.dims && <p style={errBase}>{errors.dims}</p>}
              </div>

              {errors.api && (
                <p style={{ ...errBase, textAlign: "center", marginBottom: 10 }}>{errors.api}</p>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: "11px 0", fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.inkMuted, backgroundColor: T.canvas, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer" }}
                >
                  {isVi ? "Huỷ" : "Cancel"}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ flex: 2, padding: "11px 0", fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.canvas, backgroundColor: submitting ? "#888" : T.ink, border: "none", borderRadius: 8, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background-color 150ms" }}
                >
                  {submitting
                    ? <CircleNotch size={14} style={{ animation: "ssm-spin 700ms linear infinite" }} />
                    : <Truck size={14} weight="fill" />
                  }
                  {isVi ? "Tạo đơn giao hàng" : "Create shipment"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: T.green.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle size={26} color={T.green.text} weight="fill" />
              </div>
              <h3 style={{ fontFamily: T.fontSans, fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
                {isVi ? "Đơn giao hàng đã tạo!" : "Shipment created!"}
              </h3>
              <p style={{ fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, lineHeight: 1.65, marginBottom: 16 }}>
                {isVi
                  ? "Mã vận đơn GHN đã được tạo. Dán lên kiện hàng và giao cho tài xế."
                  : "GHN tracking code has been generated. Attach it to the package and hand to the courier."}
              </p>
              <div style={{ fontFamily: T.fontMono, fontSize: 16, fontWeight: 700, color: T.ink, backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 16px", display: "inline-block", marginBottom: 20, letterSpacing: "0.08em" }}>
                {trackingCode}
              </div>
              <button
                onClick={onClose}
                style={{ display: "block", width: "100%", padding: "11px 0", fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.canvas, backgroundColor: T.ink, border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                {isVi ? "Đóng" : "Close"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default SellerShipModal;
