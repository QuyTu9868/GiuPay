/**
 * AdminDashboardPage.tsx — Bước 24
 * Auth: Auth0 + TOTP 2FA
 * API: /api/admin/* với Authorization: Bearer {Auth0 access token}
 */

import { useState, useEffect, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Design tokens (consistent với bước 17–23) ────────────────────────────

const T = {
  bg: "bg-gray-950",
  surface: "bg-gray-900",
  surfaceHover: "hover:bg-gray-800",
  border: "border border-gray-800",
  borderHover: "hover:border-indigo-500/40",
  accent: "bg-indigo-600 hover:bg-indigo-500",
  accentText: "text-indigo-400",
  textPrimary: "text-white",
  textSecondary: "text-gray-400",
  textMuted: "text-gray-500",
  radius: "rounded-2xl",
  radiusBtn: "rounded-xl",
  radiusFull: "rounded-full",
  input: "bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-full",
  btn: "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer",
};

// ─── Types ─────────────────────────────────────────────────────────────────

type ShopStatus = "pending" | "verified" | "rejected";

interface Shop {
  id: string;
  wallet_address: string;
  name: string;
  description?: string;
  logo_cid?: string;
  category?: string;
  gmail: string;
  facebook_url?: string;
  return_policy?: string;
  status: ShopStatus;
  reject_reason?: string;
  doc_cid?: string;
  doc_hash?: string;
  created_at: string;
  avg_rating?: number;
  total_orders?: number;
}

interface Dispute {
  id: string;
  order_id: string;
  order_code: string;
  shop_name: string;
  shop_gmail: string;
  opened_by: string;
  reason: string;
  status: "open" | "resolved" | "closed";
  resolution?: "refunded" | "released";
  attempt_number: number;
  shop_response?: string;
  admin_note?: string;
  opened_at: string;
  deadline_at?: string;
  price_usdc: string;
}

interface FeeWalletSetting {
  current: string;
  pending?: string;
  pending_effect_at?: string;
}

type Tab = "pending" | "verified" | "disputes" | "settings";

// ─── Mock data ─────────────────────────────────────────────────────────────


// ─── Helpers ───────────────────────────────────────────────────────────────

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  const d = Math.floor(diff / 86_400_000);
  if (d >= 1) return `${d} ngày trước`;
  if (h >= 1) return `${h} giờ trước`;
  return "Vừa xong";
}

function countdown(iso?: string) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Đã hết hạn";
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  return `${h}h ${m}m`;
}

function genInitials(name: string) {
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
}

const CATEGORY_COLORS: Record<string, string> = {
  "Thời trang": "bg-pink-500/10 text-pink-400",
  "Điện tử": "bg-blue-500/10 text-blue-400",
  "Làm đẹp": "bg-purple-500/10 text-purple-400",
  "Sách": "bg-yellow-500/10 text-yellow-400",
};

function catColor(cat?: string) {
  return cat ? (CATEGORY_COLORS[cat] ?? "bg-gray-700 text-gray-400") : "bg-gray-700 text-gray-400";
}

// ─── Sub-components ────────────────────────────────────────────────────────

