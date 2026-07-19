"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importDefault(require("hardhat"));
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = hardhat_1.default;
/**
 * GiuPay — Bo test smart contract (Buoc 7)
 * Chay tren mang blockchain gia lap (Hardhat local).
 * Chay:  cd backend && npx hardhat test
 */
describe("GiuPay Contracts", function () {
    let shopRegistry;
    let paymentEscrow;
    let warrantySBT;
    let usdc;
    let owner, bot, feeWallet, shop, buyer, stranger;
    const ORDER_ID = ethers.id("ORDER-001");
    const TX_HASH = ethers.id("TX-001");
    const AMOUNT = ethers.parseUnits("100", 6);
    const FEE = (AMOUNT * 10n) / 10000n;
    const NET = AMOUNT - FEE;
    async function futureDeadline(secs = 3600) {
        return (await hardhat_network_helpers_1.time.latest()) + secs;
    }
    beforeEach(async function () {
        [owner, bot, feeWallet, shop, buyer, stranger] = await ethers.getSigners();
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy();
        const ShopRegistry = await ethers.getContractFactory("ShopRegistry");
        shopRegistry = await ShopRegistry.deploy();
        const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
        paymentEscrow = await PaymentEscrow.deploy(await usdc.getAddress(), await shopRegistry.getAddress(), bot.address, feeWallet.address);
        const WarrantySBT = await ethers.getContractFactory("WarrantySBT");
        warrantySBT = await WarrantySBT.deploy(bot.address);
        await shopRegistry.registerShop(shop.address, ethers.id("docs-hash"));
        await shopRegistry.verifyShop(shop.address);
        await usdc.mint(buyer.address, ethers.parseUnits("1000", 6));
        await usdc.connect(buyer).approve(await paymentEscrow.getAddress(), ethers.MaxUint256);
    });
    async function payOrder(orderId = ORDER_ID, txHash = TX_HASH, amount = AMOUNT) {
        const deadline = await futureDeadline();
        return paymentEscrow.connect(buyer).pay(orderId, txHash, shop.address, amount, deadline);
    }
    // ===================== SHOP REGISTRY =====================
    describe("ShopRegistry", function () {
        it("shop da duyet -> isVerified = true", async function () {
            (0, chai_1.expect)(await shopRegistry.isVerified(shop.address)).to.equal(true);
        });
        it("dia chi chua dang ky -> isVerified = false", async function () {
            (0, chai_1.expect)(await shopRegistry.isVerified(buyer.address)).to.equal(false);
        });
        it("dang ky shop phat event ShopRegistered", async function () {
            await (0, chai_1.expect)(shopRegistry.registerShop(stranger.address, ethers.id("d2")))
                .to.emit(shopRegistry, "ShopRegistered")
                .withArgs(stranger.address, ethers.id("d2"));
        });
        it("dang ky trung dia chi -> revert", async function () {
            await (0, chai_1.expect)(shopRegistry.registerShop(shop.address, ethers.id("again"))).to.be.revertedWith("Already registered");
        });
        it("chi owner duoc dang ky shop", async function () {
            await (0, chai_1.expect)(shopRegistry.connect(stranger).registerShop(stranger.address, ethers.id("d"))).to.be.revertedWithCustomError(shopRegistry, "OwnableUnauthorizedAccount");
        });
        it("duyet shop chua ton tai -> revert", async function () {
            await (0, chai_1.expect)(shopRegistry.verifyShop(stranger.address)).to.be.revertedWith("Not found");
        });
        it("tu choi shop -> isVerified quay ve false", async function () {
            await shopRegistry.rejectShop(shop.address);
            (0, chai_1.expect)(await shopRegistry.isVerified(shop.address)).to.equal(false);
        });
        it("getShopCount dem dung so shop", async function () {
            (0, chai_1.expect)(await shopRegistry.getShopCount()).to.equal(1n);
            await shopRegistry.registerShop(stranger.address, ethers.id("d3"));
            (0, chai_1.expect)(await shopRegistry.getShopCount()).to.equal(2n);
        });
    });
    // ===================== ESCROW - THANH TOAN =====================
    describe("PaymentEscrow - thanh toan", function () {
        it("thanh toan thanh cong + tach phi 0.1%", async function () {
            await payOrder();
            const escrow = await paymentEscrow.getEscrow(ORDER_ID);
            (0, chai_1.expect)(escrow.amount).to.equal(NET);
            (0, chai_1.expect)(escrow.status).to.equal(0);
            (0, chai_1.expect)(escrow.buyer).to.equal(buyer.address);
            (0, chai_1.expect)(escrow.shop).to.equal(shop.address);
            (0, chai_1.expect)(await usdc.balanceOf(feeWallet.address)).to.equal(FEE);
        });
        it("phat event PaymentReceived", async function () {
            const deadline = await futureDeadline();
            await (0, chai_1.expect)(paymentEscrow.connect(buyer).pay(ORDER_ID, TX_HASH, shop.address, AMOUNT, deadline))
                .to.emit(paymentEscrow, "PaymentReceived")
                .withArgs(ORDER_ID, buyer.address, shop.address, NET);
        });
        it("chong replay: cung txHash lan 2 -> revert", async function () {
            await payOrder();
            await (0, chai_1.expect)(payOrder()).to.be.revertedWith("Already processed");
        });
        it("trung orderId (txHash khac) -> revert Order exists", async function () {
            await payOrder();
            await (0, chai_1.expect)(payOrder(ORDER_ID, ethers.id("TX-002"))).to.be.revertedWith("Order exists");
        });
        it("giao dich het han -> revert", async function () {
            const past = (await hardhat_network_helpers_1.time.latest()) - 1;
            await (0, chai_1.expect)(paymentEscrow.connect(buyer).pay(ORDER_ID, TX_HASH, shop.address, AMOUNT, past)).to.be.revertedWith("Transaction expired");
        });
        it("so tien = 0 -> revert Invalid amount", async function () {
            const deadline = await futureDeadline();
            await (0, chai_1.expect)(paymentEscrow.connect(buyer).pay(ORDER_ID, TX_HASH, shop.address, 0, deadline)).to.be.revertedWith("Invalid amount");
        });
        it("vuot tran 100000 USDC -> revert Invalid amount", async function () {
            const tooBig = ethers.parseUnits("100001", 6);
            await usdc.mint(buyer.address, tooBig);
            const deadline = await futureDeadline();
            await (0, chai_1.expect)(paymentEscrow.connect(buyer).pay(ORDER_ID, TX_HASH, shop.address, tooBig, deadline)).to.be.revertedWith("Invalid amount");
        });
        it("shop chua verified -> revert Shop not verified", async function () {
            const deadline = await futureDeadline();
            await (0, chai_1.expect)(paymentEscrow.connect(buyer).pay(ORDER_ID, TX_HASH, stranger.address, AMOUNT, deadline)).to.be.revertedWith("Shop not verified");
        });
    });
    // ===================== ESCROW - RELEASE =====================
    describe("PaymentEscrow - release", function () {
        it("bot release sau 14 ngay -> shop nhan tien", async function () {
            await payOrder();
            await hardhat_network_helpers_1.time.increase(14 * 24 * 3600);
            await (0, chai_1.expect)(paymentEscrow.connect(bot).releaseEscrow(ORDER_ID))
                .to.emit(paymentEscrow, "EscrowReleased")
                .withArgs(ORDER_ID, shop.address, NET);
            (0, chai_1.expect)(await usdc.balanceOf(shop.address)).to.equal(NET);
        });
        it("release truoc 14 ngay -> revert Too early", async function () {
            await payOrder();
            await (0, chai_1.expect)(paymentEscrow.connect(bot).releaseEscrow(ORDER_ID)).to.be.revertedWith("Too early");
        });
        it("khong phai bot goi release -> revert Not bot", async function () {
            await payOrder();
            await hardhat_network_helpers_1.time.increase(14 * 24 * 3600);
            await (0, chai_1.expect)(paymentEscrow.connect(stranger).releaseEscrow(ORDER_ID)).to.be.revertedWith("Not bot");
        });
        it("release 2 lan -> lan 2 revert Not active", async function () {
            await payOrder();
            await hardhat_network_helpers_1.time.increase(14 * 24 * 3600);
            await paymentEscrow.connect(bot).releaseEscrow(ORDER_ID);
            await (0, chai_1.expect)(paymentEscrow.connect(bot).releaseEscrow(ORDER_ID)).to.be.revertedWith("Not active");
        });
        it("release don khong ton tai -> revert Not found", async function () {
            await (0, chai_1.expect)(paymentEscrow.connect(bot).releaseEscrow(ethers.id("NOPE"))).to.be.revertedWith("Not found");
        });
        it("emergencyRelease: shop tu rut sau 16 ngay", async function () {
            await payOrder();
            await hardhat_network_helpers_1.time.increase(16 * 24 * 3600);
            await paymentEscrow.connect(shop).emergencyRelease(ORDER_ID);
            (0, chai_1.expect)(await usdc.balanceOf(shop.address)).to.equal(NET);
        });
        it("emergencyRelease truoc 16 ngay -> revert Too early", async function () {
            await payOrder();
            await hardhat_network_helpers_1.time.increase(14 * 24 * 3600);
            await (0, chai_1.expect)(paymentEscrow.connect(shop).emergencyRelease(ORDER_ID)).to.be.revertedWith("Too early");
        });
        it("emergencyRelease boi nguoi khong phai shop -> revert Not shop", async function () {
            await payOrder();
            await hardhat_network_helpers_1.time.increase(16 * 24 * 3600);
            await (0, chai_1.expect)(paymentEscrow.connect(stranger).emergencyRelease(ORDER_ID)).to.be.revertedWith("Not shop");
        });
    });
    // ===================== ESCROW - TRANH CHAP =====================
    describe("PaymentEscrow - tranh chap", function () {
        it("buyer mo tranh chap -> status Disputed", async function () {
            await payOrder();
            await (0, chai_1.expect)(paymentEscrow.connect(buyer).openDispute(ORDER_ID))
                .to.emit(paymentEscrow, "DisputeOpened")
                .withArgs(ORDER_ID, buyer.address, 1);
            const e = await paymentEscrow.getEscrow(ORDER_ID);
            (0, chai_1.expect)(e.status).to.equal(3);
        });
        it("khong phai buyer mo tranh chap -> revert Not buyer", async function () {
            await payOrder();
            await (0, chai_1.expect)(paymentEscrow.connect(stranger).openDispute(ORDER_ID)).to.be.revertedWith("Not buyer");
        });
        it("shop hoan tien khi tranh chap -> buyer nhan lai tien", async function () {
            await payOrder();
            await paymentEscrow.connect(buyer).openDispute(ORDER_ID);
            const before = await usdc.balanceOf(buyer.address);
            await paymentEscrow.connect(shop).refundByShop(ORDER_ID);
            (0, chai_1.expect)(await usdc.balanceOf(buyer.address)).to.equal(before + NET);
            const e = await paymentEscrow.getEscrow(ORDER_ID);
            (0, chai_1.expect)(e.status).to.equal(2);
        });
        it("refundByShop khi khong co tranh chap -> revert No dispute", async function () {
            await payOrder();
            await (0, chai_1.expect)(paymentEscrow.connect(shop).refundByShop(ORDER_ID)).to.be.revertedWith("No dispute");
        });
        it("admin xu ly - hoan tien cho buyer", async function () {
            await payOrder();
            await paymentEscrow.connect(buyer).openDispute(ORDER_ID);
            const before = await usdc.balanceOf(buyer.address);
            await paymentEscrow.connect(owner).adminResolve(ORDER_ID, true);
            (0, chai_1.expect)(await usdc.balanceOf(buyer.address)).to.equal(before + NET);
        });
        it("admin xu ly - release cho shop", async function () {
            await payOrder();
            await paymentEscrow.connect(buyer).openDispute(ORDER_ID);
            await paymentEscrow.connect(owner).adminResolve(ORDER_ID, false);
            (0, chai_1.expect)(await usdc.balanceOf(shop.address)).to.equal(NET);
        });
        it("khong phai owner goi adminResolve -> revert", async function () {
            await payOrder();
            await paymentEscrow.connect(buyer).openDispute(ORDER_ID);
            await (0, chai_1.expect)(paymentEscrow.connect(stranger).adminResolve(ORDER_ID, true)).to.be.revertedWithCustomError(paymentEscrow, "OwnableUnauthorizedAccount");
        });
    });
    // ===================== ESCROW - CAU HINH =====================
    describe("PaymentEscrow - cau hinh", function () {
        it("setFeeWallet cap nhat + phat event", async function () {
            await (0, chai_1.expect)(paymentEscrow.connect(owner).setFeeWallet(stranger.address))
                .to.emit(paymentEscrow, "FeeWalletUpdated")
                .withArgs(stranger.address);
            (0, chai_1.expect)(await paymentEscrow.feeWallet()).to.equal(stranger.address);
        });
        it("setFeeWallet dia chi 0 -> revert", async function () {
            await (0, chai_1.expect)(paymentEscrow.connect(owner).setFeeWallet(ethers.ZeroAddress)).to.be.revertedWith("Zero address");
        });
        it("setBotAddress chi owner", async function () {
            await (0, chai_1.expect)(paymentEscrow.connect(stranger).setBotAddress(stranger.address)).to.be.revertedWithCustomError(paymentEscrow, "OwnableUnauthorizedAccount");
        });
    });
    // ===================== WARRANTY SBT =====================
    describe("WarrantySBT", function () {
        const IMG_CID = "QmImage";
        const META_CID = "QmMeta";
        async function mintSBT(days = 365, orderId = ORDER_ID) {
            return warrantySBT.mint(buyer.address, orderId, "iPhone 15", IMG_CID, META_CID, days);
        }
        it("mint thanh cong -> buyer co 1 SBT", async function () {
            await (0, chai_1.expect)(mintSBT())
                .to.emit(warrantySBT, "SBTMinted")
                .withArgs(1, buyer.address, ORDER_ID);
            (0, chai_1.expect)(await warrantySBT.balanceOf(buyer.address)).to.equal(1n);
            (0, chai_1.expect)(await warrantySBT.ownerOf(1)).to.equal(buyer.address);
        });
        it("luu dung du lieu SBT + map orderId -> tokenId", async function () {
            await mintSBT();
            const data = await warrantySBT.getSBTData(1);
            (0, chai_1.expect)(data.productName).to.equal("iPhone 15");
            (0, chai_1.expect)(data.imageCid).to.equal(IMG_CID);
            (0, chai_1.expect)(await warrantySBT.orderToToken(ORDER_ID)).to.equal(1n);
        });
        it("chi owner duoc mint", async function () {
            await (0, chai_1.expect)(warrantySBT.connect(stranger).mint(buyer.address, ORDER_ID, "x", IMG_CID, META_CID, 365)).to.be.revertedWithCustomError(warrantySBT, "OwnableUnauthorizedAccount");
        });
        it("mint trung orderId -> revert Already minted", async function () {
            await mintSBT();
            await (0, chai_1.expect)(mintSBT()).to.be.revertedWith("Already minted");
        });
        it("SBT khong chuyen duoc - transferFrom revert", async function () {
            await mintSBT();
            await (0, chai_1.expect)(warrantySBT.connect(buyer).transferFrom(buyer.address, shop.address, 1)).to.be.revertedWith("SBT: non-transferable");
        });
        it("SBT khong chuyen duoc - safeTransferFrom revert", async function () {
            await mintSBT();
            await (0, chai_1.expect)(warrantySBT.connect(buyer)["safeTransferFrom(address,address,uint256,bytes)"](buyer.address, shop.address, 1, "0x")).to.be.revertedWith("SBT: non-transferable");
        });
        it("tokenURI tro ipfs://<metadataCid>", async function () {
            await mintSBT();
            (0, chai_1.expect)(await warrantySBT.tokenURI(1)).to.equal("ipfs://" + META_CID);
        });
        it("warrantyDays = 0 -> bao hanh vinh vien", async function () {
            await warrantySBT.mint(buyer.address, ORDER_ID, "no-warranty", IMG_CID, "", 0);
            (0, chai_1.expect)(await warrantySBT.isWarrantyValid(1)).to.equal(true);
        });
        it("bao hanh con han -> true, het han -> false", async function () {
            await mintSBT(30);
            (0, chai_1.expect)(await warrantySBT.isWarrantyValid(1)).to.equal(true);
            await hardhat_network_helpers_1.time.increase(31 * 24 * 3600);
            (0, chai_1.expect)(await warrantySBT.isWarrantyValid(1)).to.equal(false);
        });
        it("bot burn SBT sau khi het han", async function () {
            await mintSBT(30);
            await hardhat_network_helpers_1.time.increase(31 * 24 * 3600);
            await (0, chai_1.expect)(warrantySBT.connect(bot).burn(1))
                .to.emit(warrantySBT, "SBTBurned")
                .withArgs(1, ORDER_ID);
            (0, chai_1.expect)(await warrantySBT.balanceOf(buyer.address)).to.equal(0n);
            (0, chai_1.expect)(await warrantySBT.orderToToken(ORDER_ID)).to.equal(0n);
        });
        it("burn truoc khi het han -> revert Not expired yet", async function () {
            await mintSBT(30);
            await (0, chai_1.expect)(warrantySBT.connect(bot).burn(1)).to.be.revertedWith("Not expired yet");
        });
        it("khong phai bot goi burn -> revert Not bot", async function () {
            await mintSBT(30);
            await hardhat_network_helpers_1.time.increase(31 * 24 * 3600);
            await (0, chai_1.expect)(warrantySBT.connect(stranger).burn(1)).to.be.revertedWith("Not bot");
        });
        it("setBotAddress dia chi 0 -> revert", async function () {
            await (0, chai_1.expect)(warrantySBT.connect(owner).setBotAddress(ethers.ZeroAddress)).to.be.revertedWith("Zero address");
        });
    });
    // ===== FIX BUG KHOA TIEN: confirmReceived xong phai release duoc =====
    describe("PaymentEscrow - confirmReceived (fix bug khoa tien)", function () {
        it("sau openDispute + confirmReceived, status quay ve Active + dispute dong", async function () {
            await payOrder();
            await paymentEscrow.connect(buyer).openDispute(ORDER_ID);
            await paymentEscrow.connect(buyer).confirmReceived(ORDER_ID);
            const e = await paymentEscrow.getEscrow(ORDER_ID);
            (0, chai_1.expect)(e.status).to.equal(0); // Active
            (0, chai_1.expect)(e.disputeClosed).to.equal(true);
        });
        it("sau confirmReceived -> bot releaseEscrow THANH CONG, shop nhan tien", async function () {
            await payOrder();
            await paymentEscrow.connect(buyer).openDispute(ORDER_ID);
            await paymentEscrow.connect(buyer).confirmReceived(ORDER_ID);
            await hardhat_network_helpers_1.time.increase(14 * 24 * 3600);
            await (0, chai_1.expect)(paymentEscrow.connect(bot).releaseEscrow(ORDER_ID))
                .to.emit(paymentEscrow, "EscrowReleased")
                .withArgs(ORDER_ID, shop.address, NET);
            (0, chai_1.expect)(await usdc.balanceOf(shop.address)).to.equal(NET);
        });
        it("sau confirmReceived -> emergencyRelease (bot sap) van THANH CONG sau 16 ngay", async function () {
            await payOrder();
            await paymentEscrow.connect(buyer).openDispute(ORDER_ID);
            await paymentEscrow.connect(buyer).confirmReceived(ORDER_ID);
            await hardhat_network_helpers_1.time.increase(16 * 24 * 3600);
            await paymentEscrow.connect(shop).emergencyRelease(ORDER_ID);
            (0, chai_1.expect)(await usdc.balanceOf(shop.address)).to.equal(NET);
        });
        it("tranh chap DANG MO (chua confirm) van khong release duoc (status Disputed)", async function () {
            await payOrder();
            await paymentEscrow.connect(buyer).openDispute(ORDER_ID);
            await hardhat_network_helpers_1.time.increase(14 * 24 * 3600);
            await (0, chai_1.expect)(paymentEscrow.connect(bot).releaseEscrow(ORDER_ID)).to.be.revertedWith("Not active");
        });
    });
});
