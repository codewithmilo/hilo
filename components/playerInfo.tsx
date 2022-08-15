import { Card, Text, Image, Link, Grid } from "@nextui-org/react";
import { Component } from "react";
import { Tokens, WinnersProps } from "../lib/types";
import { CONSTANTS } from "../lib/constants";

// displays like 0x0420...6969
const truncateAddress = (address: string) => {
  const match = address.match(
    /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/
  );
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};

export class Balances extends Component<{ balances: number[] }> {
  constructor(props: { balances: number[] }) {
    super(props);
  }

  render() {
    const { balances } = this.props;
    const hiBalance = balances[0];
    const loBalance = balances[1];

    if (hiBalance === 0 && loBalance === 0) return null;

    const balanceStr = (balance: number, tokenType: Tokens) => {
      const token = tokenType === Tokens.HI ? "Hi" : "Lo";
      if (balance === 0) return `no ${token} tokens`;
      if (balance === 1) return `one ${token} token`;
      return `${balance} ${token} tokens`;
    };

    return (
      <Grid.Container gap={1} justify="center">
        <Grid xs={6} justify="flex-end">
          <Card
            variant="bordered"
            css={{
              maxWidth: "200px",
              padding: "10px",
            }}
          >
            <Text h5 css={{ textAlign: "center" }}>
              You have {balanceStr(hiBalance, Tokens.HI)}
            </Text>
            <Image alt="Hi token" height={40} src="/img/hiToken.png" />
          </Card>
        </Grid>
        <Grid xs={6}>
          <Card variant="bordered" css={{ maxWidth: "200px", padding: "10px" }}>
            <Text h5 css={{ textAlign: "center" }}>
              You have {balanceStr(loBalance, Tokens.LO)}
            </Text>
            <Image alt="Lo token" height={40} src="/img/loToken.png" />
          </Card>
        </Grid>
      </Grid.Container>
    );
  }
}

export class Player extends Component<{ player: string }> {
  constructor(props: { player: string }) {
    super(props);
  }

  render() {
    const { player } = this.props;
    return (
      <Card
        variant="bordered"
        css={{ maxWidth: "300px", margin: "0 auto", padding: "10px" }}
      >
        <Text h4 css={{ textAlign: "center" }}>
          Player{" "}
          <Link
            href={CONSTANTS.POLYSCAN_BASE_URL + player}
            color="primary"
            underline
            target="_blank"
            rel="noopener noreferrer"
          >
            {truncateAddress(player)}
          </Link>{" "}
          connected
        </Text>
      </Card>
    );
  }
}

export class PlayerTotals extends Component<{ totals: number[] }> {
  constructor(props: { totals: number[] }) {
    super(props);
  }

  render() {
    const { totals } = this.props;
    if (totals[0] === 0 && totals[1] === 0) return null;
    return (
      <Card variant="bordered" css={{ maxWidth: "150px", margin: "0 auto" }}>
        <Text h5 css={{ textAlign: "center" }}>
          {totals[0] + totals[1]} players
        </Text>
        <Grid xs={12} md={12} justify="center">
          <Text h4 color="#D172F5">
            {totals[0]}
          </Text>
          <Text h4 css={{ padding: "0 10px" }}>
            {"|"}
          </Text>
          <Text h4 color="primary">
            {totals[1]}
          </Text>
        </Grid>
      </Card>
    );
  }
}

export class Winners extends Component<WinnersProps> {
  constructor(props: WinnersProps) {
    super(props);
  }

  render() {
    const { winners } = this.props;
    const won = winners.includes(this.props.player);
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
  }
}
