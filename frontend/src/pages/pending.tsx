/**
 * GiuPay — PendingPage
 * ✅ i18n: dùng t.xxx từ useTheme() — đã có sẵn phần lớn, chỉ chuẩn hóa lại
 */
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/lib/theme";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ClockCountdown, CheckCircle, Envelope, CaretLeft, Wallet } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function NavBar() {
  const { t } = useTheme();
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, height:58, borderBottom:`1px solid ${T.border}`, backgroundColor:"rgba(251,251,250,0.92)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 28px", height:"100%", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <a href="/" style={{ display:"flex", alignItems:"center", gap:6, fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, transition:"color 150ms" }}
          onMouseEnter={e => (e.currentTarget.style.color = T.ink)}
          onMouseLeave={e => (e.currentTarget.style.color = T.inkMuted)}
        >
          <CaretLeft size={14} weight="bold" /> {t.back}
        </a>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <img src="/brand/giupay-logo-horizontal.svg" alt="GiuPay" height={24} className="brand-mark" style={{ height:24, width:"auto", display:"block" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", minWidth:60 }}>
          <ConnectButton.Custom>
            {({ account, openConnectModal, openAccountModal, mounted }) => {
              if (!mounted) return null;
              return account ? (
                <button onClick={openAccountModal}
                  style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:T.fontMono, fontSize:12, fontWeight:500, color:T.ink, backgroundColor:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 10px", cursor:"pointer" }}
                >
                  <div style={{ width:6, height:6, borderRadius:"50%", backgroundColor:T.green.text }} />
                  {account.displayName}
                </button>
              ) : (
                <button onClick={openConnectModal}
                  style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"7px 13px", border:"none", cursor:"pointer" }}
                >
                  <Wallet size={13} weight="fill" /> {t.connectWallet}
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </nav>
  );
}

function StepDot({ done, active, label }: { done:boolean; active:boolean; label:string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:done ? T.green.bg : active ? T.ink : T.border, color:done ? T.green.text : active ? T.canvas : T.inkMuted, fontSize:11, fontWeight:600, fontFamily:T.fontSans, transition:"all 250ms" }}>
        {done ? <CheckCircle size={14} weight="fill" /> : active ? "●" : "○"}
      </div>
      <span style={{ fontFamily:T.fontSans, fontSize:11, color:active ? T.ink : T.inkMuted }}>{label}</span>
    </div>
  );
}

export default function PendingPage() {
  const { walletAddress } = useWallet();
  const { t } = useTheme();
  const [shop, setShop]       = useState<{ name:string; email:string; createdAt:string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;
    fetch(`${API}/api/shops/me`, { headers: { "X-Wallet-Address": walletAddress } })
      .then(r => r.json())
      .then(({ success, data }) => {
        if (!success || !data) { window.location.href = "/register"; return; }
        if (data.status === "verified") { window.location.href = `/shop/${data.id}`; return; }
        if (data.status === "rejected") { window.location.href = "/register"; return; }
        setShop({ name: data.name, email: data.gmail ?? data.email ?? "", createdAt: data.created_at ?? data.createdAt ?? "" });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [walletAddress]);

  const isVi = t.back === "Quay lại";

  function fmtDate(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(isVi ? "vi-VN" : "en-US", { year:"numeric", month:"long", day:"numeric" });
  }

  const stepLabels = isVi
    ? ["Đăng ký", "Xét duyệt", "Hoạt động"]
    : ["Register", "Review", "Active"];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.canvas}; font-family: ${T.fontSans}; color: ${T.ink}; -webkit-font-smoothing: antialiased; }
        a { color: inherit; text-decoration: none; }
        button { font-family: inherit; cursor: pointer; border: none; background: none; }
        @keyframes ap-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes ap-spin  { to { transform: rotate(360deg); } }
      ` }} />
      <NavBar />
      <main style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"90px 24px 60px", backgroundColor:T.canvas }}>
        <div style={{ width:"100%", maxWidth:480 }}>
          {loading ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto" }} />
            </div>
          ) : (
            <>
              <div style={{ textAlign:"center", marginBottom:32 }}>
                <div style={{ width:64, height:64, borderRadius:16, backgroundColor:T.yellow.bg, border:`1px solid ${T.yellow.text}22`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
                  <ClockCountdown size={32} color={T.yellow.text} weight="duotone" />
                </div>
                <h1 style={{ fontFamily:T.fontSans, fontSize:"clamp(22px,4vw,30px)", fontWeight:700, letterSpacing:"-0.03em", color:T.ink, lineHeight:1.15, marginBottom:12 }}>
                  {t.pendingTitle}
                </h1>
                <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, lineHeight:1.7, maxWidth:400, margin:"0 auto" }}>{t.pendingDesc}</p>
              </div>

              {shop && (
                <div style={{ border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, overflow:"hidden", marginBottom:24 }}>
                  <div style={{ padding:"12px 20px", backgroundColor:T.yellow.bg, borderBottom:`1px solid ${T.yellow.text}22`, display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", backgroundColor:T.yellow.text, animation:"ap-pulse 2s ease-in-out infinite" }} />
                    <span style={{ fontFamily:T.fontMono, fontSize:11, color:T.yellow.text, letterSpacing:"0.05em", textTransform:"uppercase", fontWeight:600 }}>
                      {isVi ? "Đang chờ duyệt" : "Pending review"}
                    </span>
                  </div>
                  <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted }}>{t.pendingShop}</span>
                      <span style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:600, color:T.ink }}>{shop.name}</span>
                    </div>
                    {shop.email && (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted }}>Email</span>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <Envelope size={12} color={T.inkMuted} />
                          <span style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink }}>{shop.email}</span>
                        </div>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted }}>{t.pendingDate}</span>
                      <span style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink }}>{fmtDate(shop.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 24px", backgroundColor:T.surface, marginBottom:28 }}>
                <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginBottom:16 }}>
                  {isVi ? "Tiến trình xét duyệt" : "Approval progress"}
                </p>
                <div style={{ display:"flex", alignItems:"flex-start", gap:0 }}>
                  <StepDot done={true}  active={false} label={stepLabels[0]} />
                  <div style={{ flex:1, height:1, backgroundColor:T.yellow.text, opacity:0.4, marginTop:14 }} />
                  <StepDot done={false} active={true}  label={stepLabels[1]} />
                  <div style={{ flex:1, height:1, backgroundColor:T.border, marginTop:14 }} />
                  <StepDot done={false} active={false} label={stepLabels[2]} />
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <a href="/" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"13px 0", transition:"background-color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#333")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = T.ink)}
                >
                  {t.goHome}
                </a>
                <button onClick={() => window.location.reload()} style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, padding:"8px 0", transition:"color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.ink)}
                  onMouseLeave={e => (e.currentTarget.style.color = T.inkMuted)}
                >
                  {isVi ? "Tải lại để kiểm tra trạng thái" : "Reload to check status"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