// 2FA Verify screen (post Auth0 login)
function TwoFAScreen({ onVerified }: { onVerified: (sessionToken: string) => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  async function handleVerify() {
    if (!email.trim()) { setError("Nhập email admin"); return; }
    if (code.length !== 6) { setError("Mã phải đúng 6 chữ số"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/admin/verify-totp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totp_code: code, email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Xác thực thất bại" }));
        throw new Error(error ?? "Mã không đúng hoặc đã hết hạn");
      }
      const { data } = await res.json();
      onVerified(data?.session_token ?? "");
    } catch (e: any) {
      setError(e.message ?? "Xác thực thất bại");
      setCode("");
      codeRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  const S = {
    page:  { minHeight:"100vh", background:"#030712", display:"flex", alignItems:"center", justifyContent:"center", padding:16 } as React.CSSProperties,
    card:  { background:"#111827", border:"1px solid #1f2937", borderRadius:16, padding:32, width:"100%", maxWidth:380 } as React.CSSProperties,
    icon:  { width:48, height:48, background:"rgba(99,102,241,0.1)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24 } as React.CSSProperties,
    h1:    { fontSize:20, fontWeight:700, color:"#fff", marginBottom:4 } as React.CSSProperties,
    sub:   { fontSize:14, color:"#9ca3af", marginBottom:24 } as React.CSSProperties,
    emailInput: { width:"100%", background:"#1f2937", border:"1px solid #374151", borderRadius:12, padding:"12px 16px", fontSize:14, color:"#fff", outline:"none", boxSizing:"border-box" as const, marginBottom:12 } as React.CSSProperties,
    codeInput: { width:"100%", background:"#1f2937", border:"1px solid #374151", borderRadius:12, padding:"12px 16px", fontSize:24, textAlign:"center" as const, letterSpacing:8, fontFamily:"monospace", color:"#fff", outline:"none", boxSizing:"border-box" as const, marginBottom:16 } as React.CSSProperties,
    label: { fontSize:12, color:"#6b7280", marginBottom:6, display:"block" } as React.CSSProperties,
    err:   { color:"#f87171", fontSize:12, textAlign:"center" as const, marginBottom:16 } as React.CSSProperties,
    btn:   { width:"100%", padding:"10px 16px", borderRadius:12, fontSize:14, fontWeight:500, cursor:"pointer", border:"none", background:"#4f46e5", color:"#fff", marginBottom:12 } as React.CSSProperties,
    hint:  { fontSize:12, color:"#4b5563", textAlign:"center" as const, marginTop:16 } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.icon}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#818cf8" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-3 3h3" />
          </svg>
        </div>
        <h1 style={S.h1}>GiuPay Admin</h1>
        <p style={S.sub}>Đăng nhập với email admin + mã 2FA.</p>
        <label style={S.label}>Email admin</label>
        <input
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && codeRef.current?.focus()}
          style={S.emailInput}
          autoFocus
        />
        <label style={S.label}>Mã 2FA (Google Authenticator)</label>
        <input
          ref={codeRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          style={S.codeInput}
        />
        {error && <p style={S.err}>{error}</p>}
        <button
          onClick={handleVerify}
          disabled={loading || !email.trim() || code.length < 6}
          style={{ ...S.btn, opacity: (loading || !email.trim() || code.length < 6) ? 0.4 : 1 }}
        >
          {loading ? "Đang xác thực..." : "Đăng nhập"}
        </button>
      </div>
    </div>
  );
}

// Shop detail panel (drawer-style)
function ShopDetailPanel({
  shop,
  onClose,
  onApprove,
  onReject,
}: {
  shop: Shop;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handleApprove() {
    setLoading("approve");
    await new Promise((r) => setTimeout(r, 800));
    onApprove(shop.id);
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setLoading("reject");
    await new Promise((r) => setTimeout(r, 800));
    onReject(shop.id, rejectReason.trim());
  }

  const P = {
    overlay:  { position:"fixed" as const, inset:0, zIndex:50, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" },
    backdrop: { position:"absolute" as const, inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" },
    panel:    { position:"relative" as const, zIndex:10, background:"#111827", borderLeft:"1px solid #1f2937", height:"100vh", width:"100%", maxWidth:480, overflowY:"scroll" as const, animation:"slideInRight 200ms cubic-bezier(0.16,1,0.3,1)" },
    header:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"1px solid #1f2937", position:"sticky" as const, top:0, background:"#0f172a", zIndex:10 },
    h2:       { fontSize:15, fontWeight:600, color:"#f1f5f9", margin:0 },
    closeBtn: { background:"none", border:"none", color:"#6b7280", cursor:"pointer", padding:4, borderRadius:6, display:"flex" },
    body:     { padding:20, display:"flex", flexDirection:"column" as const, gap:16 },
    row:      { display:"flex", alignItems:"center", gap:12 },
    avatar:   { width:44, height:44, borderRadius:10, background:"linear-gradient(135deg,rgba(99,102,241,0.3),rgba(168,85,247,0.3))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 },
    name:     { fontSize:15, fontWeight:600, color:"#f1f5f9", marginBottom:2 },
    sub:      { fontSize:12, color:"#9ca3af" },
    grid2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
    box:      { background:"#1e293b", borderRadius:8, padding:12 },
    label:    { fontSize:11, color:"#6b7280", marginBottom:4 },
    value:    { fontSize:12, color:"#cbd5e1" },
    mono:     { fontFamily:"monospace", fontSize:11, color:"#94a3b8", wordBreak:"break-all" as const },
    docBox:   { background:"#1e293b", borderRadius:8, padding:12 },
    docLink:  { display:"inline-flex", alignItems:"center", gap:6, fontSize:12, color:"#818cf8", textDecoration:"none" },
    actions:  { paddingTop:8, display:"flex", flexDirection:"column" as const, gap:10 },
    btnRow:   { display:"flex", gap:10 },
    btnGreen: { flex:1, padding:"10px 16px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", background:"#16a34a", color:"#fff" } as React.CSSProperties,
    btnRed:   { flex:1, padding:"10px 16px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", background:"rgba(239,68,68,0.15)", color:"#f87171" } as React.CSSProperties,
    btnRedSolid: { flex:1, padding:"10px 16px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", background:"#dc2626", color:"#fff" } as React.CSSProperties,
    btnGray:  { padding:"10px 16px", borderRadius:10, fontSize:13, cursor:"pointer", border:"none", background:"#1e293b", color:"#94a3b8" } as React.CSSProperties,
    textarea: { width:"100%", background:"#1e293b", border:"1px solid #374151", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#f1f5f9", resize:"vertical" as const, outline:"none", boxSizing:"border-box" as const },
    hint:     { fontSize:11, color:"#6b7280", marginTop:4 },
    disabled: { opacity:0.5, cursor:"not-allowed" },
  };

  return (
    <div style={P.overlay}>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(32px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .admin-panel::-webkit-scrollbar { width: 6px; }
        .admin-panel::-webkit-scrollbar-track { background: #1e293b; }
        .admin-panel::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
        .admin-panel::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
      {/* Backdrop */}
      <div style={P.backdrop} onClick={onClose} />

      {/* Panel */}
      <div style={P.panel} className="admin-panel">
        {/* Header */}
        <div style={P.header}>
          <h2 style={P.h2}>Chi tiết shop</h2>
          <button style={P.closeBtn} onClick={onClose}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={P.body}>
          {/* Identity */}
          <div style={P.row}>
            <div style={P.avatar}>{genInitials(shop.name)}</div>
            <div>
              <p style={P.name}>{shop.name}</p>
              <p style={P.sub}>{shop.gmail}</p>
            </div>
          </div>

          {/* Category & date */}
          <div style={P.grid2}>
            <div style={P.box}>
              <p style={P.label}>Ngành hàng</p>
              <p style={P.value}>{shop.category ?? "—"}</p>
            </div>
            <div style={P.box}>
              <p style={P.label}>Nộp hồ sơ</p>
              <p style={P.value}>{timeAgo(shop.created_at)}</p>
            </div>
          </div>

          {/* Wallet */}
          <div style={P.box}>
            <p style={P.label}>Địa chỉ ví nhận tiền</p>
            <p style={P.mono}>{shop.wallet_address}</p>
          </div>

          {/* Description */}
          {shop.description && (
            <div>
              <p style={P.label}>Mô tả shop</p>
              <p style={P.value}>{shop.description}</p>
            </div>
          )}

          {/* Return policy */}
          {shop.return_policy && (
            <div>
              <p style={P.label}>Chính sách đổi trả</p>
              <p style={P.value}>{shop.return_policy}</p>
            </div>
          )}

          {/* Facebook */}
          {shop.facebook_url && (
            <div>
              <p style={P.label}>Facebook</p>
              <a href={shop.facebook_url} target="_blank" rel="noreferrer" style={P.docLink}>
                {shop.facebook_url}
              </a>
            </div>
          )}

          {/* Verification doc */}
          <div style={P.docBox}>
            <p style={{ ...P.label, marginBottom:8 }}>Giấy tờ xác minh</p>
            {shop.doc_cid ? (
              <a
                href={`https://gateway.pinata.cloud/ipfs/${shop.doc_cid}`}
                target="_blank"
                rel="noreferrer"
                style={P.docLink}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Xem file (IPFS)
              </a>
            ) : (
              <p style={P.hint}>Chưa có file</p>
            )}
            {shop.doc_hash && (
              <p style={{ ...P.mono, marginTop:6 }}>Hash: {shop.doc_hash}</p>
            )}
          </div>

          {/* Actions — inline với content */}
          {shop.status === "pending" && (
            <div style={{ ...P.actions, paddingBottom:24 }}>
              {!showRejectForm ? (
                <div style={P.btnRow}>
                  <button
                    onClick={handleApprove}
                    disabled={loading !== null}
                    style={{ ...P.btnGreen, ...(loading !== null ? P.disabled : {}) }}
                  >
                    {loading === "approve" ? "Đang duyệt..." : "✓ Duyệt shop"}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={loading !== null}
                    style={{ ...P.btnRed, ...(loading !== null ? P.disabled : {}) }}
                  >
                    Từ chối
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div>
                    <p style={{ ...P.label, marginBottom:6 }}>Lý do từ chối <span style={{ color:"#f87171" }}>*</span></p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Giấy tờ không hợp lệ, thông tin không khớp..."
                      rows={3}
                      style={P.textarea}
                    />
                    <p style={P.hint}>Lý do này sẽ được gửi qua Gmail đến shop.</p>
                  </div>
                  <div style={P.btnRow}>
                    <button
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || loading !== null}
                      style={{ ...P.btnRedSolid, ...(!rejectReason.trim() || loading !== null ? P.disabled : {}) }}
                    >
                      {loading === "reject" ? "Đang gửi..." : "Gửi từ chối"}
                    </button>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                      style={P.btnGray}
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dispute resolve modal
function DisputeModal({
  dispute,
  onClose,
  onResolve,
}: {
  dispute: Dispute;
  onClose: () => void;
  onResolve: (id: string, orderCode: string, resolution: "refunded" | "released", note: string) => Promise<boolean>;
}) {
  const [resolution, setResolution] = useState<"refunded" | "released" | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!resolution) return;
    setLoading(true);
    // Giờ đây gọi smart contract thật (openDispute hộ nếu cần + adminResolve) nên có thể
    // mất vài giây chờ xác nhận on-chain — không còn fake delay 800ms như trước.
    const ok = await onResolve(dispute.id, dispute.order_code, resolution, note.trim());
    if (!ok) setLoading(false); // thất bại: giữ modal mở để admin đọc lỗi thật + thử lại
  }

  const isOverdue = dispute.deadline_at ? new Date(dispute.deadline_at) < new Date() : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className={`relative z-10 ${T.surface} ${T.border} ${T.radius} w-full max-w-lg`}
        style={{ animation: "fadeInUp 200ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <style>{`@keyframes fadeInUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className={`text-base font-semibold ${T.textPrimary}`}>Xử lý tranh chấp</h2>
            <p className={`text-xs ${T.textMuted} mt-0.5`}>{dispute.order_code} · Lần {dispute.attempt_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className={`${T.bg} ${T.radius} p-4 space-y-2`}>
            <div className="flex justify-between text-sm">
              <span className={T.textMuted}>Giá trị đơn</span>
              <span className={`font-semibold ${T.textPrimary}`}>{dispute.price_usdc} USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={T.textMuted}>Shop</span>
              <span className={T.textSecondary}>{dispute.shop_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={T.textMuted}>Người mua</span>
              <span className={`font-mono text-xs ${T.textSecondary}`}>{shortenAddr(dispute.opened_by)}</span>
            </div>
            {isOverdue && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-800">
                <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-xs text-red-400 font-medium">Shop chưa phản hồi — đã quá deadline</span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <p className={`text-xs ${T.textMuted} mb-1.5`}>Lý do tranh chấp</p>
            <p className={`text-sm ${T.textSecondary} leading-relaxed`}>{dispute.reason}</p>
          </div>

          {/* Shop response */}
          {dispute.shop_response && (
            <div>
              <p className={`text-xs ${T.textMuted} mb-1.5`}>Phản hồi của shop</p>
              <div className={`${T.bg} ${T.radius} p-3`}>
                <p className={`text-sm ${T.textSecondary} leading-relaxed`}>{dispute.shop_response}</p>
              </div>
            </div>
          )}

          {/* Resolution choice */}
          <div>
            <p className={`text-xs ${T.textMuted} mb-2`}>Quyết định <span className="text-red-400">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setResolution("refunded")}
                className={`${T.btn} border text-sm transition-all ${
                  resolution === "refunded"
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <svg className="w-4 h-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
                Hoàn tiền người mua
              </button>
              <button
                onClick={() => setResolution("released")}
                className={`${T.btn} border text-sm transition-all ${
                  resolution === "released"
                    ? "border-green-500 bg-green-500/10 text-green-400"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <svg className="w-4 h-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                Giải phóng cho shop
              </button>
            </div>
          </div>

          {/* Admin note */}
          <div>
            <label className={`text-xs ${T.textMuted} block mb-1.5`}>
              Ghi chú admin (tuỳ chọn)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lý do quyết định, bằng chứng đã xem xét..."
              rows={2}
              className={`${T.input} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!resolution || loading}
              className={`${T.btn} ${T.accent} text-white flex-1 disabled:opacity-40`}
            >
              {loading ? "Đang xử lý..." : "Xác nhận quyết định"}
            </button>
            <button
              onClick={onClose}
              className={`${T.btn} ${T.surface} border border-gray-700 ${T.textSecondary} hover:text-white`}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  // Auth state
  const [totpVerified, setTotpVerified] = useState(false);
  const [adminSessionToken, setAdminSessionToken] = useState<string>(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem("admin_session") ?? "" : ""
  );

  // Dashboard state
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [pendingShops, setPendingShops] = useState<Shop[]>([]);
  const [verifiedShops, setVerifiedShops] = useState<Shop[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [feeWallet, setFeeWallet] = useState<FeeWalletSetting>({
    current: "—",
    pending: undefined,
    pending_effect_at: undefined,
  });
  const [dataLoading, setDataLoading] = useState(false);

  // Load admin data after 2FA verified
  useEffect(() => {
    if (!totpVerified) return;
    loadAdminData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totpVerified]);

  function getAuthHeader(): Record<string, string> {
    return adminSessionToken ? { "X-Admin-Session": adminSessionToken } : {};
  }

  async function loadAdminData() {
    setDataLoading(true);
    try {
      const authHeader = getAuthHeader();
      const [pendRes, verRes, dispRes, feeRes] = await Promise.all([
        fetch(`${API}/api/admin/shops/pending`,  { headers: authHeader }),
        fetch(`${API}/api/admin/shops/verified`, { headers: authHeader }),
        fetch(`${API}/api/admin/disputes`,       { headers: authHeader }),
        fetch(`${API}/api/admin/settings/fee-wallet`, { headers: authHeader }),
      ]);
      if (pendRes.ok) { const { data } = await pendRes.json(); setPendingShops(data ?? []); }
      if (verRes.ok)  { const { data } = await verRes.json(); setVerifiedShops(data ?? []); }
      if (dispRes.ok) { const { data } = await dispRes.json(); setDisputes(data ?? []); }
      if (feeRes.ok)  {
        const { data } = await feeRes.json();
        setFeeWallet({
          current:           data.current   ?? "—",
          pending:           data.pending,
          pending_effect_at: data.pending_effect_at,
        });
      }
    } finally {
      setDataLoading(false);
    }
  }

  // Panel / modal state
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  // Settings state
  const [newFeeWallet, setNewFeeWallet] = useState("");
  const [walletChanging, setWalletChanging] = useState(false);
  const [walletMsg, setWalletMsg] = useState("");
  const [walletCountdown, setWalletCountdown] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Update fee wallet countdown every minute
  useEffect(() => {
    if (!feeWallet.pending_effect_at) return;
    const tick = () => setWalletCountdown(countdown(feeWallet.pending_effect_at));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [feeWallet.pending_effect_at]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Shop actions ─────────────────────────────────────────

  async function handleApproveShop(id: string) {
    const shop = pendingShops.find((s) => s.id === id);
    if (!shop) return;

    // Optimistic UI
    setPendingShops((prev) => prev.filter((s) => s.id !== id));
    setVerifiedShops((prev) => [{ ...shop, status: "verified" }, ...prev]);
    setSelectedShop(null);

    try {
      const authHeader = getAuthHeader();
      const res = await fetch(`${API}/api/admin/shops/${id}/approve`, {
        method: "POST",
        headers: authHeader,
      });
      if (!res.ok) throw new Error();
      showToast(`Shop "${shop.name}" đã được duyệt. Gmail thông báo đã gửi.`);
    } catch {
      // Rollback
      setVerifiedShops((prev) => prev.filter((s) => s.id !== id));
      setPendingShops((prev) => [shop, ...prev]);
      showToast(`Lỗi duyệt shop "${shop.name}". Vui lòng thử lại.`, "error");
    }
  }

  async function handleRejectShop(id: string, reason: string) {
    const shop = pendingShops.find((s) => s.id === id);
    if (!shop) return;

    setPendingShops((prev) => prev.filter((s) => s.id !== id));
    setSelectedShop(null);

    try {
      const authHeader = getAuthHeader();
      const res = await fetch(`${API}/api/admin/shops/${id}/reject`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      showToast(`Đã từ chối shop "${shop.name}". Gmail đã gửi với lý do.`);
    } catch {
      setPendingShops((prev) => [shop, ...prev]);
      showToast(`Lỗi từ chối shop "${shop.name}". Vui lòng thử lại.`, "error");
    }
  }

  // Xoá tuyệt đối — dùng để dọn shop test cho nhanh, không có bước xác nhận nào cả.
  async function handleDeleteShop(id: string) {
    const shop = pendingShops.find((s) => s.id === id) ?? verifiedShops.find((s) => s.id === id);

    setPendingShops((prev) => prev.filter((s) => s.id !== id));
    setVerifiedShops((prev) => prev.filter((s) => s.id !== id));
    if (selectedShop?.id === id) setSelectedShop(null);

    try {
      const authHeader = getAuthHeader();
      const res = await fetch(`${API}/api/admin/shops/${id}`, { method: "DELETE", headers: authHeader });
      if (!res.ok) throw new Error();
      showToast(`Đã xoá shop "${shop?.name ?? id}".`);
    } catch {
      showToast(`Lỗi xoá shop "${shop?.name ?? id}". Vui lòng thử lại.`, "error");
      if (shop) {
        if (shop.status === "verified") setVerifiedShops((prev) => [shop, ...prev]);
        else setPendingShops((prev) => [shop, ...prev]);
      }
    }
  }

  // ── Dispute actions ──────────────────────────────────────

  // QUAN TRỌNG: trước đây gọi nhầm `${id}` (dispute id, dạng UUID) vào chỗ :code (phải là
  // order_code, dạng "ORD-XXXXX") của URL — backend không bao giờ khớp được nên luôn 404,
  // nhưng lỗi đó bị nuốt im lặng (không check res.ok) nên admin luôn thấy toast "đã xử lý"
  // dù thực chất chưa có gì xảy ra. Đã sửa: dùng đúng order_code, kiểm tra kết quả thật,
  // chỉ đóng modal + cập nhật UI khi backend xác nhận đã gọi contract thành công.
  async function handleResolveDispute(
    id: string, orderCode: string, resolution: "refunded" | "released", note: string
  ): Promise<boolean> {
    try {
      const authHeader = getAuthHeader();
      const res = await fetch(`${API}/api/orders/${orderCode}/dispute/${id}/resolve`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, admin_note: note }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || !json.success) {
        showToast(json.error || "Lỗi xử lý tranh chấp trên smart contract.", "error");
        return false;
      }
      setDisputes((prev) => prev.map((d) =>
        d.id === id ? { ...d, status: "resolved", resolution, admin_note: note } : d
      ));
      setSelectedDispute(null);
      showToast(json.message || (resolution === "refunded" ? "Hoàn tiền người mua" : "Giải phóng escrow cho shop"));
      return true;
    } catch {
      showToast("Lỗi kết nối máy chủ. Chưa xử lý được tranh chấp.", "error");
      return false;
    }
  }

  // ── Fee wallet change (Security: delay 24h) ───────────────

  async function handleFeeWalletChange() {
    if (!/^0x[a-fA-F0-9]{40}$/.test(newFeeWallet.trim())) {
      setWalletMsg("Địa chỉ ví không hợp lệ. Phải là địa chỉ Ethereum 0x...");
      return;
    }
    setWalletChanging(true);
    setWalletMsg("");

    try {
      const authHeader = getAuthHeader();
      const res = await fetch(`${API}/api/admin/settings/fee-wallet`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ new_address: newFeeWallet.trim() }),
      });
      const { data, error } = await res.json();
      if (!res.ok) throw new Error(error ?? "Lỗi cập nhật ví");
      setFeeWallet({
        current:           data.current           ?? feeWallet.current,
        pending:           data.pending           ?? newFeeWallet.trim(),
        pending_effect_at: data.pending_effect_at ?? new Date(Date.now() + 24 * 3600_000).toISOString(),
      });
      setNewFeeWallet("");
      showToast("Đã gửi yêu cầu đổi ví. Sẽ có hiệu lực sau 24 giờ. Gmail xác nhận đã gửi.");
    } catch (e: any) {
      setWalletMsg(e.message ?? "Lỗi gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setWalletChanging(false);
    }
  }

  // ─── Auth flow ──────────────────────────────────────────────────────────

  if (!totpVerified) {
    return (
      <TwoFAScreen
        onVerified={(token) => {
          sessionStorage.setItem("admin_session", token);
          setAdminSessionToken(token);
          setTotpVerified(true);
        }}
      />
    );
  }

  // ─── Main dashboard ─────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "pending", label: "Chờ duyệt", count: pendingShops.length },
    { key: "verified", label: "Đã duyệt", count: verifiedShops.length },
    { key: "disputes", label: "Tranh chấp", count: disputes.filter((d) => d.status === "open").length },
    { key: "settings", label: "Cài đặt" },
  ];

  return (
    <div className={`min-h-screen ${T.bg}`}>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${
            toast.type === "success"
              ? "bg-emerald-900/90 text-emerald-200 border border-emerald-700"
              : "bg-red-900/90 text-red-200 border border-red-700"
          }`}
          style={{ animation: "fadeInUp 200ms cubic-bezier(0.16,1,0.3,1)" }}
        >
          {toast.msg}
        </div>
      )}

      {/* Shop panel */}
      {selectedShop && (
        <ShopDetailPanel
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
          onApprove={handleApproveShop}
          onReject={handleRejectShop}
        />
      )}

      {/* Dispute modal */}
      {selectedDispute && (
        <DisputeModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onResolve={handleResolveDispute}
        />
      )}

      {/* Header */}
      <header className={`border-b border-gray-800 px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <img src="/brand/giupay-icon-square.svg" alt="GiuPay" className="w-8 h-8 rounded-lg" />
          <div>
            <span className={`text-sm font-semibold ${T.textPrimary}`}>GiuPay</span>
            <span className={`text-xs ${T.textMuted} ml-2`}>Bảng quản trị</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin identity */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 font-medium">
              A
            </div>
            <span className={`text-xs ${T.textMuted}`}>admin@giupay.io</span>
          </div>

          {/* 2FA badge */}
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            2FA ✓
          </span>

          <button
            onClick={() => {
              sessionStorage.removeItem("admin_session");
              window.location.reload();
            }}
            className={`${T.btn} text-gray-400 hover:text-white text-xs`}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className={`text-2xl font-bold ${T.textPrimary}`}>Bảng điều khiển</h1>
          <p className={`text-sm ${T.textSecondary} mt-1`}>
            Quản lý shop, tranh chấp và cài đặt hệ thống GiuPay
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Shop chờ duyệt", value: pendingShops.length, color: "text-yellow-400" },
            { label: "Shop đã duyệt", value: verifiedShops.length, color: "text-emerald-400" },
            { label: "Tranh chấp mở", value: disputes.filter(d => d.status === "open").length, color: "text-red-400" },
            { label: "Tổng giao dịch", value: "1,247", color: "text-indigo-400" },
          ].map((stat) => (
            <div key={stat.label} className={`${T.surface} ${T.border} ${T.radius} p-4`}>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className={`text-xs ${T.textMuted} mt-0.5`}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-white"
                  : `${T.textMuted} hover:text-gray-300`
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-400"
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Pending shops ─────────────────────────────────────────── */}
        {activeTab === "pending" && (
          <div>
            {pendingShops.length === 0 ? (
              <div className={`${T.surface} ${T.border} ${T.radius} p-12 text-center`}>
                <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className={`text-sm ${T.textMuted}`}>Không có shop nào đang chờ duyệt</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingShops.map((shop) => (
                  <div
                    key={shop.id}
                    className={`${T.surface} ${T.border} ${T.radius} p-4 flex items-center gap-4 cursor-pointer ${T.surfaceHover} transition-colors`}
                    onClick={() => setSelectedShop(shop)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {genInitials(shop.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${T.textPrimary}`}>{shop.name}</p>
                        <span className={`text-xs px-2 py-0.5 ${T.radiusFull} ${catColor(shop.category)}`}>
                          {shop.category ?? "Khác"}
                        </span>
                      </div>
                      <p className={`text-xs ${T.textMuted} mt-0.5`}>{shop.gmail} · {timeAgo(shop.created_at)}</p>
                    </div>

                    {/* Doc indicator */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Có giấy tờ
                    </div>

                    {/* Xoá tuyệt đối — test cleanup, không hỏi lại */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteShop(shop.id); }}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                      title="Xoá shop"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>

                    {/* Arrow */}
                    <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Verified shops ────────────────────────────────────────── */}
        {activeTab === "verified" && (
          <div className="space-y-3">
            {verifiedShops.map((shop) => (
              <div key={shop.id} className={`${T.surface} ${T.border} ${T.radius} p-4 flex items-center gap-4`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {genInitials(shop.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${T.textPrimary}`}>{shop.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      Đã duyệt
                    </span>
                    <span className={`text-xs px-2 py-0.5 ${T.radiusFull} ${catColor(shop.category)}`}>
                      {shop.category ?? "Khác"}
                    </span>
                  </div>
                  <p className={`text-xs ${T.textMuted} mt-0.5`}>
                    {shop.gmail} · {shop.total_orders ?? 0} đơn · ⭐ {shop.avg_rating?.toFixed(1) ?? "—"}
                  </p>
                </div>

                <div className={`hidden sm:block text-xs font-mono ${T.textMuted}`}>
                  {shortenAddr(shop.wallet_address)}
                </div>

                {/* Xoá tuyệt đối — test cleanup, không hỏi lại */}
                <button
                  onClick={() => handleDeleteShop(shop.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                  title="Xoá shop"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Disputes ──────────────────────────────────────────────── */}
        {activeTab === "disputes" && (
          <div className="space-y-3">
            {disputes.length === 0 && (
              <div className={`${T.surface} ${T.border} ${T.radius} p-12 text-center`}>
                <p className={`text-sm ${T.textMuted}`}>Không có tranh chấp nào</p>
              </div>
            )}
            {disputes.map((dispute) => {
              const overdue = dispute.deadline_at ? new Date(dispute.deadline_at) < new Date() : false;
              return (
                <div
                  key={dispute.id}
                  className={`${T.surface} ${T.border} ${T.radius} p-4 cursor-pointer ${T.surfaceHover} transition-colors`}
                  onClick={() => dispute.status === "open" && setSelectedDispute(dispute)}
                >
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                      dispute.status === "open"
                        ? overdue ? "bg-red-500 animate-pulse" : "bg-yellow-500"
                        : "bg-gray-600"
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-sm font-semibold ${T.textPrimary}`}>{dispute.order_code}</span>
                        <span className={`text-xs px-2 py-0.5 ${T.radiusFull} ${
                          dispute.status === "open"
                            ? overdue ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"
                            : "bg-gray-700 text-gray-400"
                        }`}>
                          {dispute.status === "open"
                            ? overdue ? "Quá hạn" : "Đang mở"
                            : dispute.resolution === "refunded" ? "Hoàn tiền" : "Giải phóng"
                          }
                        </span>
                        <span className={`text-xs ${T.textMuted}`}>Lần {dispute.attempt_number}</span>
                      </div>

                      <p className={`text-xs ${T.textSecondary} mb-1`}>{dispute.shop_name} · {dispute.price_usdc} USDC</p>
                      <p className={`text-xs ${T.textMuted} line-clamp-2`}>{dispute.reason}</p>

                      {dispute.shop_response && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                          </svg>
                          <span className="text-xs text-emerald-400">Shop đã phản hồi</span>
                        </div>
                      )}

                      {dispute.status === "open" && dispute.deadline_at && (
                        <p className={`text-xs mt-1 ${overdue ? "text-red-400" : T.textMuted}`}>
                          Deadline shop phản hồi: {overdue
                            ? "Đã quá hạn " + timeAgo(dispute.deadline_at)
                            : countdown(dispute.deadline_at) + " còn lại"
                          }
                        </p>
                      )}
                    </div>

                    {dispute.status === "open" && (
                      <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tab: Settings ──────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="space-y-4 max-w-xl">
            {/* Fee wallet */}
            <div className={`${T.surface} ${T.border} ${T.radius} p-5`}>
              <h2 className={`text-sm font-semibold ${T.textPrimary} mb-1`}>Ví nhận phí 0.1%</h2>
              <p className={`text-xs ${T.textMuted} mb-4`}>
                Thay đổi sẽ có hiệu lực sau 24 giờ (Security: delay 24h theo checklist #10).
                Gmail xác nhận sẽ được gửi đến cả 2 tài khoản admin.
              </p>

              {/* Current wallet */}
              <div className={`${T.bg} ${T.radius} p-3 mb-4`}>
                <p className={`text-xs ${T.textMuted} mb-1`}>Ví hiện tại</p>
                <p className={`text-xs font-mono ${T.textSecondary} break-all`}>{feeWallet.current}</p>
              </div>

              {/* Pending change */}
              {feeWallet.pending && feeWallet.pending_effect_at && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-yellow-400 font-medium mb-1">Đang chờ áp dụng</p>
                      <p className={`text-xs font-mono ${T.textMuted} break-all mb-1`}>{feeWallet.pending}</p>
                      <p className="text-xs text-yellow-400/70">
                        Còn {walletCountdown ?? "đang tính..."} · {new Date(feeWallet.pending_effect_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* New wallet input */}
              <div className="space-y-3">
                <div>
                  <label className={`text-xs ${T.textMuted} block mb-1.5`}>Địa chỉ ví mới</label>
                  <input
                    type="text"
                    value={newFeeWallet}
                    onChange={(e) => { setNewFeeWallet(e.target.value); setWalletMsg(""); }}
                    placeholder="0x..."
                    className={`${T.input} font-mono`}
                  />
                  {walletMsg && <p className="text-xs text-red-400 mt-1">{walletMsg}</p>}
                </div>
                <button
                  onClick={handleFeeWalletChange}
                  disabled={walletChanging || !newFeeWallet.trim()}
                  className={`${T.btn} ${T.accent} text-white disabled:opacity-40`}
                >
                  {walletChanging ? "Đang gửi yêu cầu..." : "Gửi yêu cầu đổi ví"}
                </button>
              </div>
            </div>

            {/* Admin accounts info */}
            <div className={`${T.surface} ${T.border} ${T.radius} p-5`}>
              <h2 className={`text-sm font-semibold ${T.textPrimary} mb-1`}>Tài khoản Admin</h2>
              <p className={`text-xs ${T.textMuted} mb-4`}>
                GiuPay có 2 tài khoản admin. Nếu một bị chiếm, tài khoản còn lại có thể can thiệp.
              </p>

              <div className="space-y-2">
                {[
                  { email: "admin@giupay.io", label: "Admin chính", you: true },
                  { email: "admin2@giupay.io", label: "Admin dự phòng", you: false },
                ].map((admin) => (
                  <div key={admin.email} className={`${T.bg} ${T.radius} p-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400">
                        {admin.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${T.textPrimary}`}>{admin.label}</p>
                        <p className={`text-xs ${T.textMuted}`}>{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {admin.you && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">Bạn</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">2FA bật</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security info */}
            <div className={`${T.surface} ${T.border} ${T.radius} p-5`}>
              <h2 className={`text-sm font-semibold ${T.textPrimary} mb-3`}>Cài đặt bảo mật</h2>
              <div className="space-y-2">
                {[
                  { label: "2FA (Google Authenticator)", status: "Bật", ok: true },
                  { label: "Delay 24h khi đổi ví nhận phí", status: "Bật", ok: true },
                  { label: "Log hành động admin", status: "Bật", ok: true },
                  { label: "Cảnh báo IP lạ qua Gmail", status: "Bật", ok: true },
                  { label: "Rate limit API: 10 req/phút", status: "Bật", ok: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <span className={`text-sm ${T.textSecondary}`}>{item.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
