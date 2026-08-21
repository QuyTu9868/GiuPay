/**
 * GiuPay — DisputeResponsePage (shop)
 * Route: /dashboard/disputes/[code] — link "Phản hồi ngay" trong DashboardPage trỏ tới đây.
 * Trước đây route này KHÔNG TỒN TẠI (link 404) — trang chưa từng được xây dù backend API
 * (POST /api/shops/me/dispute-response) đã có sẵn từ trước.
 *
 * Nếu shop đồng ý hoàn tiền: PHẢI tự ký refundByShop(orderId) thật trên chain trước khi ghi DB —
 * trước đây route backend chỉ ghi DB (status='refunded') mà không hề gọi contract (còn nguyên TODO),
 * y hệt lỗi đã sửa cho phía buyer mở khiếu nại (xem implementation-notes.md). Đơn trả qua CCTP cần
 * gọi thêm POST /:code/ensure-onchain-dispute trước (mở dispute hộ qua ví bot) vì buyer trên chain
 * của đơn CCTP là ví relayer, chưa chắc đã Disputed on-chain — refundByShop() bắt buộc status=Disputed.
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
import { NavBarMinimal } from "@/components/NavBarMinimal";
import { Warning, CheckCircle } from "@phosphor-icons/react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ARC_CHAIN_ID   = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002);
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT as `0x${string}`;
const ESCROW_REFUND_ABI = [
  { name: "refundByShop", type: "function", stateMutability: "nonpayable", inputs: [{ name: "orderId", type: "bytes32" }], outputs: [] },
] as const;

function orderIdFromCode(orderCode: string): `0x${string}` {
  return keccak256(toBytes(orderCode));
}

const GLOBAL_CSS = `@keyframes ap-spin { to { transform:rotate(360deg); } }`;

interface OrderDetail {
  order_code: string; product_name: string; price_usdc: string; status: string;
  shop_wallet?: string; buyer_wallet?: string; chain_paid_from?: string; created_at: string;
}
interface DisputeRow {
  id: string; reason: string; status: string; opened_at: string; deadline_at?: string;
  image_cid?: string;
}

export default function DisputeResponsePage() {
  const router = useRouter();
  const code = typeof router.query.code === "string" ? router.query.code.toUpperCase() : "";
  const { walletAddress } = useWallet();
  const { lang } = useTheme();
  const isVi = lang === "vi";

  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync }   = useSwitchChain();
  const currentChainId         = useChainId();
  const arcPublicClient        = usePublicClient({ chainId: ARC_CHAIN_ID });

  const [order, setOrder]     = useState<OrderDetail | null>(null);
  const [dispute, setDispute] = useState<DisputeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [response, setResponse]     = useState("");
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signStep, setSignStep]     = useState("");
  const [formErr, setFormErr]       = useState("");
  const [done, setDone]             = useState<string | null>(null);

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
      const open = (dJson.data ?? []).find((d: DisputeRow) => d.status === "open");
      setDispute(open ?? null);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, [code]);

  useEffect(() => { load(); }, [load]);

  const isOwner = !!walletAddress && !!order?.shop_wallet && walletAddress === order.shop_wallet.toLowerCase();

  async function submit() {
    if (!order || !dispute || !walletAddress) return;
    if (response.trim().length < 10) {
      setFormErr(isVi ? "Nhập phản hồi ít nhất 10 ký tự" : "Response must be at least 10 characters");
      return;
    }
    setSubmitting(true); setFormErr(""); setSignStep("");
    try {
      let txHash: string | undefined;

      if (agreeRefund) {
        if (!ESCROW_ADDRESS) throw new Error(isVi ? "Thiếu cấu hình địa chỉ escrow contract" : "Missing escrow contract address config");
        if (!arcPublicClient) throw new Error(isVi ? "Không kết nối được RPC Arc" : "Could not connect to Arc RPC");

        // Đơn CCTP: buyer trên chain là ví relayer, có thể chưa Disputed on-chain — mở hộ trước
        // (idempotent, không làm gì nếu đã Disputed rồi, vd đơn trả trực tiếp Arc buyer đã tự mở).
        setSignStep(isVi ? "Đang đảm bảo tranh chấp đã mở trên chain..." : "Ensuring dispute is open on-chain...");
        await fetch(`${API}/api/orders/${order.order_code}/ensure-onchain-dispute`, {
          method: "POST", headers: { "X-Wallet-Address": walletAddress },
        });

        const orderId = orderIdFromCode(order.order_code);
        // LUÔN chuyển mạng trước khi ký (không check currentChainId nữa) — ví có thể báo
        // "chain mismatch" dù user đã tự đổi mạng thủ công, vì state React không phải lúc
        // nào cũng đồng bộ ngay với chain thật của ví. Xem lib/ensure-chain-write.ts.
        setSignStep(isVi ? "Đang chuyển ví sang mạng Arc..." : "Switching wallet to Arc network...");
        const hash = await ensureChainWrite(
          ARC_CHAIN_ID,
          switchChainAsync,
          () => {
            setSignStep(isVi ? "Vui lòng ký xác nhận hoàn tiền trong ví..." : "Please confirm the refund in your wallet...");
            return writeContractAsync({
              address: ESCROW_ADDRESS, abi: ESCROW_REFUND_ABI, functionName: "refundByShop",
              args: [orderId], chainId: ARC_CHAIN_ID,
            });
          },
        );
        setSignStep(isVi ? "Đang xác nhận giao dịch on-chain..." : "Confirming on-chain transaction...");
        await arcPublicClient.waitForTransactionReceipt({ hash });
        txHash = hash;
      }

      setSignStep(isVi ? "Đang gửi phản hồi..." : "Submitting response...");
      const res = await fetch(`${API}/api/shops/me/dispute-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Wallet-Address": walletAddress },
        body: JSON.stringify({ dispute_id: dispute.id, shop_response: response.trim(), agree_refund: agreeRefund, ...(txHash ? { tx_hash: txHash } : {}) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormErr(json.error || (isVi ? "Không gửi được phản hồi" : "Could not submit response"));
        return;
      }
      setDone(json.message || (isVi ? "Đã gửi phản hồi." : "Response submitted."));
    } catch (err: any) {
      setFormErr(err?.shortMessage || err?.message || (isVi ? "Lỗi kết nối máy chủ hoặc ví" : "Server or wallet connection error"));
    } finally { setSubmitting(false); setSignStep(""); }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back="/dashboard" title={isVi ? "Tranh chấp" : "Dispute"} />
      <main style={{ minHeight: "100dvh", backgroundColor: T.canvas, paddingTop: 90, paddingBottom: 60 }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.ink, animation: "ap-spin 700ms linear infinite", margin: "0 auto" }} />
            </div>
          ) : notFound || !order ? (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <Warning size={32} color={T.inkMuted} style={{ display: "block", margin: "0 auto 12px" }} />
              <p style={{ fontFamily: T.fontSans, fontSize: 14, color: T.inkMuted }}>{isVi ? "Không tìm thấy đơn hàng này." : "Order not found."}</p>
            </div>
          ) : !isOwner ? (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <Warning size={32} color={T.inkMuted} style={{ display: "block", margin: "0 auto 12px" }} />
              <p style={{ fontFamily: T.fontSans, fontSize: 14, color: T.inkMuted }}>
                {isVi ? "Kết nối đúng ví shop sở hữu đơn này để phản hồi." : "Connect the shop wallet that owns this order to respond."}
              </p>
            </div>
          ) : !dispute ? (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <CheckCircle size={32} color={T.green.text} weight="fill" style={{ display: "block", margin: "0 auto 12px" }} />
              <p style={{ fontFamily: T.fontSans, fontSize: 14, color: T.inkMuted }}>
                {isVi ? "Đơn này không có tranh chấp nào đang mở." : "This order has no open dispute."}
              </p>
            </div>
          ) : done ? (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <CheckCircle size={36} color={T.green.text} weight="fill" style={{ display: "block", margin: "0 auto 16px" }} />
              <p style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, marginBottom: 20 }}>{done}</p>
              <a href="/dashboard" style={{ fontFamily: T.fontSans, fontSize: 13, color: T.ink, textDecoration: "underline" }}>
                {isVi ? "Về Dashboard" : "Back to Dashboard"}
              </a>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <code style={{ fontFamily: T.fontMono, fontSize: 11, color: T.inkMuted }}>{order.order_code}</code>
                <h1 style={{ fontFamily: T.fontSans, fontSize: 19, fontWeight: 700, color: T.ink, marginTop: 4 }}>{order.product_name}</h1>
                <p style={{ fontFamily: T.fontMono, fontSize: 15, fontWeight: 600, color: T.ink, marginTop: 4 }}>{formatUSDC(order.price_usdc)}</p>
              </div>

              <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontFamily: T.fontMono, fontSize: 10, textTransform: "uppercase", color: T.red.text, fontWeight: 700 }}>{isVi ? "Đang mở" : "Open"}</span>
                  <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted }}>{timeAgo(dispute.opened_at)}</span>
                </div>
                <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{dispute.reason}</p>
                {dispute.image_cid && (
                  <a href={`https://gateway.pinata.cloud/ipfs/${dispute.image_cid}`} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 10 }}>
                    <img src={`https://gateway.pinata.cloud/ipfs/${dispute.image_cid}`} alt="" style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, border: `1px solid ${T.border}`, objectFit: "cover" }} />
                  </a>
                )}
              </div>

              <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, backgroundColor: T.surface, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink }}>
                  {isVi ? "Phản hồi của bạn" : "Your response"}
                </h3>
                <textarea
                  value={response}
                  onChange={e => { setResponse(e.target.value); setFormErr(""); }}
                  placeholder={isVi ? "Giải thích tình huống, đề xuất hướng xử lý (ít nhất 10 ký tự)..." : "Explain the situation, propose a resolution (at least 10 characters)..."}
                  rows={4}
                  style={{ width: "100%", padding: "10px 12px", fontFamily: T.fontSans, fontSize: 13, color: T.ink, backgroundColor: T.canvas, border: `1px solid ${formErr ? T.red.text : T.border}`, borderRadius: 8, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, cursor: "pointer" }}>
                  <input type="checkbox" checked={agreeRefund} onChange={e => setAgreeRefund(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    {isVi
                      ? "Tôi đồng ý hoàn tiền cho người mua ngay (sẽ cần ký 1 giao dịch trong ví để hoàn tiền thật trên chain)."
                      : "I agree to refund the buyer now (you'll need to sign 1 wallet transaction to refund on-chain)."}
                  </span>
                </label>
                {formErr && <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.red.text }}>{formErr}</p>}
                <button onClick={submit} disabled={submitting}
                  style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.canvas, backgroundColor: submitting ? "#888" : (agreeRefund ? T.red.text : T.ink), border: "none", borderRadius: 8, padding: "11px 0", cursor: submitting ? "not-allowed" : "pointer" }}
                >
                  {submitting ? (signStep || (isVi ? "Đang gửi..." : "Submitting...")) : (isVi ? (agreeRefund ? "Xác nhận hoàn tiền" : "Gửi phản hồi") : (agreeRefund ? "Confirm refund" : "Submit response"))}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
