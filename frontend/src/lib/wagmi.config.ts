/**
 * GiuPay — wagmi v2 + RainbowKit config (Step 16)
 *
 * Arc Testnet là EVM-compatible chain — define thủ công vì chưa có trong viem/chains.
 * Sau khi Arc lên mainnet thì import từ viem/chains nếu có.
 */

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, walletConnectWallet, coinbaseWallet, rainbowWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { defineChain } from "viem";

// ── Arc Testnet chain definition ─────────────────────────────────────────────
// Verify chain ID + RPC tại: https://docs.arc.network/arc/references/connect-to-arc
export const arcTestnet = defineChain({
  // Chain id đọc từ env để test local (Hardhat 31337) — mặc định Arc Testnet 5042002
  id:   Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002),
  name: "Arc Testnet",
  nativeCurrency: {
    name:     "USD Coin",
    symbol:   "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      // Fallback dùng RPC công khai chỉ khi thiếu env — RPC công khai hay bị 429 (rate-limit)
      // khi nhiều người cùng test Arc testnet, xem BUGLOG.md 2026-07-18. Ưu tiên luôn set
      // NEXT_PUBLIC_ARC_RPC_URL trỏ tới RPC riêng (vd Alchemy) trong .env.local.
      http: [process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url:  "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

// ── Source chains (TESTNET) — buyer trả từ đây, CCTP bridge sang Arc ─────────
// arbitrumSepolia + optimismSepolia PHẢI có ở đây — PaymentPage cho chọn "Arbitrum"
// và "OP Mainnet" (CHAIN_CONFIG dùng chainId 421614 / 11155420) nhưng 2 chain này từng
// thiếu trong danh sách wagmi -> switchChainAsync() throw ChainNotConfiguredError ngay,
// buyer chọn 2 mạng này thanh toán luôn fail 100% dù chưa kịp ký gì (phát hiện qua e2e test).
import { sepolia, baseSepolia, polygonAmoy, bscTestnet, arbitrumSepolia, optimismSepolia } from "viem/chains";

// ── wagmi config ──────────────────────────────────────────────────────────────
// Danh sách ví CHỌN TAY (không dùng getDefaultConfig() nữa) — OKX Wallet có bug đã xác nhận
// (2026-07-19, xem BUGLOG.md): RPC cache riêng của OKX cho mạng Arc Testnet không sửa được từ
// phía dapp (OKX không cho user tự đổi RPC của custom network đã add), khiến ký giao dịch bị
// treo/lỗi vĩnh viễn cho user nào từng thêm mạng Arc bằng OKX trước đây. Ẩn hẳn OKX khỏi danh
// sách để user mới không dính — user cũ đã dính vẫn phải tự xóa+thêm lại mạng hoặc đổi ví khác.
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet, rainbowWallet],
    },
  ],
  {
    appName:   "GiuPay",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  }
);

const chains = [arcTestnet, sepolia, baseSepolia, polygonAmoy, bscTestnet, arbitrumSepolia, optimismSepolia] as const;

export const wagmiConfig = createConfig({
  connectors,
  chains,
  transports: Object.fromEntries(chains.map(c => [c.id, http()])) as Record<(typeof chains)[number]["id"], ReturnType<typeof http>>,
  // Tắt tự phát hiện MỌI ví qua EIP-6963 (mipd) — đây là cơ chế khiến OKX tự "vẫy tay" xuất hiện
  // dù không có trong danh sách wallets ở trên. Các ví named ở trên (metaMaskWallet...) vẫn tự
  // nhận diện bình thường qua logic riêng của chúng, không phụ thuộc cờ này.
  multiInjectedProviderDiscovery: false,
  ssr: true, // Next.js App Router
});

// ── Contract addresses (từ .env.local) ───────────────────────────────────────
export const CONTRACTS = {
  escrow: process.env.NEXT_PUBLIC_ESCROW_CONTRACT ?? "",
  sbt:    process.env.NEXT_PUBLIC_SBT_CONTRACT    ?? "",
  usdc:   process.env.NEXT_PUBLIC_USDC_CONTRACT   ?? "",
} as const;

// ── Contract whitelist — verify trước khi hiển thị Pay button ────────────────
// Security checklist item: buyer phải thấy contract address hợp lệ
export const ESCROW_WHITELIST: string[] = [
  CONTRACTS.escrow,
].filter(Boolean).map(a => a.toLowerCase());

export function isWhitelistedContract(addr: string): boolean {
  return ESCROW_WHITELIST.includes(addr.toLowerCase());
}