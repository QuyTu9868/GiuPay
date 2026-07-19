/**
 * GiuPay — WarrantySBT on-chain mint helper
 *
 * Vì sao cần file này: hàm `mint()` của WarrantySBT.sol (SBT bằng chứng mua hàng + theo dõi
 * bảo hành) CHƯA TỪNG được gọi ở đâu trong toàn bộ backend trước bản sửa này — cột
 * orders.sbt_token_id chỉ từng được SET VỀ NULL lúc bot.ts burn SBT hết hạn, không bao giờ
 * được gán giá trị lúc mint. UI (profile.tsx) đã sẵn sàng hiển thị "SBT #..." nhưng không có
 * SBT nào được tạo ra để hiển thị. Xem implementation-notes.md để biết thêm chi tiết phát hiện.
 *
 * Quyền hạn on-chain: mint() là onlyOwner (Ownable(msg.sender) lúc deploy) → PHẢI dùng
 * DEPLOYER_PRIVATE_KEY, không phải BOT_PRIVATE_KEY (dù trong .env hiện tại 2 key trùng giá trị
 * — tách riêng đúng vai trò để nếu sau này đổi key thì code không sai, giống quy ước đã có ở
 * escrow-chain.ts).
 *
 * warrantyDays=0 vẫn mint bình thường — khớp thiết kế contract (warrantyExpiry=0 nghĩa là
 * SBT tồn tại vĩnh viễn, không có hạn burn), vì SBT còn có vai trò "bằng chứng mua hàng" cho
 * MỌI đơn đã released, không chỉ riêng đơn có bảo hành.
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import { pinJSONToIPFS } from "./upload";

const ARC_RPC_URL          = process.env.ARC_RPC_URL ?? "";
const SBT_ADDRESS          = process.env.SBT_CONTRACT_ADDRESS ?? "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? ""; // = owner của contract

const SBT_ABI = [
  "function orderToToken(bytes32) view returns (uint256)",
  "function mint(address buyer, bytes32 orderId, string productName, string imageCid, string metadataCid, uint256 warrantyDays) external",
] as const;

function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(ARC_RPC_URL);
}

// orderId on-chain = keccak256(order_code) — PHẢI khớp escrow-chain.ts/bot.ts/frontend
export function orderIdFromCode(orderCode: string): string {
  return ethers.solidityPackedKeccak256(["string"], [orderCode]);
}

export interface MintableOrder {
  order_code: string;
  product_name: string;
  product_image_cid?: string | null;
  warranty_days: number;
  buyer_wallet?: string | null;
}

/**
 * Mint SBT cho 1 đơn vừa released — idempotent (nếu orderToToken on-chain đã tồn tại thì trả
 * về tokenId cũ, không mint lại/không revert "Already minted"). Trả về null (không throw) nếu
 * thiếu cấu hình hoặc thiếu buyer_wallet — nơi gọi tự quyết định có log cảnh báo hay không, chỉ
 * throw thật khi mint() on-chain tự nó lỗi (để nơi gọi biết mà log rõ, KHÔNG được để lỗi ở đây
 * làm hỏng luồng release chính — luôn bọc lời gọi hàm này trong try/catch riêng).
 */
export async function mintWarrantySBT(order: MintableOrder): Promise<number | null> {
  if (!SBT_ADDRESS || !DEPLOYER_PRIVATE_KEY) {
    console.warn("[SBT] Thiếu SBT_CONTRACT_ADDRESS hoặc DEPLOYER_PRIVATE_KEY trong .env — bỏ qua mint.");
    return null;
  }
  if (!order.buyer_wallet) {
    console.warn(`[SBT] Đơn ${order.order_code} không có buyer_wallet — bỏ qua mint.`);
    return null;
  }

  const provider = getProvider();
  const orderId = orderIdFromCode(order.order_code);
  const readContract = new Contract(SBT_ADDRESS, SBT_ABI, provider);

  const existingTokenId: bigint = await readContract.orderToToken(orderId);
  if (existingTokenId > 0n) return Number(existingTokenId); // đã mint rồi (vd bot restart giữa chừng)

  const metadataCid = await pinJSONToIPFS(
    {
      name: order.product_name,
      description: `GiuPay purchase proof — order ${order.order_code}`,
      // ipfs:// không fetch được trực tiếp trong <img> trình duyệt (không phải scheme HTTP) —
      // nhiều explorer (vd Blockscout) không tự resolve, hiện icon placeholder. Dùng gateway HTTP
      // để hiện ảnh preview được ở cả explorer lẫn ví.
      image: order.product_image_cid ? `https://ipfs.io/ipfs/${order.product_image_cid}` : "",
      attributes: [
        { trait_type: "Order code", value: order.order_code },
        { trait_type: "Warranty days", value: order.warranty_days },
      ],
    },
    `giupay-sbt-${order.order_code}`
  );

  const signer = new Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const writeContract = new Contract(SBT_ADDRESS, SBT_ABI, signer);
  const tx = await writeContract.mint(
    order.buyer_wallet,
    orderId,
    order.product_name,
    order.product_image_cid ?? "",
    metadataCid,
    order.warranty_days ?? 0
  );
  await tx.wait();

  const tokenId: bigint = await readContract.orderToToken(orderId);
  return Number(tokenId);
}
