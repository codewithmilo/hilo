//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract HILOToken is ERC1155, ERC2981, Ownable, Pausable {
    uint public constant HI = 0;
    uint public constant LO = 1;

    // track how many transactions per price for each token
    uint private salesPerStep = 2;
    mapping(uint => uint) private stepCounts;

    // the up-to-date prices
    uint private hiPrice;
    uint private loPrice;

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
    event pricesConverged(address[] parties, uint price);

    constructor() ERC1155("") {
        _mint(msg.sender, HI, 10000, "");
        _mint(msg.sender, LO, 110000, ""); // 10k for supply, 100k for HI sale rewards

        // set the prices
        hiPrice = 10000;
        loPrice = 1;

        // set up the counts for each sale at each level: increase at 2 so it's either 0 or 1
        stepCounts[0] = 0;
        stepCounts[1] = 0;
    }

    function getPrice(uint tokenId) public view returns (uint price) {
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

    function priceConverged(uint price) private {
        // prices are converged
        // get the parties
        winners = getWinners();

        // emit the prices converged event
        emit pricesConverged(winners, price);

        // game over
        _pause();
    }

    function getWinners() private returns (address[] storage) {
        Action[] memory wins = actions[hiPrice]; // which price doesn't matter; they converged
        for (uint i = 0; i < wins.length; i++) {
            winners.push(wins[i].player);
        }

        return winners;
    }

    function decreaseHiPrice() private {
        hiPrice = hiPrice - 1;
        emit hiDecreased(hiPrice);
    }

    function increaseLoPrice() private {
        loPrice = loPrice + 1;
        emit loIncreased(loPrice);
    }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) internal whenNotPaused override {
        // enforce only transacting with HILO
        require(from == address(0) || to == address(0), "NonTransferrableToken: non transferrable");

        // ensure the receiver does not have any tokens already
        if (to != address(0)) {
            require(balanceOf(to, HI) == 0, "NonTransferrableToken: receiver already has tokens");
            require(balanceOf(to, LO) == 0, "NonTransferrableToken: receiver already has tokens");
        }

        // enforce the cost
        uint tokenId = ids[0];
        if (tokenId == HI) require(msg.value >= hiPrice, "HI: insufficient funds");
        if (tokenId == LO) require(msg.value >= loPrice, "LO: insufficient funds");

        // end game if the prices converged
        if (hiPrice == loPrice) {
            // but add the action first
            Action memory act = Action({player: from, tokenId: tokenId, price: getPrice(tokenId)});
            actions[act.price].push(act);

            priceConverged(getPrice(tokenId));
        }

        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function _afterTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) internal whenNotPaused override {
        // only do stuff if someone is trading back the token
        if (to == address(0)) {
            uint tokenId = ids[0];
            uint count = stepCounts[tokenId];

            // add the action
            Action memory act = Action({player: from, tokenId: tokenId, price: getPrice(tokenId)});
            actions[act.price].push(act);
            
            // update the step count
            count = (count + 1) % salesPerStep;
            stepCounts[tokenId] = count;

            // we catch a win in _beforeTokenTransfer,
            // so just update the prices if we have enough actions at this price
            if (count == 0) {
                updatePrices(tokenId);
            }

            // if we need to transfer LO from a HI sale, do that
            if (tokenId == HI) {
                safeTransferFrom(address(0), from, LO, 1, data);
            }
        }

        super._afterTokenTransfer(operator, from, to, ids, amounts, data);
    }



    // The following functions are overrides required by Solidity.
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}