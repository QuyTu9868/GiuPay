// Fixture dAppwright: bootstrap MetaMask thật, add Arc Testnet, import ví buyer (Test_2)
// từ .env.test. Seed onboard là seed test công khai của Hardhat, chỉ để khởi tạo MetaMask
// (không phải ví thật). Key thật đọc từ env, KHÔNG hardcode.
import { test as base, expect, type BrowserContext } from "@playwright/test";
import dappwright, { type Dappwright, MetaMaskWallet } from "@tenkeylabs/dappwright";
import dotenv from "dotenv";
import path from "node:path";

// .env.local (frontend) cho RPC Arc; .env.test (gốc repo) cho private key buyer.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env.test") });

const ONBOARD_SEED = "test test test test test test test test test test test junk";
const PASSWORD = "DappwrightGiuPay#2026";
const BUYER_PK = process.env.Test_2;
const ARC_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network";

export const test = base.extend<{ context: BrowserContext; wallet: Dappwright }>({
  context: async ({}, use) => {
    const [wallet, , context] = await dappwright.bootstrap("chromium", {
      wallet: "metamask",
      version: MetaMaskWallet.recommendedVersion,
      seed: ONBOARD_SEED,
      password: PASSWORD,
      headless: false,
    });

    await wallet.addNetwork({
      networkName: "Arc Testnet",
      rpc: ARC_RPC,
      chainId: 5042002,
      symbol: "USDC",
    });

    if (BUYER_PK) {
      await wallet.importPK(BUYER_PK); // import xong MetaMask tự chuyển sang account này
    } else {
      throw new Error("Thiếu Test_2 trong .env.test - không có ví buyer để test.");
    }

    await use(context);
    await context.close();
  },
  wallet: async ({ context }, use) => {
    const metamask = await dappwright.getWallet("metamask", context);
    await use(metamask);
  },
});

export { expect };
