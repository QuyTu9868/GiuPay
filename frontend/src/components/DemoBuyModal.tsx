"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Sparkle, X, MapPin, CircleNotch } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";

export interface DemoBuyItem {
  name: string;
  priceUsdc: string;
  shopName?: string;
}

interface Props {
  item: DemoBuyItem;
  isVi: boolean;
  onClose: () => void;
}

interface GHNProvince { ProvinceID: number; ProvinceName: string; }
interface GHNDistrict { DistrictID: number; DistrictName: string; }
interface GHNWard { WardCode: string; WardName: string; }

const SPIN_CSS = `@keyframes dbm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

export function DemoBuyModal({ item, isVi, onClose }: Props) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [orderCode, setOrderCode] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [wardCode, setWardCode] = useState("");

  const [provinces, setProvinces] = useState<GHNProvince[]>([]);
  const [districts, setDistricts] = useState<GHNDistrict[]>([]);
  const [wards, setWards] = useState<GHNWard[]>([]);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingD, setLoadingD] = useState(false);
  const [loadingW, setLoadingW] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoadingP(true);
    fetch("/api/ghn-master?type=province")
      .then(r => r.json())
      .then(j => setProvinces(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingP(false));
  }, []);

  useEffect(() => {
    if (!provinceId) { setDistricts([]); setDistrictId(""); setWards([]); setWardCode(""); return; }
    setLoadingD(true);
    setDistricts([]); setDistrictId(""); setWards([]); setWardCode("");
    fetch(`/api/ghn-master?type=district&province_id=${provinceId}`)
      .then(r => r.json())
      .then(j => setDistricts(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingD(false));
  }, [provinceId]);

  useEffect(() => {
    if (!districtId) { setWards([]); setWardCode(""); return; }
    setLoadingW(true);
    setWards([]); setWardCode("");
    fetch(`/api/ghn-master?type=ward&district_id=${districtId}`)
      .then(r => r.json())
      .then(j => setWards(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingW(false));
  }, [districtId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // useGHN = true khi API trả về data (GHN_TOKEN đã cấu hình)
  const useGHN = !loadingP && provinces.length > 0;

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = isVi ? "Vui lòng nhập họ tên" : "Name is required";
    if (!/^\d{9,11}$/.test(phone.replace(/[\s-]/g, "")))
      errs.phone = isVi ? "Số điện thoại không hợp lệ" : "Invalid phone number";
    if (useGHN) {
      if (!provinceId) errs.province = isVi ? "Vui lòng chọn tỉnh/thành" : "Province is required";
      if (!districtId) errs.district = isVi ? "Vui lòng chọn quận/huyện" : "District is required";
      if (!wardCode) errs.ward = isVi ? "Vui lòng chọn phường/xã" : "Ward is required";
    }
    if (!street.trim()) errs.street = isVi ? "Vui lòng nhập địa chỉ đầy đủ" : "Full address is required";
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    setTimeout(() => {
      setOrderCode("DEMO-" + Math.random().toString(36).substring(2, 7).toUpperCase());
      setStep("success");
      setSubmitting(false);
    }, 800);
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
          style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "22px 22px 24px", maxWidth: 440, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.18)", maxHeight: "90dvh", overflowY: "auto" }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: T.blue.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkle size={14} color={T.blue.text} weight="fill" />
              </div>
              <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.blue.text, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Demo Mode</span>
            </div>
            <button onClick={onClose} style={{ color: T.inkMuted, padding: 2 }}><X size={16} /></button>
          </div>

          {step === "form" ? (
            <>
              {/* Product summary */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 16, backgroundColor: T.canvas }}>
                <p style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink }}>{item.name}</p>
                {item.shopName && <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{item.shopName}</p>}
                <p style={{ fontFamily: T.fontMono, fontSize: 14, fontWeight: 700, color: T.ink, marginTop: 6 }}>${parseFloat(item.priceUsdc).toFixed(2)} USDC</p>
              </div>

              <p style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14 }}>
                {isVi ? "Địa chỉ giao hàng" : "Delivery address"}
              </p>

              {/* Full name */}
              <div style={{ marginBottom: 11 }}>
                <label style={labelBase}>{isVi ? "Họ và tên *" : "Full name *"}</label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
                  placeholder={isVi ? "Nguyễn Văn A" : "John Doe"}
                  style={{ ...inputBase, borderColor: errors.name ? T.red.text : T.border }}
                />
                {errors.name && <p style={errBase}>{errors.name}</p>}
              </div>

              {/* Phone */}
              <div style={{ marginBottom: 11 }}>
                <label style={labelBase}>{isVi ? "Số điện thoại *" : "Phone number *"}</label>
                <input
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: "" })); }}
                  placeholder="0912 345 678"
                  type="tel"
                  style={{ ...inputBase, borderColor: errors.phone ? T.red.text : T.border }}
                />
                {errors.phone && <p style={errBase}>{errors.phone}</p>}
              </div>

              {useGHN ? (
                <>
                  {/* Province */}
                  <div style={{ marginBottom: 11 }}>
                    <label style={labelBase}>{isVi ? "Tỉnh / Thành phố *" : "Province / City *"}</label>
                    <select
                      value={provinceId}
                      onChange={e => { setProvinceId(e.target.value); setErrors(p => ({ ...p, province: "" })); }}
                      style={{ ...inputBase, cursor: "pointer", appearance: "none" as React.CSSProperties["appearance"], borderColor: errors.province ? T.red.text : T.border }}
                    >
                      <option value="">{isVi ? "Chọn tỉnh/thành..." : "Select province..."}</option>
                      {provinces.map(p => <option key={p.ProvinceID} value={String(p.ProvinceID)}>{p.ProvinceName}</option>)}
                    </select>
                    {errors.province && <p style={errBase}>{errors.province}</p>}
                  </div>

                  {/* District */}
                  <div style={{ marginBottom: 11 }}>
                    <label style={labelBase}>{isVi ? "Quận / Huyện *" : "District *"}</label>
                    <select
                      value={districtId}
                      onChange={e => { setDistrictId(e.target.value); setErrors(p => ({ ...p, district: "" })); }}
                      disabled={!provinceId || loadingD}
                      style={{ ...inputBase, cursor: (!provinceId || loadingD) ? "not-allowed" : "pointer", opacity: (!provinceId || loadingD) ? 0.6 : 1, appearance: "none" as React.CSSProperties["appearance"], borderColor: errors.district ? T.red.text : T.border }}
                    >
                      <option value="">{!provinceId ? (isVi ? "Chọn tỉnh trước" : "Select province first") : loadingD ? (isVi ? "Đang tải..." : "Loading...") : (isVi ? "Chọn quận/huyện..." : "Select district...")}</option>
                      {districts.map(d => <option key={d.DistrictID} value={String(d.DistrictID)}>{d.DistrictName}</option>)}
                    </select>
                    {errors.district && <p style={errBase}>{errors.district}</p>}
                  </div>

                  {/* Ward */}
                  <div style={{ marginBottom: 11 }}>
                    <label style={labelBase}>{isVi ? "Phường / Xã *" : "Ward *"}</label>
                    <select
                      value={wardCode}
                      onChange={e => { setWardCode(e.target.value); setErrors(p => ({ ...p, ward: "" })); }}
                      disabled={!districtId || loadingW}
                      style={{ ...inputBase, cursor: (!districtId || loadingW) ? "not-allowed" : "pointer", opacity: (!districtId || loadingW) ? 0.6 : 1, appearance: "none" as React.CSSProperties["appearance"], borderColor: errors.ward ? T.red.text : T.border }}
                    >
                      <option value="">{!districtId ? (isVi ? "Chọn quận trước" : "Select district first") : loadingW ? (isVi ? "Đang tải..." : "Loading...") : (isVi ? "Chọn phường/xã..." : "Select ward...")}</option>
                      {wards.map(w => <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>)}
                    </select>
                    {errors.ward && <p style={errBase}>{errors.ward}</p>}
                  </div>

                  {/* Street */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelBase}>{isVi ? "Số nhà, tên đường *" : "Street address *"}</label>
                    <input
                      value={street}
                      onChange={e => { setStreet(e.target.value); setErrors(p => ({ ...p, street: "" })); }}
                      placeholder={isVi ? "123 Nguyễn Du, P. Bến Nghé" : "123 Main St, Apt 4B"}
                      style={{ ...inputBase, borderColor: errors.street ? T.red.text : T.border }}
                    />
                    {errors.street && <p style={errBase}>{errors.street}</p>}
                  </div>
                </>
              ) : (
                /* Fallback: GHN_TOKEN chưa cấu hình — dùng text input thay cascade */
                <div style={{ marginBottom: 20 }}>
                  <label style={labelBase}>{isVi ? "Địa chỉ đầy đủ *" : "Full address *"}</label>
                  <input
                    value={street}
                    onChange={e => { setStreet(e.target.value); setErrors(p => ({ ...p, street: "" })); }}
                    placeholder={isVi ? "123 Nguyễn Du, P. Bến Nghé, Q.1, TP.HCM" : "123 Main St, District 1, Ho Chi Minh City"}
                    style={{ ...inputBase, borderColor: errors.street ? T.red.text : T.border }}
                  />
                  {errors.street && <p style={errBase}>{errors.street}</p>}
                </div>
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
                    ? <CircleNotch size={14} style={{ animation: "dbm-spin 700ms linear infinite" }} />
                    : <MapPin size={14} weight="fill" />
                  }
                  {isVi ? "Đặt hàng (Demo)" : "Place order (Demo)"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: T.green.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle size={26} color={T.green.text} weight="fill" />
              </div>
              <h3 style={{ fontFamily: T.fontSans, fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                {isVi ? "Đặt hàng demo thành công!" : "Demo order placed!"}
              </h3>
              <p style={{ fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, lineHeight: 1.65, marginBottom: 16 }}>
                {isVi
                  ? "Trong môi trường thật, USDC của bạn sẽ được giữ trong escrow smart contract 14 ngày và tự động giải phóng sau khi bạn xác nhận nhận hàng."
                  : "In production, your USDC would be held in an escrow smart contract for 14 days and auto-released after you confirm delivery."}
              </p>
              <div style={{ fontFamily: T.fontMono, fontSize: 14, fontWeight: 700, color: T.ink, backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 16px", display: "inline-block", marginBottom: 20, letterSpacing: "0.06em" }}>
                {orderCode}
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

export default DemoBuyModal;
