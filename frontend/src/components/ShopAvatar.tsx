/**
 * ShopAvatar — ảnh đại diện shop dùng chung cho cả trang công khai (buyer) lẫn Dashboard (seller).
 * - Có ảnh (logo_cid / doc_cid): hiện ảnh vuông bo góc, BẤM VÀO để mở ảnh full (lightbox), Esc/bấm nền để đóng.
 * - Không có ảnh: hiện ô chữ cái đầu, không bấm được (không có gì để phóng to).
 *
 * Lightbox render qua createPortal thẳng vào document.body — bắt buộc, vì component này được
 * dùng ở ShopHeader (ShopPublicPage.tsx) bên trong 1 div có CSS `transform` (hiệu ứng "hiện dần
 * khi cuộn tới" — revealStyle()). CSS transform trên phần tử cha (dù chỉ translateY(0)) biến nó
 * thành containing block cho mọi `position:fixed` bên trong — khiến lightbox (vốn phải phủ toàn
 * màn hình) bị "nhốt" trong khung ShopHeader thay vì phủ hết trang, không có nền đen. Trước đây
 * lightbox render trực tiếp trong cây component nên dính lỗi này ở trang buyer, còn ở Dashboard
 * (seller) thì không có ancestor nào transform nên trông vẫn đúng — dùng portal để tránh phụ
 * thuộc vào việc component cha có transform hay không, sửa tận gốc cho MỌI chỗ dùng sau này.
 */
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

const ipfs = (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`;

function initials(name: string) {
  return (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export function ShopAvatar({
  cid, name, size = 56, radius = 12, title,
}: { cid?: string | null; name: string; size?: number; radius?: number; title?: string }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const box: React.CSSProperties = {
    width: size, height: size, borderRadius: radius, flexShrink: 0,
    border: "1px solid #EAEAEA", backgroundColor: "#F7F6F3", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
  };

  // Không có ảnh (hoặc ảnh lỗi/PDF không render được) → ô chữ cái đầu, không bấm.
  if (!cid || broken) {
    return (
      <div style={{ ...box, fontFamily: "'Geist Sans', sans-serif", fontWeight: 700, fontSize: Math.round(size * 0.32), color: "#111" }}>
        {initials(name)}
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={title ?? "Xem ảnh đầy đủ"}
        style={{ ...box, cursor: "zoom-in", background: "#F7F6F3", border: "1px solid #EAEAEA" }}>
        <img src={ipfs(cid)} alt={name} onError={() => setBroken(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(0,0,0,0.82)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}>
          <button onClick={() => setOpen(false)}
            style={{ position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: 8, padding: 8, cursor: "pointer", color: "#fff", display: "flex" }}>
            <X size={20} />
          </button>
          <img src={ipfs(cid)} alt={name} onClick={e => e.stopPropagation()}
            style={{ maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.45)", cursor: "default" }} />
        </div>,
        document.body
      )}
    </>
  );
}
