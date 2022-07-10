import { Button, Grid, Link, Modal, Spacer, Text } from "@nextui-org/react";

const ConfirmApproveModal = (visible, setVisible, approveFn) => (
  <Modal
    blur
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
    onClose={() => setVisible(false)}
    open={visible}
  >
    <Modal.Header>
      <Text id="modal-title" h2>
        Pre-approve payments
      </Text>
    </Modal.Header>
    <Modal.Body>
      <Text size="1.3rem">
        In order to purchase a HILO token, you must grant approval for the game
        to transfer your USDC. <br />
        Since every purchase requires this approval and the HILO token transfer,
        you must sign two transactions.
        <br />
        Pre-approval simply allows you to skip the first one by granting a large
        allowance.
      </Text>
      <br />
      <Text size="1.3rem">
        HILO will never transfer more than the price of the token at time of
        purchase.
      </Text>
      <br />
      <Text size="1.3rem">
        If you would like to wait to only approve the exact amount at purchase,
        you can simply do so when you get to it.
      </Text>
    </Modal.Body>
    <Modal.Footer>
      <Button auto flat color="error" onClick={() => setVisible(false)}>
        <Text h4>Cancel</Text>
      </Button>
      <Button auto onClick={approveFn}>
        <Text h4>Approve</Text>
      </Button>
    </Modal.Footer>
  </Modal>
);

const HowToPlayModal = (visible, setVisible) => {
  if (visible) {
    return (
      <Modal
        scroll
        closeButton
        onClose={() => setVisible(false)}
        open={visible}
        fullScreen
      >
        <Modal.Header>
          <Text h1>How to Play</Text>
        </Modal.Header>
        <Modal.Body>
          <Link
            block
            href="https://calibration-faucet.filswan.com/#/dashboard"
            target="_blank"
            color="primary"
            css={{ margin: "0 auto", fontSize: "1.6rem" }}
          >
            Get test USDC
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
            <br />
            to your wallet
          </Link>
          <Spacer y={1} />
          <Grid.Container justify="center">
            <Grid xs={0} sm={3}></Grid>
            <Grid xs={12} sm={6} css={{ justifyContent: "center" }}>
              <Text size="1.5rem" css={{ textAlign: "center" }}>
                Buy a <b>Hi</b> or <b>Lo</b> token (with USDC)
                <br />
                <b>Lo</b> starts at <b>$1</b>
                {" // "}
                <b>Hi</b> starts at <b>$50</b>
                <br />
                The jackpot is <b>$500</b>
              </Text>
            </Grid>
            <Grid xs={0} sm={3}></Grid>
            <Grid xs={12}>
              <Spacer y={1} />
            </Grid>
            <Grid xs={0} sm={3}></Grid>
            <Grid xs={12} sm={6}>
              <Text size="1.5rem">
                <b>Lo</b> increases by <b>$1 // Hi</b> decreases by <b>$1</b>{" "}
                when either:
                <br />
                - At least two players buy a token at the same price and one of
                them sells the token; or
                <br />- At least four players buy a token at the same price.
                <br />
                Before players can sell a token, two must buy at the same price.
                <br />
                Players can enter a queue that will automatically sell for them
                when possible.
                <br />
                <br />
                If a player holds a <b>Hi</b> token, when they sell it they will
                receive a free <b>Lo</b> token.
                <br />
                <br />
                Players can thus earn profit from selling their tokens, based on
                the deterministic changes to their prices.
                <br />
                When the prices converge—a <b>Hi</b> or <b>Lo</b> is sold when
                the tokens are at the same price—<b>the game is over</b>.
                <br />
                Whichever player made the sale wins the jackpot.
                <br />
              </Text>
            </Grid>
            <Grid xs={0} sm={3}></Grid>
          </Grid.Container>
          <Text size="1.5rem" css={{ textAlign: "center" }}>
            Good luck!
          </Text>
        </Modal.Body>
      </Modal>
    );
  } else {
    return null;
  }
};

export { ConfirmApproveModal, HowToPlayModal };
