/**
 * GiuPay — useWallet hook (Step 16)
 * Wagmi v2 wrapper — single import point cho toàn app.
 * Thay thế mọi simulateWalletConnect() trong các page.
 *
 * Usage:
 *   const { address, isConnected, chainId, connect, disconnect } = useWallet();
 */

"use client";

import { useEffect, useRef } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

// Arc Testnet chain ID — TRƯỚC ĐÂY hardcode nhầm 1515, lệch với chain ID thật đang dùng ở
// wagmi.config.ts (5042002, đọc từ NEXT_PUBLIC_ARC_CHAIN_ID) — sửa lại cho khớp, đọc cùng
// nguồn env để không bao giờ lệch nhau nữa. Hiện `isOnArc`/`switchToArc` chưa có nơi nào
// khác trong code gọi tới (kiểm tra bằng grep trước khi sửa), nên fix này không ảnh hưởng
// hành vi hiện tại của app, chỉ đúng lại giá trị để dùng sau này.
export const ARC_TESTNET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002);

export function useWallet() {
  const { address, isConnected, isConnecting, status, connector } = useAccount();
  const { connectAsync, connectors }                   = useConnect();
  const { disconnectAsync }                            = useDisconnect();
  const chainId                                        = useChainId();
  const { switchChainAsync }                           = useSwitchChain();

  // MetaMask CHỈ bắn sự kiện "accountsChanged" cho account đã từng được cấp quyền cho site
  // này trước đó — đổi sang account chưa từng "connect" thì MetaMask im lặng, wagmi không
  // biết gì để cập nhật (khác OKX, tự cập nhật ngay). Poll eth_accounts mỗi 2s làm lưới an
  // toàn — phát hiện account thật đang lộ ra khác với address wagmi đang biết thì tự gọi lại
  // connect() (idempotent — account đã cấp quyền rồi thì không hiện popup xin lại).
  const addressRef = useRef(address);
  addressRef.current = address;
  useEffect(() => {
    if (!isConnected || !connector) return;
    const interval = setInterval(async () => {
      try {
        const provider: any = await connector.getProvider();
        const accounts: string[] = await provider.request({ method: "eth_accounts" });
        const current = accounts[0]?.toLowerCase();
        if (current && current !== addressRef.current?.toLowerCase()) {
          await connectAsync({ connector });
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [isConnected, connector, connectAsync]);

  /** Connect với connector cụ thể (MetaMask, WalletConnect, Coinbase...) */
  async function connect(connectorId: string) {
    const connector = connectors.find(c => c.id === connectorId)
      ?? connectors[0]; // fallback injected
    if (!connector) throw new Error("No connector found");
    await connectAsync({ connector });
  }

  /** Disconnect ví */
  async function disconnect() {
    await disconnectAsync();
  }

  /** Switch sang Arc Testnet nếu đang ở chain khác */
  async function switchToArc() {
    if (chainId === ARC_TESTNET_CHAIN_ID) return;
    await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
  }

  /** Address string đã lowercase — dùng cho X-Wallet-Address header */
  const walletAddress = address?.toLowerCase() ?? null;

  /** True nếu đang kết nối Arc Testnet */
  const isOnArc = chainId === ARC_TESTNET_CHAIN_ID;

  return {
    address,
    walletAddress,       // lowercase, dùng cho API headers
    isConnected,
    isConnecting: isConnecting || status === "reconnecting",
    chainId,
    isOnArc,
    connectors,
    connect,
    disconnect,
    switchToArc,
  };
}