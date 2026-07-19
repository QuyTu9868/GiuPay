/**
 * GiuPay — ReviewPage (Step 28)
 * ✅ i18n: tất cả text dùng t.xxx từ useTheme()
 * ✅ NavBar: dùng NavBarMinimal
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/lib/theme";
import { NavBarMinimal } from "@/components/NavBarMinimal";
import { Star, CheckCircle, Warning, ShieldCheck, SealCheck, LockSimple, ArrowSquareOut, ClockCountdown } from "@phosphor-icons/react";

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

type ReviewStep = "loading"|"ineligible"|"form"|"confirm"|"submitting"|"done"|"error";

interface OrderForReview {
  orderCode:string; productName:string; productImageCid?:string;
  description?:string; priceUsdc:string; warrantyDays:number;
  status:string; buyerWallet:string; escrowReleasedAt:string;
  shopId:string; shopName:string; shopVerified:boolean; hasReview:boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Callback ref: gắn observer ngay khi node xuất hiện (kể cả mount trễ sau fetch)
// → tránh trang trắng khi content bị gate bởi trạng thái loading.
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
  return { opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)", transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms` };
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.canvas}; font-family: ${T.fontSans}; color: ${T.ink}; -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }
  button { font-family: inherit; cursor: pointer; border: none; background: none; }
  textarea { font-family: inherit; }
  @keyframes ap-spin { to { transform: rotate(360deg); } }
`;

function StarPicker({ value, onChange }: { value:number; onChange:(v:number)=>void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:"flex", gap:6 }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} style={{ padding:4, transition:"transform 100ms" }}
          onMouseDown={e => (e.currentTarget.style.transform = "scale(0.9)")}
          onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Star size={28} weight={i <= (hover || value) ? "fill" : "regular"} color={i <= (hover || value) ? T.yellow.text : T.border} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const { walletAddress, isConnected } = useWallet();
  const { t, lang } = useTheme();
  const { ref, visible } = useReveal(0.05);
  const [step, setStep]       = useState<ReviewStep>("loading");
  const [order, setOrder]     = useState<OrderForReview | null>(null);
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const isVi = lang === "vi";

  const orderCode = typeof window !== "undefined" ? window.location.pathname.split("/").pop() : "";

  useEffect(() => {
    if (!orderCode) return;
    fetch(`${API}/api/orders/${orderCode}`)
      .then(r => r.json())
      .then(({ success, data }) => {
        if (!success || !data) { setStep("ineligible"); return; }
        const o: OrderForReview = {
          orderCode: data.order_code, productName: data.product_name,
          productImageCid: data.product_image_cid, description: data.description,
          priceUsdc: data.price_usdc, warrantyDays: data.warranty_days,
          status: data.status, buyerWallet: data.buyer_wallet,
          escrowReleasedAt: data.escrow_released_at, shopId: data.shop_id,
          shopName: data.shop_name, shopVerified: data.shop_verified, hasReview: data.has_review,
        };
        if (!["paid","in_escrow","released"].includes(o.status) || o.hasReview) { setStep("ineligible"); return; }
        setOrder(o); setStep("form");
      })
      .catch(() => setStep("ineligible"));
  }, [orderCode]);

  async function handleSubmit() {
    if (rating === 0) { setError(t.selectStars); return; }
    setStep("confirm");
  }

  async function handleConfirm() {
    setStep("submitting");
    try {
      const res = await fetch(`${API}/api/orders/${orderCode}/review`, {
        method:"POST",
        headers: { "Content-Type":"application/json", ...(walletAddress ? { "X-Wallet-Address": walletAddress } : {}) },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      const { success, error: err } = await res.json();
      if (!success) throw new Error(err);
      setStep("done");
    } catch (e: any) {
      setError(e.message ?? (isVi ? "Có lỗi xảy ra" : "Something went wrong"));
      setStep("error");
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back="/" />
      <main style={{ minHeight:"100dvh", backgroundColor:T.canvas, paddingTop:80, paddingBottom:60 }}>
        <div ref={ref} style={{ maxWidth:520, margin:"0 auto", padding:"0 24px", ...revealStyle(visible) }}>

          {/* Loading */}
          {step === "loading" && (
            <div style={{ textAlign:"center", paddingTop:80 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto" }} />
            </div>
          )}

          {/* Ineligible */}
          {step === "ineligible" && (
            <div style={{ textAlign:"center", paddingTop:60 }}>
              <Warning size={40} color={T.border} style={{ marginBottom:16 }} />
              <h2 style={{ fontFamily:T.fontSans, fontSize:22, fontWeight:700, color:T.ink, marginBottom:8 }}>{t.ineligibleTitle}</h2>
              <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, lineHeight:1.65, marginBottom:24 }}>{t.ineligibleSub}</p>
              <a href="/" style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"12px 24px" }}>{t.backToHome}</a>
            </div>
          )}

          {/* Form */}
          {step === "form" && order && (
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <div>
                <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:10 }}>{t.reviewTitle}</span>
                <h1 style={{ fontFamily:T.fontSans, fontSize:"clamp(20px,3vw,28px)", fontWeight:700, letterSpacing:"-0.03em", color:T.ink }}>{order.productName}</h1>
                <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, marginTop:6 }}>{order.shopName} {order.shopVerified && <SealCheck size={13} color={T.green.text} weight="fill" style={{ verticalAlign:"middle" }} />}</p>
              </div>

              <div style={{ padding:"24px", border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface }}>
                <div style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink, marginBottom:16 }}>
                  {t.ratingLabel} <span style={{ color:T.red.text }}>*</span>
                </div>
                <StarPicker value={rating} onChange={v => { setRating(v); setError(null); }} />
                {error && <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:10 }}><Warning size={11} color={T.red.text} /><span style={{ fontFamily:T.fontSans, fontSize:11, color:T.red.text }}>{error}</span></div>}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
                  <label style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink }}>{t.commentLabel}</label>
                  <span style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted }}>{t.commentHint} · {comment.length}/1000</span>
                </div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t.commentPlaceholder} maxLength={1000} rows={5}
                  style={{ width:"100%", fontFamily:T.fontSans, fontSize:14, color:T.ink, backgroundColor:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", outline:"none", resize:"vertical", lineHeight:1.65, transition:"border-color 150ms" }}
                  onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = T.border)} />
              </div>

              <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"14px 16px", borderRadius:8, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt }}>
                <LockSimple size={13} color={T.inkMuted} weight="fill" style={{ flexShrink:0, marginTop:1 }} />
                <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, lineHeight:1.65 }}>{t.onchainWarning}</p>
              </div>

              <button onClick={handleSubmit} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor: rating > 0 ? T.ink : T.border, borderRadius:6, padding:"13px 0", cursor: rating > 0 ? "pointer" : "not-allowed", transition:"background-color 150ms", border:"none" }}
                onMouseEnter={e => { if (rating > 0) e.currentTarget.style.backgroundColor = "#333"; }}
                onMouseLeave={e => { if (rating > 0) e.currentTarget.style.backgroundColor = rating > 0 ? T.ink : T.border; }}
              >
                {rating > 0 ? `${t.submitReview} ${rating} ★` : t.selectStars}
              </button>
            </div>
          )}

          {/* Confirm */}
          {step === "confirm" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div>
                <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:10 }}>{t.reviewPreview}</span>
                <h2 style={{ fontFamily:T.fontSans, fontSize:"clamp(18px,3vw,26px)", fontWeight:700, letterSpacing:"-0.03em", color:T.ink }}>{t.confirmReviewTitle}</h2>
                <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, marginTop:8, lineHeight:1.65 }}>{t.confirmReviewSub}</p>
              </div>
              <div style={{ border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, overflow:"hidden" }}>
                <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt }}>
                  <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.inkMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{t.reviewPreview}</span>
                </div>
                <div style={{ padding:"20px" }}>
                  <div style={{ display:"flex", gap:3, marginBottom:12 }}>
                    {[1,2,3,4,5].map(i => <Star key={i} size={18} weight={i <= rating ? "fill" : "regular"} color={i <= rating ? T.yellow.text : T.border} />)}
                    <span style={{ fontFamily:T.fontMono, fontSize:13, fontWeight:700, color:T.ink, marginLeft:6 }}>{rating}.0</span>
                  </div>
                  {comment
                    ? <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMid, lineHeight:1.65 }}>{comment}</p>
                    : <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, fontStyle:"italic" }}>{t.noComment}</p>
                  }
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"14px 16px", borderRadius:8, border:`1px solid ${T.yellow.bg}`, backgroundColor:T.yellow.bg }}>
                <Warning size={13} color={T.yellow.text} weight="fill" style={{ flexShrink:0, marginTop:1 }} />
                <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.yellow.text, lineHeight:1.65 }}>{t.onchainWarning}</p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setStep("form")} style={{ flex:"0 0 auto", fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.inkMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:"12px 20px", backgroundColor:T.surface, cursor:"pointer", transition:"border-color 150ms, color 150ms" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.ink; e.currentTarget.style.color = T.ink; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.inkMuted; }}
                >{t.editReview}</button>
                <button onClick={handleConfirm} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"12px 0", cursor:"pointer", transition:"background-color 150ms", border:"none" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#333")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = T.ink)}
                >{t.confirmAndPost}</button>
              </div>
            </div>
          )}

          {/* Submitting */}
          {step === "submitting" && (
            <div style={{ textAlign:"center", paddingTop:80 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto 16px" }} />
              <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted }}>{t.submittingReview}</p>
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div style={{ textAlign:"center", paddingTop:60 }}>
              <div style={{ width:64, height:64, borderRadius:16, backgroundColor:T.green.bg, border:`1px solid ${T.green.text}22`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
                <CheckCircle size={32} color={T.green.text} weight="fill" />
              </div>
              <h2 style={{ fontFamily:T.fontSans, fontSize:"clamp(20px,3vw,28px)", fontWeight:700, letterSpacing:"-0.03em", color:T.ink, marginBottom:10 }}>{t.reviewDone}</h2>
              <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, lineHeight:1.65, marginBottom:28 }}>{t.reviewDoneSub}</p>
              <a href="/" style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"12px 24px" }}>{t.backToHome}</a>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div style={{ textAlign:"center", paddingTop:60 }}>
              <Warning size={40} color={T.red.text} style={{ marginBottom:16 }} />
              <h2 style={{ fontFamily:T.fontSans, fontSize:22, fontWeight:700, color:T.ink, marginBottom:8 }}>{isVi ? "Có lỗi xảy ra" : "Something went wrong"}</h2>
              <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, marginBottom:24 }}>{error}</p>
              <button onClick={() => setStep("form")} style={{ fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"12px 24px", border:"none", cursor:"pointer" }}>{isVi ? "Thử lại" : "Try again"}</button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
