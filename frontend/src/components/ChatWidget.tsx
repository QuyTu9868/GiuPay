/**
 * GiuPay — ChatWidget
 * GỘP CHUNG danh sách hội thoại buyer + shop làm 1 (không tách theo prop `role` như trước) — 1 ví
 * có thể vừa sở hữu shop vừa tự đi mua hàng ở shop khác, nên danh sách hội thoại của ví đó phải
 * gộp cả 2 chiều: các shop mình từng nhắn/mua VỚI TƯ CÁCH BUYER + các khách nhắn/mua shop của
 * mình VỚI TƯ CÁCH SHOP (nếu có). Mỗi mục hội thoại tự mang theo `role` riêng ("buyer"|"shop") xác
 * định mình đóng vai gì trong ĐÚNG luồng đó — dùng field này để căn tin nhắn trái/phải và biết gửi
 * request với sender nào, thay vì dựa vào 1 prop `role` cố định cho toàn bộ widget như trước.
 * - Danh sách hội thoại: thật (đã mua/bán/nhắn tin thật) LUÔN nằm trên, demo (cả 2 phía) nối phía sau.
 * - Luồng thật: polling mỗi vài giây (không dùng WebSocket), gửi text + ảnh (qua /api/upload/image → Pinata),
 *   có trạng thái "Đang gửi..."/"Đang tải ảnh...", chèn thông báo tình trạng đơn hàng vào giữa luồng chat.
 * - Luồng demo: tin nhắn tĩnh cho vui, gõ thêm chỉ append tạm ở client, không gọi API.
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PaperPlaneRight, Image as ImageIcon, ArrowLeft, X, Storefront, UserCircle, Trash } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";
import { useTheme } from "@/lib/theme";
import { useWallet } from "@/hooks/useWallet";
import { shortenAddr, timeAgo } from "@/lib/utils";
import { DEMO_CHATS, DEMO_CUSTOMER_CHATS } from "@/lib/demo-shops/demo-chats";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const POLL_MS = 4000;

interface ConversationItem {
  key: string;
  role: "buyer" | "shop"; // mình đóng vai gì trong ĐÚNG luồng này (khác nhau giữa các mục trong cùng 1 danh sách gộp)
  isDemo: boolean;
  demoKey?: string; // định danh riêng cho lookup demo — KHÔNG dùng shopId/buyerWallet vì demo không có thật trong DB
  shopId: string;
  buyerWallet: string;
  shopWallet?: string; // địa chỉ ví shop, chỉ có khi role==="buyer" (mình chat với shop này)
  title: string;
  subtitle: string;
  lastAt?: string;
}

interface ThreadMessage {
  id: string;
  sender: "buyer" | "shop" | "system";
  content?: string | null;
  imageCid?: string | null;
  createdAt: string;
  pending?: boolean;
}

interface ChatWidgetProps {
  variant?: "popover" | "panel"; // popover = hộp nổi (NavBar), panel = lấp đầy khung cha (Dashboard)
  onClose?: () => void;
  // Mở thẳng luồng chat với 1 shop cụ thể (bỏ qua màn danh sách hội thoại) — dùng ở trang
  // order/[code] khi bấm nút "Chat với shop", tránh buyer phải tự tìm lại đúng shop trong list.
  autoOpenShopId?: string;
  // Tên shop hiển thị ở header khi mở luồng MỚI (chưa từng chat/mua hàng của shop này) — cần vì
  // lúc đó shop chưa nằm trong danh sách hội thoại nên không tự suy ra title được. Dùng ở trang
  // sản phẩm, cho phép buyer hỏi shop trước khi mua (xem ProductDetailPage.tsx).
  autoOpenShopName?: string;
}

function previewText(r: any, isVi: boolean): string {
  if (r?.last_image_cid) return isVi ? "[Hình ảnh]" : "[Image]";
  if (r?.last_content) return r.last_content;
  return isVi ? "Chưa có tin nhắn" : "No messages yet";
}

function statusNoticeText(status: string, code: string, isVi: boolean): string {
  const map: Record<string, [string, string]> = {
    pending_payment: ["Đơn {c} đang chờ thanh toán", "Order {c} is awaiting payment"],
    paid:            ["Đơn {c} đã thanh toán, chờ đóng gói", "Order {c} paid, awaiting packing"],
    in_escrow:       ["Đơn {c} đang giữ trong escrow", "Order {c} is held in escrow"],
    released:        ["Đơn {c} đã hoàn thành", "Order {c} completed"],
    refunded:        ["Đơn {c} đã được hoàn tiền", "Order {c} was refunded"],
    disputed:        ["Đơn {c} đang trong tranh chấp", "Order {c} is under dispute"],
  };
  const [vi, en] = map[status] ?? ["Đơn {c} cập nhật trạng thái", "Order {c} status updated"];
  return (isVi ? vi : en).replace("{c}", code);
}

export function ChatWidget({ variant = "popover", onClose, autoOpenShopId, autoOpenShopName }: ChatWidgetProps) {
  const { lang } = useTheme();
  const isVi = lang === "vi";
  const { walletAddress } = useWallet();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [selected, setSelected] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Danh sách hội thoại (gộp chung buyer + shop) ────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingConvos(true);
    try {
      const res = await fetch(`${API}/api/messages/inbox`, { headers: { "X-Wallet-Address": walletAddress } });
      const j = await res.json();
      const real: ConversationItem[] = (j.success ? j.data.conversations : []).map((r: any) => ({
        key: `real-${r.role}-${r.role === "buyer" ? r.shop_id : r.buyer_wallet}`,
        role: r.role, isDemo: false, shopId: r.shop_id, buyerWallet: r.buyer_wallet, shopWallet: r.shop_wallet,
        title: r.role === "buyer" ? r.title : (r.title || shortenAddr(r.buyer_wallet)),
        subtitle: previewText(r, isVi), lastAt: r.last_at,
      }));
      // Demo nối phía sau, cả 2 chiều — buyer-demo (DEMO_CHATS, mình là buyer nhắn shop demo) và
      // shop-demo (DEMO_CUSTOMER_CHATS, mình là shop nhận khách demo) — chỉ hiện shop-demo nếu ví
      // này thật sự có shop (myShopId khác null), tránh hiện "khách hàng demo" cho ví không có shop.
      const demoBuyer: ConversationItem[] = DEMO_CHATS.map(d => ({
        key: `demo-buyer-${d.shopId}`, role: "buyer" as const, isDemo: true, demoKey: d.shopId,
        shopId: d.shopId, buyerWallet: walletAddress,
        title: d.shopName, subtitle: d.messages[d.messages.length - 1]
          ? (isVi ? d.messages[d.messages.length - 1].content : d.messages[d.messages.length - 1].contentEn)
          : "", lastAt: undefined,
      }));
      const myShopId = j.success ? j.data.myShopId : null;
      const demoShop: ConversationItem[] = myShopId ? DEMO_CUSTOMER_CHATS.map(d => ({
        key: `demo-shop-${d.key}`, role: "shop" as const, isDemo: true, demoKey: d.key,
        shopId: myShopId, buyerWallet: d.key,
        title: d.customerName, subtitle: d.messages[d.messages.length - 1]
          ? (isVi ? d.messages[d.messages.length - 1].content : d.messages[d.messages.length - 1].contentEn)
          : "", lastAt: undefined,
      })) : [];
      setConversations([...real, ...demoBuyer, ...demoShop]);
    } catch {} finally { setLoadingConvos(false); }
  }, [walletAddress, isVi]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Mở thẳng luồng của autoOpenShopId ngay khi list hội thoại tải xong — chỉ chạy 1 lần
  // (selected còn null) để không tự đóng lại nếu buyer bấm chọn hội thoại khác sau đó. Nếu
  // shop này CHƯA có trong danh sách (chưa từng chat/mua hàng — vd bấm từ trang sản phẩm lúc
  // chưa mua), tự tạo 1 luồng mới trống thay vì bỏ qua, để buyer nhắn tin đầu tiên được luôn.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!autoOpenShopId || autoOpenedRef.current || loadingConvos || !walletAddress) return;
    autoOpenedRef.current = true;
    const conv = conversations.find(c => c.shopId === autoOpenShopId && c.role === "buyer" && !c.isDemo);
    if (conv) { openConversation(conv); return; }
    // Shop này chưa nằm trong danh sách (chưa từng chat/mua) — luôn mở với vai buyer, vì
    // autoOpenShopId chỉ dùng ở trang order/[code] và trang sản phẩm, cả 2 đều là ngữ cảnh buyer.
    openConversation({
      key: `real-buyer-${autoOpenShopId}`, role: "buyer", isDemo: false, shopId: autoOpenShopId,
      buyerWallet: walletAddress, title: autoOpenShopName ?? "", subtitle: "",
    });
  }, [autoOpenShopId, autoOpenShopName, loadingConvos, conversations, walletAddress]);

  // ── Thông báo tình trạng đơn hàng — chèn vào luồng chat thật ────────────────
  async function fetchOrderNotices(shopId: string, buyerWallet: string, convRole: "buyer" | "shop"): Promise<ThreadMessage[]> {
    try {
      if (convRole === "buyer") {
        const res = await fetch(`${API}/api/orders/buyer?limit=100`, { headers: { "X-Wallet-Address": walletAddress! } });
        const j = await res.json();
        const orders = (j.success ? j.data.orders : []).filter((o: any) => o.shop_id === shopId);
        return orders.map((o: any) => ({
          id: `notice-${o.id}`, sender: "system" as const,
          content: statusNoticeText(o.status, o.order_code, isVi),
          createdAt: o.updated_at || o.created_at,
        }));
      } else {
        const res = await fetch(`${API}/api/orders?limit=100`, { headers: { "X-Wallet-Address": walletAddress! } });
        const j = await res.json();
        const orders = (j.success ? j.data.orders : []).filter((o: any) => o.buyer_wallet === buyerWallet);
        return orders.map((o: any) => ({
          id: `notice-${o.id}`, sender: "system" as const,
          content: statusNoticeText(o.status, o.order_code, isVi),
          createdAt: o.updated_at || o.created_at,
        }));
      }
    } catch { return []; }
  }

  // ── Tải 1 luồng (thật) ───────────────────────────────────────────────────────
  const loadThread = useCallback(async (conv: ConversationItem, silent = false) => {
    if (conv.isDemo) return;
    if (!silent) setLoadingThread(true);
    try {
      const [msgRes, notices] = await Promise.all([
        fetch(`${API}/api/messages/${conv.shopId}/${conv.buyerWallet}`, { headers: { "X-Wallet-Address": walletAddress! } }),
        fetchOrderNotices(conv.shopId, conv.buyerWallet, conv.role),
      ]);
      const j = await msgRes.json();
      const real: ThreadMessage[] = (j.success ? j.data : []).map((m: any) => ({
        id: m.id, sender: m.sender, content: m.content, imageCid: m.image_cid, createdAt: m.created_at,
      }));
      const merged = [...real, ...notices].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(prev => {
        // Giữ lại các message đang pending (chưa kịp có id thật) để không bị nháy mất khi poll.
        const stillPending = prev.filter(p => p.pending);
        return [...merged, ...stillPending];
      });
    } catch {} finally { if (!silent) setLoadingThread(false); }
  }, [walletAddress, isVi]);

  function openConversation(conv: ConversationItem) {
    setSelected(conv);
    setMessages([]);
    if (conv.isDemo) {
      const demoMessages = conv.role === "buyer"
        ? DEMO_CHATS.find(d => d.shopId === conv.demoKey)?.messages
        : DEMO_CUSTOMER_CHATS.find(d => d.key === conv.demoKey)?.messages;
      const now = Date.now();
      setMessages((demoMessages ?? []).map((m, i) => ({
        id: `demo-${i}`, sender: m.sender, content: isVi ? m.content : m.contentEn,
        createdAt: new Date(now - m.offsetMin * 60000).toISOString(),
      })));
    } else {
      loadThread(conv);
    }
  }

  // Polling luồng thật mỗi vài giây khi đang mở
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (selected && !selected.isDemo) {
      pollRef.current = setInterval(() => loadThread(selected, true), POLL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, loadThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Gửi text ─────────────────────────────────────────────────────────────────
  async function sendText() {
    const body = text.trim();
    if (!body || !selected) return;
    setText("");
    if (selected.isDemo) {
      setMessages(m => [...m, { id: `demo-local-${Date.now()}`, sender: "buyer", content: body, createdAt: new Date().toISOString() }]);
      return;
    }
    const tempId = `tmp-${Date.now()}`;
    setMessages(m => [...m, { id: tempId, sender: selected.role, content: body, createdAt: new Date().toISOString(), pending: true }]);
    setSending(true);
    try {
      const res = await fetch(`${API}/api/messages/${selected.shopId}/${selected.buyerWallet}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Wallet-Address": walletAddress! },
        body: JSON.stringify({ content: body }),
      });
      const j = await res.json();
      if (j.success) {
        setMessages(m => m.map(x => x.id === tempId ? { id: j.data.id, sender: j.data.sender, content: j.data.content, imageCid: j.data.image_cid, createdAt: j.data.created_at } : x));
        loadConversations();
      } else {
        setMessages(m => m.filter(x => x.id !== tempId));
      }
    } catch {
      setMessages(m => m.filter(x => x.id !== tempId));
    } finally { setSending(false); }
  }

  // ── Xóa NGUYÊN 1 cuộc trò chuyện (mọi tin nhắn giữa 2 bên) khỏi danh sách ──
  async function deleteConversation(conv: ConversationItem) {
    if (conv.isDemo) return; // shop demo không có gì để xóa thật, nút cũng không hiện với demo
    if (!confirm(isVi ? `Xóa cuộc trò chuyện với "${conv.title}"? Toàn bộ tin nhắn sẽ mất.` : `Delete conversation with "${conv.title}"? All messages will be lost.`)) return;
    const prevConvos = conversations;
    setConversations(cs => cs.filter(c => c.key !== conv.key));
    if (selected?.key === conv.key) { setSelected(null); setMessages([]); }
    try {
      const res = await fetch(`${API}/api/messages/${conv.shopId}/${conv.buyerWallet}`, {
        method: "DELETE", headers: { "X-Wallet-Address": walletAddress! },
      });
      const j = await res.json();
      if (!j.success) setConversations(prevConvos); // rollback nếu backend từ chối
    } catch {
      setConversations(prevConvos);
    }
  }

  // ── Xóa tin nhắn (chỉ tin của chính mình) ───────────────────────────────────
  async function deleteMessage(id: string) {
    if (!confirm(isVi ? "Xóa tin nhắn này?" : "Delete this message?")) return;
    const prev = messages;
    setMessages(m => m.filter(x => x.id !== id));
    try {
      const res = await fetch(`${API}/api/messages/${id}`, {
        method: "DELETE", headers: { "X-Wallet-Address": walletAddress! },
      });
      const j = await res.json();
      if (!j.success) setMessages(prev); // rollback nếu backend từ chối
    } catch {
      setMessages(prev);
    }
  }

  // ── Gửi ảnh (Pinata) ─────────────────────────────────────────────────────────
  async function sendImage(file: File) {
    if (!selected || selected.isDemo) return;
    const tempId = `tmp-img-${Date.now()}`;
    setMessages(m => [...m, { id: tempId, sender: selected.role, imageCid: null, createdAt: new Date().toISOString(), pending: true }]);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const upRes = await fetch(`${API}/api/upload/image`, { method: "POST", body: fd });
      const upJ = await upRes.json();
      if (!upJ.success) throw new Error();
      const cid = upJ.data.cid;
      const res = await fetch(`${API}/api/messages/${selected.shopId}/${selected.buyerWallet}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Wallet-Address": walletAddress! },
        body: JSON.stringify({ image_cid: cid }),
      });
      const j = await res.json();
      if (!j.success) throw new Error();
      setMessages(m => m.map(x => x.id === tempId ? { id: j.data.id, sender: j.data.sender, content: j.data.content, imageCid: j.data.image_cid, createdAt: j.data.created_at } : x));
      loadConversations();
    } catch {
      setMessages(m => m.filter(x => x.id !== tempId));
      alert(isVi ? "Gửi ảnh thất bại, thử lại nhé." : "Failed to send image, please retry.");
    } finally { setUploading(false); }
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = variant === "popover"
    ? { position: "absolute", top: "calc(100% + 6px)", right: 0, width: 340, height: 460, backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.14)", zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden" }
    : { width: "100%", height: 560, backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {selected ? (
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkMuted, padding: 4, display: "flex" }}>
            <ArrowLeft size={15} />
          </button>
        ) : (
          <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 700, color: T.ink }}>
            {isVi ? "Tin nhắn" : "Messages"}
          </span>
        )}
        {selected && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 700, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selected.title}
              {selected.isDemo && (
                <span style={{ fontFamily: T.fontMono, fontSize: 9, fontWeight: 700, color: T.inkMuted, border: `1px solid ${T.border}`, borderRadius: 4, padding: "1px 5px", marginLeft: 6, textTransform: "uppercase" }}>
                  Demo
                </span>
              )}
            </div>
            {/* Vai trò + địa chỉ ví của người đang chat cùng - role="buyer" nghĩa là MÌNH là buyer nên
                đối phương là shop (và ngược lại); hiện rõ để tránh nhầm đang nói chuyện với ai. */}
            <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.inkMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selected.role === "buyer" ? (isVi ? "Shop" : "Shop") : (isVi ? "Khách hàng" : "Buyer")}
              {" · "}
              {shortenAddr(selected.role === "buyer" ? (selected.shopWallet ?? "") : selected.buyerWallet)}
            </div>
          </div>
        )}
        {!selected && <div style={{ flex: 1 }} />}
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkMuted, padding: 4, display: "flex" }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Body */}
      {!selected ? (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvos ? (
            <div style={{ padding: 20, textAlign: "center", fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted }}>
              {isVi ? "Đang tải..." : "Loading..."}
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, lineHeight: 1.6 }}>
              {isVi ? "Chưa có cuộc trò chuyện nào." : "No conversations yet."}
            </div>
          ) : (
            conversations.map(c => (
              <div key={c.key}
                style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", borderBottom: `1px solid ${T.border}`, backgroundColor: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.surfaceAlt)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <button onClick={() => openConversation(c)}
                  style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, padding: "10px 12px", border: "none", backgroundColor: "transparent", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: T.inkMid }}>
                    {c.role === "buyer" ? <Storefront size={14} weight="fill" /> : <UserCircle size={16} weight="fill" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</span>
                      {c.isDemo && (
                        <span style={{ fontFamily: T.fontMono, fontSize: 8, fontWeight: 700, color: T.inkMuted, border: `1px solid ${T.border}`, borderRadius: 4, padding: "0 4px", textTransform: "uppercase", flexShrink: 0 }}>
                          Demo
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.subtitle}</div>
                  </div>
                  {c.lastAt && (
                    <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.inkMuted, flexShrink: 0 }}>{timeAgo(c.lastAt)}</span>
                  )}
                </button>
                {!c.isDemo && (
                  <button onClick={() => deleteConversation(c)} title={isVi ? "Xóa cuộc trò chuyện" : "Delete conversation"}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 6, marginRight: 8, border: "none", backgroundColor: "transparent", color: T.inkMuted, cursor: "pointer", flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = T.red.text)}
                    onMouseLeave={e => (e.currentTarget.style.color = T.inkMuted)}
                  >
                    <Trash size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {loadingThread && messages.length === 0 && (
              <div style={{ textAlign: "center", fontFamily: T.fontSans, fontSize: 12, color: T.inkMuted, padding: 12 }}>
                {isVi ? "Đang tải..." : "Loading..."}
              </div>
            )}
            {messages.map(m => {
              if (m.sender === "system") {
                return (
                  <div key={m.id} style={{ alignSelf: "center", fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted, backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, padding: "4px 12px", margin: "4px 0", textAlign: "center" }}>
                    {m.content}
                  </div>
                );
              }
              const mine = m.sender === selected.role;
              const canDelete = mine && !m.pending && !m.id.startsWith("demo-") && !selected.isDemo;
              return (
                <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%", display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                    {canDelete && (
                      <button onClick={() => deleteMessage(m.id)} title={isVi ? "Xóa tin nhắn" : "Delete message"}
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.inkMuted, padding: 3, display: "flex", flexShrink: 0, opacity: 0.6 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                      >
                        <Trash size={11} />
                      </button>
                    )}
                    <div style={{
                      backgroundColor: mine ? T.ink : T.surfaceAlt,
                      color: mine ? T.canvas : T.ink,
                      border: mine ? "none" : `1px solid ${T.border}`,
                      borderRadius: 12,
                      padding: m.imageCid !== undefined && m.imageCid !== null ? 4 : "8px 12px",
                      fontFamily: T.fontSans, fontSize: 13, lineHeight: 1.5, opacity: m.pending ? 0.6 : 1,
                    }}>
                      {m.imageCid ? (
                        <img src={`https://gateway.pinata.cloud/ipfs/${m.imageCid}`} alt="" style={{ maxWidth: 180, borderRadius: 8, display: "block" }} />
                      ) : m.pending && m.imageCid === null ? (
                        <span>{isVi ? "Đang tải ảnh..." : "Uploading image..."}</span>
                      ) : (
                        <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontFamily: T.fontMono, fontSize: 9, color: T.inkMuted, marginTop: 2 }}>
                    {m.pending ? (isVi ? "Đang gửi..." : "Sending...") : timeAgo(m.createdAt)}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }}
            />
            <button onClick={() => fileRef.current?.click()} disabled={selected.isDemo || uploading}
              title={isVi ? "Gửi ảnh" : "Send image"}
              style={{ background: "none", border: "none", cursor: selected.isDemo ? "not-allowed" : "pointer", color: T.inkMuted, padding: 4, display: "flex", opacity: selected.isDemo ? 0.4 : 1, flexShrink: 0 }}
            >
              <ImageIcon size={17} />
            </button>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
              placeholder={isVi ? "Nhập tin nhắn..." : "Type a message..."}
              style={{ flex: 1, fontFamily: T.fontSans, fontSize: 13, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, outline: "none", color: T.ink, backgroundColor: T.canvas }}
            />
            <button onClick={sendText} disabled={!text.trim() || sending}
              style={{ background: "none", border: "none", cursor: !text.trim() ? "default" : "pointer", color: !text.trim() ? T.inkMuted : T.ink, padding: 4, display: "flex", flexShrink: 0 }}
            >
              <PaperPlaneRight size={17} weight={text.trim() ? "fill" : "regular"} />
            </button>
          </div>
          {selected.isDemo && (
            <div style={{ padding: "0 10px 8px", fontFamily: T.fontSans, fontSize: 10, color: T.inkMuted, textAlign: "center" }}>
              {isVi ? "Đây là shop demo — tin nhắn chỉ minh họa, không lưu lại." : "This is a demo shop — messages are illustrative only, not saved."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
