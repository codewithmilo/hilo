//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract HILO is ERC1155, Ownable, Pausable {
    uint256 public constant HI = 0;
    uint256 public constant LO = 1;

    // the initial prices
    uint256 private initialHi;
    uint256 private initialLo;

    // the up-to-date prices
    uint256 private hiPrice;
    uint256 private loPrice;

    // locks for tokens at price levels
    bool private hiLock = true;
    bool private loLock = true;

    // number of buys per price level
    uint256 private buyRequiredCount;

    // number of buys until sales are open
    // keep as a mapping so its easier to update
    // 0 => HI, 1 => LO
    mapping(uint256 => uint256) private buyCounts;

    // queue for sales
    address[] private saleQueue;
    uint256 private saleQueueIndex;

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

    // implement USDC for payments
    // mumbai: 0xe11A86849d99F524cAC3E7A0Ec1241828e332C62
    IERC20 public usdc = IERC20(0xe11A86849d99F524cAC3E7A0Ec1241828e332C62);

    event hiDecreased(uint256 newHiPrice);
    event loIncreased(uint256 newLoPrice);
    event actionAdded(address player, uint256 tokenId, uint256 price);
    event pricesConverged(address[] winners, uint256 price);

    constructor(
        uint256 _initialHi,
        uint256 _initialLo,
        uint256 _buyRequiredCount
    ) ERC1155("https://hilo-eight.vercel.app/api/tokens/{id}") {
        // set the start prices
        initialHi = hiPrice = _initialHi;
        initialLo = loPrice = _initialLo;

        assert(hiPrice > 0);
        assert(loPrice > 0);
        assert(hiPrice > loPrice);

        buyRequiredCount = _buyRequiredCount;
        buyCounts[HI] = 0;
        buyCounts[LO] = 0;
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
        emit hiDecreased(hiPrice);
    }

    function increaseLoPrice() private {
        loPrice = loPrice + 1;
        assert(loPrice <= hiPrice);
        emit loIncreased(loPrice);
    }

    function updateBuyCount(uint256 tokenId) private returns (bool) {
        // Update the count for the given token. return if the count should unlock
        uint256 count = (buyCounts[tokenId] + 1) % buyRequiredCount;
        buyCounts[tokenId] = count;
        return count == 0;
    }

    function addAction(address player, uint256 tokenId) private {
        uint256 price = getPrice(tokenId);
        Action memory action = Action(player, tokenId, price);
        actions[price].push(action);
        emit actionAdded(player, tokenId, price);
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
        emit pricesConverged(winners, price);

        // game over
        _pause();
    }

    event buyPriceCheck(address player, uint256 tokenId, uint256 price);
    event buyPriceUpdate(address player, uint256 tokenId);

    // debugging
    event playerBalanceCheck(address player, uint256 balance);
    event playerPayment(address player, uint256 amount);
    event tokenMinted(address player, uint256 tokenId);
    event shouldUnlockCheck(uint256 tokenId, bool shouldUnlock);
    event saleUnlocked(uint256 tokenId);

    function buy(uint256 tokenId) public {
        // check if paused
        require(!paused(), "Game is paused.");

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
        emit buyPriceCheck(msg.sender, tokenId, price);

        // update the price after the first buy so we can get the ball rolling
        if (
            (price == initialLo && tokenId == LO) ||
            (price == initialHi && tokenId == HI)
        ) {
            updatePrice(tokenId);
            emit buyPriceUpdate(msg.sender, tokenId);
        }

        // check if the player has enough to buy
        // change to gwei here as we are dealing with tokens
        price = price * 1 ether;

        uint256 playerBalance = usdc.balanceOf(msg.sender);
        emit playerBalanceCheck(msg.sender, playerBalance);
        require(playerBalance >= price, "Insufficient USDC balance.");

        // get the money
        usdc.transferFrom(msg.sender, address(this), price);
        emit playerPayment(msg.sender, price);

        // mint the token for them
        _mint(msg.sender, tokenId, 1, "");
        emit tokenMinted(msg.sender, tokenId);

        // update the buy count
        bool shouldUnlock = updateBuyCount(tokenId);
        emit shouldUnlockCheck(tokenId, shouldUnlock);

        if (shouldUnlock) {
            // unlock the sale
            if (tokenId == HI) {
                hiLock = false;
            } else {
                loLock = false;
            }
            emit saleUnlocked(tokenId);

            // and kick off a sale if any are in the queue
            if (saleQueue.length > 0) {
                address nextSeller = saleQueue[saleQueueIndex++];
                _sell(nextSeller, tokenId);
            }
        }
    }

    function sell(uint256 tokenId) public {
        // this is because we want to sell from the queue sometimes.
        // TBD if this will actually work, since we aren't signing the transaction
        address player = msg.sender;
        _sell(player, tokenId);
    }

    event salePayment(address player, uint256 amount);
    event tokenBurned(address player, uint256 tokenId);
    event loSent(address player);
    event priceUpdated(address player, uint256 tokenId);

    function _sell(address player, uint256 tokenId) private {
        // check if paused
        require(!paused(), "Game is paused.");

        // check if the token is valid
        require(tokenId == HI || tokenId == LO, "Invalid token.");

        // check if the player has any tokens
        require(
            (tokenId == HI && balanceOf(player, HI) > 0) ||
                (tokenId == LO && balanceOf(player, LO) > 0),
            "HILO: cannot sell when you have no tokens"
        );

        // check the lock is open
        bool isLocked = tokenId == HI ? hiLock : loLock;
        require(!isLocked, "HILO: cannot sell when the sale is locked");
        // TODO if it isn't, add us to the queue

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
        emit salePayment(player, price);

        // burn the token
        _burn(player, tokenId, 1);
        emit tokenBurned(player, tokenId);

        // if the game is still going, update the price
        updatePrice(tokenId);
        emit priceUpdated(player, tokenId);

        // // send them LO if they sold HI
        if (tokenId == HI && balanceOf(player, LO) == 0) {
            _mint(player, LO, 1, "");
            updateBuyCount(LO);
            emit loSent(player);
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
