/**
 * GiuPay — DocsPage
 * Trang giải thích cách GiuPay hoạt động (buyer flow, seller flow, escrow, SBT bảo hành,
 * tranh chấp, đánh giá) — thuần mô tả sản phẩm, KHÔNG đi vào chi tiết code/contract.
 * ✅ i18n: toàn bộ text dùng t.xxx (xem src/lib/i18n.ts, nhóm "DocsPage")
 * ✅ NavBar: dùng NavBarMinimal (inner page)
 */
"use client";

import { useTheme } from "@/lib/theme";
import { T } from "@/lib/tokens";
import { NavBarMinimal } from "@/components/NavBarMinimal";
import {
  Wallet, CreditCard, LockSimple, SealCheck, Star,
  Storefront, ClockCountdown, Package, CurrencyDollar,
} from "@phosphor-icons/react";

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
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

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: T.canvas }}>
      <NavBarMinimal title={t.docsNavTitle} />

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "110px 28px 100px" }}>
        <div style={{ marginBottom: 56 }}>
          <h1 style={{ fontFamily: T.fontSans, fontSize: "clamp(28px,5vw,42px)", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink, lineHeight: 1.1, marginBottom: 14 }}>
            {t.docsTitle}
          </h1>
          <p style={{ fontFamily: T.fontSans, fontSize: 15, color: T.inkMuted, lineHeight: 1.6, maxWidth: 560 }}>
            {t.docsSubtitle}
          </p>
        </div>

        <section style={{ marginBottom: 56 }}>
          <SectionTitle eyebrow="01" title={t.docsOverviewTitle} />
          <ProseBlock body={t.docsOverviewBody} />
        </section>

        <section style={{ marginBottom: 56 }}>
          <SectionTitle eyebrow="02" title={t.docsBuyerTitle} />
          <StepList steps={buyerSteps} />
        </section>

        <section style={{ marginBottom: 56 }}>
          <SectionTitle eyebrow="03" title={t.docsSellerTitle} />
          <StepList steps={sellerSteps} />
        </section>

        <section style={{ marginBottom: 56 }}>
          <SectionTitle eyebrow="04" title={t.docsEscrowTitle} />
          <ProseBlock body={t.docsEscrowBody} />
        </section>

        <section style={{ marginBottom: 56 }}>
          <SectionTitle eyebrow="05" title={t.docsWarrantyTitle} />
          <ProseBlock body={t.docsWarrantyBody} />
        </section>

        <section style={{ marginBottom: 56 }}>
          <SectionTitle eyebrow="06" title={t.docsDisputeTitle} />
          <ProseBlock body={t.docsDisputeBody} />
        </section>

        <section>
          <SectionTitle eyebrow="07" title={t.docsReviewChatTitle} />
          <ProseBlock body={t.docsReviewChatBody} />
        </section>
      </main>
    </div>
  );
}
