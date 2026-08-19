/**
 * GiuPay — PaymentPage (Step 23)
 * ✅ i18n: tất cả text dùng t.xxx từ useTheme()
 * ✅ NavBar: dùng NavBarMinimal
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useWriteContract, useSwitchChain, useChainId, usePublicClient } from "wagmi";
import { keccak256, toBytes } from "viem";
import { QRCodeSVG } from "qrcode.react";
import { BuyerShippingForm, ShippingInfo, EMPTY_SHIPPING, fullAddress } from "@/components/BuyerShippingForm";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/lib/theme";
import { ensureChainWrite } from "@/lib/ensure-chain-write";
import { NavBarMinimal } from "@/components/NavBarMinimal";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  ArrowRight, CheckCircle, Warning, ShieldCheck, Wallet,
  ClockCountdown, SealCheck, CircleNotch, LockSimple, ArrowSquareOut, Star, Info, QrCode, CaretLeft, MapPin,
} from "@phosphor-icons/react";

const T = {
  canvas:"#FBFBFA", surface:"#FFFFFF", surfaceAlt:"#F7F6F3",
  border:"#EAEAEA", ink:"#111111", inkMid:"#37352F", inkMuted:"#787774",
  green:{ bg:"#EDF3EC", text:"#346538" }, blue:{ bg:"#E1F3FE", text:"#1F6C9F" },
  yellow:{ bg:"#FBF3DB", text:"#956400" }, red:{ bg:"#FDEBEC", text:"#9F2F2D" },
  fontSans:"'Geist Sans', 'SF Pro Display', sans-serif",
  fontMono:"'Geist Mono', 'SF Mono', monospace",
};

type Chain = "arc"|"ethereum"|"op"|"arbitrum"|"base";
type PayStep = "review"|"connect"|"approve"|"bridge"|"bridging"|"confirming"|"done"|"error";

interface OrderData {
  orderCode:string; productName:string; productImageCid?:string; description?:string;
  priceUsdc:string; quantity:number; warrantyDays:number;
  shopName:string; shopAvgRating:number; shopVerified:boolean; shopReturnPolicy:string;
  shopWallet:string;
  escrowContractAddress:string;
  // Chặn thanh toán trùng: đơn đã trả (status khác pending_payment) hoặc đang bắc cầu CCTP dở dang
  // (bridgeStatus pending/minted) thì KHÔNG cho trả thêm lần nữa qua mạng khác — xem OrderPaymentPage.
  status:string; bridgeStatus?:string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const USDC_ADDRESS          = process.env.NEXT_PUBLIC_USDC_CONTRACT as `0x${string}`;
const CONTRACT_WHITELIST    = [process.env.NEXT_PUBLIC_ESCROW_CONTRACT ?? ""].filter(Boolean);
const ERC20_APPROVE_ABI  = [{ name:"approve",  type:"function", stateMutability:"nonpayable", inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}] }] as const;
// escrow.pay(orderId, txHash, shop, amount, deadline) — contract tự trừ phí 0.1% và giữ tiền 14 ngày
const ESCROW_PAY_ABI = [{ name:"pay", type:"function", stateMutability:"nonpayable", inputs:[
  {name:"orderId",type:"bytes32"}, {name:"txHash",type:"bytes32"}, {name:"shop",type:"address"},
  {name:"amount",type:"uint256"}, {name:"deadline",type:"uint256"},
], outputs:[] }] as const;

// orderId on-chain = keccak256(order_code) — PHẢI khớp y hệt bot.ts (orderIdFromCode) và indexer.
// viem keccak256(toBytes(str)) === ethers solidityPackedKeccak256(["string"],[str]).
function orderIdFromCode(orderCode:string): `0x${string}` {
  return keccak256(toBytes(orderCode));
}

// chainId + USDC (testnet) + domain CCTP cho từng chain nguồn.
// domain KHÔNG phải chainId — là số riêng của Circle cho CCTP (xem developers.circle.com/cctp).
// Arc không có "domain nguồn" ở đây vì Arc luôn là ĐÍCH đến (destinationDomain=26), không phải nơi burn.
const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002);
const CHAIN_CONFIG: Record<Chain, { chainId:number; usdc:`0x${string}`; cctpDomain?:number }> = {
  arc:      { chainId: ARC_CHAIN_ID, usdc: USDC_ADDRESS },
  ethereum: { chainId: 11155111, usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", cctpDomain: 0 }, // Ethereum Sepolia
  op:       { chainId: 11155420, usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7", cctpDomain: 2 }, // OP Sepolia
  arbitrum: { chainId: 421614,    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", cctpDomain: 3 }, // Arbitrum Sepolia
  base:     { chainId: 84532,     usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", cctpDomain: 6 }, // Base Sepolia
};

const CHAINS: { id:Chain; label:string; network:string; logo:string }[] = [
  { id:"arc",      label:"Arc Network", network:"Arc Testnet",       logo:"ARC" },
  { id:"ethereum", label:"Ethereum",    network:"Sepolia Testnet",   logo:"ETH" },
  { id:"base",     label:"Base",        network:"Base Sepolia",      logo:"BASE" },
  { id:"arbitrum", label:"Arbitrum",    network:"Arbitrum Sepolia",  logo:"ARB" },
  { id:"op",       label:"OP Mainnet",  network:"OP Sepolia",        logo:"OP" },
];

// ── CCTP V2 (Circle) — bắc cầu USDC thật từ 4 mạng trên về Arc ──────────────
// Địa chỉ TokenMessengerV2 giống nhau trên MỌI testnet EVM (Circle deploy cùng 1 địa chỉ).
const CCTP_TOKEN_MESSENGER = (process.env.NEXT_PUBLIC_CCTP_TOKEN_MESSENGER ?? "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA") as `0x${string}`;
const CCTP_ARC_DOMAIN = 26; // domain CCTP của Arc — chain ĐÍCH duy nhất trong luồng này
// Ví "bot" (backend) — nơi USDC được mint tới trên Arc, rồi bot tự approve+pay vào escrow hộ buyer.
const CCTP_RELAYER_WALLET = (process.env.NEXT_PUBLIC_CCTP_RELAYER_WALLET ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

const CCTP_TOKEN_MESSENGER_ABI = [{
  name:"depositForBurn", type:"function", stateMutability:"nonpayable",
  inputs:[
    {name:"amount",type:"uint256"}, {name:"destinationDomain",type:"uint32"},
    {name:"mintRecipient",type:"bytes32"}, {name:"burnToken",type:"address"},
    {name:"destinationCaller",type:"bytes32"}, {name:"maxFee",type:"uint256"},
    {name:"minFinalityThreshold",type:"uint32"},
  ], outputs:[{name:"nonce",type:"uint64"}],
}] as const;

// địa chỉ EVM -> bytes32 (đệm 0 phía trước) — CCTP dùng bytes32 cho mintRecipient/destinationCaller
function addressToBytes32(addr: string): `0x${string}` {
  return `0x${"0".repeat(24)}${addr.slice(2).toLowerCase()}` as `0x${string}`;
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:${T.canvas}; font-family:${T.fontSans}; color:${T.ink}; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; } button { font-family:inherit; cursor:pointer; border:none; background:none; }
  @keyframes ap-spin { to { transform:rotate(360deg); } }
  /* Trang này thường được mở qua quét QR trên điện thoại — bắt buộc phải responsive.
     Trên màn hẹp, gộp 2 cột (chi tiết đơn + panel thanh toán) thành 1 cột, bỏ sticky. */
  @media (max-width:860px) {
    .ap-pay-grid { grid-template-columns:1fr!important; gap:20px!important; }
    .ap-pay-panel { position:static!important; top:auto!important; }
  }
  @media (max-width:480px) {
    .ap-pay-grid { padding:0 14px!important; }
  }
