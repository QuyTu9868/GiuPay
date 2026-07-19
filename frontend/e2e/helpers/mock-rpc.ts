import type { Page } from "@playwright/test";

/**
 * Mock JSON-RPC HTTP cho publicClient (usePublicClient/useReadContract) — KHÁC với
 * mock-wallet.ts (đó là window.ethereum, ví ký lệnh). Các cuộc gọi này đi thẳng qua
 * HTTP tới RPC node thật (vd waitForTransactionReceipt sau khi ký, hoặc useReadContract
 * đọc SBT balance) — page.route chặn được vì đây là network request thật của trình duyệt.
 *
 * Mặc định: mọi giao dịch coi như đã mined thành công ngay (status 0x1).
 */

// App đã đổi RPC Arc sang Alchemy (arc-testnet.g.alchemy.com); giữ host public cũ để
// tương thích ngược — lần sau đổi nhà cung cấp chỉ cần thêm host vào mảng này.
const ARC_RPC_HOSTS = ["arc-testnet.g.alchemy.com", "rpc.testnet.arc.network"];
const SEPOLIA_RPC_HOST = "11155111.rpc.thirdweb.com";
const BASE_SEPOLIA_RPC_HOST = "sepolia.base.org";

const isArcHost = (host: string) => ARC_RPC_HOSTS.some((h) => host.includes(h));

export interface MockRpcOptions {
  /** balanceOf() trả về cho mọi eth_call SBT — mặc định 0 (không có SBT nào) */
  sbtBalance?: number;
}

function hostToChainHex(host: string): string {
  if (isArcHost(host)) return "0x" + (5042002).toString(16);
  if (host.includes(SEPOLIA_RPC_HOST)) return "0x" + (11155111).toString(16);
  if (host.includes(BASE_SEPOLIA_RPC_HOST)) return "0x" + (84532).toString(16);
  return "0x1";
}

function rpcResult(id: number, result: any) {
  return { jsonrpc: "2.0", id, result };
}

export async function installMockRpc(page: Page, opts: MockRpcOptions = {}) {
  const sbtBalanceHex = "0x" + BigInt(opts.sbtBalance ?? 0).toString(16).padStart(64, "0");

  await page.route(
    (url) =>
      isArcHost(url.hostname) ||
      url.hostname.includes(SEPOLIA_RPC_HOST) ||
      url.hostname.includes(BASE_SEPOLIA_RPC_HOST),
    async (route) => {
      const req = route.request();
      let body: any;
      try { body = JSON.parse(req.postData() ?? "{}"); } catch { body = {}; }
      const calls = Array.isArray(body) ? body : [body];
      const chainHex = hostToChainHex(new URL(req.url()).hostname);

      const results = calls.map((call: any) => {
        const { id, method, params } = call;
        switch (method) {
          case "eth_chainId":
            return rpcResult(id, chainHex);
          case "eth_blockNumber":
            return rpcResult(id, "0x10");
          case "net_version":
            return rpcResult(id, String(parseInt(chainHex, 16)));
          case "eth_gasPrice":
          case "eth_maxPriorityFeePerGas":
            return rpcResult(id, "0x3B9ACA00");
          case "eth_estimateGas":
            return rpcResult(id, "0x186A0");
          case "eth_getTransactionCount":
            return rpcResult(id, "0x0");
          case "eth_getBlockByNumber":
            return rpcResult(id, {
              number: "0x10", hash: "0x" + "aa".repeat(32), timestamp: "0x" + Math.floor(Date.now() / 1000).toString(16),
              transactions: [],
            });
          case "eth_getTransactionReceipt": {
            const txHash = params?.[0] ?? "0x" + "33".repeat(32);
            return rpcResult(id, {
              transactionHash: txHash, status: "0x1", blockNumber: "0x10",
              blockHash: "0x" + "aa".repeat(32), from: "0x" + "11".repeat(20),
              to: "0x" + "22".repeat(20), contractAddress: null, logs: [],
              logsBloom: "0x" + "0".repeat(512), gasUsed: "0x186A0", cumulativeGasUsed: "0x186A0",
              effectiveGasPrice: "0x3B9ACA00", type: "0x2",
            });
          }
          case "eth_call":
            // Mọi eth_call (vd SBT.balanceOf) trả cùng 1 giá trị cấu hình — đủ cho test
            // đọc balance hiển thị UI, không mô phỏng logic contract thật.
            return rpcResult(id, sbtBalanceHex);
          default:
            return rpcResult(id, null);
        }
      });

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(Array.isArray(body) ? results : results[0]),
      });
    }
  );
}
