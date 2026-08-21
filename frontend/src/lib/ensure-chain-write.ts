import { wagmiConfig } from "./wagmi.config";

/**
 * GiuPay — ensureChainWrite
 *
 * Bug thật gặp khi test (2026-07-13): ví (OKX) báo lỗi "chain mismatch" khi ký refundByShop,
 * NGAY CẢ SAU KHI user đã tự tay đổi mạng trong extension. Nguyên nhân: code cũ chỉ gọi
 * switchChainAsync() khi state React (useChainId()) khác chain đích — nhưng state này không
 * luôn đồng bộ ngay với chain THẬT của ví, nhất là khi user tự đổi mạng trong ví thay vì qua
 * nút bấm của DApp (một số ví như OKX không bắn sự kiện chainChanged đúng lúc).
 *
 * Sửa: LUÔN gọi switchChainAsync() trước khi ký — không cần biết ví đang thật sự ở mạng nào
 * trước đó (không check currentChainId nữa). Nếu ví đã đúng mạng rồi, hầu hết wallet resolve
 * gần như ngay lập tức, không hiện popup thêm. Nếu vẫn lệch mạng sau lần switch đầu (ví đồng bộ
 * chậm), tự thử switch + đợi rồi ký lại 1 lần nữa trước khi báo lỗi cho user.
 *
 * Bug thật gặp khi test (2026-08-21): ví CHƯA từng thêm Arc Testnet báo "An error occurred
 * when attempting to switch chain" ngay lập tức, KHÔNG mở bất kỳ popup MetaMask nào. Nguyên
 * nhân: Arc có nativeCurrency.decimals = 6 (gas là USDC) trong wagmi.config.ts, còn MetaMask
 * validate wallet_addEthereumChain (EIP-3085) và từ chối NGẦM (trước khi mở popup) nếu
 * decimals != 18 — nên fallback "tự thêm mạng" của wagmi/injected connector chết yểu ngay ở
 * bước validate. Không thể sửa decimals trong wagmi.config.ts vì NavBar dùng đúng field đó để
 * format số dư USDC hiển thị. Sửa: tự gọi wallet_addEthereumChain thẳng qua window.ethereum
 * với decimals ép về 18 (chỉ ảnh hưởng cách MetaMask hiển thị số dư native trong ví nó, không
 * đụng gì tới logic on-chain hay số USDC thật) làm fallback khi switchChainAsync lần đầu fail.
 */
async function tryManualAddChain(targetChainId: number) {
  const eth = typeof window !== "undefined" ? (window as any).ethereum : undefined;
  if (!eth) return;
  const chain = wagmiConfig.chains.find((c) => c.id === targetChainId);
  if (!chain) return;
  try {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: `0x${targetChainId.toString(16)}`,
        chainName: chain.name,
        nativeCurrency: {
          name: chain.nativeCurrency.name,
          symbol: chain.nativeCurrency.symbol,
          decimals: 18,
        },
        rpcUrls: [...chain.rpcUrls.default.http],
        blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : undefined,
      }],
    });
  } catch (err) {
    console.warn("[ensureChainWrite] wallet_addEthereumChain thất bại:", err);
  }
}

export async function ensureChainWrite<T>(
  targetChainId: number,
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>,
  write: () => Promise<T>,
): Promise<T> {
  try {
    await switchChainAsync({ chainId: targetChainId });
  } catch (err: any) {
    const msg = String(err?.shortMessage ?? err?.message ?? "");
    if (msg.toLowerCase().includes("switch chain") || msg.toLowerCase().includes("chain")) {
      await tryManualAddChain(targetChainId);
      await switchChainAsync({ chainId: targetChainId });
    } else {
      throw err;
    }
  }
  await new Promise(resolve => setTimeout(resolve, 500)); // đợi ví đồng bộ chain thật trước khi ký
  try {
    return await write();
  } catch (err: any) {
    const msg = String(err?.shortMessage ?? err?.message ?? "");
    if (msg.toLowerCase().includes("chain") || msg.includes("does not match")) {
      await switchChainAsync({ chainId: targetChainId });
      await new Promise(resolve => setTimeout(resolve, 800));
      return await write();
    }
    throw err;
  }
}
