/**
 * GiuPay — On-chain helper (Task #4)
 * Backend ký giao dịch on-chain bằng ví DEPLOYER (owner của ShopRegistry).
 *
 * Vì sao cần: PaymentEscrow.pay() có require(shopRegistry.isVerified(shop)).
 * Nếu admin chỉ duyệt shop trong DB mà không verify on-chain, buyer sẽ KHÔNG
 * trả được (pay revert "Shop not verified"). File này nối 2 việc đó lại.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const ARC_RPC_URL   = process.env.ARC_RPC_URL ?? "";
const DEPLOYER_KEY  = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const SHOP_REGISTRY = process.env.SHOP_REGISTRY_ADDRESS ?? "";

// ShopRegistry: registerShop/verifyShop là onlyOwner (owner = ví deployer).
const REGISTRY_ABI = [
  "function registerShop(address wallet, bytes32 docsHash) external",
  "function verifyShop(address wallet) external",
  "function shops(address) external view returns (address wallet, bytes32 docsHash, uint8 status, uint256 registeredAt)",
  "function isVerified(address wallet) external view returns (bool)",
] as const;

/** Đã đủ cấu hình để gọi on-chain chưa (thiếu là bỏ qua, không làm crash luồng duyệt). */
export function chainConfigured(): boolean {
  return Boolean(ARC_RPC_URL && DEPLOYER_KEY && SHOP_REGISTRY);
}

function getRegistry(): ethers.Contract {
  const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
  const signer   = new ethers.Wallet(DEPLOYER_KEY, provider);
  return new ethers.Contract(SHOP_REGISTRY, REGISTRY_ABI, signer);
}

export interface VerifyShopResult {
  registeredTx?: string; // tx registerShop (chỉ có nếu shop chưa đăng ký on-chain)
  verifiedTx: string;    // tx verifyShop, hoặc "already-verified"
}

/**
 * Đăng ký (nếu chưa) rồi verify shop on-chain. Idempotent — gọi lại nhiều lần vô hại.
 * @param shopWallet   Ví shop (0x…40 hex)
 * @param docHashInput doc_hash trong DB (bytes32 hex thì dùng luôn, không thì keccak256 hoá)
 */
export async function verifyShopOnChain(
  shopWallet: string,
  docHashInput?: string | null
): Promise<VerifyShopResult> {
  if (!chainConfigured()) {
    throw new Error("Chain chưa cấu hình (thiếu ARC_RPC_URL / DEPLOYER_PRIVATE_KEY / SHOP_REGISTRY_ADDRESS)");
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(shopWallet)) {
    throw new Error("Ví shop không hợp lệ");
  }

  const registry = getRegistry();

  // Đã verified thì không làm gì thêm
  if (await registry.isVerified(shopWallet)) {
    return { verifiedTx: "already-verified" };
  }

  const result: VerifyShopResult = { verifiedTx: "" };

  // Chưa đăng ký on-chain (shops[wallet].wallet == 0) thì registerShop trước
  const onchain = await registry.shops(shopWallet);
  const isRegistered = onchain?.wallet && onchain.wallet !== ethers.ZeroAddress;
  if (!isRegistered) {
    const docsHash = docHashInput && /^0x[a-fA-F0-9]{64}$/.test(docHashInput)
      ? docHashInput
      : ethers.id(docHashInput ?? shopWallet); // keccak256(utf8) → bytes32
    const rtx = await registry.registerShop(shopWallet, docsHash);
    await rtx.wait();
    result.registeredTx = rtx.hash;
  }

  const vtx = await registry.verifyShop(shopWallet);
  await vtx.wait();
  result.verifiedTx = vtx.hash;
  return result;
}
