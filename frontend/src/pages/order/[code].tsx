/**
 * GiuPay — Order Detail Page (buyer)
 * Buyer bấm vào 1 đơn trong Profile → vào đây xem tiến trình đơn hàng + mở tranh chấp.
 * NavBar: dùng chung trong _app.tsx (route "/order/[code]" nằm trong FULL_NAVBAR_ROUTES).
 *
 * Tiến trình giao hàng (bước "đóng gói"/"đang giao") là MÔ PHỎNG cho demo — chưa nối
 * với GHN thật (xem implementation-notes.md, "Lỗi 3"). Trạng thái escrow (đã thanh toán/
 * đã hoàn tất/hoàn tiền/tranh chấp) là DỮ LIỆU THẬT lấy từ backend.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useWriteContract, useSwitchChain, useChainId, usePublicClient } from "wagmi";
import { keccak256, toBytes } from "viem";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/lib/theme";
import { T } from "@/lib/tokens";
import { formatUSDC, timeAgo } from "@/lib/utils";
import { ensureChainWrite } from "@/lib/ensure-chain-write";
import {
  ArrowLeft, Package, ShoppingBagOpen, Truck, CheckCircle, Warning, ClockCountdown,
  ArrowSquareOut, SealCheck, MapPin, Star, ChatCircleDots,
} from "@phosphor-icons/react";
import { ChatWidget } from "@/components/ChatWidget";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Mở tranh chấp THẬT trên chain (Arc) trước khi ghi DB ────────────────────
// Trước đây nút này chỉ ghi DB (status='disputed') mà không hề gọi openDispute() trên
// smart contract — khiến admin không resolve được vì contract vẫn nghĩ đơn "bình thường"
// (xem implementation-notes.md, mục debug ORD-NPSJFY). Chỉ áp dụng cho đơn trả TRỰC TIẾP
// trên Arc (chain_paid_from==="arc") — đơn trả qua CCTP thì buyer trên chain là ví relayer,
// backend đã tự mở hộ được lúc admin resolve (xem escrow-chain.ts ensureOnchainDisputeOpen),
// không cần buyer tự ký thêm bước này.
const ARC_CHAIN_ID     = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002);
const ESCROW_ADDRESS   = process.env.NEXT_PUBLIC_ESCROW_CONTRACT as `0x${string}`;
const ESCROW_DISPUTE_ABI = [
  { name: "openDispute", type: "function", stateMutability: "nonpayable", inputs: [{ name: "orderId", type: "bytes32" }], outputs: [] },
] as const;
const ESCROW_READ_ABI = [
  { name: "escrows", type: "function", stateMutability: "view", inputs: [{ name: "", type: "bytes32" }], outputs: [
    { name: "buyer", type: "address" }, { name: "shop", type: "address" }, { name: "amount", type: "uint256" },
    { name: "createdAt", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "status", type: "uint8" },
    { name: "disputeCount", type: "uint256" }, { name: "disputeClosed", type: "bool" },
  ] },
] as const;
const STATUS_DISPUTED = 3; // EscrowStatus.Disputed — đúng thứ tự enum trong PaymentEscrow.sol

// orderId on-chain = keccak256(order_code) — PHẢI khớp escrow-chain.ts/bot.ts/PaymentPage.tsx
function orderIdFromCode(orderCode: string): `0x${string}` {
  return keccak256(toBytes(orderCode));
}

interface OrderDetail {
  order_code: string; product_name: string; description?: string; product_image_cid?: string;
  price_usdc: string; quantity: number; warranty_days?: number;
  status: string; shop_name: string; shop_wallet?: string; buyer_wallet?: string; shop_id?: string;
  tx_hash?: string; escrow_created_at?: string; escrow_released_at?: string;
  created_at: string; ship_tracking?: string; shipped_at?: string; chain_paid_from?: string;
  has_review?: boolean;
}
interface DisputeRow {
  id: string; reason: string; status: string; resolution?: string;
  shop_response?: string; admin_note?: string; opened_at: string; deadline_at?: string;
  image_cid?: string;
}

const GLOBAL_CSS = `
  @keyframes ap-spin  { to { transform:rotate(360deg); } }
  @keyframes ap-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
`;

export default function OrderDetailPage() {
  const router = useRouter();
  const code = typeof router.query.code === "string" ? router.query.code.toUpperCase() : "";
  const { walletAddress, isConnected } = useWallet();
  const { lang } = useTheme();
  const isVi = lang === "vi";

  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync }   = useSwitchChain();
  const currentChainId         = useChainId();
  const arcPublicClient        = usePublicClient({ chainId: ARC_CHAIN_ID });

  const [order, setOrder]       = useState<OrderDetail | null>(null);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [reason, setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr]   = useState("");
  const [signStep, setSignStep] = useState(""); // label hiện lúc đang ký ví / chờ on-chain
  const [chatOpen, setChatOpen] = useState(false);

  // Ảnh bằng chứng đính kèm lúc mở tranh chấp, shop và admin đều xem được sau này.
  const [disputeImageFile, setDisputeImageFile] = useState<File | null>(null);
  const [disputeImagePreview, setDisputeImagePreview] = useState<string>("");

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    try {
      const [oRes, dRes] = await Promise.all([
        fetch(`${API}/api/orders/${code}`),
        fetch(`${API}/api/orders/${code}/dispute`),
      ]);
      if (!oRes.ok) { setNotFound(true); return; }
      const { success, data } = await oRes.json();
      if (!success) { setNotFound(true); return; }
      setOrder(data);
      const dJson = await dRes.json();
      if (dJson.success) setDisputes(dJson.data ?? []);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, [code]);

  useEffect(() => { load(); }, [load]);

  async function submitDispute() {
    if (!order || !walletAddress) return;
    if (reason.trim().length < 10) {
      setFormErr(isVi ? "Nhập lý do ít nhất 10 ký tự" : "Reason must be at least 10 characters");
      return;
    }
    setSubmitting(true); setFormErr(""); setSignStep("");
    try {
      // Đơn trả trực tiếp trên Arc: buyer PHẢI tự ký openDispute() thật trên chain trước —
      // nếu không, admin sau này không resolve được (contract vẫn nghĩ đơn "bình thường").
      // Đơn trả qua CCTP: buyer trên chain là ví relayer, backend tự mở hộ lúc admin resolve,
      // không cần bước ký này (xem comment ở đầu file).
      const isDirectArc = !order.chain_paid_from || order.chain_paid_from === "arc";
      if (isDirectArc) {
        if (!ESCROW_ADDRESS) throw new Error(isVi ? "Thiếu cấu hình địa chỉ escrow contract" : "Missing escrow contract address config");
        if (!arcPublicClient) throw new Error(isVi ? "Không kết nối được RPC Arc" : "Could not connect to Arc RPC");
        const orderId = orderIdFromCode(order.order_code);

        setSignStep(isVi ? "Đang kiểm tra trạng thái on-chain..." : "Checking on-chain status...");
        const state = await arcPublicClient.readContract({
          address: ESCROW_ADDRESS, abi: ESCROW_READ_ABI, functionName: "escrows", args: [orderId],
        });
        const alreadyDisputedOnchain = Number(state[5]) === STATUS_DISPUTED;

        if (!alreadyDisputedOnchain) {
          // LUÔN chuyển mạng trước khi ký (không check currentChainId nữa) — ví có thể báo
          // "chain mismatch" dù user đã tự đổi mạng thủ công, vì state React không phải lúc
          // nào cũng đồng bộ ngay với chain thật của ví. Xem lib/ensure-chain-write.ts.
          setSignStep(isVi ? "Đang chuyển ví sang mạng Arc..." : "Switching wallet to Arc network...");
          const hash = await ensureChainWrite(
            ARC_CHAIN_ID,
            switchChainAsync,
            () => {
              setSignStep(isVi ? "Vui lòng ký xác nhận trong ví..." : "Please confirm in your wallet...");
              return writeContractAsync({
                address: ESCROW_ADDRESS, abi: ESCROW_DISPUTE_ABI, functionName: "openDispute",
                args: [orderId], chainId: ARC_CHAIN_ID,
              });
            },
          );
          setSignStep(isVi ? "Đang xác nhận giao dịch on-chain..." : "Confirming on-chain transaction...");
          await arcPublicClient.waitForTransactionReceipt({ hash });
        }
      }

      let imageCid = "";
      if (disputeImageFile) {
        setSignStep(isVi ? "Đang tải ảnh lên..." : "Uploading image...");
        const fd = new FormData();
        fd.append("image", disputeImageFile);
        const upRes = await fetch(`${API}/api/upload/image`, { method: "POST", body: fd });
        const upJ = await upRes.json();
        if (upJ.success) imageCid = upJ.data.cid;
        // Upload ảnh lỗi thì vẫn cho gửi khiếu nại tiếp (ảnh chỉ là bằng chứng thêm, không bắt buộc).
      }

      setSignStep(isVi ? "Đang lưu khiếu nại..." : "Saving dispute...");
      const res = await fetch(`${API}/api/orders/${order.order_code}/dispute`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), opened_by: walletAddress, image_cid: imageCid || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormErr(json.error || (isVi ? "Không mở được tranh chấp" : "Could not open dispute"));
        return;
      }
      setShowForm(false); setReason(""); setDisputeImageFile(null); setDisputeImagePreview("");
      await load();
    } catch (err: any) {
      setFormErr(
        err?.shortMessage || err?.message ||
        (isVi ? "Lỗi kết nối máy chủ hoặc ví" : "Server or wallet connection error")
      );
    } finally { setSubmitting(false); setSignStep(""); }
  }

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.ink, animation: "ap-spin 700ms linear infinite" }} />
        </main>
      </>
    );
  }

  if (notFound || !order) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 60, textAlign: "center" }}>
          <div>
            <Warning size={32} color={T.inkMuted} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: T.fontSans, fontSize: 14, color: T.inkMuted }}>
              {isVi ? "Không tìm thấy đơn hàng này." : "Order not found."}
            </p>
            <a href="/profile" style={{ display: "inline-block", marginTop: 16, fontFamily: T.fontSans, fontSize: 13, color: T.ink, textDecoration: "underline" }}>
              {isVi ? "Về hồ sơ của tôi" : "Back to my profile"}
            </a>
          </div>
        </main>
      </>
    );
  }

  const isOwner = !!walletAddress && !!order.buyer_wallet && walletAddress === order.buyer_wallet.toLowerCase();
  const isShipped = !!order.ship_tracking;
  const isTerminal = order.status === "released" || order.status === "refunded";

  // ── Tiến trình (mô phỏng bước đóng gói/giao hàng, trạng thái escrow là thật) ──
  const steps = [
    { key: "placed",   label: isVi ? "Đặt hàng thành công" : "Order placed", icon: <ShoppingBagOpen size={15} weight="fill" />, done: true },
    { key: "paid",     label: isVi ? "Đã thanh toán (vào escrow)" : "Paid (into escrow)", icon: <Package size={15} weight="fill" />, done: order.status !== "pending_payment" },
    { key: "packed",   label: isVi ? "Người bán đã đóng gói" : "Seller packed the item", icon: <Package size={15} weight="fill" />, done: isShipped },
    { key: "shipping", label: isVi ? "Đang trên đường giao (mô phỏng)" : "Out for delivery (simulated)", icon: <Truck size={15} weight="fill" />, done: order.status === "released", current: isShipped && !isTerminal },
    { key: "done",     label: isVi ? "Hoàn tất — đã giải ngân cho shop" : "Completed — released to shop", icon: <SealCheck size={15} weight="fill" />, done: order.status === "released" },
  ];

  const openDispute = disputes.find(d => d.status === "open");
  const disputeCount = disputes.length;

  let daysLeftToDispute: number | null = null;
  if (order.escrow_created_at) {
    const deadline = new Date(order.escrow_created_at);
    deadline.setDate(deadline.getDate() + 14);
    daysLeftToDispute = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
  }

  const canDispute = isOwner && order.status === "in_escrow" && !openDispute && disputeCount < 3
    && (daysLeftToDispute === null || daysLeftToDispute > 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <main style={{ minHeight: "100dvh", backgroundColor: T.canvas, paddingTop: 58 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 80px" }}>

          <a href="/profile" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted, marginBottom: 24 }}>
            <ArrowLeft size={13} weight="bold" /> {isVi ? "Đơn hàng của tôi" : "My orders"}
          </a>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {order.product_image_cid && (
                <img src={`https://gateway.pinata.cloud/ipfs/${order.product_image_cid}`} alt={order.product_name}
                  style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", border: `1px solid ${T.border}`, flexShrink: 0 }} />
              )}
              <div>
                <code style={{ fontFamily: T.fontMono, fontSize: 11, color: T.inkMuted }}>{order.order_code}</code>
                <h1 style={{ fontFamily: T.fontSans, fontSize: 20, fontWeight: 700, color: T.ink, marginTop: 4 }}>{order.product_name}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted }}>{order.shop_name}</p>
                {isOwner && order.shop_id && (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setChatOpen(o => !o)} title={isVi ? "Chat với shop" : "Chat with shop"}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, width: "auto", height: 24, padding: "0 10px", borderRadius: 6, border: `1px solid ${T.border}`, backgroundColor: T.surfaceAlt, color: T.inkMuted, cursor: "pointer", fontFamily: T.fontSans, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}
                    >
                      <ChatCircleDots size={13} weight="fill" />
                      {isVi ? "Chat với shop" : "Chat with shop"}
                    </button>
                    {chatOpen && (
                      <ChatWidget variant="popover" autoOpenShopId={order.shop_id} onClose={() => setChatOpen(false)} />
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: T.fontMono, fontSize: 20, fontWeight: 700, color: T.ink }}>
                {formatUSDC(order.price_usdc)}{order.quantity > 1 && <span style={{ fontSize: 12, color: T.inkMuted, fontWeight: 400 }}> ×{order.quantity}</span>}
              </p>
              <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{timeAgo(order.created_at)}</p>
            </div>
          </div>

          {/* Banner: tranh chấp / hoàn tiền */}
          {order.status === "disputed" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, backgroundColor: T.red.bg, border: `1px solid ${T.red.text}22`, marginBottom: 20 }}>
              <Warning size={18} color={T.red.text} weight="fill" />
              <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.red.text, fontWeight: 500 }}>
                {isVi ? "Đơn đang trong tranh chấp — shop có 7 ngày để phản hồi." : "Order is under dispute — seller has 7 days to respond."}
              </span>
            </div>
          )}
          {order.status === "refunded" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, backgroundColor: T.yellow.bg, border: `1px solid ${T.yellow.text}22`, marginBottom: 20 }}>
              <CheckCircle size={18} color={T.yellow.text} weight="fill" />
              <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.yellow.text, fontWeight: 500 }}>
                {isVi ? "Đơn đã được hoàn tiền." : "Order has been refunded."}
              </span>
            </div>
          )}

          {/* Tiến trình */}
          {order.status !== "disputed" && order.status !== "refunded" && (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, padding: "20px 20px 16px", marginBottom: 20 }}>
              <h3 style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 18 }}>
                {isVi ? "Tiến trình đơn hàng" : "Order progress"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {steps.map((s, i) => (
                  <div key={s.key} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        backgroundColor: s.done ? T.green.bg : s.current ? T.blue.bg : T.surfaceAlt,
                        color: s.done ? T.green.text : s.current ? T.blue.text : T.inkMuted,
                        border: `1px solid ${s.done ? T.green.text + "33" : s.current ? T.blue.text + "33" : T.border}`,
                        animation: s.current ? "ap-pulse 1600ms ease-in-out infinite" : undefined,
                      }}>
                        {s.icon}
                      </div>
                      {i < steps.length - 1 && (
                        <div style={{ width: 1, flex: 1, minHeight: 22, backgroundColor: s.done ? T.green.text : T.border }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 22 }}>
                      <p style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: s.done || s.current ? 600 : 400, color: s.done ? T.ink : s.current ? T.blue.text : T.inkMuted }}>
                        {s.label}
                      </p>
                      {s.key === "paid" && s.done && order.status === "in_escrow" && (
                        <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
                          {isVi ? "Đồng hồ 14 ngày bắt đầu từ đây, không phải từ lúc giao hàng." : "The 14-day clock starts here, not from when the item ships."}
                        </p>
                      )}
                      {s.key === "packed" && isShipped && order.ship_tracking && (
                        <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
                          {isVi ? "Mã vận đơn" : "Tracking"}: {order.ship_tracking}
                        </p>
                      )}
                      {s.key === "shipping" && s.current && (
                        <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
                          {isVi ? "Dự kiến giao trong 2–4 ngày làm việc" : "Estimated 2–4 business days"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chi tiết đơn */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, padding: "16px 20px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
              {isVi ? "Chi tiết" : "Details"}
            </h3>
            {[
              { label: isVi ? "Trạng thái escrow" : "Escrow status", value: order.status },
              { label: isVi ? "Mạng thanh toán" : "Paid via", value: order.chain_paid_from ?? "arc" },
              order.warranty_days ? { label: isVi ? "Bảo hành" : "Warranty", value: `${order.warranty_days} ${isVi ? "ngày" : "days"}` } : null,
            ].filter(Boolean).map((row: any, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: T.fontSans, fontSize: 12 }}>
                <span style={{ color: T.inkMuted }}>{row.label}</span>
                <span style={{ color: T.ink, fontWeight: 500, textTransform: "capitalize" }}>{row.value}</span>
              </div>
            ))}
            {order.tx_hash && (
              <a href={`https://testnet.arcscan.app/tx/${order.tx_hash}`} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: T.fontMono, fontSize: 11, color: T.blue.text, marginTop: 4 }}>
                {isVi ? "Xem giao dịch" : "View transaction"} <ArrowSquareOut size={10} />
              </a>
            )}
          </div>

          {/* Đánh giá — chỉ hiện khi đơn đã hoàn tất (released) và chưa đánh giá. Trước bản sửa
              này không có bất kỳ nút/link nào dẫn tới /review/[code] ở đâu trong app, dù trang
              đó đã viết đầy đủ và chạy được (xem implementation-notes.md). */}
          {isOwner && ["paid","in_escrow","released"].includes(order.status) && (
            order.has_review ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surfaceAlt, padding: "14px 20px", marginBottom: 20 }}>
                <Star size={14} weight="fill" color={T.yellow.text} />
                <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted }}>{isVi ? "Bạn đã đánh giá đơn này." : "You've already reviewed this order."}</p>
              </div>
            ) : (
              <a href={`/review/${order.order_code}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, padding: "14px 20px", marginBottom: 20, fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.ink }}>
                <Star size={14} weight="fill" color={T.yellow.text} /> {isVi ? "Đánh giá đơn hàng này" : "Review this order"}
              </a>
            )
          )}

          {/* Khiếu nại / Hủy đơn — trước khi shop giao hàng thì hiện "Hủy đơn" (buyer đổi ý,
              chưa nhận được gì để mà khiếu nại); sau khi đã giao thì chỉ hiện "Mở tranh chấp"
              (hàng có vấn đề). Cả 2 dùng CHUNG 1 cơ chế on-chain (openDispute → shop/admin xử lý) —
              contract không có hàm "cancel" riêng, đây chỉ là đổi nhãn/văn bản theo ngữ cảnh. */}
          {isOwner && (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, padding: "16px 20px" }}>
              <h3 style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 10 }}>
                {isShipped ? (isVi ? "Khiếu nại" : "Dispute") : (isVi ? "Hủy đơn" : "Cancel order")}
              </h3>

              {disputes.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: canDispute ? 14 : 0 }}>
                  {disputes.map(d => (
                    <div key={d.id} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", backgroundColor: T.surfaceAlt }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: T.fontMono, fontSize: 10, textTransform: "uppercase", color: d.status === "open" ? T.red.text : T.green.text, fontWeight: 700 }}>
                          {d.status === "open" ? (isVi ? "Đang mở" : "Open") : (isVi ? "Đã xử lý" : "Resolved")}
                        </span>
                        <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted }}>{timeAgo(d.opened_at)}</span>
                      </div>
                      <p style={{ fontFamily: T.fontSans, fontSize: 12, color: T.ink }}>{d.reason}</p>
                      {d.image_cid && (
                        <a href={`https://gateway.pinata.cloud/ipfs/${d.image_cid}`} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 6 }}>
                          <img src={`https://gateway.pinata.cloud/ipfs/${d.image_cid}`} alt="" style={{ maxWidth: 160, maxHeight: 120, borderRadius: 6, border: `1px solid ${T.border}`, objectFit: "cover" }} />
                        </a>
                      )}
                      {d.shop_response && (
                        <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, marginTop: 6, borderTop: `1px solid ${T.border}`, paddingTop: 6 }}>
                          <strong style={{ color: T.inkMid }}>{isVi ? "Shop phản hồi: " : "Seller replied: "}</strong>{d.shop_response}
                        </p>
                      )}
                      {d.resolution && (
                        <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.green.text, marginTop: 4, fontWeight: 500 }}>
                          {isVi ? "Kết quả: " : "Result: "}{d.resolution === "refunded" ? (isVi ? "Đã hoàn tiền" : "Refunded") : (isVi ? "Đã release cho shop" : "Released to seller")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canDispute && !showForm && (
                <>
                  <button onClick={() => { setShowForm(true); if (!isShipped) setReason(isVi ? "Người mua muốn hủy đơn trước khi shop giao hàng." : "Buyer wants to cancel the order before it ships."); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.canvas, backgroundColor: T.red.text, borderRadius: 8, padding: "11px 0", border: "none", cursor: "pointer" }}
                  >
                    <Warning size={14} weight="fill" /> {isShipped ? (isVi ? "Mở tranh chấp" : "Open a dispute") : (isVi ? "Hủy đơn" : "Cancel order")}
                  </button>
                  {daysLeftToDispute !== null && daysLeftToDispute > 0 && (
                    <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, textAlign: "center", marginTop: 8 }}>
                      {isShipped
                        ? (isVi ? `Còn ${daysLeftToDispute} ngày để khiếu nại trước khi tiền tự động giải phóng cho shop.` : `${daysLeftToDispute} days left to dispute before funds auto-release to the seller.`)
                        : (isVi ? `Còn ${daysLeftToDispute} ngày để hủy đơn trước khi tiền tự động giải phóng cho shop.` : `${daysLeftToDispute} days left to cancel before funds auto-release to the seller.`)}
                    </p>
                  )}
                </>
              )}

              {showForm && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <textarea
                    value={reason}
                    onChange={e => { setReason(e.target.value); setFormErr(""); }}
                    placeholder={isShipped
                      ? (isVi ? "Mô tả vấn đề bạn gặp phải (ít nhất 10 ký tự)..." : "Describe the issue (at least 10 characters)...")
                      : (isVi ? "Lý do hủy đơn (ít nhất 10 ký tự)..." : "Reason for cancelling (at least 10 characters)...")}
                    rows={4}
                    style={{ width: "100%", padding: "10px 12px", fontFamily: T.fontSans, fontSize: 13, color: T.ink, backgroundColor: T.canvas, border: `1px solid ${formErr ? T.red.text : T.border}`, borderRadius: 8, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                  {formErr && <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.red.text }}>{formErr}</p>}
                  {!isShipped && (
                    <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, lineHeight: 1.5 }}>
                      {isVi
                        ? "Lưu ý: hủy đơn vẫn cần shop (hoặc admin nếu shop không phản hồi) đồng ý hoàn tiền — chưa hoàn ngay lập tức."
                        : "Note: cancelling still requires the seller (or admin, if they don't respond) to approve the refund — it's not instant."}
                    </p>
                  )}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, cursor: submitting ? "not-allowed" : "pointer", border: `1px dashed ${T.border}`, borderRadius: 8, padding: "8px 10px" }}>
                      <input type="file" accept="image/*" disabled={submitting} style={{ display: "none" }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setDisputeImageFile(f);
                          setDisputeImagePreview(URL.createObjectURL(f));
                          e.target.value = "";
                        }}
                      />
                      {isVi ? "Đính kèm ảnh bằng chứng (không bắt buộc)" : "Attach evidence photo (optional)"}
                    </label>
                    {disputeImagePreview && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <img src={disputeImagePreview} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.border}` }} />
                        <button type="button" onClick={() => { setDisputeImageFile(null); setDisputeImagePreview(""); }} disabled={submitting}
                          style={{ fontFamily: T.fontSans, fontSize: 12, color: T.red.text, background: "none", border: "none", cursor: submitting ? "not-allowed" : "pointer", padding: 0 }}
                        >
                          {isVi ? "Xóa ảnh" : "Remove"}
                        </button>
                      </div>
                    )}
                  </div>
                  {(!order.chain_paid_from || order.chain_paid_from === "arc") && !submitting && (
                    <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, lineHeight: 1.5 }}>
                      {isShipped
                        ? (isVi ? "Bạn sẽ cần ký 1 giao dịch trong ví để mở tranh chấp thật trên chain trước khi gửi." : "You'll need to sign 1 wallet transaction to open the dispute on-chain before submitting.")
                        : (isVi ? "Bạn sẽ cần ký 1 giao dịch trong ví để mở yêu cầu hủy thật trên chain trước khi gửi." : "You'll need to sign 1 wallet transaction to open the cancellation on-chain before submitting.")}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setShowForm(false); setFormErr(""); }} disabled={submitting}
                      style={{ flex: 1, fontFamily: T.fontSans, fontSize: 13, color: T.inkMuted, backgroundColor: T.canvas, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 0", cursor: "pointer" }}
                    >
                      {isShipped ? (isVi ? "Huỷ" : "Cancel") : (isVi ? "Đóng" : "Close")}
                    </button>
                    <button onClick={submitDispute} disabled={submitting}
                      style={{ flex: 2, fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.canvas, backgroundColor: submitting ? "#888" : T.red.text, border: "none", borderRadius: 8, padding: "10px 0", cursor: submitting ? "not-allowed" : "pointer" }}
                    >
                      {submitting ? (signStep || (isVi ? "Đang gửi..." : "Submitting...")) : (isShipped ? (isVi ? "Gửi khiếu nại" : "Submit dispute") : (isVi ? "Xác nhận hủy đơn" : "Confirm cancellation"))}
                    </button>
                  </div>
                </div>
              )}

              {!canDispute && !openDispute && order.status !== "in_escrow" && (
                <p style={{ fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted }}>
                  {isShipped
                    ? (isVi ? "Chỉ mở được khiếu nại khi đơn đang trong escrow." : "Disputes can only be opened while the order is in escrow.")
                    : (isVi ? "Chỉ hủy được đơn khi đang trong escrow." : "Orders can only be cancelled while in escrow.")}
                </p>
              )}
            </div>
          )}

          {!isOwner && isConnected && (
            <p style={{ fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, textAlign: "center", marginTop: 12 }}>
              {isVi ? "Kết nối đúng ví đã mua đơn này để mở khiếu nại." : "Connect the wallet that purchased this order to open a dispute."}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
