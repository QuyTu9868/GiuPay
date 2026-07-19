/**
 * GiuPay — Profile Page
 * ✅ i18n: tất cả text dùng t.xxx từ useTheme()
 * ✅ NavBar: render dùng chung trong _app.tsx (route "/profile" nằm trong FULL_NAVBAR_ROUTES)
 */
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/lib/theme";
import { useReadContract } from "wagmi";
import { T } from "@/lib/tokens";
import { shortenAddr, formatUSDC, timeAgo } from "@/lib/utils";
import { Wallet, Package, SealCheck, ArrowRight, ArrowSquareOut, Star, CheckCircle, ClockCountdown, Warning, ShieldCheck, UserCircle } from "@phosphor-icons/react";

const API         = process.env.NEXT_PUBLIC_API_URL       ?? "http://localhost:3001";
const SBT_ADDRESS = (process.env.NEXT_PUBLIC_SBT_CONTRACT ?? "0x2460C32eDA3134bCF3e284455Ed64d8c68F831C9") as `0x${string}`;
const SBT_ABI = [{ name:"balanceOf", type:"function", stateMutability:"view", inputs:[{ name:"owner", type:"address" }], outputs:[{ name:"", type:"uint256" }] }] as const;

interface BuyerOrder {
  order_code:string; shop_name:string; shop_category:string; product_name:string;
  price_usdc:string; quantity:number; status:string; warranty_days:number;
  tx_hash?:string; sbt_token_id?:string; escrow_created_at?:string; created_at:string;
  has_review?:boolean;
}

function StatusBadge({ status, isVi }: { status:string; isVi:boolean }) {
  const vi: Record<string,{label:string;bg:string;text:string}> = { pending_payment:{label:"Chờ thanh toán",bg:T.yellow.bg,text:T.yellow.text}, paid:{label:"Đã thanh toán",bg:T.blue.bg,text:T.blue.text}, in_escrow:{label:"Đang escrow",bg:T.blue.bg,text:T.blue.text}, released:{label:"Hoàn thành",bg:T.green.bg,text:T.green.text}, refunded:{label:"Hoàn tiền",bg:T.yellow.bg,text:T.yellow.text}, disputed:{label:"Tranh chấp",bg:T.red.bg,text:T.red.text} };
  const en: Record<string,{label:string;bg:string;text:string}> = { pending_payment:{label:"Pending payment",bg:T.yellow.bg,text:T.yellow.text}, paid:{label:"Paid",bg:T.blue.bg,text:T.blue.text}, in_escrow:{label:"In escrow",bg:T.blue.bg,text:T.blue.text}, released:{label:"Completed",bg:T.green.bg,text:T.green.text}, refunded:{label:"Refunded",bg:T.yellow.bg,text:T.yellow.text}, disputed:{label:"Disputed",bg:T.red.bg,text:T.red.text} };
  const cfg = (isVi?vi:en)[status] ?? { label:status, bg:T.surfaceAlt, text:T.inkMuted };
  return <span style={{ fontFamily:T.fontMono, fontSize:10, letterSpacing:"0.05em", textTransform:"uppercase", borderRadius:9999, padding:"3px 8px", backgroundColor:cfg.bg, color:cfg.text }}>{cfg.label}</span>;
}

