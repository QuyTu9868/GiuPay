// Deploy LẠI RIÊNG WarrantySBT (đổi tên "ArcPay Warranty SBT (ARCW)" -> "GiuPay Warranty SBT
// (GIUW)") — KHÔNG đụng ShopRegistry/PaymentEscrow đang chạy (deploy.ts gốc deploy cả 3, sẽ làm
// mồ côi tiền đang trong escrow + bắt mọi shop verify lại, không nằm trong yêu cầu lần này).
import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  const botAddress = process.env.BOT_WALLET_ADDRESS ?? deployerAddr;

  console.log("\n════════════════════════════════════════");
  console.log("  GiuPay WarrantySBT Redeploy (đổi tên khỏi ArcPay)");
  console.log(`  Network : ${network.name} (chainId: ${network.config.chainId})`);
  console.log(`  Deployer: ${deployerAddr}`);
  console.log(`  Bot     : ${botAddress}`);
  console.log("════════════════════════════════════════\n");

  const WarrantySBT = await ethers.getContractFactory("WarrantySBT");
  const warrantySBT = await WarrantySBT.deploy(botAddress);
  await warrantySBT.waitForDeployment();
  const sbtAddress = await warrantySBT.getAddress();

  console.log(`✅ WarrantySBT mới → ${sbtAddress}`);
  console.log("\n📋 Copy vào backend/.env VÀ frontend/.env.local:\n");
  console.log(`SBT_CONTRACT_ADDRESS=${sbtAddress}`);
  console.log(`NEXT_PUBLIC_SBT_CONTRACT=${sbtAddress}`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log(`\n🔍 Explorer: https://testnet.arcscan.app/address/${sbtAddress}`);
  }
}

main().catch((err) => {
  console.error("\n❌ Deploy thất bại:", err);
  process.exit(1);
});
