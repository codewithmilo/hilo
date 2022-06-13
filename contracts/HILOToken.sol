//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract HILOToken is ERC1155, Ownable, Pausable {
    uint public constant HI = 0;
    uint public constant LO = 1;

    // the initial prices
    uint private initialHi;
    uint private initialLo;

    // the up-to-date prices
    uint private hiPrice;
    uint private loPrice;

    // locks for tokens at price levels
    bool private hiLock;
    bool private loLock;

    // number of buys per price level
    uint private buyRequiredCount;

    // number of buys until sales are open
    // keep as a mapping so its easier to update
    // 0 => HI, 1 => LO
    mapping(uint => uint) private buyCounts;

    // queue for sales
    address[] private saleQueue;
    uint private saleQueueIndex;

    struct Action {
        address player;
        uint tokenId;
        uint price;
    }

    // store transactions by price so we can pull it when they converge
    mapping(uint => Action[]) private actions;

    // the winners!
    address[] private winners;

    // implement USDC for payments
    // mumbai: 0xB34F3Ba5Ac6001b5b929323AeCd0eA133a788b76
    // polygon: 0xe11a86849d99f524cac3e7a0ec1241828e332c62
    IERC20 public usdc;


    event hiDecreased(uint previousHiPrice);
    event loIncreased(uint previousLoPrice);
    event pricesConverged(address[] winners, uint price);

    constructor(uint _initialHi, uint _initialLo, uint _buyRequiredCount) ERC1155("") {

        // set the start prices
        initialHi = hiPrice = _initialHi;
        initialLo = loPrice = _initialLo;

        assert(hiPrice > 0);
        assert(loPrice > 0);
        assert(hiPrice > loPrice);

        buyRequiredCount = _buyRequiredCount;
        buyCounts[HI] = 0;
        buyCounts[LO] = 0;
        hiLock = loLock = true;

        usdc = IERC20(0xB34F3Ba5Ac6001b5b929323AeCd0eA133a788b76);
    }

    function getPrice(uint tokenId) public view returns (uint) {
        if (tokenId == HI) {
            return hiPrice;
        } else if (tokenId == LO) {
            return loPrice;
        } else {
            return 0;
        }
    }

    function updatePrice(uint tokenId) private {
        if (tokenId == HI) {
            decreaseHiPrice();
        } else {
            increaseLoPrice();
        }
    }

    function decreaseHiPrice() private {
        hiPrice = hiPrice - 1;
        assert(hiPrice > 0);
        emit hiDecreased(hiPrice);
        console.log("HI price decreased to:", hiPrice);
    }

    function increaseLoPrice() private {
        loPrice = loPrice + 1;
        assert(loPrice < hiPrice);
        emit loIncreased(loPrice);
        console.log("LO price increased to:", loPrice);
    }

    function updateBuyCount(uint tokenId) private returns (bool) {
        // Update the count for the given token. return if the count should unlock
        uint count = buyCounts[tokenId] + 1 % buyRequiredCount;
        buyCounts[tokenId] = count;
        return count == 0;
    }

    function addAction (address player, uint tokenId) private {
        uint price = getPrice(tokenId);
        Action memory action = Action(player, tokenId, price);
        actions[price].push(action);
        console.log("New action!");
        console.log("\tplayer:", action.player);
        console.log("\ttokenId:", action.tokenId);
        console.log("\tprice:", action.price);
    }

    function priceConverged(uint price) private {
        // get the winners
        Action[] memory wins = actions[hiPrice]; // which price doesn't matter; they converged
        for (uint i = 0; i < wins.length; i++) {
            winners.push(wins[i].player);
        }

        // emit the prices converged event
        emit pricesConverged(winners, price);

        // game over
        _pause();

        console.log("Game over! The prices converged at:", price);
        console.log("The winners are:");
        for (uint i = 0; i < winners.length; i++) {
            console.log(winners[i]);
        }
    }

    function buy(uint tokenId, uint amount) public {
        // check if paused
        require(!paused(), "Game is paused.");

        // check if the token is valid
        require(tokenId == HI || tokenId == LO, "Invalid token.");

        // check the player does not have any tokens already
        require(balanceOf(msg.sender, HI) == 0 && balanceOf(msg.sender, LO) == 0, "HILO: cannot have more than one token");

        // get price, if we are starting then update the price immediately
        uint price = getPrice(tokenId);
        assert(price > 0);

        // update the price after the first buy so we can get the ball rolling
        if ((price == initialLo && tokenId == LO) || (price == initialHi && tokenId == HI)) {
            updatePrice(tokenId);
        }

        // check if the player has enough to buy
        require(amount >= price, "Insufficient funds");

        // get the money
        usdc.transferFrom(msg.sender, address(this), amount);

        // mint the token for them
        _mint(msg.sender, tokenId, 1, "");

        // update the buy count
        bool shouldUnlock = updateBuyCount(tokenId);
        if (shouldUnlock) {
            // unlock the sale
            if (tokenId == HI) {
                hiLock = false;
            } else {
                loLock = false;
            }

            // and kick off a sale if any are in the queue
            if (saleQueue.length > 0) {
                address nextSeller = saleQueue[saleQueueIndex++];
                _sell(nextSeller, tokenId);
            }
        }
    }

    function sell(uint tokenId) public {
        // this is because we want to sell from the queue sometimes.
        // TBD if this will actually work, since we aren't signing the transaction
        address player = msg.sender;
        _sell(player, tokenId);
    }

    function _sell(address player, uint tokenId) private {
        // check if paused
        require(!paused(), "Game is paused.");

        // check if the token is valid
        require(tokenId == HI || tokenId == LO, "Invalid token.");

        // check if the player has any tokens
        require(balanceOf(player, HI) == 0 && balanceOf(player, LO) == 0, "HILO: cannot sell when you have no tokens");

        // check the lock is open
        // if it isn't, add us to the queue
        // add the action
        addAction(player, tokenId);

        // pay them
        uint price = getPrice(tokenId);
        usdc.transfer(player, price);

        // burn the token
        _burn(player, tokenId, 1);

        // end game if the prices converged
        if (hiPrice == loPrice) {
            priceConverged(getPrice(tokenId));
        }

        // send them LO if they sold HI
        if (tokenId == HI && balanceOf(player, LO) == 0) {
            _mint(player, LO, 1, "");
            updateBuyCount(LO);
            console.log("LO transferred from HI sale, recepient:", player);
        }
    }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) internal whenNotPaused override {
        require(from == address(this) || to == address(this), "HILOToken: non transferrable");
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}
