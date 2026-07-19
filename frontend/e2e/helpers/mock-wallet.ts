import type { Page } from "@playwright/test";

/**
 * Ví giả lập EIP-1193 (+ EIP-6963 announce) — RainbowKit/wagmi nhận diện y hệt
 * MetaMask thật đã cài trình duyệt (isMetaMask=true, rdns="io.metamask").
 *
 * Trạng thái "đã cấp quyền" (connected/account/chainId) lưu ở localStorage —
 * mô phỏng đúng hành vi ví thật: quyền truy cập gắn với EXTENSION (tồn tại qua
 * mọi lần load trang), không phải gắn với 1 lần chạy JS trong page.
 *
 * Dùng installMockWallet() TRƯỚC page.goto() đầu tiên (addInitScript áp dụng
 * cho mọi navigation tiếp theo trong cùng browser context).
 */

export interface MockWalletOptions {
  /** Địa chỉ ví (0x...) */
  address: string;
  /** Chain id dạng số thập phân — mặc định Arc Testnet 5042002 */
  chainId?: number;
  /** true = coi như đã cấp quyền sẵn (bỏ qua bước bấm Connect trong modal) */
  connected?: boolean;
}

const STORAGE_KEY = "__ap_mock_wallet_state";

export async function installMockWallet(page: Page, opts: MockWalletOptions) {
  const chainId = opts.chainId ?? 5042002;
  const address = opts.address.toLowerCase();
  const connected = opts.connected ?? false;

  await page.addInitScript(
    ({ address, chainId, connected, storageKey }) => {
      const chainHex = "0x" + chainId.toString(16);

      function readState(): { account: string; chainHex: string; connected: boolean } {
        try {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) return JSON.parse(raw);
        } catch {}
        return { account: address, chainHex, connected };
      }
      function writeState(s: { account: string; chainHex: string; connected: boolean }) {
        try { window.localStorage.setItem(storageKey, JSON.stringify(s)); } catch {}
      }

      const initial = readState();

      class MockEthereumProvider {
        // isRainbow=true — RainbowKit's rainbowWallet connector check qua
        // hasInjectedProvider({flag:"isRainbow"}) (đọc window.ethereum.isRainbow trực tiếp,
        // KHÔNG qua EIP-6963/rdns — xem node_modules/@rainbow-me/rainbowkit chunk-O2RJXDTM.js).
        // Nếu flag này không có, rainbowWallet tự chuyển hẳn sang WalletConnect (QR), không
        // đụng gì tới injected provider nữa. Dùng "isRainbow" (không phải isMetaMask) vì
        // rainbowWallet's createConnector chỉ là wagmi injected() thuần (getInjectedConnector),
        // KHÔNG phải MetaMask SDK riêng (SDK đó chờ "Confirm connection in the extension" qua
        // deep-link/handshake mà mock không mô phỏng nổi, treo mãi).
        isRainbow = true;
        _account = initial.account;
        _chainHex = initial.chainHex;
        _connected = initial.connected;
        _listeners: Record<string, ((...a: any[]) => void)[]> = {};
        // Log mọi request đã gọi — test dùng để assert đúng contract/hàm đã được ký
        // (vd đảm bảo escrow.pay() / refundByShop() thực sự được gọi, không chỉ UI đổi step).
        _calls: { method: string; params?: any[] }[] = [];

        on(event: string, cb: (...a: any[]) => void) {
          (this._listeners[event] ||= []).push(cb);
        }
        removeListener(event: string, cb: (...a: any[]) => void) {
          this._listeners[event] = (this._listeners[event] || []).filter((f) => f !== cb);
        }
        _emit(event: string, ...args: any[]) {
          (this._listeners[event] || []).forEach((f) => { try { f(...args); } catch {} });
        }
        _persist() {
          writeState({ account: this._account, chainHex: this._chainHex, connected: this._connected });
        }

        async request({ method, params }: { method: string; params?: any[] }): Promise<any> {
          this._calls.push({ method, params });
          switch (method) {
            case "eth_requestAccounts":
              this._connected = true;
              this._persist();
              this._emit("accountsChanged", [this._account]);
              return [this._account];
            case "eth_accounts":
              return this._connected ? [this._account] : [];
            case "eth_chainId":
              return this._chainHex;
            case "net_version":
              return String(parseInt(this._chainHex, 16));
            case "wallet_switchEthereumChain": {
              const target = params?.[0]?.chainId as string;
              this._chainHex = target;
              this._persist();
              this._emit("chainChanged", target);
              return null;
            }
            case "wallet_addEthereumChain": {
              const target = params?.[0]?.chainId as string;
              this._chainHex = target;
              this._persist();
              this._emit("chainChanged", target);
              return null;
            }
            case "personal_sign":
            case "eth_sign":
              return "0x" + "11".repeat(65);
            case "eth_signTypedData_v4":
              return "0x" + "22".repeat(65);
            case "eth_sendTransaction":
              return "0x" + "33".repeat(32);
            case "eth_getBalance":
              return "0xDE0B6B3A7640000";
            case "wallet_requestPermissions":
              return [{ parentCapability: "eth_accounts" }];
            case "wallet_getPermissions":
              return this._connected ? [{ parentCapability: "eth_accounts" }] : [];
            case "wallet_revokePermissions":
              this._connected = false;
              this._persist();
              return null;
            // Wallet client (viem/wagmi) tự ước lượng gas/phí/nonce QUA CHÍNH provider này
            // trước khi gửi eth_sendTransaction — không đi qua RPC công khai. Không trả các
            // case này thì mọi luồng ký giao dịch (approve/pay/depositForBurn/refundByShop)
            // sẽ throw "unsupported method" trước khi kịp gửi tx.
            case "eth_estimateGas":
              return "0x186A0"; // 100_000 — đủ dư cho ERC20 approve/contract call giả lập
            case "eth_gasPrice":
            case "eth_maxPriorityFeePerGas":
            case "eth_maxFeePerGas":
              return "0x3B9ACA00"; // 1 gwei
            case "eth_getTransactionCount":
              return "0x0";
            case "eth_blockNumber":
              return "0x1";
            case "eth_call":
              // Không mô phỏng state thật — trả 32-byte zero, đủ để không throw decode lỗi
              // với hầu hết ABI đơn giản (uint/bool/address). Test nào cần giá trị đọc thật
              // (vd SBT balanceOf) nên mock qua route RPC HTTP (usePublicClient), không qua đây.
              return "0x" + "0".repeat(64);
            default:
              console.warn(`MockEthereumProvider: unhandled method ${method}`, params);
              return null;
          }
        }

        /** Test-only: đổi account đang active (mô phỏng user đổi account trong extension) */
        __setAccount(addr: string) {
          this._account = addr.toLowerCase();
          this._connected = true;
          this._persist();
          this._emit("accountsChanged", [this._account]);
        }
        __disconnect() {
          this._connected = false;
          this._persist();
          this._emit("accountsChanged", []);
        }
      }

      const provider = new MockEthereumProvider();
      (window as any).ethereum = provider;
      (window as any).__mockWallet = provider;

      // EIP-6963 discovery — wagmi/rainbowkit ưu tiên cách này hơn window.ethereum thô.
      // rdns PHẢI khớp "me.rainbow" (Rainbow Wallet) — app đã tắt multiInjectedProviderDiscovery
      // (chỉ hiện đúng danh sách ví chọn tay MetaMask/WalletConnect/Coinbase/Rainbow, ẩn OKX và
      // MỌI ví lạ khác — xem wagmi.config.ts, BUGLOG.md 2026-07-19) nên rdns tự đặt không nằm
      // trong 4 ví đó sẽ KHÔNG được RainbowKit nhận diện nữa, mock sẽ không hiện trong modal.
      const info = {
        uuid: "ap-mock-wallet-uuid",
        name: "Rainbow",
        icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=",
        rdns: "me.rainbow",
      };
      function announce() {
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: Object.freeze({ info, provider }),
          })
        );
      }
      window.addEventListener("eip6963:requestProvider", announce);
      announce();
    },
    { address, chainId, connected, storageKey: STORAGE_KEY }
  );
}

