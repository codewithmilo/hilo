import { Component } from "react";
import { Grid, Image, Link, Modal, Spacer, Text } from "@nextui-org/react";

type HowToModalProps = {
  closeFn: () => void;
};

export default class HowToModal extends Component<HowToModalProps> {
  constructor(props: HowToModalProps) {
    super(props);
  }

  render() {
    return (
      <>
        <Modal
          scroll
          closeButton
          onClose={this.props.closeFn}
          open={true}
          fullScreen
          className="modal"
        >
          <Modal.Header>
            <Text h1>How to Play</Text>
          </Modal.Header>
          <Modal.Body>
            <Link
              block
              href="https://twitter.com/HILO_game"
              target="_blank"
              color="primary"
              css={{
                margin: "0 auto 20px auto",
                fontSize: "1.2rem",
                textAlign: "center",
              }}
            >
              Questions // Feedback
              <br />
              @HILO_game
            </Link>
            <Link
              block
              href="https://chainlist.org/chain/80001"
              target="_blank"
              color="secondary"
              css={{
                margin: "10px auto",
                fontSize: "1.4rem",
                textAlign: "center",
              }}
            >
              Add Mumbai testnet
            </Link>
            <Link
              block
              href="https://calibration-faucet.filswan.com/#/dashboard"
              target="_blank"
              color="primary"
              css={{ margin: "0 auto", fontSize: "1.5rem" }}
            >
              Get test USDC
            </Link>
            <Spacer y={1} />
            <Grid.Container justify="center">
              <Grid xs={0} sm={3}></Grid>
              <Grid xs={12} sm={6} css={{ justifyContent: "center" }}>
                <Text size="1.3rem" css={{ textAlign: "center" }}>
                  Buy a <b>Hi</b> or <b>Lo</b> token (with USDC)
                  <br />
                  <b>Lo</b> starts at <b>$1</b>
                  {" // "}
                  <b>Hi</b> starts at <b>$50</b>
                  <br />
                  The tokens change price and when they meet, the game ends.
                  <br />
                  The jackpot is <b>$500</b>
                </Text>
              </Grid>
              <Grid xs={0} sm={3}></Grid>
              <Grid xs={12}>
                <Spacer y={1} />
              </Grid>
              <Grid xs={0} sm={2}></Grid>
              <Grid xs={12} sm={8}>
                <Image
                  src="/img/diagram.png"
                  alt="Diagram of how to play"
                  objectFit="scale-down"
                />
              </Grid>
              <Grid xs={0} sm={2}></Grid>
              <Grid xs={12}>
                <Spacer y={1} />
              </Grid>
              <Grid xs={0} sm={3}></Grid>
              <Grid xs={12} sm={6}>
                <Text size="1.3rem">
                  <b>Lo</b> increases by <b>$1 // Hi</b> decreases by <b>$1</b>{" "}
                  when either:
                  <br />
                  - At least two players buy a token at the same price and one
                  of them sells the token; or
                  <br />- At least three players buy a token at the same price.
                  <br />
                  Before players can sell a token, two must be bought at that
                  price.
                  <br />
                  Players can enter a queue that will automatically sell for
                  them when possible.
                  <br />
                  <br />
                  If a player holds a <b>Hi</b> token, when they sell it they
                  will receive a free <b>Lo</b> token.
                  <br />
                  <br />
                  Players can thus earn profit from selling their tokens, based
                  on the deterministic changes to the prices.
                  <br />
                  When the prices converge—a <b>Hi</b> or <b>Lo</b> is sold when
                  the tokens are at the same price—<b>the game is over</b>.
                  <br />
                  Whichever player made the sale, along with any players who
                  bought at that price, win the jackpot.
                  <br />
                </Text>
              </Grid>
              <Grid xs={0} sm={3}></Grid>
            </Grid.Container>
            <Text size="1.3rem" css={{ textAlign: "center" }}>
              Good luck!
            </Text>
          </Modal.Body>
        </Modal>
        <style jsx>{`
          .modal p {
            font-family: "SpaceGrotesk", sans-serif;
          }
        `}</style>
      </>
    );
  }
}
