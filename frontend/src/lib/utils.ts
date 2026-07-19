/**
 * GiuPay — Shared Utilities (Step 16)
 *
 * Usage:
 *   import { shortenAddr, timeAgo, formatUSDC, statusConfig, escrowDaysLeft } from "@/lib/utils";
 */

import { T } from "./tokens";
import type { OrderStatus } from "./types";

// ── Address ───────────────────────────────────────────────────────────────────

/** "0x1234...5678" */
export function shortenAddr(addr: string, chars = 4): string {
  if (!addr || addr.length < chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

/** Validate EVM address format */
export function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// ── Initials ──────────────────────────────────────────────────────────────────

/** "TechGadgets VN" → "TG" */
export function genInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0] ?? "")
    .join("")
    .toUpperCase();
}

// ── Time ──────────────────────────────────────────────────────────────────────

/** Returns "vừa xong", "3 phút trước", "2 tháng trước"... */
export function timeAgo(dateStr: string): string {
  const ms   = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(ms / 60_000);
  const hours = Math.floor(ms / 3_600_000);
  const days  = Math.floor(ms / 86_400_000);

  if (mins < 1)   return "vừa xong";
  if (mins < 60)  return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30)  return `${days} ngày trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
}

/** Days left in escrow window (from escrowCreatedAt) */
export function escrowDaysLeft(escrowCreatedAt: string, windowDays = 14): number {
  const releaseAt = new Date(escrowCreatedAt).getTime() + windowDays * 86_400_000;
  return Math.max(0, Math.ceil((releaseAt - Date.now()) / 86_400_000));
}

/** Days left in review window (from escrowReleasedAt) */
export function reviewDaysLeft(escrowReleasedAt: string, windowDays = 30): number {
  const deadline = new Date(escrowReleasedAt).getTime() + windowDays * 86_400_000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 86_400_000));
}

// ── Currency ──────────────────────────────────────────────────────────────────

/** "18.000000" → "$18.00" */
export function formatUSDC(raw: string | number, decimals = 2): string {
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  return `$${n.toFixed(decimals)}`;
}

/** platform fee = 0.1% */
export function platformFee(priceUsdc: string | number): number {
  const p = typeof priceUsdc === "string" ? parseFloat(priceUsdc) : priceUsdc;
  return p * 0.001;
}

/** Amount shop receives after fee */
export function shopReceives(priceUsdc: string | number): number {
  const p = typeof priceUsdc === "string" ? parseFloat(priceUsdc) : priceUsdc;
  return p * 0.999;
}

// ── Status config ─────────────────────────────────────────────────────────────

export const statusConfig: Record<
  OrderStatus,
  { label: string; bg: string; text: string }
> = {
  pending_payment: { label: "Chờ thanh toán", bg: T.yellow.bg, text: T.yellow.text },
  paid:            { label: "Đã thanh toán",  bg: T.blue.bg,   text: T.blue.text   },
  in_escrow:       { label: "Đang escrow",    bg: T.blue.bg,   text: T.blue.text   },
  released:        { label: "Hoàn thành",     bg: T.green.bg,  text: T.green.text  },
  refunded:        { label: "Đã hoàn tiền",   bg: T.yellow.bg, text: T.yellow.text },
  disputed:        { label: "Tranh chấp",     bg: T.red.bg,    text: T.red.text    },
};

// ── API fetch helper ──────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface FetchOptions extends RequestInit {
  walletAddress?: string; // auto-injects X-Wallet-Address header
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { walletAddress, headers, ...rest } = options;

  const merged: HeadersInit = {
    "Content-Type": "application/json",
    ...(walletAddress ? { "X-Wallet-Address": walletAddress } : {}),
    ...(headers ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    headers: merged,
    ...rest,
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error ?? `API error ${res.status}`);
  }

  return data as T;
}