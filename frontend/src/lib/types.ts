/**
 * GiuPay — Shared Frontend Types (Step 16)
 * Mirror backend types.ts nhưng camelCase cho frontend.
 *
 * Usage:
 *   import type { Shop, Order, Dispute } from "@/lib/types";
 */

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "in_escrow"
  | "released"
  | "refunded"
  | "disputed";

export type ShopStatus = "pending" | "verified" | "rejected";
export type DisputeResolution = "refunded" | "released";
export type Chain = "ethereum" | "base" | "polygon" | "bnb" | "arc";

// ── Shop ──────────────────────────────────────────────────────────────────────
export interface Shop {
  id: string;
  walletAddress: string;
  name: string;
  description?: string;
  logoCid?: string;
  category?: string;
  gmail: string;
  facebookUrl?: string;
  returnPolicy?: string;
  status: ShopStatus;
  rejectReason?: string;
  docHash?: string;
  avgRating: number;
  totalOrders: number;
  createdAt: string;
  updatedAt: string;
}

// ── Order ─────────────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  orderCode: string;
  shopId: string;
  productName: string;
  productImageCid?: string;
  description?: string;
  priceUsdc: string;
  quantity: number;
  warrantyDays: number;
  status: OrderStatus;
  buyerWallet?: string;
  txHash?: string;
  sbtTokenId?: number;
  escrowCreatedAt?: string;
  escrowReleasedAt?: string;
  payUrl: string;
  qrData?: string;
  chainPaidFrom?: Chain;
  createdAt: string;
  updatedAt: string;
}

// ── Order with shop info (từ GET /api/orders/:code) ───────────────────────────
export interface OrderWithShop extends Order {
  shopName: string;
  shopLogoCid?: string;
  shopReturnPolicy?: string;
  shopAvgRating?: number;
  shopVerified?: boolean;
}

// ── Dispute ───────────────────────────────────────────────────────────────────
export interface Dispute {
  id: string;
  orderId: string;
  openedBy: string;
  reason: string;
  status: "open" | "resolved" | "closed";
  resolution?: DisputeResolution;
  attemptNumber: number;
  shopResponse?: string;
  adminNote?: string;
  openedAt: string;
  resolvedAt?: string;
  deadlineAt?: string;
}

// ── Review ────────────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  orderId: string;
  rating: number;
  comment?: string;
  buyerWallet: string;
  txHash?: string;
  createdAt: string;
}

// ── API Response wrapper ──────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ── Wallet connection state ───────────────────────────────────────────────────
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
}