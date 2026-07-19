/**
 * GiuPay — Escrow on-chain helpers dùng cho xử lý tranh chấp (dispute)
 *
 * Vì sao cần file này: trước đây route admin resolve tranh chấp
 * (PUT /:code/dispute/:disputeId/resolve) chỉ update database rồi báo buyer
 * "sẽ hoàn tiền trong ít phút" — nhưng KHÔNG hề gọi smart contract, nên tiền
 * vẫn nằm nguyên trong PaymentEscrow mãi mãi. File này gọi contract THẬT.
 *
 * Lưu ý quan trọng về quyền hạn on-chain (không thể bỏ qua):
 * - `adminResolve(orderId, refund)` chỉ owner contract gọi được → dùng
 *   DEPLOYER_PRIVATE_KEY (ví deploy = owner, xem Ownable(msg.sender) trong constructor).
 * - `adminResolve` bắt buộc escrow đang ở trạng thái Disputed on-chain — nhưng
 *   `openDispute(orderId)` lại bắt buộc msg.sender == buyer on-chain, backend
 *   không thể tự ý mở tranh chấp hộ buyer, TRỪ trường hợp đơn trả qua CCTP
 *   (Ethereum/OP/Arbitrum/Base → Arc), vì ở luồng đó ví bot (BOT_PRIVATE_KEY)
 *   chính là buyer đứng tên trên chain (xem implementation-notes.md, mục CCTP).
 *   Với đơn buyer trả trực tiếp bằng ví riêng trên Arc, backend KHÔNG có quyền
 *   mở tranh chấp hộ — hàm ensureOnchainDisputeOpen() sẽ báo lỗi rõ ràng thay
 *   vì giả vờ thành công.
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";

const ARC_RPC_URL          = process.env.ARC_RPC_URL ?? "";
const ESCROW_ADDRESS       = process.env.ESCROW_CONTRACT_ADDRESS ?? "";
const BOT_PRIVATE_KEY      = process.env.BOT_PRIVATE_KEY ?? "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? ""; // = owner của contract

const ESCROW_ABI = [
  "function escrows(bytes32) view returns (address buyer, address shop, uint256 amount, uint256 createdAt, uint256 deadline, uint8 status, uint256 disputeCount, bool disputeClosed)",
  "function openDispute(bytes32 orderId) external",
  "function adminResolve(bytes32 orderId, bool refund) external",
] as const;

// EscrowStatus on-chain: Active=0, Released=1, Refunded=2, Disputed=3 (đúng thứ tự enum trong contract)
const STATUS_DISPUTED = 3;

function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(ARC_RPC_URL);
}

// orderId on-chain = keccak256(order_code) — PHẢI khớp bot.ts/indexer.ts/PaymentPage.tsx
export function orderIdFromCode(orderCode: string): string {
  return ethers.solidityPackedKeccak256(["string"], [orderCode]);
}

export async function getEscrowState(orderId: string) {
  const contract = new Contract(ESCROW_ADDRESS, ESCROW_ABI, getProvider());
  const e = await contract.escrows(orderId);
  return {
    buyer: String(e.buyer) as string,
    shop: String(e.shop) as string,
    status: Number(e.status),
    disputeClosed: Boolean(e.disputeClosed),
  };
}

/**
 * Đảm bảo escrow on-chain đang ở trạng thái Disputed trước khi admin resolve.
 * Nếu đã Disputed rồi thì bỏ qua (idempotent). Nếu chưa, chỉ mở được hộ khi
 * buyer on-chain của đơn này chính là ví bot (đơn CCTP) — còn lại báo lỗi rõ,
 * KHÔNG tự ý coi như thành công.
 */
export async function ensureOnchainDisputeOpen(orderId: string): Promise<void> {
  const state = await getEscrowState(orderId);
  if (state.status === STATUS_DISPUTED) return;

  if (!BOT_PRIVATE_KEY) throw new Error("Thiếu BOT_PRIVATE_KEY trong .env — không thể mở tranh chấp hộ buyer");
  const botAddress = new Wallet(BOT_PRIVATE_KEY).address;

  if (state.buyer.toLowerCase() !== botAddress.toLowerCase()) {
    throw new Error(
      "Đơn này buyer trả trực tiếp bằng ví riêng trên Arc (không qua CCTP) — chỉ buyer mới có quyền mở " +
      "tranh chấp on-chain (openDispute), frontend hiện chưa có nút này. Admin không thể tự resolve cho tới khi " +
      "buyer tự mở tranh chấp bằng ví của họ trước."
    );
  }

  const signer = new Wallet(BOT_PRIVATE_KEY, getProvider());
  const contract = new Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
  const tx = await contract.openDispute(orderId);
  await tx.wait();
}

/** Admin resolve tranh chấp on-chai — hoàn tiền buyer hoặc release cho shop, trả về tx hash thật. */
export async function adminResolveOnchain(orderId: string, refund: boolean): Promise<string> {
  if (!DEPLOYER_PRIVATE_KEY) throw new Error("Thiếu DEPLOYER_PRIVATE_KEY (owner contract) trong .env");
  const signer = new Wallet(DEPLOYER_PRIVATE_KEY, getProvider());
  const contract = new Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
  const tx = await contract.adminResolve(orderId, refund);
  const receipt = await tx.wait();
  return receipt.hash as string;
}
