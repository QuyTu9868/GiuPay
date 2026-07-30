/**
 * GiuPay — NavBar
 * - Logo: /logo.png (fallback icon nếu chưa có file)
 * - Không có nav links điều hướng (user scroll trên homepage)
 * - "Explore Shops" chỉ hiện khi đã connect ví → /shops
 * - Modal chọn hướng khi ví đã có shop kết nối lần đầu trong session
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Storefront, List, X, Moon, Sun, Globe, Wallet, UserCircle, ArrowRight, ChatCircleDots, ClockCountdown } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";
import { useTheme } from "@/lib/theme";
import { useConnectModal, useAccountModal } from "@rainbow-me/rainbowkit";
import { shortenAddr } from "@/lib/utils";
import { useWallet } from "@/hooks/useWallet";
import { ChatWidget } from "@/components/ChatWidget";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ShopInfo { id: string; name: string; status?: string; }

// ── Logo ───────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center" }}>
      <img
        src="/brand/giupay-logo-horizontal.svg"
        alt="GiuPay"
        height={56}
        className="brand-mark"
        style={{ height: 56, width: "auto", display: "block" }}
      />
    </Link>
  );
}

// ── Popup báo shop đang chờ duyệt (bấm nút "Tạo shop mới" khi ví đã có shop pending) ──────────
function PendingShopModal({ onClose }: { onClose: () => void }) {
  const { lang } = useTheme();
  const isVi = lang === "vi";

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "28px 26px", maxWidth: 380, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", textAlign: "center" }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: T.yellow.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <ClockCountdown size={26} color={T.yellow.text} weight="duotone" />
        </div>
        <h3 style={{ fontFamily: T.fontSans, fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
          {isVi ? "Shop đang chờ duyệt" : "Shop under review"}
        </h3>
        <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted, lineHeight: 1.6, marginBottom: 18 }}>
          {isVi
            ? "Ví này đã đăng ký shop và đang chờ đội ngũ GiuPay duyệt (thường trong 24h). Bạn sẽ nhận email khi có kết quả."
            : "This wallet already registered a shop, now awaiting GiuPay's review (usually within 24h). You'll get an email once it's approved."}
        </p>
        <button onClick={onClose} style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, color: T.canvas, backgroundColor: T.ink, borderRadius: 6, padding: "10px 24px", border: "none", cursor: "pointer" }}>
          {isVi ? "Đã hiểu" : "Got it"}
        </button>
      </div>
    </div>
  );
}

// ── NavBar ─────────────────────────────────────────────────────────────────────
export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [open,     setOpen]     = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false); // chat buyer-seller — placeholder, chưa build backend
  const [pendingPopup, setPendingPopup] = useState(false); // popup "shop đang chờ duyệt"
  const [myShop,    setMyShop]    = useState<ShopInfo | null>(null); // shop mà ví này sở hữu
  const langRef    = useRef<HTMLDivElement>(null);
  const chatRef    = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);
  const prevAddr   = useRef<string | undefined>(undefined);

  const { isDark, lang, toggleDark, setLang, t } = useTheme();
  const { address } = useWallet();
  const router = useRouter();
  // Trước đây dùng <ConnectButton.Custom> để lấy account/openConnectModal/openAccountModal —
  // đổi sang gọi thẳng 2 hook riêng của RainbowKit (không kèm fetch số dư ví) vì navbar mount
  // ở MỌI trang, và ConnectButton.Custom âm thầm gọi useBalance() dù giao diện chưa bao giờ
  // hiển thị số dư — góp phần gây rate-limit 429 RPC Arc testnet. Xem BUGLOG.md.
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Scroll shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close lang/chat dropdown khi click ngoài
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) setChatOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Ví có sở hữu shop không → luôn cập nhật myShop (để đổi nhãn nút navbar).
  // KHI VỪA KẾT NỐI ví (từ trạng thái chưa kết nối → có, không phải đổi qua lại giữa 2 ví):
  //  - ví có shop verified → tự dẫn vào /shop/{id} của ví đó.
  //  - ví chưa có shop → giữ nguyên trang (mua hàng bình thường), KHÔNG văng đi đâu.
  // Đổi ví (switch account) thì prevAddr đã có giá trị → freshConnect=false → không tự nhảy trang.
  useEffect(() => {
    if (!address) { setMyShop(null); prevAddr.current = address; hasMounted.current = true; return; }
    const freshConnect = prevAddr.current === undefined && hasMounted.current;
    fetch(`${API}/api/shops/me`, { headers: { "X-Wallet-Address": address.toLowerCase() } })
      .then(r => (r.ok ? r.json() : null))
      // /api/shops/me trả shop trực tiếp trong data (data.id, data.status) — KHÔNG phải data.shop
      .then((res) => {
        if (res?.success && res.data?.id) {
          const info: ShopInfo = { id: res.data.id, name: res.data.name, status: res.data.status };
          setMyShop(info);
          if (freshConnect && info.status === "verified") router.push(`/shop/${info.id}`);
        } else {
          setMyShop(null);
        }
      })
      .catch(() => {});
    hasMounted.current = true;
    prevAddr.current = address;
  }, [address]);

  const navStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 58,
    borderBottom: `1px solid ${scrolled ? T.border : "transparent"}`,
    backgroundColor: scrolled ? "rgba(251,251,250,0.9)" : "transparent",
    backdropFilter: scrolled ? "blur(14px)" : "none",
    WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
    transition: "background-color 250ms, border-color 250ms",
  };

  const iconBtn: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 6,
    border: `1px solid ${T.border}`, backgroundColor: T.surfaceAlt,
    color: T.inkMuted, transition: "border-color 150ms, color 150ms",
    cursor: "pointer", flexShrink: 0,
  };

  // Style dùng chung cho nút shop động trên desktop (My Shop / Tạo shop mới).
  const shopBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5, fontFamily: T.fontSans, fontSize: 13,
    fontWeight: 600, color: T.ink, backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}`,
    padding: "7px 12px", borderRadius: 6, transition: "border-color 150ms", cursor: "pointer",
  };
  const shopBtnLabel = lang === "vi" ? "Tạo shop mới" : "Create new shop";
  const myShopLabel  = lang === "vi" ? "Shop của tôi" : "My Shop";

  return (
    <>
      {pendingPopup && <PendingShopModal onClose={() => setPendingPopup(false)} />}

      <nav style={navStyle}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          <Logo />

          {/* Desktop right */}
          <div className="ap-hide-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* Dark mode */}
            <button style={iconBtn} onClick={toggleDark} title={isDark ? t.lightMode : t.darkMode}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.inkMid; e.currentTarget.style.color = T.ink; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.inkMuted; }}
            >
              {isDark ? <Sun size={14} weight="bold" /> : <Moon size={14} weight="bold" />}
            </button>

            {/* Language */}
            <div ref={langRef} style={{ position: "relative" }}>
              <button style={{ ...iconBtn, width: "auto", gap: 5, padding: "0 10px" }} onClick={() => setLangOpen(o => !o)} title={t.language}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.inkMid; e.currentTarget.style.color = T.ink; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.inkMuted; }}
              >
                <Globe size={12} weight="bold" />
                <span style={{ fontFamily: T.fontMono, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{lang}</span>
              </button>
              {langOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 130 }}>
                  {(["vi", "en"] as const).map(l => (
                    <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                      style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, padding: "9px 14px", fontFamily: T.fontSans, fontSize: 13, color: lang === l ? T.ink : T.inkMuted, fontWeight: lang === l ? 600 : 400, backgroundColor: lang === l ? T.surfaceAlt : "transparent", transition: "background-color 100ms", cursor: "pointer" }}
                      onMouseEnter={e => { if (lang !== l) e.currentTarget.style.backgroundColor = T.surfaceAlt; }}
                      onMouseLeave={e => { if (lang !== l) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span>{l === "vi" ? "🇻🇳" : "🇺🇸"}</span>
                      <span>{l === "vi" ? "Tiếng Việt" : "English"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wallet */}
            {mounted && (address ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* Explore Shops — chỉ hiện khi đã connect. Có ô riêng + chữ đậm, đồng bộ với các nút khác. */}
                <Link href="/shops" style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}`, padding: "7px 12px", borderRadius: 6, transition: "border-color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = T.inkMid)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                >
                  {t.exploreShops}
                </Link>
                <Link href="/products" style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}`, padding: "7px 12px", borderRadius: 6, transition: "border-color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = T.inkMid)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                >
                  {lang === "vi" ? "Sản phẩm" : "Products"}
                </Link>
                {/* Nút shop động: verified→My Shop (Dashboard), pending→popup chờ duyệt, chưa có→Tạo shop mới */}
                {myShop?.status === "verified" ? (
                  <Link href={`/shop/${myShop.id}`} style={shopBtn}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = T.inkMid)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                  >
                    <Storefront size={13} weight="fill" /> {myShopLabel}
                  </Link>
                ) : myShop?.status === "pending" ? (
                  <button onClick={() => setPendingPopup(true)} style={shopBtn}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = T.inkMid)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                  >
                    <Storefront size={13} weight="fill" /> {shopBtnLabel}
                  </button>
                ) : (
                  <Link href="/register" style={shopBtn}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = T.inkMid)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                  >
                    <Storefront size={13} weight="fill" /> {shopBtnLabel}
                  </Link>
                )}
                <Link href="/docs" style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}`, padding: "7px 12px", borderRadius: 6, transition: "border-color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = T.inkMid)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                >
                  {t.docsNavTitle}
                </Link>
                {/* Chat buyer-seller — mở ChatWidget thật (conversations + thread + gửi ảnh) */}
                <div ref={chatRef} style={{ position: "relative" }}>
                  <button style={iconBtn} onClick={() => setChatOpen(o => !o)} title={lang === "vi" ? "Nhắn tin với người bán" : "Chat with seller"}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.inkMid; e.currentTarget.style.color = T.ink; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.inkMuted; }}
                  >
                    <ChatCircleDots size={15} weight="fill" />
                  </button>
                  {chatOpen && (
                    <ChatWidget variant="popover" onClose={() => setChatOpen(false)} />
                  )}
                </div>

                <button onClick={openAccountModal}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.fontMono, fontSize: 12, fontWeight: 700, color: T.ink, backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 12px", cursor: "pointer", transition: "border-color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = T.inkMid)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                >
                  <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: T.green.text, flexShrink: 0 }} />
                  {shortenAddr(address)}
                </button>
                <Link href="/profile"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.canvas, backgroundColor: T.ink, borderRadius: 6, padding: "7px 12px", transition: "background-color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#333")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = T.ink)}
                >
                  <UserCircle size={13} weight="fill" /> {t.profile}
                </Link>
              </div>
            ) : (
              <button onClick={openConnectModal}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.canvas, backgroundColor: T.ink, borderRadius: 6, padding: "8px 16px", transition: "background-color 150ms", border: "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#333")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = T.ink)}
              >
                <Wallet size={13} weight="fill" /> {t.connectWallet}
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button className="ap-show-sm" onClick={() => setOpen(o => !o)}
            style={{ background: "none", border: "none", padding: 4, color: T.ink, display: "none" }}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <List size={20} />}
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.canvas, padding: "16px 28px 24px", display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button style={iconBtn} onClick={toggleDark}>
                {isDark ? <Sun size={14} weight="bold" /> : <Moon size={14} weight="bold" />}
              </button>
              <button style={{ ...iconBtn, width: "auto", gap: 6, padding: "0 12px" }} onClick={() => setLang(lang === "vi" ? "en" : "vi")}>
                <Globe size={12} weight="bold" />
                <span style={{ fontFamily: T.fontMono, fontSize: 10, textTransform: "uppercase" }}>{lang === "vi" ? "🇻🇳 VI" : "🇺🇸 EN"}</span>
              </button>
            </div>
            {mounted && (address ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link href="/shops" onClick={() => setOpen(false)}
                  style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}
                >
                  {t.exploreShops}
                </Link>
                {myShop?.status === "verified" ? (
                  <Link href={`/shop/${myShop.id}`} onClick={() => setOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}
                  >
                    <Storefront size={14} weight="fill" /> {myShopLabel}
                  </Link>
                ) : myShop?.status === "pending" ? (
                  <button onClick={() => { setOpen(false); setPendingPopup(true); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink, padding: "10px 0", background: "none", border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer", textAlign: "left" }}
                  >
                    <Storefront size={14} weight="fill" /> {shopBtnLabel}
                  </button>
                ) : (
                  <Link href="/register" onClick={() => setOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}
                  >
                    <Storefront size={14} weight="fill" /> {shopBtnLabel}
                  </Link>
                )}
                <Link href="/docs" onClick={() => setOpen(false)}
                  style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}
                >
                  {t.docsNavTitle}
                </Link>
                <button onClick={() => setChatOpen(o => !o)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}
                >
                  <ChatCircleDots size={14} weight="fill" /> {lang === "vi" ? "Nhắn tin với người bán" : "Chat with seller"}
                </button>
                {chatOpen && (
                  <div style={{ padding: "0 0 8px" }}>
                    <ChatWidget variant="panel" />
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button onClick={openAccountModal}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: T.fontMono, fontSize: 12, fontWeight: 700, color: T.ink, backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "11px 0", cursor: "pointer" }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: T.green.text }} />
                    {shortenAddr(address)}
                  </button>
                  <Link href="/profile"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.canvas, backgroundColor: T.ink, borderRadius: 6, padding: "11px 0" }}
                  >
                    <UserCircle size={13} weight="fill" /> {t.profile}
                  </Link>
                </div>
              </div>
            ) : (
              <button onClick={() => { setOpen(false); openConnectModal?.(); }}
                style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, color: T.canvas, backgroundColor: T.ink, borderRadius: 6, padding: "13px 0", border: "none", cursor: "pointer" }}
              >
                <Wallet size={13} weight="fill" /> {t.connectWallet}
              </button>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
