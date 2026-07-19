export type OrderStatus = "pending_payment" | "paid" | "in_escrow" | "released" | "refunded" | "disputed";
export type ShopStatus = "pending" | "verified" | "rejected";
export type DisputeResolution = "refunded" | "released";
export type Chain = "ethereum" | "base" | "polygon" | "bnb" | "arc";

export interface Shop {
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
  doc_hash?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  order_code: string;
  shop_id: string;
  product_name: string;
  product_image_cid?: string;
  description?: string;
  price_usdc: string;
  quantity: number;
  warranty_days: number;
  status: OrderStatus;
  buyer_wallet?: string;
  tx_hash?: string;
  sbt_token_id?: number;
  escrow_created_at?: Date;
  escrow_released_at?: Date;
  pay_url: string;
  qr_data?: string;
  chain_paid_from?: Chain;
  created_at: Date;
  updated_at: Date;
}

export interface Dispute {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: "open" | "resolved" | "closed";
  resolution?: DisputeResolution;
  attempt_number: number;
  shop_response?: string;
  admin_note?: string;
  opened_at: Date;
  resolved_at?: Date;
  deadline_at?: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}