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
 */
export async function ensureChainWrite<T>(
  targetChainId: number,
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>,
  write: () => Promise<T>,
): Promise<T> {
  await switchChainAsync({ chainId: targetChainId });
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
