/**
 * GiuPay - DocsPage
 * Trang giải thích cách GiuPay hoạt động (buyer flow, seller flow, escrow, SBT bảo hành,
 * tranh chấp, đánh giá, tech stack, contract đã deploy, FAQ) - thuần mô tả sản phẩm, KHÔNG
 * đi vào chi tiết code.
 * i18n: toàn bộ text dùng t.xxx (xem src/lib/i18n.ts, nhóm "DocsPage")
 * NavBar: dùng NavBarMinimal (inner page)
 */
"use client";

import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { T } from "@/lib/tokens";
import { NavBarMinimal } from "@/components/NavBarMinimal";
import {
  Wallet, CreditCard, LockSimple, SealCheck, Star,
  Storefront, ClockCountdown, Package, CurrencyDollar,
  CaretDown, ArrowSquareOut,
} from "@phosphor-icons/react";

const CONTRACTS = [
  { name: "ShopRegistry",  address: "0x6E18Ba8Ce0841Ff58831629a5dd34AE37932cd6b" },
  { name: "PaymentEscrow", address: "0x38800A873C6bC877E025529D0798ae57cBFAaA69" },
  { name: "WarrantySBT",   address: "0x2460C32eDA3134bCF3e284455Ed64d8c68F831C9" },
];
const EXPLORER = "https://testnet.arcscan.app";

function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div id={id} style={{ marginBottom: 20, scrollMarginTop: 78 }}>
      <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
        {eyebrow}
      </span>
      <h2 style={{ fontFamily: T.fontSans, fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, letterSpacing: "-0.02em", color: T.ink, lineHeight: 1.2 }}>
        {title}
      </h2>
    </div>
  );
}

function ProseBlock({ body }: { body: string }) {
  return (
    <p style={{ fontFamily: T.fontSans, fontSize: 14, color: T.inkMid, lineHeight: 1.75, maxWidth: 720 }}>
      {body}
    </p>
  );
}

interface Step { icon: React.ReactNode; title: string; desc: string; }

