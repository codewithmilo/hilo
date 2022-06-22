import { Card, Text, Image, Link, Grid } from "@nextui-org/react";
import { CONSTANTS } from "../lib/constants";

// displays like 0x0420...6969
const truncateAddress = (address) => {
  if (!address) return "No Account";
  const match = address.match(
    /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/
  );
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};

const renderPlayer = (account) => {
  return (
    <Card
      variant="bordered"
      css={{ maxWidth: "300px", margin: "0 auto", padding: "10px" }}
    >
      <Text h4 css={{ textAlign: "center" }}>
        Player{" "}
        <Link
          href={CONSTANTS.POLYSCAN_BASE_URL + account}
          color
          target="_blank"
          rel="noopener noreferrer"
        >
          {truncateAddress(account)}
        </Link>{" "}
        connected
      </Text>
    </Card>
  );
};

const renderPlayerTotals = (playerTotals) => {
  const total = playerTotals.hi + playerTotals.lo;

  return (
    <Card variant="bordered" css={{ maxWidth: "150px", margin: "0 auto" }}>
      <Text h5 css={{ textAlign: "center" }}>
        {total} players
      </Text>
      <Grid md={12} justify="center">
        <Text h4 color="#D172F5">
          {playerTotals.hi}
        </Text>
        <Text h4 css={{ padding: "0 10px" }}>
          {"—"}
        </Text>
        <Text h4 color="primary">
          {playerTotals.lo}
        </Text>
      </Grid>
    </Card>
  );
};

const renderHoldings = (hasHi) => (
  <Card
    variant="bordered"
    css={{ maxWidth: "200px", margin: "0 auto", padding: "10px" }}
  >
    <Text h5 css={{ textAlign: "center" }}>
      You have one {hasHi ? "Hi" : "Lo"} token
    </Text>
    <Image
      alt="Hi or Lo token"
      height={40}
      src={hasHi ? "/img/hiToken.png" : "/img/loToken.png"}
    />
  </Card>
);

const renderWinners = (winners, account) => {
  // figure out if we won
  const won = winners.includes(account);

  return (
    <Card
      variant="bordered"
      css={{ maxWidth: "250px", margin: "0 auto", padding: "10px" }}
    >
      {won ? (
        <Text h2 css={{ textAlign: "center" }}>
          You won!!
        </Text>
      ) : (
        <>
          <Text h3 css={{ textAlign: "center" }}>
            The winner is
          </Text>
          {winners.map((winner, i) => {
            return (
              <Text h3 key={i} css={{ textAlign: "center" }}>
                <Link
                  href={CONSTANTS.POLYSCAN_BASE_URL + winner}
                  color="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {truncateAddress(winner)}
                </Link>
              </Text>
            );
          })}
        </>
      )}
    </Card>
  );
};

export { renderPlayer, renderPlayerTotals, renderHoldings, renderWinners };
