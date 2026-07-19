/**
 * GiuPay — Design Tokens (Step 16)
 * Single source of truth — import T từ đây thay vì define inline trong mỗi page.
 *
 * Usage:
 *   import { T } from "@/lib/tokens";
 */

export const T = {
  // ── Surfaces ──────────────────────────────────────────────
  canvas:     "#FBFBFA",
  surface:    "#FFFFFF",
  surfaceAlt: "#F7F6F3",

  // ── Borders ───────────────────────────────────────────────
  border: "#EAEAEA",

  // ── Ink ───────────────────────────────────────────────────
  ink:     "#111111",
  inkMid:  "#37352F",
  inkMuted:"#787774",

  // ── Muted pastels (tags / badges / alerts only) ───────────
  green:  { bg: "#EDF3EC", text: "#346538" },
  blue:   { bg: "#E1F3FE", text: "#1F6C9F" },
  yellow: { bg: "#FBF3DB", text: "#956400" },
  red:    { bg: "#FDEBEC", text: "#9F2F2D" },

  // ── Typography ────────────────────────────────────────────
  fontSans: "'Geist Sans', 'SF Pro Display', 'Helvetica Neue', sans-serif",
  fontMono: "'Geist Mono', 'SF Mono', 'JetBrains Mono', monospace",
} as const;

export type TColors = typeof T;