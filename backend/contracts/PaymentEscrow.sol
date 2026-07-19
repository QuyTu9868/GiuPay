// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ShopRegistry.sol";

contract PaymentEscrow is Ownable, ReentrancyGuard {

    // ═══════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════

    IERC20 public usdc;
    ShopRegistry public shopRegistry;
    address public botAddress;
    address public feeWallet;
    uint256 public constant FEE_BPS = 10; // 0.1%
    uint256 public constant MAX_ORDER_VALUE = 100_000 * 10 ** 6; // 100,000 USDC
    uint256 public constant ESCROW_PERIOD = 14 days;
    uint256 public constant EMERGENCY_PERIOD = 16 days;
    uint256 public constant MAX_DISPUTES = 3;

    enum EscrowStatus { Active, Released, Refunded, Disputed }

    struct Escrow {
        address buyer;
        address shop;
        uint256 amount;       // sau khi trừ phí
        uint256 createdAt;
        uint256 deadline;
        EscrowStatus status;
        uint256 disputeCount;
        bool disputeClosed;
    }

    mapping(bytes32 => Escrow) public escrows;
    mapping(bytes32 => bool) public usedTxHashes; // chống replay attack

    // ═══════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════

    event PaymentReceived(bytes32 indexed orderId, address buyer, address shop, uint256 amount);
    event EscrowReleased(bytes32 indexed orderId, address shop, uint256 amount);
    event EscrowRefunded(bytes32 indexed orderId, address buyer, uint256 amount);
    event DisputeOpened(bytes32 indexed orderId, address buyer, uint256 disputeCount);
    event DisputeResolved(bytes32 indexed orderId, bool refunded);
    event FeeWalletUpdated(address newWallet);
    event BotAddressUpdated(address newBot);

    // ═══════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════

    modifier onlyBot() {
        require(msg.sender == botAddress, "Not bot");
        _;
    }

    // ═══════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════

    constructor(
        address _usdc,
        address _shopRegistry,
        address _botAddress,
        address _feeWallet
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        shopRegistry = ShopRegistry(_shopRegistry);
        botAddress = _botAddress;
        feeWallet = _feeWallet;
    }

    // ═══════════════════════════════════════════
    // THANH TOÁN
    // ═══════════════════════════════════════════

    function pay(
        bytes32 orderId,
        bytes32 txHash,
        address shop,
        uint256 amount,
        uint256 deadline
    ) external nonReentrant {
        // Chống replay attack
        require(!usedTxHashes[txHash], "Already processed");
        usedTxHashes[txHash] = true;

        // Validate
        require(block.timestamp <= deadline, "Transaction expired");
        require(amount > 0 && amount <= MAX_ORDER_VALUE, "Invalid amount");
        require(shopRegistry.isVerified(shop), "Shop not verified");
        require(escrows[orderId].buyer == address(0), "Order exists");

        // Tính phí 0.1%
        uint256 fee = (amount * FEE_BPS) / 10000;
        uint256 netAmount = amount - fee;

        // Nhận USDC từ buyer
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Gửi phí cho Admin
        require(usdc.transfer(feeWallet, fee), "Fee transfer failed");

        // Lưu escrow
        escrows[orderId] = Escrow({
            buyer: msg.sender,
            shop: shop,
            amount: netAmount,
            createdAt: block.timestamp,
            deadline: block.timestamp + ESCROW_PERIOD,
            status: EscrowStatus.Active,
            disputeCount: 0,
            disputeClosed: false
        });

        emit PaymentReceived(orderId, msg.sender, shop, netAmount);
    }

    // ═══════════════════════════════════════════
    // RELEASE ESCROW
    // ═══════════════════════════════════════════

    // Bot gọi sau 14 ngày
    function releaseEscrow(bytes32 orderId) external onlyBot nonReentrant {
        Escrow storage e = escrows[orderId];
        require(e.buyer != address(0), "Not found");
        // status == Active đã loại trừ tranh chấp ĐANG MỞ (mở = status Disputed).
        // Sau confirmReceived, tranh chấp đã đóng và status quay về Active → được release.
        require(e.status == EscrowStatus.Active, "Not active");
        require(block.timestamp >= e.deadline, "Too early");

        e.status = EscrowStatus.Released;
        require(usdc.transfer(e.shop, e.amount), "Transfer failed");

        emit EscrowReleased(orderId, e.shop, e.amount);
    }

    // Shop tự release sau 16 ngày nếu bot sập
    function emergencyRelease(bytes32 orderId) external nonReentrant {
        Escrow storage e = escrows[orderId];
        require(msg.sender == e.shop, "Not shop");
        // status == Active đã loại trừ tranh chấp đang mở; sau confirmReceived
        // (tranh chấp đã đóng) shop vẫn phải rút được nếu bot sập.
        require(e.status == EscrowStatus.Active, "Not active");
        require(block.timestamp >= e.createdAt + EMERGENCY_PERIOD, "Too early");

        e.status = EscrowStatus.Released;
        require(usdc.transfer(e.shop, e.amount), "Transfer failed");

        emit EscrowReleased(orderId, e.shop, e.amount);
    }

    // ═══════════════════════════════════════════
    // TRANH CHẤP
    // ═══════════════════════════════════════════

    // Người mua mở tranh chấp
    function openDispute(bytes32 orderId) external {
        Escrow storage e = escrows[orderId];
        require(msg.sender == e.buyer, "Not buyer");
        require(e.status == EscrowStatus.Active, "Not active");
        require(!e.disputeClosed, "Dispute closed");
        require(block.timestamp < e.createdAt + ESCROW_PERIOD, "Escrow expired");
        require(e.disputeCount < MAX_DISPUTES, "Max disputes reached");

        e.status = EscrowStatus.Disputed;
        e.disputeCount++;

        emit DisputeOpened(orderId, msg.sender, e.disputeCount);
    }

    // Shop đồng ý hoàn tiền
    function refundByShop(bytes32 orderId) external nonReentrant {
        Escrow storage e = escrows[orderId];
        require(msg.sender == e.shop, "Not shop");
        require(e.status == EscrowStatus.Disputed, "No dispute");

        e.status = EscrowStatus.Refunded;
        e.disputeClosed = true;
        require(usdc.transfer(e.buyer, e.amount), "Transfer failed");

        emit EscrowRefunded(orderId, e.buyer, e.amount);
        emit DisputeResolved(orderId, true);
    }

    // Người mua xác nhận đã nhận hàng OK → đóng tranh chấp vĩnh viễn
    function confirmReceived(bytes32 orderId) external {
        Escrow storage e = escrows[orderId];
        require(msg.sender == e.buyer, "Not buyer");
        require(e.status == EscrowStatus.Disputed, "No dispute");
        require(!e.disputeClosed, "Already closed");

        e.disputeClosed = true;
        e.status = EscrowStatus.Active; // tiếp tục đếm 14 ngày
        e.deadline = block.timestamp + ESCROW_PERIOD; // reset deadline

        emit DisputeResolved(orderId, false);
    }

    // Admin can thiệp — hoàn tiền hoặc release cho shop
    function adminResolve(bytes32 orderId, bool refund) external onlyOwner nonReentrant {
        Escrow storage e = escrows[orderId];
        require(e.status == EscrowStatus.Disputed, "No dispute");

        e.disputeClosed = true;

        if (refund) {
            e.status = EscrowStatus.Refunded;
            require(usdc.transfer(e.buyer, e.amount), "Transfer failed");
            emit EscrowRefunded(orderId, e.buyer, e.amount);
        } else {
            e.status = EscrowStatus.Released;
            require(usdc.transfer(e.shop, e.amount), "Transfer failed");
            emit EscrowReleased(orderId, e.shop, e.amount);
        }

        emit DisputeResolved(orderId, refund);
    }

    // ═══════════════════════════════════════════
    // ADMIN SETTINGS
    // ═══════════════════════════════════════════

    function setFeeWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Zero address");
        feeWallet = newWallet;
        emit FeeWalletUpdated(newWallet);
    }

    function setBotAddress(address newBot) external onlyOwner {
        require(newBot != address(0), "Zero address");
        botAddress = newBot;
        emit BotAddressUpdated(newBot);
    }

    // ═══════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════

    function getEscrow(bytes32 orderId) external view returns (Escrow memory) {
        return escrows[orderId];
    }
}