/** Đổi account đang active — bắn accountsChanged để UI cập nhật ngay (không cần reload) */
export async function setMockAccount(page: Page, address: string) {
  await page.evaluate((addr) => {
    (window as any).__mockWallet?.__setAccount(addr);
  }, address);
}

/** Danh sách toàn bộ request đã gửi qua ví giả — dùng để assert tx nào đã thực sự được ký */
export async function getMockWalletCalls(page: Page): Promise<{ method: string; params?: any[] }[]> {
  return page.evaluate(() => (window as any).__mockWallet?._calls ?? []);
}

export async function disconnectMockWallet(page: Page) {
  await page.evaluate(() => {
    (window as any).__mockWallet?.__disconnect();
  });
}

/**
 * Đổi ví "đang cắm" cho LẦN LOAD TRANG TIẾP THEO (không bắn accountsChanged ngay —
 * mô phỏng việc người dùng đóng ví A, mở ví B rồi mới chuyển trang, giống hệt cách
 * đổi ví thật giữa các trang/tab). Ghi thẳng localStorage — provider sẽ đọc lại
 * ở lần page.goto() kế tiếp trong addInitScript.
 */
export async function switchMockWalletIdentity(page: Page, address: string, chainId = 5042002) {
  await page.evaluate(
    ({ addr, chainId, storageKey }) => {
      const chainHex = "0x" + chainId.toString(16);
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ account: addr.toLowerCase(), chainHex, connected: true })
      );
    },
    { addr: address, chainId, storageKey: STORAGE_KEY }
  );
}
