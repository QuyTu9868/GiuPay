/**
 * GiuPay — NavBarMinimal (Step 16)
 * Back-button navbar dùng cho các inner pages.
 * ✅ i18n: backLabel mặc định lấy từ t.back (vi/en)
 */

"use client";

import { useEffect, useState } from "react";
import { Storefront, CaretLeft, Wallet } from "@phosphor-icons/react";
import { useConnectModal, useAccountModal } from "@rainbow-me/rainbowkit";
import { T } from "@/lib/tokens";
import { useTheme } from "@/lib/theme";
import { useWallet } from "@/hooks/useWallet";
import { shortenAddr } from "@/lib/utils";

interface NavBarMinimalProps {
  back?:      string;
  backLabel?: string;       // override nếu muốn custom, mặc định dùng t.back
  title?:     string;
  right?:     React.ReactNode;
}

export function NavBarMinimal({
  back      = "/",
  backLabel,
  title,
  right,
}: NavBarMinimalProps) {
  const { t } = useTheme();
  const label = backLabel ?? t.back;   // ← dùng ngôn ngữ hiện tại nếu không override

  // Trước đây dùng <ConnectButton.Custom> — đổi sang gọi thẳng 2 hook riêng của RainbowKit
  // để tránh useProfile()/useBalance() bị gọi ngầm trên mọi trang (navbar này render ở khắp
  // các trang con), góp phần gây rate-limit 429 RPC Arc testnet dù số dư chưa từng hiển thị
  // ra UI. Xem BUGLOG.md.
  const { address } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: 58,
      borderBottom: `1px solid ${T.border}`,
      backgroundColor: "rgba(251,251,250,0.95)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "0 28px", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Back */}
        <a href={back} style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted,
          transition: "color 150ms", minWidth: 80,
        }}
          onMouseEnter={e => (e.currentTarget.style.color = T.ink)}
          onMouseLeave={e => (e.currentTarget.style.color = T.inkMuted)}
        >
          <CaretLeft size={14} weight="bold" />
          {label}
        </a>

        {/* Logo + optional breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6, backgroundColor: T.ink,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Storefront size={13} color={T.canvas} weight="fill" />
            </div>
            <span style={{
              fontFamily: T.fontSans, fontWeight: 650, fontSize: 14,
              color: T.ink, letterSpacing: "-0.02em",
            }}>GiuPay</span>
          </a>
          {title && (
            <>
              <span style={{ color: T.border, fontSize: 16 }}>/</span>
              <span style={{
                fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted,
              }}>{title}</span>
            </>
          )}
        </div>

        {/* Right slot + trạng thái ví (luôn hiện ở mọi trang) */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          {right}
          {mounted && (address ? (
            <button onClick={openAccountModal}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: T.fontMono, fontSize: 12, fontWeight: 500, color: T.ink, backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: T.green.text }} />
              {shortenAddr(address)}
            </button>
          ) : (
            <button onClick={openConnectModal}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.canvas, backgroundColor: T.ink, borderRadius: 6, padding: "7px 13px", border: "none", cursor: "pointer" }}
            >
              <Wallet size={13} weight="fill" /> {t.connectWallet}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ── Step dot indicator ───────────────────────────────────────────────────────
interface StepDotsProps {
  total:   number;
  current: number;
}

export function StepDots({ total, current }: StepDotsProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        return (
          <div key={step} style={{
            width:  step === current ? 20 : 6,
            height: 6,
            borderRadius: 9999,
            backgroundColor: step === current
              ? T.ink
              : step < current
              ? T.inkMid
              : T.border,
            transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
          }} />
        );
      })}
    </div>
  );
}
