"use client";

import { useEffect, useState } from "react";
import { T } from "@/lib/tokens";

// Thông tin giao hàng buyer nhập ở trang thanh toán.
export interface ShippingInfo {
  name: string;
  phone: string;
  provinceId: string; provinceName: string;
  districtId: string; districtName: string;
  wardCode: string;   wardName: string;
  street: string;
}

export const EMPTY_SHIPPING: ShippingInfo = {
  name: "", phone: "", provinceId: "", provinceName: "",
  districtId: "", districtName: "", wardCode: "", wardName: "", street: "",
};

// Ghép địa chỉ đầy đủ để lưu (street + xã + huyện + tỉnh)
export function fullAddress(s: ShippingInfo): string {
  return [s.street, s.wardName, s.districtName, s.provinceName].filter(Boolean).join(", ");
}

// Kiểm hợp lệ. useGHN=true (API GHN có data) thì bắt buộc chọn tỉnh/huyện/xã.
export function isShippingValid(s: ShippingInfo, useGHN: boolean): boolean {
  if (!s.name.trim()) return false;
  if (!/^[\d\s-]{9,15}$/.test(s.phone) || s.phone.replace(/[\s-]/g, "").length < 9) return false;
  if (!s.street.trim()) return false;
  if (useGHN && (!s.provinceId || !s.districtId || !s.wardCode)) return false;
  return true;
}

interface GHNProvince { ProvinceID: number; ProvinceName: string; }
interface GHNDistrict { DistrictID: number; DistrictName: string; }
interface GHNWard     { WardCode: string;   WardName: string; }

interface Props {
  isVi: boolean;
  value: ShippingInfo;
  onChange: (v: ShippingInfo, valid: boolean) => void;
}

export function BuyerShippingForm({ isVi, value, onChange }: Props) {
  const [provinces, setProvinces] = useState<GHNProvince[]>([]);
  const [districts, setDistricts] = useState<GHNDistrict[]>([]);
  const [wards, setWards]         = useState<GHNWard[]>([]);
  const [loadingP, setLoadingP]   = useState(true);

  // useGHN = API trả về data (GHN_TOKEN đã cấu hình). Nếu không, dùng ô địa chỉ tự do.
  const useGHN = !loadingP && provinces.length > 0;

  const emit = (v: ShippingInfo) => onChange(v, isShippingValid(v, useGHN));

  useEffect(() => {
    fetch("/api/ghn-master?type=province")
      .then(r => r.json())
      .then(({ data }) => setProvinces(data ?? []))
      .catch(() => setProvinces([]))
      .finally(() => setLoadingP(false));
  }, []);

  useEffect(() => {
    if (!value.provinceId) { setDistricts([]); setWards([]); return; }
    fetch(`/api/ghn-master?type=district&province_id=${value.provinceId}`)
      .then(r => r.json())
      .then(({ data }) => setDistricts(data ?? []))
      .catch(() => setDistricts([]));
  }, [value.provinceId]);

  useEffect(() => {
    if (!value.districtId) { setWards([]); return; }
    fetch(`/api/ghn-master?type=ward&district_id=${value.districtId}`)
      .then(r => r.json())
      .then(({ data }) => setWards(data ?? []))
      .catch(() => setWards([]));
  }, [value.districtId]);

  const inputBase: React.CSSProperties = {
    width: "100%", padding: "9px 11px", fontFamily: T.fontSans, fontSize: 13,
    color: T.ink, backgroundColor: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 7, outline: "none", boxSizing: "border-box",
  };
  const labelBase: React.CSSProperties = {
    display: "block", fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
    color: T.inkMid, marginBottom: 5,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={labelBase}>{isVi ? "Họ tên người nhận" : "Recipient name"}</label>
        <input value={value.name} placeholder={isVi ? "Nguyễn Văn A" : "John Doe"}
          onChange={e => emit({ ...value, name: e.target.value })} style={inputBase} />
      </div>

      <div>
        <label style={labelBase}>{isVi ? "Số điện thoại" : "Phone number"}</label>
        <input value={value.phone} placeholder="0912 345 678" inputMode="tel"
          onChange={e => emit({ ...value, phone: e.target.value })} style={inputBase} />
      </div>

      {useGHN && (
        <>
          <div>
            <label style={labelBase}>{isVi ? "Tỉnh / Thành phố" : "Province / City"}</label>
            <select value={value.provinceId} style={{ ...inputBase, appearance: "none" }}
              onChange={e => {
                const p = provinces.find(x => String(x.ProvinceID) === e.target.value);
                emit({ ...value, provinceId: e.target.value, provinceName: p?.ProvinceName ?? "",
                  districtId: "", districtName: "", wardCode: "", wardName: "" });
              }}>
              <option value="">{isVi ? "Chọn tỉnh/thành..." : "Select province..."}</option>
              {provinces.map(p => <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>)}
            </select>
          </div>

          <div>
            <label style={labelBase}>{isVi ? "Quận / Huyện" : "District"}</label>
            <select value={value.districtId} disabled={!value.provinceId} style={{ ...inputBase, appearance: "none" }}
              onChange={e => {
                const d = districts.find(x => String(x.DistrictID) === e.target.value);
                emit({ ...value, districtId: e.target.value, districtName: d?.DistrictName ?? "",
                  wardCode: "", wardName: "" });
              }}>
              <option value="">{isVi ? "Chọn quận/huyện..." : "Select district..."}</option>
              {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
            </select>
          </div>

          <div>
            <label style={labelBase}>{isVi ? "Phường / Xã" : "Ward"}</label>
            <select value={value.wardCode} disabled={!value.districtId} style={{ ...inputBase, appearance: "none" }}
              onChange={e => {
                const w = wards.find(x => x.WardCode === e.target.value);
                emit({ ...value, wardCode: e.target.value, wardName: w?.WardName ?? "" });
              }}>
              <option value="">{isVi ? "Chọn phường/xã..." : "Select ward..."}</option>
              {wards.map(w => <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>)}
            </select>
          </div>
        </>
      )}

      <div>
        <label style={labelBase}>
          {useGHN ? (isVi ? "Địa chỉ cụ thể (số nhà, đường)" : "Street address") : (isVi ? "Địa chỉ giao hàng đầy đủ" : "Full delivery address")}
        </label>
        <input value={value.street} placeholder={isVi ? "Số nhà, tên đường..." : "House number, street..."}
          onChange={e => emit({ ...value, street: e.target.value })} style={inputBase} />
      </div>
    </div>
  );
}
