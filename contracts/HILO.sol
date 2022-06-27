//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

import "@openzeppelin/contracts/interfaces/IERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract HILO is ERC1155Supply, Ownable, Pausable, ReentrancyGuard {
    uint256 public constant HI = 0;
    uint256 public constant LO = 1;

    // the initial prices
    uint256 private initialHi;
    uint256 private initialLo;

    // the up-to-date prices
    uint256 private hiPrice;
    uint256 private loPrice;

    // number of buys per price level
    uint256 private buyRequiredCount;

    // number of buys that push price changes (double buyRequiredCount)
    uint256 private buyForceCount;

    // number of buys until sales are open
    // keep as a mapping so its easier to update
    // 0 => HI, 1 => LO
    mapping(uint256 => uint256) private buyCounts;

    // same as above but for buyForceCount;
    mapping(uint256 => uint256) private buyForceCounts;

    // queue for sales
    address[] private saleQueue;
    uint256 private saleQueueIndex = 0;

    struct Action {
        address player;
        uint256 tokenId;
        uint256 price;
    }

    // store transactions by price so we can pull it when they converge
    mapping(uint256 => Action[]) private actions;

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
        buyForceCount = _buyRequiredCount * 2;
        buyForceCounts[HI] = 0;
        buyForceCounts[LO] = 0;
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

        // reset the buy counts
        buyCounts[tokenId] = 0;
        buyForceCounts[tokenId] = 0;
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

    function updateBuyCounts(uint256 tokenId) private {
        // If we haven't already hit the threshold, increment the counts
        if (buyCounts[tokenId] < buyRequiredCount) {
            buyCounts[tokenId] = buyCounts[tokenId] + 1;
        }

        if (buyForceCounts[tokenId] < buyForceCount) {
            buyForceCounts[tokenId] = buyForceCounts[tokenId] + 1;
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

    function payout() public onlyOwner whenPaused {
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
    }

    function buy(uint256 tokenId) public whenNotPaused {
        // check if the token is valid
        require(tokenId == HI || tokenId == LO, "Invalid token.");

        // check the player does not have any tokens already
        require(
            balanceOf(msg.sender, HI) == 0 && balanceOf(msg.sender, LO) == 0,
            "HILO: cannot have more than one token"
        );

        // get price
        uint256 price = getPrice(tokenId);
        assert(price > 0);

        // update the price IF:
        // 1. it is the first buy of the game — otherwise first players are forced to sell at the same price
        // 2. We've hit buyForceCount — if there's 2x the required buys to sell, push the price to keep the game moving
        // -- but make sure we haven't converged
        bool firstBuy = (price == initialLo && tokenId == LO) ||
            (price == initialHi && tokenId == HI);
        bool forceUpdate = buyForceCounts[tokenId] == buyForceCount;

        if (hiPrice != loPrice && (firstBuy || forceUpdate)) {
            updatePrice(tokenId);
            emit PriceUpdated(msg.sender, tokenId);
        }

        // check if the player has enough to buy
        // change to gwei here as we are dealing with tokens
        price = price * 1 ether;

        uint256 playerBalance = usdc.balanceOf(msg.sender);
        require(playerBalance >= price, "Insufficient USDC balance.");

        // get the money
        usdc.transferFrom(msg.sender, address(this), price);

        // mint the token for them
        _mint(msg.sender, tokenId, 1, "");

        // update counts, unless we hit the force update
        if (!forceUpdate) {
            updateBuyCounts(tokenId);
        }

        // if we've hit the buy threshold, kick off any sales in the queue
        if (buyCounts[tokenId] == buyRequiredCount) sellFromQueue();
    }

    function addToQueue() public returns (uint256) {
        // loop through queue to check we aren't already in it
        bool alreadyInQueue = false;
        for (uint256 i = saleQueueIndex; i < saleQueue.length; i++) {
            if (saleQueue[i] == msg.sender) {
                alreadyInQueue = true;
            }
        }
        require(!alreadyInQueue, "HILO: already in queue");

        // add to queue
        saleQueue.push(msg.sender);

        // return how many in line
        return saleQueue.length - saleQueueIndex;
    }

    function sellFromQueue() private whenNotPaused {
        // nothing to do if nothing in the queue!
        if (saleQueue.length == 0) return;

        // get the next player waiting in the sell queue
        // since we can't pop from the dynamic array, we just increase the index here
        // and the next address, whether already in line or added, will be there
        address nextSeller = saleQueue[saleQueueIndex++];

        // find out the token they have
        uint256 tokenId;
        uint256 hiTokenBalance;
        uint256 loTokenBalance;

        hiTokenBalance = balanceOf(nextSeller, HI);
        if (hiTokenBalance == 0) loTokenBalance = balanceOf(nextSeller, LO);
        if (loTokenBalance == 0) return; // no tokens to sell (must've sold manually)

        if (hiTokenBalance > 0) {
            tokenId = HI;
        } else {
            tokenId = LO;
        }

        // sell the token
        _sell(nextSeller, tokenId);
    }

    function sell(uint256 tokenId) public nonReentrant {
        // this is because we want to sell from the queue sometimes.
        // TBD if this will actually work, since we aren't signing the transaction
        address player = msg.sender;
        _sell(player, tokenId);
    }

    function _sell(address player, uint256 tokenId) private whenNotPaused {
        // check if the token is valid
        require(tokenId == HI || tokenId == LO, "Invalid token.");

        // check if the player has any tokens
        require(
            (tokenId == HI && balanceOf(player, HI) > 0) ||
                (tokenId == LO && balanceOf(player, LO) > 0),
            "HILO: cannot sell when you have no tokens"
        );

        // check the lock is open
        bool isUnlocked = buyCounts[tokenId] == buyRequiredCount;
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
        updatePrice(tokenId);
        emit PriceUpdated(player, tokenId);

        // // send them LO if they sold HI
        if (tokenId == HI && balanceOf(player, LO) == 0) {
            _mint(player, LO, 1, "");
            // only update the buyCount if it won't unlock selling (and force update the price)
            if (buyCounts[LO] < buyRequiredCount - 1) updateBuyCounts(LO);
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
        // Minting, burning, or to/from HILO. No player transfers allowed
        require(
            from == address(0) ||
                to == address(0) ||
                from == address(this) ||
                to == address(this),
            "HILO: non transferrable"
        );
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}
