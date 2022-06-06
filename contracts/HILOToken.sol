//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

import "@openzeppelin/contracts/security/Pausable.sol";

contract HILOToken is ERC1155, ERC2981, Pausable {
    uint public constant HI = 0;
    uint public constant LO = 1;

    // the up-to-date prices
    uint private hiPrice;
    uint private loPrice;

    // track how many tokens bought before we change the price,
    // 0 => LO, 1 => HI
    uint private buysPerStep;
    mapping(uint => uint) private stepCounts;

    struct Action {
        address player;
        uint tokenId;
        uint price;
    }

    // store transactions by price so we can pull it when they converge
    mapping(uint => Action[]) private actions;

    // the winners!
    address[] private winners;

    event hiDecreased(uint previousHiPrice);
    event loIncreased(uint previousLoPrice);
    event pricesConverged(address[] winners, uint price);

    constructor(uint initialHi, uint initialLo, uint _buysPerStep) ERC1155("") {

        // set the start prices
        hiPrice = initialHi;
        loPrice = initialLo;

        // set the royalty (1%)
        _setDefaultRoyalty(address(this), 100);

        assert(hiPrice > 0);
        assert(loPrice > 0);

        // set up the counts for each sale at each level
        buysPerStep = _buysPerStep;
        stepCounts[0] = 0; // HI
        stepCounts[1] = 0; // LO
    }

    function getPrice(uint tokenId) private view returns (uint) {
        if (tokenId == HI) {
            return hiPrice;
        } else if (tokenId == LO) {
            return loPrice;
        } else {
            return 0;
        }
    }

    function updatePrices(uint tokenId) private {
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

    function updateStepCount(uint tokenId) private {
        // Update the count for the given token
        uint count = (stepCounts[tokenId] + 1) % buysPerStep;
        stepCounts[tokenId] = count;

        // update the price if we need to
        if (count == 0) {
            updatePrices(tokenId);
        }
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
        // prices are converged!

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

    function buy(uint tokenId) public payable {
        // check if paused
        require(!paused(), "Game is paused.");

        // check if the token is valid
        require(tokenId == HI || tokenId == LO, "Invalid token.");

        // check the player does not have any tokens already
        require(balanceOf(msg.sender, HI) == 0 && balanceOf(msg.sender, LO) == 0, "HILO: cannot have more than one token");

        // check if the price is valid
        uint price = getPrice(tokenId);
        assert(price > 0);

        // add royalty
        // TODO

        // check if the player has enough to buy
        require(msg.value >= price, "Insufficient funds");

        // mint and transfer the token
        _mint(msg.sender, tokenId, 1, "");

        // update the step count
        updateStepCount(tokenId);
    }

    function sell(uint tokenId) public {
        // check if paused
        require(!paused(), "Game is paused.");

        // check if the token is valid
        require(tokenId == HI || tokenId == LO, "Invalid token.");

        // check if the player has any tokens
        require(balanceOf(msg.sender, tokenId) > 0, "HILO: cannot sell when you have no tokens");

        // burn the token
        _burn(msg.sender, tokenId, 1);

        // pay them (minus royalty from "free" LO transfer)
        // TODO

        // add the action
        addAction(msg.sender, tokenId);

        // end game if the prices converged
        if (hiPrice == loPrice) {
            priceConverged(getPrice(tokenId));
        }

        // send them LO if they sold HI
        if (tokenId == HI && balanceOf(msg.sender, LO) == 0) {
            _mint(msg.sender, LO, 1, "");
            updateStepCount(tokenId);
            console.log("LO transferred from HI sale, recepient:", msg.sender);
        }
    }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) internal whenNotPaused override {
        require(from == address(this) || to == address(this), "HILOToken: non transferrable");
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    // The following functions are overrides required by Solidity.
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
