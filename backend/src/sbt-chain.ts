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
  description?: string | null;
  warranty_days: number;
  buyer_wallet?: string | null;
  shop_name?: string | null;
  price_usdc?: string | number | null;
  chain_paid_from?: string | null;
  /** Mốc tiền vào escrow — dùng làm "ngày mua" + gốc tính hạn bảo hành. Thiếu thì dùng thời điểm mint. */
  purchased_at?: string | Date | null;
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

  // Ngày mua = lúc tiền vào escrow (không phải lúc mint — bot.ts mint trễ tới tận lúc release
  // sau 14 ngày) — dùng làm gốc tính luôn hạn bảo hành thành 1 NGÀY CỤ THỂ thay vì chỉ ghi số
  // ngày chung chung (dễ hiểu hơn nhiều khi xem trên explorer/ví).
  const purchasedAt = order.purchased_at ? new Date(order.purchased_at) : new Date();
  const warrantyExpiry = order.warranty_days > 0
    ? new Date(purchasedAt.getTime() + order.warranty_days * 86_400_000)
    : null;
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  const metadataCid = await pinJSONToIPFS(
    {
      name: order.product_name,
      // Mô tả thật của sản phẩm (nếu có) thay vì 1 câu chung chung không ăn nhập với món đã mua.
      // Chỉ hiện đúng mô tả sản phẩm — mã đơn đã có sẵn ở attributes "Order code" bên dưới.
      description: order.description ?? `GiuPay purchase proof — order ${order.order_code}`,
      // ipfs:// không fetch được trực tiếp trong <img> trình duyệt (không phải scheme HTTP) —
      // nhiều explorer (vd Blockscout) không tự resolve, hiện icon placeholder. Dùng gateway HTTP
      // để hiện ảnh preview được ở cả explorer lẫn ví.
      image: order.product_image_cid ? `https://ipfs.io/ipfs/${order.product_image_cid}` : "",
      // Link bấm thẳng từ NFT/explorer quay lại xem trạng thái đơn MỚI NHẤT trên web — trạng thái
      // đơn đổi theo thời gian nên để ở đây thay vì "đóng cứng" vào metadata tĩnh.
      external_url: `${(process.env.GIUPAY_FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "")}/order/${order.order_code}`,
      attributes: [
        { trait_type: "Order code", value: order.order_code },
        ...(order.shop_name ? [{ trait_type: "Shop", value: order.shop_name }] : []),
        ...(order.price_usdc != null ? [{ trait_type: "Amount paid (USDC)", value: String(order.price_usdc) }] : []),
        { trait_type: "Purchase date", value: isoDate(purchasedAt) },
        warrantyExpiry
          ? { trait_type: "Warranty expires", value: isoDate(warrantyExpiry) }
          : { trait_type: "Warranty", value: "None" },
        ...(order.chain_paid_from ? [{ trait_type: "Paid via", value: order.chain_paid_from }] : []),
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
