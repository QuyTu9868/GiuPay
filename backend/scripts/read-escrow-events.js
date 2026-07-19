"use strict";
/**
 * GiuPay — Checkpoint 1: đọc thử sự kiện PaymentEscrow trên Arc Testnet
 *
 * Mục đích: xác minh script đọc đúng dữ liệu on-chain TRƯỚC khi động vào
 * indexer.ts thật hay code frontend — script này chỉ ĐỌC, không ký/gửi gì cả,
 * không đụng tới private key.
 *
 * 2 chế độ chạy:
 *   1) Không có TX_HASH  → quét ngược 1 khoảng block gần đây, in ra MỌI sự kiện
 *      PaymentReceived/EscrowReleased/EscrowRefunded/DisputeOpened đã từng xảy ra
 *      trên contract escrow thật (hữu ích để xem đã có giao dịch test nào chưa).
 *   2) Có TX_HASH        → đọc đúng 1 giao dịch cụ thể (ví dụ giao dịch bạn vừa
 *      tự approve + pay bằng tay qua UI hoặc qua "Write Contract" trên
 *      testnet.arcscan.app), in chi tiết orderId / buyer / shop / amount.
 *
 * Chạy:
 *   npx ts-node scripts/read-escrow-events.ts
 *   TX_HASH=0xabc... npx ts-node scripts/read-escrow-events.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ARC_RPC_URL = process.env.ARC_RPC_URL ?? "";
const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS ?? "";
const TX_HASH = process.env.TX_HASH ?? "";
// Batch nhỏ giống indexer.ts thật — tránh vượt giới hạn getLogs của RPC công cộng.
const BATCH_BLOCKS = Number(process.env.READ_BATCH_BLOCKS ?? 2000);
const LOOKBACK = Number(process.env.READ_LOOKBACK_BLOCKS ?? 50000);
// Khớp đúng ABI thật trong contracts/PaymentEscrow.sol — không đoán, copy từ source.
const ESCROW_ABI = [
    "event PaymentReceived(bytes32 indexed orderId, address buyer, address shop, uint256 amount)",
    "event EscrowReleased(bytes32 indexed orderId, address shop, uint256 amount)",
    "event EscrowRefunded(bytes32 indexed orderId, address buyer, uint256 amount)",
    "event DisputeOpened(bytes32 indexed orderId, address buyer, uint256 disputeCount)",
    "event DisputeResolved(bytes32 indexed orderId, bool refunded)",
    "function getEscrow(bytes32 orderId) view returns (tuple(address buyer, address shop, uint256 amount, uint256 createdAt, uint256 deadline, uint8 status, uint256 disputeCount, bool disputeClosed))",
];
const STATUS_LABEL = ["Active", "Released", "Refunded", "Disputed"];
function fmtUsdc(raw) {
    return `${ethers_1.ethers.formatUnits(raw, 6)} USDC`; // USDC ERC-20 interface trên Arc dùng 6 decimals
}
function assertConfig() {
    if (!ARC_RPC_URL)
        throw new Error("Thiếu ARC_RPC_URL trong backend/.env");
    if (!ESCROW_ADDRESS)
        throw new Error("Thiếu ESCROW_CONTRACT_ADDRESS trong backend/.env");
}
async function printEscrowDetail(contract, orderId) {
    try {
        const e = await contract.getEscrow(orderId);
        console.log("   └─ Chi tiết escrow hiện tại:");
        console.log(`      buyer:         ${e.buyer}`);
        console.log(`      shop:          ${e.shop}`);
        console.log(`      amount (net):  ${fmtUsdc(e.amount)}  (đã trừ phí 0.1%)`);
        console.log(`      status:        ${STATUS_LABEL[Number(e.status)]}`);
        console.log(`      createdAt:     ${new Date(Number(e.createdAt) * 1000).toISOString()}`);
        console.log(`      deadline:      ${new Date(Number(e.deadline) * 1000).toISOString()} (release sau mốc này)`);
        console.log(`      disputeCount:  ${e.disputeCount}`);
    }
    catch (err) {
        console.log(`   └─ (Không đọc được getEscrow: ${err?.message ?? err})`);
    }
}
// ── Chế độ 1: đọc đúng 1 tx theo hash ────────────────────────────────────────
async function readByTxHash(provider, contract, txHash) {
    console.log(`\n🔍 Đọc giao dịch: ${txHash}\n`);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
        console.log("❌ Không tìm thấy giao dịch này trên Arc Testnet.");
        return;
    }
    console.log(`Block:  ${receipt.blockNumber}`);
    console.log(`Status: ${receipt.status === 1 ? "✅ Thành công" : "❌ Thất bại (revert)"}`);
    console.log(`Từ:     ${receipt.from}`);
    console.log(`Đến:    ${receipt.to}`);
    const iface = new ethers_1.Interface(ESCROW_ABI);
    let found = false;
    for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== ESCROW_ADDRESS.toLowerCase())
            continue;
        try {
            const parsed = iface.parseLog(log);
            if (!parsed)
                continue;
            found = true;
            console.log(`\n📌 Event: ${parsed.name}`);
            if (parsed.name === "PaymentReceived") {
                console.log(`   orderId: ${parsed.args.orderId}`);
                console.log(`   buyer:   ${parsed.args.buyer}`);
                console.log(`   shop:    ${parsed.args.shop}`);
                console.log(`   amount:  ${fmtUsdc(parsed.args.amount)} (đã trừ phí, số thực vào escrow)`);
                await printEscrowDetail(contract, parsed.args.orderId);
            }
            else {
                console.log(`   args: ${JSON.stringify(parsed.args.map((a) => a?.toString?.() ?? a))}`);
            }
        }
        catch { /* log không thuộc ABI escrow (vd log Transfer của USDC) — bỏ qua */ }
    }
    if (!found)
        console.log("\n⚠️  Giao dịch này không phát ra event nào của PaymentEscrow — có thể chưa gọi tới hàm pay()/release/refund, hoặc gọi nhầm contract.");
}
// ── Chế độ 2: quét lịch sử gần đây ───────────────────────────────────────────
async function scanRecent(provider, contract) {
    const head = await provider.getBlockNumber();
    const from = Math.max(0, head - LOOKBACK);
    console.log(`\n🔍 Quét escrow ${ESCROW_ADDRESS} từ block ${from} → ${head} (khoảng ${LOOKBACK} block gần nhất)...\n`);
    let totalEvents = 0;
    for (let start = from; start <= head; start += BATCH_BLOCKS) {
        const end = Math.min(head, start + BATCH_BLOCKS - 1);
        const [paid, released, refunded, disputed] = await Promise.all([
            contract.queryFilter(contract.filters.PaymentReceived(), start, end),
            contract.queryFilter(contract.filters.EscrowReleased(), start, end),
            contract.queryFilter(contract.filters.EscrowRefunded(), start, end),
            contract.queryFilter(contract.filters.DisputeOpened(), start, end),
        ]);
        for (const ev of paid) {
            totalEvents++;
            console.log(`💰 PaymentReceived | block ${ev.blockNumber} | tx ${ev.transactionHash}`);
            console.log(`   orderId: ${ev.args.orderId}`);
            console.log(`   buyer:   ${ev.args.buyer}`);
            console.log(`   shop:    ${ev.args.shop}`);
            console.log(`   amount:  ${fmtUsdc(ev.args.amount)}`);
        }
        for (const ev of released) {
            totalEvents++;
            console.log(`✅ EscrowReleased  | block ${ev.blockNumber} | tx ${ev.transactionHash} | orderId ${ev.args.orderId} | shop ${ev.args.shop} | ${fmtUsdc(ev.args.amount)}`);
        }
        for (const ev of refunded) {
            totalEvents++;
            console.log(`↩️  EscrowRefunded  | block ${ev.blockNumber} | tx ${ev.transactionHash} | orderId ${ev.args.orderId} | buyer ${ev.args.buyer} | ${fmtUsdc(ev.args.amount)}`);
        }
        for (const ev of disputed) {
            totalEvents++;
            console.log(`⚠️  DisputeOpened   | block ${ev.blockNumber} | tx ${ev.transactionHash} | orderId ${ev.args.orderId} | buyer ${ev.args.buyer}`);
        }
    }
    if (totalEvents === 0) {
        console.log("(Chưa có giao dịch nào qua PaymentEscrow trong khoảng block vừa quét.)");
        console.log("\n👉 Để test: tự tạo 1 đơn hàng nhỏ trên dApp, approve + pay bằng ví thật (testnet),");
        console.log("   rồi chạy lại: TX_HASH=<hash vừa ký> npx ts-node scripts/read-escrow-events.ts");
    }
    else {
        console.log(`\nTổng cộng: ${totalEvents} sự kiện.`);
    }
}
async function main() {
    assertConfig();
    const provider = new ethers_1.JsonRpcProvider(ARC_RPC_URL);
    const contract = new ethers_1.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
    console.log(`Arc RPC:          ${ARC_RPC_URL}`);
    console.log(`PaymentEscrow:    ${ESCROW_ADDRESS}`);
    if (TX_HASH)
        await readByTxHash(provider, contract, TX_HASH);
    else
        await scanRecent(provider, contract);
}
main().catch((err) => { console.error("❌ Lỗi:", err?.message ?? err); process.exit(1); });