function StepList({ steps }: { steps: Step[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          display: "flex", gap: 16, padding: "20px 22px",
          borderBottom: i < steps.length - 1 ? `1px solid ${T.border}` : "none",
          backgroundColor: T.surface,
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, backgroundColor: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, flexShrink: 0 }}>
            {s.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 5 }}>{s.title}</h3>
            <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted, lineHeight: 1.65 }}>{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FaqItem({ q, a, defaultOpen = false, isLast = false }: { q: string; a: string; defaultOpen?: boolean; isLast?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: isLast ? "none" : `1px solid ${T.border}` }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "16px 2px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink }}>{q}</span>
        <CaretDown size={14} color={T.inkMuted} weight="bold" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
      </button>
      {open && (
        <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted, lineHeight: 1.7, padding: "0 2px 18px", maxWidth: 680 }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function DocsPage() {
  const { t } = useTheme();

  const buyerSteps: Step[] = [
    { icon: <Wallet size={16} weight="duotone" />,       title: t.docsBuyer1Title, desc: t.docsBuyer1Desc },
    { icon: <CreditCard size={16} weight="duotone" />,   title: t.docsBuyer2Title, desc: t.docsBuyer2Desc },
    { icon: <LockSimple size={16} weight="duotone" />,   title: t.docsBuyer3Title, desc: t.docsBuyer3Desc },
    { icon: <SealCheck size={16} weight="duotone" />,    title: t.docsBuyer4Title, desc: t.docsBuyer4Desc },
    { icon: <Star size={16} weight="duotone" />,         title: t.docsBuyer5Title, desc: t.docsBuyer5Desc },
  ];

  const sellerSteps: Step[] = [
    { icon: <Storefront size={16} weight="duotone" />,     title: t.docsSeller1Title, desc: t.docsSeller1Desc },
    { icon: <ClockCountdown size={16} weight="duotone" />, title: t.docsSeller2Title, desc: t.docsSeller2Desc },
    { icon: <Package size={16} weight="duotone" />,        title: t.docsSeller3Title, desc: t.docsSeller3Desc },
    { icon: <Storefront size={16} weight="duotone" />,     title: t.docsSeller4Title, desc: t.docsSeller4Desc },
    { icon: <CurrencyDollar size={16} weight="duotone" />, title: t.docsSeller5Title, desc: t.docsSeller5Desc },
  ];

  const techRows: [string, string][] = [
    [t.docsTechFrontendLabel,  "Next.js, wagmi + viem, RainbowKit"],
    [t.docsTechBackendLabel,   "Node.js, Express, PostgreSQL"],
    [t.docsTechContractsLabel, "Solidity (Hardhat), OpenZeppelin"],
    [t.docsTechStorageLabel,   "IPFS (Pinata)"],
    [t.docsTechPaymentsLabel,  "Native USDC on Arc, Circle CCTP"],
  ];

  const faqs: [string, string][] = [
    [t.docsFaq1Q, t.docsFaq1A],
    [t.docsFaq2Q, t.docsFaq2A],
    [t.docsFaq3Q, t.docsFaq3A],
    [t.docsFaq4Q, t.docsFaq4A],
    [t.docsFaq5Q, t.docsFaq5A],
    [t.docsFaq6Q, t.docsFaq6A],
  ];

  const toc: [string, string][] = [
    ["overview",  t.docsTocOverview],
    ["buyers",    t.docsTocBuyers],
    ["sellers",   t.docsTocSellers],
    ["escrow",    t.docsTocEscrow],
    ["warranty",  t.docsTocWarranty],
    ["dispute",   t.docsTocDispute],
    ["reviews",   t.docsTocReviews],
    ["tech",      t.docsTocTech],
    ["contracts", t.docsTocContracts],
    ["faq",       t.docsTocFaq],
  ];

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: T.canvas }}>
      <NavBarMinimal title={t.docsNavTitle} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "110px 28px 100px", display: "flex", gap: 56, alignItems: "flex-start" }}>

        {/* Sticky sidebar TOC - ẩn trên mobile */}
        <nav className="ap-hide-sm" style={{ position: "sticky", top: 78, width: 180, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {toc.map(([id, label]) => (
            <a key={id} href={`#${id}`} style={{
              fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted, padding: "6px 0",
              transition: "color 150ms",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = T.ink)}
              onMouseLeave={e => (e.currentTarget.style.color = T.inkMuted)}
            >
              {label}
            </a>
          ))}
        </nav>

        <main style={{ minWidth: 0, flex: 1, maxWidth: 800 }}>
          <div style={{ marginBottom: 56 }}>
            <h1 style={{ fontFamily: T.fontSans, fontSize: "clamp(28px,5vw,42px)", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink, lineHeight: 1.1, marginBottom: 14 }}>
              {t.docsTitle}
            </h1>
            <p style={{ fontFamily: T.fontSans, fontSize: 15, color: T.inkMuted, lineHeight: 1.6, maxWidth: 560 }}>
              {t.docsSubtitle}
            </p>
          </div>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle id="overview" eyebrow="01" title={t.docsOverviewTitle} />
            <ProseBlock body={t.docsOverviewBody} />
          </section>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle id="buyers" eyebrow="02" title={t.docsBuyerTitle} />
            <StepList steps={buyerSteps} />
          </section>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle id="sellers" eyebrow="03" title={t.docsSellerTitle} />
            <StepList steps={sellerSteps} />
          </section>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle id="escrow" eyebrow="04" title={t.docsEscrowTitle} />
            <ProseBlock body={t.docsEscrowBody} />
          </section>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle id="warranty" eyebrow="05" title={t.docsWarrantyTitle} />
            <ProseBlock body={t.docsWarrantyBody} />
          </section>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle id="dispute" eyebrow="06" title={t.docsDisputeTitle} />
            <ProseBlock body={t.docsDisputeBody} />
          </section>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle id="reviews" eyebrow="07" title={t.docsReviewChatTitle} />
            <ProseBlock body={t.docsReviewChatBody} />
          </section>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle id="tech" eyebrow="08" title={t.docsTechTitle} />
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              {techRows.map(([label, value], i) => (
                <div key={label} style={{
                  display: "flex", padding: "14px 20px", gap: 20,
                  borderBottom: i < techRows.length - 1 ? `1px solid ${T.border}` : "none",
                  backgroundColor: T.surface,
                }}>
                  <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, width: 160, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted }}>{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 56 }}>
            <SectionTitle id="contracts" eyebrow="09" title={t.docsContractsTitle} />
            <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted, lineHeight: 1.6, marginBottom: 16 }}>
              {t.docsContractsBody}
            </p>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              {CONTRACTS.map((c, i) => (
                <div key={c.name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px",
                  borderBottom: i < CONTRACTS.length - 1 ? `1px solid ${T.border}` : "none",
                  backgroundColor: T.surface,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 3 }}>{c.name}</div>
                    <div style={{ fontFamily: T.fontMono, fontSize: 12, color: T.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address}</div>
                  </div>
                  <a href={`${EXPLORER}/address/${c.address}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.ink, backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    {t.docsContractsViewOn} <ArrowSquareOut size={12} weight="bold" />
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle id="faq" eyebrow="10" title={t.docsFaqTitle} />
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: "4px 18px", backgroundColor: T.surface }}>
              {faqs.map(([q, a], i) => (
                <FaqItem key={i} q={q} a={a} defaultOpen={i === 0} isLast={i === faqs.length - 1} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
