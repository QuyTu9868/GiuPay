// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ShopRegistry is Ownable {

    enum ShopStatus { Pending, Verified, Rejected }

    struct Shop {
        address wallet;
        bytes32 docsHash;
        ShopStatus status;
        uint256 registeredAt;
    }

    mapping(address => Shop) public shops;
    address[] public shopList;

    event ShopRegistered(address indexed wallet, bytes32 docsHash);
    event ShopVerified(address indexed wallet);
    event ShopRejected(address indexed wallet);

    constructor() Ownable(msg.sender) {}

    // Shop tự đăng ký — backend gọi sau khi lưu off-chain
    function registerShop(address wallet, bytes32 docsHash) external onlyOwner {
        require(shops[wallet].wallet == address(0), "Already registered");
        shops[wallet] = Shop(wallet, docsHash, ShopStatus.Pending, block.timestamp);
        shopList.push(wallet);
        emit ShopRegistered(wallet, docsHash);
    }

    // Admin duyệt shop
    function verifyShop(address wallet) external onlyOwner {
        require(shops[wallet].wallet != address(0), "Not found");
        shops[wallet].status = ShopStatus.Verified;
        emit ShopVerified(wallet);
    }

    // Admin từ chối shop
    function rejectShop(address wallet) external onlyOwner {
        require(shops[wallet].wallet != address(0), "Not found");
        shops[wallet].status = ShopStatus.Rejected;
        emit ShopRejected(wallet);
    }

    // Check shop đã verified chưa — PaymentEscrow sẽ gọi hàm này
    function isVerified(address wallet) external view returns (bool) {
        return shops[wallet].status == ShopStatus.Verified;
    }

    function getShopCount() external view returns (uint256) {
        return shopList.length;
    }
}