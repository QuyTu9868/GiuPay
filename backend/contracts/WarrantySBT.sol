// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WarrantySBT is ERC721, Ownable {

    // ═══════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════

    address public botAddress;
    uint256 private _tokenIdCounter;

    struct SBTData {
        bytes32 orderId;
        string  productName;
        string  imageCid;       // ← IPFS CID của ảnh sản phẩm (rỗng nếu không có)
        uint256 purchasedAt;
        uint256 warrantyExpiry; // 0 = không có bảo hành, tồn tại vĩnh viễn
        string  metadataCid;    // ← IPFS CID của JSON metadata (dùng cho tokenURI)
    }

    mapping(uint256 => SBTData) public sbtData;
    mapping(bytes32 => uint256) public orderToToken; // orderId → tokenId

    // ═══════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════

    event SBTMinted(uint256 indexed tokenId, address indexed buyer, bytes32 orderId);
    event SBTBurned(uint256 indexed tokenId, bytes32 orderId);

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

    constructor(address _botAddress)
        ERC721("GiuPay Warranty SBT", "GIUW")
        Ownable(msg.sender)
    {
        botAddress = _botAddress;
    }

    // ═══════════════════════════════════════════
    // SOULBOUND — chặn transfer
    // ═══════════════════════════════════════════

    function transferFrom(address, address, uint256) public pure override {
        revert("SBT: non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("SBT: non-transferable");
    }

    // ═══════════════════════════════════════════
    // TOKEN URI — trỏ đến IPFS JSON metadata
    // ═══════════════════════════════════════════

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory cid = sbtData[tokenId].metadataCid;
        if (bytes(cid).length == 0) return "";
        return string(abi.encodePacked("ipfs://", cid));
    }

    // ═══════════════════════════════════════════
    // MINT
    // ═══════════════════════════════════════════

    // Backend gọi sau khi thanh toán xong
    // metadataCid: CID của JSON { name, image, attributes } trên Pinata
    // imageCid:    CID của ảnh sản phẩm trên Pinata (để query nhanh, không cần parse JSON)
    function mint(
        address buyer,
        bytes32 orderId,
        string calldata productName,
        string calldata imageCid,    // ← thêm
        string calldata metadataCid, // ← thêm
        uint256 warrantyDays
    ) external onlyOwner {
        require(orderToToken[orderId] == 0, "Already minted");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        uint256 warrantyExpiry = warrantyDays > 0
            ? block.timestamp + (warrantyDays * 1 days)
            : 0;

        sbtData[tokenId] = SBTData({
            orderId:       orderId,
            productName:   productName,
            imageCid:      imageCid,
            purchasedAt:   block.timestamp,
            warrantyExpiry: warrantyExpiry,
            metadataCid:   metadataCid
        });

        orderToToken[orderId] = tokenId;
        _mint(buyer, tokenId);

        emit SBTMinted(tokenId, buyer, orderId);
    }

    // ═══════════════════════════════════════════
    // BURN
    // ═══════════════════════════════════════════

    // Bot gọi khi hết hạn bảo hành
    function burn(uint256 tokenId) external onlyBot {
        SBTData memory data = sbtData[tokenId];
        require(data.warrantyExpiry > 0, "No warranty");
        require(block.timestamp >= data.warrantyExpiry, "Not expired yet");

        delete orderToToken[data.orderId];
        delete sbtData[tokenId];
        _burn(tokenId);

        emit SBTBurned(tokenId, data.orderId);
    }

    // ═══════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════

    function getSBTData(uint256 tokenId) external view returns (SBTData memory) {
        return sbtData[tokenId];
    }

    function isWarrantyValid(uint256 tokenId) external view returns (bool) {
        SBTData memory data = sbtData[tokenId];
        if (data.warrantyExpiry == 0) return true;
        return block.timestamp < data.warrantyExpiry;
    }

    function setBotAddress(address newBot) external onlyOwner {
        require(newBot != address(0), "Zero address");
        botAddress = newBot;
    }
}
