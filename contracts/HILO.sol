//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

import "@openzeppelin/contracts/interfaces/IERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract HILO is ERC1155Supply, Ownable, Pausable, ReentrancyGuard {
    uint256 public constant HI = 0;
    uint256 public constant LO = 1;

    // the initial prices
    uint256 public initialHi;
    uint256 public initialLo;

    // the up-to-date prices
    uint256 public hiPrice;
    uint256 public loPrice;

    // number of buys per price level
    uint256 public buyRequiredCount;

    // number of buys that push price changes
    uint256 public buyForceCount;

    // number of buys until sales are open
    // keep as a mapping so its easier to update
    // 0 => HI, 1 => LO
    mapping(uint256 => uint256) public buyCounts;

    // same as above but for buyForceCount;
    mapping(uint256 => uint256) public buyForceCounts;

    // queue for sales
    address[] public hiSaleQueue;
    address[] public loSaleQueue;
    uint256 public hiSaleQueueIndex = 0;
    uint256 public loSaleQueueIndex = 0;

    struct Action {
        address player;
        uint256 tokenId;
        uint256 price;
    }

    struct GameState {
        uint256 currentHi;
        uint256 currentLo;
        address[] winners;
        uint256[3] playerTotals;
        uint256[2] tokenBalances;
        uint256 approvedSpend;
    }

    // store transactions by price so we can pull it when they converge
    mapping(uint256 => Action[]) public actions;

    // all the players holding tokens
    mapping(address => bool) private players;
    uint256 public playerCount = 0;

    bool public gameWon = false;

    // the winners!
    address[] public winners;

    // the jackpot for the game
    uint256 public jackpot;

    // implement USDC for payments
    // mumbai: 0xe11A86849d99F524cAC3E7A0Ec1241828e332C62
    IERC20 public usdc = IERC20(0xe11A86849d99F524cAC3E7A0Ec1241828e332C62);

    event HiDecreased(uint256 newHiPrice);
    event LoIncreased(uint256 newLoPrice);
    event ActionAdded(address player, uint256 tokenId, uint256 price);
    event PricesConverged(address[] winners, uint256 price);
    event JackpotPaid(address player, uint256 amount);
    event PriceUpdated(address player, uint256 tokenId);
    event AddedToQueue(address player, uint256 tokenId, uint256 position);

    constructor(
        uint256 _initialHi,
        uint256 _initialLo,
        uint256 _buyRequiredCount,
        uint256 _jackpot
    ) ERC1155("https://hilo-eight.vercel.app/api/tokens/{id}") {
        // set the start prices
        initialHi = hiPrice = _initialHi;
        initialLo = loPrice = _initialLo;

        // ensure we can support the jackpot
        // the first () could just be initialHi, unless we don't
        // want to assume we are starting with 1 (let's not assume)
        uint256 sumTotal = ((initialHi - initialLo + 1) *
            (initialHi + initialLo)) / 2;
        require(
            sumTotal / 2 >= _jackpot, // I want some too!
            "Jackpot too large for the game"
        );
        jackpot = _jackpot;

        assert(hiPrice > 0);
        assert(loPrice > 0);
        assert(hiPrice > loPrice);

        buyRequiredCount = _buyRequiredCount;
        buyCounts[HI] = 0;
        buyCounts[LO] = 0;
        buyForceCount = _buyRequiredCount + 1;
        buyForceCounts[HI] = 0;
        buyForceCounts[LO] = 0;
    }

    function getGameState(address player)
        public
        view
        returns (GameState memory)
    {
        uint256 hiBalance = balanceOf(player, HI);
        uint256 loBalance = balanceOf(player, LO);
        uint256 approvedSpend = usdc.allowance(player, address(this));
        uint256 hiTotal = totalSupply(HI);
        uint256 loTotal = totalSupply(LO);

        return
            GameState(
                hiPrice,
                loPrice,
                winners,
                [hiTotal, loTotal, playerCount],
                [hiBalance, loBalance],
                approvedSpend
            );
    }

    function getPrice(uint256 tokenId) public view returns (uint256) {
        if (tokenId == HI) {
            return hiPrice;
        } else if (tokenId == LO) {
            return loPrice;
        } else {
            return 0;
        }
    }

    function updatePrice(uint256 tokenId) private {
        if (tokenId == HI) {
            decreaseHiPrice();
        } else {
            increaseLoPrice();
        }
    }

    function decreaseHiPrice() private {
        hiPrice = hiPrice - 1;
        assert(hiPrice >= 0);
        emit HiDecreased(hiPrice);
    }

    function increaseLoPrice() private {
        loPrice = loPrice + 1;
        assert(loPrice <= hiPrice);
        emit LoIncreased(loPrice);
    }

    function increaseBuyCounts(uint256 tokenId) private {
        // If we haven't already hit the threshold, increment the counts
        if (buyCounts[tokenId] < buyRequiredCount) {
            buyCounts[tokenId] = buyCounts[tokenId] + 1;
        }

        if (buyForceCounts[tokenId] < buyForceCount) {
            buyForceCounts[tokenId] = buyForceCounts[tokenId] + 1;
        }
    }

    function updatePlayers(address player) private {
        // get how many they have
        uint256 hiBalance = balanceOf(player, HI);
        uint256 loBalance = balanceOf(player, LO);
        bool hasTokens = (hiBalance > 0) || (loBalance > 0);
        bool existingPlayer = players[player];

        if (hasTokens && !existingPlayer) {
            players[player] = true;
            playerCount = playerCount + 1;
        } else if (!hasTokens && existingPlayer) {
            players[player] = false;
            playerCount = playerCount - 1;
        }
    }

    function addAction(address player, uint256 tokenId) private {
        uint256 price = getPrice(tokenId);
        Action memory action = Action(player, tokenId, price);
        actions[price].push(action);
        emit ActionAdded(player, tokenId, price);
    }

    function getWinners() public view returns (address[] memory) {
        return winners;
    }

    function priceConverged(uint256 price) private {
        // get the winners
        Action[] memory wins = actions[hiPrice]; // which price doesn't matter; they converged
        for (uint256 i = 0; i < wins.length; i++) {
            winners.push(wins[i].player);
        }

        gameWon = true;

        // emit the prices converged event
        emit PricesConverged(winners, price);

        // game over
        _pause();
    }

    function payout() public onlyOwner {
        // first pay out the winners
        uint256 winnersCount = winners.length;
        uint256 jackpotPayout = jackpot * 1 ether;
        for (uint256 i = 0; i < winnersCount; i++) {
            uint256 amount = jackpotPayout / winnersCount;
            usdc.transfer(winners[i], amount);
            emit JackpotPaid(winners[i], amount);
        }
        uint256 balance = usdc.balanceOf(address(this));
        usdc.transfer(owner(), balance); // gimme the rest!

        // stop game if not stopped
        gameWon = true;
        _pause();
    }

    function buy(uint256 tokenId, uint256 amount) public whenNotPaused {
        // check if the token is valid
        require(tokenId == HI || tokenId == LO, "Invalid token.");

        // check it's one of the allowed amounts
        require(amount == 1 || amount == 3, "Invalid amount.");

        // get price
        uint256 price = getPrice(tokenId);
        assert(price > 0);

        // check if the player has enough to buy
        uint256 cost = price * amount * 1 ether;
        uint256 playerBalance = usdc.balanceOf(msg.sender);
        require(playerBalance >= cost, "Insufficient USDC balance.");

        // get the money
        usdc.transferFrom(msg.sender, address(this), cost);

        // mint the token (buy)
        _mint(msg.sender, tokenId, amount, "");

        // update the players count
        updatePlayers(msg.sender);

        // update the price IF:
        // 1. it is the first buy of the game — otherwise first players are forced to sell at the same price
        // 2. We've hit buyForceCount — push the price to keep the game moving
        // 3. Player is buying buyForceCount at once
        // -- but make sure we haven't converged; also don't sell if we have converged
        if (hiPrice == loPrice) return;

        bool firstBuy = (price == initialLo && tokenId == LO) ||
            (price == initialHi && tokenId == HI);
        bool forceUpdate = buyForceCounts[tokenId] == buyForceCount ||
            amount == 3;

        // possibly update the price
        if (firstBuy || forceUpdate) {
            updatePrice(tokenId);
            emit PriceUpdated(msg.sender, tokenId);
        }

        // no update forced, increase counts
        if (!forceUpdate) {
            increaseBuyCounts(tokenId);
        }

        // if we've hit the number to update, kick off any sales in the queue
        if (forceUpdate || buyCounts[tokenId] == buyRequiredCount) {
            sellFromQueue(tokenId, !forceUpdate);
        }
    }

    function canSell(uint256 tokenId) public view returns (bool) {
        // can sell if we hit the required buy count or we are convergent
        return buyCounts[tokenId] == buyRequiredCount || hiPrice == loPrice;
    }

    function checkInQueue(uint256 tokenId, address player)
        public
        view
        returns (uint256)
    {
        // This one lets the saleQueue grow forever, and we keep looping through it,
        // though we do only go through the active queue. The bet is that there will
        // never be enough players for this to be an issue...famous last words
        uint256 position = 1;
        address[] memory queue = tokenId == HI ? hiSaleQueue : loSaleQueue;
        uint256 index = tokenId == HI ? hiSaleQueueIndex : loSaleQueueIndex;
        for (uint256 i = index; i < queue.length; i++) {
            if (queue[i] == player) {
                return position;
            }
            position = position + 1;
        }
        return 0;
    }

    function addToQueue(uint256 tokenId) public returns (uint256) {
        // check we aren't already in it
        uint256 position = checkInQueue(tokenId, msg.sender);
        if (position > 0) return position;

        // add to queue
        address[] storage queue = tokenId == HI ? hiSaleQueue : loSaleQueue;
        queue.push(msg.sender);

        // return how many in line
        uint256 index = tokenId == HI ? hiSaleQueueIndex : loSaleQueueIndex;
        position = queue.length - index;
        emit AddedToQueue(msg.sender, tokenId, position);

        return position;
    }

    function sellFromQueue(uint256 tokenId, bool shouldUpdatePrice)
        private
        whenNotPaused
    {
        // don't do this if we are convergent
        if (hiPrice == loPrice) return;

        // nothing to do if nothing in the queue!
        address[] memory queue = tokenId == HI ? hiSaleQueue : loSaleQueue;
        if (queue.length == 0) return;

        // get the next player waiting in the sell queue
        // since we can't pop from the dynamic array, we just increase the index here
        // and the next address, whether already in line or added, will be there
        uint256 index = tokenId == HI ? hiSaleQueueIndex : loSaleQueueIndex;
        address player = queue[index];

        // make sure they still have the one they planned to sell
        uint256 tokenBalance = balanceOf(player, tokenId);
        if (tokenBalance > 0) {
            // sell the token
            _sell(player, tokenId, shouldUpdatePrice);
        }

        // update the queue index
        if (tokenId == HI) hiSaleQueueIndex = hiSaleQueueIndex + 1;
        else loSaleQueueIndex = loSaleQueueIndex + 1;

        // update the players count
        updatePlayers(player);
    }

    function sell(uint256 tokenId) public nonReentrant {
        // this is because we want to sell from the queue sometimes
        address player = msg.sender;
        _sell(player, tokenId, false);

        // update the players count
        updatePlayers(player);
    }

    function _sell(
        address player,
        uint256 tokenId,
        bool shouldUpdatePrice
    ) private whenNotPaused {
        // check if the token is valid
        require(tokenId == HI || tokenId == LO, "Invalid token.");

        // check the lock is open or we're selling from a forceUpdate
        bool isUnlocked = buyCounts[tokenId] == buyRequiredCount ||
            !shouldUpdatePrice;
        require(isUnlocked, "HILO: cannot sell when the sale is locked");

        // add the action
        addAction(player, tokenId);

        // end game if the prices converged
        if (hiPrice == loPrice) {
            return priceConverged(getPrice(tokenId));
        }

        // pay them
        uint256 price = getPrice(tokenId);
        price = price * 1 ether;
        usdc.transfer(player, price);

        // burn the token
        _burn(player, tokenId, 1);

        // if the game is still going, update the price
        // but only if we are selling from action (queue sales are a result of price changes)
        if (shouldUpdatePrice) {
            updatePrice(tokenId);
            emit PriceUpdated(player, tokenId);
        }

        // then reset the counts
        buyCounts[tokenId] = 0;
        buyForceCounts[tokenId] = 0;

        // // send them LO if they sold HI
        if (tokenId == HI && balanceOf(player, LO) == 0) {
            _mint(player, LO, 1, "");
        }
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override whenNotPaused {
        // Minting or burning. No player transfers allowed
        require(
            from == address(0) || to == address(0),
            "HILO: non transferrable"
        );
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function _transferOwnership(address newOwner) internal override {
        require(
            owner() == address(0) || newOwner == owner(),
            "HILO: cannot transfer ownership"
        );
        super._transferOwnership(newOwner);
    }
}
