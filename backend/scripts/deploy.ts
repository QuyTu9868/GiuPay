import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const isLocal = network.name === "hardhat" || network.name === "localhost";

  console.log("\n════════════════════════════════════════");
  console.log("  GiuPay Contract Deploy");
  console.log(`  Network : ${network.name} (chainId: ${network.config.chainId})`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log("════════════════════════════════════════\n");

  // ── USDC ─────────────────────────────────────────────────────────────────
  let usdcAddress: string;

  if (isLocal) {
    console.log("📦 [Local] Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log(`   MockUSDC → ${usdcAddress}`);
  } else {
    usdcAddress = process.env.USDC_CONTRACT_ADDRESS ?? process.env.USDC_ADDRESS ?? "";
    if (!usdcAddress || usdcAddress === "0x...") {
      throw new Error("❌ Thiếu USDC_CONTRACT_ADDRESS trong .env");
    }
    console.log(`✅ USDC: ${usdcAddress}`);
  }

  // ── Bot + Fee — dùng getAddress() thay vì .address để tránh ENS resolve ──
  const deployerAddr = await deployer.getAddress();
  const botAddress = process.env.BOT_WALLET_ADDRESS ?? deployerAddr;
  const feeWallet  = process.env.FEE_WALLET_ADDRESS  ?? deployerAddr;

  console.log(`🤖 Bot : ${botAddress}`);
  console.log(`💰 Fee : ${feeWallet}`);

  // ── 1. ShopRegistry ───────────────────────────────────────────────────────
  console.log("\n📦 Deploying ShopRegistry...");
  const ShopRegistry = await ethers.getContractFactory("ShopRegistry");
  const shopRegistry = await ShopRegistry.deploy();
  await shopRegistry.waitForDeployment();
  const shopRegistryAddress = await shopRegistry.getAddress();
  console.log(`✅ ShopRegistry → ${shopRegistryAddress}`);

  // ── 2. PaymentEscrow ──────────────────────────────────────────────────────
  console.log("\n📦 Deploying PaymentEscrow...");
  const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
  const paymentEscrow = await PaymentEscrow.deploy(
    usdcAddress,
    shopRegistryAddress,
    botAddress,
    feeWallet
  );
  await paymentEscrow.waitForDeployment();
  const escrowAddress = await paymentEscrow.getAddress();
  console.log(`✅ PaymentEscrow → ${escrowAddress}`);

  // ── 3. WarrantySBT ────────────────────────────────────────────────────────
  console.log("\n📦 Deploying WarrantySBT...");
  const WarrantySBT = await ethers.getContractFactory("WarrantySBT");
  const warrantySBT = await WarrantySBT.deploy(botAddress);
  await warrantySBT.waitForDeployment();
  const sbtAddress = await warrantySBT.getAddress();
  console.log(`✅ WarrantySBT → ${sbtAddress}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════");
  console.log("  ✅ Deploy hoàn tất!");
  console.log("════════════════════════════════════════");
  console.log("\n📋 Copy vào backend/.env:\n");
  console.log(`USDC_CONTRACT_ADDRESS=${usdcAddress}`);
  console.log(`SHOP_REGISTRY_ADDRESS=${shopRegistryAddress}`);
  console.log(`ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);
  console.log(`SBT_CONTRACT_ADDRESS=${sbtAddress}`);

  if (!isLocal) {
    console.log(`\n🔍 Explorer:`);
    console.log(`   ShopRegistry  : https://testnet.arcscan.app/address/${shopRegistryAddress}`);
    console.log(`   PaymentEscrow : https://testnet.arcscan.app/address/${escrowAddress}`);
    console.log(`   WarrantySBT   : https://testnet.arcscan.app/address/${sbtAddress}`);
  }
}

main().catch((err) => {
  console.error("\n❌ Deploy thất bại:", err);
  process.exit(1);
});