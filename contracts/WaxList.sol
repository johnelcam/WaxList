// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WaxList — an autonomous collectible vending machine on ARC
/// @notice Insert a tiny USDC micro-payment, the machine mints you a random
///         collectible card (item + rarity) on-chain. No shopkeeper — the
///         contract IS the merchant. Revenue accrues to the machine treasury.
///         Pure agentic commerce, only practical because ARC settles in native
///         USDC so a $0.25 pull is a single cheap transaction.
/// @dev Randomness is on-chain pseudo-randomness (block data) — fine for a
///      testnet collectible toy, NOT for high-value outcomes.
contract WaxList {
    enum Rarity { Common, Rare, Epic, Legendary }

    struct Card {
        uint256 id;
        address owner;
        uint8 item;      // index into the off-chain item list (0..ITEM_COUNT-1)
        Rarity rarity;
        uint64 mintedAt;
        uint256 pricePaid;
    }

    uint8 public constant ITEM_COUNT = 12;
    uint256 public pullPrice;     // USDC (native, 18 decimals) per pull
    uint256 public cardCount;
    uint256 public totalRevenue;  // USDC taken by the machine
    address public owner;

    mapping(uint256 => Card) public cards;
    mapping(address => uint256[]) private _collection;
    mapping(address => uint256) public pullsBy;

    event Pulled(uint256 indexed id, address indexed owner, uint8 item, uint8 rarity, uint256 price);
    event Withdrawn(address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
        pullPrice = 0.25 ether; // 0.25 USDC
    }

    /// @notice Insert at least `pullPrice` USDC and the machine mints you a card.
    function pull() external payable returns (uint256) {
        require(msg.value >= pullPrice, "insert more USDC");

        uint256 id = ++cardCount;
        uint256 rnd = uint256(
            keccak256(abi.encodePacked(blockhash(block.number - 1), block.prevrandao, block.timestamp, msg.sender, id))
        );
        uint8 item = uint8(rnd % ITEM_COUNT);
        Rarity rarity = _rarity(uint16((rnd >> 16) % 1000));

        cards[id] = Card(id, msg.sender, item, rarity, uint64(block.timestamp), msg.value);
        _collection[msg.sender].push(id);
        pullsBy[msg.sender] += 1;
        totalRevenue += msg.value;

        emit Pulled(id, msg.sender, item, uint8(rarity), msg.value);
        return id;
    }

    function _rarity(uint16 p) internal pure returns (Rarity) {
        if (p < 600) return Rarity.Common;     // 60.0%
        if (p < 880) return Rarity.Rare;        // 28.0%
        if (p < 970) return Rarity.Epic;        //  9.0%
        return Rarity.Legendary;                //  3.0%
    }

    function withdraw() external {
        require(msg.sender == owner, "not owner");
        uint256 amount = address(this).balance;
        (bool ok, ) = payable(owner).call{value: amount}("");
        require(ok, "withdraw failed");
        emit Withdrawn(owner, amount);
    }

    function collectionOf(address a) external view returns (uint256[] memory) { return _collection[a]; }
    function getCard(uint256 id) external view returns (Card memory) { return cards[id]; }
}
