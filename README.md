# HILO: A token game

HILO is a marketplace game that uses tokens and summation to offer a big jackpot. The rules are simple:

Players can purchase two tokens: HI or LO. HI is initially priced at $1,000, while LO is at $1. _Each player can only hold one of **either** token at once._

Each token can be sold back to the HILO game, and with every sale the price of the relevant token changes.

Every sale of LO **increases** its price by $1; every sale of HI **decreases** its price by $1.

_Caveat: tokens must be bought at least 2 times at a price level for a sale at that level to occur_

At some point, the prices of HI and LO will converge: the two players to sell a HI and LO respectively will win the game, and each get a $50,000 jackpot!

That's the game! Pretty simple...but some important details adjust incentives to keep the game running.

## LO

Buying the LO token guarantees selling it back at a higher price, as long as others are playing. If a player buys LO then wants to sell, they will be put in a queue that will resolve once the proper number of players have bought and unlocked selling.

## HI

With only the above rules, there is no incentive for anyone to buy HI and sell at a lower price: you'd always lose money. So with every sale of HI, a player is minted a free LO token (this also counts towards the LO purchase count at the price). They can then sell that LO for profit; if LO's price is more than the difference between the HI buy + sell, profits are made!