function StatCard({ icon, value, label }: { icon:React.ReactNode; value:string|number; label:string }) {
  return (
    <div style={{ flex:1, padding:"16px 20px", border:`1px solid ${T.border}`, borderRadius:10, backgroundColor:T.surface }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ color:T.inkMuted }}>{icon}</span>
        <span style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted }}>{label}</span>
      </div>
      <p style={{ fontFamily:T.fontMono, fontSize:22, fontWeight:700, color:T.ink }}>{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { address, walletAddress, isConnected } = useWallet();
  const { t, lang } = useTheme();
  const isVi = lang === "vi";
  const [orders,  setOrders]  = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"orders"|"sbt">("orders");

  const { data: sbtBalance } = useReadContract({
    address: SBT_ADDRESS, abi: SBT_ABI, functionName:"balanceOf",
    args:  address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (!isConnected && !loading) window.location.href = "/";
  }, [isConnected, loading]);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    fetch(`${API}/api/orders/buyer`, { headers:{ "X-Wallet-Address": walletAddress } })
      .then(r => r.json())
      .then(({ success, data }) => { if (success) setOrders(data.orders??[]); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [walletAddress]);

  const totalSpent      = orders.filter(o=>["in_escrow","released"].includes(o.status)).reduce((s,o)=>s+parseFloat(o.price_usdc)*o.quantity,0);
  const completedOrders = orders.filter(o=>o.status==="released").length;
  const inEscrow        = orders.filter(o=>o.status==="in_escrow").length;
  // Nguồn dữ liệu để HIỆN THẺ SBT — gắn với đơn hàng thật (product/shop/warranty), không
  // phải chỉ đếm balanceOf() rồi vẽ "SBT #1..#N" chung chung không rõ mua sản phẩm gì.
  const mintedSbtOrders = orders.filter((o): o is BuyerOrder & { sbt_token_id: string } => !!o.sbt_token_id);
  const sbtCount         = sbtBalance!=null ? Number(sbtBalance) : mintedSbtOrders.length;

  const GLOBAL_CSS = `
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html { scroll-behavior:smooth; }
    body { background:${T.canvas}; font-family:'Geist Sans','SF Pro Display',sans-serif; color:${T.ink}; -webkit-font-smoothing:antialiased; }
    a { color:inherit; text-decoration:none; } button { font-family:inherit; cursor:pointer; border:none; background:none; }
    @keyframes ap-spin  { to { transform:rotate(360deg); } }
    @keyframes ap-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
  `;

  if (!isConnected || !walletAddress) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <main style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", paddingTop:60 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto 16px" }} />
            <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:14, color:T.inkMuted }}>{t.checkingWallet}</p>
          </div>
        </main>
      </>
    );
  }

  const tabs = [
    { id:"orders", label: isVi?`${t.myOrders} (${orders.length})`:`${t.myOrders} (${orders.length})` },
    { id:"sbt",    label: isVi?`${t.mySBT} (${sbtCount})`:`${t.mySBT} (${sbtCount})` },
  ] as const;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <main style={{ minHeight:"100dvh", backgroundColor:T.canvas, paddingTop:58 }}>
        <div style={{ maxWidth:860, margin:"0 auto", padding:"44px 28px 80px" }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:32 }}>
            <div style={{ width:52, height:52, borderRadius:12, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <UserCircle size={28} color={T.inkMuted} weight="duotone" />
            </div>
            <div>
              <h1 style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:"clamp(18px,3vw,24px)", fontWeight:700, letterSpacing:"-0.02em", color:T.ink, marginBottom:4 }}>{t.profileTitle}</h1>
              <code style={{ fontFamily:"'Geist Mono',monospace", fontSize:12, color:T.inkMuted }}>{walletAddress}</code>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:12, marginBottom:32, flexWrap:"wrap" }}>
            <StatCard icon={<Wallet size={14} weight="duotone" />}       value={`$${totalSpent.toFixed(2)}`}       label={t.totalSpent} />
            <StatCard icon={<CheckCircle size={14} weight="duotone" />}  value={completedOrders}                    label={t.completed} />
            <StatCard icon={<ClockCountdown size={14} weight="duotone" />} value={inEscrow}                        label={t.inEscrow} />
            <StatCard icon={<SealCheck size={14} weight="duotone" />}    value={sbtCount}                           label={t.sbtCount} />
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", borderBottom:`1px solid ${T.border}`, marginBottom:24 }}>
            {tabs.map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)} style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:14, fontWeight:tab===id?600:400, color:tab===id?T.ink:T.inkMuted, padding:"10px 16px", borderBottom:tab===id?`2px solid ${T.ink}`:"2px solid transparent", transition:"color 150ms, border-color 150ms", marginBottom:-1 }}>
                {label}
              </button>
            ))}
          </div>

          {/* Orders tab */}
          {tab==="orders" && (
            loading ? (
              <div style={{ textAlign:"center", padding:40 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite", margin:"0 auto" }} />
              </div>
            ) : orders.length===0 ? (
              <div style={{ textAlign:"center", padding:"60px 24px", border:`1px dashed ${T.border}`, borderRadius:12 }}>
                <Package size={36} color={T.border} style={{ marginBottom:12 }} />
                <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:14, color:T.inkMuted, marginBottom:16 }}>{t.noOrdersYet}</p>
                <a href="/#shops" style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:"'Geist Sans',sans-serif", fontSize:13, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"9px 18px" }}>
                  {t.exploreShopsBtn} <ArrowRight size={12} />
                </a>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {orders.map(order => (
                  // Cả card bấm được -> /order/[code] (chi tiết + khiếu nại). Dùng div+onClick
                  // thay vì <a> lồng nhau vì bên trong còn nút "Tx"/"Thanh toán" là link riêng
                  // (nested <a> là HTML không hợp lệ) — các nút con tự stopPropagation.
                  <div key={order.order_code}
                    onClick={() => { window.location.href = `/order/${order.order_code}`; }}
                    style={{ border:`1px solid ${T.border}`, borderRadius:10, backgroundColor:T.surface, overflow:"hidden", transition:"box-shadow 150ms, border-color 150ms", cursor:"pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor=T.inkMid; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor=T.border; }}
                  >
                    <div style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <StatusBadge status={order.status} isVi={isVi} />
                          <code style={{ fontFamily:"'Geist Mono',monospace", fontSize:11, color:T.inkMuted }}>{order.order_code}</code>
                        </div>
                        <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:14, fontWeight:600, color:T.ink, marginBottom:2 }}>
                          {order.product_name}
                          {order.quantity>1 && <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:11, color:T.inkMuted, marginLeft:6 }}>×{order.quantity}</span>}
                        </p>
                        <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:12, color:T.inkMuted }}>{order.shop_name} · {order.shop_category}</p>
                        {order.warranty_days>0 && (
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:6 }}>
                            <ShieldCheck size={11} color={T.green.text} />
                            <span style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:11, color:T.green.text }}>
                              {isVi?`Bảo hành ${order.warranty_days} ngày`:`${order.warranty_days}-day warranty`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <p style={{ fontFamily:"'Geist Mono',monospace", fontSize:15, fontWeight:700, color:T.ink, marginBottom:4 }}>
                          {formatUSDC(order.price_usdc)}{order.quantity>1&&<span style={{ fontSize:11, color:T.inkMuted, fontWeight:400 }}> ×{order.quantity}</span>}
                        </p>
                        <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:11, color:T.inkMuted, marginBottom:8 }}>{timeAgo(order.created_at)}</p>
                        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                          {order.tx_hash && (
                            <a href={`https://testnet.arcscan.app/tx/${order.tx_hash}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:4, fontFamily:"'Geist Mono',monospace", fontSize:11, color:T.blue.text, padding:"4px 8px", borderRadius:4, backgroundColor:T.blue.bg }}>
                              Tx <ArrowSquareOut size={10} />
                            </a>
                          )}
                          {order.sbt_token_id && (
                            <span style={{ display:"flex", alignItems:"center", gap:4, fontFamily:"'Geist Mono',monospace", fontSize:11, color:T.green.text, padding:"4px 8px", borderRadius:4, backgroundColor:T.green.bg }}>
                              <SealCheck size={11} weight="fill" /> SBT #{order.sbt_token_id}
                            </span>
                          )}
                          {order.status==="pending_payment" && (
                            <a href={`/pay/${order.order_code}`} onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:4, fontFamily:"'Geist Sans',sans-serif", fontSize:12, fontWeight:500, color:T.canvas, backgroundColor:T.ink, padding:"4px 10px", borderRadius:4 }}>
                              {isVi?"Thanh toán":"Pay"} <ArrowRight size={10} />
                            </a>
                          )}
                          {["paid","in_escrow","released"].includes(order.status) && (
                            order.has_review ? (
                              <span style={{ display:"flex", alignItems:"center", gap:4, fontFamily:"'Geist Sans',sans-serif", fontSize:11, color:T.inkMuted, padding:"4px 8px", borderRadius:4, backgroundColor:T.surfaceAlt }}>
                                <Star size={10} weight="fill" color={T.yellow.text} /> {isVi?"Đã đánh giá":"Reviewed"}
                              </span>
                            ) : (
                              <a href={`/review/${order.order_code}`} onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:4, fontFamily:"'Geist Sans',sans-serif", fontSize:12, fontWeight:500, color:T.canvas, backgroundColor:T.ink, padding:"4px 10px", borderRadius:4 }}>
                                <Star size={10} weight="fill" /> {isVi?"Đánh giá":"Review"}
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* SBT tab — gắn với ĐÚNG đơn hàng đã mint (orders[].sbt_token_id, xem bot.ts
              mintWarrantySBT) thay vì chỉ đếm balanceOf() rồi vẽ thẻ giả "SBT #1..#N" không
              cho biết SBT đó là bằng chứng mua sản phẩm nào. */}
          {tab==="sbt" && (
            mintedSbtOrders.length===0 ? (
              <div style={{ textAlign:"center", padding:"60px 24px", border:`1px dashed ${T.border}`, borderRadius:12 }}>
                <SealCheck size={36} color={T.border} style={{ marginBottom:12 }} />
                <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:14, color:T.inkMuted, marginBottom:6 }}>{t.noSBTYet}</p>
                <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:13, color:T.inkMuted, lineHeight:1.6, maxWidth:420, margin:"0 auto" }}>{t.sbtExplain}</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {mintedSbtOrders.map(order => (
                  // Cả card là 1 link DUY NHẤT -> trang NFT trên block explorer. Xem chi tiết đơn
                  // hàng thì đã có sẵn tab Orders riêng, không cần trùng đường dẫn ở đây nữa.
                  <a key={order.order_code}
                    href={`https://testnet.arcscan.app/token/${SBT_ADDRESS}/instance/${order.sbt_token_id}`}
                    target="_blank" rel="noreferrer"
                    style={{ display:"block", border:`1px solid ${T.green.text}33`, borderRadius:10, backgroundColor:T.green.bg, overflow:"hidden", transition:"box-shadow 150ms, border-color 150ms", cursor:"pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; }}
                  >
                    <div style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <SealCheck size={14} color={T.green.text} weight="fill" />
                          <code style={{ fontFamily:"'Geist Mono',monospace", fontSize:11, color:T.inkMuted }}>{order.order_code}</code>
                        </div>
                        <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:14, fontWeight:600, color:T.ink, marginBottom:2 }}>{order.product_name}</p>
                        <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:12, color:T.inkMuted }}>{order.shop_name} · {order.shop_category}</p>
                        {order.warranty_days>0 && (
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:6 }}>
                            <ShieldCheck size={11} color={T.green.text} />
                            <span style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:11, color:T.green.text }}>
                              {isVi?`Bảo hành ${order.warranty_days} ngày`:`${order.warranty_days}-day warranty`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <p style={{ fontFamily:"'Geist Mono',monospace", fontSize:15, fontWeight:700, color:T.ink, marginBottom:4 }}>
                          {formatUSDC(order.price_usdc)}
                        </p>
                        <p style={{ fontFamily:"'Geist Sans',sans-serif", fontSize:11, color:T.inkMuted, marginBottom:8 }}>{timeAgo(order.created_at)}</p>
                        <span style={{ display:"flex", alignItems:"center", gap:4, fontFamily:"'Geist Mono',monospace", fontSize:11, color:T.green.text, padding:"4px 8px", borderRadius:4, backgroundColor:T.surface, justifyContent:"flex-end" }}>
                          SBT #{order.sbt_token_id} <ArrowSquareOut size={10} />
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </>
  );
}