`;

// Callback ref: gắn observer NGAY khi node xuất hiện trong DOM — kể cả khi node
// mount trễ (sau khi fetch xong). Tránh lỗi trang trắng khi content gate bởi loading.
function useReveal(threshold = 0.05) {
  const [visible, setVisible] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    obsRef.current?.disconnect();
    if (!node) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(node);
    obsRef.current = obs;
  }, [threshold]);
  return { ref, visible };
}

function revealStyle(visible: boolean, delay = 0): React.CSSProperties {
  return { opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(12px)", transition:`opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms` };
}

function Stars({ rating }: { rating:number }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(i => <Star key={i} size={11} weight={i<=Math.round(rating)?"fill":"regular"} color={i<=Math.round(rating)?T.yellow.text:T.border} />)}
    </div>
  );
}

function OrderCard({ order, isVi }: { order:OrderData; isVi:boolean }) {
  const isContractValid = CONTRACT_WHITELIST.includes(order.escrowContractAddress);
  return (
    <div style={{ border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, overflow:"hidden" }}>
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
          <div style={{ width:44, height:44, borderRadius:8, flexShrink:0, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontSans, fontSize:11, fontWeight:700, color:T.ink }}>
            {order.productName.charAt(0)}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontFamily:T.fontSans, fontSize:14, fontWeight:600, color:T.ink, marginBottom:4 }}>{order.productName}</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontFamily:T.fontMono, fontSize:9, letterSpacing:"0.05em", textTransform:"uppercase", borderRadius:9999, padding:"2px 8px", backgroundColor:T.surfaceAlt, color:T.inkMuted }}>
                {isVi?"SL":"Qty"}: {order.quantity}
              </span>
              {order.warrantyDays > 0 && (
                <span style={{ fontFamily:T.fontMono, fontSize:9, letterSpacing:"0.05em", textTransform:"uppercase", borderRadius:9999, padding:"2px 8px", backgroundColor:T.blue.bg, color:T.blue.text }}>
                  {order.warrantyDays}d {isVi?"bảo hành + SBT":"warranty + SBT"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:8, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, marginBottom:14 }}>
          <div style={{ width:30, height:30, borderRadius:6, flexShrink:0, border:`1px solid ${T.border}`, backgroundColor:T.surface, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontSans, fontSize:10, fontWeight:700, color:T.ink }}>
            {order.shopName.split(" ").slice(0,2).map(w=>w[0]).join("")}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink }}>{order.shopName}</span>
              {order.shopVerified && <SealCheck size={13} color={T.green.text} weight="fill" />}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
              <Stars rating={order.shopAvgRating} />
              <span style={{ fontFamily:T.fontMono, fontSize:10, color:T.inkMuted }}>{order.shopAvgRating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div style={{ padding:"10px 12px", borderRadius:8, border:`1px solid ${isContractValid?T.green.bg:T.red.bg}`, backgroundColor:isContractValid?T.green.bg:T.red.bg }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            {isContractValid ? <ShieldCheck size={12} color={T.green.text} weight="fill" /> : <Warning size={12} color={T.red.text} weight="fill" />}
            <span style={{ fontFamily:T.fontMono, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", color:isContractValid?T.green.text:T.red.text }}>
              {isContractValid ? (isVi?"Contract đã xác minh":"Contract verified") : (isVi?"Contract chưa xác minh — không thanh toán":"Contract not verified — do not pay")}
            </span>
          </div>
          <span style={{ fontFamily:T.fontMono, fontSize:10, color:isContractValid?T.green.text:T.red.text, wordBreak:"break-all" }}>{order.escrowContractAddress}</span>
        </div>
      </div>

      <div style={{ borderTop:`1px solid ${T.border}` }}>
        {[
          { label: isVi?"Tổng đơn hàng":"Order total",       value:`$${(parseFloat(order.priceUsdc)*order.quantity).toFixed(2)} USDC` },
          { label: isVi?"Phí nền tảng (0.1%)":"Platform fee (0.1%)", value:`-$${(parseFloat(order.priceUsdc)*order.quantity*0.001).toFixed(3)} USDC` },
          { label: isVi?"Shop nhận được":"Shop receives",    value:`$${(parseFloat(order.priceUsdc)*order.quantity*0.999).toFixed(3)} USDC`, muted:true },
        ].map(({ label, value, muted }, i, arr) => (
          <div key={label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px", borderBottom: i<arr.length-1?`1px solid ${T.border}`:"none" }}>
            <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted }}>{label}</span>
            <span style={{ fontFamily:T.fontMono, fontSize:12, color:muted?T.inkMuted:T.ink, fontWeight:i===0?700:400 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Popup đánh giá — bật ngay sau khi thanh toán xong, để buyer đánh giá liền cho mượt, không phải
// vào Profile mới đánh giá. Gọi POST /:code/review (backend đã cho đánh giá từ lúc in_escrow).
function ReviewPopup({ orderCode, shopName, isVi, onClose, onReviewed }: { orderCode:string; shopName:string; isVi:boolean; onClose:()=>void; onReviewed:()=>void }) {
  const { walletAddress } = useWallet();
  const [rating, setRating]       = useState(0);
  const [hover, setHover]         = useState(0);
  const [comment, setComment]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState<string|null>(null);

  async function submit() {
    if (rating < 1) { setError(isVi?"Vui lòng chọn số sao":"Please pick a rating"); return; }
    if (!walletAddress) { setError(isVi?"Chưa kết nối ví":"Wallet not connected"); return; }
    setSubmitting(true); setError(null);
    try {
      const r = await fetch(`${API}/api/orders/${orderCode}/review`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "X-Wallet-Address": walletAddress },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      const j = await r.json().catch(()=>({}));
      if (r.ok || r.status===409) { setDone(true); onReviewed(); return; } // 409 = đã đánh giá rồi → coi như xong
      setError(j.error ?? (isVi?"Gửi đánh giá thất bại":"Failed to submit review"));
    } catch {
      setError(isVi?"Lỗi kết nối, thử lại":"Connection error, try again");
    } finally { setSubmitting(false); }
  }

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:250, backgroundColor:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div onClick={e=>e.stopPropagation()} style={{ backgroundColor:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"36px 32px", maxWidth:520, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.14)" }}>
        {done ? (
          <div style={{ textAlign:"center", padding:"8px 0" }}>
            <div style={{ width:52, height:52, borderRadius:14, backgroundColor:T.green.bg, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
              <CheckCircle size={26} color={T.green.text} weight="fill" />
            </div>
            <h3 style={{ fontFamily:T.fontSans, fontSize:17, fontWeight:700, color:T.ink, marginBottom:6 }}>{isVi?"Cảm ơn đánh giá!":"Thanks for your review!"}</h3>
            <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, marginBottom:18, lineHeight:1.6 }}>{isVi?"Đánh giá của bạn giúp shop uy tín hơn.":"Your review helps the shop build trust."}</p>
            <button onClick={onClose} style={{ fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"10px 24px", border:"none", cursor:"pointer" }}>{isVi?"Đóng":"Close"}</button>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily:T.fontSans, fontSize:17, fontWeight:700, color:T.ink, marginBottom:4 }}>{isVi?"Đánh giá đơn hàng":"Rate your order"}</h3>
            <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, marginBottom:18 }}>{isVi?`Bạn thấy ${shopName} thế nào?`:`How was ${shopName}?`}</p>
            <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:18 }}>
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={()=>setRating(i)} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(0)}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:2 }}>
                  <Star size={32} weight={(hover||rating)>=i?"fill":"regular"} color={(hover||rating)>=i?T.yellow.text:T.border} />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={1000} rows={3}
              placeholder={isVi?"Nhận xét thêm (không bắt buộc)...":"Add a comment (optional)..."}
              style={{ width:"100%", fontFamily:T.fontSans, fontSize:13, color:T.ink, backgroundColor:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 12px", outline:"none", resize:"vertical", lineHeight:1.6, marginBottom:14 }} />
            {error && <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.red.text, marginBottom:12 }}>{error}</p>}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={onClose} disabled={submitting} style={{ flex:"0 0 auto", fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.inkMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:"11px 18px", backgroundColor:T.surface, cursor:submitting?"not-allowed":"pointer" }}>{isVi?"Để sau":"Later"}</button>
              <button onClick={submit} disabled={submitting} style={{ flex:1, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor: submitting?T.border:T.ink, borderRadius:6, padding:"11px 0", border:"none", cursor: submitting?"not-allowed":"pointer" }}>
                {submitting ? (isVi?"Đang gửi...":"Sending...") : (isVi?"Gửi đánh giá":"Submit review")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentPanel({ order }: { order:OrderData }) {
  const { ref, visible } = useReveal(0.05);
  const { t, lang } = useTheme();
  const isVi = lang === "vi";
  const [step, setStep]         = useState<PayStep>("review");
  const [chain, setChain]       = useState<Chain|null>(null);
  const [txHash, setTxHash]     = useState<string|null>(null);
  const [error, setError]       = useState<string|null>(null);
  const [isSending, setIsSending] = useState(false);
  const [pendingPay, setPendingPay] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [shipping, setShipping] = useState<ShippingInfo>(EMPTY_SHIPPING);
  const [shipValid, setShipValid] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const reviewShownRef = useRef(false);
  const [sbtToastOpen, setSbtToastOpen] = useState(false);

  // Thanh toán xong (step "done") → tự bật popup đánh giá 1 lần, buyer đánh giá liền cho mượt.
  // Toast báo SBT KHÔNG bật cùng lúc ở đây nữa — dời sang sau khi buyer đã đánh giá xong
  // (xem onReviewed ở ReviewPopup) để tránh 2 popup chồng nhau ngay lúc vừa thanh toán.
  useEffect(() => {
    if (step === "done" && !reviewShownRef.current) {
      reviewShownRef.current = true;
      setReviewOpen(true);
    }
  }, [step]);

  // Bật toast báo SBT đã mint SAU khi buyer đã đánh giá xong — tự tắt sau 30s hoặc tắt sớm
  // nếu buyer bấm đóng/bấm vào link Profile.
  function handleReviewed() {
    setSbtToastOpen(true);
    setTimeout(() => setSbtToastOpen(false), 30000);
  }

  // Lưu địa chỉ giao hàng buyer lên đơn (dùng cho cả luồng dApp lẫn QR)
  async function saveShipping() {
    if (!shipValid) return;
    try {
      await fetch(`${API}/api/orders/${order.orderCode}/shipping`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: shipping.name.trim(),
          buyer_phone: shipping.phone.trim(),
          ship_address: fullAddress(shipping),
          ghn_province_id: shipping.provinceId ? Number(shipping.provinceId) : null,
          ghn_province_name: shipping.provinceName || null,
          ghn_district_id: shipping.districtId ? Number(shipping.districtId) : null,
          ghn_district_name: shipping.districtName || null,
          ghn_ward_code: shipping.wardCode || null,
          ghn_ward_name: shipping.wardName || null,
        }),
      });
    } catch { /* không chặn thanh toán nếu lưu địa chỉ lỗi */ }
  }
  const { address, walletAddress, isConnected } = useWallet();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();
  const arcPublicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const isContractValid = CONTRACT_WHITELIST.includes(order.escrowContractAddress);

  // Sau khi kết nối ví xong (extension hoặc quét QR) -> tự động sang bước trả tiền
  useEffect(() => {
    if (pendingPay && isConnected && walletAddress && chain) {
      setPendingPay(false);
      setStep("bridge");
    }
  }, [pendingPay, isConnected, walletAddress, chain]);

  const STEPS: { id:PayStep; label:string }[] = chain && chain!=="arc"
    ? [
        { id:"review",     label:isVi?"Xem đơn":"Review" },
        { id:"connect",    label:isVi?"Kết nối ví":"Connect" },
        { id:"bridge",     label:isVi?"Gửi USDC":"Send" },
        { id:"bridging",   label:isVi?"Bắc cầu":"Bridge" },
        { id:"done",       label:isVi?"Hoàn thành":"Done" },
      ]
    : [
        { id:"review",     label:isVi?"Xem đơn":"Review" },
        { id:"connect",    label:isVi?"Kết nối ví":"Connect" },
        { id:"approve",    label:isVi?"Xác nhận":"Approve" },
        { id:"bridge",     label:isVi?"Gửi USDC":"Send" },
        { id:"confirming", label:isVi?"Xác nhận":"Confirm" },
        { id:"done",       label:isVi?"Hoàn thành":"Done" },
      ];

  async function handlePayment() {
    if (!address)  { setError(isVi?"Chưa kết nối ví":"Wallet not connected"); setStep("error"); return; }
    if (!chain)    { setError(isVi?"Chưa chọn mạng":"No network selected"); setStep("error"); return; }
    const cfg = CHAIN_CONFIG[chain];
    setIsSending(true); setStep("bridge");
    try {
      // Kiểm tra lại tình trạng đơn NGAY TRƯỚC KHI gửi tiền — chặn trường hợp buyer đã trả qua
      // 1 tab/mạng khác rồi (không reload trang này) mà vẫn bấm trả tiếp ở đây. Trang OrderPaymentPage
      // đã chặn theo status lúc load, nhưng đó là dữ liệu tại thời điểm mở trang, có thể đã cũ.
      // Lỗi mạng lúc kiểm tra thì vẫn cho thử tiếp — contract tự chặn double-pay ở bước pay() rồi
      // (require buyer == address(0)), không để 1 lần fetch lỗi tạm thời chặn nhầm buyer hợp lệ.
      const freshCheck = await fetch(`${API}/api/orders/${order.orderCode}`).then(r => r.json()).catch(() => null);
      if (freshCheck?.success) {
        const fresh = freshCheck.data;
        if (fresh.status !== "pending_payment" || fresh.bridge_status === "pending" || fresh.bridge_status === "minted") {
          throw new Error(isVi
            ? "Đơn này đã được thanh toán hoặc đang bắc cầu từ mạng khác rồi — không trả thêm lần nữa."
            : "This order has already been paid or is already bridging from another network — do not pay again.");
        }
      }

      // Lưu địa chỉ giao hàng trước khi trả (không chặn nếu lỗi)
      await saveShipping();

      const totalUsdc  = parseFloat(order.priceUsdc) * order.quantity;
      const totalMicro = BigInt(Math.round(totalUsdc * 1_000_000));
      let hash: string;

      if (chain === "arc") {
        // ── LUỒNG ESCROW THẬT (Arc) ──────────────────────────────────────────
        // Tiền KHÔNG đi thẳng cho shop mà nằm trong contract 14 ngày; contract tự
        // trừ phí 0.1% và giữ phần còn lại. Vá lỗ hổng "trả xong rời đi".
        if (!order.shopWallet || !/^0x[a-fA-F0-9]{40}$/.test(order.shopWallet)) {
          throw new Error(isVi ? "Shop chưa có ví hợp lệ để nhận escrow" : "Shop has no valid wallet for escrow");
        }
        const escrowAddr = order.escrowContractAddress as `0x${string}`;
        const orderId  = orderIdFromCode(order.orderCode);
        // txHash: nonce chống replay, duy nhất mỗi lần trả (orderId đã chặn trả trùng đơn)
        const txNonce  = keccak256(toBytes(`${order.orderCode}:${Date.now()}`));
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // hạn gửi tx: 1 giờ

        // KHÔNG tự truyền gas/maxFeePerGas/maxPriorityFeePerGas — để ví tự ước tính. Từng thử
        // tự tính bằng RPC riêng rồi truyền thẳng vào (2026-07-19) với hy vọng tránh ví hỏi RPC
        // hỏng/lệch, nhưng KHÔNG giải quyết được (OKX vẫn treo "Đang ước tính" y hệt) — nhiều ví
        // (đặc biệt OKX) tự chạy eth_estimateGas riêng và không tin số dapp truyền vào; truyền
        // thủ công có thể còn khiến ví nghi ngờ/chặn ký. Xem BUGLOG.md.
        // 1) Approve cho escrow rút đúng tổng tiền — LUÔN chuyển đúng mạng trước khi ký
        // (không check currentChainId nữa, xem lib/ensure-chain-write.ts để biết lý do)
        const approveHash = await ensureChainWrite(cfg.chainId, switchChainAsync, () =>
          writeContractAsync({
            address: cfg.usdc, abi: ERC20_APPROVE_ABI, functionName: "approve",
            args: [escrowAddr, totalMicro], chainId: cfg.chainId,
          })
        );
        // Chờ approve được xác nhận, nếu không pay sẽ revert vì allowance chưa có
        if (arcPublicClient) {
          await arcPublicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
        }

        // 2) pay() — nạp tiền vào escrow
        const payHash = await ensureChainWrite(cfg.chainId, switchChainAsync, () =>
          writeContractAsync({
            address: escrowAddr, abi: ESCROW_PAY_ABI, functionName: "pay",
            args: [orderId, txNonce, order.shopWallet as `0x${string}`, totalMicro, deadline],
            chainId: cfg.chainId,
          })
        );
        hash = payHash as string;
      } else {
        // ── CCTP THẬT (Ethereum/OP/Arbitrum/Base) ────────────────────────────
        // Burn USDC ở chain nguồn -> Circle cấp attestation -> backend (ví relayer)
        // mint về Arc rồi tự approve+pay() vào escrow thay buyer. Chi tiết & lý do
        // dùng ví relayer thay vì buyer tự gọi tiếp trên Arc: xem implementation-notes.md.
        if (cfg.cctpDomain === undefined) {
          throw new Error(isVi ? "Mạng này chưa hỗ trợ CCTP" : "This network doesn't support CCTP");
        }
        if (CCTP_RELAYER_WALLET === "0x0000000000000000000000000000000000000000") {
          throw new Error(isVi ? "Ví relayer CCTP chưa được cấu hình" : "CCTP relayer wallet not configured");
        }

        // 1) Approve TokenMessenger rút đúng tổng tiền để burn. LUÔN chuyển đúng mạng nguồn
        // trước khi ký (không check currentChainId nữa, xem lib/ensure-chain-write.ts).
        // Không cần chờ approve được mint rồi mới gửi bước 2 — cùng 1 ví, 2 tx gửi liên tiếp
        // sẽ có nonce tăng dần, mạng luôn thực thi đúng tx nonce thấp (approve) trước.
        await ensureChainWrite(cfg.chainId, switchChainAsync, () =>
          writeContractAsync({
            address: cfg.usdc, abi: ERC20_APPROVE_ABI, functionName: "approve",
            args: [CCTP_TOKEN_MESSENGER, totalMicro], chainId: cfg.chainId,
          })
        );

        // Nghỉ 1 nhịp ngắn trước khi gửi lệnh ký thứ 2 — nhiều extension ví (OKX, MetaMask...)
        // bắn 2 yêu cầu ký liên tiếp quá sát nhau sẽ khiến popup đầu chưa kịp đóng, popup thứ 2
        // không tự bật lên được (user phải tự mở lại extension mới thấy). Chờ 1 khoảng nhỏ để
        // ví có thời gian đóng popup cũ trước khi mở popup mới cho depositForBurn().
        await new Promise(resolve => setTimeout(resolve, 900));

        // 2) depositForBurn — burn trên chain nguồn, USDC sẽ mint thẳng vào ví relayer trên Arc
        const maxFee = totalMicro / 100n > 0n ? totalMicro / 100n : 1n; // phí Fast Transfer ước lượng ~1%, tối thiểu 1 unit
        const zeroBytes32 = addressToBytes32("0x0000000000000000000000000000000000000000");
        const burnHash = await ensureChainWrite(cfg.chainId, switchChainAsync, () =>
          writeContractAsync({
            address: CCTP_TOKEN_MESSENGER, abi: CCTP_TOKEN_MESSENGER_ABI, functionName: "depositForBurn",
            args: [
              totalMicro, CCTP_ARC_DOMAIN, addressToBytes32(CCTP_RELAYER_WALLET), cfg.usdc,
              zeroBytes32, // destinationCaller = 0x0 -> bất kỳ ai cũng gọi được receiveMessage() trên Arc
              maxFee, 1000, // minFinalityThreshold=1000 -> Fast Transfer (~30s thay vì 15-20 phút)
            ],
            chainId: cfg.chainId,
            // Gas cố định: một số ví tự ước tính ra con số vô lý (thấy thực tế 21_000_000) rồi bị
            // RPC node (vd Infura) chặn thẳng vì vượt trần cứng (16_777_216) — depositForBurn thật
            // tốn dưới 200k gas nên 300k đủ dư, tránh phụ thuộc ước tính sai của ví.
            gas: 300000n,
          })
        );
        hash = burnHash as string;

        setTxHash(hash); setStep("bridging");

        // 3) Báo backend bắt đầu bắc cầu — lưu đúng buyer thật + domain nguồn vào DB
        await fetch(`${API}/api/orders/${order.orderCode}/bridge-start`, {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({
            source_domain: cfg.cctpDomain, burn_tx_hash: hash,
            buyer_wallet: walletAddress ?? address, chain_paid_from: chain,
          }),
        });

        // 4) Chờ cctp-relayer.ts (chạy nền ở backend) mint + nộp escrow xong — poll trạng thái đơn
        const bridgeDeadline = Date.now() + 6 * 60 * 1000; // timeout 6 phút
        while (true) {
          if (Date.now() > bridgeDeadline) {
            throw new Error(isVi ? "Bắc cầu quá lâu, vui lòng quay lại kiểm tra đơn sau" : "Bridging took too long — please check the order again later");
          }
          await new Promise(r => setTimeout(r, 5000));
          const res = await fetch(`${API}/api/orders/${order.orderCode}`);
          const { data } = await res.json();
          if (data?.status === "in_escrow") break;
          if (data?.bridge_status === "failed") {
            throw new Error(data?.bridge_error || (isVi ? "Bắc cầu thất bại" : "Bridging failed"));
          }
        }
        setStep("done");
        return; // luồng CCTP tự quản lý step/txHash ở trên — không đi tiếp xuống đoạn chung bên dưới
      }

      setTxHash(hash); setStep("confirming");
      // Chờ pay() xác nhận (indexer sẽ tự set in_escrow; PUT dưới là fallback khi chưa có indexer)
      if (arcPublicClient) {
        await arcPublicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      }
      await fetch(`${API}/api/orders/${order.orderCode}/status`, {
        method:"PUT", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ status:"in_escrow", buyer_wallet:walletAddress??address, tx_hash:hash, chain_paid_from:chain }),
      });
      setStep("done");
    } catch (e:any) {
      setError(e.shortMessage??e.message??(isVi?"Giao dịch thất bại":"Transaction failed"));
      setStep("error");
    } finally { setIsSending(false); }
  }

  const activeIdx = STEPS.findIndex(s => s.id===step);

  return (
    <div ref={ref} style={{ ...revealStyle(visible) }}>
      {/* Step progress */}
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:32 }}>
        {STEPS.filter(s=>s.id!=="error").map(({ id, label }, i, arr) => {
          const idx = arr.findIndex(s=>s.id===id);
          const done = idx<activeIdx; const active = idx===activeIdx;
          return (
            <div key={id} style={{ display:"flex", alignItems:"center", flex: i<arr.length-1?1:"none" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", border:`1px solid ${done?T.green.text:active?T.ink:T.border}`, backgroundColor:done?T.green.bg:active?T.ink:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 300ms" }}>
                  {done ? <CheckCircle size={12} color={T.green.text} weight="fill" /> : <span style={{ fontFamily:T.fontMono, fontSize:9, fontWeight:700, color:active?T.canvas:T.inkMuted }}>{i+1}</span>}
                </div>
                <span style={{ fontFamily:T.fontSans, fontSize:10, color:active?T.ink:done?T.green.text:T.inkMuted, fontWeight:active?600:400, whiteSpace:"nowrap" }}>{label}</span>
              </div>
              {i<arr.length-1 && <div style={{ flex:1, height:1, margin:"0 6px", marginBottom:20, backgroundColor:done?T.green.text:T.border, transition:"background-color 400ms" }} />}
            </div>
          );
        })}
      </div>

      {/* Review step */}
      {step==="review" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <h3 style={{ fontFamily:T.fontSans, fontSize:15, fontWeight:600, color:T.ink }}>{t.chooseChain}</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {CHAINS.map(c => (
              <button key={c.id} onClick={() => setChain(c.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", border:`1px solid ${chain===c.id?T.ink:T.border}`, borderRadius:10, backgroundColor:chain===c.id?T.surfaceAlt:T.surface, cursor:"pointer", textAlign:"left", transition:"border-color 150ms, background-color 150ms" }}
                onMouseEnter={e => { if(chain!==c.id) e.currentTarget.style.borderColor=T.inkMid; }}
                onMouseLeave={e => { if(chain!==c.id) e.currentTarget.style.borderColor=T.border; }}
              >
                <div style={{ width:36, height:36, borderRadius:9999, flexShrink:0, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontMono, fontSize:10, fontWeight:700, color:T.inkMid }}>{c.logo}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.ink }}>{c.label}</div>
                  <div style={{ fontFamily:T.fontMono, fontSize:10, color:T.inkMuted, marginTop:2 }}>{c.network}{c.id!=="arc"?" · USDC via Circle CCTP":""}</div>
                </div>
                {chain===c.id && <CheckCircle size={16} color={T.green.text} weight="fill" />}
              </button>
            ))}
          </div>
          {/* Thông tin giao hàng — bắt buộc điền trước khi trả */}
          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16 }}>
            <h3 style={{ fontFamily:T.fontSans, fontSize:15, fontWeight:600, color:T.ink, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              <MapPin size={15} weight="fill" color={T.inkMid} /> {isVi?"Địa chỉ giao hàng":"Delivery address"}
            </h3>
            <BuyerShippingForm isVi={isVi} value={shipping} onChange={(v,ok)=>{ setShipping(v); setShipValid(ok); }} />
          </div>

          {/* Lựa chọn 1: đã kết nối → "Trả trên dApp"; chưa kết nối → "Kết nối ví để thanh toán" */}
          {isConnected ? (
            <button disabled={!chain||!isContractValid||!shipValid}
              onClick={() => { if(!chain||!isContractValid||!shipValid) return; setStep("bridge"); }}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:(chain&&isContractValid&&shipValid)?T.ink:T.border, borderRadius:6, padding:"13px 0", border:"none", cursor:(chain&&isContractValid&&shipValid)?"pointer":"not-allowed", transition:"background-color 150ms" }}
              onMouseEnter={e => { if(chain&&isContractValid&&shipValid) e.currentTarget.style.backgroundColor="#333"; }}
              onMouseLeave={e => { if(chain&&isContractValid&&shipValid) e.currentTarget.style.backgroundColor=T.ink; }}
            >
              {t.payOnDapp} <ArrowRight size={13} weight="bold" />
            </button>
          ) : (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button disabled={!chain||!isContractValid||!shipValid}
                  onClick={() => { if(!chain||!isContractValid||!shipValid) return; setPendingPay(true); openConnectModal(); }}
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:(chain&&isContractValid&&shipValid)?T.ink:T.border, borderRadius:6, padding:"13px 0", border:"none", cursor:(chain&&isContractValid&&shipValid)?"pointer":"not-allowed", transition:"background-color 150ms" }}
                  onMouseEnter={e => { if(chain&&isContractValid&&shipValid) e.currentTarget.style.backgroundColor="#333"; }}
                  onMouseLeave={e => { if(chain&&isContractValid&&shipValid) e.currentTarget.style.backgroundColor=T.ink; }}
                >
                  <Wallet size={14} weight="fill" /> {isVi?"Kết nối ví để thanh toán":"Connect wallet to pay"}
                </button>
              )}
            </ConnectButton.Custom>
          )}

          {/* Quét QR để mở trang này trên điện thoại — giống QR đơn hàng (link, không phải giao dịch)
              nên máy nào quét cũng đọc được. Trả tiền vẫn diễn ra bằng ví trên điện thoại đó. */}
          <button
            onClick={() => setShowQr(v=>!v)}
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.ink, backgroundColor:T.surface, border:`1px solid ${T.ink}`, borderRadius:6, padding:"12px 0", cursor:"pointer", transition:"border-color 150ms" }}
          >
            <QrCode size={15} weight="bold" /> {showQr ? (isVi?"Ẩn mã QR":"Hide QR") : (isVi?"Quét QR để trả bằng điện thoại":"Scan QR to pay with your phone")}
          </button>

          {showQr && (() => {
            const payPageUrl = typeof window !== "undefined" ? window.location.href : "";
            return (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"18px", border:`1px solid ${T.border}`, borderRadius:10, backgroundColor:T.surfaceAlt }}>
                <div style={{ padding:12, backgroundColor:"#fff", borderRadius:8, border:`1px solid ${T.border}` }}>
                  <QRCodeSVG value={payPageUrl} size={188} level="M" />
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:600, color:T.ink }}>
                    {isVi?"Dùng camera điện thoại quét mã này":"Scan this with your phone's camera"}
                  </div>
                  <div style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted, marginTop:4, lineHeight:1.5, maxWidth:220 }}>
                    {isVi
                      ? "Điện thoại sẽ mở đúng trang thanh toán này — bạn trả bằng ví ngay trên điện thoại, không cần cài ví trên máy đang xem."
                      : "Your phone opens this exact payment page — pay right there with your phone's wallet app, no need to install a wallet on this device."}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Connect step */}
      {step==="connect" && (
        <div style={{ textAlign:"center", padding:"32px 0" }}>
          <Wallet size={40} color={T.inkMuted} style={{ display:"block", margin:"0 auto 16px" }} />
          <h3 style={{ fontFamily:T.fontSans, fontSize:17, fontWeight:600, color:T.ink, marginBottom:8 }}>{t.connectWalletStep}</h3>
          <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, marginBottom:24 }}>{t.connectWalletSub}</p>
          <ConnectButton />
          <div style={{ marginTop:16 }}>
            <button onClick={() => { setStep("review"); setError(null); }} style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, background:"none", border:"none", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5 }}>
              <CaretLeft size={12} weight="bold" /> {isVi ? "Chọn lại mạng" : "Change network"}
            </button>
          </div>
        </div>
      )}

      {/* Approve step (CCTP chains) */}
      {step==="approve" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ padding:"20px", border:`1px solid ${T.border}`, borderRadius:10, backgroundColor:T.surfaceAlt, textAlign:"center" }}>
            <LockSimple size={28} color={T.inkMuted} style={{ marginBottom:12 }} />
            <h3 style={{ fontFamily:T.fontSans, fontSize:15, fontWeight:600, color:T.ink, marginBottom:6 }}>{t.approveUSDC}</h3>
            <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted }}>{t.approveSub}</p>
          </div>
          <button onClick={() => setStep("bridge")} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"13px 0", border:"none", cursor:"pointer" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor="#333")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor=T.ink)}
          >
            {t.approveBtn} <ArrowRight size={13} weight="bold" />
          </button>
          <button onClick={() => { setStep("review"); setError(null); }} style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, background:"none", border:"none", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5, alignSelf:"center" }}>
            <CaretLeft size={12} weight="bold" /> {isVi ? "Chọn lại mạng" : "Change network"}
          </button>
        </div>
      )}

      {/* Bridge/Send step */}
      {step==="bridge" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <button onClick={handlePayment} disabled={isSending} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:isSending?T.border:T.ink, borderRadius:6, padding:"14px 0", border:"none", cursor:isSending?"not-allowed":"pointer", transition:"background-color 150ms" }}>
            {isSending
              ? <><div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:T.canvas, animation:"ap-spin 700ms linear infinite" }} />{t.sendingUSDC}</>
              : <>{t.payNow} <ArrowRight size={13} weight="bold" /></>
            }
          </button>
          {isSending && chain !== "arc" && (
            <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, textAlign:"center", lineHeight:1.5, padding:"0 8px" }}>
              {t.walletPopupHint}
            </p>
          )}
          {!isSending && (
            <button onClick={() => { setStep("review"); setError(null); }} style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, background:"none", border:"none", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5, alignSelf:"center" }}>
              <CaretLeft size={12} weight="bold" /> {isVi ? "Chọn lại mạng" : "Change network"}
            </button>
          )}
        </div>
      )}

      {/* Confirming */}
      {step==="confirming" && (
        <div style={{ textAlign:"center", padding:"32px 0" }}>
          <div style={{ width:40, height:40, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto 16px" }} />
          <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted }}>{t.confirmingTx}</p>
          <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, lineHeight:1.6, maxWidth:280, margin:"10px auto 0" }}>{t.confirmingSafeToClose}</p>
          {txHash && <p style={{ fontFamily:T.fontMono, fontSize:10, color:T.inkMuted, marginTop:8, wordBreak:"break-all" }}>{txHash.slice(0,20)}...</p>}
        </div>
      )}

      {/* Bridging (CCTP — chờ backend mint về Arc rồi nộp escrow hộ buyer). Sau khi bridge-start
          đã POST xong (xem handlePayment), backend/cctp-relayer.ts tự xử lý tiếp không cần tab
          mở — vòng lặp poll bên dưới chỉ để cập nhật UI, không phải điều kiện để hoàn tất đơn. */}
      {step==="bridging" && (
        <div style={{ textAlign:"center", padding:"32px 0" }}>
          <div style={{ width:40, height:40, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto 16px" }} />
          <p style={{ fontFamily:T.fontSans, fontSize:14, fontWeight:600, color:T.ink, marginBottom:6 }}>
            {t.bridgingTitle}
          </p>
          <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, lineHeight:1.6, maxWidth:280, margin:"0 auto" }}>
            {t.bridgingSafeToClose}
          </p>
          {txHash && <p style={{ fontFamily:T.fontMono, fontSize:10, color:T.inkMuted, marginTop:10, wordBreak:"break-all" }}>{txHash.slice(0,20)}...</p>}
        </div>
      )}

      {/* Done */}
      {step==="done" && (
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          <div style={{ width:64, height:64, borderRadius:16, backgroundColor:T.green.bg, border:`1px solid ${T.green.text}22`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
            <CheckCircle size={32} color={T.green.text} weight="fill" />
          </div>
          <h3 style={{ fontFamily:T.fontSans, fontSize:20, fontWeight:700, color:T.ink, marginBottom:8 }}>{t.paymentDone}</h3>
          <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, lineHeight:1.65 }}>{t.paymentDoneSub}</p>
        </div>
      )}

      {/* Error */}
      {step==="error" && (
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          <Warning size={40} color={T.red.text} style={{ display:"block", margin:"0 auto 16px" }} />
          <h3 style={{ fontFamily:T.fontSans, fontSize:18, fontWeight:700, color:T.ink, marginBottom:8 }}>{t.paymentError}</h3>
          <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted, marginBottom:20 }}>{error}</p>
          <button onClick={() => { setStep("review"); setError(null); }} style={{ fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"11px 24px", border:"none", cursor:"pointer" }}>
            {t.tryAgain}
          </button>
        </div>
      )}

      {/* Popup đánh giá + toast SBT PHẢI render qua Portal thẳng vào document.body — div cha
          "ap-pay-grid" ở PaymentPage dùng revealStyle() (transform: translateY(...) cho hiệu ứng
          cuộn trang) làm ancestor, mà theo chuẩn CSS bất kỳ ancestor nào có transform khác "none"
          sẽ trở thành containing block cho mọi con position:fixed bên trong nó — khiến 2 popup
          này bị canh theo khung "ap-pay-grid" thay vì canh theo TOÀN màn hình thật. Portal ra
          ngoài body thì không còn phụ thuộc DOM cha nào nữa, canh giữa màn hình luôn đúng. */}
      {typeof document !== "undefined" && createPortal(
        <>
          {/* Popup đánh giá — tự bật khi thanh toán xong (step "done"), buyer khỏi phải vào Profile */}
          {reviewOpen && (
            <ReviewPopup orderCode={order.orderCode} shopName={order.shopName} isVi={isVi} onClose={() => setReviewOpen(false)} onReviewed={handleReviewed} />
          )}

          {/* Toast báo SBT đã được mint — chỉ bật SAU khi buyer đã đánh giá xong (handleReviewed),
              không hiện cùng lúc với popup đánh giá. Buyer không ký gì cho việc mint (chạy ngầm
              phía backend sau khi in_escrow) nên cần báo rõ, không thì không biết SBT tồn tại.
              Canh giữa NGANG màn hình, đặt gần đỉnh (top) để không đè lên ReviewPopup nếu cả 2
              vẫn còn trên màn hình cùng lúc (vd buyer đánh giá xong nhưng chưa bấm Đóng). */}
          {sbtToastOpen && (
            <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", zIndex:260, maxWidth:400, width:"calc(100% - 40px)", backgroundColor:T.surface, border:`1px solid ${T.green.text}33`, borderRadius:12, padding:"18px 20px", boxShadow:"0 8px 32px rgba(0,0,0,0.16)", display:"flex", alignItems:"flex-start", gap:12 }}>
              <SealCheck size={26} color={T.green.text} weight="fill" style={{ flexShrink:0, marginTop:1 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontFamily:T.fontSans, fontSize:16, fontWeight:600, color:T.ink, marginBottom:4 }}>{t.sbtMintedToastTitle}</p>
                <a href="/profile" onClick={() => setSbtToastOpen(false)} style={{ fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.green.text, textDecoration:"underline" }}>
                  {t.sbtMintedToastSub}
                </a>
              </div>
              <button onClick={() => setSbtToastOpen(false)} style={{ flexShrink:0, color:T.inkMuted, cursor:"pointer", padding:2, fontSize:20, lineHeight:1, background:"none", border:"none" }} aria-label="Close">
                ×
              </button>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}

export default function PaymentPage() {
  const { t, lang } = useTheme();
  const isVi = lang === "vi";
  const { ref, visible } = useReveal(0.05);
  const [order, setOrder] = useState<OrderData|null>(null);
  const [loading, setLoading] = useState(true);
  const orderCode = typeof window !== "undefined" ? window.location.pathname.split("/").pop() : "";

  useEffect(() => {
    if (!orderCode) return;
    fetch(`${API}/api/orders/${orderCode}`)
      .then(r => r.json())
      .then(({ success, data }) => {
        if (!success) return;
        setOrder({
          orderCode: data.order_code, productName: data.product_name,
          productImageCid: data.product_image_cid, description: data.description,
          priceUsdc: data.price_usdc, quantity: data.quantity, warrantyDays: data.warranty_days,
          shopName: data.shop_name, shopAvgRating: parseFloat(data.shop_avg_rating??"0"),
          shopVerified: data.shop_verified, shopReturnPolicy: data.shop_return_policy??"",
          shopWallet: data.shop_wallet??"",
          escrowContractAddress: process.env.NEXT_PUBLIC_ESCROW_CONTRACT??"",
          status: data.status, bridgeStatus: data.bridge_status,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderCode]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back="/" />
      <main style={{ minHeight:"100dvh", backgroundColor:T.canvas, paddingTop:80, paddingBottom:60 }}>
        {loading ? (
          <div style={{ textAlign:"center", paddingTop:80 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto" }} />
          </div>
        ) : !order ? (
          <div style={{ textAlign:"center", paddingTop:80 }}>
            <Warning size={40} color={T.border} style={{ marginBottom:16 }} />
            <p style={{ fontFamily:T.fontSans, fontSize:14, color:T.inkMuted }}>{t.noOrders}</p>
          </div>
        ) : order.bridgeStatus === "pending" || order.bridgeStatus === "minted" ? (
          // Đơn đang bắc cầu CCTP dở dang (burn đã xảy ra trên mạng nguồn, đang chờ mint+nộp escrow) —
          // TUYỆT ĐỐI không cho trả thêm lần nữa qua mạng khác, kể cả khi status DB vẫn "pending_payment"
          // (vì escrow.pay() thật của luồng CCTP chỉ chạy SAU khi mint xong). Trả 2 lần = tiền bị kẹt ở
          // ví relayer vì escrow.pay() thứ 2 sẽ revert "Order exists" trên contract.
          <div style={{ maxWidth:480, margin:"0 auto", textAlign:"center", paddingTop:60 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto 16px" }} />
            <h3 style={{ fontFamily:T.fontSans, fontSize:15, fontWeight:600, color:T.ink, marginBottom:6 }}>
              {isVi ? "Đơn này đang được bắc cầu từ mạng khác" : "This order is already bridging from another network"}
            </h3>
            <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, lineHeight:1.6 }}>
              {isVi
                ? "Bạn đã gửi USDC cho đơn này rồi — hệ thống đang tự động nộp vào escrow, thường mất vài phút. KHÔNG trả thêm lần nữa qua mạng khác, tiền sẽ không mất, chỉ cần đợi."
                : "You've already sent USDC for this order — it's being deposited into escrow automatically, usually within a few minutes. Do NOT pay again on a different network, your funds are safe, just wait."}
            </p>
          </div>
        ) : order.status !== "pending_payment" ? (
          <div style={{ maxWidth:480, margin:"0 auto", textAlign:"center", paddingTop:60 }}>
            <CheckCircle size={36} color={T.green.text} weight="fill" style={{ display:"block", margin:"0 auto 16px" }} />
            <h3 style={{ fontFamily:T.fontSans, fontSize:15, fontWeight:600, color:T.ink, marginBottom:6 }}>
              {isVi ? "Đơn này đã được thanh toán" : "This order has already been paid"}
            </h3>
            <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, lineHeight:1.6 }}>
              {isVi ? "Không cần và không thể trả thêm lần nữa." : "No need to — and you can't — pay for it again."}
            </p>
          </div>
        ) : (
          <div ref={ref} className="ap-pay-grid" style={{ maxWidth:960, margin:"0 auto", padding:"0 24px", display:"grid", gridTemplateColumns:"1fr 400px", gap:40, alignItems:"start", ...revealStyle(visible) }}>
            <OrderCard order={order} isVi={t.back==="Quay lại"} />
            <div className="ap-pay-panel" style={{ position:"sticky", top:88, border:`1px solid ${T.border}`, borderRadius:12, backgroundColor:T.surface, padding:24 }}>
              <PaymentPanel order={order} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
